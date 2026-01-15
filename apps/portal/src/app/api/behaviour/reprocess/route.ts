import { NextResponse } from 'next/server'
import { reprocessBehaviourInsights } from '@/backend/services/behaviourRulesEngine'
import { requireRole, RoleSets } from '@/lib/apiAuth'

export async function POST(request: Request) {
  try {
    const auth = await requireRole(RoleSets.superAdmin)
    if (auth.error) {
      return auth.error
    }

    const body = (await request.json().catch(() => ({}))) as { student_ids?: string[] }
    const studentIds = Array.isArray(body.student_ids) ? body.student_ids : []
    const result = await reprocessBehaviourInsights(studentIds)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
