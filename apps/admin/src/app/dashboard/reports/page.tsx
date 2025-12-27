'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase/tables'

type ReportTemplate = {
  id: string
  title: string
  description: string
  format: 'CSV' | 'PDF' | 'BOTH'
  scope: 'All-time' | 'Current month'
}

const templates: ReportTemplate[] = [
  {
    id: 'all-time-summary',
    title: 'All-Time Merit Summary',
    description: 'Totals by house, grade, staff, and category.',
    format: 'BOTH',
    scope: 'All-time',
  },
  {
    id: 'house-snapshot',
    title: 'House Performance Snapshot',
    description: 'Totals by house with student and staff engagement.',
    format: 'BOTH',
    scope: 'All-time',
  },
  {
    id: 'grade-section-leaderboard',
    title: 'Grade & Section Leaderboard',
    description: 'Total points by grade and section.',
    format: 'BOTH',
    scope: 'All-time',
  },
  {
    id: 'category-report',
    title: 'Merit Category Report',
    description: 'Points by 3R categories and subcategories.',
    format: 'BOTH',
    scope: 'All-time',
  },
  {
    id: 'monthly-merit',
    title: 'Monthly Merit Log',
    description: 'All merit entries for the current month.',
    format: 'BOTH',
    scope: 'Current month',
  },
  {
    id: 'monthly-highlights',
    title: 'Monthly Highlights',
    description: 'Top students, staff, and houses this month.',
    format: 'BOTH',
    scope: 'Current month',
  },
  {
    id: 'leadership-summary',
    title: 'Leadership Summary',
    description: 'Four key charts for leadership review.',
    format: 'BOTH',
    scope: 'All-time',
  },
  {
    id: 'staff-recognition',
    title: 'Staff Recognition Report',
    description: 'Monthly staff awards and participation stats.',
    format: 'BOTH',
    scope: 'Current month',
  },
]

