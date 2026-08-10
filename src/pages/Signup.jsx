import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HeartPulse } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.passwordTooShort'))
      return
    }

    setLoading(true)
    const { data, error } = await signUp(email, password)
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    if (data.session) {
      navigate('/')
    } else {
      setInfo(t('auth.confirmEmailNotice'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-teal-light flex items-center justify-center mb-3">
            <HeartPulse size={22} className="text-teal-dark" strokeWidth={2} />
          </div>
          <h1 className="font-serif text-2xl text-teal-dark">{t('app.name')}</h1>
          <p className="text-sm text-ink/50 mt-1">{t('app.tagline')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="font-serif text-lg text-center mb-1">{t('auth.createAccount')}</h2>

          {error && (
            <p className="text-xs text-coral bg-coral-light rounded-lg px-3 py-2">{error}</p>
          )}
          {info && (
            <p className="text-xs text-teal-dark bg-teal-light rounded-lg px-3 py-2">{info}</p>
          )}

          <div>
            <label className="text-xs font-medium text-ink/60 block mb-1">{t('auth.email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-ink/60 block mb-1">{t('auth.password')}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordHint')}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-ink/60 block mb-1">{t('auth.confirmPassword')}</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 bg-teal-dark text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-teal transition-colors disabled:opacity-50"
          >
            {loading ? t('auth.signingUp') : t('auth.signup')}
          </button>
        </form>

        <p className="text-center text-sm text-ink/50 mt-5">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-teal-dark font-medium">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  )
}
