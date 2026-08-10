import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UploadCloud } from 'lucide-react'
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      let filePath = null

      if (file) {
        const ext = file.name.split('.').pop()
        const safeName = `${crypto.randomUUID()}.${ext}`
        filePath = `${user.id}/${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(filePath, file)

        if (uploadError) throw uploadError
      }

      const { error: insertError } = await supabase.from('reports').insert({
        user_id: user.id,
        title,
        category,
        provider: provider || null,
        facility: facility || null,
        report_date: reportDate,
        notes: notes || null,
        file_path: filePath,
      })

      if (insertError) throw insertError

      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="font-serif text-2xl mb-1">{t('upload.title')}</h2>
      <p className="text-sm text-ink/50 mb-6">{t('upload.subtitle')}</p>

      {error && (
        <p className="text-xs text-coral bg-coral-light rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="border-2 border-dashed border-line rounded-xl flex flex-col items-center justify-center gap-2 py-8 cursor-pointer hover:border-teal/40 transition-colors">
          <UploadCloud size={22} className="text-teal" />
          <span className="text-sm text-ink/60">{file ? file.name : t('upload.chooseFile')}</span>
          <input
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div>
          <label className="text-xs font-medium text-ink/60 block mb-1">{t('upload.reportTitle')}</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('upload.reportTitlePlaceholder')}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-ink/60 block mb-1">{t('upload.category')}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal"
          >
            {Object.keys(CATEGORIES).map((key) => (
              <option key={key} value={key}>{t(`categories.${key}`)}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-ink/60 block mb-1">{t('upload.provider')}</label>
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder={t('upload.providerPlaceholder')}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink/60 block mb-1">{t('upload.date')}</label>
            <input
              type="date"
              required
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-ink/60 block mb-1">{t('upload.facility')}</label>
          <input
            type="text"
            value={facility}
            onChange={(e) => setFacility(e.target.value)}
            placeholder={t('upload.facilityPlaceholder')}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-ink/60 block mb-1">{t('upload.notes')}</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('upload.notesPlaceholder')}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 bg-teal-dark text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-teal transition-colors disabled:opacity-50"
        >
          {saving ? t('upload.saving') : t('upload.save')}
        </button>
      </form>
    </div>
  )
}
