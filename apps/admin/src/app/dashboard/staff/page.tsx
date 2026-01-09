'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase/tables'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import CrestLoader from '@/components/CrestLoader'
import { getHouseColors, getHouseNames } from '@/lib/school.config'
import { useSessionStorageState } from '@/hooks/useSessionStorageState'

interface StaffEngagementRow {
  staff_id: string | null
  staff_name: string
  email: string
  house: string
  active_days: number
  consistency_pct: number
  entries_count: number
  points: number
  house_points: Record<string, number>
  students: number
  required_notes_entries: number
  required_notes_completed: number
  notes_compliance_pct: number | null
  unique_categories_used: number
  unique_subcategories_used: number
  last_active_date: string | null
  roster_flags: {
    missing_house: boolean
    missing_grade: boolean
    inactive: boolean
    unknown_staff_record: boolean
  }
}

interface GlobalMetrics {
  inflation_index: number | null
  inflation_label: string
  baseline_range: { start: string; end: string } | null
  baseline_source: 'configured' | 'fallback' | 'missing'
  roster_hygiene_counts: {
    unknown_staff_entries: number
    missing_house_staff_count: number
    missing_grade_staff_count: number
  }
  possible_school_days: number
  available_grades: number[]
  available_houses: string[]
}

interface RosterDetails {
  unknown_staff_entries: Array<{ staff_name: string; entries_count: number; last_active_date: string | null }>
  missing_house_staff: Array<{ staff_name: string; email: string; last_active_date: string | null }>
  missing_grade_staff: Array<{ staff_name: string; email: string; last_active_date: string | null }>
}

interface CalendarRange {
  min_date: string
  max_date: string
}

interface MissingNotesEntry {
  staff_name: string
  student_name: string
  grade: number | null
  section: string | null
  r: string
  subcategory: string
  points: number
  notes: string
  date: string
}

interface HouseSpiritRow {
  month_start: string
  house: string
  staff_count: number
  total_points: number
  rank: number
}

interface AllStarRow {
  month_start: string
  staff_name: string
  categories: number
  total_points: number
  rank: number
}

interface SteadyHandRow {
  month_start: string
  staff_name: string
  active_days: number
  awards: number
  rank: number
}

interface DiamondFinderRow {
  month_start: string
  staff_name: string
  students: number
  total_points: number
  rank: number
}

interface HouseChampionRow {
  month_start: string
  house: string
  staff_name: string
  total_points: number
  rank: number
}

type SortKey = 'active_days' | 'consistency_pct' | 'notes_compliance_pct' | 'entries_count'

type Tier = 'High' | 'Medium' | 'Low'

