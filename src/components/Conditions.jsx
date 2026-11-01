import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Conditions({ profile, onChange }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [conditions, setConditions] = useState([])
  const [medicines, setMedicines] = useState([])

  useEffect(() => {
    async function load() {
      const { data: conds } = await supabase
        .from('conditions')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
      
      const { data: meds } = await supabase
        .from('medicines')
        .select('condition_id')
        .eq('profile_id', profile.id)

      if (conds) setConditions(conds)
      if (meds) setMedicines(meds)
    }
    load()
  }, [profile.id])

  const add = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    const { data, error } = await supabase
      .from('conditions')
      .insert({
        user_id: user.id,
        profile_id: profile.id,
        name: name.trim()
      })
      .select()

    if (!error && data) {
      setConditions(prev => [...data, ...prev])
      setName('')
      // FIX 1: Home + Detail ke janacchi
      window.dispatchEvent(new CustomEvent('conditions-updated'))
      if (onChange) onChange()
    } else {
      alert(error?.message)
    }
  }

  const remove = async (id) => {
    await supabase.from('medicines').update({ condition_id: null }).eq('condition_id', id)
    const { error } = await supabase.from('conditions').delete().eq('id', id)
    if (!error) {
      setConditions(conditions.filter((d) => d.id !== id))
      // FIX 2: delete er por o janacchi
      window.dispatchEvent(new CustomEvent('conditions-updated'))
      if (onChange) onChange()
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold">
          {t('conditions.title')}
        </h2>
        <span className="rounded-full bg-coral-light px-2.5 py-0.5 text-xs font-medium text-coral">
          {conditions.length}
        </span>
      </div>

      <form onSubmit={add} className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-canvas p-1.5 focus-within:border-teal focus-within:bg-white">
        <input
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-ink/40"
          placeholder={t('conditions.placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="rounded-lg bg-teal px-3.5 py-1.5 text-sm font-medium text-white hover:bg-teal-dark">
          {t('common.add')}
        </button>
      </form>

      {conditions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center">
          <p className="text-sm font-medium text-ink/60">{t('conditions.empty')}</p>
          <p className="mt-1 text-xs text-ink/40">{t('conditions.emptyDesc')}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {conditions.map((d) => {
            const n = medicines.filter((m) => m.condition_id === d.id).length
            return (
              <li key={d.id} className="flex items-center gap-3 rounded-xl border border-teal/15 bg-white px-3.5 py-2.5 cursor-default">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-coral" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{d.name}</span>
                  <span className="text-xs text-ink/50">{n} {t('medicines.title').toLowerCase()}</span>
                </span>
                <button type="button" onClick={() => remove(d.id)} className="flex h-7 w-7 items-center justify-center rounded-full text-ink/40 hover:bg-canvas hover:text-coral">×</button>
              </li>
            ) 
          })}
        </ul>
      )}
    </div>
  )
}