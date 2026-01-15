import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../apps/portal/src/lib/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
  },
}))

describe('usePermissions hooks', () => {
  it('resolves role from rpc', async () => {
    const { supabase } = await import('../../apps/portal/src/lib/supabaseClient')
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    supabase.rpc.mockResolvedValue({ data: 'admin', error: null })

    const { useUserRole } = await import('../../apps/portal/src/hooks/usePermissions')
    const { result } = renderHook(() => useUserRole())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBe('admin')
  })

  it('checks permission via rpc', async () => {
    const { supabase } = await import('../../apps/portal/src/lib/supabaseClient')
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-2' } } })
    supabase.rpc.mockResolvedValue({ data: true, error: null })

    const { usePermission } = await import('../../apps/portal/src/hooks/usePermissions')
    const { result } = renderHook(() => usePermission('points.award'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasPermission).toBe(true)
  })
})
