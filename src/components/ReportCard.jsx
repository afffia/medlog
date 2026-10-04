import { Scan, Pill, Stethoscope, Droplet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CATEGORIES } from '../mockData.js'

const ICONS = {
  droplet: Droplet,
  scan: Scan,
  pill: Pill,
  stethoscope: Stethoscope,
}

const COLOR_CLASSES = {
  teal: 'bg-teal-light text-teal-dark',
  amber: 'bg-amber-light text-amber',
  coral: 'bg-coral-light text-coral',
}

const FOLDER_COLORS_PREVIEW = {
  teal: 'bg-teal-light text-teal-dark',
  amber: 'bg-amber-light text-amber',
  coral: 'bg-coral-light text-coral',
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
}

export default function ReportCard({ report = {}, onOpen, onEdit, onDelete }) {
  const { t, i18n } = useTranslation()
  
  const meta = CATEGORIES?.[report.category]
  const Icon = meta ? ICONS[meta.icon] || Droplet : Droplet

  const categoryLabel = report.category
    ? t(`categories.${report.category}`, report.category)
    : ''

  const doctorName = (report.doctor || report.doctor_name || report.provider || '').trim()

  const filesCount = Array.isArray(report.files)
    ? report.files.length
    : Array.isArray(report.items)
      ? report.items.length
      : Number(report.files_count) || 0

  const dateLabel = report.date
    ? new Date(report.date).toLocaleDateString(
        i18n.language === 'bn' ? 'bn-BD' : 'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }
      )
    : ''

  const metaLine = [categoryLabel, dateLabel].filter(Boolean).join(' · ')

  const iconColorClass =
    report.color && FOLDER_COLORS_PREVIEW[report.color]
      ? FOLDER_COLORS_PREVIEW[report.color]
      : meta?.color && COLOR_CLASSES[meta.color]
        ? COLOR_CLASSES[meta.color]
        : 'bg-teal-light text-teal-dark'

  function handleCardClick() {
    if (typeof onOpen === 'function') onOpen(report)
  }

  function handleCardKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCardClick()
    }
  }

  function handleEditClick(event) {
    event.stopPropagation()
    if (typeof onEdit === 'function') onEdit(report)
  }

  function handleDeleteClick(event) {
    event.stopPropagation()
    if (typeof onDelete === 'function') onDelete(report)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      aria-label={`${t('reportCard.open')} ${report.title || t('reportCard.untitled')}`}
      className="
        bg-white border border-line rounded-[14px]
        p-3.5 w-full cursor-pointer
        hover:border-teal
        active:scale-[0.99]
        transition-all duration-150
        focus:outline-none
        focus:ring-2 focus:ring-teal/40
      "
    >
      <div className="flex items-center gap-3">
        <div className={`w-[42px] h-[42px] rounded-xl shrink-0 flex items-center justify-center ${iconColorClass}`}>
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink leading-tight truncate">
            {report.title || t('reportCard.untitled')}
          </h3>

          {metaLine && <p className="text-xs text-ink/50 mt-1 truncate">{metaLine}</p>}

          {(doctorName || report.facility) && (
            <p className="text-xs text-ink/50 mt-0.5 truncate">
              {doctorName}
              {doctorName && report.facility && ' · '}
              {report.facility}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs">
        <span className="text-ink/50">
          {filesCount} {filesCount === 1 ? t('common.file') : t('common.files')}
        </span>

        <button
          type="button"
          onClick={handleEditClick}
          className="text-ink/50 hover:text-teal-dark transition-colors"
        >
          {t('common.edit')}
        </button>

        <button
          type="button"
          onClick={handleDeleteClick}
          className="text-coral hover:text-coral/70 transition-colors"
        >
          {t('common.remove')}
        </button>
      </div>
    </div>
  )
}