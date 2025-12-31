'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Announcement = {
  id: string
  title: string
  body: string
  created_at: string
  created_by: string
  pinned?: boolean | null
  publish_at?: string | null
  expires_at?: string | null
  audience_roles?: string[] | null
}

const seenKey = (userId: string) => `los_announcements_seen_${userId}`

export default function AnnouncementsPopup() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const loadAnnouncements = useCallback(async (currentUserId: string) => {
    const { data } = await supabase
      .from('Announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('publish_at', { ascending: false })

    const now = new Date()
    const active = (data as Announcement[] | null || []).filter((item) => {
      const publishAt = item.publish_at ? new Date(item.publish_at) : null
      const expiresAt = item.expires_at ? new Date(item.expires_at) : null
      const isPublished = !publishAt || publishAt <= now
      const notExpired = !expiresAt || expiresAt > now
      const roles = item.audience_roles || []
      const roleMatch = roles.length === 0 || roles.includes('admin')
      return isPublished && notExpired && roleMatch
    })

    setAnnouncements(active)
    const seenRaw = localStorage.getItem(seenKey(currentUserId))
    const seenIds = seenRaw ? (JSON.parse(seenRaw) as string[]) : []
    const unseen = active.filter((item) => !seenIds.includes(item.id))
    setIsOpen(unseen.length > 0)
  }, [])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) return
      setUserId(authData.user.id)

      await loadAnnouncements(authData.user.id)

      channel = supabase
        .channel('announcements-popup')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'Announcements' },
          () => loadAnnouncements(authData.user.id)
        )
        .subscribe()
    }

    init()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [loadAnnouncements])

  const unseenAnnouncements = useMemo(() => {
    if (!userId) return announcements
    const seenRaw = localStorage.getItem(seenKey(userId))
    const seenIds = seenRaw ? JSON.parse(seenRaw) as string[] : []
    return announcements.filter((item) => !seenIds.includes(item.id))
  }, [announcements, userId])

  const handleDismiss = () => {
    if (!userId) return
    const seenRaw = localStorage.getItem(seenKey(userId))
    const seenIds = seenRaw ? JSON.parse(seenRaw) as string[] : []
    const nextSeen = Array.from(new Set([...seenIds, ...unseenAnnouncements.map((item) => item.id)]))
    localStorage.setItem(seenKey(userId), JSON.stringify(nextSeen))
    setIsOpen(false)
  }

  if (!isOpen || unseenAnnouncements.length === 0) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="regal-card w-full max-w-2xl rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Latest Announcements
          </h3>
          <button
            onClick={handleDismiss}
            className="text-xs font-semibold tracking-wider text-[#1a1a2e]/50 hover:text-[#1a1a2e]"
          >
            Dismiss
          </button>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {unseenAnnouncements.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#c9a227]/20 bg-white/90 px-4 py-3">
              <div className="flex items-center gap-2">
                {item.pinned && <span className="text-xs px-2 py-0.5 rounded-full bg-[#c9a227]/20 text-[#7a5b1a] font-semibold tracking-wider">Pinned</span>}
                <h4 className="text-sm font-semibold text-[#1a1a2e]">{item.title}</h4>
              </div>
              <p className="text-xs text-[#1a1a2e]/60 mt-1">
                {item.created_by} • {new Date(item.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-[#1a1a2e]/70 mt-2 whitespace-pre-wrap">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Link href="/dashboard/announcements" className="text-sm font-semibold text-[#2f0a61] hover:text-[#1a0536]">
            View all announcements →
          </Link>
          <button
            onClick={handleDismiss}
            className="btn-gold px-4 py-2 text-sm font-medium rounded-xl"
          >
            Mark as Read
          </button>
        </div>
      </div>
    </div>
  )
}
