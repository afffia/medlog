import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar.jsx'
import ReminderToaster from './ReminderToaster.jsx'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-canvas">
      {/* Mobile Top Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-line bg-white/60 md:hidden">
        <span className="font-serif text-lg text-teal-dark">{t('app.name')}</span>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2 rounded-lg text-ink/70 hover:bg-black/[0.03]"
        >
          <Menu size={20} />
        </button>
      </header>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 w-full px-4 py-5 md:px-8 md:py-7 max-w-4xl">
        {children}
      </main>

      <ReminderToaster />
    </div>
  )
}
