// @vitest-environment node
import { describe, expect, it } from 'vitest'
import expected from '../expected/standings.json'
import { getServiceRoleClient } from '../helpers/supabase'

type HouseRow = { house: string; total_points: number }
type StudentRow = { house: string; student_name: string; total_points: number }

const normalizeHouseRows = (rows: Record<string, unknown>[]) =>
  rows
    .map((row) => ({
      house: String(row.house ?? row.house_name ?? ''),
      total_points: Number(row.total_points ?? row.points ?? 0),
    }))
    .sort((a, b) => a.house.localeCompare(b.house))

const normalizeStudentRows = (rows: Record<string, unknown>[]) =>
  rows
    .map((row) => ({
      house: String(row.house ?? row.house_name ?? ''),
      student_name: String(row.student_name ?? row.student ?? row.name ?? ''),
      total_points: Number(row.total_points ?? row.points ?? 0),
    }))
    .sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points
      const nameCompare = a.student_name.localeCompare(b.student_name)
      if (nameCompare !== 0) return nameCompare
      return a.house.localeCompare(b.house)
    })

describe('golden standings + top students', () => {
  it('matches expected house standings view', async () => {
    const supabase = getServiceRoleClient()
    const { data, error } = await supabase
      .from('house_standings_view')
      .select('house,total_points')
    expect(error).toBeNull()

    const normalized = normalizeHouseRows((data || []) as Record<string, unknown>[])
    const expectedRows = normalizeHouseRows(expected.houseStandings as unknown as Record<string, unknown>[])
    expect(normalized).toEqual(expectedRows)
  })

  it('matches expected top students per house view', async () => {
    const supabase = getServiceRoleClient()
    const { data, error } = await supabase
      .from('top_students_per_house')
      .select('*')
    expect(error).toBeNull()

    const normalized = normalizeStudentRows((data || []) as Record<string, unknown>[])
    const expectedRows = normalizeStudentRows(expected.topStudentsPerHouse as unknown as Record<string, unknown>[])
    expect(normalized).toEqual(expectedRows)
  })

  it('matches expected admin overview totals', async () => {
    const supabase = getServiceRoleClient()
    const { data, error } = await supabase
      .from('merit_log')
      .select('house, points')
    expect(error).toBeNull()

    const totals: Record<string, number> = {}
    ;(data || []).forEach((row) => {
      const house = String(row.house ?? '')
      if (!house) return
      totals[house] = (totals[house] || 0) + Number(row.points ?? 0)
    })

    const expectedHouses = (expected.adminOverview.houses || []).map((row) => ({
      house: row.house,
      points: row.points,
    }))

    const actualHouses = Object.entries(totals)
      .map(([house, points]) => ({ house, points }))
      .sort((a, b) => a.house.localeCompare(b.house))
    const normalizedExpected = expectedHouses.sort((a, b) => a.house.localeCompare(b.house))

    expect(actualHouses).toEqual(normalizedExpected)

    const totalPoints = actualHouses.reduce((sum, row) => sum + row.points, 0)
    expect(totalPoints).toBe(expected.adminOverview.total_points)
  })
})
