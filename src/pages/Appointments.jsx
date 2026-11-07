import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Check, RotateCcw, Trash2, Bell, CalendarClock } from 'lucide-react'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { APPT_LEADS, inputCls, btnCls } from '../constants.js'
import { dateKey, fmtDateTime } from '../dates.js'

const GRACE_MS = 30 * 60 * 1000
const emptyForm = () => ({
  title: '', doctor: '', facility: '', date: '', time: '09:00', profileId: '', lead: 60, notes: '',
})

export default function Appointments() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const [appts, setAppts] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState(emptyForm)

  const load = useCallback(async () => {
    if (!user) return
    const [a, p] = await Promise.all([
      supabase.from('appointments').select('*').eq('user_id', user.id).order('appt_at'),
      supabase.from('profiles').select('id,name').eq('user_id', user.id).order('created_at'),
    ])
    if (a.error) {
      setError(a.error.code === 'PGRST205' || a.error.code === '42P01' ? t('appointments.tableMissing') : a.error.message)
      setAppts([])
    } else {
      setError(null)
      setAppts(a.data || [])
    }
    setProfiles(p.data || [])
    setLoading(false)
  }, [user, t])

  useEffect(() => { load() }, [load])

  const changed = () => window.dispatchEvent(new Event('appointments-updated'))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!f.title.trim() || !f.date || !f.time) return
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase.from('appointments').insert({
      user_id: user.id,
      profile_id: f.profileId || null,
      title: f.title.trim(),
      doctor: f.doctor.trim() || null,
      facility: f.facility.trim() || null,
      appt_at: new Date(`${f.date}T${f.time}`).toISOString(),
      remind_before_minutes: Number(f.lead),
      notes: f.notes.trim() || null,
    }).select()
    setSaving(false)
    if (err) { setError(err.message); return }
    setAppts((prev) => [...prev, ...data].sort((a, b) => new Date(a.appt_at) - new Date(b.appt_at)))
    setF(emptyForm())
    setAdding(false)
    changed()
  }

  async function toggleDone(a) {
    const { error: err } = await supabase.from('appointments').update({ done: !a.done }).eq('id', a.id)
    if (err) { setError(err.message); return }
    setAppts((prev) => prev.map((x) => (x.id === a.id ? { ...x, done: !a.done } : x)))
    changed()
  }

  async function remove(a) {
    if (!window.confirm(t('appointments.deleteConfirm'))) return
    const { error: err } = await supabase.from('appointments').delete().eq('id', a.id)
    if (err) { setError(err.message); return }
    setAppts((prev) => prev.filter((x) => x.id !== a.id))
    changed()
  }

  const { upcoming, past } = useMemo(() => {
    const cutoff = Date.now() - GRACE_MS
    const up = []
    const pa = []
    appts.forEach((a) => (!a.done && new Date(a.appt_at).getTime() >= cutoff ? up : pa).push(a))
    pa.reverse()
    return { upcoming: up, past: pa }
  }, [appts])

  const nameOf = (id) => profiles.find((p) => p.id === id)?.name
  const dayChip = (iso) => {
    const d = new Date(iso)
    const today = dateKey()
    const tomorrow = dateKey(new Date(Date.now() + 24 * 60 * 60 * 1000))
    const k = dateKey(d)
    if (k === today) return t('appointments.today')
    if (k === tomorrow) return t('appointments.tomorrow')
    return null
  }

  function renderRow(a, muted = false) {
    const chip = dayChip(a.appt_at)
    const person = nameOf(a.profile_id)
    return (
      <li key={a.id} className={`flex items-start gap-3 rounded-2xl border bg-white p-4 ${muted ? 'border-line opacity-80' : 'border-teal/20'}`}>
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${muted ? 'bg-canvas text-ink/40' : 'bg-teal-light text-teal-dark'}`}>
          <CalendarClock size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm font-semibold ${a.done ? 'line-through opacity-60' : ''}`}>{a.title}</p>
            {chip && !muted && <span className="rounded-full bg-amber-light px-2 py-0.5 text-xs font-medium text-amber">{chip}</span>}
            {person && <span className="rounded-full bg-teal-light px-2 py-0.5 text-xs text-teal-dark">{person}</span>}
          </div>
          <p className="mt-0.5 text-xs text-ink/60">{fmtDateTime(a.appt_at, lang)}</p>
          {(a.doctor || a.facility) && (
            <p className="text-xs text-ink/50">{[a.doctor, a.facility].filter(Boolean).join(' · ')}</p>
          )}
          {a.notes && <p className="mt-1.5 text-xs text-ink/60">{a.notes}</p>}
          {!muted && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-ink/40">
              <Bell size={12} />
              {t('appointments.reminderLine', { lead: t(`appointments.leads.${a.remind_before_minutes}`, { defaultValue: `${a.remind_before_minutes} min` }) })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={() => toggleDone(a)}
            className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink/70 hover:border-teal/50"
          >
            {a.done ? <RotateCcw size={12} /> : <Check size={12} />}
            {a.done ? t('appointments.reopen') : t('appointments.markDone')}
          </button>
          <button type="button" onClick={() => remove(a)} className="flex items-center gap-1 px-2 py-1 text-xs text-coral hover:text-coral/70">
            <Trash2 size={12} />
            {t('common.delete')}
          </button>
        </div>
      </li>
    )
  }

  return (
    <div className="w-full">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">{t('appointments.title')}</h2>
          <p className="mt-1 text-sm text-ink/50">{t('appointments.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className={`${btnCls} flex items-center gap-2`}>
          <Plus size={16} />
          {adding ? t('common.cancel') : t('appointments.new')}
        </button>
      </header>

      {error && <p className="mb-4 rounded-lg bg-coral-light px-3 py-2 text-xs text-coral">{error}</p>}

      {adding && (
        <form onSubmit={handleSubmit} className="mb-6 grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('appointments.titleLabel')}</label>
            <input required autoFocus className={inputCls} value={f.title} placeholder={t('appointments.titlePlaceholder')} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('appointments.doctor')}</label>
            <input className={inputCls} value={f.doctor} placeholder={t('appointments.doctorPlaceholder')} onChange={(e) => setF({ ...f, doctor: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('appointments.facility')}</label>
            <input className={inputCls} value={f.facility} placeholder={t('appointments.facilityPlaceholder')} onChange={(e) => setF({ ...f, facility: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('appointments.date')}</label>
            <input required type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('appointments.time')}</label>
            <input required type="time" className={inputCls} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('appointments.forWhom')}</label>
            <select className={inputCls} value={f.profileId} onChange={(e) => setF({ ...f, profileId: e.target.value })}>
              <option value="">{t('appointments.myself')}</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('appointments.remind')}</label>
            <select className={inputCls} value={f.lead} onChange={(e) => setF({ ...f, lead: e.target.value })}>
              {APPT_LEADS.map((m) => <option key={m} value={m}>{t(`appointments.leads.${m}`)}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-ink/60">{t('appointments.notes')}</label>
            <textarea rows={2} className={inputCls} value={f.notes} placeholder={t('appointments.notesPlaceholder')} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className={`${btnCls} disabled:opacity-50`}>
              {saving ? t('common.saving') : t('appointments.save')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-ink/40">{t('common.loading')}</p>
      ) : (
        <>
          <h3 className="mb-3 text-sm font-semibold">{t('appointments.upcoming')}</h3>
          {upcoming.length === 0 ? (
            <p className="mb-8 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink/50">{t('appointments.noneUpcoming')}</p>
          ) : (
            <ul className="mb-8 space-y-3">{upcoming.map((a) => renderRow(a))}</ul>
          )}

          <h3 className="mb-3 text-sm font-semibold">{t('appointments.past')}</h3>
          {past.length === 0 ? (
            <p className="text-sm text-ink/40">{t('appointments.nonePast')}</p>
          ) : (
            <ul className="space-y-3">{past.map((a) => renderRow(a, true))}</ul>
          )}
        </>
      )}
    </div>
  )
}
