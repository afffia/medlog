import { useTranslation } from 'react-i18next'
import { Pill, CalendarClock, Check, Clock, X } from 'lucide-react'
import { useReminders } from '../context/ReminderContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { fmtClock, fmtTime } from '../dates.js'

const MAX_SHOWN = 3

export default function ReminderToaster() {
  const { t, i18n } = useTranslation()
  const { due, dismiss, snooze, markTaken } = useReminders()
  const { settings } = useSettings()
  const lang = i18n.language

  if (due.length === 0) return null
  const shown = due.slice(0, MAX_SHOWN)
  const extra = due.length - shown.length

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      role="region"
      aria-live="polite"
      aria-label={t('settings.reminders.title')}
    >
      {shown.map((d) => {
        const isMed = d.kind === 'medicine'
        const Icon = isMed ? Pill : CalendarClock
        const detail = isMed
          ? [d.dosage, `${t(`medicines.${d.slot}`)} · ${fmtClock(settings.slot_times[d.slot], lang)}`, d.person]
          : [fmtTime(d.at, lang), d.doctor, d.facility, d.person]

        return (
          <div
            key={d.key}
            className={`rounded-2xl border bg-white p-3.5 shadow-lg ${
              isMed ? (d.overdue ? 'border-coral' : 'border-amber') : 'border-teal'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isMed ? (d.overdue ? 'bg-coral-light text-coral' : 'bg-amber-light text-amber') : 'bg-teal-light text-teal-dark'
                }`}
              >
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {isMed
                    ? t('reminders.medicineTitle', { name: d.title })
                    : t('reminders.appointmentTitle', { title: d.title })}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink/60">{detail.filter(Boolean).join(' · ')}</p>
                {isMed && d.overdue && (
                  <p className="mt-1 text-xs font-medium text-coral">{t('reminders.overdue')}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(d.key)}
                aria-label={t('reminders.dismiss')}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/40 hover:bg-canvas hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {isMed && (
                <button
                  type="button"
                  onClick={() => markTaken(d)}
                  className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-dark"
                >
                  <Check size={14} />
                  {t('reminders.markTaken')}
                </button>
              )}
              <button
                type="button"
                onClick={() => snooze(d.key)}
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink/70 hover:border-teal/50"
              >
                <Clock size={14} />
                {t('reminders.snooze')}
              </button>
            </div>
          </div>
        )
      })}
      {extra > 0 && (
        <p className="rounded-xl bg-white/90 px-3 py-1.5 text-center text-xs text-ink/60 shadow">
          {t('reminders.more', { count: extra })}
        </p>
      )}
    </div>
  )
}
