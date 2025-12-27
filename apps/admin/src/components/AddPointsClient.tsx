'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/lib/supabase/tables'
import CrestLoader from '@/components/CrestLoader'

interface Student {
  id: string
  name: string
  grade: number
  section: string
  house: string
}

interface MeritCategory {
  id: string
  name: string
  description: string
  icon: string
  subcategories: MeritSubcategory[]
}

interface MeritSubcategory {
  id: string
  name: string
  description: string
  points: number
}

const houseColors: Record<string, string> = {
  'House of Abū Bakr': '#2f0a61',
  'House of Khadījah': '#055437',
  'House of ʿUmar': '#000068',
  'House of ʿĀʾishah': '#910000',
}

const meritCategories: MeritCategory[] = [
  {
    id: 'respect',
    name: 'Respect',
    description: 'Showing consideration for others',
    icon: '🤝',
    subcategories: [
      { id: 'r1', name: 'Polite Communication', description: 'Using kind words and respectful tone', points: 5 },
      { id: 'r2', name: 'Active Listening', description: 'Paying attention when others speak', points: 5 },
      { id: 'r3', name: 'Helping Others', description: 'Offering assistance to classmates or teachers', points: 10 },
      { id: 'r4', name: 'Conflict Resolution', description: 'Resolving disagreements peacefully', points: 15 },
    ],
  },
  {
    id: 'responsibility',
    name: 'Responsibility',
    description: 'Being accountable for actions',
    icon: '✅',
    subcategories: [
      { id: 's1', name: 'Punctuality', description: 'Arriving on time to class', points: 5 },
      { id: 's2', name: 'Homework Completion', description: 'Submitting assignments on time', points: 5 },
      { id: 's3', name: 'Leadership', description: 'Taking initiative in group activities', points: 10 },
      { id: 's4', name: 'Taking Ownership', description: 'Admitting mistakes and learning from them', points: 15 },
    ],
  },
  {
    id: 'righteousness',
    name: 'Righteousness',
    description: 'Doing what is morally right',
    icon: '⭐',
    subcategories: [
      { id: 'g1', name: 'Honesty', description: 'Being truthful in all situations', points: 10 },
      { id: 'g2', name: 'Integrity', description: 'Doing the right thing even when unobserved', points: 10 },
      { id: 'g3', name: 'Fairness', description: 'Treating everyone equally', points: 10 },
      { id: 'g4', name: 'Excellence', description: 'Going above and beyond expectations', points: 15 },
    ],
  },
]

