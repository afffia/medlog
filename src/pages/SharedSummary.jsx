import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HeartPulse, AlertCircle, Droplet, Scan, Pill, Stethoscope } from 'lucide-react'
import { supabase } from '../supabaseClient.js'
import { CATEGORIES } from '../mockData.js'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'

const ICONS = { droplet: Droplet, scan: Scan, pill: Pill, stethoscope: Stethoscope }

export default function SharedSummary() {
  const { token } = useParams()
  const { t } = useTranslation()
  const [reports, setReports] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.rpc('get_shared_summary', { p_token: token })

      if (error) {
        setError(t('shared.genericError'))
      } else if (!data || data.length === 0) {
        setError(t('shared.notFound'))
      } else {
        setReports(data)
      }
    }
    load()
  }, [token, t])

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-teal-light flex items-center justify-center mb-3">
            <HeartPulse size={22} className="text-teal-dark" strokeWidth={2} />
          </div>
          <h1 className="font-serif text-xl text-teal-dark">{t('shared.heading')}</h1>
          <p className="text-sm text-ink/50 mt-1">{t('shared.via')}</p>
        </div>

        {error && (
          <div className="bg-coral-light border border-coral/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-coral shrink-0 mt-0.5" />
            <p className="text-sm text-ink/70">{error}</p>
          </div>
        )}

        {!error && !reports && (
          <p className="text-center text-sm text-ink/40">{t('shared.loading')}</p>
        )}

        {reports && (
          <div className="flex flex-col gap-3">
            {reports.map((r, i) => {
              const meta = CATEGORIES[r.category] ?? { icon: 'stethoscope' }
              const Icon = ICONS[meta.icon]
              return (
                <div key={i} className="bg-white rounded-xl border border-line px-4 py-3.5">
                  <div className="flex items-center gap-3 mb-1">
                    <Icon size={16} className="text-teal-dark shrink-0" />
                    <p className="text-sm font-medium">{r.title}</p>
                  </div>
                  <p className="text-xs text-ink/50 ml-7">
                    {r.provider ?? t('shared.unknownProvider')} {r.facility ? `· ${r.facility}` : ''} ·{' '}
                    {new Date(r.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {r.notes && <p className="text-xs text-ink/60 mt-2 ml-7">{r.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
