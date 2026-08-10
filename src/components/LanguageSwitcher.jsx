import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'bn', label: 'বাংলা' },
]

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation()

  return (
    <div className={`flex items-center gap-1 ${compact ? '' : 'bg-white border border-line rounded-lg p-1'}`}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
            i18n.resolvedLanguage === lang.code
              ? 'bg-teal-dark text-white font-medium'
              : 'text-ink/50 hover:text-ink'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
