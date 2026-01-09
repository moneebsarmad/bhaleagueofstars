'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import CrestLoader from '@/components/CrestLoader'
import { useSessionStorageState } from '@/hooks/useSessionStorageState'
import { getSchoolDays } from '@/lib/schoolDays'

type MeritEntry = {
  staff_name: string | null
  student_name: string | null
  grade: number | null
  section: string | null
  house: string | null
  r: string | null
  subcategory: string | null
  points: number | null
  notes: string | null
  date_of_event: string | null
  timestamp: string | null
}

type StaffRow = {
  staff_name: string | null
  email: string | null
}

type StudentRow = {
  student_name: string | null
  grade: number | null
  section: string | null
  house: string | null
}

type ImplementationEvent = {
  event_type: string
  event_date: string
  cycle_id: number
}

type DecisionRow = {
  id: string
  cycle_id: number
  trigger_id: string | null
  trigger_summary: string | null
  selected_actions: string[]
  owner: string
  due_date: string | null
  status: string
  notes: string | null
  created_at: string
}

type ActionMenu = {
  id: string
  title: string
  description: string
  steps: string[]
  owner_role: string | null
  success_metric: string | null
}

type TriggerItem = {
  id: string
  name: string
  severity: 'Green' | 'Yellow' | 'Red'
  summary: string
  actionIds: string[]
  metricValues: Record<string, number | string>
}

const CYCLE_START_DATE = new Date('2025-08-19')
const CYCLE_LENGTH_DAYS = 14
const WINTER_SEMESTER_START = '2026-01-06'

const PRESETS = [
  { id: 'last14', label: 'Last 14' },
  { id: 'last30', label: 'Last 30' },
  { id: 'mtd', label: 'This Month' },
  { id: 'ytd', label: 'Year to Date' },
]

const ACTION_IDS_BY_TRIGGER: Record<string, string[]> = {
  adoption_low: ['AM01'],
  lottery_high: ['AM02'],
  inflation_high: ['AM03'],
  other_overuse: ['AM04'],
  weak_grade: ['AM05'],
  time_spike: ['AM06'],
  repeat_student: ['AM07'],
  roster_hygiene: ['AM08'],
  calibration_stale: ['AM09'],
  low_diversity: ['AM10'],
  decision_missing: ['AM11'],
  recognition_missing: ['AM12'],
}

