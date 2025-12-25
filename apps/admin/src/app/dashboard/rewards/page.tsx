'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase/tables'
import CrestLoader from '@/components/CrestLoader'

interface Student {
  name: string
  grade: number
  section: string
  house: string
  gender: string
  totalPoints: number
  categoryPoints: Record<string, number>
  weeklyPoints: Record<string, number>
  monthlyPoints: Record<string, number>
}

interface MeritEntry {
  studentName: string
  points: number
  category: string
  timestamp: string
  house: string
  grade: number
  section: string
}

// Hall of Fame tiers
const hallOfFameTiers = [
  { name: 'Century Club', points: 100, icon: '💯', color: 'from-[#6b4a1a] to-[#b08a2e]' },
  { name: 'Badr Club', points: 300, icon: '🌙', color: 'from-[#1f2a44] to-[#3b537a]' },
  { name: 'Elite 500', points: 500, icon: '👑', color: 'from-[#7a0f2b] to-[#b13a52]' },
]

// Quarterly badges
const quarterlyBadges = [
  { name: 'The Honour Guard', category: 'Respect', icon: '🛡️', description: 'Most points in Respect category' },
  { name: 'The Keeper', category: 'Responsibility', icon: '🔑', description: 'Most points in Responsibility category' },
  { name: 'The Light Bearer', category: 'Righteousness', icon: '🕯️', description: 'Most points in Righteousness category' },
]

const houseLogos: Record<string, string> = {
  'House of Abū Bakr': '/houses/abu-bakr.png',
  'House of Khadījah': '/houses/khadijah.png',
  'House of ʿUmar': '/houses/umar.png',
  'House of ʿĀʾishah': '/houses/aishah.png',
}

