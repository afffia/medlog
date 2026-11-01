export default function Avatar({ p, size = 'h-40 w-32', text = 'text-4xl' }) {
  return p.photo ? (
    <img src={p.photo} alt={p.name} className={`${size} shrink-0 rounded-xl object-cover border border-line`} />
  ) : (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-xl bg-white border border-line font-serif ${text} text-teal-dark`}>
      {p.name.slice(0, 1).toUpperCase() || '+'}
    </span>
  )
}