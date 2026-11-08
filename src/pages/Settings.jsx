import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, Copy, Check, LogOut } from 'lucide-react'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useReminders } from '../context/ReminderContext.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import { SLOTS, inputCls, btnCls } from '../constants.js'
import { fmtDate, fmtDateTime } from '../dates.js'
import { isSecurePage, notifPermission, requestNotifPermission, showNotification } from '../notify.js'

function Section({ title, desc, children }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      {desc && <p className="mt-0.5 text-xs text-ink/50">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Toggle({ checked, onChange, label, desc }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="mt-0.5 text-xs text-ink/50">{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-teal' : 'bg-ink/20'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

export default function Settings() {
  const { user, signOut } = useAuth()
  const { settings, save, syncError } = useSettings()
  const { preview } = useReminders()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [name, setName] = useState(settings.display_name || '')
  const [nameSaved, setNameSaved] = useState(false)
  const [perm, setPerm] = useState(notifPermission())

  const [shares, setShares] = useState([])
  const [sharesError, setSharesError] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [audit, setAudit] = useState(null)   // null until loaded, or if audit_log isn't set up yet

  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState(null) // { ok: bool, text }

  useEffect(() => { setName(settings.display_name || '') }, [settings.display_name])

  useEffect(() => {
    async function loadShares() {
      if (!user) return
      const { data, error } = await supabase
        .from('summary_shares')
        .select('id,token,report_ids,expires_at,revoked,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) setSharesError(error.message)
      else setShares(data || [])
    }
    loadShares()
  }, [user])

  useEffect(() => {
    async function loadAudit() {
      if (!user) return
      const { data, error } = await supabase
        .from('audit_log')
        .select('id,table_name,action,row_id,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500)
      if (!error) setAudit(data || [])
    }
    loadAudit()
  }, [user])

  // how many times / when each share link was opened
  const opens = {}
  ;(audit || []).forEach((a) => {
    if (a.table_name !== 'share_view') return
    if (!opens[a.row_id]) opens[a.row_id] = { count: 0, last: a.created_at }
    opens[a.row_id].count += 1
  })

  async function saveName(e) {
    e.preventDefault()
    const { error } = await save({ display_name: name.trim() })
    if (!error) {
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    }
  }

  async function enableNotifications() {
    const result = await requestNotifPermission()
    setPerm(result)
    if (result === 'granted') await save({ browser_notifications: true })
  }

  function sendTest() {
    showNotification(t('app.name'), t('settings.reminders.testBody'), 'medlog-test')
  }

  function setSlotTime(slotId, value) {
    if (!value) return
    save({ slot_times: { [slotId]: value } })
  }

  const status = (s) => {
    if (s.revoked) return 'revoked'
    if (new Date(s.expires_at) <= new Date()) return 'expired'
    return 'active'
  }

  async function revoke(s) {
    if (!window.confirm(t('settings.privacy.revokeConfirm'))) return
    const { error } = await supabase.from('summary_shares').update({ revoked: true }).eq('id', s.id)
    if (error) { setSharesError(error.message); return }
    setShares((prev) => prev.map((x) => (x.id === s.id ? { ...x, revoked: true } : x)))
  }

  async function copyLink(s) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/shared/${s.token}`)
      setCopiedId(s.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* clipboard blocked */ }
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwMsg(null)
    if (pw.next.length < 6) return setPwMsg({ ok: false, text: t('auth.passwordTooShort') })
    if (pw.next !== pw.confirm) return setPwMsg({ ok: false, text: t('auth.passwordMismatch') })
    const { error } = await supabase.auth.updateUser({ password: pw.next })
    if (error) return setPwMsg({ ok: false, text: error.message })
    setPw({ next: '', confirm: '' })
    setPwMsg({ ok: true, text: t('settings.account.passwordUpdated') })
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const permText = {
    granted: t('settings.reminders.granted'),
    denied: t('settings.reminders.denied'),
    default: t('settings.reminders.notAsked'),
    unsupported: isSecurePage() ? t('settings.reminders.unsupported') : t('settings.reminders.needsSecure'),
  }[perm]

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h2 className="font-serif text-2xl">{t('settings.title')}</h2>
        <p className="mt-1 text-sm text-ink/50">{t('settings.subtitle')}</p>
      </header>

      {syncError && <p className="mb-4 rounded-lg bg-amber-light px-3 py-2 text-xs text-amber">{t('settings.syncError')}</p>}

      <div className="flex flex-col gap-5">
        <Section title={t('settings.profile.title')}>
          <form onSubmit={saveName} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">{t('settings.profile.email')}</label>
              <input className={`${inputCls} bg-canvas`} value={user?.email || ''} readOnly />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">{t('settings.profile.displayName')}</label>
              <input className={inputCls} value={name} placeholder={t('settings.profile.displayNamePlaceholder')} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className={btnCls}>{t('settings.profile.save')}</button>
              {nameSaved && <span className="text-xs text-teal">{t('settings.profile.saved')}</span>}
            </div>
          </form>
        </Section>

        <Section title={t('settings.language.title')} desc={t('settings.language.desc')}>
          <LanguageSwitcher />
        </Section>

        <Section title={t('settings.reminders.title')} desc={t('settings.reminders.note')}>
          <div className="flex flex-col gap-5">
            <Toggle
              checked={settings.med_reminders}
              onChange={(v) => save({ med_reminders: v })}
              label={t('settings.reminders.medicine')}
              desc={t('settings.reminders.medicineDesc')}
            />
            <Toggle
              checked={settings.appt_reminders}
              onChange={(v) => save({ appt_reminders: v })}
              label={t('settings.reminders.appointment')}
              desc={t('settings.reminders.appointmentDesc')}
            />

            <div>
              <p className="text-sm font-medium">{t('settings.reminders.times')}</p>
              <p className="mt-0.5 text-xs text-ink/50">{t('settings.reminders.timesDesc')}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {SLOTS.map((s) => (
                  <div key={s.id}>
                    <label className="mb-1 block text-xs font-medium text-ink/60">{t(`medicines.${s.id}`)}</label>
                    <input
                      type="time"
                      className={inputCls}
                      value={settings.slot_times?.[s.id] || ''}
                      onChange={(e) => setSlotTime(s.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <button type="button" onClick={preview} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium hover:border-teal/50">
                {t('settings.reminders.preview')}
              </button>
            </div>

            <div className="rounded-xl border border-line bg-canvas p-4">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-teal-dark" />
                <p className="text-sm font-medium">{t('settings.reminders.browser')}</p>
              </div>
              <p className="mt-0.5 text-xs text-ink/50">{t('settings.reminders.browserDesc')}</p>
              <p className="mt-2 text-xs text-ink/60">{permText}</p>

              {perm === 'default' && (
                <button type="button" onClick={enableNotifications} className={`${btnCls} mt-3`}>
                  {t('settings.reminders.enable')}
                </button>
              )}
              {perm === 'granted' && (
                <div className="mt-3 flex flex-col gap-3">
                  <Toggle
                    checked={settings.browser_notifications}
                    onChange={(v) => save({ browser_notifications: v })}
                    label={t('settings.reminders.browser')}
                  />
                  <div>
                    <button type="button" onClick={sendTest} className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium hover:border-teal/50">
                      {t('settings.reminders.test')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section title={t('settings.privacy.title')} desc={t('settings.privacy.desc')}>
          {sharesError && <p className="mb-3 rounded-lg bg-coral-light px-3 py-2 text-xs text-coral">{sharesError}</p>}
          {shares.length === 0 ? (
            <p className="text-sm text-ink/50">{t('settings.privacy.noLinks')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {shares.map((s) => {
                const st = status(s)
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st === 'active' ? 'bg-teal-light text-teal-dark' : 'bg-ink/10 text-ink/60'}`}>
                          {t(`settings.privacy.${st}`)}
                        </span>
                        <span className="text-xs text-ink/60">{t('settings.privacy.reports', { count: s.report_ids?.length || 0 })}</span>
                      </div>
                      <p className="mt-1 text-xs text-ink/40">{t('settings.privacy.expires', { date: fmtDate(s.expires_at, i18n.language) })}</p>
                      {audit && (
                        <p className="mt-0.5 text-xs text-ink/40">
                          {opens[s.id]
                            ? t('settings.privacy.opened', { count: opens[s.id].count, date: fmtDateTime(opens[s.id].last, i18n.language) })
                            : t('settings.privacy.neverOpened')}
                        </p>
                      )}
                    </div>
                    {st === 'active' && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => copyLink(s)} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium hover:border-teal/50">
                          {copiedId === s.id ? <Check size={12} /> : <Copy size={12} />}
                          {copiedId === s.id ? t('settings.privacy.copied') : t('settings.privacy.copy')}
                        </button>
                        <button type="button" onClick={() => revoke(s)} className="rounded-lg border border-coral/40 px-2.5 py-1 text-xs font-medium text-coral hover:bg-coral-light">
                          {t('settings.privacy.revoke')}
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        {audit && (
          <Section title={t('settings.activity.title')} desc={t('settings.activity.desc')}>
            {audit.length === 0 ? (
              <p className="text-sm text-ink/50">{t('settings.activity.empty')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {audit.slice(0, 15).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>{t(`settings.activity.${a.table_name}.${a.action}`, { defaultValue: `${a.table_name} ${a.action}` })}</span>
                    <span className="shrink-0 text-xs text-ink/40">{fmtDateTime(a.created_at, i18n.language)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        <Section title={t('settings.account.title')}>
          <form onSubmit={changePassword} className="flex flex-col gap-3">
            <p className="text-sm font-medium">{t('settings.account.changePassword')}</p>
            <input type="password" autoComplete="new-password" className={inputCls} placeholder={t('settings.account.newPassword')} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            <input type="password" autoComplete="new-password" className={inputCls} placeholder={t('settings.account.confirmPassword')} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            {pwMsg && <p className={`text-xs ${pwMsg.ok ? 'text-teal' : 'text-coral'}`}>{pwMsg.text}</p>}
            <div><button type="submit" className={btnCls}>{t('settings.account.update')}</button></div>
          </form>
          <div className="mt-6 border-t border-line pt-4">
            <button type="button" onClick={handleLogout} className="flex items-center gap-2 text-sm text-coral hover:underline">
              <LogOut size={16} />
              {t('settings.account.logout')}
            </button>
          </div>
        </Section>
      </div>
    </div>
  )
}
