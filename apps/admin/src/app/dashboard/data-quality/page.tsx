'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase/tables'
import CrestLoader from '@/components/CrestLoader'

type MeritEntry = {
  studentName: string
  grade: number
  section: string
  house: string
  staffName: string
  category: string
  subcategory: string
  timestamp: string
}

export default function DataQualityPage() {
  const [entries, setEntries] = useState<MeritEntry[]>([])
  const [staffNames, setStaffNames] = useState<string[]>([])
  const [studentKeys, setStudentKeys] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
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

        const getThreeRCategory = (value: string) => {
          const raw = value.toLowerCase()
          if (raw.includes('respect')) return 'Respect'
          if (raw.includes('responsibility')) return 'Responsibility'
          if (raw.includes('righteousness')) return 'Righteousness'
          return ''
        }

        const mappedEntries: MeritEntry[] = allMeritData.map((m) => ({
          studentName: String(m.student_name ?? ''),
          grade: Number(m.grade ?? 0),
          section: String(m.section ?? ''),
          house: String(m.house ?? ''),
          staffName: String(m.staff_name ?? ''),
          category: getThreeRCategory(String(m.r ?? '')),
          subcategory: String(m.subcategory ?? ''),
          timestamp: String(m.timestamp ?? ''),
        }))
        setEntries(mappedEntries)

        const { data: staffData } = await supabase.from(Tables.staff).select('*')
        setStaffNames((staffData || []).map((s) => (s.staff_name || '').toLowerCase()).filter(Boolean))

        const allStudents = new Set<string>()
        const { data: studentData } = await supabase.from(Tables.students).select('*')
        ;(studentData || []).forEach((s) => {
          const key = `${(s.student_name || '').toLowerCase()}|${s.grade || ''}|${(s.section || '').toLowerCase()}`
          if (key.trim()) allStudents.add(key)
        })
        setStudentKeys(allStudents)
      } catch (error) {
        console.error('Data quality error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const stats = useMemo(() => {
    const missingHouse = entries.filter((e) => !e.house).length
    const missingStaff = entries.filter((e) => !e.staffName).length
    const missingStudent = entries.filter((e) => !e.studentName).length
    const missingCategory = entries.filter((e) => !e.category).length
    const missingSection = entries.filter((e) => !e.section).length

    const houseVariants: Record<string, number> = {}
    const normalizeHouse = (value: string) =>
      value
        .normalize('NFKD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[‘’`ʿʾ]/g, "'")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
    entries.forEach((e) => {
      if (!e.house) return
      const key = normalizeHouse(e.house)
      houseVariants[key] = (houseVariants[key] || 0) + 1
    })

    const staffMissing = entries
      .filter((e) => e.staffName && !staffNames.includes(e.staffName.toLowerCase()))
      .slice(0, 10)
      .map((e) => e.staffName)

    const studentMissing = entries
      .filter((e) => {
        const key = `${e.studentName.toLowerCase()}|${e.grade}|${e.section.toLowerCase()}`
        return e.studentName && !studentKeys.has(key)
      })
      .slice(0, 10)
      .map((e) => `${e.studentName} (Grade ${e.grade}${e.section})`)

    return {
      missingHouse,
      missingStaff,
      missingStudent,
      missingCategory,
      missingSection,
      houseVariantCount: Object.keys(houseVariants).length,
      staffMissing,
      studentMissing,
    }
  }, [entries, staffNames, studentKeys])

  if (isLoading) {
    return <CrestLoader label="Running data quality checks..." />
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Data Quality Panel
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Spot missing or inconsistent data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Missing House', value: stats.missingHouse },
          { label: 'Missing Staff Name', value: stats.missingStaff },
          { label: 'Missing Student Name', value: stats.missingStudent },
          { label: 'Missing Category', value: stats.missingCategory },
          { label: 'Missing Section', value: stats.missingSection },
          { label: 'House Variants', value: stats.houseVariantCount },
        ].map((item) => (
          <div key={item.label} className="regal-card rounded-2xl p-6">
            <p className="text-xs font-semibold text-[#1a1a2e]/40 tracking-wider">{item.label}</p>
            <p className="text-3xl font-semibold text-[#1a1a2e] mt-2">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="regal-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Staff Missing in Staff Table
          </h3>
          <p className="text-xs text-[#1a1a2e]/40 mt-1">Sample of names in Merit Log but not in Staff table.</p>
          <div className="mt-4 space-y-2">
            {stats.staffMissing.length === 0 ? (
              <p className="text-sm text-[#1a1a2e]/50">No mismatches found.</p>
            ) : (
              stats.staffMissing.map((name, idx) => (
                <div key={`${name}-${idx}`} className="px-3 py-2 rounded-xl bg-[#f5f3ef] text-sm text-[#1a1a2e]">
                  {name}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="regal-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Students Missing in Students Table
          </h3>
          <p className="text-xs text-[#1a1a2e]/40 mt-1">Sample of student entries not found in the students table.</p>
          <div className="mt-4 space-y-2">
            {stats.studentMissing.length === 0 ? (
              <p className="text-sm text-[#1a1a2e]/50">No mismatches found.</p>
            ) : (
              stats.studentMissing.map((name, idx) => (
                <div key={`${name}-${idx}`} className="px-3 py-2 rounded-xl bg-[#f5f3ef] text-sm text-[#1a1a2e]">
                  {name}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
