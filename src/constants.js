export const SLOTS = [
  {
    id: 'morning',
    label: 'Morning',
    icon: ' ',
    bg: 'bg-amber-light',
    text: 'text-amber',
    dot: 'bg-amber',
  },
  {
    id: 'noon',
    label: 'Noon',
    icon: ' ',
    bg: 'bg-coral-light',
    text: 'text-coral',
    dot: 'bg-coral',
  },
  {
    id: 'night',
    label: 'Night',
    icon: ' ',
    bg: 'bg-teal-light',
    text: 'text-teal',
    dot: 'bg-teal',
  },
]

export const BLOOD = [
  'A+', 'A-', 'B+', 'B-',
  'AB+', 'AB-', 'O+', 'O-',
]

export const uid = () => Math.random().toString(36).slice(2, 9)

export const todayKey = () => new Date().toLocaleDateString('en-CA')
export const inputCls =
  'w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal transition-all'
export const btnCls =
  'rounded-xl bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark active:bg-teal-dark transition-colors'
export const cardCls =
  'rounded-2xl border border-line bg-white p-4 shadow-sm'

export const badgeCls =
  'rounded-full px-3 py-1 text-xs font-medium'