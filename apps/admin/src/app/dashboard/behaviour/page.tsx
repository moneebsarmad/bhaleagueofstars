'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type UploadRecord = {
  upload_id: string
  file_name: string | null
  source_system: string | null
  upload_type: string | null
  date_range_start: string | null
  date_range_end: string | null
  created_at: string
}

type UploadResponse = {
  upload_id?: string
  inserted?: number
  errors?: { row: number; message: string }[]
  error?: string
}

const sampleCsv = `student_id,student_name,grade,section,event_type,event_date,event_time,staff_name,class_context,location,category,subcategory,severity,points,notes
f2a6b2e0-0000-0000-0000-000000000001,Ayah Ali,6,A,merit,2025-01-08,09:15,Maryam Khan,Homeroom,Classroom,Leadership,Helping peers,minor,5,Positive support
f2a6b2e0-0000-0000-0000-000000000002,Adam Bashar,7,B,demerit,2025-01-09,10:30,Sarah Malik,Math,Classroom,Conduct,Talking,moderate,2,Disruptive talking
`

export default function BehaviourIntelligencePage() {
  const [file, setFile] = useState<File | null>(null)
  const [sourceSystem, setSourceSystem] = useState('Manual Upload')
  const [uploadType, setUploadType] = useState<'append' | 'replace_range' | 'replace_all'>('append')
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [recentUploads, setRecentUploads] = useState<UploadRecord[]>([])
  const [refreshingUploads, setRefreshingUploads] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [reprocessMessage, setReprocessMessage] = useState<string | null>(null)

  const sampleCsvHref = useMemo(() => {
    return `data:text/csv;charset=utf-8,${encodeURIComponent(sampleCsv)}`
  }, [])

  const loadUploads = async () => {
    setRefreshingUploads(true)
    const { data } = await supabase
      .from('behaviour_uploads')
      .select('upload_id,file_name,source_system,upload_type,date_range_start,date_range_end,created_at')
      .order('created_at', { ascending: false })
      .limit(6)
    setRecentUploads(data || [])
    setRefreshingUploads(false)
  }

  useEffect(() => {
    loadUploads()
  }, [])

  const handleUpload = async () => {
    setUploadError(null)
    setUploadResponse(null)

    if (!file) {
      setUploadError('Please choose a CSV file to upload.')
      return
    }

    if (uploadType === 'replace_range' && (!dateRangeStart || !dateRangeEnd)) {
      setUploadError('Please provide both start and end dates for replace range uploads.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('source_system', sourceSystem.trim() || 'Manual Upload')
      formData.append('upload_type', uploadType)
      if (uploadType === 'replace_range') {
        formData.append('date_range_start', dateRangeStart)
        formData.append('date_range_end', dateRangeEnd)
      }

      const response = await fetch('/api/behaviour/upload', {
        method: 'POST',
        body: formData,
      })
      const contentType = response.headers.get('content-type') || ''
      const rawBody = (await response.text()).trim()
      let data: UploadResponse
      if (contentType.includes('application/json') && rawBody) {
        try {
          data = JSON.parse(rawBody) as UploadResponse
        } catch (error) {
          data = { error: `Upload failed: ${String(error)}` }
        }
      } else {
        data = { error: rawBody }
      }

      if (!response.ok) {
        setUploadError(data.error || 'Upload failed. Please review the file and try again.')
      } else {
        setUploadResponse(data)
        setFile(null)
        await loadUploads()
      }
    } catch (error) {
      setUploadError((error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleReprocess = async () => {
    setReprocessMessage(null)
    setReprocessing(true)
    try {
      const response = await fetch('/api/behaviour/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const contentType = response.headers.get('content-type') || ''
      const rawBody = (await response.text()).trim()
      let data: { processed?: number; error?: string }
      if (contentType.includes('application/json') && rawBody) {
        try {
          data = JSON.parse(rawBody) as { processed?: number; error?: string }
        } catch (error) {
          data = { error: `Reprocess failed: ${String(error)}` }
        }
      } else {
        data = { error: rawBody }
      }

      if (!response.ok) {
        setReprocessMessage(data.error || 'Reprocess failed.')
      } else {
        setReprocessMessage(`Reprocessed ${data.processed || 0} student records.`)
      }
    } catch (error) {
      setReprocessMessage((error as Error).message)
    } finally {
      setReprocessing(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a227] mb-2">Behaviour Intelligence</p>
        <h1
          className="text-3xl font-bold text-[#1a1a2e] mb-2"
          style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
        >
          Behaviour Intelligence Console
        </h1>
        <p className="text-[#1a1a2e]/60 max-w-2xl">
          Upload merit and demerit logs, track ingestion status, and trigger insight recomputation. All logic is rules-based and
          stored in Supabase for transparent auditability.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="regal-card rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Upload Behaviour Events
          </h2>
          <p className="text-sm text-[#1a1a2e]/60 mb-6">
            CSV uploads are ingested into <span className="font-semibold">behaviour_events</span>. The rules engine will recompute
            insights for affected students automatically.
          </p>

          <div className="grid gap-5">
            <div className="border border-dashed border-[#c9a227]/40 rounded-2xl p-5 bg-white/60">
              <label className="text-xs tracking-[0.2em] text-[#1a1a2e]/50">CSV file</label>
              <div className="mt-3 flex flex-col gap-3">
                <input
                  type="file"
                  accept=".csv,.pdf"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="text-sm text-[#1a1a2e]/70 file:mr-4 file:rounded-xl file:border-0 file:bg-[#c9a227] file:px-4 file:py-2 file:text-white file:shadow-sm hover:file:bg-[#b08a1f]"
                />
                <div className="text-xs text-[#1a1a2e]/50">
                  CSV and PDF reports are supported. PDFs are parsed from the Discipline Event Summary format.
                </div>
                <a
                  href={sampleCsvHref}
                  download="behaviour_events_sample.csv"
                  className="text-xs text-[#2f0a61] font-semibold underline underline-offset-4"
                >
                  Download sample CSV
                </a>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-white rounded-2xl p-4 border border-[#c9a227]/20">
                <label className="text-xs tracking-[0.2em] text-[#1a1a2e]/50">Source system</label>
                <input
                  value={sourceSystem}
                  onChange={(event) => setSourceSystem(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#1a1a2e]/10 px-3 py-2 text-sm"
                  placeholder="Manual Upload"
                />
              </div>
              <div className="bg-white rounded-2xl p-4 border border-[#c9a227]/20">
                <label className="text-xs tracking-[0.2em] text-[#1a1a2e]/50">Upload type</label>
                <select
                  value={uploadType}
                  onChange={(event) => setUploadType(event.target.value as 'append' | 'replace_range' | 'replace_all')}
                  className="mt-2 w-full rounded-xl border border-[#1a1a2e]/10 px-3 py-2 text-sm bg-white"
                >
                  <option value="append">Append (add rows)</option>
                  <option value="replace_range">Replace date range</option>
                  <option value="replace_all">Replace all history</option>
                </select>
              </div>
            </div>

            {uploadType === 'replace_range' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-white rounded-2xl p-4 border border-[#c9a227]/20">
                  <label className="text-xs tracking-[0.2em] text-[#1a1a2e]/50">Date range start</label>
                  <input
                    type="date"
                    value={dateRangeStart}
                    onChange={(event) => setDateRangeStart(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#1a1a2e]/10 px-3 py-2 text-sm"
                  />
                </div>
                <div className="bg-white rounded-2xl p-4 border border-[#c9a227]/20">
                  <label className="text-xs tracking-[0.2em] text-[#1a1a2e]/50">Date range end</label>
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(event) => setDateRangeEnd(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#1a1a2e]/10 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {uploadError && (
              <div className="rounded-xl border border-[#910000]/20 bg-[#fff5f5] px-4 py-3 text-sm text-[#910000]">
                {uploadError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="rounded-xl bg-gradient-to-r from-[#2f0a61] to-[#1a0536] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
              >
                {uploading ? 'Uploading...' : 'Upload Behaviour File'}
              </button>
              <button
                onClick={handleReprocess}
                disabled={reprocessing}
                className="rounded-xl border border-[#c9a227]/40 px-5 py-3 text-sm font-semibold text-[#1a1a2e] hover:border-[#c9a227] disabled:opacity-60"
              >
                {reprocessing ? 'Reprocessing...' : 'Reprocess Insights'}
              </button>
              {reprocessMessage && <span className="text-sm text-[#1a1a2e]/70">{reprocessMessage}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="regal-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-4" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
              Latest Upload Result
            </h3>
            {!uploadResponse && <p className="text-sm text-[#1a1a2e]/50">No uploads yet.</p>}
            {uploadResponse && (
              <div className="space-y-3 text-sm">
                {uploadResponse.error && <p className="text-[#910000]">{uploadResponse.error}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-[#1a1a2e]/60">Upload ID</span>
                  <span className="font-semibold text-[#1a1a2e]">{uploadResponse.upload_id || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#1a1a2e]/60">Rows inserted</span>
                  <span className="font-semibold text-[#1a1a2e]">{uploadResponse.inserted ?? 0}</span>
                </div>
                {uploadResponse.errors && uploadResponse.errors.length > 0 && (
                  <div className="rounded-xl border border-[#c9a227]/20 bg-[#fffaf0] px-4 py-3 text-xs text-[#1a1a2e]/70">
                    <p className="font-semibold text-[#1a1a2e] mb-2">Row issues</p>
                    <ul className="space-y-1">
                      {uploadResponse.errors.slice(0, 4).map((item) => (
                        <li key={`${item.row}-${item.message}`}>Row {item.row}: {item.message}</li>
                      ))}
                      {uploadResponse.errors.length > 4 && <li>+{uploadResponse.errors.length - 4} more</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="regal-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#1a1a2e]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                Recent Uploads
              </h3>
              <button
                onClick={loadUploads}
                className="text-xs font-semibold text-[#2f0a61] underline underline-offset-4"
                disabled={refreshingUploads}
              >
                {refreshingUploads ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {recentUploads.length === 0 ? (
              <p className="text-sm text-[#1a1a2e]/50">No uploads recorded yet.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {recentUploads.map((upload) => (
                  <div key={upload.upload_id} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#1a1a2e]">{upload.file_name || 'Manual upload'}</p>
                      <p className="text-xs text-[#1a1a2e]/50">
                        {upload.source_system || 'Unknown source'} • {upload.upload_type}
                      </p>
                    </div>
                    <div className="text-right text-xs text-[#1a1a2e]/50">
                      <div>{new Date(upload.created_at).toLocaleString()}</div>
                      {upload.date_range_start && upload.date_range_end && (
                        <div>
                          {upload.date_range_start} → {upload.date_range_end}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
