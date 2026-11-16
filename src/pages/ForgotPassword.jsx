import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HeartPulse } from 'lucide-react'
import { supabase } from '../supabaseClient.js'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const redirectTo = `${window.location.origin}/reset-password`
    const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })

    setLoading(false)
    if (requestError) {
      setError(requestError.message)
    } else {
      setMessage(t('auth.resetEmailSent'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-teal-light flex items-center justify-center mb-3">
            <HeartPulse size={22} className="text-teal-dark" strokeWidth={2} />
          </div>
          <h1 className="font-serif text-2xl text-teal-dark">{t('app.name')}</h1>
          <p className="text-sm text-ink/50 mt-1">{t('app.tagline')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="font-serif text-lg text-center mb-1">{t('auth.forgotPassword')}</h2>
          <p className="text-sm text-ink/60 text-center">{t('auth.resetPasswordHelp')}</p>

          {error && <p role="alert" className="text-xs text-coral bg-coral-light rounded-lg px-3 py-2">{error}</p>}
          {message && <p role="status" className="text-sm text-teal-dark bg-teal-light rounded-lg px-3 py-2">{message}</p>}

          <div>
            <label className="text-xs font-medium text-ink/60 block mb-1">{t('auth.email')}</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal"
            />
          </div>

          <button type="submit" disabled={loading} className="mt-1 bg-teal-dark text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-teal transition-colors disabled:opacity-50">
            {loading ? t('auth.sendingResetEmail') : t('auth.sendResetEmail')}
          </button>
        </form>

        <p className="text-center text-sm text-ink/50 mt-5">
          <Link to="/login" className="text-teal-dark font-medium hover:underline">{t('auth.backToLogin')}</Link>
        </p>
      </div>
    </div>
  )
}
