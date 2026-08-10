import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link2, Check } from 'lucide-react'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import ReportCard from '../components/ReportCard.jsx'

const EXPIRY_DAYS = 7

export default function CreateSummary() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [shareUrl, setShareUrl] = useState(null)

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

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCreate() {
    setError(null)
    setCreating(true)

    try {
      const token = crypto.randomUUID().replace(/-/g, '')
      const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabase.from('summary_shares').insert({
        user_id: user.id,
        token,
        report_ids: Array.from(selected),
        expires_at: expiresAt,
      })

      if (error) throw error

      setShareUrl(`${window.location.origin}/shared/${token}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="font-serif text-2xl mb-1">{t('summary.title')}</h2>
      <p className="text-sm text-ink/50 mb-6">{t('summary.subtitle', { days: EXPIRY_DAYS })}</p>

      {error && (
        <p className="text-xs text-coral bg-coral-light rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {loading ? (
        <div className="text-center py-12 text-ink/40 text-sm">{t('summary.loading')}</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-ink/40 text-sm">{t('summary.noReports')}</div>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              report={{ ...r, date: r.report_date }}
              selectable
              selected={selected.has(r.id)}
              onToggle={() => toggle(r.id)}
            />
          ))}
        </div>
      )}

      {!shareUrl ? (
        <button
          onClick={handleCreate}
          disabled={selected.size === 0 || creating}
          className="flex items-center gap-2 bg-coral text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-coral/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Link2 size={16} />
          {creating ? t('summary.generating') : t('summary.generate', { count: selected.size })}
        </button>
      ) : (
        <div className="bg-teal-light border border-teal/30 rounded-xl p-4 flex items-start gap-3">
          <Check size={18} className="text-teal-dark shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-teal-dark">{t('summary.created')}</p>
            <p className="text-xs text-ink/60 mt-1 break-all">{shareUrl}</p>
            <p className="text-xs text-ink/40 mt-1">{t('summary.expiresIn', { days: EXPIRY_DAYS, count: selected.size })}</p>
          </div>
        </div>
      )}
    </div>
  )
}
