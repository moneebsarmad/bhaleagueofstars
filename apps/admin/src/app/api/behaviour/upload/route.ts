import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { analyzeAndStoreInsights, type ParsedEvent } from '@/backend/services/behaviourAnalyzer'

type CsvRow = Record<string, string>

const normaliseHeader = (value: string) =>
  value
    .trim()
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')

const parseCsv = (text: string) => {
  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(current)
      current = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1
      }
      row.push(current)
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row)
      }
      row = []
      current = ''
      continue
    }

    current += char
  }

  row.push(current)
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row)
  }

  if (rows.length === 0) return []

  const headers = rows[0].map(normaliseHeader)
  return rows.slice(1).map((cells) => {
    const record: CsvRow = {}
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? '').trim()
    })
    return record
  })
}

const parseDisciplinePdf = async (file: File) => {
  const { default: pdfParse } = await import('pdf-parse')
  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await pdfParse(buffer)
  const lines = result.text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('--') && !line.includes('Author Details Points'))

  const rows: CsvRow[] = []
  let currentGrade: number | null = null
  let currentStudent: string | null = null

  const isGradeLine = (line: string) => /^\d{1,2}(st|nd|rd|th)$/i.test(line)
  const isDateLine = (line: string) => /^\d{2}\/\d{2}\/\d{4}/.test(line)
  const isStudentLine = (line: string) =>
    line.includes(',') &&
    !/Violation|Description|Resolution|Student Total|Support|MS\s*:|Level/i.test(line)

  const parseHeader = (headerLine: string) => {
    const pointsMatch = headerLine.match(/(-?\d+)\s*$/)
    const pointsRaw = pointsMatch ? Number.parseInt(pointsMatch[1], 10) : null
    const points = pointsRaw !== null && !Number.isNaN(pointsRaw) ? Math.abs(pointsRaw) : null
    const header = pointsMatch ? headerLine.slice(0, pointsMatch.index).trim() : headerLine.trim()

    let category = ''
    let subcategory = header
    if (/Support Violation/i.test(header)) {
      category = 'Support Violation'
      subcategory = header.replace(/Support Violation/i, '').trim()
    } else if (/Violation/i.test(header)) {
      category = 'Violation'
      subcategory = header.replace(/Violation/i, '').trim()
    }

    subcategory = subcategory.replace(/^MS\s*:\s*/i, '').replace(/^Level\s*\d+\s*:\s*/i, '').trim()

    const eventType = /Buy Back/i.test(header) || (pointsRaw !== null && pointsRaw < 0) ? 'merit' : 'demerit'

    return { category, subcategory, points, eventType }
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (isGradeLine(line)) {
      currentGrade = Number.parseInt(line, 10)
      i += 1
      continue
    }

    if (isStudentLine(line)) {
      currentStudent = line
      i += 1
      continue
    }

    if (isDateLine(line) && currentStudent) {
      const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/)
      const eventDate = dateMatch ? dateMatch[1] : ''
      const remainder = line.replace(eventDate, '').trim().replace(/^,/, '').trim()

      let staffName = ''
      let headerLine = ''
      const keywordIndex = remainder.search(/\bViolation\b|\bSupport\b/i)
      if (keywordIndex > -1) {
        const staffPart = remainder.slice(0, keywordIndex).trim().replace(/,$/, '')
        if (staffPart && !/student/i.test(staffPart)) {
          staffName = staffPart
        }
        headerLine = remainder.slice(keywordIndex).trim()
      } else if (remainder && !/student/i.test(remainder)) {
        staffName = remainder
      }

      if (!headerLine && lines[i + 1]) {
        headerLine = lines[i + 1]
        i += 1
      }

      const headerData = parseHeader(headerLine)
      let description = ''
      let resolution = ''
      let section: 'description' | 'resolution' | null = null

      i += 1
      while (i < lines.length) {
        const nextLine = lines[i]
        if (isDateLine(nextLine) || isStudentLine(nextLine) || isGradeLine(nextLine)) {
          i -= 1
          break
        }
        if (/^Description/i.test(nextLine)) {
          section = 'description'
          description += `${nextLine.replace(/^Description/i, '').trim()} `
        } else if (/^Resolution/i.test(nextLine)) {
          section = 'resolution'
          resolution += `${nextLine.replace(/^Resolution/i, '').trim()} `
        } else if (/^Student Total/i.test(nextLine)) {
          break
        } else if (section === 'description') {
          description += `${nextLine} `
        } else if (section === 'resolution') {
          resolution += `${nextLine} `
        }
        i += 1
      }

      const notes = [description.trim(), resolution.trim()].filter(Boolean).join(' | ')

      rows.push({
        student_name: currentStudent,
        grade: currentGrade ? String(currentGrade) : '',
        section: '',
        event_type: headerData.eventType,
        event_date: eventDate,
        staff_name: staffName,
        category: headerData.category,
        subcategory: headerData.subcategory,
        points: headerData.points !== null ? String(headerData.points) : '0',
        notes,
        source_system: 'Discipline Event Summary PDF',
      })
    }

    i += 1
  }

  return rows
}

const parseDate = (value?: string) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

