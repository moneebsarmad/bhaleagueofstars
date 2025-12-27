'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase } from '../../../lib/supabaseClient'

interface StudentProfile {
  name: string
  grade: number
  section: string
  house: string
}

interface HouseStanding {
  house: string
  total_points: number
}

const houseConfig: Record<string, { color: string; gradient: string; logo: string }> = {
  'House of Abū Bakr': {
    color: '#2f0a61',
    gradient: 'linear-gradient(135deg, #4a1a8a 0%, #2f0a61 50%, #1a0536 100%)',
    logo: '/House%20of%20Ab%C5%AB%20Bakr.png',
  },
  'House of Khadījah': {
    color: '#055437',
    gradient: 'linear-gradient(135deg, #0a7a50 0%, #055437 50%, #033320 100%)',
    logo: '/House%20of%20Khad%C4%ABjah.png',
  },
  'House of ʿUmar': {
    color: '#000068',
    gradient: 'linear-gradient(135deg, #1a1a9a 0%, #000068 50%, #000040 100%)',
    logo: '/House%20of%20%CA%BFUmar.png',
  },
  'House of ʿĀʾishah': {
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

  if (normalized.includes('bakr') || normalized.includes('abu')) return 'House of Abū Bakr'
  if (normalized.includes('khadijah') || normalized.includes('khad')) return 'House of Khadījah'
  if (normalized.includes('umar')) return 'House of ʿUmar'
  if (normalized.includes('aishah') || normalized.includes('aish')) return 'House of ʿĀʾishah'
  return value
}

export default function MyHousePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [standings, setStandings] = useState<HouseStanding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      const name = String(data?.student_name ?? data?.full_name ?? data?.name ?? '').trim()
      const grade = Number(data?.grade ?? 0)
      const section = String(data?.section ?? '')
      const house = String(data?.house ?? '')

      if (error || !name || !house) {
        setProfile(null)
      } else {
        setProfile({ name, grade, section, house })
      }

      const { data: standingsData } = await supabase
        .from('house_standings_view')
        .select('*')
        .order('total_points', { ascending: false })

      setStandings((standingsData || []) as HouseStanding[])
      setLoading(false)
    }

    loadData()
  }, [user])

  const canonical = profile ? canonicalHouse(profile.house) : ''
  const houseInfo = houseConfig[canonical]

  const rankInfo = useMemo(() => {
    if (!canonical) return { rank: null, totalPoints: 0, percentage: 0 }
    const ranked = standings.map((item) => ({
      house: canonicalHouse(String(item.house ?? '')),
      points: Number(item.total_points ?? 0),
    }))
    const sorted = ranked
      .filter((item) => item.house)
      .sort((a, b) => b.points - a.points)
    const total = sorted.reduce((sum, item) => sum + item.points, 0)
    const index = sorted.findIndex((item) => item.house === canonical)
    const points = sorted[index]?.points ?? 0
    return {
      rank: index >= 0 ? index + 1 : null,
      totalPoints: points,
      percentage: total > 0 ? (points / total) * 100 : 0,
    }
  }, [canonical, standings])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Loading your house...</p>
        </div>
      </div>
    )
  }

  if (!profile || !houseInfo) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#c9a227]/10 text-center">
        <p className="text-[#1a1a2e]/70 font-medium">We couldn't find your house yet.</p>
        <p className="text-sm text-[#1a1a2e]/45 mt-2">Please contact the office to link your account.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          My House
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">House standing and contribution snapshot.</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-xl relative" style={{ background: houseInfo.gradient }}>
        <div className="absolute top-8 right-10 w-40 h-40 opacity-[0.06]">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path fill="white" d="M100,10 L120,80 L190,80 L130,120 L150,190 L100,150 L50,190 L70,120 L10,80 L80,80 Z" />
          </svg>
        </div>

        <div className="p-6 relative z-10">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
                <img src={houseInfo.logo} alt={canonical} className="w-12 h-12 object-contain" />
              </div>
              <div>
                <p className="text-white/70 text-xs uppercase tracking-[0.2em]">My House</p>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  {canonical}
                </h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/70">House Rank</p>
              <p className="text-3xl font-bold text-white">#{rankInfo.rank ?? '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4 border border-white/15">
              <p className="text-xs uppercase tracking-wider text-white/60">Total Points</p>
              <p className="text-2xl font-bold text-white mt-2">{rankInfo.totalPoints.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/15">
              <p className="text-xs uppercase tracking-wider text-white/60">Share of Points</p>
              <p className="text-2xl font-bold text-white mt-2">{rankInfo.percentage.toFixed(1)}%</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/15">
              <p className="text-xs uppercase tracking-wider text-white/60">My Class</p>
              <p className="text-2xl font-bold text-white mt-2">{profile.grade}{profile.section}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
