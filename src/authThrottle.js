// Client-side brake on repeated failed sign-ins / sign-ups.
//
// This is a UX deterrent only: anyone can clear localStorage or call Supabase
// directly. The real protection is Supabase's server-side Auth rate limits
// (Dashboard -> Authentication -> Rate Limits). See SECURITY.md.
//
// Functions take `store` (anything with getItem/setItem/removeItem) so they can
// be tested without a browser.

export const MAX_FAILURES = 5
export const WINDOW_MS = 15 * 60 * 1000
const BASE_LOCK_MS = 60 * 1000
const MAX_LOCK_MS = 15 * 60 * 1000
const keyFor = (name) => `medlog_auth_${name}`

function read(name, store) {
  try {
    const s = JSON.parse(store.getItem(keyFor(name)))
    return { fails: Array.isArray(s?.fails) ? s.fails : [], lockedUntil: Number(s?.lockedUntil) || 0 }
  } catch {
    return { fails: [], lockedUntil: 0 }
  }
}
function write(name, state, store) {
  try { store.setItem(keyFor(name), JSON.stringify(state)) } catch { /* ignore */ }
}

// -> { blocked: boolean, seconds: number }
export function checkThrottle(name, store = globalThis.localStorage, now = Date.now()) {
  const { lockedUntil } = read(name, store)
  if (lockedUntil > now) return { blocked: true, seconds: Math.ceil((lockedUntil - now) / 1000) }
  return { blocked: false, seconds: 0 }
}

export function recordFailure(name, store = globalThis.localStorage, now = Date.now()) {
  const state = read(name, store)
  const fails = [...state.fails.filter((t) => now - t < WINDOW_MS), now]
  let lockedUntil = state.lockedUntil > now ? state.lockedUntil : 0
  if (fails.length >= MAX_FAILURES) {
    // 1 min on the 5th failure, then 2, 4, 8... capped at 15 min
    const lock = Math.min(BASE_LOCK_MS * 2 ** (fails.length - MAX_FAILURES), MAX_LOCK_MS)
    lockedUntil = now + lock
  }
  write(name, { fails, lockedUntil }, store)
  return checkThrottle(name, store, now)
}

export function clearFailures(name, store = globalThis.localStorage) {
  try { store.removeItem(keyFor(name)) } catch { /* ignore */ }
}
