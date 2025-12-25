'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '../app/providers'

type DashboardHeaderProps = {
  userName: string
  role: 'student' | 'parent' | 'staff'
}

function roleLabel(role: 'student' | 'parent' | 'staff') {
  switch (role) {
    case 'student':
      return 'Student'
    case 'parent':
      return 'Parent'
    case 'staff':
      return 'Staff'
    default:
      return 'User'
  }
}

function initials(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return ''
  const parts = trimmed.split(/\s+/).slice(0, 2)
  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

export default function DashboardHeader({ userName, role }: DashboardHeaderProps) {
  const router = useRouter()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-[#c9a227]/10 sticky top-0 z-10">
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#c9a227]"></div>
          <span className="text-sm text-[#1a1a2e]/50 font-medium">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2f0a61] to-[#1a0536] flex items-center justify-center text-white text-sm font-semibold shadow-md">
              {initials(userName)}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a1a2e]">{userName}</p>
              <p className="text-xs text-[#1a1a2e]/40">{roleLabel(role)}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-[#1a1a2e]/10"></div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-[#1a1a2e]/50 hover:text-[#910000] font-medium transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
