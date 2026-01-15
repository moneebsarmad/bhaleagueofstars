import { test, expect } from '@playwright/test'
import { loginAs, expectAccessDenied } from './helpers'

test('unauthenticated dashboard routes redirect to login', async ({ page }) => {
  await page.goto('/dashboard/analytics')
  await expect(page).toHaveURL('/')
})

test('role-dependent /dashboard landing', async ({ page }) => {
  await loginAs(page, 'teacher')
  await expect(page.getByRole('heading', { name: 'House Standings' })).toBeVisible()

  await page.context().clearCookies()
  await loginAs(page, 'admin')
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  await page.context().clearCookies()
  await loginAs(page, 'student')
  await expect(page.getByText('My Points')).toBeVisible()

  await page.context().clearCookies()
  await loginAs(page, 'parent')
  await expect(page.getByText('Child Profile')).toBeVisible()
})

test('non-admin staff cannot access admin routes', async ({ page }) => {
  await loginAs(page, 'teacher')
  await page.goto('/dashboard/analytics')
  await expectAccessDenied(page)
  await page.goto('/dashboard/reports')
  await expectAccessDenied(page)
  await page.goto('/dashboard/rewards')
  await expectAccessDenied(page)
  await page.goto('/dashboard/staff')
  await expectAccessDenied(page)
  await page.goto('/dashboard/behaviour')
  await expectAccessDenied(page)
  await page.goto('/dashboard/implementation-health')
  await expectAccessDenied(page)
})

test('admin and super_admin access admin routes', async ({ page }) => {
  await loginAs(page, 'admin')
  await page.goto('/dashboard/analytics')
  await expect(page.getByRole('heading', { name: 'Advanced Analytics' })).toBeVisible()
  await page.goto('/dashboard/reports')
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()

  await page.context().clearCookies()
  await loginAs(page, 'super_admin')
  await page.goto('/dashboard/behaviour')
  await expect(page.getByRole('heading', { name: 'Behaviour Intelligence Console' })).toBeVisible()
  await page.goto('/dashboard/implementation-health')
  await expect(page.getByRole('heading', { name: 'Implementation Health Snapshot' })).toBeVisible()
})

test('removed routes return not found', async ({ page }) => {
  await loginAs(page, 'admin')
  const response = await page.goto('/dashboard/search')
  expect(response?.status()).toBe(404)
  const response2 = await page.goto('/dashboard/announcements')
  expect(response2?.status()).toBe(404)
  const response3 = await page.goto('/dashboard/data-quality')
  expect(response3?.status()).toBe(404)
})
