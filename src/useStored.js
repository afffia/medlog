import { useEffect, useState } from 'react'

export function useStored(key, initial) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial } catch { return initial }
  })
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* ignore */ }
  }, [key, val])
  return [val, setVal]
}
