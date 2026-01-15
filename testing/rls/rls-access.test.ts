// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getAccessToken } from '../helpers/auth'
import { getAuthedClient } from '../helpers/supabase'

describe('RLS access checks', () => {
  it('student cannot read students table', async () => {
    const token = await getAccessToken('student')
    const client = getAuthedClient(token)
    const { data, error } = await client.from('students').select('*')
    expect(error || (data || []).length === 0).toBeTruthy()
  })

  it('student cannot read staff table', async () => {
    const token = await getAccessToken('student')
    const client = getAuthedClient(token)
    const { data, error } = await client.from('staff').select('*')
    expect(error || (data || []).length === 0).toBeTruthy()
  })

  it('admin can read students table', async () => {
    const token = await getAccessToken('admin')
    const client = getAuthedClient(token)
    const { data, error } = await client.from('students').select('*')
    expect(error).toBeNull()
    expect((data || []).length).toBeGreaterThan(0)
  })

  it('student can only see own profile', async () => {
    const token = await getAccessToken('student')
    const client = getAuthedClient(token)
    const { data, error } = await client.from('profiles').select('id')
    expect(error).toBeNull()
    expect(data?.length).toBe(1)
  })

  it('admin can read multiple profiles', async () => {
    const token = await getAccessToken('admin')
    const client = getAuthedClient(token)
    const { data, error } = await client.from('profiles').select('id')
    expect(error).toBeNull()
    expect((data || []).length).toBeGreaterThan(1)
  })

  it('parent can only see own profile', async () => {
    const token = await getAccessToken('parent')
    const client = getAuthedClient(token)
    const { data, error } = await client.from('profiles').select('id')
    expect(error).toBeNull()
    expect(data?.length).toBe(1)
  })

  it('parent cannot read students table', async () => {
    const token = await getAccessToken('parent')
    const client = getAuthedClient(token)
    const { data, error } = await client.from('students').select('*')
    expect(error || (data || []).length === 0).toBeTruthy()
  })

  it('house mentor cannot read other house students', async () => {
    const token = await getAccessToken('house_mentor')
    const client = getAuthedClient(token)
    const { data, error } = await client
      .from('students')
      .select('*')
      .eq('house', 'House of Umar')
    expect(error || (data || []).length === 0).toBeTruthy()
  })

  it('house mentor can read assigned house students', async () => {
    const token = await getAccessToken('house_mentor')
    const client = getAuthedClient(token)
    const { data, error } = await client
      .from('students')
      .select('*')
      .eq('house', 'House of Abu Bakr')
    expect(error).toBeNull()
    expect((data || []).length).toBeGreaterThan(0)
  })

  it('teacher can insert merit_log (points.award)', async () => {
    const token = await getAccessToken('teacher')
    const client = getAuthedClient(token)
    const { error } = await client.from('merit_log').insert([
      {
        timestamp: new Date().toISOString(),
        date_of_event: '2026-01-10',
        student_name: 'Ali Hassan',
        grade: 6,
        section: 'A',
        house: 'House of Abu Bakr',
        r: 'Respect',
        subcategory: 'Polite Language & Manners',
        points: 5,
        notes: 'RLS test insert',
        staff_name: 'Teacher User',
      },
    ])
    expect(error).toBeNull()
  })

  it('student cannot insert merit_log', async () => {
    const token = await getAccessToken('student')
    const client = getAuthedClient(token)
    const { error } = await client.from('merit_log').insert([
      {
        timestamp: new Date().toISOString(),
        date_of_event: '2026-01-10',
        student_name: 'Ali Hassan',
        grade: 6,
        section: 'A',
        house: 'House of Abu Bakr',
        r: 'Respect',
        subcategory: 'Polite Language & Manners',
        points: 5,
        notes: 'Should fail',
        staff_name: 'Student User',
      },
    ])
    expect(error).not.toBeNull()
  })

  it('admin can read merit_log', async () => {
    const token = await getAccessToken('admin')
    const client = getAuthedClient(token)
    const { data, error } = await client.from('merit_log').select('*')
    expect(error).toBeNull()
    expect((data || []).length).toBeGreaterThan(0)
  })

  it('non-admin cannot read audit_logs', async () => {
    const token = await getAccessToken('teacher')
    const client = getAuthedClient(token)
    const { data, error } = await client.from('audit_logs').select('*')
    expect(error || (data || []).length === 0).toBeTruthy()
  })

  it('non-admin cannot read admins table', async () => {
    const token = await getAccessToken('teacher')
    const client = getAuthedClient(token)
    const { data, error } = await client.from('admins').select('*')
    expect(error || (data || []).length === 0).toBeTruthy()
  })
})
