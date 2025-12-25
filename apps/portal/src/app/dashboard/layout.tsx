'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { supabase } from '../../lib/supabaseClient'
import Sidebar from '../../components/Sidebar'
import DashboardHeader from '../../components/DashboardHeader'

type Role = 'student' | 'parent' | 'staff'

function formatDisplayName(email: string) {
  if (!email) return 'User'
  const localPart = email.split('@')[0] ?? ''
  const parts = localPart
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return email
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function portalLabel(role: Role) {
  switch (role) {
    case 'student':
      return 'Student Portal'
    case 'parent':
      return 'Parent Portal'
    case 'staff':
      return 'Staff Portal'
    default:
      return 'Portal'
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [role, setRole] = useState<Role | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [staffName, setStaffName] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return

    const loadProfile = async () => {
      setProfileLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        setRole(null)
      } else {
        setRole((data?.role as Role) ?? null)
      }
      setProfileLoading(false)
    }

    loadProfile()
  }, [user])

  useEffect(() => {
    if (!user?.email) return
    const loadStaffName = async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('staff_name')
        .eq('email', user.email)
        .maybeSingle()

      if (error) {
        setStaffName(null)
        return
      }

      setStaffName(data ? String(data.staff_name ?? '') : null)
    }

    loadStaffName()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] pattern-overlay flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Loading session...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] pattern-overlay flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-[#faf9f7] pattern-overlay flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#910000] to-[#5a0000] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-[#1a1a2e] font-medium mb-2">Profile role not found</p>
          <p className="text-[#1a1a2e]/50 text-sm">Please contact an administrator.</p>
        </div>
      </div>
    )
  }

  const displayName = staffName || formatDisplayName(user.email ?? '')

  return (
    <div className="min-h-screen bg-[#faf9f7] pattern-overlay">
      <Sidebar role={role} portalLabel={portalLabel(role)} />

      {/* Main Content */}
      <div className="ml-72">
        {/* Header */}
        <DashboardHeader userName={displayName} role={role} />

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
