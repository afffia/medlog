import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { useAuth } from './AuthContext.jsx'
import { DEFAULT_SETTINGS } from '../constants.js'

const SettingsContext = createContext(null)
const cacheKey = (uid) => `medlog_settings_${uid}`

function merge(base, patch) {
  return {
    ...base,
    ...patch,
    slot_times: { ...base.slot_times, ...(patch?.slot_times || {}) },
  }
}

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [syncError, setSyncError] = useState(null)
  const ref = useRef(settings)
  ref.current = settings

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS)
      return
    }
    let cancelled = false

    // Start from the local copy so the UI is instant and still works if the
    // user_settings table hasn't been created yet.
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey(user.id)))
      if (cached) setSettings(merge(DEFAULT_SETTINGS, cached))
    } catch { /* ignore */ }

    ;(async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setSyncError(error.message)
        return
      }
      if (data) {
        const next = merge(DEFAULT_SETTINGS, data)
        setSettings(next)
        try { localStorage.setItem(cacheKey(user.id), JSON.stringify(next)) } catch { /* ignore */ }
      }
    })()

    return () => { cancelled = true }
  }, [user?.id])

  const save = useCallback(async (patch) => {
    const next = merge(ref.current, patch)
    ref.current = next
    setSettings(next)
    if (!user) return { error: null }
    try { localStorage.setItem(cacheKey(user.id), JSON.stringify(next)) } catch { /* ignore */ }

    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: user.id,
        display_name: next.display_name || null,
        med_reminders: next.med_reminders,
        appt_reminders: next.appt_reminders,
        browser_notifications: next.browser_notifications,
        slot_times: next.slot_times,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    setSyncError(error ? error.message : null)
    return { error }
  }, [user])

  return (
    <SettingsContext.Provider value={{ settings, save, syncError }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside a SettingsProvider')
  return ctx
}
