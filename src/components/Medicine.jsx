import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SLOTS } from '../constants'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Medicines({ profile, onChange }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [medicines, setMedicines] = useState([])
  const [conditions, setConditions] = useState([])
  const empty = { name: '', dose: '', diseaseId: '', doctor: '', times: ['morning'] }
  const [f, setF] = useState(empty)

  const loadAll = async () => {
    const [medsRes, condsRes] = await Promise.all([
      supabase.from('medicines').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('conditions').select('*').eq('profile_id', profile.id).order('created_at', { ascending: false })
    ])
    if (medsRes.data) setMedicines(medsRes.data)
    if (condsRes.data) setConditions(condsRes.data)
  }

  useEffect(() => {
    loadAll()
    const handler = () => loadAll()
    window.addEventListener('conditions-updated', handler)
    return () => window.removeEventListener('conditions-updated', handler)
  }, [profile.id])

  const toggleTime = (timeId) => setF((s) => ({ ...s, times: s.times.includes(timeId) ? s.times.filter((x) => x !== timeId) : [...s.times, timeId] }))

  const add = async (e) => {
    e.preventDefault()
    if (!f.name.trim() || f.times.length === 0) return
    const row = { user_id: user.id, profile_id: profile.id, name: f.name.trim(), dosage: f.dose.trim(), condition_id: f.diseaseId || null, times: f.times }
    if (f.doctor.trim()) row.doctor = f.doctor.trim()
    const { data, error } = await supabase.from('medicines').insert(row).select()
    if (!error && data) { 
      setMedicines(prev => [...data, ...prev]); 
      setF(empty); 
      // FIX 1: add er por Home + Detail ke janacchi
      window.dispatchEvent(new CustomEvent('medicines-updated'))
      if (onChange) onChange()
    }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('medicines').delete().eq('id', id)
    if (!error) { 
      setMedicines(prev => prev.filter(m => m.id !== id)); 
      // FIX 2: delete er por
      window.dispatchEvent(new CustomEvent('medicines-updated'))
      if (onChange) onChange()
    }
  }

  const timeLabel = (id, fallback) => t(`medicines.${id}`, { defaultValue: fallback })

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold">{t('medicines.title')}</h2>
        <span className="rounded-full bg-amber-light px-2.5 py-0.5 text-xs font-medium text-amber">{medicines.length}</span>
      </div>

      <form onSubmit={add} className="mb-4 space-y-2.5 rounded-xl border border-teal/15 bg-canvas p-3">
        <input className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal" placeholder={t('medicines.namePlaceholder')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal" placeholder={t('medicines.dosePlaceholder')} value={f.dose} onChange={(e) => setF({ ...f, dose: e.target.value })} />
          <select className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal" value={f.diseaseId} onChange={(e) => setF({ ...f, diseaseId: e.target.value })}>
            <option value="">{t('medicines.forWhich')}</option>
            {conditions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <input className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-teal" placeholder={t('medicines.doctorPlaceholder')} value={f.doctor} onChange={(e) => setF({ ...f, doctor: e.target.value })} />

        <div>
          <p className="mb-1.5 text-xs font-medium text-ink/60">{t('medicines.whenToTake')}</p>
          <div className="flex flex-wrap gap-2">
            {SLOTS.map((s) => (
              <button type="button" key={s.id} onClick={() => toggleTime(s.id)} className={`rounded-full border px-3 py-1 text-sm ${f.times.includes(s.id) ? 'border-teal bg-teal text-white' : 'border-teal/15 bg-white hover:border-teal/30'}`}>
                {timeLabel(s.id, s.label)}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="w-full rounded-lg bg-teal py-2 text-sm font-medium text-white hover:bg-teal-dark">{t('medicines.add')}</button>
      </form>

      {medicines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center"><p className="text-sm font-medium text-ink/60">{t('medicines.empty')}</p></div>
      ) : (
        <ul className="space-y-2">
          {medicines.map((m) => {
            const d = conditions.find((x) => x.id === m.condition_id)
            return (
              <li key={m.id} className="flex items-start gap-3 rounded-xl border border-teal/15 bg-white px-3.5 py-3 cursor-default">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-light">💊</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.name} {m.dosage && <span className="font-normal text-ink/60">({m.dosage})</span>}</div>
                  {d && <div className="text-xs text-ink/50">{t('medicines.for')} {d.name}</div>}
                  {m.doctor && <div className="text-xs text-ink/50">{t('medicines.prescribedBy')} {m.doctor}</div>}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {SLOTS.filter((s) => (m.times || []).includes(s.id)).map((s) => (
                      <span key={s.id} className="rounded-full bg-teal-light px-2 py-0.5 text-xs text-teal ring-1 ring-teal/20">{timeLabel(s.id, s.label)}</span>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => remove(m.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/40 hover:bg-canvas hover:text-coral">×</button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}