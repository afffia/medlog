import { useTranslation } from 'react-i18next'
import { fmtDate } from '../dates.js'

const W = 320
const H = 170
const PAD = { l: 40, r: 14, t: 14, b: 30 }
const TEAL = '#1F6F5C'
const CORAL = '#E2734F'

// Dependency-free line chart. points: [{ date: 'YYYY-MM-DD', v, v2? }]
export default function TrendChart({ points, unit, label, label2 }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const data = [...points].sort((a, b) => (a.date < b.date ? -1 : 1))
  if (data.length === 0) return null

  const ys = data.flatMap((p) => (p.v2 != null ? [p.v, p.v2] : [p.v]))
  let lo = Math.min(...ys)
  let hi = Math.max(...ys)
  if (lo === hi) { lo -= 1; hi += 1 }
  const pad = (hi - lo) * 0.12
  lo -= pad
  hi += pad

  const t0 = new Date(`${data[0].date}T00:00:00`).getTime()
  const t1 = new Date(`${data[data.length - 1].date}T00:00:00`).getTime()
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const x = (d) => {
    if (t1 === t0) return PAD.l + innerW / 2
    return PAD.l + ((new Date(`${d}T00:00:00`).getTime() - t0) / (t1 - t0)) * innerW
  }
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * innerH
  const line = (key) =>
    data.filter((p) => p[key] != null).map((p) => `${x(p.date).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
  const fmtY = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10)
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad]
  const hasSecond = data.some((p) => p.v2 != null)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${label} (${unit})`}>
        {ticks.map((tv, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(tv)} y2={y(tv)} stroke="#E1DED4" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(tv) + 3} textAnchor="end" fontSize="9" fill="#26312E" fillOpacity="0.5">{fmtY(tv)}</text>
          </g>
        ))}
        {hasSecond && <polyline points={line('v2')} fill="none" stroke={CORAL} strokeWidth="2" strokeLinejoin="round" />}
        <polyline points={line('v')} fill="none" stroke={TEAL} strokeWidth="2" strokeLinejoin="round" />
        {data.map((p, i) => (
          <g key={i}>
            <circle cx={x(p.date)} cy={y(p.v)} r="3.5" fill={TEAL}>
              <title>{`${fmtDate(p.date, lang)}: ${p.v}${p.v2 != null ? `/${p.v2}` : ''} ${unit}`}</title>
            </circle>
            {p.v2 != null && <circle cx={x(p.date)} cy={y(p.v2)} r="3.5" fill={CORAL} />}
          </g>
        ))}
        <text x={PAD.l} y={H - 8} fontSize="9" fill="#26312E" fillOpacity="0.5">{fmtDate(data[0].date, lang)}</text>
        {data.length > 1 && (
          <text x={W - PAD.r} y={H - 8} textAnchor="end" fontSize="9" fill="#26312E" fillOpacity="0.5">
            {fmtDate(data[data.length - 1].date, lang)}
          </text>
        )}
      </svg>
      <div className="mt-1 flex items-center gap-4 text-xs text-ink/60">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: TEAL }} />{label}</span>
        {hasSecond && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CORAL }} />{label2}</span>}
        <span className="ml-auto">{unit}</span>
      </div>
    </div>
  )
}