export default function AddPointsClient() {
  const [students, setStudents] = useState<Student[]>([])
  const [searchText, setSearchText] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<MeritCategory | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<MeritSubcategory | null>(null)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    fetchStudents()
    fetchAdminName()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('add-points-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: Tables.students }, () => {
        fetchStudents()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: Tables.admins }, () => {
        fetchAdminName()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchAdminName = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return

      const { data: admin } = await supabase
        .from(Tables.admins)
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle()

      if (admin?.staff_name) {
        setAdminName(admin.staff_name)
        return
      }

      setAdminName(authData.user.email || 'Admin')
    } catch (error) {
      console.error('Error fetching admin name:', error)
    }
  }

  const fetchStudents = async () => {
    setIsLoading(true)
    try {
      const { data } = await supabase.from(Tables.students).select('*')
      const allStudents: Student[] = (data || []).map((s, index) => ({
        id: s.id || `${index}`,
        name: s.student_name || '',
        grade: s.grade || 0,
        section: s.section || '',
        house: s.house || '',
      }))
      setStudents(allStudents)
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredStudents = students
    .filter((s) => searchText && s.name.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 10)

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const handleSubmit = async () => {
    if (!selectedStudent || !selectedCategory || !selectedSubcategory) return

    setIsSubmitting(true)
    try {
      const meritEntry = {
        merit_id: `MERIT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        date_of_event: new Date().toISOString().split('T')[0],
        student_name: selectedStudent.name,
        grade: selectedStudent.grade,
        section: selectedStudent.section,
        house: selectedStudent.house,
        r: `${selectedCategory.name} – ${selectedCategory.description}`,
        subcategory: selectedSubcategory.name,
        points: selectedSubcategory.points,
        notes: notes,
        staff_name: adminName,
      }

      const { error } = await supabase.from(Tables.meritLog).insert([meritEntry])

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
    setSelectedStudent(null)
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setNotes('')
    setSearchText('')
  }

  if (isLoading) {
    return <CrestLoader label="Loading..." />
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Add Points
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Award merit points to students</p>
        </div>
      </div>

      {showSuccess && (
        <div className="bg-[#055437]/10 border border-[#055437]/20 text-[#055437] px-5 py-4 rounded-xl mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#055437] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-medium">Points awarded successfully!</span>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] text-white rounded-full flex items-center justify-center font-bold text-sm">1</span>
          <h2 className="text-lg font-semibold text-[#1a1a2e]">Select Student</h2>
        </div>

        {selectedStudent ? (
          <div className="flex items-center gap-4 p-4 bg-[#faf9f7] rounded-xl border border-[#c9a227]/10">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: `${houseColors[selectedStudent.house]}20`,
                color: houseColors[selectedStudent.house],
              }}
            >
              {getInitials(selectedStudent.name)}
            </div>
            <div className="flex-1">
              <p className="font-medium text-[#1a1a2e]">{selectedStudent.name}</p>
              <p className="text-sm text-[#1a1a2e]/50">
                Grade {selectedStudent.grade}{selectedStudent.section} • {selectedStudent.house}
              </p>
            </div>
            <button
              onClick={() => setSelectedStudent(null)}
              className="text-[#c9a227] hover:text-[#9a7b1a] font-medium text-sm transition-colors"
            >
              Change
            </button>
          </div>
        ) : (
          <div>
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
                    onClick={() => {
                      setSelectedStudent(student)
                      setSearchText('')
                    }}
                    className={`w-full flex items-center gap-4 p-3.5 hover:bg-[#faf9f7] transition-colors ${
                      index !== filteredStudents.length - 1 ? 'border-b border-[#1a1a2e]/5' : ''
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: `${houseColors[student.house]}20`,
                        color: houseColors[student.house],
                      }}
                    >
                      {getInitials(student.name)}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-[#1a1a2e]">{student.name}</p>
                      <p className="text-sm text-[#1a1a2e]/50">
                        Grade {student.grade}{student.section} • {student.house?.replace('House of ', '')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] text-white rounded-full flex items-center justify-center font-bold text-sm">2</span>
          <h2 className="text-lg font-semibold text-[#1a1a2e]">Select Category</h2>
        </div>

        <div className="space-y-3">
          {meritCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category)
                setSelectedSubcategory(null)
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                selectedCategory?.id === category.id
                  ? 'border-[#c9a227] bg-[#c9a227]/5'
                  : 'border-[#1a1a2e]/10 hover:border-[#c9a227]/30'
              }`}
            >
              <span className="text-2xl">{category.icon}</span>
              <div className="text-left flex-1">
                <p className="font-medium text-[#1a1a2e]">{category.name}</p>
                <p className="text-sm text-[#1a1a2e]/50">{category.description}</p>
              </div>
              {selectedCategory?.id === category.id && (
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

      {selectedCategory && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] text-white rounded-full flex items-center justify-center font-bold text-sm">3</span>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">Select Reason</h2>
          </div>

          <div className="space-y-2">
            {selectedCategory.subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubcategory(sub)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedSubcategory?.id === sub.id
                    ? 'border-[#c9a227] bg-[#c9a227]/5'
                    : 'border-[#1a1a2e]/10 hover:border-[#c9a227]/30'
                }`}
              >
                <div className="text-left flex-1">
                  <p className="font-medium text-[#1a1a2e]">{sub.name}</p>
                  <p className="text-sm text-[#1a1a2e]/50">{sub.description}</p>
                </div>
                <span className="font-bold text-[#055437]">+{sub.points}</span>
                {selectedSubcategory?.id === sub.id && (
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

      {selectedSubcategory && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-8 bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] text-white rounded-full flex items-center justify-center font-bold text-sm">4</span>
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

      {selectedStudent && selectedCategory && selectedSubcategory && (
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
              <span>Award {selectedSubcategory.points} points to {selectedStudent.name}</span>
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
