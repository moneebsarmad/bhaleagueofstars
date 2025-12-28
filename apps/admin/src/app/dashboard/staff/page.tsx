'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase/tables'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import CrestLoader from '@/components/CrestLoader'

interface StaffMember {
  rank: number
  name: string
  email: string
  house: string
  tier: 'High' | 'Medium' | 'Low'
  consistency: number
  streak: number
  points: number
  awards: number
  students: number
  lastActive: string
}

const tierColors = {
  High: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', dot: '#0f766e' },
  Medium: { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', dot: '#b45309' },
  Low: { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300', dot: '#9f1239' },
}

const pieColors = ['#0f766e', '#b45309', '#9f1239']
const houses = ['House of Abū Bakr', 'House of Khadījah', 'House of ʿUmar', 'House of ʿĀʾishah']

interface StaffMeritEntry {
  staffName: string
  studentName: string
  grade: number
  section: string
  points: number
  timestamp: string
  r: string
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

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [staffData, setStaffData] = useState<Record<string, string | null>[]>([])
  const [allMeritEntries, setAllMeritEntries] = useState<StaffMeritEntry[]>([])
  const [meritEntries, setMeritEntries] = useState<StaffMeritEntry[]>([])
  const [houseSpiritRows, setHouseSpiritRows] = useState<HouseSpiritRow[]>([])
  const [allStarRows, setAllStarRows] = useState<AllStarRow[]>([])
  const [steadyHandRows, setSteadyHandRows] = useState<SteadyHandRow[]>([])
  const [diamondFinderRows, setDiamondFinderRows] = useState<DiamondFinderRow[]>([])
  const [houseChampionRows, setHouseChampionRows] = useState<HouseChampionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('staff-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: Tables.staff }, () => {
        fetchData()
        fetchMonthlyAwardViews()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: Tables.meritLog }, () => {
        fetchData()
        fetchMonthlyAwardViews()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (staffData.length === 0) return
    const filteredEntries = filterEntriesByMonth(allMeritEntries, selectedMonth)
    setMeritEntries(filteredEntries)
    setStaffList(buildStaffList(staffData, filteredEntries))
  }, [selectedMonth, staffData, allMeritEntries])

  useEffect(() => {
    fetchMonthlyAwardViews()
  }, [selectedMonth])

  const getMonthKey = (value: string) => {
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) return ''
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  const filterEntriesByMonth = (entries: StaffMeritEntry[], monthKey: string) => {
    if (!monthKey) return entries
    return entries.filter((entry) => getMonthKey(entry.timestamp) === monthKey)
  }

  const buildStaffList = (
    staffRows: Record<string, string | null>[],
    entries: StaffMeritEntry[]
  ) => {
    const staffStats: Record<string, {
      points: number
      awards: number
      students: Set<string>
      dates: Set<string>
      lastActive: string
    }> = {}

    entries.forEach((m) => {
      const name = m.staffName || ''
      if (!name) return
      const key = name.toLowerCase()
      if (!staffStats[key]) {
        staffStats[key] = { points: 0, awards: 0, students: new Set(), dates: new Set(), lastActive: '' }
      }
      staffStats[key].points += m.points || 0
      staffStats[key].awards += 1
      if (m.studentName) {
        const studentKey = `${m.studentName.toLowerCase()}|${m.grade || ''}|${(m.section || '').toLowerCase()}`
        staffStats[key].students.add(studentKey)
      }
      const dateStr = m.timestamp ? new Date(m.timestamp).toISOString().split('T')[0] : ''
      if (dateStr) staffStats[key].dates.add(dateStr)
      if (!staffStats[key].lastActive || m.timestamp > staffStats[key].lastActive) {
        staffStats[key].lastActive = m.timestamp || ''
      }
    })

    const parseDate = (value: string) => new Date(`${value}T00:00:00Z`)
    const formatDate = (value: Date) => value.toISOString().split('T')[0]
    const toLocalDate = (value: Date) =>
      new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))

    const breakRanges = [
      { start: '2025-11-24', end: '2025-11-30' },
      { start: '2025-12-22', end: '2026-01-04' },
    ].map((range) => ({
      start: parseDate(range.start),
      end: parseDate(range.end),
    }))

    const isInBreak = (date: Date) =>
      breakRanges.some((range) => date >= range.start && date <= range.end)

    const weekStart = (date: Date) => {
      const d = toLocalDate(date)
      const day = d.getUTCDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setUTCDate(d.getUTCDate() + diff)
      return d
    }

    const weekKey = (date: Date) => formatDate(weekStart(date))

    const [year, month] = selectedMonth.split('-').map(Number)
    const monthStart = weekStart(new Date(Date.UTC(year, month - 1, 1)))
    const monthEndDate = new Date(Date.UTC(year, month, 0))
    const monthEnd = weekStart(monthEndDate)

    const buildEligibleWeeks = () => {
      const weeks: string[] = []
      for (let d = new Date(monthStart); d <= monthEnd; d.setUTCDate(d.getUTCDate() + 7)) {
        if (!isInBreak(d)) {
          weeks.push(formatDate(d))
        }
      }
      return weeks
    }

    const eligibleWeeks = buildEligibleWeeks()

    const calculateWeekStreak = (weeksWithSubmissions: Set<string>): number => {
      if (eligibleWeeks.length === 0) return 0
      let streak = 0
      for (let i = eligibleWeeks.length - 1; i >= 0; i -= 1) {
        const week = eligibleWeeks[i]
        if (weeksWithSubmissions.has(week)) {
          streak += 1
        } else {
          break
        }
      }
      return streak
    }

    const list: StaffMember[] = staffRows.map((s) => {
      const name = String(s.staff_name || '')
      const key = name.toLowerCase()
      const stats = staffStats[key] || { points: 0, awards: 0, students: new Set(), dates: new Set(), lastActive: '' }

      const weeksWithSubmissions = new Set(
        Array.from(stats.dates)
          .map((d) => weekKey(parseDate(d)))
          .filter((w) => eligibleWeeks.includes(w))
      )
      const consistency = eligibleWeeks.length > 0
        ? Math.min(100, Math.round((weeksWithSubmissions.size / eligibleWeeks.length) * 100))
        : 0

      let tier: 'High' | 'Medium' | 'Low' = 'Low'
      if (consistency >= 80) tier = 'High'
      else if (consistency >= 30) tier = 'Medium'

      return {
        rank: 0,
        name,
        email: String(s.email || ''),
        house: String(s.house || ''),
        tier,
        consistency,
        streak: calculateWeekStreak(weeksWithSubmissions),
        points: stats.points,
        awards: stats.awards,
        students: stats.students.size,
        lastActive: stats.lastActive,
      }
    })

    list.sort((a, b) => b.points - a.points)
    list.forEach((s, i) => (s.rank = i + 1))

    return list
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { data: staffRows } = await supabase.from(Tables.staff).select('*')
      const { data: meritData } = await supabase
        .from(Tables.meritLog)
        .select('*')
        .order('timestamp', { ascending: false })

      if (staffRows && meritData) {
        const entries: StaffMeritEntry[] = meritData.map((m) => ({
          staffName: m.staff_name || '',
          studentName: m.student_name || '',
          grade: m.grade || 0,
          section: m.section || '',
          points: m.points || 0,
          timestamp: m.timestamp || '',
          r: m.r || '',
        }))
        setStaffData(staffRows)
        setAllMeritEntries(entries)
        const filteredEntries = filterEntriesByMonth(entries, selectedMonth)
        setMeritEntries(filteredEntries)
        setStaffList(buildStaffList(staffRows, filteredEntries))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getMonthStart = () => `${selectedMonth}-01`

  const fetchMonthlyAwardViews = async () => {
    const monthStart = getMonthStart()
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

  const tierDistribution = useMemo(() => {
    const high = staffList.filter(s => s.tier === 'High').length
    const medium = staffList.filter(s => s.tier === 'Medium').length
    const low = staffList.filter(s => s.tier === 'Low').length
    return [
      { name: 'High (>80%)', value: high, color: pieColors[0] },
      { name: 'Medium (30-80%)', value: medium, color: pieColors[1] },
      { name: 'Low (<30%)', value: low, color: pieColors[2] },
    ]
  }, [staffList])

  const monthOptions = useMemo(() => {
    const uniqueMonths = new Set<string>()
    allMeritEntries.forEach((entry) => {
      const key = getMonthKey(entry.timestamp)
      if (key) uniqueMonths.add(key)
    })
    if (!uniqueMonths.has(selectedMonth)) {
      uniqueMonths.add(selectedMonth)
    }
    return Array.from(uniqueMonths)
      .sort()
      .reverse()
      .map((key) => {
        const [year, month] = key.split('-').map(Number)
        const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })
        return { key, label }
      })
  }, [allMeritEntries, selectedMonth])

  const selectedMonthLabel = useMemo(() => {
    const match = monthOptions.find((option) => option.key === selectedMonth)
    return match?.label || selectedMonth
  }, [monthOptions, selectedMonth])

  const getThreeRCategory = (value: string) => {
    const raw = (value || '').toLowerCase()
    if (raw.includes('respect')) return 'Respect'
    if (raw.includes('responsibility')) return 'Responsibility'
    if (raw.includes('righteousness')) return 'Righteousness'
    return ''
  }

  const monthlyAwards = useMemo(() => {
    const [selectedYear, selectedMonthIndex] = selectedMonth.split('-').map(Number)
    const monthLabel = new Date(selectedYear, selectedMonthIndex - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })

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
      monthLabel,
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
  }, [selectedMonth, houseSpiritRows, allStarRows, steadyHandRows, diamondFinderRows, houseChampionRows])

  const consistencyLeaderboard = useMemo(() => {
    return [...staffList]
      .sort((a, b) => b.consistency - a.consistency)
      .slice(0, 10)
      .map(s => ({ name: s.name, consistency: s.consistency }))
  }, [staffList])

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  if (isLoading) {
    return <CrestLoader label="Loading staff data..." />
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              Staff Engagement
            </h1>
            <div className="flex items-center gap-3">
              <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
              <p className="text-[#1a1a2e]/50 text-sm font-medium">Performance metrics and consistency tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs tracking-widest text-[#1a1a2e]/40">Month</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2.5 border border-[#1a1a2e]/10 rounded-xl focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] outline-none bg-white"
            >
              {monthOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tier Distribution Pie Chart */}
        <div className="regal-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[#1a1a2e] mb-1" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Engagement Tier Distribution
          </h3>
          <p className="text-xs text-[#1a1a2e]/40 mb-6">Staff categorized by consistency levels</p>
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
                Detailed Staff Engagement
              </h3>
              <p className="text-xs text-[#1a1a2e]/40 mt-1">Complete performance breakdown for all staff members</p>
            </div>
            <span className="text-xs font-semibold tracking-wider bg-[#c9a227]/15 text-[#9a7b1a] px-3 py-1 rounded-full">
              {selectedMonthLabel}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full regal-table">
            <thead>
              <tr>
                <th className="text-left py-4 px-4">Rank</th>
                <th className="text-left py-4 px-4">Staff Member</th>
                <th className="text-left py-4 px-4">Tier</th>
                <th className="text-left py-4 px-4">Consistency</th>
                <th className="text-left py-4 px-4">Streak</th>
                <th className="text-left py-4 px-4">Points</th>
                <th className="text-left py-4 px-4">Awards</th>
                <th className="text-left py-4 px-4">Students</th>
                <th className="text-left py-4 px-4">Last Active</th>
                <th className="text-left py-4 px-4">Badges</th>
              </tr>
            </thead>
            <tbody>
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#1a1a2e]/40">
                    No staff members found
                  </td>
                </tr>
              ) : (
                staffList.map((member) => (
                  <tr key={member.email || member.name}>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-bold text-sm shadow-sm ${
                        member.rank === 1 ? 'bg-gradient-to-br from-[#ffd700] to-[#b8860b] text-white' :
                        member.rank === 2 ? 'bg-gradient-to-br from-[#e8e8e8] to-[#b8b8b8] text-[#1a1a2e]' :
                        member.rank === 3 ? 'bg-gradient-to-br from-[#cd7f32] to-[#8b4513] text-white' :
                        'bg-[#f5f3ef] text-[#1a1a2e]/50'
                      }`}>
                        {member.rank}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2f0a61] to-[#1a0536] text-white flex items-center justify-center font-bold text-sm shadow-md">
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1a1a2e]">{member.name}</p>
                          <p className="text-xs text-[#1a1a2e]/40">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${tierColors[member.tier].bg} ${tierColors[member.tier].text} ${tierColors[member.tier].border}`}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tierColors[member.tier].dot }}></span>
                        {member.tier}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-[#e5e2db] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${member.consistency}%`,
                              backgroundColor: tierColors[member.tier].dot
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-[#1a1a2e]">{member.consistency}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {member.streak > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                          <span>🔥</span> {member.streak} days
                        </span>
                      ) : (
                        <span className="text-[#1a1a2e]/30">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-[#2f0a61]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                        {member.points.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-[#1a1a2e]/70 font-medium">{member.awards.toLocaleString()}</td>
                    <td className="py-4 px-4 text-[#1a1a2e]/70 font-medium">{member.students.toLocaleString()}</td>
                    <td className="py-4 px-4 text-sm text-[#1a1a2e]/50">
                      {member.lastActive
                        ? new Date(member.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Never'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {member.points >= 500 && (
                          <span className="badge-gold inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs">
                            ⭐ 500+ Pts
                          </span>
                        )}
                        {member.students >= 50 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            👥 50+ Students
                          </span>
                        )}
                        {member.streak >= 5 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                            🔥 Hot Streak
                          </span>
                        )}
                        {member.points < 500 && member.students < 50 && member.streak < 5 && (
                          <span className="text-[#1a1a2e]/30 text-xs">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
