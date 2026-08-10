import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Activity, Upload, Share2, Users, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const links = [
    { to: '/', label: t('sidebar.timeline'), icon: Activity, end: true },
    { to: '/upload', label: t('sidebar.upload'), icon: Upload },
    { to: '/summaries/new', label: t('sidebar.summaries'), icon: Share2 },
    { to: '/family', label: t('sidebar.family'), icon: Users },
  ]

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-56 shrink-0 border-r border-line bg-white/60 flex flex-col">
      <div className="px-5 pt-6 pb-4">
        <h1 className="font-serif text-lg text-teal-dark">{t('app.name')}</h1>
        <p className="text-xs text-ink/50 mt-0.5 truncate">{user?.email}</p>
      </div>
      <div className="px-5 pb-4">
        <LanguageSwitcher />
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
  )
}