const parseTime = (value?: string) => {
  if (!value) return null
  const trimmed = value.trim()
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) return null
  const parts = trimmed.split(':')
  const hours = parts[0].padStart(2, '0')
  const minutes = parts[1].padStart(2, '0')
  const seconds = parts[2] ? parts[2].padStart(2, '0') : '00'
  return `${hours}:${minutes}:${seconds}`
}

const parseIntSafe = (value?: string) => {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

const normaliseEventType = (value?: string) => {
  if (!value) return null
  const lowered = value.toLowerCase().trim()
  if (lowered === 'merit' || lowered === 'demerit') return lowered
  return null
}

const normaliseSeverity = (value?: string) => {
  if (!value) return null
  const lowered = value.toLowerCase().trim()
  if (['minor', 'moderate', 'major'].includes(lowered)) return lowered
  return null
}

export async function POST(request: Request) {
  try {
    // Authentication check
    const authClient = await createSupabaseServerClient()
    const { data: authData } = await authClient.auth.getUser()
    if (!authData?.user?.id) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    }
    const uploadedBy = authData.user.id

    const supabaseAdmin = getSupabaseAdmin()
    const formData = await request.formData()
    const file = formData.get('file')
    const sourceSystem = (formData.get('source_system') as string | null) ?? 'csv_upload'

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'CSV or PDF file is required.' }, { status: 400 })
    }

    // File size limit (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 10MB.' }, { status: 400 })
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

    let rows: CsvRow[]
    try {
      rows = isPdf ? await parseDisciplinePdf(file) : parseCsv(await file.text())
    } catch (parseError) {
      const message = isPdf
        ? 'Failed to parse PDF. Ensure it matches the Discipline Event Summary format.'
        : 'Failed to parse CSV. Check the file format and encoding.'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No rows found in file.' }, { status: 400 })
    }

    // Log the upload for audit purposes (no raw events stored)
    const { data: uploadRecord, error: uploadError } = await supabaseAdmin
      .from('behaviour_uploads')
      .insert([
        {
          uploaded_by: uploadedBy,
          source_system: sourceSystem,
          file_name: file.name,
          row_count: rows.length,
        },
      ])
      .select('upload_id')
      .single()

    if (uploadError) throw uploadError

    const uploadId = uploadRecord?.upload_id

    // Resolve student IDs and build parsed events for analysis
    const errors: { row: number; message: string }[] = []
    const parsedEvents: ParsedEvent[] = []
    const studentCache = new Map<string, string>()

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const studentIdValue = row.student_id || row.student_uuid || ''
      let studentId = studentIdValue || ''
      const studentName = row.student_name || row.name || ''
      const grade = parseIntSafe(row.grade)
      const section = row.section || ''

      if (!studentId && studentName) {
        const cacheKey = `${studentName}|${grade ?? ''}|${section || ''}`.toLowerCase()
        const cached = studentCache.get(cacheKey)
        if (cached) {
          studentId = cached
        } else {
          let query = supabaseAdmin.from('students').select('student_id').ilike('student_name', studentName)
          if (grade !== null) {
            query = query.eq('grade', grade)
          }
          if (section) {
            query = query.eq('section', section)
          }
          const { data: studentData, error: studentError } = await query
          if (studentError || !studentData || studentData.length === 0) {
            errors.push({ row: index + 2, message: 'Unable to resolve student_id for row.' })
            continue
          }
          if (studentData.length > 1) {
            errors.push({ row: index + 2, message: 'Multiple students match. Provide section to disambiguate.' })
            continue
          }
          studentId = studentData[0].student_id
          studentCache.set(cacheKey, studentId)
        }
      }

      if (!studentId) {
        errors.push({ row: index + 2, message: 'student_id is required.' })
        continue
      }

      const eventType = normaliseEventType(row.event_type || row.type)
      const eventDate = parseDate(row.event_date || row.date)
      const points = parseIntSafe(row.points)

      if (!eventType) {
        errors.push({ row: index + 2, message: 'event_type must be merit or demerit.' })
        continue
      }
      if (!eventDate) {
        errors.push({ row: index + 2, message: 'event_date is required and must be valid.' })
        continue
      }
      if (points === null) {
        errors.push({ row: index + 2, message: 'points is required and must be a number.' })
        continue
      }

      // Build ParsedEvent for stateless analysis (no storage of raw events)
      parsedEvents.push({
        student_id: studentId,
        student_name: studentName || undefined,
        grade: grade ?? undefined,
        section: section || undefined,
        event_type: eventType as 'merit' | 'demerit',
        event_date: eventDate,
        staff_name: row.staff_name || undefined,
        category: row.category || undefined,
        subcategory: row.subcategory || undefined,
        points,
      })
    }

    // Analyze events and store ONLY computed insights (not raw events)
    let analysisResult = { processed: 0, students: [] as string[] }
    if (parsedEvents.length > 0) {
      analysisResult = await analyzeAndStoreInsights(parsedEvents)
    }

    return NextResponse.json({
      upload_id: uploadId,
      analyzed: parsedEvents.length,
      students_updated: analysisResult.processed,
      errors,
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
