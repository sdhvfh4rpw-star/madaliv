import { useState } from 'react'
import { Bike, Lock, Phone, AlertCircle, LogIn } from 'lucide-react'
import { useDriverAuth } from '../../contexts/DriverAuthContext'

/**
 * Écran de connexion livreur (téléphone + mot de passe).
 * Affiché par DriverDashboard tant qu'aucun livreur n'est connecté.
 */
export default function DriverLogin({ t, onRegister }) {
  const { login } = useDriverAuth()
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  async function handleSubmit(e) {
    e?.preventDefault?.()
    setError(null)

    if (!phone.trim() || !password) {
      setError('Entrez votre numéro et votre mot de passe.')
      return
    }

    setLoading(true)
    try {
      const res = await login({ phone: phone.trim(), password })
      if (!res?.driver) {
        // Auth OK mais aucune fiche livreur liée
        setError("Aucun compte livreur n'est associé à ce numéro. Inscrivez-vous d'abord.")
      }
    } catch (err) {
      console.error('[DriverLogin]', err)
      const msg = err?.message || ''
      if (/invalid login|credentials|invalid/i.test(msg)) {
        setError('Numéro ou mot de passe incorrect.')
      } else if (/email not confirmed/i.test(msg)) {
        setError('Compte non confirmé. Contactez le support.')
      } else {
        setError('Connexion impossible. Réessayez.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in pb-28">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white px-5 pt-12 pb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-brand-500 rounded-2xl p-2.5">
            <Bike size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl">Espace livreur</h1>
            <p className="text-gray-400 text-xs">Connectez-vous pour voir vos courses</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pt-6 flex flex-col gap-4 max-w-md mx-auto">
        {/* Téléphone */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
            Numéro de téléphone
          </label>
          <div className="relative">
            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError(null) }}
              placeholder="034 12 345 67"
              autoComplete="username"
              className="input-field pl-9"
            />
          </div>
        </div>

        {/* Mot de passe */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
            Mot de passe
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              placeholder="Votre mot de passe"
              autoComplete="current-password"
              className="input-field pl-9"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Connexion…
            </span>
          ) : (
            <><LogIn size={16} /> Se connecter</>
          )}
        </button>

        <div className="text-center pt-2">
          <p className="text-sm text-gray-500">
            Pas encore livreur ?{' '}
            <button
              type="button"
              onClick={() => onRegister?.()}
              className="text-brand-500 font-bold underline"
            >
              Devenir livreur
            </button>
          </p>
        </div>
      </form>
    </div>
  )
}
