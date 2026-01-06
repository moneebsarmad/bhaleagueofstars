'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import CrestLoader from '../../../components/CrestLoader'
import { getHouseColors, canonicalHouseName } from '@/lib/school.config'

interface Student {
  id: string
  name: string
  grade: number
  section: string
  house: string
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

function getHouseColor(house: string): string {
  const canonical = canonicalHouseName(house)
  return houseColors[canonical] || '#1a1a2e'
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [meritEntries, setMeritEntries] = useState<MeritEntry[]>([])
  const [searchText, setSearchText] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedHouse, setSelectedHouse] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedStaff) {
      setSelectedStaff(null)
    }
  }, [selectedStudent])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { data: studentData } = await supabase.from('students').select('*')
      const allStudents: Student[] = (studentData || []).map((s, index) => ({
        id: s.id || `${index}`,
        name: s.student_name || '',
        grade: s.grade || 0,
        section: s.section || '',
        house: s.house || '',
        points: 0,
      }))

      const { data: meritData } = await supabase
        .from('merit_log')
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

        const pointsMap: Record<string, number> = {}
        entries.forEach((e) => {
          const key = `${e.studentName.toLowerCase()}|${e.grade}|${e.section.toLowerCase()}`
          pointsMap[key] = (pointsMap[key] || 0) + e.points
        })

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

  const grades = [...new Set(students.map((s) => s.grade))].sort((a, b) => a - b)
  const sections = [...new Set(students.map((s) => s.section).filter(Boolean))].sort()
  const houses = [...new Set(students.map((s) => canonicalHouseName(s.house)))].filter(Boolean)

  const filteredStudents = students
    .filter((s) => {
      if (searchText && !s.name.toLowerCase().includes(searchText.toLowerCase())) return false
      if (selectedGrade && s.grade !== parseInt(selectedGrade)) return false
      if (selectedSection && s.section !== selectedSection) return false
      if (selectedHouse && canonicalHouseName(s.house) !== selectedHouse) return false
      return true
    })
    .sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade
      if (a.section !== b.section) return a.section.localeCompare(b.section)
      return a.name.localeCompare(b.name)
    })

  const groupedStudents: Record<string, Student[]> = {}
  filteredStudents.forEach((s) => {
    const key = `${s.grade}${s.section}`
    if (!groupedStudents[key]) groupedStudents[key] = []
    groupedStudents[key].push(s)
  })

  const studentMerits = selectedStudent
    ? meritEntries.filter((e) =>
        e.studentName.toLowerCase() === selectedStudent.name.toLowerCase() &&
        e.grade === selectedStudent.grade &&
        e.section.toLowerCase() === selectedStudent.section.toLowerCase()
      )
    : []
  const filteredStudentMerits = selectedStaff
    ? studentMerits.filter((e) => e.staffName === selectedStaff)
    : studentMerits

  if (isLoading) {
    return (
      <CrestLoader label="Loading students..." />
    )
  }

  return (
    <div className="flex gap-6">
      {/* Student List */}
      <div className={`${selectedStudent ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Students
          </h1>
          <div className="flex items-center gap-3">
            <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
            <p className="text-[#1a1a2e]/50 text-sm font-medium">{students.length} students enrolled</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#c9a227]/10 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search students..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full px-4 py-2.5 border border-[#1a1a2e]/10 rounded-xl focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] outline-none transition-all"
              />
            </div>

            {/* Grade Filter */}
            <select
              value={selectedGrade || ''}
              onChange={(e) => setSelectedGrade(e.target.value || null)}
              className="px-4 py-2.5 border border-[#1a1a2e]/10 rounded-xl focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] outline-none bg-white"
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
              className="px-4 py-2.5 border border-[#1a1a2e]/10 rounded-xl focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] outline-none bg-white"
            >
              <option value="">All Houses</option>
              {houses.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            {/* Section Filter */}
            <select
              value={selectedSection || ''}
              onChange={(e) => setSelectedSection(e.target.value || null)}
              className="px-4 py-2.5 border border-[#1a1a2e]/10 rounded-xl focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] outline-none bg-white"
            >
              <option value="">All Sections</option>
              {sections.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Student List */}
        <div className="space-y-6">
          {Object.entries(groupedStudents).map(([classLabel, classStudents]) => (
            <div key={classLabel}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-[#1a1a2e]">Class {classLabel}</h2>
                <span className="text-sm text-[#1a1a2e]/50">{classStudents.length} students</span>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-[#c9a227]/10 overflow-hidden">
                {classStudents.map((student, index) => {
                  const houseColor = getHouseColor(student.house)
                  return (
                    <div
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`flex items-center gap-4 p-4 cursor-pointer transition-all ${
                        index !== classStudents.length - 1 ? 'border-b border-[#1a1a2e]/5' : ''
                      } ${selectedStudent?.id === student.id ? 'bg-[#c9a227]/5' : 'hover:bg-[#faf9f7]'}`}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold"
                        style={{
                          backgroundColor: `${houseColor}15`,
                          color: houseColor,
                        }}
                      >
                        {getInitials(student.name)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[#1a1a2e]">{student.name}</p>
                        <div className="flex items-center gap-2 text-sm text-[#1a1a2e]/50">
                          <span>Grade {student.grade}{student.section}</span>
                          <span className="text-[#1a1a2e]/20">•</span>
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: houseColor }}
                          />
                          <span>{canonicalHouseName(student.house)?.replace('House of ', '')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#1a1a2e]">{student.points}</p>
                        <p className="text-xs text-[#1a1a2e]/40">points</p>
                      </div>
                      <svg className="w-5 h-5 text-[#1a1a2e]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {Object.keys(groupedStudents).length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#c9a227]/10">
              <p className="text-[#1a1a2e]/50">No students found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Student Detail Panel */}
      {selectedStudent && (
        <div className="w-1/2 sticky top-24 h-fit">
          <div className="bg-white rounded-2xl shadow-sm border border-[#c9a227]/10 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[#1a1a2e]/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#1a1a2e]">Student Details</h2>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-[#1a1a2e]/40 hover:text-[#1a1a2e] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold"
                  style={{
                    backgroundColor: `${getHouseColor(selectedStudent.house)}15`,
                    color: getHouseColor(selectedStudent.house),
                  }}
                >
                  {getInitials(selectedStudent.name)}
                </div>
                <div>
                  <p className="text-xl font-bold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                    {selectedStudent.name}
                  </p>
                  <p className="text-[#1a1a2e]/50">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGrade(String(selectedStudent.grade))
                        setSelectedSection(selectedStudent.section || null)
                      }}
                      className="text-[#2f0a61] underline underline-offset-2 decoration-[#c9a227] decoration-2 hover:text-[#1a1a2e] transition-colors"
                    >
                      Grade {selectedStudent.grade}{selectedStudent.section}
                    </button>
                    <span className="text-[#1a1a2e]/20"> • </span>
                    <button
                      type="button"
                      onClick={() => setSelectedHouse(canonicalHouseName(selectedStudent.house))}
                      className="text-[#2f0a61] underline underline-offset-2 decoration-[#c9a227] decoration-2 hover:text-[#1a1a2e] transition-colors"
                    >
                      {canonicalHouseName(selectedStudent.house)}
                    </button>
                  </p>
                </div>
              </div>
            </div>

            {/* Total Points */}
            <div className="p-6 border-b border-[#1a1a2e]/5 text-center bg-gradient-to-br from-[#faf9f7] to-white">
              <p className="text-sm text-[#1a1a2e]/50 mb-1">Total Points</p>
              <p
                className="text-4xl font-bold"
                style={{
                  color: getHouseColor(selectedStudent.house),
                  fontFamily: 'var(--font-playfair), Georgia, serif'
                }}
              >
                {selectedStudent.points}
              </p>
            </div>

            {/* Points by Category */}
            <div className="p-6 border-b border-[#1a1a2e]/5">
              <h3 className="text-xs font-semibold text-[#1a1a2e]/40 uppercase tracking-wider mb-3">Points by Category</h3>
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
                  <div key={category} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm text-[#1a1a2e]/70">{category}</span>
                    </div>
                    <span className="font-semibold" style={{ color }}>{categoryPoints}</span>
                  </div>
                )
              })}
            </div>

            {/* Recent Activity */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[#1a1a2e]/40 uppercase tracking-wider">Recent Activity</h3>
                {selectedStaff ? (
                  <button
                    type="button"
                    onClick={() => setSelectedStaff(null)}
                    className="text-xs text-[#1a1a2e]/50 hover:text-[#2f0a61] transition-colors"
                  >
                    Clear staff filter
                  </button>
                ) : null}
              </div>
              {filteredStudentMerits.length === 0 ? (
                <p className="text-[#1a1a2e]/40 text-sm">No activity yet</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {filteredStudentMerits.slice(0, 10).map((merit, index) => (
                    <div key={index} className="flex items-center justify-between py-2.5 border-b border-[#1a1a2e]/5 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-[#1a1a2e]">
                          {merit.subcategory || merit.r?.split(' – ')[0]}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedStaff(merit.staffName)}
                          className="text-xs text-[#2f0a61] underline underline-offset-2 decoration-[#c9a227] decoration-2 hover:text-[#1a1a2e] transition-colors"
                        >
                          {merit.staffName}
                        </button>
                      </div>
                      <span className="text-[#055437] font-semibold">+{merit.points}</span>
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