export default function RewardsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [meritEntries, setMeritEntries] = useState<MeritEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'hall-of-fame' | 'badges' | 'monthly' | 'approaching'>('hall-of-fame')

  useEffect(() => {
    fetchData()
  }, [])

  const getThreeRCategory = (value: string) => {
    const raw = (value || '').toLowerCase()
    if (raw.includes('respect')) return 'Respect'
    if (raw.includes('responsibility')) return 'Responsibility'
    if (raw.includes('righteousness')) return 'Righteousness'
    return ''
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch students from all grade tables
      const studentMap: Record<string, Student> = {}
      const { data: studentData } = await supabase.from(Tables.students).select('*')
      ;(studentData || []).forEach((s) => {
        const name = s.student_name || ''
        const key = `${name.toLowerCase()}|${s.grade || 0}|${(s.section || '').toLowerCase()}`
        if (!studentMap[key]) {
          studentMap[key] = {
            name,
            grade: s.grade || 0,
            section: s.section || '',
            house: s.house || '',
            gender: s.gender || '',
            totalPoints: 0,
            categoryPoints: {},
            weeklyPoints: {},
            monthlyPoints: {},
          }
        }
      })

      // Fetch merit entries
      const { data: meritData } = await supabase
        .from(Tables.meritLog)
        .select('*')
        .order('timestamp', { ascending: false })

      if (meritData) {
        const entries: MeritEntry[] = meritData.map((m) => ({
          studentName: m.student_name || '',
          points: m.points || 0,
          category: getThreeRCategory(m.r || ''),
          timestamp: m.timestamp || '',
          house: m.house || '',
          grade: m.grade || 0,
          section: m.section || '',
        }))
        setMeritEntries(entries)

        // Calculate points per student
        entries.forEach((e) => {
          const key = `${e.studentName.toLowerCase()}|${e.grade}|${e.section.toLowerCase()}`
          if (!studentMap[key]) {
            studentMap[key] = {
              name: e.studentName,
              grade: e.grade,
              section: e.section,
              house: e.house,
              gender: '',
              totalPoints: 0,
              categoryPoints: {},
              weeklyPoints: {},
              monthlyPoints: {},
            }
          }

          studentMap[key].totalPoints += e.points

          // Category points
          if (e.category) {
            studentMap[key].categoryPoints[e.category] =
              (studentMap[key].categoryPoints[e.category] || 0) + e.points
          }

          // Weekly points (get week number from timestamp)
          if (e.timestamp) {
            const date = new Date(e.timestamp)
            const weekKey = getWeekKey(date)
            studentMap[key].weeklyPoints[weekKey] =
              (studentMap[key].weeklyPoints[weekKey] || 0) + e.points

            // Monthly points
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            studentMap[key].monthlyPoints[monthKey] =
              (studentMap[key].monthlyPoints[monthKey] || 0) + e.points
          }
        })
      }

      setStudents(Object.values(studentMap))
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to get week key (year-week)
  const getWeekKey = (date: Date): string => {
    const year = date.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7)
    return `${year}-W${String(week).padStart(2, '0')}`
  }

  // Get current and previous week keys
  const getCurrentWeekKeys = () => {
    const now = new Date()
    const currentWeek = getWeekKey(now)
    const lastWeek = getWeekKey(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
    const twoWeeksAgo = getWeekKey(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000))
    return { currentWeek, lastWeek, twoWeeksAgo }
  }

  // Get current and previous month keys
  const getMonthKeys = () => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
    return { currentMonth, lastMonthKey }
  }

  // Hall of Fame - students who reached milestones
  const hallOfFame = useMemo(() => {
    return hallOfFameTiers.map((tier) => {
      const qualified = students
        .filter((s) => s.totalPoints >= tier.points)
        .sort((a, b) => b.totalPoints - a.totalPoints)

      const males = qualified.filter((s) => s.gender?.toLowerCase() === 'm' || s.gender?.toLowerCase() === 'male')
      const females = qualified.filter((s) => s.gender?.toLowerCase() === 'f' || s.gender?.toLowerCase() === 'female')

      return { ...tier, males, females, total: qualified.length }
    })
  }, [students])

  // Quarterly Badges - top in each category
  const badgeWinners = useMemo(() => {
    return quarterlyBadges.map((badge) => {
      const sorted = students
        .filter((s) => (s.categoryPoints[badge.category] || 0) > 0)
        .sort((a, b) => (b.categoryPoints[badge.category] || 0) - (a.categoryPoints[badge.category] || 0))

      const males = sorted.filter((s) => s.gender?.toLowerCase() === 'm' || s.gender?.toLowerCase() === 'male')
      const females = sorted.filter((s) => s.gender?.toLowerCase() === 'f' || s.gender?.toLowerCase() === 'female')

      return {
        ...badge,
        topMale: males[0] || null,
        topFemale: females[0] || null,
      }
    })
  }, [students])

  // Consistency Crown - 20+ points for 3 consecutive weeks
  const consistencyCrown = useMemo(() => {
    const { currentWeek, lastWeek, twoWeeksAgo } = getCurrentWeekKeys()
    return students
      .filter((s) => {
        const w1 = s.weeklyPoints[currentWeek] || 0
        const w2 = s.weeklyPoints[lastWeek] || 0
        const w3 = s.weeklyPoints[twoWeeksAgo] || 0
        return w1 >= 20 && w2 >= 20 && w3 >= 20
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
  }, [students])

  // Rising Star - highest % increase month-over-month (min 30 last month, +20 improvement)
  const risingStars = useMemo(() => {
    const { currentMonth, lastMonthKey } = getMonthKeys()
    return students
      .filter((s) => {
        const lastMonthPts = s.monthlyPoints[lastMonthKey] || 0
        const currentMonthPts = s.monthlyPoints[currentMonth] || 0
        const improvement = currentMonthPts - lastMonthPts
        return lastMonthPts >= 30 && improvement >= 20
      })
      .map((s) => {
        const { currentMonth, lastMonthKey } = getMonthKeys()
        const lastMonthPts = s.monthlyPoints[lastMonthKey] || 0
        const currentMonthPts = s.monthlyPoints[currentMonth] || 0
        const percentIncrease = lastMonthPts > 0 ? ((currentMonthPts - lastMonthPts) / lastMonthPts) * 100 : 0
        return { ...s, percentIncrease, lastMonthPts, currentMonthPts }
      })
      .sort((a, b) => b.percentIncrease - a.percentIncrease)
  }, [students])

  // House MVPs - top student per house this month
  const houseMVPs = useMemo(() => {
    const { currentMonth } = getMonthKeys()
    const houses = ['House of Abū Bakr', 'House of Khadījah', 'House of ʿUmar', 'House of ʿĀʾishah']
    const studentTotals: Record<string, { name: string; house: string; points: number }> = {}

    meritEntries.forEach((entry) => {
      if (!entry.timestamp) return
      const date = new Date(entry.timestamp)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (monthKey !== currentMonth) return
      const house = (entry.house || '').trim()
      if (!house) return
      const studentKey = `${entry.studentName.toLowerCase()}|${entry.grade}|${entry.section.toLowerCase()}|${house.toLowerCase()}`
      if (!studentTotals[studentKey]) {
        studentTotals[studentKey] = { name: entry.studentName, house, points: 0 }
      }
      studentTotals[studentKey].points += entry.points
    })

    return houses.map((house) => {
      const houseStudents = Object.values(studentTotals)
        .filter((s) => s.house === house)
        .sort((a, b) => b.points - a.points)
      return {
        house,
        mvp: houseStudents[0] || null,
        points: houseStudents[0]?.points || 0,
      }
    })
  }, [meritEntries])

  // Grade Champions - top section per grade this month
  const gradeChampions = useMemo(() => {
    const { currentMonth } = getMonthKeys()
    const grades = [6, 7, 8, 9, 10, 11, 12]
    const sectionPoints: Record<string, number> = {}

    meritEntries.forEach((entry) => {
      if (!entry.timestamp) return
      const date = new Date(entry.timestamp)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (monthKey !== currentMonth) return
      const key = `${entry.grade}|${entry.section}`
      sectionPoints[key] = (sectionPoints[key] || 0) + entry.points
    })

    return grades.map((grade) => {
      const gradeSections = Object.entries(sectionPoints)
        .filter(([key]) => key.startsWith(`${grade}|`))
        .map(([key, points]) => {
          const section = key.split('|')[1] || ''
          return { section, points }
        })
        .sort((a, b) => b.points - a.points)

      return {
        grade,
        champion: gradeSections[0] || null,
        points: gradeSections[0]?.points || 0,
      }
    })
  }, [meritEntries])

  // Approaching Milestones
  const approachingMilestones = useMemo(() => {
    return hallOfFameTiers.map((tier) => {
      const approaching = students
        .filter((s) => s.totalPoints < tier.points && s.totalPoints >= tier.points - 20)
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 10)
        .map((s) => ({ ...s, pointsNeeded: tier.points - s.totalPoints }))
      return { ...tier, students: approaching }
    })
  }, [students])

  if (isLoading) {
    return <CrestLoader label="Loading rewards data..." />
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Student Rewards
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Recognition & incentive tracking</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { id: 'hall-of-fame', label: 'Hall of Fame', icon: '🏆' },
          { id: 'badges', label: 'Quarterly Badges', icon: '🎖️' },
          { id: 'monthly', label: 'Monthly Rewards', icon: '⭐' },
          { id: 'approaching', label: 'Approaching', icon: '🎯' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
              selectedTab === tab.id
                ? 'bg-gradient-to-r from-[#2f0a61] to-[#4a1a8a] text-white shadow-lg'
                : 'bg-white text-[#1a1a2e]/60 hover:bg-[#1a1a2e]/5 border border-[#c9a227]/20'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hall of Fame Tab */}
      {selectedTab === 'hall-of-fame' && (
        <div className="space-y-6">
          {hallOfFame.map((tier) => (
            <div key={tier.name} className="regal-card rounded-2xl overflow-hidden">
              <div className={`bg-gradient-to-r ${tier.color} p-6`}>
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{tier.icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                      {tier.name}
                    </h3>
                    <p className="text-white/70">Students with {tier.points}+ individual points</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-3xl font-bold text-white">{tier.total}</p>
                    <p className="text-white/70 text-sm">Total Members</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Males */}
                  <div>
                    <h4 className="text-sm font-semibold text-[#1a1a2e]/40 uppercase tracking-wider mb-4">Male Recipients ({tier.males.length})</h4>
                    {tier.males.length === 0 ? (
                      <p className="text-[#1a1a2e]/30 text-sm">No male students have reached this milestone yet</p>
                    ) : (
                      <div className="space-y-2">
                        {tier.males.slice(0, 5).map((s, i) => (
                          <div key={s.name} className="flex items-center gap-3 p-3 rounded-xl bg-[#f5f3ef]">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-[#1a1a2e]">{s.name}</p>
                              <p className="text-xs text-[#1a1a2e]/40">Grade {s.grade} • {s.section}</p>
                            </div>
                            <span className="font-bold text-[#2f0a61]">{s.totalPoints} pts</span>
                          </div>
                        ))}
                        {tier.males.length > 5 && (
                          <p className="text-sm text-[#1a1a2e]/40 text-center">+{tier.males.length - 5} more</p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Females */}
                  <div>
                    <h4 className="text-sm font-semibold text-[#1a1a2e]/40 uppercase tracking-wider mb-4">Female Recipients ({tier.females.length})</h4>
                    {tier.females.length === 0 ? (
                      <p className="text-[#1a1a2e]/30 text-sm">No female students have reached this milestone yet</p>
                    ) : (
                      <div className="space-y-2">
                        {tier.females.slice(0, 5).map((s, i) => (
                          <div key={s.name} className="flex items-center gap-3 p-3 rounded-xl bg-[#f5f3ef]">
                            <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-[#1a1a2e]">{s.name}</p>
                              <p className="text-xs text-[#1a1a2e]/40">Grade {s.grade} • {s.section}</p>
                            </div>
                            <span className="font-bold text-[#2f0a61]">{s.totalPoints} pts</span>
                          </div>
                        ))}
                        {tier.females.length > 5 && (
                          <p className="text-sm text-[#1a1a2e]/40 text-center">+{tier.females.length - 5} more</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quarterly Badges Tab */}
      {selectedTab === 'badges' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {badgeWinners.map((badge) => (
            <div key={badge.name} className="regal-card rounded-2xl p-6">
              <div className="text-center mb-6">
                <span className="text-5xl mb-3 block">{badge.icon}</span>
                <h3 className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  {badge.name}
                </h3>
                <p className="text-sm text-[#1a1a2e]/50 mt-1">{badge.description}</p>
                <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#c9a227]/10 text-[#9a7b1a]">
                  {badge.category}
                </span>
              </div>
              <div className="space-y-4">
                {/* Top Male */}
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">Top Male</p>
                  {badge.topMale ? (
                    <div>
                      <p className="font-bold text-[#1a1a2e]">{badge.topMale.name}</p>
                      <p className="text-sm text-[#1a1a2e]/50">Grade {badge.topMale.grade} • {badge.topMale.categoryPoints[badge.category]} pts</p>
                    </div>
                  ) : (
                    <p className="text-[#1a1a2e]/30 text-sm">No data yet</p>
                  )}
                </div>
                {/* Top Female */}
                <div className="p-4 rounded-xl bg-pink-50 border border-pink-100">
                  <p className="text-xs font-semibold text-pink-600 uppercase tracking-wider mb-2">Top Female</p>
                  {badge.topFemale ? (
                    <div>
                      <p className="font-bold text-[#1a1a2e]">{badge.topFemale.name}</p>
                      <p className="text-sm text-[#1a1a2e]/50">Grade {badge.topFemale.grade} • {badge.topFemale.categoryPoints[badge.category]} pts</p>
                    </div>
                  ) : (
                    <p className="text-[#1a1a2e]/30 text-sm">No data yet</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly Rewards Tab */}
      {selectedTab === 'monthly' && (
        <div className="space-y-8">
          {/* Consistency Crown */}
          <div className="regal-card rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl">👑</span>
              <div>
                <h3 className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  Consistency Crown
                </h3>
                <p className="text-sm text-[#1a1a2e]/50">20+ points in each of the past 3 consecutive weeks</p>
              </div>
              <span className="ml-auto badge-gold px-3 py-1 rounded-lg text-sm">{consistencyCrown.length} eligible</span>
            </div>
            {consistencyCrown.length === 0 ? (
              <p className="text-[#1a1a2e]/30 text-center py-4">No students have met this criteria yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {consistencyCrown.slice(0, 6).map((s) => (
                  <div key={s.name} className="flex items-center gap-3 p-3 rounded-xl bg-[#f5f3ef]">
                    <span className="text-2xl">👑</span>
                    <div>
                      <p className="font-medium text-[#1a1a2e]">{s.name}</p>
                      <p className="text-xs text-[#1a1a2e]/40">Grade {s.grade} • {s.house}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rising Star */}
          <div className="regal-card rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl">🚀</span>
              <div>
                <h3 className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  Rising Star
                </h3>
                <p className="text-sm text-[#1a1a2e]/50">Highest % increase month-over-month (min 30 pts last month, +20 improvement)</p>
              </div>
            </div>
            {risingStars.length === 0 ? (
              <p className="text-[#1a1a2e]/30 text-center py-4">No students have met this criteria yet</p>
            ) : (
              <div className="space-y-3">
                {risingStars.slice(0, 5).map((s, i) => (
                  <div key={s.name} className="flex items-center gap-4 p-4 rounded-xl bg-[#f5f3ef]">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      i === 0 ? 'bg-gradient-to-br from-[#ffd700] to-[#b8860b] text-white' : 'bg-white text-[#1a1a2e]/50'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-[#1a1a2e]">{s.name}</p>
                      <p className="text-xs text-[#1a1a2e]/40">Grade {s.grade} • {s.house}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+{s.percentIncrease.toFixed(0)}%</p>
                      <p className="text-xs text-[#1a1a2e]/40">{s.lastMonthPts} → {s.currentMonthPts} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* House MVPs */}
          <div className="regal-card rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl">🏅</span>
              <div>
                <h3 className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  House MVPs
                </h3>
                <p className="text-sm text-[#1a1a2e]/50">Top contributor from each house this month</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {houseMVPs.map((h) => (
                <div key={h.house} className="p-4 rounded-xl bg-[#f5f3ef] text-center">
                  {houseLogos[h.house] && (
                    <img src={houseLogos[h.house]} alt={h.house} className="w-12 h-12 mx-auto mb-3 object-contain" />
                  )}
                  <p className="text-xs font-semibold text-[#1a1a2e]/40 uppercase tracking-wider mb-2">{h.house.replace('House of ', '')}</p>
                  {h.mvp ? (
                    <>
                      <p className="font-bold text-[#1a1a2e]">{h.mvp.name}</p>
                      <p className="text-sm text-[#c9a227] font-semibold">{h.points} pts</p>
                    </>
                  ) : (
                    <p className="text-[#1a1a2e]/30 text-sm">No data</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Grade Champions */}
          <div className="regal-card rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl">🎓</span>
              <div>
                <h3 className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  Grade Champions
                </h3>
                <p className="text-sm text-[#1a1a2e]/50">Top section per grade this month</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {gradeChampions.map((g) => (
                <div key={g.grade} className="p-4 rounded-xl bg-[#f5f3ef] text-center">
                  <p className="text-xs font-semibold text-[#1a1a2e]/40 uppercase tracking-wider mb-2">Grade {g.grade}</p>
                  {g.champion ? (
                    <>
                      <p className="font-bold text-[#1a1a2e] text-sm truncate">Section {g.champion.section}</p>
                      <p className="text-sm text-[#c9a227] font-semibold">{g.points} pts</p>
                    </>
                  ) : (
                    <p className="text-[#1a1a2e]/30 text-sm">No data</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Approaching Milestones Tab */}
      {selectedTab === 'approaching' && (
        <div className="space-y-6">
          <div className="regal-card rounded-2xl p-6 bg-gradient-to-r from-[#c9a227]/5 to-transparent">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🎯</span>
              <h3 className="text-lg font-bold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                Students Close to Milestones
              </h3>
            </div>
            <p className="text-sm text-[#1a1a2e]/50 mb-0">Students within 20 points of reaching the next tier</p>
          </div>

          {approachingMilestones.map((tier) => (
            <div key={tier.name} className="regal-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{tier.icon}</span>
                <h4 className="font-bold text-[#1a1a2e]">Approaching {tier.name} ({tier.points} pts)</h4>
                <span className="ml-auto text-sm text-[#1a1a2e]/40">{tier.students.length} students</span>
              </div>
              {tier.students.length === 0 ? (
                <p className="text-[#1a1a2e]/30 text-center py-4">No students are within 20 points of this milestone</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tier.students.map((s) => (
                    <div key={s.name} className="flex items-center gap-3 p-3 rounded-xl bg-[#f5f3ef]">
                      <div className="flex-1">
                        <p className="font-medium text-[#1a1a2e]">{s.name}</p>
                        <p className="text-xs text-[#1a1a2e]/40">Grade {s.grade} • {s.house}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#2f0a61]">{s.totalPoints} pts</p>
                        <p className="text-xs text-[#c9a227] font-semibold">{s.pointsNeeded} to go!</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
