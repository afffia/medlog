import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SLOTS } from '../constants'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Today({ profile, onChange }) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [medicines, setMedicines] = useState([])
  const [conditions, setConditions] = useState([])
  const [logs, setLogs] = useState({})
  const today = new Date().toISOString().split('T')[0]

  const loadTodayData = async () => {
    if (!profile?.id) return
    const [medsRes, condsRes, logsRes] = await Promise.all([
      supabase.from('medicines').select('*').eq('profile_id', profile.id).order('created_at'),
      supabase.from('conditions').select('*').eq('profile_id', profile.id),
      supabase.from('today_logs').select('*').eq('profile_id', profile.id).eq('log_date', today)
    ])
    if (medsRes.data) setMedicines(medsRes.data)
    if (condsRes.data) setConditions(condsRes.data)
    const map = {}
    logsRes.data?.forEach(l => { if (l.taken) map[l.medicine_id] = true })
    setLogs(map)
  }

  useEffect(() => {
    loadTodayData()
    const handler = () => loadTodayData()
    window.addEventListener('medicines-updated', handler)
    window.addEventListener('conditions-updated', handler)
    return () => {
      window.removeEventListener('medicines-updated', handler)
      window.removeEventListener('conditions-updated', handler)
    }
  }, [profile.id, today])

  const done = medicines.filter(m => logs[m.id]).length
  const pct = medicines.length ? Math.round((done / medicines.length) * 100) : 0

  const toggle = async (medicineId) => {
    const isTaken = !!logs[medicineId]
    setLogs(prev => ({ ...prev, [medicineId]: !isTaken }))
    const { error } = await supabase.from('today_logs').upsert(
      { user_id: user.id, profile_id: profile.id, medicine_id: medicineId, log_date: today, taken: !isTaken },
      { onConflict: 'profile_id,medicine_id,log_date' }
    )
    if (error) {
      console.log('today_logs error:', error)
      setLogs(prev => ({ ...prev, [medicineId]: isTaken }))
    } else {
      // FIX: Supabase e save hole Home + Detail ke janabo
      if (onChange) onChange()
      window.dispatchEvent(new Event('today-logs-updated'))
      window.dispatchEvent(new Event('medicines-updated'))
    }
  }

  const removeMedicine = async (medicineId) => {
    if (!confirm(t('common.delete') + ' ?')) return
    const { error } = await supabase.from('medicines').delete().eq('id', medicineId)
    if (!error) {
      setMedicines(prev => prev.filter(m => m.id !== medicineId))
      await supabase.from('today_logs').delete().eq('medicine_id', medicineId)
      // FIX
      if (onChange) onChange()
      window.dispatchEvent(new CustomEvent('medicines-updated'))
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-serif text-xl font-semibold">{t('today.title')}</h2>
        <span className="text-sm text-ink/60">{done}/{medicines.length} {t('today.taken')}</span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-teal-light">
        <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
      </div>

      {medicines.length === 0 ? (
        <p className="rounded-xl bg-amber-light p-4 text-sm">{t('today.empty')}</p>
      ) : (
        <div className="space-y-5">
          {SLOTS.map((slot) => {
            const items = medicines.filter((m) => (m.times || []).includes(slot.id))
            if (!items.length) return null
            return (
              <div key={slot.id}>
                <h3 className="mb-2 text-sm font-medium text-teal">{t(`medicines.${slot.id}`, { defaultValue: slot.label })}</h3>
                <ul className="space-y-2">
                  {items.map((m) => {
                    const on = !!logs[m.id]
                    return (
                      <li key={m.id} className={`group flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 ${on ? 'border-teal bg-teal-light' : 'border-teal/15 bg-white'}`}>
                        <button type="button" onClick={() => toggle(m.id)} 
                        className="flex flex-1 items-center gap-3 text-left">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${on ? 'border-teal bg-teal text-white' : 'border-ink/30'}`}>{on && '✓'}</span>
                          <span className="flex-1">
                            <span className={`block text-sm font-medium ${on ? 'line-through opacity-60' : ''}`}>
                              {m.name} {m.dosage && <span className="font-normal text-ink/60">({m.dosage})</span>}
                            </span>
                          </span>
                        </button>
                        <button type="button" onClick={() => removeMedicine(m.id)} className="flex h-7 w-7 items-center justify-center rounded-full text-ink/40 hover:bg-white hover:text-coral">
                          ×
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}