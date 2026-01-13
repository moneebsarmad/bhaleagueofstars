import { NextResponse } from 'next/server'
import { reprocessBehaviourInsights } from '@/backend/services/behaviourRulesEngine'

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { student_ids?: string[] }
    const studentIds = Array.isArray(body.student_ids) ? body.student_ids : []
    const result = await reprocessBehaviourInsights(studentIds)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
