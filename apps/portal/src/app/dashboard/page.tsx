'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import CrestLoader from '../../components/CrestLoader'
import { useAuth } from '../providers'
import { getHouseConfigRecord, canonicalHouseName } from '@/lib/school.config'
import { useUserRole } from '../../hooks/usePermissions'
import { Tables } from '../../lib/supabase/tables'

type LeaderboardEntry = {
  house: string
  totalPoints: number
}

interface HouseData {
  name: string
  points: number
  color: string
  gradient: string
  logo: string
  percentage: number
}

interface AdminMeritEntry {
  studentName: string
  grade: number
  section: string
  house: string
  points: number
  staffName: string
}

interface AdminHouseData {
  name: string
  points: number
  color: string
  gradient: string
  accentGradient: string
  logo: string
  percentage: number
  topStudents: { name: string; points: number }[]
}

const houseConfig = getHouseConfigRecord()

function AdminOverviewDashboard() {
  const [houses, setHouses] = useState<AdminHouseData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: Tables.meritLog }, () => {
        fetchDashboardData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
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

      if (allMeritData.length > 0) {
        const entries: AdminMeritEntry[] = allMeritData.map((m) => ({
          studentName: String(m.student_name ?? ''),
          grade: Number(m.grade ?? 0),
          section: String(m.section ?? ''),
          house: String(m.house ?? ''),
          points: Number(m.points ?? 0),
          staffName: String(m.staff_name ?? ''),
        }))

        const housePoints: Record<string, number> = {}
        entries.forEach((e) => {
          const house = e.house ? canonicalHouseName(e.house) : ''
          if (!house) return
          housePoints[house] = (housePoints[house] || 0) + e.points
        })

        const getRowValue = (row: Record<string, unknown>, keys: string[]) => {
          for (const key of keys) {
            if (key in row) {
              return row[key]
            }
          }
          const normalizedKeys = Object.keys(row).reduce<Record<string, string>>((acc, key) => {
            acc[key.toLowerCase()] = key
            return acc
          }, {})
          for (const key of keys) {
            const normalized = normalizedKeys[key.toLowerCase()]
            if (normalized) {
              return row[normalized]
            }
          }
          return undefined
        }

        const { data: topStudentsData, error: topStudentsError } = await supabase
          .from('top_students_per_house')
          .select('*')

        if (topStudentsError) {
          console.error('Error fetching top students per house:', topStudentsError)
        }

        const houseStudents: Record<string, { name: string; points: number; rank?: number | null }[]> = {}
        ;(topStudentsData || []).forEach((row: Record<string, unknown>) => {
          const houseRaw = getRowValue(row, ['house', 'house_name'])
          const studentRaw = getRowValue(row, ['student_name', 'student', 'name'])
          const pointsRaw = getRowValue(row, ['total_points', 'points'])
          const rankRaw = getRowValue(row, ['house_rank', 'rank'])
          const house = houseRaw ? canonicalHouseName(String(houseRaw)) : ''
          if (!house) return
          const studentName = String(studentRaw ?? '').trim() || 'Unnamed Student'
          const points = Number(pointsRaw) || 0
          const rank = Number(rankRaw)
          if (!houseStudents[house]) {
            houseStudents[house] = []
          }
          houseStudents[house].push({
            name: studentName,
            points,
            rank: Number.isFinite(rank) ? rank : null,
          })
        })

        Object.keys(houseStudents).forEach((house) => {
          houseStudents[house].sort((a, b) => {
            const rankA = Number.isFinite(a.rank ?? NaN) ? (a.rank as number) : Number.POSITIVE_INFINITY
            const rankB = Number.isFinite(b.rank ?? NaN) ? (b.rank as number) : Number.POSITIVE_INFINITY
            if (rankA !== rankB) return rankA - rankB
            return b.points - a.points
          })
        })

        const totalPoints = Object.values(housePoints).reduce((a, b) => a + b, 0)

        const houseData: AdminHouseData[] = Object.keys(houseConfig).map((name) => ({
          name,
          points: housePoints[name] || 0,
          color: houseConfig[name].color,
          gradient: houseConfig[name].gradient,
          accentGradient: houseConfig[name].accentGradient,
          logo: houseConfig[name].logo,
          percentage: totalPoints > 0 ? ((housePoints[name] || 0) / totalPoints) * 100 : 0,
          topStudents: (houseStudents[name] || []).slice(0, 5).map((student) => ({
            name: student.name,
            points: student.points,
          })),
        }))

        houseData.sort((a, b) => b.points - a.points)
        setHouses(houseData)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <CrestLoader label="Loading overview..." />
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Overview
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">House standings and top performers</p>
        </div>
      </div>

      {/* House Cards */}
      <div className="space-y-6">
        {houses.map((house, index) => (
          <div
            key={house.name}
            className="rounded-2xl overflow-hidden shadow-xl relative"
            style={{ background: house.gradient }}
          >
            {/* Decorative elements */}
            <div className="absolute top-8 right-10 w-40 h-40 opacity-[0.06]">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <path fill="white" d="M100,10 L120,80 L190,80 L130,120 L150,190 L100,150 L50,190 L70,120 L10,80 L80,80 Z" />
              </svg>
            </div>

            <div className="p-6 relative z-10">
              {/* House Header */}
              <div className="flex items-start justify-between gap-6 mb-5">
                <div>
                  <div className="inline-flex items-center gap-2 text-sm tracking-[0.15em] font-semibold text-white/70 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full mb-4">
                    <span className="text-white/50">Rank</span>
                    <span className="text-white">{index + 1}</span>
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm p-1.5 shadow-lg border border-white/10">
                      <img
                        src={house.logo}
                        alt={house.name}
                        className="w-full h-full object-contain drop-shadow-md"
                      />
                    </div>
                    <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                      {house.name}
                    </h2>
                  </div>
                  {/* Progress bar */}
                  <div className="w-64 h-2.5 bg-white/20 rounded-full overflow-hidden mb-2 backdrop-blur-sm">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${house.percentage}%`,
                        background: 'linear-gradient(90deg, #c9a227 0%, #e8d48b 50%, #c9a227 100%)',
                      }}
                    />
                  </div>
                  <p className="text-white/60 text-base font-medium">{house.percentage.toFixed(1)}% of total points</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2 min-w-[150px] pt-4">
                  <p className="text-4xl font-bold text-white leading-none" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                    {house.points.toLocaleString()}
                  </p>
                  <p className="text-white/50 text-lg font-medium">Total Points</p>
                </div>
              </div>

              {/* Top Students */}
              <div className="mt-6">
                <p className="text-white/50 text-base font-semibold tracking-widest mb-4">Top Performers</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {house.topStudents.map((student) => (
                    <div
                      key={student.name}
                      className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 min-w-[150px] border border-white/10 hover:bg-white/15 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                          {student.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-white font-medium text-sm truncate">{student.name}</p>
                      </div>
                      <p className="text-white/70 text-xs">{student.points.toLocaleString()} pts</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StaffLeaderboardDashboard() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      setDataLoading(true)
      setDataError(null)

      const { data, error } = await supabase
        .from('house_standings_view')
        .select('house,total_points')
        .order('total_points', { ascending: false })

      if (error) {
        setDataError(error.message)
        setLeaderboard([])
      } else {
        const mapped = (data ?? []).map((row) => ({
          house: String(row.house ?? 'Unknown'),
          totalPoints: Number(row.total_points ?? 0),
        }))
        setLeaderboard(mapped)
      }
      setDataLoading(false)
    }

    loadData()
  }, [user])

  const houses: HouseData[] = useMemo(() => {
    const totalPoints = leaderboard.reduce((sum, item) => sum + (item.totalPoints ?? 0), 0)

    return leaderboard.map((entry) => {
      const canonicalName = canonicalHouseName(entry.house)
      const config = houseConfig[canonicalName] ?? {
        color: '#1a1a2e',
        gradient: 'linear-gradient(135deg, #2a2a4e 0%, #1a1a2e 100%)',
        logo: '/crest.png',
      }

      return {
        name: entry.house,
        points: entry.totalPoints,
        color: config.color,
        gradient: config.gradient,
        logo: config.logo,
        percentage: totalPoints > 0 ? (entry.totalPoints / totalPoints) * 100 : 0,
      }
    })
  }, [leaderboard])

  const topHouse = houses[0]
  const otherHouses = houses.slice(1)

  if (dataLoading) {
    return (
      <CrestLoader label="Loading dashboard..." />
    )
  }

  if (dataError) {
    return (
      <div className="regal-card rounded-2xl p-6">
        <div className="flex items-center gap-3 text-[#910000]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="font-medium">{dataError}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          House Standings
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Current academic year rankings</p>
        </div>
      </div>

      {/* House Podium */}
      {houses.length === 0 ? (
        <div className="regal-card rounded-2xl p-8 text-center">
          <p className="text-[#1a1a2e]/50">No points logged yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {topHouse ? (
            <div
              className="rounded-3xl overflow-hidden shadow-2xl relative"
              style={{ background: topHouse.gradient }}
            >
              <div className="absolute -top-6 right-6 text-[120px] font-black text-white/10">
                1
              </div>
              <div className="p-8 relative z-10">
                <div className="flex items-center justify-between gap-8">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm p-2 shadow-lg border border-white/10">
                      <img
                        src={topHouse.logo}
                        alt={topHouse.name}
                        className="w-full h-full object-contain drop-shadow-md"
                      />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-semibold text-white/70 bg-white/10 border border-white/15 px-3 py-1 rounded-full mb-3">
                        <span className="text-white/50">Top House</span>
                      </div>
                      <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                        {topHouse.name}
                      </h2>
                      <p className="text-white/60 text-sm font-medium">{topHouse.percentage.toFixed(1)}% of total points</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-5xl font-bold text-white leading-none" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                      {topHouse.points.toLocaleString()}
                    </p>
                    <p className="text-white/50 text-sm font-medium">Total Points</p>
                  </div>
                </div>
                <div className="mt-6 h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${topHouse.percentage}%`,
                      background: 'linear-gradient(90deg, #c9a227 0%, #e8d48b 50%, #c9a227 100%)',
                    }}
                  />
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-transparent via-[#c9a227]/60 to-transparent"></div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {otherHouses.map((house, index) => (
              <div
                key={house.name}
                className="rounded-2xl overflow-hidden shadow-xl relative"
                style={{ background: house.gradient }}
              >
                <div className="absolute top-4 right-4 text-4xl font-black text-white/10">
                  {index + 2}
                </div>
                <div className="p-5 relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm p-1.5 shadow-lg border border-white/10">
                      <img
                        src={house.logo}
                        alt={house.name}
                        className="w-full h-full object-contain drop-shadow-md"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                        {house.name}
                      </h3>
                      <p className="text-white/60 text-xs font-medium">{house.percentage.toFixed(1)}% of total points</p>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-3xl font-bold text-white leading-none" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                      {house.points.toLocaleString()}
                    </p>
                    <p className="text-white/50 text-xs font-medium">Points</p>
                  </div>
                  <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${house.percentage}%`,
                        background: 'linear-gradient(90deg, #c9a227 0%, #e8d48b 50%, #c9a227 100%)',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2a2a4e] px-5 py-4 rounded-2xl">
            <div className="flex items-center justify-between text-white">
              <span className="text-sm font-medium text-white/60">Total Points Awarded</span>
              <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                {houses.reduce((sum, h) => sum + h.points, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { role, loading } = useUserRole()

  if (loading) {
    return <CrestLoader label="Loading dashboard..." />
  }

  if (role === 'admin' || role === 'super_admin') {
    return <AdminOverviewDashboard />
  }

  return <StaffLeaderboardDashboard />
}
