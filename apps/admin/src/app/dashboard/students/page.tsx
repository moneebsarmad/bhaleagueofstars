'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase/tables'
import CrestLoader from '@/components/CrestLoader'
import { getHouseColors } from '@/lib/school.config'
import { useSessionStorageState } from '@/hooks/useSessionStorageState'

interface Student {
  id: string
  name: string
  grade: number
  section: string
  house: string
  gender: string
  points: number
}

interface MeritEntry {
  studentName: string
  points: number
  r: string
  subcategory: string
  dateOfEvent: string
  staffName: string
  grade: number
  section: string
}

const houseColors = getHouseColors()

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [meritEntries, setMeritEntries] = useState<MeritEntry[]>([])
  const [searchText, setSearchText] = useSessionStorageState('admin:students:searchText', '')
  const [selectedGrade, setSelectedGrade] = useSessionStorageState<string | null>('admin:students:selectedGrade', null)
  const [selectedHouse, setSelectedHouse] = useSessionStorageState<string | null>('admin:students:selectedHouse', null)
  const [selectedStudent, setSelectedStudent] = useSessionStorageState<Student | null>('admin:students:selectedStudent', null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch students from all grade tables
      const { data: studentData } = await supabase.from(Tables.students).select('*')
      const allStudents: Student[] = (studentData || []).map((s, index) => ({
        id: s.id || `${index}`,
        name: s.student_name || '',
        grade: s.grade || 0,
        section: s.section || '',
        house: s.house || '',
        gender: s.gender || '',
        points: 0,
      }))

      // Fetch merit entries
      const { data: meritData } = await supabase
        .from(Tables.meritLog)
        .select('*')
        .order('timestamp', { ascending: false })

      if (meritData) {
        const entries: MeritEntry[] = meritData.map((m) => ({
          studentName: m.student_name || '',
          points: m.points || 0,
          r: m.r || '',
          subcategory: m.subcategory || '',
          dateOfEvent: m.date_of_event || '',
          staffName: m.staff_name || '',
          grade: m.grade || 0,
          section: m.section || '',
        }))
        setMeritEntries(entries)

        // Calculate points per student using stable key
        const pointsMap: Record<string, number> = {}
        entries.forEach((e) => {
          const key = `${e.studentName.toLowerCase()}|${e.grade}|${e.section.toLowerCase()}`
          pointsMap[key] = (pointsMap[key] || 0) + e.points
        })

        // Update student points
        allStudents.forEach((s) => {
          const key = `${s.name.toLowerCase()}|${s.grade}|${s.section.toLowerCase()}`
          s.points = pointsMap[key] || 0
        })
      }

      setStudents(allStudents)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get unique grades
  const grades = [...new Set(students.map((s) => s.grade))].sort((a, b) => a - b)

  // Filter students
  const filteredStudents = students
    .filter((s) => {
      if (searchText && !s.name.toLowerCase().includes(searchText.toLowerCase())) return false
      if (selectedGrade && s.grade !== parseInt(selectedGrade)) return false
      if (selectedHouse && s.house !== selectedHouse) return false
      return true
    })
    .sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade
      if (a.section !== b.section) return a.section.localeCompare(b.section)
      return a.name.localeCompare(b.name)
    })

  // Group students by class
  const groupedStudents: Record<string, Student[]> = {}
  filteredStudents.forEach((s) => {
    const key = `${s.grade}${s.section}`
    if (!groupedStudents[key]) groupedStudents[key] = []
    groupedStudents[key].push(s)
  })

  // Get student merit entries
  const studentMerits = selectedStudent
    ? meritEntries.filter((e) =>
        e.studentName.toLowerCase() === selectedStudent.name.toLowerCase() &&
        e.grade === selectedStudent.grade &&
        e.section.toLowerCase() === selectedStudent.section.toLowerCase()
      )
    : []

  // Get initials
  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  if (isLoading) {
    return <CrestLoader label="Loading students..." />
  }

  return (
    <div className="flex gap-6">
      {/* Student List */}
      <div className={`${selectedStudent ? 'w-1/2' : 'w-full'} transition-all`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Students ({students.length})</h1>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search students..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Grade Filter */}
            <select
              value={selectedGrade || ''}
              onChange={(e) => setSelectedGrade(e.target.value || null)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="">All Grades</option>
              {grades.map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>

            {/* House Filter */}
            <select
              value={selectedHouse || ''}
              onChange={(e) => setSelectedHouse(e.target.value || null)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="">All Houses</option>
              {Object.keys(houseColors).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Student List */}
        <div className="space-y-6">
          {Object.entries(groupedStudents).map(([classLabel, classStudents]) => (
            <div key={classLabel}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Class {classLabel}</h2>
                <span className="text-sm text-gray-500">{classStudents.length} students</span>
              </div>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {classStudents.map((student, index) => (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
                      index !== classStudents.length - 1 ? 'border-b border-gray-50' : ''
                    } ${selectedStudent?.id === student.id ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: '#eef2f0',
                        color: '#0f5b3a',
                      }}
                    >
                      {getInitials(student.name)}
                    </div>
                    <div className="flex-1">
                      <p
                        className="font-semibold text-gray-900"
                        style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                      >
                        {student.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Grade {student.grade}{student.section}</span>
                        <span>•</span>
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: houseColors[student.house] }}
                        />
                        <span>{student.house?.replace('House of ', '')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className="font-bold text-gray-900"
                        style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                      >
                        {student.points}
                      </p>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Detail Panel */}
      {selectedStudent && (
        <div className="w-1/2 sticky top-24 h-fit">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Student Details</h2>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{
                    backgroundColor: '#eef2f0',
                    color: '#0f5b3a',
                  }}
                >
                  {getInitials(selectedStudent.name)}
                </div>
                <div>
                  <p
                    className="text-xl font-bold text-gray-900"
                    style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
                  >
                    {selectedStudent.name}
                  </p>
                  <p className="text-gray-500">
                    <Link
                      href={`/dashboard/analytics?grade=${encodeURIComponent(String(selectedStudent.grade))}&section=${encodeURIComponent(selectedStudent.section)}`}
                      className="hover:text-[#2f0a61] transition-colors"
                    >
                      Grade {selectedStudent.grade}{selectedStudent.section}
                    </Link>
                    <span className="text-gray-400"> • </span>
                    <Link
                      href={`/dashboard/analytics?house=${encodeURIComponent(selectedStudent.house)}`}
                      className="hover:text-[#2f0a61] transition-colors"
                    >
                      {selectedStudent.house}
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Total Points */}
            <div className="p-6 border-b border-gray-100 text-center">
              <p className="text-sm text-gray-500 mb-1">Total Points</p>
              <p
                className="text-4xl font-bold"
                style={{
                  color: '#0f5b3a',
                  fontFamily: 'var(--font-playfair), Georgia, serif',
                }}
              >
                {selectedStudent.points}
              </p>
            </div>

            {/* Points by Category */}
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">Points by Category</h3>
              {['Respect', 'Responsibility', 'Righteousness'].map((category) => {
                const categoryPoints = studentMerits
                  .filter((m) => m.r.toLowerCase().includes(category.toLowerCase()))
                  .reduce((sum, m) => sum + m.points, 0)
                const color = category === 'Respect'
                  ? '#1f4e79'
                  : category === 'Responsibility'
                    ? '#8a6a1e'
                    : '#6b2f8a'
                return (
                  <div key={category} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm text-gray-700">{category}</span>
                    </div>
                    <span className="font-semibold" style={{ color }}>{categoryPoints}</span>
                  </div>
                )
              })}
            </div>

            {/* Recent Activity */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">Recent Activity</h3>
              {studentMerits.length === 0 ? (
                <p className="text-gray-400 text-sm">No activity yet</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {studentMerits.slice(0, 10).map((merit, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{merit.subcategory || merit.r?.split(' – ')[0]}</p>
                        <Link
                          href={`/dashboard/analytics?staff=${encodeURIComponent(merit.staffName)}`}
                          className="text-xs text-gray-500 hover:text-[#2f0a61] transition-colors"
                        >
                          {merit.staffName}
                        </Link>
                      </div>
                      <span className="text-green-600 font-semibold">+{merit.points}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
