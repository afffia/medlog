import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download, ExternalLink, FileText, Pencil, Trash2 } from 'lucide-react'
import { CATEGORIES } from '../mockData.js'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { fmtDate } from '../dates.js'
import { inputCls, btnCls } from '../constants.js'

const BUCKET = 'reports'
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp']

const extOf = (path) => (path?.includes('.') ? path.split('.').pop().toLowerCase() : '')
const fileName = (path) => {
  const raw = path?.split('/').pop() || ''
  try { return decodeURIComponent(raw) } catch { return raw }
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink/50">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  )
}

export default function ReportDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      setLoading(true)
      const { data, error: err } = await supabase
        .from('reports').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
      if (cancelled) return
      if (err) setError(err.message)
      setReport(data || null)
      setLoading(false)

      if (data?.file_path) {
        const name = fileName(data.file_path)
        const [view, dl] = await Promise.all([
          supabase.storage.from(BUCKET).createSignedUrl(data.file_path, 600),
          supabase.storage.from(BUCKET).createSignedUrl(data.file_path, 600, { download: name }),
        ])
        if (cancelled) return
        if (view.error) setPreviewFailed(true)
        setPreviewUrl(view.data?.signedUrl || null)
        setDownloadUrl(dl.data?.signedUrl || null)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, user])

  function startEdit() {
    setF({
      title: report.title || '',
      category: report.category || 'bloodwork',
      provider: report.provider || '',
      facility: report.facility || '',
      report_date: report.report_date || '',
      notes: report.notes || '',
    })
    setNotice(null)
    setError(null)
    setEditing(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('reports')
      .update({
        title: f.title.trim(),
        category: f.category,
        provider: f.provider.trim() || null,
        facility: f.facility.trim() || null,
        report_date: f.report_date,
        notes: f.notes.trim() || null,
      })
      .eq('id', report.id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle()
    setSaving(false)
    if (err) return setError(err.message)
    if (!data) return setError(t('timeline.updateFailed'))
    setReport(data)
    setEditing(false)
    setNotice(t('reportDetail.saved'))
  }

  async function handleDelete() {
    if (!window.confirm(t('reportDetail.deleteConfirm'))) return
    setError(null)
    if (report.file_path) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([report.file_path])
      if (storageError) return setError(storageError.message)
    }
    const { error: err } = await supabase.from('reports').delete().eq('id', report.id).eq('user_id', user.id)
    if (err) return setError(err.message)
    navigate('/')
  }

  const back = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label={t('common.back')}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:bg-white"
    >
      <ArrowLeft size={18} />
    </button>
  )

  if (loading) return <p className="py-16 text-center text-sm text-ink/40">{t('common.loading')}</p>

  if (!report) {
    return (
      <div>
        <div className="mb-6">{back}</div>
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink/60">
          {error || t('reportDetail.notFound')}
        </p>
      </div>
    )
  }

  const ext = extOf(report.file_path)
  const isImage = IMAGE_EXT.includes(ext)
  const isPdf = ext === 'pdf'

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        {back}
        <div className="min-w-0">
          <h2 className="truncate font-serif text-2xl">{editing ? t('common.edit') : report.title}</h2>
          <p className="mt-0.5 text-sm text-ink/50">
            {t(`categories.${report.category}`, report.category)} · {fmtDate(report.report_date, lang)}
          </p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-coral-light px-3 py-2 text-xs text-coral">{error}</p>}
      {notice && <p className="mb-4 rounded-lg bg-teal-light px-3 py-2 text-xs text-teal-dark">{notice}</p>}

      {editing ? (
        <form onSubmit={handleSave} className="grid gap-4 rounded-2xl border border-line bg-white p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('upload.reportTitle')}</label>
            <input required className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('upload.category')}</label>
            <select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {Object.keys(CATEGORIES).map((k) => <option key={k} value={k}>{t(`categories.${k}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('upload.date')}</label>
            <input required type="date" className={inputCls} value={f.report_date} onChange={(e) => setF({ ...f, report_date: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('upload.provider')}</label>
            <input className={inputCls} value={f.provider} placeholder={t('upload.providerPlaceholder')} onChange={(e) => setF({ ...f, provider: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('upload.facility')}</label>
            <input className={inputCls} value={f.facility} placeholder={t('upload.facilityPlaceholder')} onChange={(e) => setF({ ...f, facility: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('upload.notes')}</label>
            <textarea rows={4} className={inputCls} value={f.notes} placeholder={t('upload.notesPlaceholder')} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={saving} className={`${btnCls} disabled:opacity-50`}>
              {saving ? t('common.saving') : t('common.saveChanges')}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="rounded-2xl border border-line bg-white p-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label={t('upload.provider')}>
                {report.provider ? (
                  <Link to={`/providers/${encodeURIComponent(report.provider)}`} className="text-teal-dark hover:underline">{report.provider}</Link>
                ) : '—'}
              </Field>
              <Field label={t('upload.facility')}>{report.facility || '—'}</Field>
              <Field label={t('reportDetail.uploaded')}>{fmtDate(report.created_at, lang)}</Field>
              <Field label={t('upload.category')}>{t(`categories.${report.category}`, report.category)}</Field>
              <div className="sm:col-span-2">
                <Field label={t('upload.notes')}>
                  {report.notes ? <span className="whitespace-pre-wrap">{report.notes}</span> : <span className="text-ink/40">{t('reportDetail.noNotes')}</span>}
                </Field>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-4">
              <button type="button" onClick={startEdit} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-teal/50">
                <Pencil size={14} />{t('common.edit')}
              </button>
              <button type="button" onClick={handleDelete} className="flex items-center gap-1.5 rounded-lg border border-coral/40 px-3 py-1.5 text-sm font-medium text-coral hover:bg-coral-light">
                <Trash2 size={14} />{t('reportDetail.delete')}
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-white p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FileText size={16} className="text-teal-dark" />
                {t('reportDetail.file')}
              </h3>
              {previewUrl && (
                <div className="flex gap-2">
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:border-teal/50">
                    <ExternalLink size={13} />{t('reportDetail.open')}
                  </a>
                  {downloadUrl && (
                    <a href={downloadUrl} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:border-teal/50">
                      <Download size={13} />{t('reportDetail.download')}
                    </a>
                  )}
                </div>
              )}
            </div>

            {!report.file_path ? (
              <p className="text-sm text-ink/40">{t('reportDetail.noFile')}</p>
            ) : previewFailed ? (
              <p className="text-sm text-coral">{t('reportDetail.previewError')}</p>
            ) : !previewUrl ? (
              <p className="text-sm text-ink/40">{t('common.loading')}</p>
            ) : isImage ? (
              <img src={previewUrl} alt={report.title} className="max-h-[70vh] w-full rounded-xl border border-line object-contain" />
            ) : isPdf ? (
              <iframe src={previewUrl} title={report.title} className="h-[70vh] w-full rounded-xl border border-line" />
            ) : (
              <p className="text-sm text-ink/60">{fileName(report.file_path)}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
