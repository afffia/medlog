import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Folder, Stethoscope } from 'lucide-react'
import { CATEGORIES } from '../mockData.js'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { fmtDate } from '../dates.js'

const norm = (s) => (s || '').trim().toLowerCase()

export default function Folders() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [by, setBy] = useState('category')   // 'category' | 'doctor'
  const [openKey, setOpenKey] = useState(null)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data, error: err } = await supabase
        .from('reports')
        .select('id,title,category,provider,facility,report_date,file_path')
        .eq('user_id', user.id)
        .order('report_date', { ascending: false })
      if (err) setError(err.message)
      else setReports(data || [])
      setLoading(false)
    }
    load()
  }, [user])

  const folders = useMemo(() => {
    const map = new Map()
    reports.forEach((r) => {
      const key = by === 'category' ? r.category || 'other' : norm(r.provider) || '__unknown'
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: by === 'category' ? t(`categories.${key}`, key) : r.provider?.trim() || t('doc'),
          doctorName: by === 'doctor' && r.provider?.trim() ? r.provider.trim() : null,
          items: [],
        })
      }
      map.get(key).items.push(r)   // already newest-first
    })
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label))
  }, [reports, by, t])

  const open = folders.find((f) => f.key === openKey)

  function switchBy(next) {
    setBy(next)
    setOpenKey(null)
  }

  if (open) {
    return (
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <button type="button" onClick={() => setOpenKey(null)} aria-label={t('common.back')} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:bg-white">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="font-serif text-2xl">{open.label}</h2>
            <p className="mt-0.5 text-sm text-ink/50">{t('folders.count', { count: open.items.length })}</p>
          </div>
          {open.doctorName && (
            <Link to={`/providers/${encodeURIComponent(open.doctorName)}`} className="ml-auto flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:border-teal/50">
              <Stethoscope size={13} />{t('folders.viewDoctor')}
            </Link>
          )}
        </div>

        {open.items.length === 0 ? (
          <p className="text-sm text-ink/50">{t('folder Empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {open.items.map((r) => (
              <li key={r.id}>
                <Link to={`/reports/${r.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 hover:border-teal">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="mt-0.5 truncate text-xs text-ink/50">
                      {[by === 'doctor' ? t(`categories.${r.category}`, r.category) : r.provider, r.facility].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-ink/50">{fmtDate(r.report_date, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <header className="mb-6">
        <h2 className="font-serif text-2xl">{t('Folders')}</h2>
        <p className="mt-1 text-sm text-ink/50">{t('view your folders')}</p>
      </header>

      <div className="mb-6 flex gap-2">
        {['category', 'doctor'].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => switchBy(k)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              by === k ? 'border-teal-dark bg-teal-dark text-white' : 'border-line text-ink/60 hover:border-teal/50'
            }`}
          >
            {k === 'category' ? t('Categories') : t('Doctors')}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-lg bg-coral-light px-3 py-2 text-xs text-coral">{error}</p>}

      {loading ? (
        <p className="py-16 text-center text-sm text-ink/40">{t('common.loading')}</p>
      ) : folders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink/50">
          {t('No folders')}{' '}
          <Link to="/upload" className="font-medium text-teal-dark">{t('timeline.uploadFirst')}</Link>.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {folders.map((f) => {
            const color = by === 'category' ? CATEGORIES[f.key]?.color : 'teal'
            const tint = { teal: 'bg-teal-light text-teal-dark', amber: 'bg-amber-light text-amber', coral: 'bg-coral-light text-coral' }[color] || 'bg-teal-light text-teal-dark'
            return (
              <li key={f.key}>
                <button type="button" onClick={() => setOpenKey(f.key)} className="flex w-full items-center gap-4 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-teal">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tint}`}>
                    <Folder size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-lg font-semibold">{f.label}</span>
                    <span className="block text-xs text-ink/60">{t('folders.count', { count: f.items.length })}</span>
                    <span className="block text-xs text-ink/40">{t('folders.latest', { date: fmtDate(f.items[0].report_date, lang) })}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
