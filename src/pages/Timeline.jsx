import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Share2, ArrowLeft, Folder, FileText } from 'lucide-react'

import { CATEGORIES } from '../mockData.js'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import ReportCard from '../components/ReportCard.jsx'

const FOLDER_COLORS = [
  {
    value: 'teal',
    label: 'Teal',
    buttonClass: 'bg-teal',
    previewClass: 'bg-teal-light text-teal-dark',
  },
  {
    value: 'amber',
    label: 'Amber',
    buttonClass: 'bg-amber',
    previewClass: 'bg-amber-light text-amber',
  },
  {
    value: 'coral',
    label: 'Coral',
    buttonClass: 'bg-coral',
    previewClass: 'bg-coral-light text-coral',
  },
  {
    value: 'blue',
    label: 'Blue',
    buttonClass: 'bg-blue-500',
    previewClass: 'bg-blue-100 text-blue-600',
  },
  {
    value: 'purple',
    label: 'Purple',
    buttonClass: 'bg-purple-500',
    previewClass: 'bg-purple-100 text-purple-600',
  },
]

const DEFAULT_COLOR = 'teal'
const DOCTOR_FIELD = 'doctor'
const STORAGE_BUCKET = 'reports'

function groupKey(report) {
  const title = (report.title || '').trim().toLowerCase()
  const doctor = (
    report[DOCTOR_FIELD] ||
    report.doctor_name ||
    report.provider ||
    ''
  )
   .trim()
   .toLowerCase()
  const category = (report.category || '').trim().toLowerCase()
  return `${title}||${doctor}||${category}`
}

function fileFromReport(item) {
  if (!item?.file_path) {
    return null
  }
  const rawFileName = item.file_path.split('/').pop() || 'Report File'
  let fileName = rawFileName
  try {
    fileName = decodeURIComponent(rawFileName)
  } catch {
    fileName = rawFileName
  }
  const extension = fileName.includes('.')
   ? fileName.split('.').pop().toUpperCase()
    : 'FILE'
  return {
    id: item.id,
    file_name: fileName,
    file_type: extension,
    file_size: null,
    created_at: item.created_at,
    file_path: item.file_path,
  }
}

