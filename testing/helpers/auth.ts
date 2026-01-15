import { getAnonClient, getServiceRoleClient } from './supabase'
import { TEST_PASSWORD, TEST_USERS, type TestUserRole } from './testUsers'

async function ensureUser(role: TestUserRole) {
  const admin = getServiceRoleClient()
  const user = TEST_USERS[role]

  const { data: existing, error: existingError } = await admin.auth.admin.getUserById(user.id)
  if (!existingError && existing?.user) {
    return existing.user
  }

  const { data, error } = await admin.auth.admin.createUser({
    user_id: user.id,
    email: user.email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { role: user.role, full_name: user.email.split('@')[0] },
  })

  if (error || !data.user) {
    throw new Error(`Failed to create test user ${role}: ${error?.message}`)
  }

  return data.user
}

export async function getAccessToken(role: TestUserRole) {
  await ensureUser(role)
  const anon = getAnonClient()
  const user = TEST_USERS[role]
  const { data, error } = await anon.auth.signInWithPassword({
    email: user.email,
    password: TEST_PASSWORD,
  })
  if (error || !data.session) {
    throw new Error(`Failed to sign in test user ${role}: ${error?.message}`)
  }
  return data.session.access_token
}

export async function getSessionCookies(role: TestUserRole) {
  const anon = getAnonClient()
  await ensureUser(role)
  const user = TEST_USERS[role]
  const { data, error } = await anon.auth.signInWithPassword({
    email: user.email,
    password: TEST_PASSWORD,
  })
  if (error || !data.session) {
    throw new Error(`Failed to sign in test user ${role}: ${error?.message}`)
  }

  const cookies = [
    `sb-access-token=${data.session.access_token}`,
    `sb-refresh-token=${data.session.refresh_token}`,
  ]

  return { cookies, session: data.session }
}
