'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import CrestLoader from '../../components/CrestLoader'
import { useAuth } from '../providers'

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

const houseConfig: Record<string, { color: string; gradient: string; logo: string }> = {
  'House of Abu Bakr': {
    color: '#2f0a61',
    gradient: 'linear-gradient(135deg, #4a1a8a 0%, #2f0a61 50%, #1a0536 100%)',
    logo: '/House%20of%20Ab%C5%AB%20Bakr.png',
  },
  'House of Khadijah': {
    color: '#055437',
    gradient: 'linear-gradient(135deg, #0a7a50 0%, #055437 50%, #033320 100%)',
    logo: '/House%20of%20Khad%C4%ABjah.png',
  },
  'House of Umar': {
    color: '#000068',
    gradient: 'linear-gradient(135deg, #1a1a9a 0%, #000068 50%, #000040 100%)',
    logo: '/House%20of%20%CA%BFUmar.png',
  },
  'House of Aishah': {
    color: '#910000',
    gradient: 'linear-gradient(135deg, #c41a1a 0%, #910000 50%, #5a0000 100%)',
    logo: '/House%20of%20%CA%BF%C4%80%CA%BEishah.png',
  },
}

function canonicalHouse(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[''`]/g, "'")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')

  if (normalized.includes('bakr') || normalized.includes('abu')) return 'House of Abu Bakr'
  if (normalized.includes('khadijah') || normalized.includes('khad')) return 'House of Khadijah'
  if (normalized.includes('umar')) return 'House of Umar'
  if (normalized.includes('aishah') || normalized.includes('aish')) return 'House of Aishah'
  return value
}

export default function DashboardPage() {
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
      const canonicalName = canonicalHouse(entry.house)
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

      {/* House Cards */}
      {houses.length === 0 ? (
        <div className="regal-card rounded-2xl p-8 text-center">
          <p className="text-[#1a1a2e]/50">No points logged yet.</p>
        </div>
      ) : (
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
                    <p className="text-white/60 text-sm font-medium">{house.percentage.toFixed(1)}% of total points</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2 min-w-[150px] pt-4">
                    <p className="text-4xl font-bold text-white leading-none" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                      {house.points.toLocaleString()}
                    </p>
                    <p className="text-white/50 text-lg font-medium">Total Points</p>
                  </div>
                </div>
              </div>

              {/* Bottom accent line */}
              <div className="h-1 bg-gradient-to-r from-transparent via-[#c9a227]/50 to-transparent"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
