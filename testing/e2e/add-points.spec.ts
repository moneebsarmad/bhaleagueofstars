import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'
import { getServiceRoleClient } from '../helpers/supabase'

test('standard add points flow (teacher)', async ({ page }) => {
  await loginAs(page, 'teacher')
  await page.goto('/dashboard/add-points')

  await page.getByPlaceholder('Search for a student...').fill('Ali')
  await page.getByRole('button', { name: /Ali Hassan/i }).click()

  await page.getByRole('button', { name: /Respect/i }).click()
  await page.getByRole('button', { name: /Polite Language/i }).click()

  await page.locator('input[type="date"]').fill('2026-01-11')
  await page.getByPlaceholder('Add any additional notes...').fill('E2E award note')

  await page.getByRole('button', { name: /Award/i }).click()
  await expect(page.getByText('Points submitted!')).toBeVisible()

  const supabase = getServiceRoleClient()
  const { data } = await supabase
    .from('merit_log')
    .select('notes, student_name, staff_name')
    .eq('notes', 'E2E award note')
    .limit(1)

  expect(data?.[0]?.student_name).toBe('Ali Hassan')
  expect(data?.[0]?.staff_name).toBe('Teacher User')

  const standings = await supabase
    .from('house_standings_view')
    .select('house,total_points')
    .eq('house', 'House of Abu Bakr')
    .maybeSingle()

  await page.goto('/dashboard')
  if (standings.data?.total_points !== undefined) {
    const formatted = Number(standings.data.total_points).toLocaleString()
    await expect(page.getByText(formatted)).toBeVisible()
  }

  await page.goto('/dashboard/students')
  await page.getByPlaceholder('Search students...').fill('Ali Hassan')
  await page.getByText('Ali Hassan', { exact: true }).click()
  await expect(page.getByText('Polite Language & Manners')).toBeVisible()
})

test('add points validation blocks missing selections', async ({ page }) => {
  await loginAs(page, 'teacher')
  await page.goto('/dashboard/add-points')
  await expect(page.getByRole('button', { name: /Award/i })).toHaveCount(0)
})

test('house competition award (super_admin)', async ({ page }) => {
  await loginAs(page, 'super_admin')
  await page.goto('/dashboard/add-points')

  await page.getByRole('button', { name: /House Competition/i }).click()
  await page.getByPlaceholder('Enter points').fill('12')
  await page.getByLabel('House').selectOption({ label: 'House of Abu Bakr' })
  await page.getByLabel('Competition Note').fill('E2E house competition')

  await page.getByRole('button', { name: /Award/i }).click()
  await expect(page.getByText('Points submitted!')).toBeVisible()

  const supabase = getServiceRoleClient()
  const { data } = await supabase
    .from('merit_log')
    .select('notes, house, student_name')
    .eq('notes', 'E2E house competition')
    .limit(1)

  expect(data?.[0]?.house).toBe('House of Abu Bakr')
  expect(data?.[0]?.student_name || '').toBe('')
})
