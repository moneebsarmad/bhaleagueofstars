'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CrestLoader from '@/components/CrestLoader'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setIsLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <CrestLoader label="Signing in..." />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#faf9f7] via-[#f8f6f3] to-[#f5f3ef] relative overflow-hidden pattern-overlay">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large star decoration */}
        <div className="absolute -top-20 -right-20 w-96 h-96 opacity-[0.06]">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path fill="#c9a227" d="M100,10 L120,80 L190,80 L130,120 L150,190 L100,150 L50,190 L70,120 L10,80 L80,80 Z" />
          </svg>
        </div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 opacity-[0.06]">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path fill="#c9a227" d="M100,10 L120,80 L190,80 L130,120 L150,190 L100,150 L50,190 L70,120 L10,80 L80,80 Z" />
          </svg>
        </div>
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#2f0a61] rounded-full blur-[128px] opacity-[0.06]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#c9a227] rounded-full blur-[128px] opacity-[0.08]"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Top gold line */}
        <div className="h-1 bg-gradient-to-r from-transparent via-[#c9a227] to-transparent mb-8"></div>

        <div className="regal-card rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-6 text-center">
            {/* Logo */}
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#c9a227] to-[#9a7b1a] flex items-center justify-center shadow-xl">
                <svg className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 w-20 h-20 rounded-2xl bg-[#c9a227] blur-2xl opacity-20"></div>
            </div>

            <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              League of Stars
            </h1>
            <p className="text-[#1a1a2e]/50 text-sm font-medium tracking-wide">Admin Portal</p>
          </div>

          {/* Divider */}
          <div className="mx-8 h-px bg-gradient-to-r from-transparent via-[#c9a227]/40 to-transparent"></div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 pt-6">
            <div className="mb-6">
              <label htmlFor="email" className="block text-xs font-semibold text-[#1a1a2e]/50 mb-2 tracking-wider">
                Admin Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-[#1a1a2e]/10 rounded-xl text-[#1a1a2e] placeholder-[#1a1a2e]/30 focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20 outline-none transition-all"
                placeholder="Enter your admin email"
                required
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password" className="block text-xs font-semibold text-[#1a1a2e]/50 mb-2 tracking-wider">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-[#1a1a2e]/10 rounded-xl text-[#1a1a2e] placeholder-[#1a1a2e]/30 focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20 outline-none transition-all"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div className="mb-6 bg-[#910000]/5 border border-[#910000]/20 text-[#910000] px-5 py-4 rounded-xl text-sm font-medium">
                {error}
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
              {/* Hover effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#c9a227]/0 via-[#c9a227]/20 to-[#c9a227]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="relative">
                {isLoading ? 'Signing in...' : 'Sign In'}
              </span>
            </button>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => router.push('/reset-password')}
                className="text-xs font-semibold text-[#2f0a61] hover:text-[#c9a227] transition-colors tracking-wide"
              >
                Forgot password?
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1a2e]/5 border border-[#1a1a2e]/5">
                <div className="w-2 h-2 rounded-full bg-[#c9a227]"></div>
                <p className="text-[#1a1a2e]/40 text-xs font-medium tracking-wide">
                  Brighter Horizon Academy
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom gold line */}
        <div className="h-1 bg-gradient-to-r from-transparent via-[#c9a227] to-transparent mt-8"></div>
      </div>
    </div>
  )
}
