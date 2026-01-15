import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

describe('PermissionGate', () => {
  it('renders children when permission is granted', async () => {
    vi.resetModules()
    vi.doMock('../../apps/portal/src/hooks/usePermissions', () => ({
      usePermission: () => ({ hasPermission: true, loading: false }),
      useUserRole: () => ({ role: 'admin', loading: false }),
    }))

    const { PermissionGate } = await import('../../apps/portal/src/components/PermissionGate')

    render(
      <PermissionGate permission="points.award">
        <div>Allowed</div>
      </PermissionGate>
    )
    expect(screen.getByText('Allowed')).toBeInTheDocument()
  })

  it('renders fallback when role is not allowed', async () => {
    vi.resetModules()
    vi.doMock('../../apps/portal/src/hooks/usePermissions', () => ({
      usePermission: () => ({ hasPermission: false, loading: false }),
      useUserRole: () => ({ role: 'teacher', loading: false }),
    }))

    const { RequireRole } = await import('../../apps/portal/src/components/PermissionGate')

    render(
      <RequireRole roles="admin" fallback={<div>Denied</div>}>
        <div>Allowed</div>
      </RequireRole>
    )
    expect(screen.getByText('Denied')).toBeInTheDocument()
  })
})
