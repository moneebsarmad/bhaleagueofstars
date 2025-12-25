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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Points</h1>

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
          <span className="text-xl">✓</span>
          <span className="font-medium">Points awarded successfully!</span>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">1</span>
          <h2 className="text-lg font-semibold text-gray-900">Select Student</h2>
        </div>

        {selectedStudent ? (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: `${houseColors[selectedStudent.house]}20`,
                color: houseColors[selectedStudent.house],
              }}
            >
              {getInitials(selectedStudent.name)}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{selectedStudent.name}</p>
              <p className="text-sm text-gray-500">
                Grade {selectedStudent.grade}{selectedStudent.section} • {selectedStudent.house}
              </p>
            </div>
            <button
              onClick={() => setSelectedStudent(null)}
              className="text-gray-400 hover:text-gray-600"
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
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none mb-3"
            />
            {filteredStudents.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student)
                      setSearchText('')
                    }}
                    className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: `${houseColors[student.house]}20`,
                        color: houseColors[student.house],
                      }}
                    >
                      {getInitials(student.name)}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">
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

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">2</span>
          <h2 className="text-lg font-semibold text-gray-900">Select Category</h2>
        </div>

        <div className="space-y-3">
          {meritCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category)
                setSelectedSubcategory(null)
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                selectedCategory?.id === category.id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <span className="text-2xl">{category.icon}</span>
              <div className="text-left flex-1">
                <p className="font-medium text-gray-900">{category.name}</p>
                <p className="text-sm text-gray-500">{category.description}</p>
              </div>
              {selectedCategory?.id === category.id && (
                <span className="text-green-500">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedCategory && (
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">3</span>
            <h2 className="text-lg font-semibold text-gray-900">Select Reason</h2>
          </div>

          <div className="space-y-2">
            {selectedCategory.subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubcategory(sub)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                  selectedSubcategory?.id === sub.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="text-left flex-1">
                  <p className="font-medium text-gray-900">{sub.name}</p>
                  <p className="text-sm text-gray-500">{sub.description}</p>
                </div>
                <span className="font-bold text-green-600">+{sub.points}</span>
                {selectedSubcategory?.id === sub.id && (
                  <span className="text-green-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSubcategory && (
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">4</span>
            <h2 className="text-lg font-semibold text-gray-900">Add Notes (Optional)</h2>
          </div>

          <textarea
            placeholder="Add any additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
            rows={3}
          />
        </div>
      )}

      {selectedStudent && selectedCategory && selectedSubcategory && (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <span>Award {selectedSubcategory.points} points to {selectedStudent.name}</span>
              <span>→</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
