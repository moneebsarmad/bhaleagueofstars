import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole, RoleSets } from '@/lib/apiAuth'

type StudentPayload = {
  name: string
  grade: number
  section: string
  house: string
}

type AwardPayload =
  | {
      mode: 'students'
      categoryId: string
      students: StudentPayload[]
      notes?: string
      eventDate?: string
    }
  | {
      mode: 'house_competition'
      house: string
      points: number
      notes?: string
      eventDate?: string
    }

const resolveStaffName = async (supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string, email: string) => {
  if (email) {
    const { data: staff } = await supabase
      .from('staff')
      .select('staff_name')
      .ilike('email', email)
      .maybeSingle()

    const staffValue = String(staff?.staff_name ?? '').trim()
    if (staffValue) return staffValue
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, name, staff_name')
    .eq('id', userId)
    .maybeSingle()

  const profileValue = String(profile?.full_name ?? profile?.name ?? profile?.staff_name ?? '').trim()
  if (profileValue) return profileValue

  if (email) return email
  return userId ? `Staff ${userId.slice(0, 8)}` : ''
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const payload = (await request.json()) as AwardPayload
    if (!payload?.mode) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
    }

    if (payload.mode === 'house_competition') {
      const auth = await requireRole(RoleSets.superAdmin)
      if (auth.error) return auth.error

      if (!payload.house || !payload.points || payload.points <= 0) {
        return NextResponse.json({ error: 'House and points are required.' }, { status: 400 })
      }

      const staffName = await resolveStaffName(supabase, user.id, user.email ?? '')
      if (!staffName) {
        return NextResponse.json({ error: 'Unable to resolve staff name.' }, { status: 400 })
      }

      const { error } = await supabase.from('merit_log').insert([
        {
          timestamp: new Date().toISOString(),
          date_of_event: payload.eventDate || new Date().toISOString().split('T')[0],
          student_name: '',
          grade: null,
          section: null,
          house: payload.house,
          r: 'House Competition',
          subcategory: 'House Competition',
          points: payload.points,
          notes: payload.notes || '',
          staff_name: staffName,
        },
      ])

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ inserted: 1 })
    }

    if (!payload.categoryId || !Array.isArray(payload.students) || payload.students.length === 0) {
      return NextResponse.json({ error: 'Students and category are required.' }, { status: 400 })
    }

    const { data: category, error: categoryError } = await supabase
      .from('3r_categories')
      .select('id, r, subcategory, points')
      .eq('id', payload.categoryId)
      .maybeSingle()

    if (categoryError || !category) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    }

    const staffName = await resolveStaffName(supabase, user.id, user.email ?? '')
    if (!staffName) {
      return NextResponse.json({ error: 'Unable to resolve staff name.' }, { status: 400 })
    }

    const { data: permissionResult, error: permissionError } = await supabase.rpc('has_permission', {
      user_id: user.id,
      perm: 'points.award',
    })

    if (permissionError || !permissionResult) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const entries = payload.students.map((student) => ({
      timestamp: new Date().toISOString(),
      date_of_event: payload.eventDate || new Date().toISOString().split('T')[0],
      student_name: student.name,
      grade: student.grade,
      section: student.section,
      house: student.house,
      r: category.r,
      subcategory: category.subcategory,
      points: category.points,
      notes: payload.notes || '',
      staff_name: staffName,
    }))

    const { error } = await supabase.from('merit_log').insert(entries)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ inserted: entries.length })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
