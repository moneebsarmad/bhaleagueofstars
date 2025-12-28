'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase/tables'
import CrestLoader from '@/components/CrestLoader'

interface MeritEntry {
  studentName: string
  grade: number
  section: string
  house: string
  points: number
  staffName: string
}

interface HouseData {
  name: string
  points: number
  color: string
  gradient: string
  accentGradient: string
  logo: string
  percentage: number
  topStudents: { name: string; points: number }[]
}

const houseConfig: Record<string, { color: string; gradient: string; accentGradient: string; logo: string }> = {
  'House of Abū Bakr': {
    color: '#2f0a61',
    gradient: 'linear-gradient(135deg, #4a1a8a 0%, #2f0a61 50%, #1a0536 100%)',
    accentGradient: 'linear-gradient(135deg, #6b2fad 0%, #4a1a8a 100%)',
    logo: '/houses/abu-bakr.png',
  },
  'House of Khadījah': {
    color: '#055437',
    gradient: 'linear-gradient(135deg, #0a7a50 0%, #055437 50%, #033320 100%)',
    accentGradient: 'linear-gradient(135deg, #0d9963 0%, #0a7a50 100%)',
    logo: '/houses/khadijah.png',
  },
  'House of ʿUmar': {
    color: '#000068',
    gradient: 'linear-gradient(135deg, #1a1a9a 0%, #000068 50%, #000040 100%)',
    accentGradient: 'linear-gradient(135deg, #2a2ab8 0%, #1a1a9a 100%)',
    logo: '/houses/umar.png',
  },
  'House of ʿĀʾishah': {
    color: '#910000',
    gradient: 'linear-gradient(135deg, #c41a1a 0%, #910000 50%, #5a0000 100%)',
    accentGradient: 'linear-gradient(135deg, #e02d2d 0%, #c41a1a 100%)',
    logo: '/houses/aishah.png',
  },
}

export default function DashboardPage() {
  const [houses, setHouses] = useState<HouseData[]>([])
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
      // Fetch merit log (paginate to avoid 1k row limit)
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
        const entries: MeritEntry[] = allMeritData.map((m) => ({
          studentName: String(m.student_name ?? ''),
          grade: Number(m.grade ?? 0),
          section: String(m.section ?? ''),
          house: String(m.house ?? ''),
          points: Number(m.points ?? 0),
          staffName: String(m.staff_name ?? ''),
        }))

        const normalizeHouse = (value: string) =>
          value
            .normalize('NFKD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[‘’`ʿʾ]/g, "'")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
        const houseKeys = Object.keys(houseConfig)
        const houseKeyMap = new Map(
          houseKeys.map((key) => [normalizeHouse(key), key])
        )
        const canonicalHouse = (value: string) => {
          const normalized = normalizeHouse(value)
          const direct = houseKeyMap.get(normalized)
          if (direct) return direct
          if (normalized.includes('bakr')) return 'House of Abū Bakr'
          if (normalized.includes('khadijah')) return 'House of Khadījah'
          if (normalized.includes('umar')) return 'House of ʿUmar'
          if (normalized.includes('aishah')) return 'House of ʿĀʾishah'
          return ''
        }

        // Calculate house points directly from merit entries
        const housePoints: Record<string, number> = {}
        entries.forEach((e) => {
          const house = e.house ? canonicalHouse(e.house) : ''
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
          const house = houseRaw ? canonicalHouse(String(houseRaw)) : ''
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

        // Build house data array
        const houseData: HouseData[] = Object.keys(houseConfig).map((name) => ({
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
    return <CrestLoader label="Loading dashboard..." />
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
                  <div className="inline-flex items-center gap-2 text-xs tracking-[0.15em] font-semibold text-white/70 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full mb-4">
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
                  <p className="text-white/50 text-base font-medium">Total Points</p>
                </div>
              </div>

              {/* Top Students */}
              <div className="mt-6">
                <p className="text-white/50 text-sm font-semibold tracking-widest mb-4">Top Performers</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {house.topStudents.map((student, i) => (
                    <div
                      key={student.name}
                      className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 min-w-[150px] border border-white/10 hover:bg-white/15 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-[#c9a227] text-white' :
                          i === 1 ? 'bg-white/30 text-white' :
                          'bg-white/20 text-white/80'
                        }`}>
                          {i + 1}
                        </span>
                        <p className="text-white font-semibold text-sm truncate flex-1">{student.name}</p>
                      </div>
                      <p className="text-[#c9a227] text-lg font-bold">{student.points} <span className="text-xs text-white/50 font-normal">pts</span></p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom accent line */}
            <div className="h-1 bg-gradient-to-r from-transparent via-[#c9a227]/50 to-transparent"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
