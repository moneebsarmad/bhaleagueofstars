'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { supabase } from '../../lib/supabaseClient'
import Sidebar from '../../components/Sidebar'
import DashboardHeader from '../../components/DashboardHeader'
import CrestLoader from '../../components/CrestLoader'
import MobileNav from '@/components/MobileNav'

type Role = 'student' | 'parent' | 'staff'

// RBAC roles that map to 'staff' portal access
const STAFF_ROLES = ['staff', 'super_admin', 'admin', 'house_mentor', 'teacher', 'support_staff']
const ADMIN_ROLES = ['super_admin', 'admin']

function mapRoleToPortalRole(dbRole: string | null): Role | null {
  if (!dbRole) return null
  if (dbRole === 'student') return 'student'
  if (dbRole === 'parent') return 'parent'
  if (STAFF_ROLES.includes(dbRole)) return 'staff'
  return null
}

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
  const [isAdmin, setIsAdmin] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
        setIsAdmin(false)
      } else {
        const dbRole = data?.role ?? null
        setRole(mapRoleToPortalRole(dbRole))
        setIsAdmin(dbRole ? ADMIN_ROLES.includes(dbRole) : false)
      }
      setProfileLoading(false)
    }

    loadProfile()
  }, [user])

  useEffect(() => {
    const email = user?.email ?? ''
    if (!email) return
    const loadStaffName = async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('staff_name')
        .ilike('email', email)
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
      <div className="min-h-screen bg-[#faf9f7] pattern-overlay">
        <CrestLoader label="Loading session..." />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] pattern-overlay">
        <CrestLoader label="Loading profile..." />
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
      <div className="hidden md:block">
        <Sidebar role={role} portalLabel={portalLabel(role)} showAdmin={isAdmin} />
      </div>
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        role={role}
        portalLabel={portalLabel(role)}
        showAdmin={isAdmin}
      />

      {/* Main Content */}
      <div className="md:ml-72">
        {/* Header */}
        <DashboardHeader
          userName={displayName}
          role={role}
          showMenuButton
          onMenuClick={() => setMobileNavOpen(true)}
        />

        {/* Page Content */}
        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
