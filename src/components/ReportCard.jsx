import { Link } from 'react-router-dom'
import { Droplet, Scan, Pill, Stethoscope } from 'lucide-react'
import { CATEGORIES } from '../mockData.js'

const ICONS = { droplet: Droplet, scan: Scan, pill: Pill, stethoscope: Stethoscope }
const COLOR_CLASSES = {
  teal: 'bg-teal-light text-teal-dark',
  amber: 'bg-amber-light text-amber',
  coral: 'bg-coral-light text-coral',
}

export default function ReportCard({ report, selectable, selected, onToggle }) {
  const meta = CATEGORIES[report.category]
  const Icon = ICONS[meta.icon]
  const dateLabel = new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const content = (
    <div className="flex items-center gap-4 bg-white rounded-xl border border-line px-4 py-3.5 hover:border-teal/40 transition-colors">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${COLOR_CLASSES[meta.color]}`}>
        <Icon size={17} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{report.title}</p>
        <p className="text-xs text-ink/50 truncate">{report.provider} &middot; {report.facility}</p>
      </div>
      <span className="text-xs text-ink/40 shrink-0">{dateLabel}</span>
      {selectable && (
        <input type="checkbox" checked={selected} onChange={onToggle} className="w-4 h-4 accent-teal shrink-0" />
      )}
    </div>
  )

  if (selectable) {
    return <div onClick={onToggle} className="cursor-pointer">{content}</div>
  }

  return <Link to={`/reports/${report.id}`} className="block">{content}</Link>
}
