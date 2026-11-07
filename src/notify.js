// Thin wrapper over the browser Notification API.
export const notifSupported = () => typeof window !== 'undefined' && 'Notification' in window

// 'granted' | 'denied' | 'default' | 'unsupported'
export const notifPermission = () => (notifSupported() ? Notification.permission : 'unsupported')

export async function requestNotifPermission() {
  if (!notifSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function showNotification(title, body, tag) {
  if (notifPermission() !== 'granted') return false
  try {
    new Notification(title, { body, tag })
    return true
  } catch {
    return false
  }
}
