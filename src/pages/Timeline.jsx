import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Share2 } from 'lucide-react'
import { CATEGORIES } from '../mockData.js'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import ReportCard from '../components/ReportCard.jsx'

export default function Timeline() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [filter, setFilter] = useState('all')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const FILTERS = [
    { key: 'all', label: t('timeline.filters.all') },
    ...Object.keys(CATEGORIES).map((key) => ({ key, label: t(`categories.${key}`) })),
  ]

  useEffect(() => {
    async function loadReports() {
      setLoading(true)
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('report_date', { ascending: false })

      if (error) setError(error.message)
      else setReports(data)
      setLoading(false)
    }
    if (user) loadReports()
  }, [user])

  const filtered = useMemo(
    () => reports.filter((r) => filter === 'all' || r.category === filter),
    [reports, filter],
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl">{t('timeline.title')}</h2>
          <p className="text-sm text-ink/50 mt-1">
            {loading
              ? t('timeline.loading')
              : t('timeline.reportCount', { count: reports.length, categories: Object.keys(CATEGORIES).length })}
          </p>
        </div>
        <Link to="/summaries/new" className="flex items-center gap-2 bg-coral text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-coral/90 transition-colors">
          <Share2 size={16} />
          {t('timeline.createSummary')}
        </Link>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f.key ? 'bg-teal-dark text-white border-teal-dark' : 'border-line text-ink/60 hover:border-teal/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-coral bg-coral-light rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {loading ? (
        <div className="text-center py-16 text-ink/40 text-sm">{t('timeline.loadingReports')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-ink/40 text-sm">
          {reports.length === 0 ? (
            <>{t('timeline.noReportsYet')} <Link to="/upload" className="text-teal-dark font-medium">{t('timeline.uploadFirst')}</Link>.</>
          ) : (
            t('timeline.noReportsInCategory')
          )}
        </div>
      ) : (
        <div className="relative pl-4">
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-line" aria-hidden="true" />
          <div className="flex flex-col gap-4">
            {filtered.map((report) => (
              <div key={report.id} className="relative">
                <div className="absolute -left-[19px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-teal border-2 border-canvas" />
                <ReportCard report={{ ...report, date: report.report_date }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
