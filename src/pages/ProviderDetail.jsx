import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Pill, Trash2 } from 'lucide-react'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import TrendChart from '../components/TrendChart.jsx'
import { SLOTS, VITAL_KINDS, inputCls, btnCls, todayKey } from '../constants.js'
import { fmtDate } from '../dates.js'

const norm = (s) => (s || '').trim().toLowerCase()
const num = (s) => (s === '' || s == null ? NaN : Number(s))
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n * 10) / 10)}`

export default function ProviderDetail() {
  const { name } = useParams()            // react-router already decodes this
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const [reports, setReports] = useState([])
  const [meds, setMeds] = useState([])
  const [profiles, setProfiles] = useState([])
  const [vitals, setVitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [vitalsError, setVitalsError] = useState(null)
  const [error, setError] = useState(null)

  const [kind, setKind] = useState(VITAL_KINDS[0].id)
  const [f, setF] = useState({ v: '', v2: '', date: todayKey(), notes: '' })
  const [saving, setSaving] = useState(false)

  const key = norm(name)

  const load = useCallback(async () => {
    if (!user) return
    const [r, m, v, p] = await Promise.all([
      supabase.from('reports').select('id,title,category,provider,facility,report_date').eq('user_id', user.id).order('report_date', { ascending: false }),
      supabase.from('medicines').select('*').eq('user_id', user.id),
      supabase.from('vitals').select('*').eq('user_id', user.id).order('recorded_on'),
      supabase.from('profiles').select('id,name').eq('user_id', user.id),
    ])
    if (r.error) setError(r.error.message)
    setReports((r.data || []).filter((x) => norm(x.provider) === key))
    setMeds((m.data || []).filter((x) => norm(x.doctor) === key))
    setProfiles(p.data || [])
    if (v.error) {
      setVitalsError(v.error.code === 'PGRST205' || v.error.code === '42P01' ? t('providers.tableMissing') : v.error.message)
      setVitals([])
    } else {
      setVitalsError(null)
      setVitals((v.data || []).filter((x) => norm(x.provider) === key))
    }
    setLoading(false)
  }, [user, key, t])

  useEffect(() => { load() }, [load])

  const kindDef = VITAL_KINDS.find((k) => k.id === kind)
  const readings = useMemo(() => vitals.filter((v) => v.kind === kind), [vitals, kind])
  const points = useMemo(
    () => readings.map((v) => ({ date: v.recorded_on, v: Number(v.value), v2: v.value2 != null ? Number(v.value2) : undefined })),
    [readings],
  )

  const latest = points[points.length - 1]
  const prev = points[points.length - 2]
  const fmtReading = (p) => (p.v2 != null ? `${p.v}/${p.v2}` : `${p.v}`)
  const change = latest && prev
    ? kindDef.dual ? `${signed(latest.v - prev.v)}/${signed(latest.v2 - prev.v2)}` : signed(latest.v - prev.v)
    : null

  async function addReading(e) {
    e.preventDefault()
    const v = num(f.v)
    const v2 = kindDef.dual ? num(f.v2) : null
    if (!Number.isFinite(v) || (kindDef.dual && !Number.isFinite(v2)) || !f.date) return
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase.from('vitals').insert({
      user_id: user.id,
      provider: name.trim(),
      kind,
      value: v,
      value2: kindDef.dual ? v2 : null,
      recorded_on: f.date,
      notes: f.notes.trim() || null,
    }).select()
    setSaving(false)
    if (err) return setError(err.message)
    setVitals((prevList) => [...prevList, ...data].sort((a, b) => (a.recorded_on < b.recorded_on ? -1 : 1)))
    setF({ v: '', v2: '', date: todayKey(), notes: '' })
  }

  async function removeReading(id) {
    if (!window.confirm(t('providers.deleteConfirm'))) return
    const { error: err } = await supabase.from('vitals').delete().eq('id', id)
    if (err) return setError(err.message)
    setVitals((prevList) => prevList.filter((v) => v.id !== id))
  }

  const personName = (id) => profiles.find((p) => p.id === id)?.name

  if (loading) return <p className="py-16 text-center text-sm text-ink/40">{t('common.loading')}</p>

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/providers')} aria-label={t('common.back')} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:bg-white">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h2 className="truncate font-serif text-2xl">{name}</h2>
          <p className="mt-0.5 text-xs text-ink/50">
            {reports.length} {t('providers.reports').toLowerCase()} · {meds.length} {t('providers.medicines').toLowerCase()} · {vitals.length} {t('providers.vitals').toLowerCase()}
          </p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-coral-light px-3 py-2 text-xs text-coral">{error}</p>}

      <div className="flex flex-col gap-6">
        {/* Vitals & trends */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h3 className="font-serif text-lg font-semibold">{t('providers.vitalsTitle')}</h3>

          {vitalsError ? (
            <p className="mt-3 rounded-lg bg-amber-light px-3 py-2 text-xs text-amber">{vitalsError}</p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                {VITAL_KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKind(k.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      kind === k.id ? 'border-teal-dark bg-teal-dark text-white' : 'border-line text-ink/60 hover:border-teal/50'
                    }`}
                  >
                    {t(`providers.kinds.${k.id}`)}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                {points.length >= 2 ? (
                  <TrendChart
                    points={points}
                    unit={kindDef.unit}
                    label={kindDef.dual ? t('providers.systolic') : t(`providers.kinds.${kind}`)}
                    label2={t('providers.diastolic')}
                  />
                ) : (
                  <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-xs text-ink/50">
                    {points.length === 0 ? t('providers.noReadings') : t('providers.notEnough')}
                  </p>
                )}
              </div>

              {latest && (
                <div className="mt-4 flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-xs text-ink/50">{t('providers.latest')}</p>
                    <p className="font-semibold">{fmtReading(latest)} <span className="text-xs font-normal text-ink/50">{kindDef.unit}</span></p>
                  </div>
                  {change && (
                    <div>
                      <p className="text-xs text-ink/50">{t('providers.change')}</p>
                      <p className="font-semibold">{change}</p>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={addReading} className="mt-5 grid gap-3 rounded-xl border border-teal/15 bg-canvas p-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">{kindDef.dual ? t('providers.systolic') : t('providers.value')} ({kindDef.unit})</label>
                  <input required inputMode="decimal" className={inputCls} value={f.v} onChange={(e) => setF({ ...f, v: e.target.value.replace(/[^0-9.]/g, '') })} />
                </div>
                {kindDef.dual && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink/60">{t('providers.diastolic')}</label>
                    <input required inputMode="decimal" className={inputCls} value={f.v2} onChange={(e) => setF({ ...f, v2: e.target.value.replace(/[^0-9.]/g, '') })} />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">{t('upload.date')}</label>
                  <input required type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={saving} className={`${btnCls} w-full disabled:opacity-50`}>{t('providers.addReading')}</button>
                </div>
              </form>

              {readings.length > 0 && (
                <ul className="mt-4 divide-y divide-line">
                  {[...readings].reverse().slice(0, 8).map((v) => (
                    <li key={v.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="w-28 shrink-0 text-xs text-ink/50">{fmtDate(v.recorded_on, lang)}</span>
                      <span className="flex-1 font-medium">{v.value2 != null ? `${v.value}/${v.value2}` : v.value} <span className="text-xs font-normal text-ink/50">{kindDef.unit}</span></span>
                      <button type="button" onClick={() => removeReading(v.id)} aria-label={t('common.delete')} className="text-ink/40 hover:text-coral">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {/* Medicines prescribed by this doctor */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h3 className="font-serif text-lg font-semibold">{t('providers.medicines')}</h3>
          {meds.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">{t('providers.noMedicines')}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {meds.map((m) => (
                <li key={m.id} className="flex items-start gap-3 rounded-xl border border-teal/15 px-3.5 py-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-light text-amber"><Pill size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name} {m.dosage && <span className="font-normal text-ink/60">({m.dosage})</span>}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {SLOTS.filter((s) => (m.times || []).includes(s.id)).map((s) => (
                        <span key={s.id} className="rounded-full bg-teal-light px-2 py-0.5 text-xs text-teal ring-1 ring-teal/20">{t(`medicines.${s.id}`)}</span>
                      ))}
                      {personName(m.profile_id) && <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink/60">{personName(m.profile_id)}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Reports from this doctor */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h3 className="font-serif text-lg font-semibold">{t('providers.reports')}</h3>
          {reports.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">{t('providers.noReports')}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {reports.map((r) => (
                <li key={r.id}>
                  <Link to={`/reports/${r.id}`} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 hover:border-teal">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="mt-0.5 truncate text-xs text-ink/50">{[t(`categories.${r.category}`, r.category), r.facility].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span className="shrink-0 text-xs text-ink/50">{fmtDate(r.report_date, lang)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