export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [students, setStudents] = useState<{ name: string; grade: number; section: string; house: string }[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<{ name: string; grade: number; section: string; house: string } | null>(null)
  const [selectedHouse, setSelectedHouse] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedSection, setSelectedSection] = useState('')

  const fetchStudents = async () => {
    const { data } = await supabase.from(Tables.students).select('*')
    const allStudents = (data || []).map((s) => ({
      name: s.student_name || '',
      grade: s.grade || 0,
      section: s.section || '',
      house: s.house || '',
    }))
    setStudents(allStudents.filter((s) => s.name))
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('reports-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: Tables.students }, () => {
        fetchStudents()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: Tables.meritLog }, () => {
        fetchStudents()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchAllMeritEntries = async () => {
    const pageSize = 1000
    let allMeritData: Record<string, string | number | null | undefined>[] = []
    let from = 0
    let hasMore = true

    while (hasMore) {
      const { data } = await supabase
        .from(Tables.meritLog)
        .select('*')
        .order('timestamp', { ascending: false })
        .range(from, from + pageSize - 1)

      if (!data || data.length === 0) {
        hasMore = false
      } else {
        allMeritData = allMeritData.concat(data)
        from += pageSize
        hasMore = data.length === pageSize
      }
    }

    return allMeritData
  }

  const exportCSV = (rows: (string | number)[][], filename: string) => {
    const csvContent = rows.map((row) => row.map((cell) => `"${String(cell ?? '')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  const exportPDF = (
    title: string,
    summary: string,
    rows: (string | number)[][],
    headers: string[],
    options?: { variant?: 'default' | 'student'; summaryHtml?: string; chartsHtml?: string }
  ) => {
    const tableRows = rows.map((row) => `
      <tr>
        ${row.map((cell) => `<td>${String(cell ?? '')}</td>`).join('')}
      </tr>
    `).join('')

    const crestUrl = `${window.location.origin}/crest.png`
    const summaryHtml = options?.summaryHtml || summary.replace(/\n/g, '<br/>')
    const variant = options?.variant || 'default'
    const chartsHtml = options?.chartsHtml || ''
    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a2e; padding: 24px; background: #f7f4ee; }
            .report { background: #fffdf9; border: 1px solid #e7dfcf; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(20, 14, 4, 0.06); }
            .header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
            .crest { width: 64px; height: 64px; object-fit: contain; }
            .brand { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #7a6a43; }
            .title { font-size: 20px; margin: 4px 0 0; }
            .subtitle { font-size: 12px; color: #6b5b3a; margin: 6px 0 16px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
            .summary-card { border: 1px solid #eadfca; background: #fbf8f1; border-radius: 12px; padding: 10px 12px; }
            .summary-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #8a7a55; margin-bottom: 4px; }
            .summary-value { font-size: 16px; font-weight: 700; color: #2b1d0a; }
            .divider { height: 1px; background: #eadfca; margin: 14px 0; }
            .charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 16px 0; }
            .chart-card { border: 1px solid #eadfca; border-radius: 12px; padding: 12px; background: #fffaf0; }
            .chart-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #7a6a43; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #e7dfcf; padding: 7px 8px; text-align: left; }
            th { background: #f3ead6; color: #5b4a22; letter-spacing: 0.08em; text-transform: uppercase; font-size: 10px; }
            tr:nth-child(even) td { background: #fbf8f1; }
            .report-card .title { font-size: 22px; }
            .report-card .crest { width: 72px; height: 72px; }
          </style>
        </head>
        <body>
          <div class="report ${variant === 'student' ? 'report-card' : ''}">
            <div class="header">
              <img class="crest" src="${crestUrl}" alt="League of Stars Crest" />
              <div>
                <div class="brand">League of Stars • Brighter Horizon Academy</div>
                <div class="title">${title}</div>
              </div>
            </div>
            <div class="subtitle">${summaryHtml}</div>
            ${chartsHtml ? `<div class="charts">${chartsHtml}</div>` : ''}
            <div class="divider"></div>
            <table>
              <thead>
                <tr>
                  ${headers.map((header) => `<th>${header}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const getThreeRCategory = (value: string | number | null | undefined) => {
    const raw = `${value ?? ''}`.toLowerCase()
    if (raw.includes('respect')) return 'Respect'
    if (raw.includes('responsibility')) return 'Responsibility'
    if (raw.includes('righteousness')) return 'Righteousness'
    return ''
  }

  const buildBarChartHtml = (title: string, data: { label: string; value: number }[]) => {
    const width = 480
    const height = 200
    const padding = 28
    const maxValue = Math.max(1, ...data.map((d) => d.value))
    const barHeight = 18
    const gap = 8
    const chartHeight = data.length * (barHeight + gap)
    const viewHeight = Math.max(height, chartHeight + padding * 2)
    const valueOffset = 56

    const bars = data.map((d, i) => {
      const barWidth = Math.round((d.value / maxValue) * (width - 160 - valueOffset))
      const y = padding + i * (barHeight + gap)
      const labelValue = d.value.toLocaleString()
      return `
        <text x="0" y="${y + 13}" font-size="11" fill="#4a3b1a">${d.label}</text>
        <rect x="140" y="${y}" width="${barWidth}" height="${barHeight}" rx="6" fill="#c9a227"></rect>
        <text x="${140 + barWidth + 6}" y="${y + 13}" font-size="11" fill="#4a3b1a">${labelValue}</text>
      `
    }).join('')

    return `
      <div class="chart-card">
        <div class="chart-title">${title}</div>
        <svg width="${width}" height="${viewHeight}" viewBox="0 0 ${width} ${viewHeight}">
          ${bars}
        </svg>
      </div>
    `
  }

  const buildLineChartHtml = (title: string, data: { label: string; value: number }[]) => {
    const width = 420
    const height = 200
    const padding = 24
    const maxValue = Math.max(1, ...data.map((d) => d.value))
    const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0
    const points = data.map((d, i) => {
      const x = padding + i * stepX
      const y = height - padding - (d.value / maxValue) * (height - padding * 2)
      return `${x},${y}`
    }).join(' ')

    const labels = data.map((d, i) => {
      const x = padding + i * stepX
      return `<text x="${x}" y="${height - 6}" text-anchor="middle" font-size="10" fill="#6b5b3a">${d.label}</text>`
    }).join('')

    return `
      <div class="chart-card">
        <div class="chart-title">${title}</div>
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <polyline fill="none" stroke="#6b4a1a" stroke-width="2" points="${points}" />
          ${points.split(' ').map((p) => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3" fill="#c9a227" />`).join('')}
          ${labels}
        </svg>
      </div>
    `
  }

  const isWithinRange = (timestamp: string | number | null | undefined) => {
    if (!startDate && !endDate) return true
    const date = new Date(timestamp ?? '')
    if (!Number.isFinite(date.getTime())) return false
    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`)
      if (date < start) return false
    }
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59`)
      if (date > end) return false
    }
    return true
  }

  const hasCustomRange = Boolean(startDate || endDate)
  const customRangeLabel = `${startDate || '...'} to ${endDate || '...'}`
  const rangeBadgeLabel = hasCustomRange ? customRangeLabel : 'Default range'

  const generateReport = async (template: ReportTemplate, format: 'CSV' | 'PDF') => {
    setIsGenerating(`${template.id}-${format}`)
    try {
    const isEntryInMonth = (timestamp: string | number | null | undefined, monthKey: string) => {
      const date = new Date(timestamp ?? '')
        if (!Number.isFinite(date.getTime())) return false
        const entryMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return entryMonth === monthKey
      }

      if (template.id === 'all-time-summary') {
        const data = await fetchAllMeritEntries()
        const houseTotals: Record<string, number> = {}
        const gradeTotals: Record<string, number> = {}
        const staffTotals: Record<string, number> = {}
        const categoryTotals: Record<string, number> = {}

        data.filter((m) => isWithinRange(m.timestamp || '')).forEach((m) => {
          const house = m.house || ''
          const grade = m.grade || ''
          const staff = m.staff_name || ''
          const category = getThreeRCategory(m.r || '')
          const points = Number(m.points) || 0
          if (house) houseTotals[house] = (houseTotals[house] || 0) + points
          if (grade) gradeTotals[grade] = (gradeTotals[grade] || 0) + points
          if (staff) staffTotals[staff] = (staffTotals[staff] || 0) + points
          if (category) categoryTotals[category] = (categoryTotals[category] || 0) + points
        })

        const rows: (string | number)[][] = [
          ['Section', 'Label', 'Points'],
          ...Object.entries(houseTotals).map(([label, points]) => ['House', label, points]),
          ...Object.entries(gradeTotals).map(([label, points]) => ['Grade', `Grade ${label}`, points]),
          ...Object.entries(staffTotals).map(([label, points]) => ['Staff', label, points]),
          ...Object.entries(categoryTotals).map(([label, points]) => ['Category', label, points]),
        ]

        if (format === 'CSV') {
          exportCSV(rows, `report_all_time_summary_${new Date().toISOString().split('T')[0]}.csv`)
        } else {
          exportPDF(
            'All-Time Merit Summary',
            `${hasCustomRange ? customRangeLabel : 'All time'} • ${rows.length} sections`,
            rows.slice(1),
            rows[0] as string[]
          )
        }
        return
      }

      if (template.id === 'house-snapshot') {
        const data = await fetchAllMeritEntries()
        const filtered = data.filter((m) => isWithinRange(m.timestamp || ''))
        const houseTotals: Record<string, { points: number; awards: number; students: Set<string>; staff: Set<string> }> = {}

        filtered.forEach((m) => {
          const house = String(m.house ?? '').trim()
          if (!house) return
          if (!houseTotals[house]) {
            houseTotals[house] = { points: 0, awards: 0, students: new Set(), staff: new Set() }
          }
          houseTotals[house].points += Number(m.points) || 0
          houseTotals[house].awards += 1
          if (m.student_name) {
            houseTotals[house].students.add(`${m.student_name}|${m.grade || ''}|${m.section || ''}`)
          }
          if (m.staff_name) {
            houseTotals[house].staff.add(String(m.staff_name))
          }
        })

        const rows = Object.entries(houseTotals)
          .map(([house, stats]) => [
            house,
            stats.points,
            stats.awards,
            stats.students.size,
            stats.staff.size,
          ])
          .sort((a, b) => Number(b[1]) - Number(a[1]))

        if (format === 'CSV') {
          exportCSV(
            [
              ['House', 'Total Points', 'Awards', 'Unique Students', 'Active Staff'],
              ...rows,
            ],
            `report_house_snapshot_${new Date().toISOString().split('T')[0]}.csv`
          )
        } else {
          exportPDF(
            `House Performance Snapshot`,
            `${hasCustomRange ? customRangeLabel : 'All time'} • ${rows.length} houses`,
            rows,
            ['House', 'Total Points', 'Awards', 'Unique Students', 'Active Staff']
          )
        }
        return
      }

      if (template.id === 'grade-section-leaderboard') {
        const data = await fetchAllMeritEntries()
        const filtered = data.filter((m) => isWithinRange(m.timestamp || ''))
        const sectionTotals: Record<string, number> = {}

        filtered.forEach((m) => {
          const grade = m.grade || ''
          const section = m.section || ''
          if (!grade || !section) return
          const key = `${grade}|${section}`
          sectionTotals[key] = (sectionTotals[key] || 0) + (Number(m.points) || 0)
        })

        const rows = Object.entries(sectionTotals)
          .map(([key, points]) => {
            const [grade, section] = key.split('|')
            return [`Grade ${grade}${section}`, points]
          })
          .sort((a, b) => Number(b[1]) - Number(a[1]))

        if (format === 'CSV') {
          exportCSV(
            [['Grade/Section', 'Total Points'], ...rows],
            `report_grade_section_leaderboard_${new Date().toISOString().split('T')[0]}.csv`
          )
        } else {
          exportPDF(
            'Grade & Section Leaderboard',
            `${hasCustomRange ? customRangeLabel : 'All time'} • ${rows.length} sections`,
            rows,
            ['Grade/Section', 'Total Points']
          )
        }
        return
      }

      if (template.id === 'category-report') {
        const data = await fetchAllMeritEntries()
        const filtered = data.filter((m) => isWithinRange(m.timestamp || ''))
        const categoryTotals: Record<string, number> = {}
        const subcategoryTotals: Record<string, number> = {}

        filtered.forEach((m) => {
          const category = getThreeRCategory(m.r || '')
          const subcategory = m.subcategory || ''
          if (category) categoryTotals[category] = (categoryTotals[category] || 0) + (Number(m.points) || 0)
          if (subcategory) subcategoryTotals[subcategory] = (subcategoryTotals[subcategory] || 0) + (Number(m.points) || 0)
        })

        const rows = [
          ['Category', 'Total Points'],
          ...Object.entries(categoryTotals).map(([name, points]) => [name, points]),
          ['Subcategory', 'Total Points'],
          ...Object.entries(subcategoryTotals).map(([name, points]) => [name, points]),
        ]
        if (format === 'CSV') {
          exportCSV(rows, `report_merit_categories_${new Date().toISOString().split('T')[0]}.csv`)
        } else {
          exportPDF(
            'Merit Category Report',
            `${hasCustomRange ? customRangeLabel : 'All time'} • Categories and subcategories`,
            rows.slice(1),
            rows[0] as string[]
          )
        }
        return
      }

      if (template.id === 'monthly-merit') {
        const data = await fetchAllMeritEntries()
        const now = new Date()
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const entries = data.filter((m) => {
          const date = new Date(m.timestamp || '')
          if (!Number.isFinite(date.getTime())) return false
          if (startDate || endDate) {
            return isWithinRange(m.timestamp || '')
          }
          return isEntryInMonth(m.timestamp || '', monthKey)
        })

        const rows = [
          ['Student Name', 'Grade', 'Section', 'House', 'Points', 'Staff Name', 'Category', 'Subcategory', 'Date'],
          ...entries.map((m) => ([
            m.student_name || '',
            m.grade || '',
            m.section || '',
            m.house || '',
            Number(m.points) || 0,
            m.staff_name || '',
            getThreeRCategory(m.r || ''),
            m.subcategory || '',
            new Date(m.timestamp || '').toLocaleDateString(),
          ])),
        ]
        const fileLabel = startDate || endDate ? `${startDate || 'start'}_${endDate || 'end'}` : monthKey
        if (format === 'CSV') {
          exportCSV(rows, `report_monthly_merit_${fileLabel}.csv`)
        } else {
          exportPDF(
            'Monthly Merit Log',
            `${hasCustomRange ? customRangeLabel : monthKey} • ${entries.length} entries`,
            rows.slice(1),
            rows[0] as string[]
          )
        }
        return
      }

      if (template.id === 'monthly-highlights') {
        const data = await fetchAllMeritEntries()
        const now = new Date()
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const filtered = data.filter((m) =>
          (startDate || endDate) ? isWithinRange(m.timestamp || '') : isEntryInMonth(m.timestamp || '', monthKey)
        )

        const studentPoints: Record<string, { name: string; points: number }> = {}
        const staffPoints: Record<string, number> = {}
        const housePoints: Record<string, number> = {}

        filtered.forEach((m) => {
          const student = m.student_name || ''
          if (student) {
            const key = `${student}|${m.grade || ''}|${m.section || ''}`
            if (!studentPoints[key]) {
              studentPoints[key] = { name: student, points: 0 }
            }
            studentPoints[key].points += Number(m.points) || 0
          }
          const staff = m.staff_name || ''
          if (staff) staffPoints[staff] = (staffPoints[staff] || 0) + (Number(m.points) || 0)
          const house = String(m.house ?? '').trim()
          if (house) housePoints[house] = (housePoints[house] || 0) + (Number(m.points) || 0)
        })

        const topStudents = Object.values(studentPoints).sort((a, b) => b.points - a.points).slice(0, 5)
        const topStaff = Object.entries(staffPoints).sort((a, b) => b[1] - a[1]).slice(0, 5)
        const topHouses = Object.entries(housePoints).sort((a, b) => b[1] - a[1]).slice(0, 4)

        const rows: (string | number)[][] = [
          ['Top Students', 'Points'],
          ...topStudents.map((s) => [s.name, s.points]),
          ['Top Staff', 'Points'],
          ...topStaff.map(([name, points]) => [name, points]),
          ['Top Houses', 'Points'],
          ...topHouses.map(([name, points]) => [name, points]),
        ]

        if (format === 'CSV') {
          exportCSV(
            rows,
            `report_monthly_highlights_${hasCustomRange ? customRangeLabel.replace(/\s+/g, '_') : monthKey}.csv`
          )
        } else {
          exportPDF(
            `Monthly Highlights`,
            `${hasCustomRange ? customRangeLabel : monthKey} • ${filtered.length} recognitions`,
            rows.slice(1),
            rows[0] as string[]
          )
        }
        return
      }

      if (template.id === 'leadership-summary') {
        const data = await fetchAllMeritEntries()
        const filtered = data.filter((m) => isWithinRange(m.timestamp || ''))

        const houseTotals: Record<string, number> = {}
        const sectionTotals: Record<string, number> = {}
        const categoryTotals: Record<string, number> = {}
        const monthlyTotals: Record<string, number> = {}
        const studentSet = new Set<string>()
        const staffSet = new Set<string>()

        filtered.forEach((m) => {
          const house = String(m.house ?? '').trim()
          if (house) houseTotals[house] = (houseTotals[house] || 0) + (Number(m.points) || 0)
          const grade = m.grade || ''
          const section = m.section || ''
          if (grade && section) {
            const key = `Grade ${grade}${section}`
            sectionTotals[key] = (sectionTotals[key] || 0) + (Number(m.points) || 0)
          }
          const category = getThreeRCategory(m.r || '')
          if (category) categoryTotals[category] = (categoryTotals[category] || 0) + (Number(m.points) || 0)
          const date = new Date(m.timestamp || '')
          if (Number.isFinite(date.getTime())) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + (Number(m.points) || 0)
          }
          if (m.student_name) {
            studentSet.add(`${m.student_name}|${m.grade || ''}|${m.section || ''}`)
          }
          if (m.staff_name) {
            staffSet.add(String(m.staff_name))
          }
        })

        const houseData = Object.entries(houseTotals)
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)

        const sectionData = Object.entries(sectionTotals)
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)

        const categoryData = Object.entries(categoryTotals)
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)

        const monthData = Object.entries(monthlyTotals)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([label, value]) => ({ label, value }))

        const totalPoints = filtered.reduce((sum, m) => sum + (Number(m.points) || 0), 0)
        const totalAwards = filtered.length
        const uniqueStudents = studentSet.size
        const activeStaff = staffSet.size
        const avgPerStudent = uniqueStudents > 0 ? Math.round(totalPoints / uniqueStudents) : 0
        const avgPerAward = totalAwards > 0 ? Math.round(totalPoints / totalAwards) : 0

        const topHouse = houseData[0]?.label || '—'
        const topSection = sectionData[0]?.label || '—'
        const topCategory = categoryData[0]?.label || '—'
        const trendDirection = monthData.length >= 2 && monthData[monthData.length - 1].value >= monthData[monthData.length - 2].value
          ? 'upward'
          : 'downward'

        if (format === 'CSV') {
          const rows: (string | number)[][] = [
            ['Points by House', 'Points'],
            ...houseData.map((d) => [d.label, d.value]),
            ['Points by Grade/Section', 'Points'],
            ...sectionData.map((d) => [d.label, d.value]),
            ['3R Distribution', 'Points'],
            ...categoryData.map((d) => [d.label, d.value]),
            ['Monthly Trend', 'Points'],
            ...monthData.map((d) => [d.label, d.value]),
            ['Key Metrics', 'Value'],
            ['Total Points', totalPoints],
            ['Total Awards', totalAwards],
            ['Unique Students', uniqueStudents],
            ['Active Staff', activeStaff],
            ['Avg Points per Student', avgPerStudent],
            ['Avg Points per Award', avgPerAward],
          ]
          exportCSV(rows, `report_leadership_summary_${new Date().toISOString().split('T')[0]}.csv`)
        } else {
          const chartsHtml = [
            buildBarChartHtml('Points by House', houseData),
            buildBarChartHtml('Points by Grade/Section (Top 10)', sectionData),
            buildBarChartHtml('3R Distribution', categoryData),
            buildLineChartHtml('Monthly Trend', monthData),
          ].join('')

          const summaryHtml = `
            <div class="summary-grid" style="grid-template-columns: repeat(6, minmax(0, 1fr));">
              <div class="summary-card"><div class="summary-label">Total Points</div><div class="summary-value">${totalPoints}</div></div>
              <div class="summary-card"><div class="summary-label">Awards</div><div class="summary-value">${totalAwards}</div></div>
              <div class="summary-card"><div class="summary-label">Students</div><div class="summary-value">${uniqueStudents}</div></div>
              <div class="summary-card"><div class="summary-label">Active Staff</div><div class="summary-value">${activeStaff}</div></div>
              <div class="summary-card"><div class="summary-label">Avg/Student</div><div class="summary-value">${avgPerStudent}</div></div>
              <div class="summary-card"><div class="summary-label">Avg/Award</div><div class="summary-value">${avgPerAward}</div></div>
            </div>
            <div class="subtitle" style="margin-top: 8px;">
              Overall engagement remains strong, with the highest contribution from <strong>${topHouse}</strong> and the most active section being <strong>${topSection}</strong>.
              The most frequent character focus is <strong>${topCategory}</strong>, and the monthly trend is <strong>${trendDirection}</strong>.
            </div>
            <div class="summary-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 10px;">
              <div class="summary-card"><div class="summary-label">Key Takeaway</div><div class="summary-value" style="font-size: 13px;">House momentum is led by ${topHouse}.</div></div>
              <div class="summary-card"><div class="summary-label">Key Takeaway</div><div class="summary-value" style="font-size: 13px;">${topSection} leads sections by points.</div></div>
              <div class="summary-card"><div class="summary-label">Key Takeaway</div><div class="summary-value" style="font-size: 13px;">${topCategory} is the most recognized strength.</div></div>
            </div>
          `

          exportPDF(
            'Leadership Summary',
            `${hasCustomRange ? customRangeLabel : 'All time'} • ${filtered.length} recognitions`,
            [],
            [],
            { chartsHtml, summaryHtml }
          )
        }
        return
      }

      if (template.id === 'staff-recognition') {
        const [data, staffData] = await Promise.all([
          fetchAllMeritEntries(),
          supabase.from(Tables.staff).select('*'),
        ])
        const staffRows = staffData.data || []
        const now = new Date()
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const staffPoints: Record<string, number> = {}
        const staffWeeks: Record<string, Set<string>> = {}
        const normalizeStaff = (value: string) =>
          value
            .normalize('NFKD')
            .replace(/\p{Diacritic}/gu, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
        const staffNames = staffRows
          .map((s) => s.staff_name || '')
          .filter(Boolean)

        const staffKeyMap = new Map<string, string>()
        staffNames.forEach((name) => {
          const key = normalizeStaff(name)
          staffKeyMap.set(key, name)
          staffPoints[key] = 0
          staffWeeks[key] = new Set()
        })

        const weekKey = (date: Date) => {
          const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
          const day = d.getUTCDay()
          const diff = day === 0 ? -6 : 1 - day
          d.setUTCDate(d.getUTCDate() + diff)
          return d.toISOString().split('T')[0]
        }

        data.forEach((m) => {
          const date = new Date(m.timestamp || '')
          if (!Number.isFinite(date.getTime())) return
          if (startDate || endDate) {
            if (!isWithinRange(m.timestamp || '')) return
          } else {
            const entryMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            if (entryMonth !== monthKey) return
          }
          const staff = normalizeStaff(m.staff_name || '')
          if (!staff) return
          if (!(staff in staffPoints)) {
            staffPoints[staff] = 0
            staffWeeks[staff] = new Set()
          }
          staffPoints[staff] += Number(m.points) || 0
          staffWeeks[staff].add(weekKey(date))
        })

        const rows = staffNames
          .map((name) => {
            const key = normalizeStaff(name)
            return [name, staffPoints[key] || 0, staffWeeks[key]?.size || 0]
          })
          .sort((a, b) => Number(b[1]) - Number(a[1]))

        if (format === 'CSV') {
          exportCSV(
            [['Staff Member', 'Points', 'Active Weeks'], ...rows],
            `report_staff_recognition_${hasCustomRange ? customRangeLabel.replace(/\s+/g, '_') : monthKey}.csv`
          )
        } else {
          exportPDF(
            `Staff Recognition (${hasCustomRange ? customRangeLabel : monthKey})`,
            `Summary of staff contributions. Generated on ${new Date().toLocaleDateString()}.`,
            rows,
            ['Staff Member', 'Points', 'Active Weeks']
          )
        }
        return
      }
    } finally {
      setIsGenerating(null)
    }
  }

  const generateStudentReport = async (format: 'CSV' | 'PDF') => {
    if (!selectedStudent) return
    setIsGenerating(`student-${format}`)
    try {
      const data = await fetchAllMeritEntries()
      const entries = data.filter((m) => {
        if (!isWithinRange(m.timestamp || '')) return false
        return (
          (m.student_name || '').toLowerCase() === selectedStudent.name.toLowerCase() &&
          (m.grade || 0) === selectedStudent.grade &&
          (m.section || '').toLowerCase() === selectedStudent.section.toLowerCase()
        )
      })

      const totalPoints = entries.reduce((sum, entry) => sum + (entry.points || 0), 0)
      const awards = entries.length
      const dates = entries
        .map((entry) => new Date(entry.timestamp || ''))
        .filter((d) => Number.isFinite(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())
      const firstDate = dates[0] ? dates[0].toLocaleDateString() : '—'
      const lastDate = dates[dates.length - 1] ? dates[dates.length - 1].toLocaleDateString() : '—'
      const weekKey = (date: Date) => {
        const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
        const day = d.getUTCDay()
        const diff = day === 0 ? -6 : 1 - day
        d.setUTCDate(d.getUTCDate() + diff)
        return d.toISOString().split('T')[0]
      }
      const activeWeeks = new Set(
        dates.map((date) => weekKey(date))
      )
      const categoryCounts: Record<string, number> = {}
      const noteSnippets: string[] = []
      entries.forEach((entry) => {
        const category = getThreeRCategory(entry.r || '')
        if (!category) return
        categoryCounts[category] = (categoryCounts[category] || 0) + 1
      })
      const normalizeNote = (value: string) =>
        value.replace(/\s+/g, ' ').trim()
      entries.forEach((entry) => {
        const note = normalizeNote(entry.notes || '')
        if (!note) return
        if (!noteSnippets.includes(note)) {
          noteSnippets.push(note)
        }
      })
      const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([name]) => name)
      const strengthLine = (() => {
        if (topCategories.length === 0) {
          return 'Teachers highlighted positive conduct and steady contributions to the learning community.'
        }
        const mapped = topCategories.map((category) => {
          if (category.toLowerCase().includes('respect')) return 'positive conduct and respect for others'
          if (category.toLowerCase().includes('responsibility')) return 'responsibility and self-management'
          if (category.toLowerCase().includes('righteousness')) return 'integrity and good judgment'
          return category
        })
        return `Teachers highlighted ${mapped.join(' and ')} during this period.`
      })()
      const noteLine = (() => {
        if (noteSnippets.length === 0) return ''
        const picks = noteSnippets.slice(0, 3).map((note) =>
          note.length > 140 ? `${note.slice(0, 137)}...` : note
        )
        return `Notable moments include ${picks.join(' • ')}.`
      })()

      const rows = entries.map((entry) => ([
        entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '',
        entry.points || 0,
        getThreeRCategory(entry.r || ''),
        entry.subcategory || '',
        entry.staff_name || '',
        entry.notes || '',
      ]))

      if (format === 'CSV') {
        exportCSV(
          [
            ['Date', 'Points', 'Category', 'Subcategory', 'Staff Name', 'Notes'],
            ...rows,
          ],
          `report_student_${selectedStudent.name.replace(/\s+/g, '_')}_${selectedStudent.grade}${selectedStudent.section}_${new Date().toISOString().split('T')[0]}.csv`
        )
      } else {
        const summaryLine = `Across ${activeWeeks.size} week${activeWeeks.size === 1 ? '' : 's'}, ${selectedStudent.name} picked up ${awards} recognition${awards === 1 ? '' : 's'} and ${totalPoints} total points.`
        const trendLine = `Between ${firstDate} and ${lastDate}, ${strengthLine}`
        const closingLine = `In short, ${selectedStudent.name} shows a steady, positive presence that teachers notice and appreciate.`
        exportPDF(
          `Student Report: ${selectedStudent.name}`,
          `Grade ${selectedStudent.grade}${selectedStudent.section} • ${selectedStudent.house || 'House'} • ${hasCustomRange ? customRangeLabel : 'All time'}`,
          rows,
          ['Date', 'Points', 'Category', 'Subcategory', 'Staff Name', 'Notes'],
          {
            variant: 'student',
            summaryHtml: `
              <div>Grade ${selectedStudent.grade}${selectedStudent.section} • ${selectedStudent.house || 'House'} • ${hasCustomRange ? customRangeLabel : 'All time'}</div>
              <div class="subtitle" style="margin-top: 10px;">
                ${summaryLine} ${trendLine} ${noteLine} ${closingLine}
              </div>
              <div class="summary-grid">
                <div class="summary-card">
                  <div class="summary-label">Total Points</div>
                  <div class="summary-value">${totalPoints}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Awards</div>
                  <div class="summary-value">${awards}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">First Entry</div>
                  <div class="summary-value">${firstDate}</div>
                </div>
                <div class="summary-card">
                  <div class="summary-label">Last Entry</div>
                  <div class="summary-value">${lastDate}</div>
                </div>
              </div>
            `,
          }
        )
      }
    } finally {
      setIsGenerating(null)
    }
  }

  const filteredStudents = students
    .filter((s) => studentSearch && s.name.toLowerCase().includes(studentSearch.toLowerCase()))
    .slice(0, 8)

  const houseOptions = [
    'House of Abū Bakr',
    'House of Khadījah',
    'House of ʿUmar',
    'House of ʿĀʾishah',
  ]
  const houseLogos: Record<string, string> = {
    'House of Abū Bakr': '/House of Abū Bakr.png',
    'House of Khadījah': '/House of Khadījah.png',
    'House of ʿUmar': '/House of ʿUmar.png',
    'House of ʿĀʾishah': '/House of ʿĀʾishah.png',
  }
  const gradeOptions = [...new Set(students.map((s) => s.grade))].sort((a, b) => a - b)
  const sectionOptions = selectedGrade
    ? [...new Set(students.filter((s) => s.grade === Number(selectedGrade)).map((s) => s.section))].sort()
    : []

  const buildSummary = (entries: Record<string, string | number | null | undefined>[]) => {
    const totalPoints = entries.reduce((sum, entry) => sum + Number(entry.points ?? 0), 0)
    const uniqueStudents = new Set(entries.map((entry) => `${entry.student_name || ''}|${entry.grade || ''}|${entry.section || ''}`)).size
    const activeStaff = new Set(entries.map((entry) => String(entry.staff_name || '')).filter(Boolean)).size
    return { totalPoints, uniqueStudents, activeStaff, awards: entries.length }
  }

  const generateHouseReport = async (format: 'CSV' | 'PDF') => {
    if (!selectedHouse) return
    setIsGenerating(`house-${format}`)
    try {
      const data = await fetchAllMeritEntries()
      const entries = data.filter((m) => isWithinRange(m.timestamp || '') && String(m.house ?? '').trim() === selectedHouse)
      const summary = buildSummary(entries)
      const rows = entries.map((entry) => ([
        entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '',
        entry.student_name || '',
        entry.grade || '',
        entry.section || '',
        entry.points || 0,
        entry.staff_name || '',
        getThreeRCategory(entry.r || ''),
        entry.subcategory || '',
      ]))

      if (format === 'CSV') {
        exportCSV(
          [
            ['Date', 'Student Name', 'Grade', 'Section', 'Points', 'Staff Name', 'Category', 'Subcategory'],
            ...rows,
          ],
          `report_house_${selectedHouse.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        )
      } else {
        const logoPath = houseLogos[selectedHouse]
        const logoUrl = logoPath ? `${window.location.origin}${logoPath}` : ''
        exportPDF(
          `House Report: ${selectedHouse}`,
          `${hasCustomRange ? customRangeLabel : 'All time'} • Total Points: ${summary.totalPoints} • Awards: ${summary.awards} • Students: ${summary.uniqueStudents} • Staff: ${summary.activeStaff}`,
          rows,
          ['Date', 'Student Name', 'Grade', 'Section', 'Points', 'Staff Name', 'Category', 'Subcategory'],
          {
            summaryHtml: `
              <div style="display:flex; align-items:center; gap:12px;">
                ${logoUrl ? `<img src="${logoUrl}" alt="${selectedHouse} logo" style="width:56px; height:56px; object-fit:contain;" />` : ''}
                <div>${hasCustomRange ? customRangeLabel : 'All time'} • Total Points: ${summary.totalPoints} • Awards: ${summary.awards} • Students: ${summary.uniqueStudents} • Staff: ${summary.activeStaff}</div>
              </div>
            `,
          }
        )
      }
    } finally {
      setIsGenerating(null)
    }
  }

  const generateGradeReport = async (format: 'CSV' | 'PDF') => {
    if (!selectedGrade) return
    setIsGenerating(`grade-${format}`)
    try {
      const data = await fetchAllMeritEntries()
      const entries = data.filter((m) => isWithinRange(m.timestamp || '') && String(m.grade || '') === selectedGrade)
      const summary = buildSummary(entries)
      const rows = entries.map((entry) => ([
        entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '',
        entry.student_name || '',
        entry.section || '',
        entry.house || '',
        entry.points || 0,
        entry.staff_name || '',
        getThreeRCategory(entry.r || ''),
        entry.subcategory || '',
      ]))

      if (format === 'CSV') {
        exportCSV(
          [
            ['Date', 'Student Name', 'Section', 'House', 'Points', 'Staff Name', 'Category', 'Subcategory'],
            ...rows,
          ],
          `report_grade_${selectedGrade}_${new Date().toISOString().split('T')[0]}.csv`
        )
      } else {
        exportPDF(
          `Grade Report: Grade ${selectedGrade}`,
          `${hasCustomRange ? customRangeLabel : 'All time'} • Total Points: ${summary.totalPoints} • Awards: ${summary.awards} • Students: ${summary.uniqueStudents} • Staff: ${summary.activeStaff}`,
          rows,
          ['Date', 'Student Name', 'Section', 'House', 'Points', 'Staff Name', 'Category', 'Subcategory']
        )
      }
    } finally {
      setIsGenerating(null)
    }
  }

  const generateSectionReport = async (format: 'CSV' | 'PDF') => {
    if (!selectedGrade || !selectedSection) return
    setIsGenerating(`section-${format}`)
    try {
      const data = await fetchAllMeritEntries()
      const entries = data.filter((m) =>
        isWithinRange(m.timestamp || '') &&
        String(m.grade || '') === selectedGrade &&
        String(m.section || '').toLowerCase() === selectedSection.toLowerCase()
      )
      const summary = buildSummary(entries)
      const rows = entries.map((entry) => ([
        entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '',
        entry.student_name || '',
        entry.house || '',
        entry.points || 0,
        entry.staff_name || '',
        getThreeRCategory(entry.r || ''),
        entry.subcategory || '',
      ]))

      if (format === 'CSV') {
        exportCSV(
          [
            ['Date', 'Student Name', 'House', 'Points', 'Staff Name', 'Category', 'Subcategory'],
            ...rows,
          ],
          `report_grade_${selectedGrade}_section_${selectedSection}_${new Date().toISOString().split('T')[0]}.csv`
        )
      } else {
        exportPDF(
          `Grade/Section Report: Grade ${selectedGrade}${selectedSection}`,
          `${hasCustomRange ? customRangeLabel : 'All time'} • Total Points: ${summary.totalPoints} • Awards: ${summary.awards} • Students: ${summary.uniqueStudents} • Staff: ${summary.activeStaff}`,
          rows,
          ['Date', 'Student Name', 'House', 'Points', 'Staff Name', 'Category', 'Subcategory']
        )
      }
    } finally {
      setIsGenerating(null)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Reports
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">
            Generate exports and printable summaries
          </p>
        </div>
      </div>

      <div className="regal-card rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-[#1a1a2e] uppercase tracking-wider">
              Report Date Range
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#f5f3ef] text-[#1a1a2e]/60 border border-[#c9a227]/20">
              {rangeBadgeLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold text-[#1a1a2e]/40 uppercase tracking-wider">
              Start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="regal-input px-3 py-2 rounded-xl text-sm"
            />
            <label className="text-xs font-semibold text-[#1a1a2e]/40 uppercase tracking-wider">
              End
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="regal-input px-3 py-2 rounded-xl text-sm"
            />
          </div>
        </div>
      </div>

      <div className="regal-card rounded-2xl p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              Student Report
            </h3>
            <p className="text-xs text-[#1a1a2e]/50 mt-1">
              Generate a detailed report for a single student.
            </p>
          </div>
          <div className="text-xs px-2.5 py-1 rounded-full bg-[#f5f3ef] text-[#1a1a2e]/60 border border-[#c9a227]/20">
            PDF / CSV
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-1.5 uppercase tracking-wider">
              Student
            </label>
            <div className="relative">
              <input
                type="text"
                value={studentSearch}
                onChange={(event) => {
                  setStudentSearch(event.target.value)
                  setSelectedStudent(null)
                }}
                placeholder="Search by student name..."
                className="regal-input w-full px-3 py-2.5 rounded-xl text-sm"
              />
              {studentSearch && (
                <div className="absolute z-10 mt-2 w-full rounded-xl border border-[#c9a227]/20 bg-white shadow-lg overflow-hidden">
                  {filteredStudents.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-[#1a1a2e]/40">No matches found</div>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={`${student.name}-${student.grade}-${student.section}`}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-[#f5f3ef] text-sm"
                        onClick={() => {
                          setSelectedStudent(student)
                          setStudentSearch(`${student.name} (Grade ${student.grade}${student.section})`)
                        }}
                      >
                        <span className="font-semibold text-[#1a1a2e]">{student.name}</span>
                        <span className="text-xs text-[#1a1a2e]/40"> • Grade {student.grade}{student.section} • {student.house}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => generateStudentReport('PDF')}
              disabled={!selectedStudent || isGenerating === 'student-PDF'}
              className="btn-gold px-4 py-2 text-sm rounded-xl disabled:opacity-60"
            >
              {isGenerating === 'student-PDF' ? 'Generating...' : 'PDF'}
            </button>
            <button
              onClick={() => generateStudentReport('CSV')}
              disabled={!selectedStudent || isGenerating === 'student-CSV'}
              className="px-4 py-2 text-sm rounded-xl border border-[#c9a227]/30 text-[#1a1a2e] bg-white hover:border-[#c9a227]/60 transition disabled:opacity-60"
            >
              {isGenerating === 'student-CSV' ? 'Generating...' : 'CSV'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="regal-card rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                House Report
              </h3>
              <p className="text-xs text-[#1a1a2e]/50 mt-1">Totals and entries for a single house.</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#f5f3ef] text-[#1a1a2e]/60 border border-[#c9a227]/20">
              PDF / CSV
            </span>
          </div>
          <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-1.5 uppercase tracking-wider">
            House
          </label>
          <select
            value={selectedHouse}
            onChange={(event) => setSelectedHouse(event.target.value)}
            className="regal-input w-full px-3 py-2.5 rounded-xl text-sm mb-4"
          >
            <option value="">Select house</option>
            {houseOptions.map((house) => (
              <option key={house} value={house}>{house}</option>
            ))}
          </select>
          {selectedHouse && houseLogos[selectedHouse] && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#c9a227]/15 bg-[#fbf8f1] px-3 py-2">
              <img
                src={houseLogos[selectedHouse]}
                alt={`${selectedHouse} logo`}
                className="h-10 w-10 object-contain"
              />
              <span className="text-sm font-medium text-[#1a1a2e]">{selectedHouse}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => generateHouseReport('PDF')}
              disabled={!selectedHouse || isGenerating === 'house-PDF'}
              className="btn-gold px-4 py-2 text-sm rounded-xl disabled:opacity-60"
            >
              {isGenerating === 'house-PDF' ? 'Generating...' : 'PDF'}
            </button>
            <button
              onClick={() => generateHouseReport('CSV')}
              disabled={!selectedHouse || isGenerating === 'house-CSV'}
              className="px-4 py-2 text-sm rounded-xl border border-[#c9a227]/30 text-[#1a1a2e] bg-white hover:border-[#c9a227]/60 transition disabled:opacity-60"
            >
              {isGenerating === 'house-CSV' ? 'Generating...' : 'CSV'}
            </button>
          </div>
        </div>

        <div className="regal-card rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                Grade Report
              </h3>
              <p className="text-xs text-[#1a1a2e]/50 mt-1">Totals and entries for a grade.</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#f5f3ef] text-[#1a1a2e]/60 border border-[#c9a227]/20">
              PDF / CSV
            </span>
          </div>
          <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-1.5 uppercase tracking-wider">
            Grade
          </label>
          <select
            value={selectedGrade}
            onChange={(event) => {
              setSelectedGrade(event.target.value)
              setSelectedSection('')
            }}
            className="regal-input w-full px-3 py-2.5 rounded-xl text-sm mb-4"
          >
            <option value="">Select grade</option>
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => generateGradeReport('PDF')}
              disabled={!selectedGrade || isGenerating === 'grade-PDF'}
              className="btn-gold px-4 py-2 text-sm rounded-xl disabled:opacity-60"
            >
              {isGenerating === 'grade-PDF' ? 'Generating...' : 'PDF'}
            </button>
            <button
              onClick={() => generateGradeReport('CSV')}
              disabled={!selectedGrade || isGenerating === 'grade-CSV'}
              className="px-4 py-2 text-sm rounded-xl border border-[#c9a227]/30 text-[#1a1a2e] bg-white hover:border-[#c9a227]/60 transition disabled:opacity-60"
            >
              {isGenerating === 'grade-CSV' ? 'Generating...' : 'CSV'}
            </button>
          </div>
        </div>

        <div className="regal-card rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                Grade/Section Report
              </h3>
              <p className="text-xs text-[#1a1a2e]/50 mt-1">Totals and entries for one section.</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#f5f3ef] text-[#1a1a2e]/60 border border-[#c9a227]/20">
              PDF / CSV
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-1.5 uppercase tracking-wider">
                Grade
              </label>
              <select
                value={selectedGrade}
                onChange={(event) => {
                  setSelectedGrade(event.target.value)
                  setSelectedSection('')
                }}
                className="regal-input w-full px-3 py-2.5 rounded-xl text-sm"
              >
                <option value="">Grade</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-1.5 uppercase tracking-wider">
                Section
              </label>
              <select
                value={selectedSection}
                onChange={(event) => setSelectedSection(event.target.value)}
                className="regal-input w-full px-3 py-2.5 rounded-xl text-sm"
              >
                <option value="">Section</option>
                {sectionOptions.map((section) => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => generateSectionReport('PDF')}
              disabled={!selectedGrade || !selectedSection || isGenerating === 'section-PDF'}
              className="btn-gold px-4 py-2 text-sm rounded-xl disabled:opacity-60"
            >
              {isGenerating === 'section-PDF' ? 'Generating...' : 'PDF'}
            </button>
            <button
              onClick={() => generateSectionReport('CSV')}
              disabled={!selectedGrade || !selectedSection || isGenerating === 'section-CSV'}
              className="px-4 py-2 text-sm rounded-xl border border-[#c9a227]/30 text-[#1a1a2e] bg-white hover:border-[#c9a227]/60 transition disabled:opacity-60"
            >
              {isGenerating === 'section-CSV' ? 'Generating...' : 'CSV'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {templates.map((template) => (
          <div key={template.id} className="regal-card rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  {template.title}
                </h3>
                <p className="text-xs text-[#1a1a2e]/50 mt-1">{template.description}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#f5f3ef] text-[#1a1a2e]/60 border border-[#c9a227]/20">
                {template.scope}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#1a1a2e]/40">{template.format}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => generateReport(template, 'PDF')}
                  disabled={isGenerating === `${template.id}-PDF`}
                  className="btn-gold px-4 py-2 text-sm rounded-xl disabled:opacity-60"
                >
                  {isGenerating === `${template.id}-PDF` ? 'Generating...' : 'PDF'}
                </button>
                <button
                  onClick={() => generateReport(template, 'CSV')}
                  disabled={isGenerating === `${template.id}-CSV`}
                  className="px-4 py-2 text-sm rounded-xl border border-[#c9a227]/30 text-[#1a1a2e] bg-white hover:border-[#c9a227]/60 transition disabled:opacity-60"
                >
                  {isGenerating === `${template.id}-CSV` ? 'Generating...' : 'CSV'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="regal-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Saved Report Templates
        </h3>
        <p className="text-xs text-[#1a1a2e]/50 mt-1">
          Coming next: save custom filters, schedule exports, and track history.
        </p>
      </div>
    </div>
  )
}
