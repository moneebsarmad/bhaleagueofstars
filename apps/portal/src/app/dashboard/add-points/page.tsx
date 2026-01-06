'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useAuth } from '../../providers'
import CrestLoader from '../../../components/CrestLoader'
import { getHouseColors, canonicalHouseName } from '@/lib/school.config'

interface Student {
  id: string
  name: string
  grade: number
  section: string
  house: string
}

interface Category {
  id: string
  r: string
  subcategory: string
  points: number
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

export default function AddPointsPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchText, setSearchText] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
  const [selectedR, setSelectedR] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [notes, setNotes] = useState('')
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0])
  const [staffName, setStaffName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    fetchData()
    fetchStaffName()
  }, [user])

  const fetchStaffName = async () => {
    if (!user?.email) return
    try {
      const { data } = await supabase
        .from('staff')
        .select('staff_name')
        .eq('email', user.email)
        .maybeSingle()

      if (data?.staff_name) {
        setStaffName(data.staff_name)
      } else {
        setStaffName(user.email || 'Staff')
      }
    } catch {
      setStaffName(user?.email || 'Staff')
    }
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [studentsRes, categoriesRes] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('3r_categories').select('*'),
      ])

      const allStudents: Student[] = (studentsRes.data || []).map((s, index) => ({
        id: s.id || `${index}`,
        name: s.student_name || '',
        grade: s.grade || 0,
        section: s.section || '',
        house: s.house || '',
      }))
      setStudents(allStudents)

      const allCategories: Category[] = (categoriesRes.data || []).map((c) => ({
        id: c.id,
        r: c.r || '',
        subcategory: c.subcategory || '',
        points: c.points || 0,
      }))
      setCategories(allCategories)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedStudentIds = new Set(selectedStudents.map((student) => student.id))

  const filteredStudents = students
    .filter((s) => searchText && s.name.toLowerCase().includes(searchText.toLowerCase()) && !selectedStudentIds.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 10)

  const rOptions = [...new Set(categories.map((c) => c.r))].filter(Boolean)
  const subcategories = selectedR ? categories.filter((c) => c.r === selectedR) : []

  const handleSubmit = async () => {
    if (selectedStudents.length === 0 || !selectedCategory) return

    setIsSubmitting(true)
    try {
      const now = new Date().toISOString()
      const meritEntries = selectedStudents.map((student) => ({
        timestamp: now,
        date_of_event: eventDate || new Date().toISOString().split('T')[0],
        student_name: student.name,
        grade: student.grade,
        section: student.section,
        house: student.house,
        r: selectedR,
        subcategory: selectedCategory.subcategory,
        points: selectedCategory.points,
        notes: notes,
        staff_name: staffName,
      }))

      const { error } = await supabase.from('merit_log').insert(meritEntries)

      if (error) {
        console.error('Error adding merit:', error)
        alert('Failed to add points. Please try again.')
      } else {
        setShowSuccess(true)
        setTimeout(() => {
          setShowSuccess(false)
          resetForm()
        }, 2000)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to add points. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedStudents([])
    setSelectedR(null)
    setSelectedCategory(null)
    setNotes('')
    setEventDate(new Date().toISOString().split('T')[0])
    setSearchText('')
  }

  const handleAddStudent = (student: Student) => {
    if (selectedStudentIds.has(student.id)) return
    setSelectedStudents((prev) => [...prev, student])
    setSearchText('')
  }

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents((prev) => prev.filter((student) => student.id !== studentId))
  }

  if (isLoading) {
    return (
      <CrestLoader label="Loading..." />
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Add Points
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Award merit points to students</p>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-[#055437]/10 border border-[#055437]/20 text-[#055437] px-5 py-4 rounded-xl mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#055437] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-medium">
            Points awarded to {selectedStudents.length || 'selected'} student{selectedStudents.length === 1 ? '' : 's'}!
          </span>
        </div>
      )}

      {/* Step 1: Select Student */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] text-white rounded-full flex items-center justify-center font-bold text-sm">1</span>
          <h2 className="text-lg font-semibold text-[#1a1a2e]">Select Students</h2>
        </div>

        <div>
          {selectedStudents.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[#1a1a2e]/70">
                  Selected ({selectedStudents.length})
                </p>
                <button
                  onClick={() => setSelectedStudents([])}
                  className="text-[#c9a227] hover:text-[#9a7b1a] font-medium text-sm transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => handleRemoveStudent(student.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#faf9f7] border border-[#c9a227]/20 text-sm text-[#1a1a2e] hover:border-[#c9a227]/50 transition-colors"
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        backgroundColor: `${getHouseColor(student.house)}15`,
                        color: getHouseColor(student.house),
                      }}
                    >
                      {getInitials(student.name)}
                    </span>
                    <span>{student.name}</span>
                    <span className="text-[#1a1a2e]/30">×</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <input
            type="text"
            placeholder="Search for a student..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-4 py-3 border border-[#1a1a2e]/10 rounded-xl focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] outline-none mb-3 transition-all"
          />
          {filteredStudents.length > 0 && (
            <div className="border border-[#1a1a2e]/10 rounded-xl overflow-hidden">
              {filteredStudents.map((student, index) => (
                <button
                  key={student.id}
                  onClick={() => handleAddStudent(student)}
                  className={`w-full flex items-center gap-4 p-3.5 hover:bg-[#faf9f7] transition-colors ${
                    index !== filteredStudents.length - 1 ? 'border-b border-[#1a1a2e]/5' : ''
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{
                      backgroundColor: `${getHouseColor(student.house)}15`,
                      color: getHouseColor(student.house),
                    }}
                  >
                    {getInitials(student.name)}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-[#1a1a2e]">{student.name}</p>
                    <p className="text-sm text-[#1a1a2e]/50">
                      Grade {student.grade}{student.section} • {canonicalHouseName(student.house)?.replace('House of ', '')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Select Category */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            selectedStudents.length > 0
              ? 'bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] text-white'
              : 'bg-[#1a1a2e]/10 text-[#1a1a2e]/40'
          }`}>2</span>
          <h2 className={`text-lg font-semibold ${selectedStudents.length > 0 ? 'text-[#1a1a2e]' : 'text-[#1a1a2e]/40'}`}>
            Select Category
          </h2>
        </div>

        <div className="space-y-3">
          {rOptions.map((r) => {
            const icon = r.toLowerCase().includes('respect') ? '🤝'
              : r.toLowerCase().includes('responsibility') ? '✅'
              : r.toLowerCase().includes('righteous') ? '⭐'
              : '📌'
            return (
              <button
                key={r}
                onClick={() => {
                  setSelectedR(r)
                  setSelectedCategory(null)
                }}
                disabled={selectedStudents.length === 0}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedR === r
                    ? 'border-[#c9a227] bg-[#c9a227]/5'
                    : 'border-[#1a1a2e]/10 hover:border-[#c9a227]/30'
                } ${selectedStudents.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-2xl">{icon}</span>
                <div className="text-left flex-1">
                  <p className="font-medium text-[#1a1a2e]">{r}</p>
                </div>
                {selectedR === r && (
                  <div className="w-6 h-6 rounded-full bg-[#c9a227] flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 3: Select Reason */}
      {selectedR && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] text-white rounded-full flex items-center justify-center font-bold text-sm">3</span>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">Select Reason</h2>
          </div>

          <div className="space-y-2">
            {subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedCategory(sub)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedCategory?.id === sub.id
                    ? 'border-[#c9a227] bg-[#c9a227]/5'
                    : 'border-[#1a1a2e]/10 hover:border-[#c9a227]/30'
                }`}
              >
                <div className="text-left flex-1">
                  <p className="font-medium text-[#1a1a2e]">{sub.subcategory}</p>
                </div>
                <span className="font-bold text-[#055437]">+{sub.points}</span>
                {selectedCategory?.id === sub.id && (
                  <div className="w-6 h-6 rounded-full bg-[#c9a227] flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Date of Event */}
      {selectedCategory && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] text-white rounded-full flex items-center justify-center font-bold text-sm">4</span>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">Date of Event</h2>
          </div>

          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full px-4 py-3 border border-[#1a1a2e]/10 rounded-xl focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] outline-none transition-all"
          />
        </div>
      )}

      {/* Step 5: Notes */}
      {selectedCategory && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] text-white rounded-full flex items-center justify-center font-bold text-sm">5</span>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">Add Notes (Optional)</h2>
          </div>

          <textarea
            placeholder="Add any additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 border border-[#1a1a2e]/10 rounded-xl focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] outline-none resize-none transition-all"
            rows={3}
          />
        </div>
      )}

      {/* Submit Button */}
      {selectedStudents.length > 0 && selectedCategory && (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-[#c9a227] to-[#9a7b1a] text-white py-4 px-6 rounded-xl font-medium hover:from-[#9a7b1a] hover:to-[#7a5f14] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <span>
                Award {selectedCategory.points} points to {selectedStudents.length} student{selectedStudents.length === 1 ? '' : 's'}
              </span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  )
}
