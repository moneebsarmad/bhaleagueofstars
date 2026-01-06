'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import CrestLoader from '../../components/CrestLoader'
import { useAuth } from '../providers'
import { getHouseConfigRecord, canonicalHouseName } from '@/lib/school.config'

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

const houseConfig = getHouseConfigRecord()

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
