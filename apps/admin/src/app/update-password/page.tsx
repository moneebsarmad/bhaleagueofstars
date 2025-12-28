'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CrestLoader from '@/components/CrestLoader'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const ensureSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setError('Open the password reset link from your email to continue.')
      }
    }

    ensureSession()
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setIsLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }

      setMessage('Password updated. You can sign in now.')
      setTimeout(() => {
        router.push('/')
      }, 1200)
    } catch (err) {
      console.error('Update error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <CrestLoader label="Updating password..." />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16162a] to-[#0f0f1a] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 opacity-5">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path fill="#c9a227" d="M100,10 L120,80 L190,80 L130,120 L150,190 L100,150 L50,190 L70,120 L10,80 L80,80 Z" />
          </svg>
        </div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#2f0a61] rounded-full blur-[128px] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="h-1 bg-gradient-to-r from-transparent via-[#c9a227] to-transparent mb-8"></div>

        <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-8 pb-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              Update Password
            </h1>
            <p className="text-white/50 text-sm font-medium tracking-wide">
              Choose a new password
            </p>
          </div>

          <div className="mx-8 h-px bg-gradient-to-r from-transparent via-[#c9a227]/30 to-transparent"></div>

          <form onSubmit={handleUpdate} className="p-8 pt-6">
            <div className="mb-6">
              <label htmlFor="password" className="block text-xs font-semibold text-white/40 mb-2 tracking-wider">
                New Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-[#c9a227]/50 focus:ring-2 focus:ring-[#c9a227]/20 outline-none transition-all"
                placeholder="Enter a new password"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-white/40 mb-2 tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-[#c9a227]/50 focus:ring-2 focus:ring-[#c9a227]/20 outline-none transition-all"
                placeholder="Re-enter your password"
                required
              />
            </div>

            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-5 py-4 rounded-xl text-sm font-medium">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #4a1a8a 0%, #2f0a61 50%, #1a0536 100%)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#c9a227]/0 via-[#c9a227]/20 to-[#c9a227]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="relative">
                {isLoading ? 'Updating...' : 'Update password'}
              </span>
            </button>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-xs font-semibold text-white/50 hover:text-white transition-colors tracking-wide"
              >
                Back to sign in
              </button>
            </div>
          </form>
        </div>

        <div className="h-1 bg-gradient-to-r from-transparent via-[#c9a227] to-transparent mt-8"></div>
      </div>
    </div>
  )
}
