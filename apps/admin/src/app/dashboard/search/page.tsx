'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase/tables'
import CrestLoader from '@/components/CrestLoader'

type Student = {
  name: string
  grade: number
  section: string
  house: string
}

type Staff = {
  name: string
  email: string
}

type MeritEntry = {
  studentName: string
  grade: number
  section: string
  house: string
  points: number
  staffName: string
  category: string
  subcategory: string
  timestamp: string
  notes: string
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [entries, setEntries] = useState<MeritEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStudentKey, setSelectedStudentKey] = useState<string | null>(null)
  const [selectedStaffName, setSelectedStaffName] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const { data: studentData } = await supabase.from(Tables.students).select('*')
        const allStudents: Student[] = (studentData || []).map((s) => ({
          name: s.student_name || '',
          grade: s.grade || 0,
          section: s.section || '',
          house: s.house || '',
        }))

        const { data: staffData } = await supabase.from(Tables.staff).select('*')

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
          points: Number(m.points ?? 0),
          staffName: String(m.staff_name ?? ''),
          category: getThreeRCategory(String(m.r ?? '')),
          subcategory: String(m.subcategory ?? ''),
          timestamp: String(m.timestamp ?? ''),
          notes: String(m.notes ?? ''),
        }))

        setStudents(allStudents.filter((s) => s.name))
        setStaff(
          (staffData || [])
            .map((s) => ({ name: s.staff_name || '', email: s.email || '' }))
            .filter((s) => s.name)
        )
        setEntries(mappedEntries)
      } catch (error) {
        console.error('Search data error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const normalizedQuery = query.trim().toLowerCase()

  const filteredStudents = useMemo(() => {
    if (!normalizedQuery) return []
    return students.filter((s) => s.name.toLowerCase().includes(normalizedQuery))
  }, [students, normalizedQuery])

  const filteredStaff = useMemo(() => {
    if (!normalizedQuery) return []
    return staff.filter((s) => s.name.toLowerCase().includes(normalizedQuery))
  }, [staff, normalizedQuery])

  const studentHistory = useMemo(() => {
    if (!selectedStudentKey) return []
    return entries
      .filter((e) => `${e.studentName.toLowerCase()}|${e.grade}|${e.section.toLowerCase()}` === selectedStudentKey)
      .slice(0, 5)
  }, [entries, selectedStudentKey])

  const staffStats = useMemo(() => {
    if (!selectedStaffName) return null
    const staffEntries = entries.filter((e) => e.staffName.toLowerCase() === selectedStaffName.toLowerCase())
    const points = staffEntries.reduce((sum, e) => sum + e.points, 0)
    const awards = staffEntries.length
    const studentsSet = new Set(staffEntries.map((e) => `${e.studentName.toLowerCase()}|${e.grade}|${e.section.toLowerCase()}`))
    return { points, awards, students: studentsSet.size }
  }, [entries, selectedStaffName])

  if (isLoading) {
    return <CrestLoader label="Loading search..." />
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Student & Staff Search
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Quick lookup for profiles and history</p>
        </div>
      </div>

      <div className="regal-card rounded-2xl p-6 mb-8">
        <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-2 uppercase tracking-wider">
          Search by name
        </label>
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setSelectedStudentKey(null)
            setSelectedStaffName(null)
          }}
          placeholder="Type a student or staff name..."
          className="regal-input w-full px-4 py-3 rounded-xl text-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="regal-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Students
          </h3>
          <p className="text-xs text-[#1a1a2e]/40 mt-1">Click a student to view recent recognitions.</p>
          <div className="mt-4 space-y-3">
            {filteredStudents.length === 0 && normalizedQuery ? (
              <p className="text-sm text-[#1a1a2e]/40">No student matches found.</p>
            ) : (
              filteredStudents.slice(0, 8).map((student) => {
                const key = `${student.name.toLowerCase()}|${student.grade}|${student.section.toLowerCase()}`
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedStudentKey(key)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-[#c9a227]/15 hover:border-[#c9a227]/40 transition bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#1a1a2e]">{student.name}</p>
                        <p className="text-xs text-[#1a1a2e]/40">
                          Grade {student.grade}{student.section} • {student.house}
                        </p>
                      </div>
                      <span className="text-xs text-[#1a1a2e]/40">View</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {selectedStudentKey && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-[#1a1a2e]/40 uppercase tracking-wider mb-2">Recent recognitions</p>
              {studentHistory.length === 0 ? (
                <p className="text-sm text-[#1a1a2e]/40">No recognitions found.</p>
              ) : (
                <div className="space-y-2">
                  {studentHistory.map((entry, index) => (
                    <div key={`${entry.timestamp}-${index}`} className="rounded-xl bg-[#f5f3ef] px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#1a1a2e]">
                          {entry.subcategory || entry.category}
                        </p>
                        <span className="text-sm font-semibold text-[#2f0a61]">{entry.points} pts</span>
                      </div>
                      <p className="text-xs text-[#1a1a2e]/50">
                        {entry.staffName} • {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="regal-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Staff
          </h3>
          <p className="text-xs text-[#1a1a2e]/40 mt-1">Quick stats for staff contributions.</p>
          <div className="mt-4 space-y-3">
            {filteredStaff.length === 0 && normalizedQuery ? (
              <p className="text-sm text-[#1a1a2e]/40">No staff matches found.</p>
            ) : (
              filteredStaff.slice(0, 8).map((member) => (
                <button
                  key={`${member.name}-${member.email}`}
                  onClick={() => setSelectedStaffName(member.name)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-[#c9a227]/15 hover:border-[#c9a227]/40 transition bg-white"
                >
                  <p className="font-semibold text-[#1a1a2e]">{member.name}</p>
                  <p className="text-xs text-[#1a1a2e]/40">{member.email}</p>
                </button>
              ))
            )}
          </div>

          {selectedStaffName && staffStats && (
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#f5f3ef] px-4 py-3 text-center">
                <p className="text-xs text-[#1a1a2e]/40 uppercase tracking-wider">Points</p>
                <p className="text-lg font-semibold text-[#1a1a2e]">{staffStats.points.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-[#f5f3ef] px-4 py-3 text-center">
                <p className="text-xs text-[#1a1a2e]/40 uppercase tracking-wider">Awards</p>
                <p className="text-lg font-semibold text-[#1a1a2e]">{staffStats.awards.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-[#f5f3ef] px-4 py-3 text-center">
                <p className="text-xs text-[#1a1a2e]/40 uppercase tracking-wider">Students</p>
                <p className="text-lg font-semibold text-[#1a1a2e]">{staffStats.students.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
