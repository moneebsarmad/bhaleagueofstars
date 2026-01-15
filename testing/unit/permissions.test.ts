import { describe, expect, it, vi } from 'vitest'
import {
  getUserHouse,
  getUserPermissions,
  getUserProfile,
  getUserRole,
  hasPermission,
} from '../../apps/portal/src/lib/permissions'

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  rpc: vi.fn(),
  from: vi.fn(),
} as any

describe('permissions helpers', () => {
  it('returns false when user is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } })
    const result = await hasPermission(mockSupabase, 'points.award')
    expect(result).toBe(false)
  })

  it('checks permission via rpc', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } } })
    mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })
    const result = await hasPermission(mockSupabase, 'points.award')
    expect(result).toBe(true)
  })

  it('loads role via rpc', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } } })
    mockSupabase.rpc.mockResolvedValueOnce({ data: 'admin', error: null })
    const role = await getUserRole(mockSupabase)
    expect(role).toBe('admin')
  })

  it('loads house via rpc', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } } })
    mockSupabase.rpc.mockResolvedValueOnce({ data: 'House of Abu Bakr', error: null })
    const house = await getUserHouse(mockSupabase)
    expect(house).toBe('House of Abu Bakr')
  })

  it('loads permissions via rpc', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } } })
    mockSupabase.rpc.mockResolvedValueOnce({ data: [{ permission_name: 'points.award', description: '', category: 'points' }], error: null })
    const permissions = await getUserPermissions(mockSupabase)
    expect(permissions).toHaveLength(1)
    expect(permissions[0].permission_name).toBe('points.award')
  })

  it('loads profile via table query', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } } })
    const eq = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({ data: { id: 'user-1', role: 'admin' }, error: null })
    mockSupabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq, single }) })

    const profile = await getUserProfile(mockSupabase)
    expect(profile?.role).toBe('admin')
  })
})
