import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient.js'
import { useAuth } from './AuthContext.jsx'
import { useSettings } from './SettingsContext.jsx'
import { dateKey, fmtClock, fmtTime } from '../dates.js'
import { computeDue } from '../reminderLogic.js'
import { notifPermission, showNotification } from '../notify.js'

const ReminderContext = createContext(null)

const TICK_MS = 30 * 1000            // how often we re-check the clock
const REFRESH_MS = 5 * 60 * 1000     // how often we re-fetch from Supabase
const SNOOZE_MIN = 10
const NOTIFIED_KEY = 'medlog_notified'
const DISMISSED_KEY = 'medlog_dismissed'
const KEEP_MS = 3 * 24 * 60 * 60 * 1000

// { key: timestampMs } maps in localStorage, pruned so they don't grow forever
function readMap(storageKey) {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey)) || {}
    const cutoff = Date.now() - KEEP_MS
    return Object.fromEntries(Object.entries(raw).filter(([, ts]) => ts > cutoff))
  } catch {
    return {}
  }
}
function writeMap(storageKey, map) {
  try { localStorage.setItem(storageKey, JSON.stringify(map)) } catch { /* ignore */ }
}

export function ReminderProvider({ children }) {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { t, i18n } = useTranslation()

  const [meds, setMeds] = useState([])
  const [profiles, setProfiles] = useState([])
  const [taken, setTaken] = useState(() => new Set())   // 'medId:slot' or 'medId:all'
  const [appts, setAppts] = useState([])
  const [now, setNow] = useState(() => Date.now())
  const [dismissed, setDismissed] = useState(() => readMap(DISMISSED_KEY))
  const [snoozed, setSnoozed] = useState({})            // key -> until (ms), this session only

  const refresh = useCallback(async () => {
    if (!user) return
    const day = dateKey()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const [m, p, l, a] = await Promise.all([
      supabase.from('medicines').select('id,name,dosage,times,profile_id').eq('user_id', user.id),
      supabase.from('profiles').select('id,name').eq('user_id', user.id),
      supabase.from('today_logs').select('medicine_id,slot,taken').eq('user_id', user.id).eq('log_date', day),
      supabase.from('appointments').select('*').eq('user_id', user.id).eq('done', false).gte('appt_at', since).order('appt_at'),
    ])
    if (m.error) console.warn('reminders: medicines', m.error.message)
    if (l.error) console.warn('reminders: today_logs', l.error.message)
    // appointments error just means features_schema.sql hasn't been run yet
    setMeds(m.data || [])
    setProfiles(p.data || [])
    setAppts(a.error ? [] : a.data || [])
    const set = new Set()
    ;(l.data || []).forEach((row) => {
      if (row.taken) set.add(`${row.medicine_id}:${row.slot || 'all'}`)
    })
    setTaken(set)
  }, [user])

  // Initial load, periodic refresh, and refresh whenever another screen changes data
  useEffect(() => {
    if (!user) {
      setMeds([]); setAppts([]); setTaken(new Set())
      return
    }
    refresh()
    const events = ['medicines-updated', 'today-logs-updated', 'appointments-updated']
    events.forEach((e) => window.addEventListener(e, refresh))
    const onVisible = () => { if (document.visibilityState === 'visible') { setNow(Date.now()); refresh() } }
    document.addEventListener('visibilitychange', onVisible)
    const id = setInterval(refresh, REFRESH_MS)
    return () => {
      events.forEach((e) => window.removeEventListener(e, refresh))
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(id)
    }
  }, [user, refresh])

  // The clock
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [])

  const personName = useCallback(
    (profileId) => profiles.find((p) => p.id === profileId)?.name || '',
    [profiles],
  )

  // Everything that is due right now and not yet handled
  const due = useMemo(
    () => (user ? computeDue({ meds, taken, appts, settings, now, personName }) : []),
    [user, settings, meds, appts, taken, now, personName],
  )

  const visible = useMemo(
    () => due.filter((d) => !dismissed[d.key] && !(snoozed[d.key] > now)),
    [due, dismissed, snoozed, now],
  )

  // Browser notification, once per reminder (remembered across reloads)
  useEffect(() => {
    if (!settings.browser_notifications || notifPermission() !== 'granted') return
    const notified = readMap(NOTIFIED_KEY)
    let changed = false
    visible.forEach((d) => {
      if (notified[d.key]) return
      const lang = i18n.language
      if (d.kind === 'medicine') {
        const parts = [d.dosage, t(`medicines.${d.slot}`) + ' · ' + fmtClock(settings.slot_times[d.slot], lang), d.person].filter(Boolean)
        showNotification(t('reminders.medicineTitle', { name: d.title }), parts.join(' · '), d.key)
      } else {
        const parts = [fmtTime(d.at, lang), d.doctor, d.facility, d.person].filter(Boolean)
        showNotification(t('reminders.appointmentTitle', { title: d.title }), parts.join(' · '), d.key)
      }
      notified[d.key] = Date.now()
      changed = true
    })
    if (changed) writeMap(NOTIFIED_KEY, notified)
  }, [visible, settings, t, i18n.language])

  const dismiss = useCallback((key) => {
    setDismissed((prev) => {
      const next = { ...prev, [key]: Date.now() }
      writeMap(DISMISSED_KEY, next)
      return next
    })
  }, [])

  const snooze = useCallback((key) => {
    setSnoozed((prev) => ({ ...prev, [key]: Date.now() + SNOOZE_MIN * 60000 }))
    // let the browser notification fire again when the snooze ends
    const notified = readMap(NOTIFIED_KEY)
    delete notified[key]
    writeMap(NOTIFIED_KEY, notified)
  }, [])

  const markTaken = useCallback(async (item) => {
    if (!user || item.kind !== 'medicine') return { error: null }
    // optimistic: hide it straight away
    setTaken((prev) => new Set(prev).add(`${item.medicineId}:${item.slot}`))
    const { error } = await supabase.from('today_logs').upsert(
      {
        user_id: user.id,
        profile_id: item.profileId,
        medicine_id: item.medicineId,
        log_date: dateKey(),
        slot: item.slot,
        taken: true,
      },
      { onConflict: 'profile_id,medicine_id,log_date,slot' },
    )
    if (error) {
      console.warn('reminders: markTaken', error.message)
      refresh()
      return { error }
    }
    window.dispatchEvent(new Event('today-logs-updated'))
    return { error: null }
  }, [user, refresh])

  return (
    <ReminderContext.Provider value={{ due: visible, dismiss, snooze, markTaken, refresh }}>
      {children}
    </ReminderContext.Provider>
  )
}

export function useReminders() {
  const ctx = useContext(ReminderContext)
  if (!ctx) throw new Error('useReminders must be used inside a ReminderProvider')
  return ctx
}
