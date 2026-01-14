'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import CrestLoader from '@/components/CrestLoader'
import { getHouseNames } from '@/lib/school.config'
import { useSessionStorageState } from '@/hooks/useSessionStorageState'

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
  audience_houses?: string[] | null
  audience_grades?: number[] | null
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [title, setTitle] = useSessionStorageState('admin:announcements:title', '')
  const [body, setBody] = useSessionStorageState('admin:announcements:body', '')
  const [pinned, setPinned] = useSessionStorageState('admin:announcements:pinned', false)
  const [publishAt, setPublishAt] = useSessionStorageState('admin:announcements:publishAt', '')
  const [expiresAt, setExpiresAt] = useSessionStorageState('admin:announcements:expiresAt', '')
  const [roles, setRoles] = useSessionStorageState<string[]>('admin:announcements:roles', ['admin'])
  const [houses, setHouses] = useSessionStorageState<string[]>('admin:announcements:houses', [])
  const [grades, setGrades] = useSessionStorageState<number[]>('admin:announcements:grades', [])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLive, setIsLive] = useState(false)

  const houseOptions = getHouseNames()
  const gradeOptions = [6, 7, 8, 9, 10, 11, 12]

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await supabase
        .from('Announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('publish_at', { ascending: false })

      setAnnouncements((data as Announcement[]) || [])
    } catch (error) {
      console.error('Announcements error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
    const channel = supabase
      .channel('announcements-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Announcements' },
        () => fetchAnnouncements()
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAnnouncements])

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) return
    setIsSubmitting(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      const createdBy = authData.user?.email || 'Admin'

      await supabase.from('Announcements').insert([
        {
          title: title.trim(),
          body: body.trim(),
          created_by: createdBy,
          pinned,
          publish_at: publishAt ? new Date(publishAt).toISOString() : null,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          audience_roles: roles.length > 0 ? roles : null,
          audience_houses: houses.length > 0 ? houses : null,
          audience_grades: grades.length > 0 ? grades : null,
        },
      ])

      setTitle('')
      setBody('')
      setPinned(false)
      setPublishAt('')
      setExpiresAt('')
      setRoles(['admin'])
      setHouses([])
      setGrades([])
      fetchAnnouncements()
    } catch (error) {
      console.error('Create announcement error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatus = (announcement: Announcement) => {
    const now = new Date()
    const publishAt = announcement.publish_at ? new Date(announcement.publish_at) : null
    const expiresAt = announcement.expires_at ? new Date(announcement.expires_at) : null
    if (expiresAt && expiresAt <= now) return { label: 'Expired', tone: 'text-rose-600 bg-rose-50 border-rose-200' }
    if (publishAt && publishAt > now) return { label: 'Scheduled', tone: 'text-amber-700 bg-amber-50 border-amber-200' }
    return { label: 'Active', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
  }

  const toggleRole = (role: string) => {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))
  }

  const toggleHouse = (house: string) => {
    setHouses((prev) => (prev.includes(house) ? prev.filter((h) => h !== house) : [...prev, house]))
  }

  const toggleGrade = (grade: number) => {
    setGrades((prev) => (prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]))
  }

  if (isLoading) {
    return <CrestLoader label="Loading announcements..." />
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          Announcements
        </h1>
        <div className="flex items-center gap-3">
          <div className="h-1 w-16 bg-gradient-to-r from-[#c9a227] to-[#e8d48b] rounded-full"></div>
          <p className="text-[#1a1a2e]/50 text-sm font-medium">Share updates with staff and students</p>
          <div className={`ml-auto flex items-center gap-2 text-xs font-semibold tracking-widest px-3 py-1 rounded-full border ${
            isLive
              ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
              : 'text-amber-700 border-amber-200 bg-amber-50'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {isLive ? 'Live Updates' : 'Connecting'}
          </div>
        </div>
      </div>

      <div className="regal-card rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
          New Announcement
        </h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-2 tracking-wider">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="regal-input w-full px-4 py-3 rounded-xl text-sm"
              placeholder="Weekly house champions, events, reminders..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-2 tracking-wider">
              Message
            </label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="regal-input w-full px-4 py-3 rounded-xl text-sm h-32"
              placeholder="Write the announcement..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-2 tracking-wider">
                Publish At
              </label>
              <input
                type="datetime-local"
                value={publishAt}
                onChange={(event) => setPublishAt(event.target.value)}
                className="regal-input w-full px-4 py-3 rounded-xl text-sm"
              />
              <p className="text-xs text-[#1a1a2e]/40 mt-1">Leave empty to publish immediately.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-2 tracking-wider">
                Expires At
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="regal-input w-full px-4 py-3 rounded-xl text-sm"
              />
              <p className="text-xs text-[#1a1a2e]/40 mt-1">Optional. Leave empty for no expiry.</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-2 tracking-wider">
              Audience Roles
            </label>
            <div className="flex flex-wrap gap-2">
              {['admin', 'staff'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    roles.includes(role)
                      ? 'bg-[#c9a227]/20 border-[#c9a227]/50 text-[#7a5b1a]'
                      : 'border-[#c9a227]/20 text-[#1a1a2e]/50 hover:border-[#c9a227]/50'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#1a1a2e]/40 mt-1">Leave empty to show to all roles.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-2 tracking-wider">
              Target Houses
            </label>
            <div className="flex flex-wrap gap-2">
              {houseOptions.map((house) => (
                <button
                  key={house}
                  type="button"
                  onClick={() => toggleHouse(house)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    houses.includes(house)
                      ? 'bg-[#2f0a61]/10 border-[#2f0a61]/40 text-[#2f0a61]'
                      : 'border-[#c9a227]/20 text-[#1a1a2e]/50 hover:border-[#c9a227]/50'
                  }`}
                >
                  {house.replace('House of ', '')}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#1a1a2e]/40 mt-1">Leave empty to show to all houses.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1a1a2e]/40 mb-2 tracking-wider">
              Target Grades
            </label>
            <div className="flex flex-wrap gap-2">
              {gradeOptions.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => toggleGrade(grade)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    grades.includes(grade)
                      ? 'bg-[#055437]/10 border-[#055437]/40 text-[#055437]'
                      : 'border-[#c9a227]/20 text-[#1a1a2e]/50 hover:border-[#c9a227]/50'
                  }`}
                >
                  Grade {grade}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#1a1a2e]/40 mt-1">Leave empty to show to all grades.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPinned((prev) => !prev)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                pinned
                  ? 'bg-[#c9a227]/20 border-[#c9a227]/50 text-[#7a5b1a]'
                  : 'border-[#c9a227]/20 text-[#1a1a2e]/50 hover:border-[#c9a227]/50'
              }`}
            >
              {pinned ? 'Pinned' : 'Pin announcement'}
            </button>
          </div>
          <button
            onClick={handleCreate}
            disabled={isSubmitting || !title.trim() || !body.trim()}
            className="btn-gold px-5 py-2.5 text-sm font-medium rounded-xl disabled:opacity-60"
          >
            {isSubmitting ? 'Posting...' : 'Post Announcement'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="regal-card rounded-2xl p-6 text-[#1a1a2e]/40 text-sm">
            No announcements yet.
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="regal-card rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                    {announcement.title}
                  </h3>
                  <p className="text-xs text-[#1a1a2e]/40 mt-1">
                    {announcement.created_by} • {new Date(announcement.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {announcement.pinned && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#c9a227]/20 text-[#7a5b1a] font-semibold tracking-wider">
                      Pinned
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold tracking-wider ${getStatus(announcement).tone}`}>
                    {getStatus(announcement).label}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm text-[#1a1a2e]/70 whitespace-pre-wrap">
                {announcement.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#1a1a2e]/50">
                {announcement.publish_at && (
                  <span>Publishes: {new Date(announcement.publish_at).toLocaleString()}</span>
                )}
                {announcement.expires_at && (
                  <span>Expires: {new Date(announcement.expires_at).toLocaleString()}</span>
                )}
                {announcement.audience_roles && announcement.audience_roles.length > 0 && (
                  <span>Roles: {announcement.audience_roles.join(', ')}</span>
                )}
                {announcement.audience_houses && announcement.audience_houses.length > 0 && (
                  <span>Houses: {announcement.audience_houses.map((h) => h.replace('House of ', '')).join(', ')}</span>
                )}
                {announcement.audience_grades && announcement.audience_grades.length > 0 && (
                  <span>Grades: {announcement.audience_grades.map((g) => `Grade ${g}`).join(', ')}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
