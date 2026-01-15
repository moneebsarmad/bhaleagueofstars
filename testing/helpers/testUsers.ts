export type TestUserRole =
  | 'super_admin'
  | 'admin'
  | 'teacher'
  | 'support_staff'
  | 'house_mentor'
  | 'student'
  | 'parent'

export const TEST_PASSWORD = 'Test1234!'

export const TEST_USERS: Record<TestUserRole, { id: string; email: string; role: TestUserRole }> = {
  super_admin: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'super_admin@example.test',
    role: 'super_admin',
  },
  admin: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'admin@example.test',
    role: 'admin',
  },
  teacher: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'teacher@example.test',
    role: 'teacher',
  },
  support_staff: {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'support@example.test',
    role: 'support_staff',
  },
  house_mentor: {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'mentor@example.test',
    role: 'house_mentor',
  },
  student: {
    id: '00000000-0000-0000-0000-000000000006',
    email: 'student@example.test',
    role: 'student',
  },
  parent: {
    id: '00000000-0000-0000-0000-000000000007',
    email: 'parent@example.test',
    role: 'parent',
  },
}
