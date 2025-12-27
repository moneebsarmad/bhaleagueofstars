'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  id: string
  name: string
  href: string
  icon: string
}

type SidebarProps = {
  role: 'student' | 'parent' | 'staff'
  portalLabel: string
}

const studentNavItems: NavItem[] = [
  { id: 'leaderboard', name: 'Leaderboard', href: '/dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'profile', name: 'My Points', href: '/dashboard/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'settings', name: 'Settings', href: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
]

const parentNavItems: NavItem[] = [
  { id: 'leaderboard', name: 'Leaderboard', href: '/dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'child', name: 'Child Profile', href: '/dashboard/child', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { id: 'settings', name: 'Settings', href: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
]

const staffNavItems: NavItem[] = [
  { id: 'leaderboard', name: 'Leaderboard', href: '/dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'students', name: 'Students', href: '/dashboard/students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { id: 'add-points', name: 'Add Points', href: '/dashboard/add-points', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
  { id: 'settings', name: 'Settings', href: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
]

export default function Sidebar({ role, portalLabel }: SidebarProps) {
  const pathname = usePathname()

  const navItems = role === 'staff'
    ? staffNavItems
    : role === 'parent'
      ? parentNavItems
      : studentNavItems

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-gradient-to-b from-[#1a1a2e] to-[#16162a] flex flex-col shadow-2xl z-50">
      {/* Decorative top border */}
      <div className="h-1 bg-gradient-to-r from-[#c9a227] via-[#e8d48b] to-[#c9a227]"></div>

      {/* Logo Section */}
      <div className="p-8 border-b border-white/5">
        <div className="flex items-center gap-4">
          {/* Crest Logo */}
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] flex items-center justify-center shadow-lg">
              <img
                src="/crest.png"
                alt="League of Stars crest"
                className="w-9 h-9 object-contain drop-shadow-sm"
              />
            </div>
            {/* Subtle glow effect */}
            <div className="absolute inset-0 w-14 h-14 rounded-xl bg-[#c9a227] blur-xl opacity-20"></div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              League of Stars
            </h1>
            <p className="text-sm text-[#c9a227]/80 font-medium tracking-wide">{portalLabel}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 overflow-y-auto">
        <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4 px-4">Navigation</p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href))

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#c9a227]/20 to-[#c9a227]/5 text-[#e8d48b] border border-[#c9a227]/20'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#c9a227]/20'
                      : 'bg-white/5 group-hover:bg-white/10'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                  </div>
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#c9a227]"></div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-white/5">
        <div className="px-4 py-3 rounded-xl bg-white/5">
          <p className="text-xs text-white/40 font-medium tracking-wide">
            Brighter Horizon Academy
          </p>
          <p className="text-[10px] text-white/20 mt-1">
            Excellence in Education
          </p>
        </div>
      </div>
    </aside>
  )
}
