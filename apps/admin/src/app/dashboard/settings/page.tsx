'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

function RoleBadge({ role }: { role: string }) {
  const formatRole = (r: string) => r.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#c9a227]/15 text-[#9a7b1a]">
      {formatRole(role)}
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

const sections: SettingsSection[] = [
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

export default function SettingsPage() {
  const [user, setUser] = useState<{ email: string; id: string } | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        setLoading(false)
        return
      }

      setUser({ email: authData.user.email || '', id: authData.user.id })

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (profileData?.role) {
        setRole(profileData.role)
      }

      // Load saved settings
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', authData.user.id)
        .maybeSingle()

      if (settingsData?.settings) {
        setToggles(settingsData.settings as Record<string, boolean>)
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const handleToggle = async (key: string) => {
    const newToggles = { ...toggles, [key]: !toggles[key] }
    setToggles(newToggles)

    // Save to database
    setSaving(true)
    await supabase
      .from('user_settings')
      .upsert({
        user_id: user?.id,
        settings: newToggles,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    setSaving(false)
  }

  const handleResetPassword = async () => {
    if (!user?.email) return
    setResetting(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (error) {
        alert('Error sending reset email: ' + error.message)
      } else {
        alert('Password reset email sent! Check your inbox.')
      }
    } catch (err) {
      alert('Failed to send reset email')
    }
    setResetting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9a227]"></div>
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
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Manage your admin preferences.</p>
        </div>
        {role && <RoleBadge role={role} />}
      </div>

      <div className="grid gap-6">
        {/* Account */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-1">Account</h2>
              <p className="text-sm text-[#1a1a2e]/50">Basic profile information for this portal.</p>
            </div>
            <div className="text-sm text-[#1a1a2e]/70 text-right">
              <p className="font-semibold text-[#1a1a2e]">{user?.email}</p>
              <p className="text-xs text-[#1a1a2e]/45 mt-1">Role: {role}</p>
            </div>
          </div>
        </div>

        {/* Toggle Sections */}
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
                  onToggle={() => handleToggle(option.key)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Security */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10">
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-1">Security</h2>
          <p className="text-sm text-[#1a1a2e]/50 mb-4">Manage your account security.</p>
          <button
            onClick={handleResetPassword}
            disabled={resetting}
            className="px-4 py-2 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a3e] transition disabled:opacity-50"
          >
            {resetting ? 'Sending...' : 'Reset Password'}
          </button>
        </div>
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-[#1a1a2e] text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg">
          Saving...
        </div>
      )}
    </div>
  )
}
