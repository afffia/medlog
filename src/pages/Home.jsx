import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Avatar from '../components/Avatar'
import { BLOOD, todayKey, inputCls, btnCls } from '../constants'
import { readPhoto } from '../readPhoto'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Home({ profiles, onOpen, onAdd }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ name: '', age: '', blood: '', photo: '' })
  const [sbCounts, setSbCounts] = useState({})

  useEffect(() => {
    if (profiles && profiles.length === 0) setAdding(true)
    else if (profiles && profiles.length > 0) setAdding(false)
  }, [profiles])

  useEffect(() => {
    async function loadCounts() {
      if (!user?.id || !profiles?.length) return
      const ids = profiles.map(p => p.id)
      const today = todayKey()

      const [condsRes, medsRes, logsRes] = await Promise.all([
        supabase.from('conditions').select('profile_id').in('profile_id', ids),
        supabase.from('medicines').select('profile_id, times').in('profile_id', ids),
        supabase.from('today_logs').select('profile_id').eq('log_date', today).eq('taken', true).in('profile_id', ids)
      ])

      if(condsRes.error) console.error(condsRes.error.message)
      if(medsRes.error) console.error(medsRes.error.message)

      const map = {}
      ids.forEach(id => {
        const conds = condsRes.data?.filter(c => c.profile_id === id) || []
        const meds = medsRes.data?.filter(m => m.profile_id === id) || []
        map[id] = {
          condCount: conds.length,
          medCount: meds.length,
          doses: meds.reduce((n, m) => n + (m.times?.length || 0), 0),
          taken: logsRes.data?.filter(l => l.profile_id === id).length || 0
        }
      })
      setSbCounts(map)
    }
    loadCounts()
    const h = () => loadCounts()
    window.addEventListener('medicines-updated', h)
    window.addEventListener('conditions-updated', h)
    window.addEventListener('today-logs-updated', h)
    return () => {
      window.removeEventListener('medicines-updated', h)
      window.removeEventListener('conditions-updated', h)
      window.removeEventListener('today-logs-updated', h)
    }
  }, [user, profiles])

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (file) setF({ ...f, photo: await readPhoto(file) })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    await onAdd({ ...f, name: f.name.trim() })
    setF({ name: '', age: '', blood: '', photo: '' })
    setAdding(false)
  }

  const sortedProfiles = [...(profiles || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-teal-dark">{t('family.title')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('family.subtitle')}</p>
        </div>
        <button onClick={() => setAdding((v) => !v)} className={btnCls}>{adding ? t('common.cancel') : t('family.addProfile')}</button>
      </header>

      {adding ? (
        <div className="w-full">
          <form onSubmit={submit} className="flex w-full flex-wrap items-start gap-5 rounded-2xl border border-line bg-white p-5">
            <label className="cursor-pointer text-center text-xs text-ink/60">
              <Avatar p={{ name: f.name || '+', photo: f.photo }} size="h-[160px] w-full sm:w-[180px]" text="text-3xl" />
              <span className="mt-2 block text-teal">{f.photo ? t('family.changePhoto') : t('family.addPhoto')}</span>
              <input type="file" accept="image/*" className="sr-only" onChange={pickPhoto} />
            </label>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <input className={`${inputCls} sm:col-span-2`} placeholder={t('family.namePlaceholder')} value={f.name} autoFocus onChange={(e) => setF({ ...f, name: e.target.value })} />
              <input className={inputCls} placeholder={t('family.agePlaceholder')} inputMode="numeric" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value.replace(/\D/g, '') })} />
              <select className={inputCls} value={f.blood} onChange={(e) => setF({ ...f, blood: e.target.value })}>
                <option value="">{t('family.bloodPlaceholder')}</option>
                {BLOOD.map((b) => <option key={b}>{b}</option>)}
              </select>
              <div className="sm:col-span-2"><button className={btnCls}>{t('family.create')}</button></div>
            </div>
          </form>
        </div>
      ) : profiles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink/60">{t('family.noProfiles')}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {sortedProfiles.map((p) => {
            const c = sbCounts[p.id]
            const condCount = c?.condCount ?? p.diseases?.length ?? 0
            const medCount = c?.medCount ?? p.medicines?.length ?? 0
            const doses = c?.doses ?? 0
            const taken = c?.taken ?? 0
            return (
              <li key={p.id}>
                <div className="flex h-full gap-5 rounded-2xl border border-line bg-white p-5">
                  <Avatar p={p} size="h-[90px] w-[90px]" text="text-2xl" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h2 className="truncate font-serif text-xl font-semibold">{p.name}</h2>
                    <p className="mt-1 text-sm text-ink/60">{p.age ? `${t('family.age')}: ${p.age}` : t('family.ageNotSet')}</p>
                    <p className="text-sm text-ink/60">{p.blood ? `${t('family.blood')}: ${p.blood}` : t('family.bloodNotSet')}</p>
                    <p className="mt-3 text-xs text-ink/60">
                      {condCount} {t('conditions.title').toLowerCase()}, {medCount} {t('medicines.title').toLowerCase()}
                      {doses > 0 && <span className={taken >= doses ? 'text-teal' : 'text-amber'}>, {taken}/{doses} {t('today.taken').toLowerCase()}</span>}
                    </p>
                    <div className="mt-auto flex justify-start pt-3">
                      <button onClick={() => onOpen(p.id)} className="rounded-lg border border-teal px-3 py-1 text-xs font-medium text-teal transition-colors hover:bg-teal hover:text-white">{t('family.viewDetails')}</button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}