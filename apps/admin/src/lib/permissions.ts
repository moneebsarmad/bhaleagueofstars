'use client'

import { SupabaseClient } from '@supabase/supabase-js'

// Permission constants
export const PERMISSIONS = {
  POINTS_AWARD: 'points.award',
  POINTS_DEDUCT: 'points.deduct',
  POINTS_VIEW_ALL: 'points.view_all',
  ANALYTICS_VIEW_ALL: 'analytics.view_all',
  ANALYTICS_VIEW_HOUSE: 'analytics.view_house',
  STUDENTS_VIEW_ALL: 'students.view_all',
  STUDENTS_VIEW_HOUSE: 'students.view_house',
  REPORTS_EXPORT_ALL: 'reports.export_all',
  REPORTS_EXPORT_HOUSE: 'reports.export_house',
  STAFF_MANAGE: 'staff.manage',
  SYSTEM_CONFIGURE: 'system.configure',
  AUDIT_VIEW: 'audit.view',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

// Role constants
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  HOUSE_MENTOR: 'house_mentor',
  TEACHER: 'teacher',
  SUPPORT_STAFF: 'support_staff',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// Profile with relations
export interface UserProfile {
  id: string
  email: string
  role: Role | null
  assigned_house: string | null
  full_name?: string | null
  student_name?: string | null
}

// Check if user has a specific permission
export async function hasPermission(
  supabase: SupabaseClient,
  permission: Permission
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase.rpc('has_permission', {
      user_id: user.id,
      perm: permission,
    })

    if (error) {
      console.error('Permission check error:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

// Get user's role
export async function getUserRole(supabase: SupabaseClient): Promise<Role | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase.rpc('get_user_role', { user_id: user.id })

    if (error) {
      console.error('Error getting user role:', error)
      return null
    }

    return data as Role | null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

// Get user's assigned house (for house mentors)
export async function getUserHouse(supabase: SupabaseClient): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase.rpc('get_user_house', { user_id: user.id })

    if (error) {
      console.error('Error getting user house:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting user house:', error)
    return null
  }
}

// Get all permissions for a user
export async function getUserPermissions(
  supabase: SupabaseClient
): Promise<{ permission_name: string; description: string; category: string }[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase.rpc('get_user_permissions', { user_id: user.id })

    if (error) {
      console.error('Error getting user permissions:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return []
  }
}

// Get full user profile
export async function getUserProfile(supabase: SupabaseClient): Promise<UserProfile | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data as UserProfile
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

// Check if role has elevated access (admin or above)
export function isElevatedRole(role: Role | null): boolean {
  if (!role) return false
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN
}

// Check if role is super admin
export function isSuperAdmin(role: Role | null): boolean {
  return role === ROLES.SUPER_ADMIN
}

// Check if role can view all data (not house-restricted)
export function canViewAllData(role: Role | null): boolean {
  if (!role) return false
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN
}

// Check if role is house-restricted
export function isHouseRestricted(role: Role | null): boolean {
  return role === ROLES.HOUSE_MENTOR
}
