'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../providers'
import { supabase } from '@/lib/supabaseClient'
import { Tables } from '@/lib/supabase/tables'
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

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace('/')
      return
    }

    const checkAdmin = async () => {
      const { data, error } = await supabase
        .from(Tables.admins)
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (error || !data) {
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
