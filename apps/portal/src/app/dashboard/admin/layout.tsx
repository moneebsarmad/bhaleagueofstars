'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../providers'
import { supabase } from '@/lib/supabaseClient'
import CrestLoader from '@/components/CrestLoader'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const adminRoles = ['admin', 'super_admin']

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace('/')
      return
    }

    const checkAdmin = async () => {
      const { data, error } = await supabase.rpc('get_user_role', { user_id: user.id })

      if (error || !data || !adminRoles.includes(String(data))) {
        setIsAdmin(false)
        setChecking(false)
        router.replace('/dashboard')
        return
      }

      setIsAdmin(true)
      setChecking(false)
    }

    checkAdmin()
  }, [loading, user, router])

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-[#faf9f7] pattern-overlay">
        <CrestLoader label="Checking admin access..." />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <>
      {children}
    </>
  )
}
