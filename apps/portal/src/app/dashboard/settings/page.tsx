'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase } from '../../../lib/supabaseClient'

type Role = 'student' | 'parent' | 'staff'

type ToggleOption = {
  key: string
  label: string
  helper?: string
}

type SettingsSection = {
  title: string
  description: string
  options: ToggleOption[]
}

function RoleBadge({ role }: { role: Role }) {
  const label = role === 'staff' ? 'Staff Portal' : role === 'parent' ? 'Parent Portal' : 'Student Portal'
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#c9a227]/15 text-[#9a7b1a]">
      {label}
    </span>
  )
}

function ToggleRow({
  label,
  helper,
  enabled,
  onToggle,
}: {
  label: string
  helper?: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <p className="text-sm font-medium text-[#1a1a2e]">{label}</p>
        {helper ? (
          <p className="text-xs text-[#1a1a2e]/45 mt-1">{helper}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-[#c9a227]' : 'bg-[#1a1a2e]/15'}`}
        aria-pressed={enabled}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggles, setToggles] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!user) return

    const loadRole = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        setRole('student')
      } else {
        setRole((data?.role as Role) ?? 'student')
      }
      setLoading(false)
    }

    loadRole()
  }, [user])

  const sections = useMemo<SettingsSection[]>(() => {
    if (!role) return []

    if (role === 'staff') {
      return [
        {
          title: 'Notifications',
          description: 'Control staff updates and point alerts.',
          options: [
            { key: 'staff_daily_digest', label: 'Daily merit digest', helper: 'Get a summary of points awarded each day.' },
            { key: 'staff_student_changes', label: 'Student activity alerts', helper: 'Be notified when new merit points are logged.' },
          ],
        },
        {
          title: 'Classroom Tools',
          description: 'Keep quick actions close at hand.',
          options: [
            { key: 'staff_quick_add', label: 'Enable quick-add panel', helper: 'Show fast student search when awarding points.' },
            { key: 'staff_recent_filters', label: 'Remember last category', helper: 'Keep your last selection for faster entry.' },
          ],
        },
      ]
    }

    if (role === 'parent') {
      return [
        {
          title: 'Family Updates',
          description: 'Choose how often you receive student updates.',
          options: [
            { key: 'parent_weekly_digest', label: 'Weekly summary email', helper: 'Receive a recap every Friday.' },
            { key: 'parent_points_alerts', label: 'Points awarded alerts', helper: 'Get notified when new points are added.' },
          ],
        },
        {
          title: 'Privacy',
          description: 'Manage how your child appears on leaderboards.',
          options: [
            { key: 'parent_hide_full_name', label: 'Hide full name', helper: 'Show initials only on public boards.' },
          ],
        },
      ]
    }

    return [
      {
        title: 'Progress Updates',
        description: 'Stay on top of your points and milestones.',
        options: [
          { key: 'student_weekly_summary', label: 'Weekly progress summary', helper: 'Get a weekly recap of your points.' },
          { key: 'student_badge_alerts', label: 'Badge reminders', helper: 'Be notified when you are close to a badge.' },
        ],
      },
      {
        title: 'Privacy',
        description: 'Control how you appear to others.',
        options: [
          { key: 'student_hide_full_name', label: 'Show initials only', helper: 'Use initials on public leaderboards.' },
        ],
      },
    ]
  }, [role])

  useEffect(() => {
    if (!role) return
    const defaults: Record<string, boolean> = {}
    sections.forEach((section) => {
      section.options.forEach((option) => {
        defaults[option.key] = toggles[option.key] ?? false
      })
    })
    setToggles((prev) => ({ ...defaults, ...prev }))
  }, [role, sections])

  if (loading || !role) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Settings
          </h1>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Manage your portal preferences.</p>
        </div>
        <RoleBadge role={role} />
      </div>

      <div className="grid gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-1">Account</h2>
              <p className="text-sm text-[#1a1a2e]/50">Basic profile information for this portal.</p>
            </div>
            <div className="text-sm text-[#1a1a2e]/70">
              <p className="font-semibold text-[#1a1a2e]">{user?.email}</p>
              <p className="text-xs text-[#1a1a2e]/45 mt-1">Role: {role}</p>
            </div>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#1a1a2e]">{section.title}</h2>
              <p className="text-sm text-[#1a1a2e]/50">{section.description}</p>
            </div>
            <div className="space-y-4">
              {section.options.map((option) => (
                <ToggleRow
                  key={option.key}
                  label={option.label}
                  helper={option.helper}
                  enabled={Boolean(toggles[option.key])}
                  onToggle={() =>
                    setToggles((prev) => ({
                      ...prev,
                      [option.key]: !prev[option.key],
                    }))
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
