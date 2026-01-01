'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const [user, setUser] = useState<{ email: string; id: string } | null>(null)
  const [profile, setProfile] = useState<{ role: string; assigned_house: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        setLoading(false)
        return
      }

      setUser({ email: authData.user.email || '', id: authData.user.id })

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, assigned_house')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (profileData) {
        setProfile(profileData)
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const formatRole = (role: string) => {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Settings
        </h1>
        <p className="text-[#1a1a2e]/50 text-sm font-medium">Manage your admin account settings.</p>
      </div>

      <div className="grid gap-6">
        {/* Account Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-1">Account</h2>
              <p className="text-sm text-[#1a1a2e]/50">Your admin account information.</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-[#1a1a2e]">{user?.email}</p>
              {profile?.role && (
                <span className="inline-flex items-center gap-2 px-3 py-1 mt-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#c9a227]/15 text-[#9a7b1a]">
                  {formatRole(profile.role)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* House Assignment (for house mentors) */}
        {profile?.assigned_house && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10">
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-1">Assigned House</h2>
            <p className="text-sm text-[#1a1a2e]/50 mb-4">Your house assignment for mentoring.</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-lg font-medium text-[#1a1a2e]">{profile.assigned_house}</span>
            </div>
          </div>
        )}

        {/* Security */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10">
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-1">Security</h2>
          <p className="text-sm text-[#1a1a2e]/50 mb-4">Manage your account security.</p>
          <button
            onClick={async () => {
              await supabase.auth.resetPasswordForEmail(user?.email || '', {
                redirectTo: `${window.location.origin}/update-password`,
              })
              alert('Password reset email sent! Check your inbox.')
            }}
            className="px-4 py-2 bg-[#1a1a2e] text-white rounded-xl text-sm font-medium hover:bg-[#2a2a3e] transition"
          >
            Reset Password
          </button>
        </div>

        {/* Logout */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#c9a227]/10">
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-1">Session</h2>
          <p className="text-sm text-[#1a1a2e]/50 mb-4">Sign out of your admin account.</p>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/'
            }}
            className="px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
