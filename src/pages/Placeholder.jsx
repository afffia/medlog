import { useTranslation } from 'react-i18next'

export default function Placeholder({ title }) {
  const { t } = useTranslation()
  return (
    <div>
      <h2 className="font-serif text-2xl mb-2">{title}</h2>
      <p className="text-sm text-ink/50">{t('placeholder.notBuilt')}</p>
    </div>
  )
}
