'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CrestLoader from '@/components/admin/CrestLoader'
import { schoolConfig } from '@/lib/school.config'

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

      router.push('/admin/dashboard')
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
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-star auth-star-top">
          <svg viewBox="0 0 200 200">
            <path d="M100,10 L120,80 L190,80 L130,120 L150,190 L100,150 L50,190 L70,120 L10,80 L80,80 Z" />
          </svg>
        </div>
        <div className="auth-star auth-star-bottom">
          <svg viewBox="0 0 200 200">
            <path d="M100,10 L120,80 L190,80 L130,120 L150,190 L100,150 L50,190 L70,120 L10,80 L80,80 Z" />
          </svg>
        </div>
        <div className="auth-orb auth-orb-purple"></div>
        <div className="auth-orb auth-orb-gold"></div>
      </div>

      <div className="auth-shell">
        <div className="auth-line"></div>
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="auth-logo-inner">
                <img src={schoolConfig.crestLogo} alt={`${schoolConfig.systemName} crest`} />
              </div>
              <span className="auth-logo-glow"></span>
            </div>
            <h1>{schoolConfig.systemName}</h1>
            <p>Admin Portal</p>
          </div>

          <div className="auth-divider"></div>

          <form className="auth-form" onSubmit={handleLogin}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <div className="auth-error">{error}</div>}

            <button
              className="auth-submit"
              type="submit"
              disabled={isLoading || !email || !password}
            >
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="auth-forgot">
            <button type="button" onClick={() => router.push('/admin/reset-password')}>
              Forgot password?
            </button>
          </div>

          <div className="auth-footer">
            <span className="auth-dot"></span>
            {schoolConfig.schoolName}
          </div>
        </div>
        <div className="auth-line"></div>
      </div>
    </div>
  )
}
