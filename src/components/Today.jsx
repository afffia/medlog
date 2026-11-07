import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SLOTS, todayKey } from '../constants'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { atClock, fmtClock } from '../dates'

const CONFLICT = 'profile_id,medicine_id,log_date,slot'
const DUE_WINDOW_MIN = 4 * 60

export default function Today({ profile, onChange }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { settings } = useSettings()

  const [medicines, setMedicines] = useState([])
  const [logs, setLogs] = useState({})          // 'medicineId:slot' -> true
  const [legacyAll, setLegacyAll] = useState({}) // medicineId -> true (old "whole day" log rows)
  const today = todayKey()

  const loadTodayData = async () => {
    if (!profile?.id) return
    const [medsRes, logsRes] = await Promise.all([
      supabase.from('medicines').select('*').eq('profile_id', profile.id).order('created_at'),
      supabase.from('today_logs').select('*').eq('profile_id', profile.id).eq('log_date', todayKey()),
    ])
    const meds = medsRes.data || []
    setMedicines(meds)

    const map = {}
    const all = {}
    ;(logsRes.data || []).forEach((l) => {
      if (!l.taken) return
      if (!l.slot || l.slot === 'all') {
        // A log from before per-dose tracking: counts as every slot of that medicine
        all[l.medicine_id] = true
        const med = meds.find((m) => m.id === l.medicine_id)
        ;(med?.times || []).forEach((s) => { map[`${l.medicine_id}:${s}`] = true })
      } else {
        map[`${l.medicine_id}:${l.slot}`] = true
      }
    })
    setLogs(map)
    setLegacyAll(all)
  }

  useEffect(() => {
    loadTodayData()
    const handler = () => loadTodayData()
    window.addEventListener('medicines-updated', handler)
    window.addEventListener('conditions-updated', handler)
    window.addEventListener('today-logs-updated', handler)
    return () => {
      window.removeEventListener('medicines-updated', handler)
      window.removeEventListener('conditions-updated', handler)
      window.removeEventListener('today-logs-updated', handler)
    }
  }, [profile.id, today])

  const totalDoses = medicines.reduce((n, m) => n + (m.times?.length || 0), 0)
  const done = medicines.reduce(
    (n, m) => n + (m.times || []).filter((s) => logs[`${m.id}:${s}`]).length,
    0,
  )
  const pct = totalDoses ? Math.round((done / totalDoses) * 100) : 0

  const notifyChanged = () => {
    if (onChange) onChange()
    window.dispatchEvent(new Event('today-logs-updated'))
  }

  const toggle = async (med, slot) => {
    const key = `${med.id}:${slot}`
    const wasTaken = !!logs[key]
    setLogs((prev) => ({ ...prev, [key]: !wasTaken }))

    let error = null
    if (wasTaken && legacyAll[med.id]) {
      // Replace the old whole-day row with explicit rows for the other slots
      const others = (med.times || []).filter((s) => s !== slot)
      const del = await supabase.from('today_logs').delete()
        .eq('medicine_id', med.id).eq('log_date', todayKey()).eq('slot', 'all')
      error = del.error
      if (!error && others.length) {
        const up = await supabase.from('today_logs').upsert(
          others.map((s) => ({ user_id: user.id, profile_id: profile.id, medicine_id: med.id, log_date: todayKey(), slot: s, taken: true })),
          { onConflict: CONFLICT },
        )
        error = up.error
      }
    } else {
      const up = await supabase.from('today_logs').upsert(
        { user_id: user.id, profile_id: profile.id, medicine_id: med.id, log_date: todayKey(), slot, taken: !wasTaken },
        { onConflict: CONFLICT },
      )
      error = up.error
    }

    if (error) {
      console.log('today_logs error:', error)
      setLogs((prev) => ({ ...prev, [key]: wasTaken }))
    } else {
      notifyChanged()
    }
  }

  const removeMedicine = async (medicineId) => {
    if (!confirm(t('common.delete') + ' ?')) return
    const { error } = await supabase.from('medicines').delete().eq('id', medicineId)
    if (!error) {
      setMedicines((prev) => prev.filter((m) => m.id !== medicineId))
      await supabase.from('today_logs').delete().eq('medicine_id', medicineId)
      if (onChange) onChange()
      window.dispatchEvent(new CustomEvent('medicines-updated'))
    }
  }

  const slotIsDue = (slotId) => {
    const hhmm = settings.slot_times?.[slotId]
    if (!hhmm) return false
    const ageMin = (Date.now() - atClock(todayKey(), hhmm).getTime()) / 60000
    return ageMin >= 0 && ageMin <= DUE_WINDOW_MIN
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-serif text-xl font-semibold">{t('today.title')}</h2>
        <span className="text-sm text-ink/60">{done}/{totalDoses} {t('today.taken')}</span>
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
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-teal">
                  {t(`medicines.${slot.id}`, { defaultValue: slot.label })}
                  <span className="text-xs font-normal text-ink/40">{fmtClock(settings.slot_times?.[slot.id], i18n.language)}</span>
                </h3>
                <ul className="space-y-2">
                  {items.map((m) => {
                    const on = !!logs[`${m.id}:${slot.id}`]
                    const dueNow = !on && slotIsDue(slot.id)
                    return (
                      <li key={`${m.id}:${slot.id}`} className={`group flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 ${on ? 'border-teal bg-teal-light' : dueNow ? 'border-amber bg-amber-light/50' : 'border-teal/15 bg-white'}`}>
                        <button type="button" onClick={() => toggle(m, slot.id)} className="flex flex-1 items-center gap-3 text-left">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${on ? 'border-teal bg-teal text-white' : 'border-ink/30'}`}>{on && '✓'}</span>
                          <span className="flex-1">
                            <span className={`block text-sm font-medium ${on ? 'line-through opacity-60' : ''}`}>
                              {m.name} {m.dosage && <span className="font-normal text-ink/60">({m.dosage})</span>}
                            </span>
                            {dueNow && <span className="text-xs font-medium text-amber">{t('today.dueNow')}</span>}
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
