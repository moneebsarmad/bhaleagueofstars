import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const MIN_NOTES_CHARS = 10
const CYCLE_LENGTH_DAYS = 14

type MeritRow = {
  staff_name: string | null
  student_name: string | null
  grade: number | null
  section: string | null
  house: string | null
  r: string | null
  subcategory: string | null
  notes: string | null
  date_of_event: string | null
  timestamp: string | null
}

type StaffRow = {
  staff_name: string | null
  email: string | null
  house: string | null
  grade?: string | null
  grade_assignment?: string | null
  department?: string | null
}

type DecisionRow = {
  cycle_end_date: string | null
  due_date: string | null
  status: string | null
}

function toDateString(date: Date) {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isWeekend(date: Date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function isOtherCategory(row: MeritRow) {
  const category = String(row.r ?? '').trim().toLowerCase()
  const subcategory = String(row.subcategory ?? '').trim().toLowerCase()
  return category === 'other' || category.startsWith('other') || subcategory === 'other' || subcategory.startsWith('other')
}

function isMeaningfulNote(notes: string | null) {
  return String(notes ?? '').trim().length >= MIN_NOTES_CHARS
}

function getEntryDate(row: MeritRow) {
  if (row.date_of_event) return row.date_of_event
  if (row.timestamp) return row.timestamp.slice(0, 10)
  return ''
}

function getCycleEndDates(endDate: string) {
  const end = new Date(`${endDate}T00:00:00Z`)
  return Array.from({ length: 4 }, (_, idx) => toDateString(addDays(end, -(CYCLE_LENGTH_DAYS * idx))))
}

function getStatus(value: number, thresholds: { green: number; yellow: number }, higherIsBetter = true) {
  if (higherIsBetter) {
    if (value >= thresholds.green) return 'Green'
    if (value >= thresholds.yellow) return 'Yellow'
    return 'Red'
  }
  if (value <= thresholds.green) return 'Green'
  if (value <= thresholds.yellow) return 'Yellow'
  return 'Red'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const detail = searchParams.get('detail') || ''
  const actionMenu = searchParams.get('actionMenu') || ''
  const house = searchParams.get('house') || ''
  const grade = searchParams.get('grade') || ''
  const section = searchParams.get('section') || ''
  const staff = searchParams.get('staff') || ''

  const supabase = await createSupabaseServerClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  if (actionMenu) {
    const { data, error } = await supabase
      .from('action_menu')
      .select('id, title')
      .order('id', { ascending: true })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ menu: data || [] })
  }

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Missing date range.' }, { status: 400 })
  }

  const entriesQuery = supabase
    .from('merit_log')
    .select('staff_name, student_name, grade, section, house, r, subcategory, notes, date_of_event, timestamp')
    .gte('date_of_event', startDate)
    .lte('date_of_event', endDate)

  if (house) entriesQuery.eq('house', house)
  if (grade) entriesQuery.eq('grade', Number(grade))
  if (section) entriesQuery.eq('section', section)
  if (staff) entriesQuery.eq('staff_name', staff)

  const [entriesRes, staffRes, decisionsRes, huddlesRes] = await Promise.all([
    entriesQuery,
    supabase.from('staff').select('staff_name, email, house, grade_assignment, grade, department'),
    supabase.from('decision_log').select('cycle_end_date, due_date, status'),
    supabase.from('huddle_log').select('cycle_end_date'),
  ])

  if (entriesRes.error) {
    return NextResponse.json({ error: entriesRes.error.message }, { status: 500 })
  }
  if (staffRes.error) {
    return NextResponse.json({ error: staffRes.error.message }, { status: 500 })
  }

  const entries = (entriesRes.data || []) as MeritRow[]
  const staffRows = (staffRes.data || []) as StaffRow[]
  const decisions = (decisionsRes.data || []) as DecisionRow[]
  const huddles = (huddlesRes.data || []) as { cycle_end_date: string | null }[]

  const staffRoster = new Map<string, StaffRow>()
  staffRows.forEach((row) => {
    const name = String(row.staff_name ?? '').trim()
    if (!name) return
    staffRoster.set(name.toLowerCase(), row)
  })

  const eligibleStaff = staffRows.filter((row) => {
    if (!row.staff_name) return false
    if (house && String(row.house ?? '') !== house) return false
    return true
  })
  const eligibleStaffCount = eligibleStaff.length

  const activeStaffSet = new Set<string>()
  const activeStaffDates = new Map<string, Set<string>>()

  entries.forEach((entry) => {
    const name = String(entry.staff_name ?? '').trim()
    if (!name) return
    activeStaffSet.add(name.toLowerCase())
    const dateStr = getEntryDate(entry)
    if (!dateStr) return
    const dateObj = new Date(`${dateStr}T00:00:00Z`)
    if (isWeekend(dateObj)) return
    if (!activeStaffDates.has(name)) {
      activeStaffDates.set(name, new Set())
    }
    activeStaffDates.get(name)?.add(dateStr)
  })

  const participationRate = eligibleStaffCount > 0 ? activeStaffSet.size / eligibleStaffCount : null
  const avgActiveDays = activeStaffSet.size > 0
    ? Array.from(activeStaffDates.values()).reduce((sum, dates) => sum + dates.size, 0) / activeStaffSet.size
    : 0

  const otherEntries = entries.filter((entry) => isOtherCategory(entry))
  const otherTotal = otherEntries.length
  const otherMeaningful = otherEntries.filter((entry) => isMeaningfulNote(entry.notes)).length
  const otherCompliance = otherTotal > 0 ? otherMeaningful / otherTotal : null

  const unknownStaffEntries = entries.filter((entry) => {
    const name = String(entry.staff_name ?? '').trim().toLowerCase()
    return name && !staffRoster.has(name)
  })

  const missingHouse = staffRows.filter((row) => !String(row.house ?? '').trim())
  const missingGrade = staffRows.filter((row) => {
    const value = String(row.grade_assignment ?? row.grade ?? row.department ?? '').trim()
    return !value
  })

  const rosterIssuesCount = unknownStaffEntries.length + missingHouse.length + missingGrade.length

  const cycleEndDates = getCycleEndDates(endDate)
  const huddleCycleSet = new Set(huddles.map((row) => row.cycle_end_date).filter(Boolean))
  const huddlesCount = cycleEndDates.filter((date) => huddleCycleSet.has(date)).length

  const decisionCycleSet = new Set(decisions.map((row) => row.cycle_end_date).filter(Boolean))
  const decisionsCount = cycleEndDates.filter((date) => decisionCycleSet.has(date)).length

  const coverageGap = participationRate !== null ? 1 - participationRate : null

  const overdueActionsCount = decisions.filter((decision) => {
    if (!decision.due_date) return false
    if (decision.status === 'Completed') return false
    return new Date(decision.due_date) < new Date()
  }).length

  const metrics = {
    outcomeA: {
      participationRate,
      avgActiveDays,
    },
    outcomeB: {
      huddlesCount,
      coverageGap,
    },
    outcomeC: {
      otherNotesCompliance: otherCompliance,
      rosterIssuesCount,
    },
    outcomeD: {
      decisionsCount,
      overdueActionsCount,
    },
  }

  const statuses = {
    outcomeA: {
      participationRate: participationRate === null ? 'Red' : getStatus(participationRate * 100, { green: 70, yellow: 50 }),
      avgActiveDays: getStatus(avgActiveDays, { green: 4, yellow: 2 }),
    },
    outcomeB: {
      huddles: getStatus(huddlesCount, { green: 3, yellow: 2 }),
      coverageGap: coverageGap === null ? 'Red' : getStatus(coverageGap * 100, { green: 20, yellow: 40 }, false),
    },
    outcomeC: {
      otherNotes: otherCompliance === null
        ? 'Green'
        : getStatus(otherCompliance * 100, { green: 85, yellow: 70 }),
      rosterIssues: getStatus(rosterIssuesCount, { green: 0, yellow: 5 }, false),
    },
    outcomeD: {
      decisions: getStatus(decisionsCount, { green: 3, yellow: 2 }),
      overdue: getStatus(overdueActionsCount, { green: 1, yellow: 3 }, false),
    },
  }

  const outcomeStatus = {
    outcomeA: ['participationRate', 'avgActiveDays'].some((key) => statuses.outcomeA[key as 'participationRate' | 'avgActiveDays'] === 'Red')
      ? 'Red'
      : ['participationRate', 'avgActiveDays'].some((key) => statuses.outcomeA[key as 'participationRate' | 'avgActiveDays'] === 'Yellow')
      ? 'Yellow'
      : 'Green',
    outcomeB: ['huddles', 'coverageGap'].some((key) => statuses.outcomeB[key as 'huddles' | 'coverageGap'] === 'Red')
      ? 'Red'
      : ['huddles', 'coverageGap'].some((key) => statuses.outcomeB[key as 'huddles' | 'coverageGap'] === 'Yellow')
      ? 'Yellow'
      : 'Green',
    outcomeC: ['otherNotes', 'rosterIssues'].some((key) => statuses.outcomeC[key as 'otherNotes' | 'rosterIssues'] === 'Red')
      ? 'Red'
      : ['otherNotes', 'rosterIssues'].some((key) => statuses.outcomeC[key as 'otherNotes' | 'rosterIssues'] === 'Yellow')
      ? 'Yellow'
      : 'Green',
    outcomeD: ['decisions', 'overdue'].some((key) => statuses.outcomeD[key as 'decisions' | 'overdue'] === 'Red')
      ? 'Red'
      : ['decisions', 'overdue'].some((key) => statuses.outcomeD[key as 'decisions' | 'overdue'] === 'Yellow')
      ? 'Yellow'
      : 'Green',
  }

  const recommendedActions: Record<string, string | null> = {
    outcomeA: outcomeStatus.outcomeA === 'Red'
      ? '2-week Participation Reset: 10-minute re-demo + set expectation of 2 recognitions per week for 2 weeks. Review participation rate next huddle.'
      : null,
    outcomeB: outcomeStatus.outcomeB === 'Red'
      ? 'Lock the Rhythm: put biweekly huddle on the calendar (20 min) and assign one owner responsible for logging it.'
      : null,
    outcomeC: outcomeStatus.outcomeC === 'Red'
      ? 'Data Hygiene Reset: enforce “Other requires notes” and clear roster issues before using trends for decisions.'
      : null,
    outcomeD: outcomeStatus.outcomeD === 'Red'
      ? 'Pick One Focus: log 1–2 actions today (owner + due date) and start next huddle by closing the loop.'
      : null,
  }

  if (detail === 'roster') {
    return NextResponse.json({
      unknownStaffEntries: unknownStaffEntries.map((entry) => ({
        staff_name: entry.staff_name || '',
        student_name: entry.student_name || '',
        date: getEntryDate(entry),
      })),
      missingHouse: missingHouse.map((row) => ({
        staff_name: row.staff_name || '',
        email: row.email || '',
      })),
      missingGrade: missingGrade.map((row) => ({
        staff_name: row.staff_name || '',
        email: row.email || '',
      })),
    })
  }

  if (detail === 'other-missing-notes') {
    const missingNotes = otherEntries.filter((entry) => !isMeaningfulNote(entry.notes))
    return NextResponse.json({
      entries: missingNotes.map((entry) => ({
        date: getEntryDate(entry),
        staff_name: entry.staff_name || '',
        student_name: entry.student_name || '',
        category: entry.r || '',
        subcategory: entry.subcategory || '',
        notes: entry.notes || '',
      })),
    })
  }

  return NextResponse.json({
    metrics,
    statuses,
    outcomeStatus,
    recommendedActions,
  })
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = await request.json()
  const type = body?.type

  if (type === 'huddle') {
    const cycleEndDate = String(body?.cycle_end_date || '')
    if (!cycleEndDate) {
      return NextResponse.json({ error: 'Missing cycle_end_date.' }, { status: 400 })
    }
    const { error } = await supabase.from('huddle_log').insert([
      {
        cycle_end_date: cycleEndDate,
        notes: body?.notes || null,
        created_by: authData.user.id,
      },
    ])
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (type === 'decision') {
    const owner = String(body?.owner || '').trim()
    const dueDate = String(body?.due_date || '').trim()
    const actionType = String(body?.action_type || '').trim()
    const cycleEndDate = String(body?.cycle_end_date || '').trim()
    if (!owner || !dueDate || !actionType || !cycleEndDate) {
      return NextResponse.json({ error: 'Missing required decision fields.' }, { status: 400 })
    }

    const { error } = await supabase.from('decision_log').insert([
      {
        owner,
        due_date: dueDate,
        status: body?.status || 'Planned',
        title: body?.title || null,
        outcome_tag: body?.outcome_tag || null,
        action_type: actionType,
        cycle_end_date: cycleEndDate,
        notes: body?.notes || null,
        selected_actions: body?.selected_actions || [],
      },
    ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
}
