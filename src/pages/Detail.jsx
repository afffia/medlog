import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../supabaseClient.js'
import Avatar from '../components/Avatar'
import Today from '../components/Today'
import Conditions from '../components/Conditions'
import Medicines from '../components/Medicine'

export default function Detail({ profile: initialProfile, onBack, onRemove }) {
  const { t } = useTranslation()
  
  const [profile, setProfile] = useState(initialProfile)
  const [conditions, setConditions] = useState([])
  const [medicines, setMedicines] = useState([])
  const [todayLogs, setTodayLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // FIX: sob data Supabase theke ek jaygay
  const loadDetailData = useCallback(async () => {
    if (!initialProfile?.id) return
    setLoading(true)
    const today = new Date().toISOString().split('T')[0] 
    
    const [profileRes, condRes, medRes, logsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', initialProfile.id).single(),
      supabase.from('conditions').select('*').eq('profile_id', initialProfile.id).order('created_at', { ascending: false }),
      supabase.from('medicines').select('*').eq('profile_id', initialProfile.id).order('created_at', { ascending: false }),
      supabase.from('today_logs').select('*').eq('profile_id', initialProfile.id).eq('log_date', today)
    ])

    if (profileRes.data) setProfile(profileRes.data)
    if (condRes.error) console.error("conditions error", condRes.error.message)
    if (medRes.error) console.error("medicines error", medRes.error.message)
    if (logsRes.error) console.error("today_logs error", logsRes.error.message)

    setConditions(condRes.data || [])
    setMedicines(medRes.data || [])
    setTodayLogs(logsRes.data?.filter(l => l.taken) || [])
    setLoading(false)
  }, [initialProfile?.id])

  useEffect(() => {
    loadDetailData()
  }, [loadDetailData])

  const handleDataChange = useCallback(() => {
    loadDetailData()
    window.dispatchEvent(new Event('medicines-updated'))
    window.dispatchEvent(new Event('conditions-updated'))
    window.dispatchEvent(new Event('today-logs-updated'))
  }, [loadDetailData])

  const handleDeleteProfile = async () => {
    if (!confirm(t('family.deleteConfirm', { name: profile.name }))) return
    const { error } = await supabase.from('profiles').delete().eq('id', profile.id)
    if (!error) {
      onRemove()
    } else {
      alert(error.message)
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-sm text-ink/40">{t('timeline.loading')}</div>
  }

  const totalDoses = medicines.reduce((n,m)=>n+(m.times?.length||0),0)

  return (
    <div className="w-full">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-teal hover:bg-canvas"
        >
          ←
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5">
        <div className="flex items-center gap-4">
          <Avatar p={profile} size="h-16 w-16" text="text-2xl" />
          <div>
            <h1 className="font-serif text-2xl font-semibold">{profile.name}</h1>
            <p className="text-sm text-ink/60">
              {profile.age ? `${t('family.age')}: ${profile.age}` : ''}
              {profile.blood ? `, ${t('family.bloodGroup')}: ${profile.blood}` : ''}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              {conditions.length} {t('conditions.title').toLowerCase()}, {medicines.length} {t('medicines.title').toLowerCase()}, {todayLogs.length}/{totalDoses} {t('today.taken').toLowerCase()}
            </p>
          </div>
        </div>
        <button onClick={handleDeleteProfile} className="text-sm text-coral hover:underline">
          {t('common.delete')}
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <section className="w-full">
          <Today profile={profile} onChange={handleDataChange} />
        </section>
        <section className="w-full">
          <Conditions profile={profile} onChange={handleDataChange} />
        </section>
        <section className="w-full">
          <Medicines profile={profile} onChange={handleDataChange} />
        </section>
      </div>
    </div>
  )
}