import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../contexts/AdminAuthContext'

export default function AdminLogin() {
  const { signIn, admin } = useAdminAuth()
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Rediriger APRÈS que React ait commité la mise à jour de admin
  // (évite la race condition avec navigate('/admin') appelé avant setAdmin)
  useEffect(() => {
    if (admin) {
      navigate('/admin', { replace: true })
    }
  }, [admin, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      // Pas de navigate ici — le useEffect s'en charge une fois admin mis à jour
    } catch (err) {
      setError(err.message || 'Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold text-center mb-8">Faingana — Admin</h1>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-8 flex flex-col gap-4">
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <div>
            <label className="block text-gray-400 text-xs font-semibold uppercase mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@madaliv.mg"
              required
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500 border border-gray-700"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-semibold uppercase mb-2">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500 border border-gray-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition mt-2"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