const tierColors = {
  High: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', dot: '#0f766e' },
  Medium: { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', dot: '#b45309' },
  Low: { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300', dot: '#9f1239' },
}

const pieColors = ['#0f766e', '#b45309', '#9f1239']
const houses = getHouseNames()
const houseColors = getHouseColors()

const filterChips = [
  { id: 'missingNotes', label: 'Missing Notes' },
  { id: 'missingHouse', label: 'Missing House' },
  { id: 'missingGrade', label: 'Missing Grade' },
  { id: 'inactive', label: 'Inactive (0 entries)' },
  { id: 'highConsistency', label: 'High consistency (>60%)' },
]

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function getTier(consistency: number): Tier {
  if (consistency >= 80) return 'High'
  if (consistency >= 30) return 'Medium'
  return 'Low'
}

function formatDate(value: string | null) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDateDaysAgo(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().split('T')[0]
}

export default function StaffPage() {
  const [staffMetrics, setStaffMetrics] = useState<StaffEngagementRow[]>([])
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null)
  const [rosterDetails, setRosterDetails] = useState<RosterDetails | null>(null)
  const [missingNotesEntries, setMissingNotesEntries] = useState<MissingNotesEntry[]>([])
  const [missingNotesTarget, setMissingNotesTarget] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRosterLoading, setIsRosterLoading] = useState(false)
  const [isMissingNotesLoading, setIsMissingNotesLoading] = useState(false)
  const [rosterModalOpen, setRosterModalOpen] = useState(false)
  const [missingNotesModalOpen, setMissingNotesModalOpen] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('consistency_pct')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [calendarRange, setCalendarRange] = useState<CalendarRange | null>(null)

  const [houseSpiritRows, setHouseSpiritRows] = useState<HouseSpiritRow[]>([])
  const [allStarRows, setAllStarRows] = useState<AllStarRow[]>([])
  const [steadyHandRows, setSteadyHandRows] = useState<SteadyHandRow[]>([])
  const [diamondFinderRows, setDiamondFinderRows] = useState<DiamondFinderRow[]>([])
  const [houseChampionRows, setHouseChampionRows] = useState<HouseChampionRow[]>([])

  const [dateRange, setDateRange] = useSessionStorageState('admin:staff:dateRange', {
    startDate: '',
    endDate: '',
  })
  const [filters, setFilters] = useSessionStorageState('admin:staff:filters', {
    house: '',
    grade: '',
  })

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const startDate = dateRange.startDate || calendarRange?.min_date || ''
  const maxCalendarEnd = calendarRange?.max_date && calendarRange.max_date < today ? calendarRange.max_date : today
  const endDate = dateRange.endDate || maxCalendarEnd || ''
  const rangeLabel = startDate && endDate ? `${startDate} → ${endDate}` : '—'
  const isSingleMonthRange = Boolean(startDate && endDate && startDate.slice(0, 7) === endDate.slice(0, 7))
  const awardsMonthKey = isSingleMonthRange ? startDate.slice(0, 7) : ''
  const awardsMonthLabel = isSingleMonthRange ? formatMonthLabel(awardsMonthKey) : 'Custom range'

  useEffect(() => {
    fetchCalendarRange()
  }, [])

  useEffect(() => {
    if (!calendarRange) return
    if (dateRange.startDate && dateRange.endDate) return
    const fallbackStart = calendarRange.min_date || today
    const fallbackEnd = calendarRange.max_date && calendarRange.max_date < today ? calendarRange.max_date : today
    if (!fallbackStart || !fallbackEnd) return
    setDateRange({ startDate: fallbackStart, endDate: fallbackEnd })
  }, [calendarRange, dateRange.endDate, dateRange.startDate, setDateRange, today])

  useEffect(() => {
    const channel = supabase
      .channel('staff-engagement-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: Tables.staff }, () => {
        fetchEngagementMetrics()
        if (awardsMonthKey) {
          fetchMonthlyAwardViews(awardsMonthKey)
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: Tables.meritLog }, () => {
        fetchEngagementMetrics()
        if (awardsMonthKey) {
          fetchMonthlyAwardViews(awardsMonthKey)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [startDate, endDate, awardsMonthKey])

  useEffect(() => {
    if (!startDate || !endDate) return
    fetchEngagementMetrics()
  }, [startDate, endDate, filters.house, filters.grade])

  useEffect(() => {
    if (!isSingleMonthRange) {
      setHouseSpiritRows([])
      setAllStarRows([])
      setSteadyHandRows([])
      setDiamondFinderRows([])
      setHouseChampionRows([])
      return
    }
    fetchMonthlyAwardViews(awardsMonthKey)
  }, [awardsMonthKey, isSingleMonthRange])

  const fetchEngagementMetrics = async () => {
    if (!startDate || !endDate) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ startDate, endDate })
      if (filters.house) params.set('house', filters.house)
      if (filters.grade) params.set('grade', filters.grade)
      const response = await fetch(`/api/staff/engagement?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        console.error('Failed to load staff metrics:', data?.error || response.statusText)
        setStaffMetrics([])
        setGlobalMetrics(null)
        return
      }
      setStaffMetrics(Array.isArray(data.staff) ? data.staff : [])
      setGlobalMetrics(data.global || null)
    } catch (error) {
      console.error('Error fetching staff metrics:', error)
      setStaffMetrics([])
      setGlobalMetrics(null)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCalendarRange = async () => {
    try {
      const response = await fetch('/api/staff/engagement?detail=calendar-range')
      const data = await response.json()
      if (!response.ok) {
        console.error('Failed to load calendar range:', data?.error || response.statusText)
        if (!dateRange.startDate && !dateRange.endDate) {
          const fallbackEnd = today
          const fallbackStart = getDateDaysAgo(fallbackEnd, 30)
          setDateRange({ startDate: fallbackStart, endDate: fallbackEnd })
        }
        return
      }
      setCalendarRange({
        min_date: data.min_date || '',
        max_date: data.max_date || '',
      })
    } catch (error) {
      console.error('Error loading calendar range:', error)
      if (!dateRange.startDate && !dateRange.endDate) {
        const fallbackEnd = today
        const fallbackStart = getDateDaysAgo(fallbackEnd, 30)
        setDateRange({ startDate: fallbackStart, endDate: fallbackEnd })
      }
    }
  }

  const fetchMonthlyAwardViews = async (monthKey: string) => {
    if (!monthKey) return
    const monthStart = `${monthKey}-01`
    try {
      const [
        houseSpiritRes,
        allStarRes,
        steadyHandRes,
        diamondFinderRes,
        houseChampionRes,
      ] = await Promise.all([
        supabase.from('staff_house_spirit_monthly').select('*').eq('month_start', monthStart).eq('rank', 1),
        supabase.from('staff_3r_all_star_monthly').select('*').eq('month_start', monthStart).eq('rank', 1),
        supabase.from('staff_steady_hand_monthly').select('*').eq('month_start', monthStart).eq('rank', 1),
        supabase.from('staff_diamond_finder_monthly').select('*').eq('month_start', monthStart).eq('rank', 1),
        supabase.from('staff_house_champion_monthly').select('*').eq('month_start', monthStart).eq('rank', 1),
      ])

      if (houseSpiritRes.error) console.error('House spirit view error:', houseSpiritRes.error)
      if (allStarRes.error) console.error('All star view error:', allStarRes.error)
      if (steadyHandRes.error) console.error('Steady hand view error:', steadyHandRes.error)
      if (diamondFinderRes.error) console.error('Diamond finder view error:', diamondFinderRes.error)
      if (houseChampionRes.error) console.error('House champion view error:', houseChampionRes.error)

      setHouseSpiritRows((houseSpiritRes.data || []) as HouseSpiritRow[])
      setAllStarRows((allStarRes.data || []) as AllStarRow[])
      setSteadyHandRows((steadyHandRes.data || []) as SteadyHandRow[])
      setDiamondFinderRows((diamondFinderRes.data || []) as DiamondFinderRow[])
      setHouseChampionRows((houseChampionRes.data || []) as HouseChampionRow[])
    } catch (error) {
      console.error('Error fetching staff award views:', error)
      setHouseSpiritRows([])
      setAllStarRows([])
      setSteadyHandRows([])
      setDiamondFinderRows([])
      setHouseChampionRows([])
    }
  }

  const staffRows = useMemo(() => {
    return staffMetrics.map((row) => {
      const consistency = Number.isFinite(row.consistency_pct) ? row.consistency_pct : 0
      return {
        ...row,
        tier: getTier(consistency),
      }
    })
  }, [staffMetrics])

  const tierDistribution = useMemo(() => {
    const high = staffRows.filter((s) => s.tier === 'High').length
    const medium = staffRows.filter((s) => s.tier === 'Medium').length
    const low = staffRows.filter((s) => s.tier === 'Low').length
    return [
      { name: 'High (>80%)', value: high, color: pieColors[0] },
      { name: 'Medium (30-80%)', value: medium, color: pieColors[1] },
      { name: 'Low (<30%)', value: low, color: pieColors[2] },
    ]
  }, [staffRows])

  const consistencyLeaderboard = useMemo(() => {
    return [...staffRows]
      .sort((a, b) => b.consistency_pct - a.consistency_pct)
      .slice(0, 10)
      .map((row) => ({ name: row.staff_name, consistency: row.consistency_pct }))
  }, [staffRows])

  const filteredStaff = useMemo(() => {
    return staffRows.filter((row) => {
      if (activeFilters.includes('missingNotes')) {
        if (row.required_notes_entries <= row.required_notes_completed) return false
      }
      if (activeFilters.includes('missingHouse') && !row.roster_flags.missing_house) return false
      if (activeFilters.includes('missingGrade') && !row.roster_flags.missing_grade) return false
      if (activeFilters.includes('inactive') && row.entries_count > 0) return false
      if (activeFilters.includes('highConsistency') && row.consistency_pct <= 60) return false
      return true
    })
  }, [staffRows, activeFilters])

  const sortedStaff = useMemo(() => {
    const sorted = [...filteredStaff]
    const direction = sortDirection === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      const getValue = (row: StaffEngagementRow) => {
        if (sortKey === 'notes_compliance_pct') {
          return row.notes_compliance_pct ?? -1
        }
        return row[sortKey]
      }
      return (getValue(a) - getValue(b)) * direction
    })
    return sorted
  }, [filteredStaff, sortKey, sortDirection])

  const toggleFilter = (id: string) => {
    setActiveFilters((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection('desc')
  }

  const handleOpenRosterModal = async () => {
    setRosterModalOpen(true)
    if (rosterDetails || isRosterLoading) return
    setIsRosterLoading(true)
    try {
      const params = new URLSearchParams({ startDate, endDate, detail: 'roster' })
      const response = await fetch(`/api/staff/engagement?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        console.error('Failed to load roster details:', data?.error || response.statusText)
        return
      }
      setRosterDetails(data as RosterDetails)
    } catch (error) {
      console.error('Error loading roster details:', error)
    } finally {
      setIsRosterLoading(false)
    }
  }

  const handleOpenMissingNotes = async (staffName: string) => {
    setMissingNotesModalOpen(true)
    setMissingNotesTarget(staffName)
    setIsMissingNotesLoading(true)
    try {
      const params = new URLSearchParams({ startDate, endDate, detail: 'missing-notes', staffName })
      if (filters.house) params.set('house', filters.house)
      if (filters.grade) params.set('grade', filters.grade)
      const response = await fetch(`/api/staff/engagement?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        console.error('Failed to load missing notes:', data?.error || response.statusText)
        setMissingNotesEntries([])
        return
      }
      setMissingNotesEntries(Array.isArray(data.entries) ? data.entries : [])
    } catch (error) {
      console.error('Error loading missing notes entries:', error)
      setMissingNotesEntries([])
    } finally {
      setIsMissingNotesLoading(false)
    }
  }

  const exportRosterCsv = () => {
    if (!rosterDetails) return
    const rows = [
      ['Type', 'Staff Name', 'Email', 'Entries', 'Last Active'],
      ...rosterDetails.unknown_staff_entries.map((row) => [
        'Unknown Staff',
        row.staff_name,
        '',
        String(row.entries_count),
        row.last_active_date ?? '',
      ]),
      ...rosterDetails.missing_house_staff.map((row) => [
        'Missing House',
        row.staff_name,
        row.email,
        '',
        row.last_active_date ?? '',
      ]),
      ...rosterDetails.missing_grade_staff.map((row) => [
        'Missing Grade',
        row.staff_name,
        row.email,
        '',
        row.last_active_date ?? '',
      ]),
    ]

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `roster_issues_${startDate}_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const exportMissingNotesCsv = () => {
    if (missingNotesEntries.length === 0) return
    const rows = [
      ['Staff', 'Student', 'Grade', 'Section', 'Category', 'Subcategory', 'Points', 'Notes', 'Date'],
      ...missingNotesEntries.map((entry) => [
        entry.staff_name,
        entry.student_name,
        entry.grade ?? '',
        entry.section ?? '',
        entry.r,
        entry.subcategory,
        String(entry.points),
        entry.notes,
        entry.date,
      ]),
    ]
    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `missing_notes_${startDate}_${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const monthlyAwards = useMemo(() => {
    const houseSpiritRow = houseSpiritRows[0] || null
    const allStarRow = allStarRows[0] || null
    const steadyHandRow = steadyHandRows[0] || null
    const diamondFinderRow = diamondFinderRows[0] || null

    const houseChampions = houses.map((house) => {
      const winner = houseChampionRows.find((row) => row.house === house) || null
      return {
        house,
        winner: winner
          ? {
            name: winner.staff_name,
            points: winner.total_points,
          }
          : null,
      }
    })

    return {
      monthLabel: awardsMonthLabel,
      houseSpirit: houseSpiritRow
        ? {
          house: houseSpiritRow.house,
          staffCount: houseSpiritRow.staff_count,
          points: houseSpiritRow.total_points,
        }
        : null,
      allStar: allStarRow
        ? {
          name: allStarRow.staff_name,
          categories: allStarRow.categories,
          points: allStarRow.total_points,
        }
        : null,
      steadyHand: steadyHandRow
        ? {
          name: steadyHandRow.staff_name,
          days: steadyHandRow.active_days,
          awards: steadyHandRow.awards,
        }
        : null,
      diamondFinder: diamondFinderRow
        ? {
          name: diamondFinderRow.staff_name,
          students: diamondFinderRow.students,
          points: diamondFinderRow.total_points,
        }
        : null,
      houseChampions,
    }
  }, [awardsMonthLabel, houseSpiritRows, allStarRows, steadyHandRows, diamondFinderRows, houseChampionRows])

  const possibleSchoolDays = globalMetrics?.possible_school_days ?? 0
  const gradeOptions = globalMetrics?.available_grades ?? []
  const houseOptions = globalMetrics?.available_houses ?? []

  if (isLoading) {
    return <CrestLoader label="Loading staff engagement..." />
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              Staff Engagement & Support
            </h1>
            <div className="flex items-center gap-3">
              <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
              <p className="text-[#1a1a2e]/50 text-sm font-medium">Consistency, notes quality, and engagement signals</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs tracking-widest text-[#1a1a2e]/40">Date range</span>
            <input
              type="date"
              value={startDate}
              min={calendarRange?.min_date || undefined}
              max={endDate || maxCalendarEnd || undefined}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2.5 border border-[#1a1a2e]/10 rounded-xl focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] outline-none bg-white text-sm"
            />
            <span className="text-xs text-[#1a1a2e]/40">→</span>
            <input
              type="date"
              value={endDate}
              min={startDate || calendarRange?.min_date || undefined}
              max={maxCalendarEnd || undefined}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2.5 border border-[#1a1a2e]/10 rounded-xl focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] outline-none bg-white text-sm"
            />
            <select
              value={filters.house}
              onChange={(e) => setFilters((prev) => ({ ...prev, house: e.target.value }))}
              className="px-3 py-2.5 border border-[#1a1a2e]/10 rounded-xl focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] outline-none bg-white text-sm"
            >
              <option value="">All houses</option>
              {houseOptions.map((house) => (
                <option key={house} value={house}>{house.replace('House of ', '')}</option>
              ))}
            </select>
            <select
              value={filters.grade}
              onChange={(e) => setFilters((prev) => ({ ...prev, grade: e.target.value }))}
              className="px-3 py-2.5 border border-[#1a1a2e]/10 rounded-xl focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] outline-none bg-white text-sm"
            >
              <option value="">All grades</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Global Governance removed */}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tier Distribution Pie Chart */}
        <div className="regal-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[#1a1a2e] mb-1" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Engagement Tier Distribution
          </h3>
          <p className="text-xs text-[#1a1a2e]/40 mb-6">Consistency (logging days / school days)</p>
          <div className="h-64 flex items-center">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={tierDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    {tierDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Staff']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-4">
              {tierDistribution.map((tier) => (
                <div key={tier.name} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: tier.color }}></div>
                  <div>
                    <p className="text-sm font-semibold text-[#1a1a2e]">{tier.name}</p>
                    <p className="text-xs text-[#1a1a2e]/40">{tier.value} staff members</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Consistency Leaderboard */}
        <div className="regal-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[#1a1a2e] mb-1" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Consistency Leaderboard
          </h3>
          <p className="text-xs text-[#1a1a2e]/40 mb-6">Top 10 most consistent staff members</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consistencyLeaderboard} layout="vertical" margin={{ left: 140, right: 28, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e2db" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#1a1a2e" opacity={0.3} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: '#1a1a2e' }} />
                <Tooltip formatter={(value: number) => [`${value}%`, 'Consistency']} />
                <Bar dataKey="consistency" fill="#c9a227" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Staff Rewards */}
      <div className="regal-card rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              Monthly Staff Rewards
            </h3>
            <p className="text-xs text-[#1a1a2e]/40 mt-1">Recognition for {monthlyAwards.monthLabel}</p>
          </div>
          <div className="text-xs text-[#1a1a2e]/40">
            Based on merit entries submitted this month
          </div>
        </div>

        {!isSingleMonthRange && (
          <div className="mb-6 rounded-xl border border-[#c9a227]/20 bg-[#f5f3ef] px-4 py-3 text-sm text-[#1a1a2e]/70">
            Monthly awards require a single-month range. Adjust the dates to a single month to view awards.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-[#f5f3ef] border border-[#c9a227]/20">
            <p className="text-xs font-semibold text-[#1a1a2e]/40 tracking-widest">House Spirit Award</p>
            <p className="text-sm text-[#1a1a2e]/60 mt-1">House with the highest collective staff participation</p>
            <div className="mt-4">
              <p className="text-lg font-bold text-[#1a1a2e]">{monthlyAwards.houseSpirit?.house || 'No data'}</p>
              {monthlyAwards.houseSpirit && (
                <p className="text-xs text-[#1a1a2e]/50 mt-1">
                  {monthlyAwards.houseSpirit.staffCount} active staff • {monthlyAwards.houseSpirit.points.toLocaleString()} pts
                </p>
              )}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#f5f3ef] border border-[#c9a227]/20">
            <p className="text-xs font-semibold text-[#1a1a2e]/40 tracking-widest">3R All-Star</p>
            <p className="text-sm text-[#1a1a2e]/60 mt-1">Most diverse merit categories</p>
            <div className="mt-4">
              <p className="text-lg font-bold text-[#1a1a2e]">{monthlyAwards.allStar?.name || 'No data'}</p>
              {monthlyAwards.allStar && (
                <p className="text-xs text-[#1a1a2e]/50 mt-1">
                  {monthlyAwards.allStar.categories} categories • {monthlyAwards.allStar.points.toLocaleString()} pts
                </p>
              )}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#f5f3ef] border border-[#c9a227]/20">
            <p className="text-xs font-semibold text-[#1a1a2e]/40 tracking-widest">The Steady Hand</p>
            <p className="text-sm text-[#1a1a2e]/60 mt-1">Most days with point submissions</p>
            <div className="mt-4">
              <p className="text-lg font-bold text-[#1a1a2e]">{monthlyAwards.steadyHand?.name || 'No data'}</p>
              {monthlyAwards.steadyHand && (
                <p className="text-xs text-[#1a1a2e]/50 mt-1">
                  {monthlyAwards.steadyHand.days} days • {monthlyAwards.steadyHand.awards} awards
                </p>
              )}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#f5f3ef] border border-[#c9a227]/20">
            <p className="text-xs font-semibold text-[#1a1a2e]/40 tracking-widest">The Diamond Finder</p>
            <p className="text-sm text-[#1a1a2e]/60 mt-1">Most unique students recognized</p>
            <div className="mt-4">
              <p className="text-lg font-bold text-[#1a1a2e]">{monthlyAwards.diamondFinder?.name || 'No data'}</p>
              {monthlyAwards.diamondFinder && (
                <p className="text-xs text-[#1a1a2e]/50 mt-1">
                  {monthlyAwards.diamondFinder.students} students • {monthlyAwards.diamondFinder.points.toLocaleString()} pts
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 p-5 rounded-xl bg-white border border-[#c9a227]/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-[#1a1a2e]/40 tracking-widest">House Champion Award</p>
              <p className="text-sm text-[#1a1a2e]/60 mt-1">Top contributor from each house</p>
            </div>
            <span className="text-xs text-[#1a1a2e]/40">4 recipients</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {monthlyAwards.houseChampions.map((entry) => (
              <div key={entry.house} className="rounded-xl bg-[#f5f3ef] px-4 py-3">
                <p className="text-xs font-semibold text-[#1a1a2e]/40 tracking-wider">
                  {entry.house.replace('House of ', '')}
                </p>
                {entry.winner ? (
                  <>
                    <p className="text-sm font-semibold text-[#1a1a2e] mt-1">{entry.winner.name}</p>
                    <p className="text-xs text-[#1a1a2e]/50">{entry.winner.points.toLocaleString()} pts</p>
                  </>
                ) : (
                  <p className="text-xs text-[#1a1a2e]/30 mt-1">No data</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Staff Table */}
      <div className="regal-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#c9a227]/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                Detailed Staff Engagement & Support
              </h3>
              <p className="text-xs text-[#1a1a2e]/40 mt-1">Engagement signals and support flags for each staff member</p>
            </div>
          <span className="text-xs font-semibold tracking-wider bg-[#c9a227]/15 text-[#9a7b1a] px-3 py-1 rounded-full">
            {rangeLabel}
          </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {filterChips.map((chip) => (
              <button
                key={chip.id}
                onClick={() => toggleFilter(chip.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  activeFilters.includes(chip.id)
                    ? 'bg-[#c9a227] text-white border-[#c9a227]'
                    : 'bg-white text-[#1a1a2e]/60 border-[#1a1a2e]/10 hover:border-[#c9a227]/40'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full regal-table">
            <thead>
              <tr>
                <th className="text-left py-4 px-4">Staff Member</th>
                <th className="text-left py-4 px-4">
                  <button onClick={() => handleSort('active_days')} className="flex items-center gap-2">
                    Active Days
                    {sortKey === 'active_days' && <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
                <th className="text-left py-4 px-4" title="Consistency (logging days / school days)">
                  <button onClick={() => handleSort('consistency_pct')} className="flex items-center gap-2">
                    Consistency %
                    {sortKey === 'consistency_pct' && <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
                <th className="text-left py-4 px-4">
                  <button onClick={() => handleSort('entries_count')} className="flex items-center gap-2">
                    Entries
                    {sortKey === 'entries_count' && <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
                <th className="text-left py-4 px-4" title="Notes quality (required notes completion)">
                  <button onClick={() => handleSort('notes_compliance_pct')} className="flex items-center gap-2">
                    Notes Compliance
                    {sortKey === 'notes_compliance_pct' && <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
                <th className="text-left py-4 px-4">Missing Notes</th>
                <th className="text-left py-4 px-4">Category Diversity</th>
                <th className="text-left py-4 px-4">Roster Flags</th>
                <th className="text-left py-4 px-4">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {sortedStaff.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#1a1a2e]/40">
                    No staff activity found in this date range
                  </td>
                </tr>
              ) : (
                sortedStaff.map((member) => {
                  const missingNotes = Math.max(0, member.required_notes_entries - member.required_notes_completed)
                  const notesCompliance = member.required_notes_entries > 0
                    ? `${member.notes_compliance_pct ?? 0}%`
                    : '—'
                  const analyticsHref = `/dashboard/analytics?staff=${encodeURIComponent(member.staff_name)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
                  const housePoints = member.house_points || {}
                  const totalHousePoints = houses.reduce((sum, house) => {
                    return sum + Math.max(0, Number(housePoints[house] || 0))
                  }, 0)
                  const houseBreakdown = houses.map((house) => {
                    const points = Math.max(0, Number(housePoints[house] || 0))
                    const percent = totalHousePoints > 0 ? (points / totalHousePoints) * 100 : 0
                    return { house, points, percent }
                  })

                  return (
                    <tr key={member.email || member.staff_name}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2f0a61] to-[#1a0536] text-white flex items-center justify-center font-bold text-sm shadow-md">
                            {member.staff_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <a href={analyticsHref} className="font-semibold text-[#1a1a2e] hover:text-[#c9a227] transition-colors">
                              {member.staff_name}
                            </a>
                            <p className="text-xs text-[#1a1a2e]/40">{member.email || '—'}</p>
                            {totalHousePoints > 0 ? (
                              <div className="mt-2">
                                <div className="h-2 w-full rounded-full bg-[#e5e2db] overflow-hidden flex">
                                  {houseBreakdown.map((entry) => (
                                    <div
                                      key={entry.house}
                                      className="h-full"
                                      style={{
                                        width: `${entry.percent}%`,
                                        backgroundColor: houseColors[entry.house] || '#1a1a2e',
                                      }}
                                    />
                                  ))}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-[#1a1a2e]/50">
                                  {houseBreakdown.map((entry) => (
                                    <span key={entry.house} className="flex items-center gap-1">
                                      <span
                                        className="inline-block w-2 h-2 rounded-full"
                                        style={{ backgroundColor: houseColors[entry.house] || '#1a1a2e' }}
                                      />
                                      {entry.house.replace('House of ', '')} {Math.round(entry.percent)}%
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[10px] text-[#1a1a2e]/30 mt-2">No house distribution yet</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#1a1a2e]/70 font-medium">{member.active_days}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-[#e5e2db] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${member.consistency_pct}%`,
                                backgroundColor: tierColors[getTier(member.consistency_pct)].dot,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-[#1a1a2e]">{member.consistency_pct}%</span>
                          <span className="text-xs text-[#1a1a2e]/40">/ {possibleSchoolDays}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#1a1a2e]/70 font-medium">{member.entries_count}</td>
                      <td className="py-4 px-4 text-[#1a1a2e]/70 font-medium">{notesCompliance}</td>
                      <td className="py-4 px-4">
                        {missingNotes > 0 ? (
                          <button
                            onClick={() => handleOpenMissingNotes(member.staff_name)}
                            className="text-sm font-semibold text-[#910000] hover:text-[#5a0000]"
                          >
                            {missingNotes}
                          </button>
                        ) : (
                          <span className="text-[#1a1a2e]/30">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-[#1a1a2e]/70 font-medium">
                        {member.unique_categories_used}/3
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {member.roster_flags.unknown_staff_record && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Unknown Staff
                            </span>
                          )}
                          {member.roster_flags.missing_house && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Missing House
                            </span>
                          )}
                          {member.roster_flags.missing_grade && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Missing Grade
                            </span>
                          )}
                          {!member.roster_flags.unknown_staff_record && !member.roster_flags.missing_house && !member.roster_flags.missing_grade && (
                            <span className="text-[#1a1a2e]/30 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-[#1a1a2e]/50">
                        {formatDate(member.last_active_date)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rosterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]/40 p-6">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl">
            <div className="p-6 border-b border-[#c9a227]/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#1a1a2e]">Roster Issues</h3>
                <p className="text-xs text-[#1a1a2e]/40">Unknown staff and missing roster fields</p>
              </div>
              <button
                onClick={() => setRosterModalOpen(false)}
                className="text-sm font-semibold text-[#1a1a2e]/50 hover:text-[#1a1a2e]"
              >
                Close
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {isRosterLoading && <p className="text-sm text-[#1a1a2e]/40">Loading roster details...</p>}
              {!isRosterLoading && rosterDetails && (
                <>
                  <div>
                    <h4 className="text-sm font-semibold text-[#1a1a2e] mb-3">Unknown staff entries</h4>
                    {rosterDetails.unknown_staff_entries.length === 0 ? (
                      <p className="text-sm text-[#1a1a2e]/40">None detected</p>
                    ) : (
                      <div className="space-y-2">
                        {rosterDetails.unknown_staff_entries.map((row) => (
                          <div key={row.staff_name} className="flex items-center justify-between text-sm">
                            <span>{row.staff_name}</span>
                            <span className="text-[#1a1a2e]/50">{row.entries_count} entries • {formatDate(row.last_active_date)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#1a1a2e] mb-3">Staff missing house</h4>
                    {rosterDetails.missing_house_staff.length === 0 ? (
                      <p className="text-sm text-[#1a1a2e]/40">None detected</p>
                    ) : (
                      <div className="space-y-2">
                        {rosterDetails.missing_house_staff.map((row) => (
                          <div key={row.staff_name} className="flex items-center justify-between text-sm">
                            <span>{row.staff_name}</span>
                            <span className="text-[#1a1a2e]/50">{row.email || '—'} • {formatDate(row.last_active_date)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#1a1a2e] mb-3">Staff missing grade</h4>
                    {rosterDetails.missing_grade_staff.length === 0 ? (
                      <p className="text-sm text-[#1a1a2e]/40">None detected</p>
                    ) : (
                      <div className="space-y-2">
                        {rosterDetails.missing_grade_staff.map((row) => (
                          <div key={row.staff_name} className="flex items-center justify-between text-sm">
                            <span>{row.staff_name}</span>
                            <span className="text-[#1a1a2e]/50">{row.email || '—'} • {formatDate(row.last_active_date)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-[#c9a227]/10 flex items-center justify-end gap-3">
              <button
                onClick={exportRosterCsv}
                className="px-4 py-2 rounded-lg bg-[#c9a227]/10 text-[#9a7b1a] text-sm font-semibold hover:bg-[#c9a227]/20"
              >
                Export CSV
              </button>
              <button
                onClick={() => setRosterModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#1a1a2e] text-white text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {missingNotesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a2e]/40 p-6">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl">
            <div className="p-6 border-b border-[#c9a227]/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#1a1a2e]">Missing Required Notes</h3>
                <p className="text-xs text-[#1a1a2e]/40">{missingNotesTarget || 'Staff'}</p>
              </div>
              <button
                onClick={() => setMissingNotesModalOpen(false)}
                className="text-sm font-semibold text-[#1a1a2e]/50 hover:text-[#1a1a2e]"
              >
                Close
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {isMissingNotesLoading && <p className="text-sm text-[#1a1a2e]/40">Loading missing notes...</p>}
              {!isMissingNotesLoading && missingNotesEntries.length === 0 && (
                <p className="text-sm text-[#1a1a2e]/40">No missing notes found.</p>
              )}
              {!isMissingNotesLoading && missingNotesEntries.length > 0 && (
                <div className="space-y-3">
                  {missingNotesEntries.map((entry, index) => (
                    <div key={`${entry.staff_name}-${entry.date}-${index}`} className="border border-[#1a1a2e]/10 rounded-xl p-4">
                      <div className="flex items-center justify-between text-sm text-[#1a1a2e]/60">
                        <span>{entry.date}</span>
                        <span>{entry.points} pts</span>
                      </div>
                      <p className="text-sm font-semibold text-[#1a1a2e] mt-2">{entry.student_name}</p>
                      <p className="text-xs text-[#1a1a2e]/50 mt-1">{entry.r} • {entry.subcategory}</p>
                      {entry.notes && (
                        <p className="text-xs text-[#1a1a2e]/50 mt-2">Notes: {entry.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#c9a227]/10 flex items-center justify-end gap-3">
              <button
                onClick={exportMissingNotesCsv}
                className="px-4 py-2 rounded-lg bg-[#c9a227]/10 text-[#9a7b1a] text-sm font-semibold hover:bg-[#c9a227]/20"
              >
                Export CSV
              </button>
              <button
                onClick={() => setMissingNotesModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#1a1a2e] text-white text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
