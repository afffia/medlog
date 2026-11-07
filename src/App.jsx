import { Routes, Route, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Timeline from './pages/Timeline.jsx'
import Upload from './pages/Upload.jsx'
import CreateSummary from './pages/CreateSummary.jsx'
import SharedSummary from './pages/SharedSummary.jsx'
import Placeholder from './pages/Placeholder.jsx'
import Home from './pages/Home.jsx'
import Detail from './pages/Detail.jsx'
import { supabase } from './supabaseClient'
import { useAuth } from './context/AuthContext'

function DetailWrapper() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (data) {
        setProfile(data)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const removeProfile = async () => {
    if (!confirm(t('family.deleteConfirm', { name: profile?.name }))) return
    
    await supabase.from('today_logs').delete().eq('profile_id', id)
    await supabase.from('medicines').delete().eq('profile_id', id)
    await supabase.from('conditions').delete().eq('profile_id', id)
    await supabase.from('profiles').delete().eq('id', id)
    navigate('/family')
  }

  if (loading) return <div className="p-5">Loading...</div>
  if (!profile) return <div className="p-5">{t('family.notFound')}</div>

  return <Detail profile={profile} onBack={() => navigate('/family')} onRemove={removeProfile} />
}

function FamilyWrapper() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if(!user) return
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).order('created_at', {ascending: true})
      if(data) setProfiles(data)
      setLoading(false)
    }
    load()
  }, [user])

  const addProfile = async (formData) => {
    const { data, error } = await supabase.from('profiles').insert({
      user_id: user.id,
      name: formData.name.trim(),
      age: formData.age ? parseInt(formData.age) : null,
      blood: formData.blood,
      photo: formData.photo || null,
    }).select()
    if(error){
      alert("Add fail: " + error.message)
      return
    }
    if(data) setProfiles(prev => [...prev, data[0]])
  }

  if(loading) return <div className="p-5">Loading...</div>
  return <Home profiles={profiles} onOpen={(id) => navigate(`/family/${id}`)} onAdd={addProfile} />
}

export default function App() {
  const { t } = useTranslation()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/shared/:token" element={<SharedSummary />} />
      <Route path="/" element={<ProtectedRoute><Layout><Timeline /></Layout></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute><Layout><Upload /></Layout></ProtectedRoute>} />
      <Route path="/summaries/new" element={<ProtectedRoute><Layout><CreateSummary /></Layout></ProtectedRoute>} />
      <Route path="/reports/:id" element={<ProtectedRoute><Layout><Placeholder title={t('placeholder.reportDetail')} /></Layout></ProtectedRoute>} />
      <Route path="/family" element={<ProtectedRoute><Layout><FamilyWrapper /></Layout></ProtectedRoute>} />
      <Route path="/family/:id" element={<ProtectedRoute><Layout><DetailWrapper /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><Placeholder title={t('placeholder.settingsTitle')} /></Layout></ProtectedRoute>} />
    </Routes>
  )
}