export default function Timeline() {
  const { user } = useAuth()
  const { t } = useTranslation()

  const [filter, setFilter] = useState('all')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedKey, setSelectedKey] = useState(null)
  const [editingGroup, setEditingGroup] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '',
    color: DEFAULT_COLOR,
  })

  const FILTERS = [
    {
      key: 'all',
      label: t('timeline.filters.all'),
    },
   ...Object.keys(CATEGORIES).map((key) => ({
      key,
      label: t(`categories.${key}`),
    })),
  ]

  useEffect(() => {
    async function loadReports() {
      setLoading(true)
      setError(null)

      let query = supabase
       .from('reports')
       .select('*')
       .order('report_date', { ascending: false })

      if (user?.id) {
        query = query.eq('user_id', user.id)
      }

      const { data, error: loadError } = await query

      if (loadError) {
        setError(loadError.message)
        setReports([])
      } else {
        setReports(data || [])
      }

      setLoading(false)
    }

    if (user) {
      loadReports()
    } else {
      setReports([])
      setLoading(false)
    }
  }, [user])

  const groups = useMemo(() => {
    const map = new Map()

    reports
     .filter(
        (report) => filter === 'all' || report.category === filter
      )
     .forEach((report) => {
        const key = groupKey(report)

        if (!map.has(key)) {
          map.set(key, {
           ...report,
            key,
            ids: [report.id],
            items: [report],
          })
        } else {
          const group = map.get(key)
          group.ids.push(report.id)
          group.items.push(report)
        }
      })

    return Array.from(map.values())
     .map((group) => {
        const items = Array.isArray(group.items)? group.items : []
        const lastUpload = items.reduce(
          (latest, item) =>
            new Date(item.created_at) > new Date(latest)
             ? item.created_at
              : latest,
          items[0]?.created_at || new Date(0)
        )
        return {...group, lastUpload }
      })
     .sort(
        (first, second) =>
          new Date(second.lastUpload) - new Date(first.lastUpload)
      )
  }, [reports, filter])

  const selectedReport = useMemo(() => {
    if (!selectedKey) return null
    const group = groups.find((item) => item.key === selectedKey)
    if (!group) return null
    const items = Array.isArray(group.items)? group.items : []
    return {
     ...group,
      files: items.map(fileFromReport).filter(Boolean),
    }
  }, [groups, selectedKey])

  function handleOpen(group) {
    setSelectedKey(group.key)
    setEditingGroup(null)
    setPdfUrl(null)
    setError(null)
  }

  async function openFile(file) {
    if (!file?.file_path) {
      setError(t('timeline.filePathNotFound'))
      return
    }
    setError(null)
    try {
      const { data, error: downloadError } = await supabase.storage
       .from(STORAGE_BUCKET)
       .download(file.file_path)

      if (downloadError ||!data) {
        setError(downloadError?.message || t('timeline.fileLoadError'))
        return
      }
      const blobUrl = URL.createObjectURL(data)
      setPdfUrl(blobUrl)
    } catch {
      setError(t('timeline.fileLoadError'))
    }
  }

  function closePdf() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(null)
    setError(null)
  }

  function handleEdit(group) {
    setEditingGroup(group)
    const savedColor = FOLDER_COLORS.some(
      (color) => color.value === group.color
    )
     ? group.color
      : DEFAULT_COLOR

    setEditForm({
      title: group.title || '',
      color: savedColor,
    })
    setError(null)
  }

  function handleEditChange(event) {
    const { name, value } = event.target
    setEditForm((current) => ({...current, [name]: value }))
  }

  function handleColorChange(color) {
    if (!FOLDER_COLORS.some((item) => item.value === color)) return
    setEditForm((current) => ({...current, color }))
  }

  async function handleSaveEdit(event) {
    event.preventDefault()
    if (!editingGroup) return

    if (!FOLDER_COLORS.some((color) => color.value === editForm.color)) {
      setError(t('timeline.invalidColor'))
      return
    }
    if (!editForm.title.trim()) {
      setError(t('timeline.folderNameRequired'))
      return
    }

    setError(null)

    const { data, error: updateError } = await supabase
     .from('reports')
     .update({
        title: editForm.title.trim(),
        color: editForm.color,
      })
     .in('id', editingGroup.ids)
     .select()

    if (updateError) {
      setError(updateError.message)
      return
    }
    if (!data || data.length === 0) {
      setError(t('timeline.updateFailed'))
      return
    }

    setReports((currentReports) =>
      currentReports.map((report) => {
        const updatedReport = data.find((item) => item.id === report.id)
        return updatedReport? {...report,...updatedReport } : report
      })
    )
    setEditingGroup(null)
  }

  function handleCancelEdit() {
    setEditingGroup(null)
    setError(null)
  }

  async function handleDelete(group) {
    const confirmed = window.confirm(t('timeline.confirmDeleteGroup'))
    if (!confirmed) return
    setError(null)

    const { error: deleteError } = await supabase
     .from('reports')
     .delete()
     .in('id', group.ids)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setReports((currentReports) =>
      currentReports.filter((report) =>!group.ids.includes(report.id))
    )
    if (selectedKey === group.key) setSelectedKey(null)
  }

  async function handleFileDelete(file) {
    const confirmed = window.confirm(t('timeline.confirmDeleteFile'))
    if (!confirmed) return
    setError(null)

    if (file.file_path) {
      const { error: storageError } = await supabase.storage
       .from(STORAGE_BUCKET)
       .remove([file.file_path])
      if (storageError) {
        setError(storageError.message)
        return
      }
    }

    const { error: databaseError } = await supabase
     .from('reports')
     .delete()
     .eq('id', file.id)

    if (databaseError) {
      setError(databaseError.message)
      return
    }

    setReports((currentReports) =>
      currentReports.filter((report) => report.id!== file.id)
    )
  }

  if (pdfUrl) {
    return (
      <div className="fixed inset-0 z-[999] bg-white flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-line bg-white shrink-0">
          <button
            type="button"
            onClick={closePdf}
            className="w-9 h-9 rounded-lg border border-line flex items-center justify-center hover:bg-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="font-serif text-lg">
            {t('timeline.pdfViewer')}
          </span>
        </div>
        <iframe
          src={pdfUrl}
          title="PDF Viewer"
          className="flex-1 w-full border-0"
        />
      </div>
    )
  }

  if (editingGroup) {
    return (
      <div className="min-h-screen bg-canvas pb-10">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={handleCancelEdit}
            className="w-9 h-9 rounded-lg border border-line flex items-center justify-center hover:bg-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="font-serif text-2xl">
              {t('timeline.editFolder')}
            </h2>
            <p className="text-sm text-ink/50 mt-1">
              {t('timeline.editFolderDesc')}
            </p>
          </div>
        </div>

        {error && (
          <p className="text-xs text-coral bg-coral-light rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <form
          onSubmit={handleSaveEdit}
          className="bg-white border border-line rounded-2xl p-6 max-w-2xl"
        >
          <div className="mb-6">
            <label
              htmlFor="title"
              className="block text-sm font-medium mb-2"
            >
              {t('timeline.folderNameLabel')}
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={editForm.title}
              onChange={handleEditChange}
              className="w-full border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-teal"
              required
            />
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium mb-3">
              {t('timeline.folderColorLabel')}
            </p>
            <div className="flex gap-3 flex-wrap">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleColorChange(color.value)}
                  className={`w-10 h-10 rounded-full ${
                    color.buttonClass
                  } border-4 ${
                    editForm.color === color.value
                     ? 'border-slate-800'
                      : 'border-white'
                  } ring-1 ring-slate-200`}
                  aria-label={color.label}
                  title={color.label}
                />
              ))}
            </div>
            <p className="text-xs text-ink/40 mt-2">
              {t('timeline.colorHint')}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-teal-dark text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:opacity-90 transition"
            >
              {t('common.saveChanges')}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="bg-slate-100 text-slate-700 text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-slate-200 transition"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (selectedReport) {
    const files = selectedReport.files || []
    return (
      <div className="min-h-screen bg-canvas pb-10 w-full">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => {
              setSelectedKey(null)
              setPdfUrl(null)
              setError(null)
            }}
            className="w-9 h-9 rounded-lg border border-line flex items-center justify-center hover:bg-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="font-serif text-2xl">
              {selectedReport.title || t('timeline.reportFiles')}
            </h2>
            <p className="text-sm text-ink/50 mt-1">
              {files.length}{' '}
              {files.length === 1? t('common.file') : t('common.files')}
            </p>
          </div>
        </div>

        {error && (
          <p className="text-xs text-coral bg-coral-light rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div>
          <h3 className="text-sm font-semibold mb-3">
            {t('common.files')}
          </h3>

          {files.length > 0? (
            <div className="flex flex-col gap-3 max-w-full">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 bg-white border border-line rounded-xl px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => openFile(file)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-teal-light text-teal-dark flex items-center justify-center shrink-0">
                      <FileText size={19} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.file_name}
                      </p>
                      <p className="text-xs text-ink/50 mt-1">
                        {file.file_type || 'FILE'}
                        {file.file_size && <> · {file.file_size}</>}
                      </p>
                    </div>
                  </button>

                  <Link to={`/reports/${file.id}`} className="shrink-0 px-2 py-1 text-sm font-medium text-teal hover:underline">
                    {t('common.edit')}
                  </Link>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleFileDelete(file)
                    }}
                    className="text-coral text-sm font-medium px-2 py-1 hover:text-coral/70 transition-colors shrink-0"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-line rounded-xl text-center py-10 text-sm text-ink/40">
              {t('timeline.noFiles')}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl">
            {t('timeline.detailTitle')}
          </h2>
          <p className="text-sm text-ink/50 mt-1">
            {loading
             ? t('timeline.loading')
              : t('timeline.reportCount', {
                  count: reports.length,
                  categories: Object.keys(CATEGORIES).length,
                })}
          </p>
        </div>

        <Link
          to="/summaries/new"
          className="flex items-center gap-2 bg-coral text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-coral/90 transition-colors"
        >
          <Share2 size={16} />
          {t('timeline.createSummary')}
        </Link>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === item.key
               ? 'bg-teal-dark text-white border-teal-dark'
                : 'border-line text-ink/60 hover:border-teal/50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-coral bg-coral-light rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading? (
        <div className="text-center py-16 text-ink/40 text-sm">
          {t('timeline.loadingReports')}
        </div>
      ) : groups.length === 0? (
        <div className="text-center py-16 text-ink/40 text-sm">
          {reports.length === 0? (
            <>
              {t('timeline.noReportsYet')}{' '}
              <Link to="/upload" className="text-teal-dark font-medium">
                {t('timeline.uploadFirst')}
              </Link>
             .
            </>
          ) : (
            t('timeline.noReportsInCategory')
          )}
        </div>
           ) : (
        <div className="grid grid-cols-1 gap-4 w-full max-w-full">
          {groups.map((report) => (
            <div key={report.key}>
              <ReportCard
                report={{
                 ...report,
                  date: report.report_date,
                  files: report.items
                   .map(fileFromReport)
                   .filter(Boolean),
                }}
                onOpen={handleOpen}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}