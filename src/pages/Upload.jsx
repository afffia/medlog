import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UploadCloud, Plus, X, ChevronDown } from 'lucide-react'
import { CATEGORIES } from '../mockData.js'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Upload() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('bloodwork')
  const [provider, setProvider] = useState('')
  const [facility, setFacility] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [customCats, setCustomCats] = useState([])
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!user) return
    async function loadCats() {
      const { data } = await supabase.from('categories').select('name').eq('user_id', user.id).order('created_at', { ascending: true })
      if (data) setCustomCats(data.map(d => d.name))
    }
    loadCats()
  }, [user])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const allCategories = [...Object.keys(CATEGORIES), ...customCats]

  async function handleAddCategory() {
    const raw = newCatName.trim()
    if (!raw) return
    const name = raw
    const existing = allCategories.find(c => c.toLowerCase() === name.toLowerCase())
    if (existing) {
      setCategory(existing)
      setShowAddCat(false)
      setNewCatName('')
      return
    }
    const { error } = await supabase.from('categories').insert({ user_id: user.id, name })
    if (error && error.code !== '23505') { setError(error.message); return }
    setCustomCats(prev => [...prev, name])
    setCategory(name)
    setShowAddCat(false)
    setNewCatName('')
  }

  async function handleDeleteCustom(e, catToDelete) {
    e.stopPropagation()
    if (!window.confirm(`"${catToDelete}" delete korte chao?`)) return

    const { data } = await supabase.from('reports').select('id').eq('user_id', user.id).eq('category', catToDelete).limit(1)
    if (data && data.length > 0) {
      alert('Ei category te report ache. Age report delete koro.')
      return
    }
    const { error } = await supabase.from('categories').delete().eq('user_id', user.id).eq('name', catToDelete)
    if (error) { setError(error.message); return }
    setCustomCats(prev => prev.filter(c => c !== catToDelete))
    if (category === catToDelete) setCategory('bloodwork')
  }

  function getCategoryLabel(key) {
    if (CATEGORIES[key]) return t(`categories.${key}`)
    return key
  }

  return (
    <div className="max-w-lg">
      <h2 className="font-serif text-2xl mb-1">{t('upload.title')}</h2>
      <p className="text-sm text-ink/50 mb-6">{t('upload.subtitle')}</p>
      {error && <p className="text-xs text-coral bg-coral-light rounded-lg px-3 py-2 mb-4">{error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); setError(null); setSaving(true); (async () => { try { let filePath = null; if (file) { const ext = file.name.split('.').pop(); const safeName = `${crypto.randomUUID()}.${ext}`; filePath = `${user.id}/${safeName}`; const { error: upErr } = await supabase.storage.from('reports').upload(filePath, file); if (upErr) throw upErr } const { error: insErr } = await supabase.from('reports').insert({ user_id: user.id, title, category, provider: provider || null, facility: facility || null, report_date: reportDate, notes: notes || null, file_path: filePath }); if (insErr) throw insErr; navigate('/') } catch (err) { setError(err.message) } finally { setSaving(false) } })() }} className="flex flex-col gap-4">
        
        <label className="border-2 border-dashed border-line rounded-xl flex flex-col items-center justify-center gap-2 py-8 cursor-pointer hover:border-teal/40 transition-colors">
          <UploadCloud size={22} className="text-teal" />
          <span className="text-sm text-ink/60">{file ? file.name : t('upload.chooseFile')}</span>
          <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        <div>
          <label className="text-xs font-medium text-ink/60 block mb-1">{t('upload.reportTitle')}</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('upload.reportTitlePlaceholder')} className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal" />
        </div>

        {/* CATEGORY WITH CUSTOM DROPDOWN + X */}
        <div>
          <label className="text-xs font-medium text-ink/60 block mb-1">{t('upload.category')}</label>
          <div className="flex gap-2">
            <div className="relative flex-1" ref={dropdownRef}>
              <button type="button" onClick={() => setShowDropdown(!showDropdown)} className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white text-left flex justify-between items-center focus:outline-none focus:border-teal">
                <span>{getCategoryLabel(category)}</span>
                <ChevronDown size={16} className="text-ink/40" />
              </button>

              {showDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-line rounded-lg shadow-lg max-h-56 overflow-auto">
                  {allCategories.map((key) => {
                    const isCustom = customCats.includes(key)
                    return (
                      <div key={key} className="flex justify-between items-center px-3 py-2 text-sm hover:bg-slate-50 group">
                        <button type="button" onClick={() => { setCategory(key); setShowDropdown(false) }} className="flex-1 text-left truncate">
                          {getCategoryLabel(key)}
                        </button>
                        {isCustom && (
                          <button type="button" onClick={(e) => handleDeleteCustom(e, key)} className="ml-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-coral-light text-ink/40 hover:text-coral transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <button type="button" onClick={() => setShowAddCat(!showAddCat)} className="border border-line bg-white rounded-lg px-3 py-2 hover:border-teal transition-colors"><Plus size={16} /></button>
          </div>

          {showAddCat && (
            <div className="mt-2 flex gap-2 items-center">
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Dental, চোখ" className="flex-1 border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal" autoFocus />
              <button type="button" onClick={handleAddCategory} className="bg-teal-dark text-white text-sm px-4 py-2 rounded-lg">Add</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-medium text-ink/60 block mb-1">{t('upload.provider')}</label><input type="text" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder={t('upload.providerPlaceholder')} className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal" /></div>
          <div><label className="text-xs font-medium text-ink/60 block mb-1">{t('upload.date')}</label><input type="date" required value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal" /></div>
        </div>
        <div><label className="text-xs font-medium text-ink/60 block mb-1">{t('upload.facility')}</label><input type="text" value={facility} onChange={(e) => setFacility(e.target.value)} placeholder={t('upload.facilityPlaceholder')} className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal" /></div>
        <div><label className="text-xs font-medium text-ink/60 block mb-1">{t('upload.notes')}</label><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('upload.notesPlaceholder')} className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal" /></div>
        <button type="submit" disabled={saving} className="mt-2 bg-teal-dark text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-teal transition-colors disabled:opacity-50">{saving ? t('upload.saving') : t('upload.save')}</button>
      </form>
    </div>
  )
}