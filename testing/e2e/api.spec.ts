import { test, expect } from '@playwright/test'
import { apiContextForRole } from './helpers'

const buildPdf = (lines: string[]) => {
  const content = [
    'BT',
    '/F1 12 Tf',
    '72 720 Td',
    ...lines.flatMap((line, index) => {
      const text = line.replace(/[()]/g, '')
      return index === 0 ? [`(${text}) Tj`] : ['T*', `(${text}) Tj`]
    }),
    'ET',
  ].join('\n')

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ]

  let offset = 0
  const header = '%PDF-1.4\n'
  offset += header.length
  const offsets = objects.map((obj) => {
    const current = offset
    offset += obj.length
    return current
  })

  const xrefOffset = offset
  const xref = [
    `xref\n0 ${objects.length + 1}\n`,
    '0000000000 65535 f \n',
    ...offsets.map((value) => `${String(value).padStart(10, '0')} 00000 n \n`),
  ].join('')

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(header + objects.join('') + xref + trailer)
}

test('behaviour upload auth and PDF handling', async ({ request }) => {
  const unauth = await request.newContext()
  const unauthRes = await unauth.post('/api/behaviour/upload')
  expect(unauthRes.status()).toBe(401)

  const teacherCtx = await apiContextForRole(request, 'teacher')
  const csvBuffer = Buffer.from('student_name,grade,event_type,event_date,points\nAli Hassan,6,merit,2026-01-01,1')
  const teacherRes = await teacherCtx.post('/api/behaviour/upload', {
    multipart: {
      file: {
        name: 'events.csv',
        mimeType: 'text/csv',
        buffer: csvBuffer,
      },
    },
  })
  expect(teacherRes.status()).toBe(403)

  const superCtx = await apiContextForRole(request, 'super_admin')
  const pdfBuffer = buildPdf(['6th', 'Smith, John', '01/01/2026 Violation 5', 'Description test', 'Resolution test'])
  const res = await superCtx.post('/api/behaviour/upload', {
    multipart: {
      file: {
        name: 'discipline.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
      },
      source_system: 'test_pdf',
    },
  })
  expect(res.status()).toBe(200)
})

test('behaviour upload rejects invalid files', async ({ request }) => {
  const superCtx = await apiContextForRole(request, 'super_admin')

  const emptyCsv = await superCtx.post('/api/behaviour/upload', {
    multipart: {
      file: {
        name: 'empty.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('student_name,grade,event_type,event_date,points'),
      },
    },
  })
  expect(emptyCsv.status()).toBe(400)

  const oversized = await superCtx.post('/api/behaviour/upload', {
    multipart: {
      file: {
        name: 'big.csv',
        mimeType: 'text/csv',
        buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
      },
    },
  })
  expect(oversized.status()).toBe(400)

  const corruptPdf = await superCtx.post('/api/behaviour/upload', {
    multipart: {
      file: {
        name: 'bad.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('not-a-real-pdf'),
      },
    },
  })
  expect(corruptPdf.status()).toBe(400)
})

test('behaviour reprocess auth + idempotency', async ({ request }) => {
  const unauth = await request.newContext()
  const unauthRes = await unauth.post('/api/behaviour/reprocess', { data: {} })
  expect(unauthRes.status()).toBe(401)

  const teacherCtx = await apiContextForRole(request, 'teacher')
  const teacherRes = await teacherCtx.post('/api/behaviour/reprocess', { data: {} })
  expect(teacherRes.status()).toBe(403)

  const superCtx = await apiContextForRole(request, 'super_admin')
  const first = await superCtx.post('/api/behaviour/reprocess', { data: {} })
  expect(first.status()).toBe(200)
  const second = await superCtx.post('/api/behaviour/reprocess', { data: {} })
  expect(second.status()).toBe(200)
})

test('staff engagement and implementation health auth checks', async ({ request }) => {
  const unauth = await request.newContext()
  const staffEngRes = await unauth.get('/api/staff/engagement?startDate=2026-01-01&endDate=2026-01-31')
  expect(staffEngRes.status()).toBe(401)

  const teacherCtx = await apiContextForRole(request, 'teacher')
  const teacherRes = await teacherCtx.get('/api/staff/engagement?startDate=2026-01-01&endDate=2026-01-31')
  expect(teacherRes.status()).toBe(403)

  const adminCtx = await apiContextForRole(request, 'admin')
  const adminRes = await adminCtx.get('/api/staff/engagement?startDate=2026-01-01&endDate=2026-01-31')
  expect(adminRes.status()).toBe(200)
  const adminJson = await adminRes.json()
  expect(adminJson).toHaveProperty('global')

  const implUnauth = await unauth.get('/api/implementation-health?startDate=2026-01-01&endDate=2026-01-31')
  expect(implUnauth.status()).toBe(401)

  const adminImpl = await adminCtx.get('/api/implementation-health?startDate=2026-01-01&endDate=2026-01-31')
  expect(adminImpl.status()).toBe(403)

  const superCtx = await apiContextForRole(request, 'super_admin')
  const superImpl = await superCtx.get('/api/implementation-health?startDate=2026-01-01&endDate=2026-01-31')
  expect(superImpl.status()).toBe(200)
  const implJson = await superImpl.json()
  expect(implJson).toHaveProperty('metrics')
})

test('points award rejects invalid category id', async ({ request }) => {
  const teacherCtx = await apiContextForRole(request, 'teacher')
  const response = await teacherCtx.post('/api/points/award', {
    data: {
      mode: 'students',
      categoryId: 'not-a-real-category',
      students: [
        { name: 'Ali Hassan', grade: 6, section: 'A', house: 'House of Abu Bakr' },
      ],
      notes: 'Invalid category test',
      eventDate: '2026-01-12',
    },
  })
  expect(response.status()).toBe(400)
})
