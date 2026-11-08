// Thin wrapper over the browser Notification API.
export const notifSupported = () => typeof window !== 'undefined' && 'Notification' in window

// 'granted' | 'denied' | 'default' | 'unsupported'
export const notifPermission = () => (notifSupported() ? Notification.permission : 'unsupported')

// Browsers only expose notifications on https:// pages and on localhost.
export const isSecurePage = () => typeof window !== 'undefined' && window.isSecureContext

export async function requestNotifPermission() {
  if (!notifSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export async function showNotification(title, body, tag) {
  if (notifPermission() !== 'granted') return false
  try {
    new Notification(title, { body, tag })
    return true
  } catch { /* phones throw here; fall through to the service worker */ }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, { body, tag })
      return true
    }
  } catch { /* ignore */ }
  return false
}
