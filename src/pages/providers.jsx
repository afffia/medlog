import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Stethoscope, Plus } from 'lucide-react'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { inputCls, btnCls } from '../constants.js'

const norm = (s) => (s || '').trim().toLowerCase()

export default function Providers() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [reports, setReports] = useState([])
  const [meds, setMeds] = useState([])
  const [vitals, setVitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')

  useEffect(() => {
    async function load() {
      if (!user) return
      const [r, m, v] = await Promise.all([
        supabase.from('reports').select('id,provider').eq('user_id', user.id),
        supabase.from('medicines').select('*').eq('user_id', user.id),
        supabase.from('vitals').select('id,provider').eq('user_id', user.id),
      ])
      // m / v can fail before features_schema.sql is run; the list still works from reports
      setReports(r.data || [])
      setMeds(m.data || [])
      setVitals(v.error ? [] : v.data || [])
      setLoading(false)
    }
    load()
  }, [user])

  const providers = useMemo(() => {
    const map = new Map()
    const touch = (raw, field) => {
      const key = norm(raw)
      if (!key) return
      if (!map.has(key)) map.set(key, { key, name: raw.trim(), reports: 0, meds: 0, vitals: 0 })
      map.get(key)[field] += 1
    }
    reports.forEach((r) => touch(r.provider, 'reports'))
    meds.forEach((m) => touch(m.doctor, 'meds'))
    vitals.forEach((v) => touch(v.provider, 'vitals'))
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [reports, meds, vitals])

  const openProvider = (n) => navigate(`/providers/${encodeURIComponent(n)}`)

  function handleAdd(e) {
    e.preventDefault()
    if (name.trim()) openProvider(name.trim())
  }

  return (
    <div className="w-full">
      <header className="mb-6">
        <h2 className="font-serif text-2xl">{t('providers.title')}</h2>
        <p className="mt-1 text-sm text-ink/50">{t('providers.subtitle')}</p>
      </header>

      <form onSubmit={handleAdd} className="mb-6 flex max-w-md gap-2">
        <input className={inputCls} value={name} placeholder={t('providers.addPlaceholder')} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className={`${btnCls} flex shrink-0 items-center gap-1.5`}>
          <Plus size={15} />{t('common.add')}
        </button>
      </form>

      {loading ? (
        <p className="py-16 text-center text-sm text-ink/40">{t('common.loading')}</p>
      ) : providers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink/50">{t('providers.empty')}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {providers.map((p) => (
            <li key={p.key}>
              <button type="button" onClick={() => openProvider(p.name)} className="flex w-full items-center gap-4 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-teal">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-light text-teal-dark">
                  <Stethoscope size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-lg font-semibold">{p.name}</span>
                  <span className="block text-xs text-ink/60">
                    {p.reports} {t('providers.reports').toLowerCase()} · {p.meds} {t('providers.medicines').toLowerCase()} · {p.vitals} {t('providers.vitals').toLowerCase()}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
