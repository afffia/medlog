import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Activity, Upload, Share2, Users, Settings, LogOut, FolderOpen, Stethoscope, CalendarClock, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Sidebar({ isOpen, onClose }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const links = [
    { to: '/', label: t('sidebar.timeline'), icon: Activity, end: true },
    { to: '/upload', label: t('sidebar.upload'), icon: Upload },
    { to: '/folders', label: t('sidebar.folders'), icon: FolderOpen },
    { to: '/providers', label: t('sidebar.providers'), icon: Stethoscope },
    { to: '/appointments', label: t('sidebar.appointments'), icon: CalendarClock },
    { to: '/summaries/new', label: t('sidebar.summaries'), icon: Share2 },
    { to: '/family', label: t('sidebar.family'), icon: Users },
  ]

  async function handleLogout() {
    onClose?.()
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Dark overlay backdrop on mobile when drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 md:w-56 shrink-0 border-r border-line bg-canvas md:bg-white/60 flex flex-col transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:static md:translate-x-0`}
      >
        <div className="px-5 pt-6 pb-4 flex items-start justify-between">
          <div className="min-w-0">
            <h1 className="font-serif text-lg text-teal-dark">{t('app.name')}</h1>
            <p className="text-xs text-ink/50 mt-0.5 truncate">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 -mr-1.5 rounded-lg text-ink/60 hover:bg-black/5 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3 overflow-y-auto">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-teal-light text-teal-dark font-medium' : 'text-ink/60 hover:bg-black/[0.03] hover:text-ink'
                }`
              }
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-3 pb-6 flex flex-col gap-1">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                isActive ? 'bg-teal-light text-teal-dark font-medium' : 'text-ink/60 hover:bg-black/[0.03]'
              }`
            }
          >
            <Settings size={17} strokeWidth={2} />
            {t('sidebar.settings')}
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink/60 hover:bg-black/[0.03] text-left"
          >
            <LogOut size={17} strokeWidth={2} />
            {t('sidebar.logout')}
          </button>
        </div>
      </aside>
    </>
  )
}
