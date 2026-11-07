export const localeFor = (lang) => (lang === 'bn' ? 'bn-BD' : 'en-US')

// 'YYYY-MM-DD' strings must be read as a local date. new Date('2026-06-02')
// is UTC midnight, which shows the previous day for anyone west of UTC.
function toDate(value) {
  if (value instanceof Date) return value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`)
  return new Date(value)
}

export function fmtDate(value, lang, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return ''
  return toDate(value).toLocaleDateString(localeFor(lang), opts)
}

export function fmtTime(value, lang) {
  if (!value) return ''
  return toDate(value).toLocaleTimeString(localeFor(lang), { hour: 'numeric', minute: '2-digit' })
}

export function fmtDateTime(value, lang) {
  if (!value) return ''
  return `${fmtDate(value, lang, { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtTime(value, lang)}`
}

// '08:00' -> '8:00 AM' (or Bangla digits), for showing a slot's reminder time
export function fmtClock(hhmm, lang) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return fmtTime(d, lang)
}

// Local calendar date as YYYY-MM-DD for any Date
export const dateKey = (d = new Date()) => d.toLocaleDateString('en-CA')

// Local date + 'HH:MM' -> Date
export function atClock(key, hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(`${key}T00:00:00`)
  d.setHours(h, m, 0, 0)
  return d
}
