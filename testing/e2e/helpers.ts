import { expect, type Page, type APIRequestContext } from '@playwright/test'
import { TEST_PASSWORD, TEST_USERS, type TestUserRole } from '../helpers/testUsers'
import { getSessionCookies } from '../helpers/auth'

const ROLE_LABELS: Record<TestUserRole, string> = {
  super_admin: 'Staff',
  admin: 'Staff',
  teacher: 'Staff',
  support_staff: 'Staff',
  house_mentor: 'Staff',
  student: 'Student',
  parent: 'Parent',
}

export async function loginAs(page: Page, role: TestUserRole) {
  const user = TEST_USERS[role]
  await page.goto('/')
  await page.getByRole('button', { name: ROLE_LABELS[role] }).click()
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard')
}

export async function apiContextForRole(request: APIRequestContext, role: TestUserRole) {
  const { cookies } = await getSessionCookies(role)
  return request.newContext({
    extraHTTPHeaders: {
      cookie: cookies.join('; '),
    },
  })
}

export async function expectAccessDenied(page: Page) {
  await expect(page.getByText('Access Denied')).toBeVisible()
}