function toLocalDateString(date: Date) {
  const local = new Date(date)
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset())
  return local.toISOString().split('T')[0]
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function getCycleId(date: Date) {
  const diff = Math.floor((date.getTime() - CYCLE_START_DATE.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.floor(diff / CYCLE_LENGTH_DAYS) + 1)
}

function getCycleRange(cycleId: number) {
  const start = addDays(CYCLE_START_DATE, (cycleId - 1) * CYCLE_LENGTH_DAYS)
  const end = addDays(start, CYCLE_LENGTH_DAYS - 1)
  return { start, end }
}

function computeRag(value: number, green: number, yellow: number, higherIsBetter = true) {
  if (higherIsBetter) {
    if (value >= green) return 'Green'
    if (value >= yellow) return 'Yellow'
    return 'Red'
  }
  if (value <= green) return 'Green'
  if (value <= yellow) return 'Yellow'
  return 'Red'
}

function getEntryDateString(entry: MeritEntry) {
  if (entry.date_of_event) return entry.date_of_event
  if (entry.timestamp) return toLocalDateString(new Date(entry.timestamp))
  return ''
}

export default function ImplementationHealthPage() {
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useSessionStorageState('admin:implementation-health:preset', 'last14')
  const [excludeWeekends, setExcludeWeekends] = useSessionStorageState('admin:implementation-health:excludeWeekends', true)
  const [filters, setFilters] = useSessionStorageState('admin:implementation-health:filters', {
    house: '',
    grade: '',
    section: '',
    staff: '',
    category: '',
    subcategory: '',
  })
  const [entries, setEntries] = useState<MeritEntry[]>([])
  const [staffRows, setStaffRows] = useState<StaffRow[]>([])
  const [studentRows, setStudentRows] = useState<StudentRow[]>([])
  const [events, setEvents] = useState<ImplementationEvent[]>([])
  const [decisions, setDecisions] = useState<DecisionRow[]>([])
  const [actions, setActions] = useState<ActionMenu[]>([])
  const [baseline, setBaseline] = useState<{ start: string; end: string } | null>(null)
  const [calendarDates, setCalendarDates] = useState<string[]>([])
  const [decisionForm, setDecisionForm] = useSessionStorageState('admin:implementation-health:decisionForm', {
    triggerId: '',
    summary: '',
    owner: '',
    dueDate: '',
    status: 'Planned',
    selectedActions: [] as string[],
  })

  const today = new Date()
  const currentCycleId = useMemo(() => getCycleId(today), [today])
  const cycleRange = useMemo(() => getCycleRange(currentCycleId), [currentCycleId])
  const lastCycles = useMemo(() => [currentCycleId - 3, currentCycleId - 2, currentCycleId - 1, currentCycleId].filter((id) => id > 0), [currentCycleId])

  const dateRange = useMemo(() => {
    const end = new Date()
    let start = new Date()
    if (preset === 'last14') start = addDays(end, -13)
    if (preset === 'last30') start = addDays(end, -29)
    if (preset === 'mtd') start = new Date(end.getFullYear(), end.getMonth(), 1)
    if (preset === 'ytd') start = new Date(end.getFullYear(), 0, 1)
    return { start, end }
  }, [preset])

  const getSchoolDayOptions = () => ({
    excludeWeekends,
    calendarDates: calendarDates.length > 0 ? calendarDates : undefined,
  })

  const getSchoolDayCount = (start: Date, end: Date, clampToSemesterStart = true) => {
    let effectiveStart = new Date(start)
    if (clampToSemesterStart) {
      const semesterStart = new Date(`${WINTER_SEMESTER_START}T00:00:00Z`)
      if (effectiveStart < semesterStart) {
        effectiveStart = semesterStart
      }
    }
    if (effectiveStart > end) return 1
    const days = getSchoolDays(toLocalDateString(effectiveStart), toLocalDateString(end), getSchoolDayOptions())
    return Math.max(1, days.length)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const startDate = toLocalDateString(addDays(dateRange.start, -31))
      const endDate = toLocalDateString(dateRange.end)

      const [entriesRes, staffRes, studentRes, eventsRes, decisionsRes, actionsRes, baselineRes] = await Promise.all([
        supabase
          .from('merit_log')
          .select('staff_name, student_name, grade, section, house, r, subcategory, points, notes, date_of_event, timestamp')
          .gte('date_of_event', startDate)
          .lte('date_of_event', endDate),
        supabase.from('staff').select('staff_name, email'),
        supabase.from('students').select('student_name, grade, section, house'),
        supabase
          .from('implementation_events')
          .select('event_type, event_date, cycle_id')
          .gte('event_date', toLocalDateString(addDays(today, -70))),
        supabase
          .from('decision_log')
          .select('*')
          .in('cycle_id', lastCycles)
          .order('created_at', { ascending: false }),
        supabase.from('action_menu').select('*'),
        supabase.from('baseline_config').select('start_date, end_date').order('created_at', { ascending: false }).limit(1),
      ])

      setEntries((entriesRes.data || []) as MeritEntry[])
      setStaffRows((staffRes.data || []) as StaffRow[])
      setStudentRows((studentRes.data || []) as StudentRow[])
      setEvents((eventsRes.data || []) as ImplementationEvent[])
      setDecisions((decisionsRes.data || []) as DecisionRow[])
      setActions((actionsRes.data || []) as ActionMenu[])
      if (baselineRes.data && baselineRes.data.length > 0) {
        const row = baselineRes.data[0]
        setBaseline({ start: row.start_date, end: row.end_date })
      }
      const calendarStart = (() => {
        let start = startDate
        if (baselineRes.data && baselineRes.data.length > 0) {
          const row = baselineRes.data[0]
          if (row.start_date && row.start_date < start) start = row.start_date
        }
        return start
      })()
      const calendarEnd = (() => {
        let end = endDate
        if (baselineRes.data && baselineRes.data.length > 0) {
          const row = baselineRes.data[0]
          if (row.end_date && row.end_date > end) end = row.end_date
        }
        return end
      })()

      const calendarRes = await supabase
        .from('school_calendar')
        .select('school_date, is_school_day')
        .gte('school_date', calendarStart)
        .lte('school_date', calendarEnd)
        .eq('is_school_day', true)

      if (calendarRes.error) {
        console.error('Error fetching school calendar:', calendarRes.error)
        setCalendarDates([])
      } else {
        setCalendarDates((calendarRes.data || []).map((row) => String(row.school_date)))
      }
      setLoading(false)
    }

    fetchData()
  }, [dateRange, lastCycles])

  const filteredEntries = useMemo(() => {
    const { start, end } = dateRange
    return entries.filter((entry) => {
      const date = entry.date_of_event ? new Date(entry.date_of_event) : entry.timestamp ? new Date(entry.timestamp) : null
      if (!date || date < start || date > end) return false
      if (filters.house && entry.house !== filters.house) return false
      if (filters.grade && String(entry.grade ?? '') !== filters.grade) return false
      if (filters.section && entry.section !== filters.section) return false
      if (filters.staff && (entry.staff_name || '') !== filters.staff) return false
      if (filters.category && (entry.r || '') !== filters.category) return false
      if (filters.subcategory && (entry.subcategory || '') !== filters.subcategory) return false
      return true
    })
  }, [entries, dateRange, filters])

  const currentSchoolDayDates = useMemo(() => {
    const semesterStart = new Date(`${WINTER_SEMESTER_START}T00:00:00Z`)
    const effectiveStart = dateRange.start < semesterStart ? semesterStart : dateRange.start
    return getSchoolDays(
      toLocalDateString(effectiveStart),
      toLocalDateString(dateRange.end),
      getSchoolDayOptions()
    )
  }, [dateRange, calendarDates, excludeWeekends])

  const previousSchoolDayDates = useMemo(() => {
    if (currentSchoolDayDates.length === 0) return []
    const allSchoolDays = getSchoolDays(
      WINTER_SEMESTER_START,
      toLocalDateString(dateRange.end),
      getSchoolDayOptions()
    )
    const firstCurrent = currentSchoolDayDates[0]
    const firstIndex = allSchoolDays.indexOf(firstCurrent)
    if (firstIndex <= 0) return []
    const startIndex = Math.max(0, firstIndex - currentSchoolDayDates.length)
    return allSchoolDays.slice(startIndex, firstIndex)
  }, [currentSchoolDayDates, dateRange, calendarDates, excludeWeekends])

  const previousRangeEntries = useMemo(() => {
    if (previousSchoolDayDates.length === 0) return []
    const previousSet = new Set(previousSchoolDayDates)
    return entries.filter((entry) => {
      const entryDate = getEntryDateString(entry)
      if (!entryDate || !previousSet.has(entryDate)) return false
      if (filters.house && entry.house !== filters.house) return false
      if (filters.grade && String(entry.grade ?? '') !== filters.grade) return false
      if (filters.section && entry.section !== filters.section) return false
      if (filters.staff && (entry.staff_name || '') !== filters.staff) return false
      if (filters.category && (entry.r || '') !== filters.category) return false
      if (filters.subcategory && (entry.subcategory || '') !== filters.subcategory) return false
      return true
    })
  }, [entries, filters, previousSchoolDayDates])

  const eligibleStaff = useMemo(() => {
    const names = staffRows.map((row) => row.staff_name).filter(Boolean) as string[]
    return Array.from(new Set(names))
  }, [staffRows])

  const staffCounts = useMemo(() => {
    const map = new Map<string, number>()
    filteredEntries.forEach((entry) => {
      const name = entry.staff_name?.trim()
      if (!name) return
      map.set(name, (map.get(name) || 0) + 1)
    })
    return map
  }, [filteredEntries])

  const activeLoggers = staffCounts.size
  const schoolDays = getSchoolDayCount(dateRange.start, dateRange.end)
  const totalEntries = filteredEntries.length
  const activeLoggerRate = eligibleStaff.length > 0 ? activeLoggers / eligibleStaff.length : 0
  const entriesPerActiveLogger = activeLoggers > 0 ? totalEntries / (activeLoggers * schoolDays) : 0

  const previousActiveLoggers = useMemo(() => {
    const prevStaffCounts = new Map<string, number>()
    previousRangeEntries.forEach((entry) => {
      const name = entry.staff_name?.trim()
      if (!name) return
      prevStaffCounts.set(name, (prevStaffCounts.get(name) || 0) + 1)
    })
    return prevStaffCounts.size
  }, [previousRangeEntries])

  const previousEntries = previousRangeEntries.length
  const prevSchoolDays = Math.max(1, previousSchoolDayDates.length)
  const prevEntriesPerActiveLogger =
    previousActiveLoggers > 0 ? previousEntries / (previousActiveLoggers * prevSchoolDays) : 0

  const adoptionRag = computeRag(activeLoggerRate, 0.7, 0.55, true)
  const adoptionDelta = activeLoggerRate - (previousActiveLoggers > 0 ? previousActiveLoggers / eligibleStaff.length : 0)

  const entriesDelta = totalEntries - previousEntries

  const topStaffShares = useMemo(() => {
    const counts = Array.from(staffCounts.values()).sort((a, b) => b - a)
    const total = totalEntries || 1
    const top1 = counts[0] ? counts[0] / total : 0
    const top3 = (counts[0] || 0) + (counts[1] || 0) + (counts[2] || 0)
    return { top1, top3: top3 / total }
  }, [staffCounts, totalEntries])

  const teacherLotteryRag =
    topStaffShares.top1 > 0.45 || topStaffShares.top3 > 0.8
      ? 'Red'
      : topStaffShares.top1 > 0.35 || topStaffShares.top3 > 0.7
      ? 'Yellow'
      : 'Green'

  const distributionTiers = useMemo(() => {
    const tierCounts = { zero: 0, low: 0, mid: 0, high: 0 }
    eligibleStaff.forEach((name) => {
      const count = staffCounts.get(name) || 0
      if (count === 0) tierCounts.zero += 1
      else if (count <= 2) tierCounts.low += 1
      else if (count <= 10) tierCounts.mid += 1
      else tierCounts.high += 1
    })
    return tierCounts
  }, [eligibleStaff, staffCounts])

  const eventsByType = useMemo(() => {
    const map = new Map<string, ImplementationEvent[]>()
    events.forEach((event) => {
      if (!map.has(event.event_type)) map.set(event.event_type, [])
      map.get(event.event_type)?.push(event)
    })
    return map
  }, [events])

  const huddleThisCycle = eventsByType.get('HUDDLE')?.some((event) => event.cycle_id === currentCycleId) || false
  const huddleLast4 = lastCycles.filter((id) => eventsByType.get('HUDDLE')?.some((event) => event.cycle_id === id)).length
  const huddleRag =
    huddleThisCycle && huddleLast4 >= 3 ? 'Green' : huddleThisCycle || huddleLast4 >= 3 ? 'Yellow' : 'Red'

  const latestCalibration = eventsByType
    .get('CALIBRATION')
    ?.map((event) => event.event_date)
    .sort()
    .slice(-1)[0]
  const calibrationDays = latestCalibration ? Math.floor((today.getTime() - new Date(latestCalibration).getTime()) / (1000 * 60 * 60 * 24)) : null
  const calibrationRag =
    calibrationDays === null ? 'Red' : calibrationDays <= 45 ? 'Green' : calibrationDays <= 75 ? 'Yellow' : 'Red'

  const recentRecognition = eventsByType
    .get('RECOGNITION')
    ?.some((event) => new Date(event.event_date) >= addDays(today, -14)) || false

  const otherEntries = filteredEntries.filter((entry) => {
    const category = (entry.r || '').toLowerCase()
    const sub = (entry.subcategory || '').toLowerCase()
    return category.includes('other') || sub.includes('other')
  })
  const otherPct = totalEntries > 0 ? otherEntries.length / totalEntries : 0

  const notesRequiredEntries = filteredEntries.filter((entry) => {
    const category = (entry.r || '').toLowerCase()
    const sub = (entry.subcategory || '').toLowerCase()
    const points = Number(entry.points || 0)
    return category.includes('other') || sub.includes('other') || points >= 10
  })
  const notesCompleted = notesRequiredEntries.filter((entry) => entry.notes && entry.notes.trim().length > 0).length
  const notesCompliance = notesRequiredEntries.length > 0 ? notesCompleted / notesRequiredEntries.length : 1

  const baselineRate = useMemo(() => {
    if (!baseline) return null
    const baselineStart = new Date(baseline.start)
    const baselineEnd = new Date(baseline.end)
    const baselineEntries = entries.filter((entry) => {
      const date = entry.date_of_event ? new Date(entry.date_of_event) : null
      if (!date || date < baselineStart || date > baselineEnd) return false
      return true
    })
    const baselineStaff = new Set(baselineEntries.map((entry) => entry.staff_name).filter(Boolean))
    const baselineSchoolDays = getSchoolDayCount(baselineStart, baselineEnd, false)
    return baselineStaff.size > 0 ? baselineEntries.length / (baselineStaff.size * baselineSchoolDays) : null
  }, [baseline, entries, excludeWeekends, calendarDates])

  const inflationIndex =
    baselineRate && baselineRate > 0 ? entriesPerActiveLogger / baselineRate : 1
  const inflationRag =
    inflationIndex > 1.8 || inflationIndex < 0.5
      ? 'Red'
      : inflationIndex > 1.3 || inflationIndex < 0.7
      ? 'Yellow'
      : 'Green'

  const staffNameSet = useMemo(() => new Set(eligibleStaff.map((name) => name.toLowerCase())), [eligibleStaff])
  const studentNameSet = useMemo(
    () => new Set(studentRows.map((row) => row.student_name?.toLowerCase()).filter(Boolean) as string[]),
    [studentRows]
  )

  const unknownStaffCount = filteredEntries.filter((entry) => {
    const name = entry.staff_name?.toLowerCase()
    return name && !staffNameSet.has(name)
  }).length
  const orphanStudentCount = filteredEntries.filter((entry) => {
    const name = entry.student_name?.toLowerCase()
    return name && !studentNameSet.has(name)
  }).length
  const missingStudentMapping = studentRows.filter((row) => !row.grade || !row.section || !row.house).length

  const rosterIssues = unknownStaffCount + orphanStudentCount + missingStudentMapping
  const rosterRag = rosterIssues === 0 ? 'Green' : rosterIssues <= 5 ? 'Yellow' : 'Red'

  const repeatStudentCount = useMemo(() => {
    const sevenDaysAgo = addDays(today, -7)
    const map = new Map<string, number>()
    filteredEntries.forEach((entry) => {
      const date = entry.date_of_event ? new Date(entry.date_of_event) : null
      if (!date || date < sevenDaysAgo) return
      const name = entry.student_name || ''
      if (!name) return
      map.set(name, (map.get(name) || 0) + 1)
    })
    return Array.from(map.values()).filter((count) => count > 8).length
  }, [filteredEntries, today])

  const topStaffShare = totalEntries > 0 ? topStaffShares.top1 : 0

  const decisionLoggedThisCycle = decisions.some((decision) => decision.cycle_id === currentCycleId)
  const decisionCyclesLogged = new Set(decisions.map((decision) => decision.cycle_id)).size
  const decisionComplianceRag =
    decisionLoggedThisCycle && decisionCyclesLogged >= 3 ? 'Green' : decisionLoggedThisCycle || decisionCyclesLogged >= 3 ? 'Yellow' : 'Red'

  const overdueDecisions = decisions.filter((decision) => {
    if (!decision.due_date) return false
    if (['Completed', 'Dropped'].includes(decision.status)) return false
    return new Date(decision.due_date) < today
  })
  const followThroughRag =
    overdueDecisions.length > 3 ? 'Red' : overdueDecisions.length >= 2 ? 'Yellow' : 'Green'

  const triggers = useMemo<TriggerItem[]>(() => {
    const list: TriggerItem[] = []
    if (activeLoggerRate < 0.55) {
      list.push({
        id: 'adoption_low',
        name: 'Adoption Low',
        severity: 'Red',
        summary: `Active logger rate ${Math.round(activeLoggerRate * 100)}%`,
        actionIds: ACTION_IDS_BY_TRIGGER.adoption_low,
        metricValues: { activeLoggerRate: Math.round(activeLoggerRate * 100) + '%' },
      })
    } else if (activeLoggerRate < 0.7) {
      list.push({
        id: 'adoption_low',
        name: 'Adoption Low',
        severity: 'Yellow',
        summary: `Active logger rate ${Math.round(activeLoggerRate * 100)}%`,
        actionIds: ACTION_IDS_BY_TRIGGER.adoption_low,
        metricValues: { activeLoggerRate: Math.round(activeLoggerRate * 100) + '%' },
      })
    }

    if (teacherLotteryRag !== 'Green') {
      list.push({
        id: 'lottery_high',
        name: 'Teacher Lottery Risk',
        severity: teacherLotteryRag,
        summary: `Top 1 share ${(topStaffShares.top1 * 100).toFixed(0)}%`,
        actionIds: ACTION_IDS_BY_TRIGGER.lottery_high,
        metricValues: { top1: (topStaffShares.top1 * 100).toFixed(0) + '%' },
      })
    }

    if (inflationRag !== 'Green') {
      list.push({
        id: 'inflation_high',
        name: 'Inflation Risk',
        severity: inflationRag,
        summary: `Inflation index ${inflationIndex.toFixed(2)}`,
        actionIds: ACTION_IDS_BY_TRIGGER.inflation_high,
        metricValues: { inflationIndex: inflationIndex.toFixed(2) },
      })
    }

    if (otherPct > 0.12 || notesCompliance < 0.85) {
      list.push({
        id: 'other_overuse',
        name: 'Other Usage / Notes',
        severity: otherPct > 0.2 || notesCompliance < 0.7 ? 'Red' : 'Yellow',
        summary: `Other ${(otherPct * 100).toFixed(0)}%, Notes ${(notesCompliance * 100).toFixed(0)}%`,
        actionIds: ACTION_IDS_BY_TRIGGER.other_overuse,
        metricValues: { otherPct: (otherPct * 100).toFixed(0) + '%', notes: (notesCompliance * 100).toFixed(0) + '%' },
      })
    }

    if (rosterIssues > 0) {
      list.push({
        id: 'roster_hygiene',
        name: 'Roster Hygiene',
        severity: rosterIssues > 5 || unknownStaffCount > 0 ? 'Red' : 'Yellow',
        summary: `${rosterIssues} issues detected`,
        actionIds: ACTION_IDS_BY_TRIGGER.roster_hygiene,
        metricValues: { rosterIssues },
      })
    }

    if (calibrationRag !== 'Green') {
      list.push({
        id: 'calibration_stale',
        name: 'Calibration Stale',
        severity: calibrationRag,
        summary: calibrationDays === null ? 'No calibration logged' : `${calibrationDays} days since calibration`,
        actionIds: ACTION_IDS_BY_TRIGGER.calibration_stale,
        metricValues: { calibrationDays: calibrationDays ?? 'n/a' },
      })
    }

    if (!decisionLoggedThisCycle) {
      list.push({
        id: 'decision_missing',
        name: 'Decision Missing',
        severity: 'Red',
        summary: 'No decision logged this cycle',
        actionIds: ACTION_IDS_BY_TRIGGER.decision_missing,
        metricValues: { cycle: currentCycleId },
      })
    }

    if (!recentRecognition) {
      list.push({
        id: 'recognition_missing',
        name: 'Recognition Missing',
        severity: 'Yellow',
        summary: 'No recognition event in last 14 days',
        actionIds: ACTION_IDS_BY_TRIGGER.recognition_missing,
        metricValues: { window: '14 days' },
      })
    }

    if (repeatStudentCount > 0) {
      list.push({
        id: 'repeat_student',
        name: 'Repeat Student Recognition',
        severity: repeatStudentCount > 2 ? 'Red' : 'Yellow',
        summary: `${repeatStudentCount} students over threshold`,
        actionIds: ACTION_IDS_BY_TRIGGER.repeat_student,
        metricValues: { repeatStudentCount },
      })
    }

    if (topStaffShare > 0.4) {
      list.push({
        id: 'lottery_high',
        name: 'Staff Concentration',
        severity: topStaffShare > 0.45 ? 'Red' : 'Yellow',
        summary: `Top staff share ${(topStaffShare * 100).toFixed(0)}%`,
        actionIds: ACTION_IDS_BY_TRIGGER.lottery_high,
        metricValues: { topStaffShare: (topStaffShare * 100).toFixed(0) + '%' },
      })
    }

    return list
  }, [
    activeLoggerRate,
    teacherLotteryRag,
    topStaffShares,
    inflationRag,
    inflationIndex,
    otherPct,
    notesCompliance,
    rosterIssues,
    unknownStaffCount,
    calibrationRag,
    calibrationDays,
    decisionLoggedThisCycle,
    recentRecognition,
    repeatStudentCount,
    currentCycleId,
    topStaffShare,
  ])

  const actionsById = useMemo(() => new Map(actions.map((action) => [action.id, action])), [actions])

  const gradeInsights = useMemo(() => {
    const studentMap = new Map<string, { students: Set<string>; points: number }>()
    studentRows.forEach((student) => {
      const grade = student.grade ? `Grade ${student.grade}` : 'Unknown'
      if (!studentMap.has(grade)) studentMap.set(grade, { students: new Set(), points: 0 })
      if (student.student_name) studentMap.get(grade)?.students.add(student.student_name)
    })
    filteredEntries.forEach((entry) => {
      const grade = entry.grade ? `Grade ${entry.grade}` : 'Unknown'
      if (!studentMap.has(grade)) studentMap.set(grade, { students: new Set(), points: 0 })
      studentMap.get(grade)!.points += Number(entry.points || 0)
    })
    const rows = Array.from(studentMap.entries()).map(([grade, data]) => {
      const count = data.students.size || 1
      return { grade, perStudent: data.points / count }
    }).sort((a, b) => b.perStudent - a.perStudent)
    return {
      strongest: rows[0] || null,
      weakest: rows[rows.length - 1] || null,
      rows,
    }
  }, [filteredEntries, studentRows])

  const subcategoryTrends = useMemo(() => {
    const currentMap = new Map<string, number>()
    const prevMap = new Map<string, number>()
    filteredEntries.forEach((entry) => {
      const key = entry.subcategory || 'Unknown'
      currentMap.set(key, (currentMap.get(key) || 0) + 1)
    })
    previousRangeEntries.forEach((entry) => {
      const key = entry.subcategory || 'Unknown'
      prevMap.set(key, (prevMap.get(key) || 0) + 1)
    })
    const rows = Array.from(new Set([...currentMap.keys(), ...prevMap.keys()])).map((key) => {
      const current = currentMap.get(key) || 0
      const previous = prevMap.get(key) || 0
      const delta = current - previous
      const pct = previous > 0 ? delta / previous : current > 0 ? 1 : 0
      return { key, current, previous, delta, pct }
    }).filter((row) => row.current + row.previous >= 10)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    return rows.slice(0, 6)
  }, [filteredEntries, previousRangeEntries])

  const timeBuckets = useMemo(() => {
    const dayMap = new Map<string, number>()
    filteredEntries.forEach((entry) => {
      const date = entry.date_of_event ? new Date(entry.date_of_event) : null
      if (!date) return
      const label = date.toLocaleDateString('en-US', { weekday: 'short' })
      dayMap.set(label, (dayMap.get(label) || 0) + 1)
    })
    return Array.from(dayMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
  }, [filteredEntries])

  const staffNotesCompliance = useMemo(() => {
    const map = new Map<string, { required: number; completed: number }>()
    filteredEntries.forEach((entry) => {
      const staff = entry.staff_name || 'Unknown'
      const category = (entry.r || '').toLowerCase()
      const sub = (entry.subcategory || '').toLowerCase()
      const points = Number(entry.points || 0)
      const requires = category.includes('other') || sub.includes('other') || points >= 10
      if (!map.has(staff)) map.set(staff, { required: 0, completed: 0 })
      if (requires) {
        map.get(staff)!.required += 1
        if (entry.notes && entry.notes.trim().length > 0) {
          map.get(staff)!.completed += 1
        }
      }
    })
    return Array.from(map.entries())
      .map(([staff, data]) => ({
        staff,
        compliance: data.required === 0 ? 1 : data.completed / data.required,
      }))
      .sort((a, b) => a.compliance - b.compliance)
      .slice(0, 5)
  }, [filteredEntries])

  const handleDecisionCreate = async () => {
    if (!decisionForm.owner) return
    await supabase.from('decision_log').insert([
      {
        cycle_id: currentCycleId,
        trigger_id: decisionForm.triggerId || null,
        trigger_summary: decisionForm.summary || null,
        selected_actions: decisionForm.selectedActions,
        owner: decisionForm.owner,
        due_date: decisionForm.dueDate || null,
        status: decisionForm.status,
      },
    ])
    const { data } = await supabase
      .from('decision_log')
      .select('*')
      .in('cycle_id', lastCycles)
      .order('created_at', { ascending: false })
    setDecisions((data || []) as DecisionRow[])
    setDecisionForm({
      triggerId: '',
      summary: '',
      owner: '',
      dueDate: '',
      status: 'Planned',
      selectedActions: [],
    })
  }

  const handleEventLog = async (eventType: string) => {
    await supabase.from('implementation_events').insert([
      {
        event_type: eventType,
        event_date: toLocalDateString(today),
        cycle_id: currentCycleId,
      },
    ])
    const { data } = await supabase
      .from('implementation_events')
      .select('event_type, event_date, cycle_id')
      .gte('event_date', toLocalDateString(addDays(today, -70)))
    setEvents((data || []) as ImplementationEvent[])
  }

  const outcomePill = (label: string, status: string) => (
    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
      status === 'Green' ? 'bg-[#055437]/10 text-[#055437]' :
      status === 'Yellow' ? 'bg-[#c9a227]/15 text-[#9a7b1a]' :
      'bg-[#910000]/10 text-[#910000]'
    }`}>
      {label}: {status}
    </div>
  )

  if (loading) {
    return <CrestLoader label="Loading implementation health..." />
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Implementation Health
        </h1>
        <p className="text-[#1a1a2e]/50 text-sm font-medium">Biweekly cadence review and action discipline</p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#c9a227]/10">
        <div className="flex flex-wrap items-center gap-3">
          <select value={preset} onChange={(e) => setPreset(e.target.value)} className="px-3 py-2 rounded-lg border border-[#1a1a2e]/10 text-sm">
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <label className="text-sm text-[#1a1a2e]/60 flex items-center gap-2">
            <input type="checkbox" checked={excludeWeekends} onChange={(e) => setExcludeWeekends(e.target.checked)} />
            Exclude weekends
          </label>
          <select value={filters.house} onChange={(e) => setFilters((prev) => ({ ...prev, house: e.target.value }))} className="px-3 py-2 rounded-lg border border-[#1a1a2e]/10 text-sm">
            <option value="">All houses</option>
            {Array.from(new Set(entries.map((e) => e.house).filter(Boolean))).map((house) => (
              <option key={house} value={house || ''}>{house}</option>
            ))}
          </select>
          <select value={filters.grade} onChange={(e) => setFilters((prev) => ({ ...prev, grade: e.target.value }))} className="px-3 py-2 rounded-lg border border-[#1a1a2e]/10 text-sm">
            <option value="">All grades</option>
            {Array.from(new Set(entries.map((e) => e.grade).filter((g) => g !== null && g !== undefined))).map((grade) => (
              <option key={grade} value={String(grade)}>{`Grade ${grade}`}</option>
            ))}
          </select>
          <select value={filters.section} onChange={(e) => setFilters((prev) => ({ ...prev, section: e.target.value }))} className="px-3 py-2 rounded-lg border border-[#1a1a2e]/10 text-sm">
            <option value="">All sections</option>
            {Array.from(new Set(entries.map((e) => e.section).filter(Boolean))).map((section) => (
              <option key={section} value={section || ''}>{`Section ${section}`}</option>
            ))}
          </select>
          <select value={filters.staff} onChange={(e) => setFilters((prev) => ({ ...prev, staff: e.target.value }))} className="px-3 py-2 rounded-lg border border-[#1a1a2e]/10 text-sm">
            <option value="">All staff</option>
            {eligibleStaff.map((staff) => (
              <option key={staff} value={staff}>{staff}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#c9a227]/10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Overall</p>
          <p className="text-2xl font-semibold text-[#1a1a2e] mt-2">
            {adoptionRag === 'Green' && teacherLotteryRag === 'Green' && inflationRag === 'Green' && decisionComplianceRag === 'Green'
              ? 'Strong'
              : 'Watch'}
          </p>
          <p className="text-sm text-[#1a1a2e]/50 mt-1">Updated {toLocalDateString(today)}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {outcomePill('A', adoptionRag)}
            {outcomePill('B', teacherLotteryRag)}
            {outcomePill('C', inflationRag)}
            {outcomePill('D', decisionComplianceRag)}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#c9a227]/10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Next Best Actions</p>
          <div className="mt-3 space-y-2">
            {triggers.slice(0, 3).map((trigger) => (
              <div key={trigger.id} className="text-sm text-[#1a1a2e]">
                <span className="font-semibold">{trigger.name}</span> — {trigger.summary}
              </div>
            ))}
            {triggers.length === 0 && <p className="text-sm text-[#1a1a2e]/50">No triggers fired.</p>}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#c9a227]/10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Huddle & Decisions</p>
          <p className="text-sm text-[#1a1a2e]/60 mt-2">Cycle {currentCycleId}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${huddleThisCycle ? 'bg-[#055437]/10 text-[#055437]' : 'bg-[#910000]/10 text-[#910000]'}`}>
              Huddle {huddleThisCycle ? 'Logged' : 'Missing'}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${decisionLoggedThisCycle ? 'bg-[#055437]/10 text-[#055437]' : 'bg-[#910000]/10 text-[#910000]'}`}>
              Decision {decisionLoggedThisCycle ? 'Logged' : 'Missing'}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => handleEventLog('HUDDLE')} className="text-xs px-3 py-1 rounded-lg bg-[#1a1a2e] text-white">Log Huddle</button>
            <button onClick={() => handleEventLog('CALIBRATION')} className="text-xs px-3 py-1 rounded-lg border border-[#1a1a2e]/20">Log Calibration</button>
            <button onClick={() => handleEventLog('RECOGNITION')} className="text-xs px-3 py-1 rounded-lg border border-[#1a1a2e]/20">Log Recognition</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10 space-y-4">
          <h2 className="text-lg font-semibold text-[#1a1a2e]">Outcome A — Adoption</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Active Logger Rate</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{Math.round(activeLoggerRate * 100)}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Total Entries</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{totalEntries.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Entries per Logger</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{entriesPerActiveLogger.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Trend Delta</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{adoptionDelta >= 0 ? '+' : ''}{(adoptionDelta * 100).toFixed(1)}%</p>
            </div>
          </div>
          <div className="text-xs text-[#1a1a2e]/50">Entries delta vs prior period: {entriesDelta >= 0 ? '+' : ''}{entriesDelta}</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10 space-y-4">
          <h2 className="text-lg font-semibold text-[#1a1a2e]">Outcome B — Consistency</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Huddles (last 4)</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{huddleLast4}/4</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Calibration Freshness</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{calibrationDays ?? '—'} days</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Top 1 Share</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{(topStaffShares.top1 * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Top 3 Share</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{(topStaffShares.top3 * 100).toFixed(0)}%</p>
            </div>
          </div>
          <div className="text-xs text-[#1a1a2e]/50">
            Distribution tiers: 0 ({distributionTiers.zero}) · 1-2 ({distributionTiers.low}) · 3-10 ({distributionTiers.mid}) · 11+ ({distributionTiers.high})
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10 space-y-4">
          <h2 className="text-lg font-semibold text-[#1a1a2e]">Outcome C — Governance</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Inflation Index</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{inflationIndex.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Notes Compliance</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{(notesCompliance * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Other Usage</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{(otherPct * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Roster Issues</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{rosterIssues}</p>
            </div>
          </div>
          {baselineRate === null && (
            <p className="text-xs text-[#9a7b1a]">Baseline not set. Configure baseline dates in Supabase.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10 space-y-4">
          <h2 className="text-lg font-semibold text-[#1a1a2e]">Outcome D — Insight & Action</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Decision Compliance</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{decisionCyclesLogged}/4 cycles</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Overdue Decisions</p>
              <p className="text-xl font-semibold text-[#1a1a2e]">{overdueDecisions.length}</p>
            </div>
          </div>
          <div className="text-xs text-[#1a1a2e]/50">
            Follow-through status: {followThroughRag}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10">
        <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Flags & Triggers</h2>
        {triggers.length === 0 ? (
          <p className="text-sm text-[#1a1a2e]/50">No triggers fired for this period.</p>
        ) : (
          <div className="space-y-3">
            {triggers.map((trigger) => (
              <div key={trigger.id} className="border border-[#1a1a2e]/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#1a1a2e]">{trigger.name}</p>
                    <p className="text-sm text-[#1a1a2e]/60">{trigger.summary}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    trigger.severity === 'Green' ? 'bg-[#055437]/10 text-[#055437]' :
                    trigger.severity === 'Yellow' ? 'bg-[#c9a227]/15 text-[#9a7b1a]' :
                    'bg-[#910000]/10 text-[#910000]'
                  }`}>
                    {trigger.severity}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {trigger.actionIds.map((actionId) => (
                    <span key={actionId} className="text-xs px-2 py-1 rounded-full bg-[#1a1a2e]/5">
                      {actionsById.get(actionId)?.title || actionId}
                    </span>
                  ))}
                </div>
                <button
                  className="mt-3 text-xs px-3 py-1 rounded-lg bg-[#1a1a2e] text-white"
                  onClick={() =>
                    setDecisionForm((prev) => ({
                      ...prev,
                      triggerId: trigger.id,
                      summary: trigger.summary,
                      selectedActions: trigger.actionIds,
                    }))
                  }
                >
                  Log Decision
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10">
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Decision Log</h2>
          <div className="space-y-3">
            {decisions.slice(0, 5).map((decision) => (
              <div key={decision.id} className="border border-[#1a1a2e]/10 rounded-xl p-3">
                <p className="text-sm font-semibold text-[#1a1a2e]">{decision.trigger_summary || 'Decision'}</p>
                <p className="text-xs text-[#1a1a2e]/50">Owner: {decision.owner} • Status: {decision.status}</p>
              </div>
            ))}
            {decisions.length === 0 && <p className="text-sm text-[#1a1a2e]/50">No decisions logged yet.</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10">
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Log Decision</h2>
          <div className="grid grid-cols-1 gap-3">
            <input
              placeholder="Owner"
              value={decisionForm.owner}
              onChange={(e) => setDecisionForm((prev) => ({ ...prev, owner: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-[#1a1a2e]/10 text-sm"
            />
            <input
              placeholder="Due date"
              type="date"
              value={decisionForm.dueDate}
              onChange={(e) => setDecisionForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-[#1a1a2e]/10 text-sm"
            />
            <select
              value={decisionForm.status}
              onChange={(e) => setDecisionForm((prev) => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-[#1a1a2e]/10 text-sm"
            >
              <option value="Planned">Planned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Dropped">Dropped</option>
            </select>
            <div className="flex flex-wrap gap-2">
              {decisionForm.selectedActions.map((actionId) => (
                <span key={actionId} className="text-xs px-2 py-1 rounded-full bg-[#1a1a2e]/5">
                  {actionsById.get(actionId)?.title || actionId}
                </span>
              ))}
            </div>
            <button onClick={handleDecisionCreate} className="px-4 py-2 rounded-lg bg-[#1a1a2e] text-white text-sm">
              Save Decision
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10">
        <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">5 Questions</h2>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Q1 Strong/Weak</p>
            <p className="font-semibold text-[#1a1a2e] mt-2">Strong: {gradeInsights.strongest?.grade || '—'}</p>
            <p className="text-[#1a1a2e]/60">Weak: {gradeInsights.weakest?.grade || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Q2 Trending</p>
            {subcategoryTrends.slice(0, 3).map((row) => (
              <p key={row.key} className="text-[#1a1a2e]/70">{row.key}: {row.delta >= 0 ? '+' : ''}{row.delta}</p>
            ))}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Q3 Time/Day</p>
            {timeBuckets.slice(0, 3).map((row) => (
              <p key={row.label} className="text-[#1a1a2e]/70">{row.label}: {row.count}</p>
            ))}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Q4 Staff Gaps</p>
            {staffNotesCompliance.map((row) => (
              <p key={row.staff} className="text-[#1a1a2e]/70">{row.staff}: {(row.compliance * 100).toFixed(0)}%</p>
            ))}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#1a1a2e]/40">Q5 Next Week</p>
            {triggers.slice(0, 2).map((trigger) => (
              <p key={trigger.id} className="text-[#1a1a2e]/70">{trigger.name}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
