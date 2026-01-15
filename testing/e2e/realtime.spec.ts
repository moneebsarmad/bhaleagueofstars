import { test, expect } from '@playwright/test'
import { loginAs } from './helpers'
import { getServiceRoleClient } from '../helpers/supabase'

const getHouseTotal = async (house: string) => {
  const supabase = getServiceRoleClient()
  const { data, error } = await supabase
    .from('merit_log')
    .select('house, points')
    .eq('house', house)
  if (error) {
    throw new Error(error.message)
  }
  return (data || []).reduce((sum, row) => sum + Number(row.points ?? 0), 0)
}

test('admin overview updates after teacher award', async ({ browser }) => {
  const adminContext = await browser.newContext()
  const teacherContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  const teacherPage = await teacherContext.newPage()

  await loginAs(adminPage, 'admin')
  await expect(adminPage.getByRole('heading', { name: 'Overview' })).toBeVisible()

  const house = 'House of Abu Bakr'
  const beforeTotal = await getHouseTotal(house)

  await loginAs(teacherPage, 'teacher')
  await teacherPage.goto('/dashboard/add-points')
  await teacherPage.getByPlaceholder('Search for a student...').fill('Ali')
  await teacherPage.getByRole('button', { name: /Ali Hassan/i }).click()
  await teacherPage.getByRole('button', { name: /Respect/i }).click()
  await teacherPage.getByRole('button', { name: /Polite Language/i }).click()
  await teacherPage.getByPlaceholder('Add any additional notes...').fill('Realtime test award')
  await teacherPage.getByRole('button', { name: /Award/i }).click()

  const afterTotal = await getHouseTotal(house)
  expect(afterTotal).toBeGreaterThan(beforeTotal)

  await expect(adminPage.getByText(afterTotal.toLocaleString())).toBeVisible()

  await adminContext.close()
  await teacherContext.close()
})
