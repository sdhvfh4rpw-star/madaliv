import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Eye, EyeOff, Bike, ShieldCheck, AlertTriangle, Lock, Mail } from 'lucide-react'

function getRateData() {
  try { return JSON.parse(localStorage.getItem('madaliv_admin_attempts') || '{}') }
  catch { return {} }
}

export default function AdminLogin() {
  const { signIn, admin, error: ctxError, setError } = useAdminAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const emailRef  = useRef(null)

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [shake,    setShake]    = useState(false)

  // Lockout countdown
  const [lockRemaining, setLockRemaining] = useState(0)
  useEffect(() => {
    const { lockedUntil } = getRateData()
    if (lockedUntil && Date.now() < lockedUntil) {
      setLockRemaining(Math.ceil((lockedUntil - Date.now()) / 1000))
    }
  }, [])
  useEffect(() => {
    if (lockRemaining <= 0) return
    const t = setTimeout(() => setLockRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [lockRemaining])

  // Déjà connecté → dashboard
  useEffect(() => {
    if (admin) {
      const dest = location.state?.from?.pathname || '/admin'
      navigate(dest, { replace: true })
    }
  }, [admin, navigate, location])

  // Focus email au chargement
  useEffect(() => { emailRef.current?.focus() }, [])
  // Nettoyage : effacer l'erreur quand on quitte la page
  // Guard sur setError : évite un TypeError si le context est démonté avant le consumer
  useEffect(() => {
    return () => { if (typeof setError === 'function') setError(null) }
  }, [setError])

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading || lockRemaining > 0) return
    if (!email.trim() || !password) return   // guard supplémentaire
    setLoading(true)
    if (typeof setError === 'function') setError(null)

    const result = await signIn(email.trim(), password)

    setLoading(false)
    if (result?.error) {
      setShake(true)
      setTimeout(() => setShake(false), 600)
      // Mettre à jour le countdown si lockout
      const { lockedUntil } = getRateData()
      if (lockedUntil && Date.now() < lockedUntil) {
        setLockRemaining(Math.ceil((lockedUntil - Date.now()) / 1000))
      }
    }
  }

  const isLocked = lockRemaining > 0
  const lockMins = Math.floor(lockRemaining / 60)
  const lockSecs = lockRemaining % 60

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      {/* Fond décoratif */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl shadow-lg shadow-brand-500/30 mb-4">
            <Bike size={28} className="text-white" />
          </div>
          <h1 className="text-white font-extrabold text-2xl tracking-tight">MadaLiv</h1>
          <p className="text-gray-400 text-sm mt-1">Espace Administration</p>
        </div>

        {/* Card formulaire */}
        <div
          className={`bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl transition-transform
            ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
        >
          {/* Badge sécurisé */}
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5 mb-6">
            <ShieldCheck size={15} className="text-blue-400 shrink-0" />
            <p className="text-blue-300 text-xs font-medium">Connexion sécurisée · Accès restreint</p>
          </div>

          {/* Lockout warning */}
          {isLocked && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
              <Lock size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-300 text-sm font-semibold">Compte temporairement verrouillé</p>
                <p className="text-red-400/80 text-xs mt-0.5">
                  Trop de tentatives. Réessayez dans{' '}
                  <span className="font-mono font-bold text-red-300">
                    {lockMins > 0 ? `${lockMins}m ` : ''}{lockSecs}s
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('madaliv_admin_attempts')
                    setLockRemaining(0)
                    setError(null)
                  }}
                  className="text-[11px] text-red-400 underline mt-1 hover:text-red-300"
                >
                  Réinitialiser le compteur (debug)
                </button>
              </div>
            </div>
          )}

          {/* Erreur contexte — message Supabase brut */}
          {ctxError && !isLocked && (
            <div className="flex flex-col gap-1.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                {/* Conversion explicite en string — évite le crash si ctxError est un objet */}
                <p className="text-red-300 text-sm leading-relaxed font-medium">
                  {typeof ctxError === 'string' ? ctxError : JSON.stringify(ctxError)}
                </p>
              </div>
              {/* Bloc technique pour diagnostic */}
              <pre className="text-[10px] text-red-400/70 bg-red-500/10 rounded-lg px-3 py-2 mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
                {typeof ctxError === 'string' ? ctxError : JSON.stringify(ctxError, null, 2)}
              </pre>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@madaliv.mg"
                  autoComplete="email"
                  disabled={isLocked || loading}
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600
                    rounded-xl pl-10 pr-4 py-3 text-sm outline-none
                    focus:ring-2 focus:ring-brand-500 focus:border-transparent
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  disabled={isLocked || loading}
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600
                    rounded-xl pl-10 pr-11 py-3 text-sm outline-none
                    focus:ring-2 focus:ring-brand-500 focus:border-transparent
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Bouton connexion */}
            <button
              type="submit"
              disabled={isLocked || loading || !email || !password}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-700 disabled:text-gray-500
                text-white font-bold py-3.5 rounded-xl text-sm transition
                active:scale-[0.98] disabled:cursor-not-allowed
                shadow-lg shadow-brand-500/20 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Vérification…
                </span>
              ) : isLocked ? (
                <span className="flex items-center justify-center gap-2">
                  <Lock size={15} /> Verrouillé
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShieldCheck size={15} /> Se connecter
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6">
          Accès réservé aux administrateurs MadaLiv.<br />
          En cas de problème : <span className="text-gray-500">support@madaliv.mg</span>
        </p>
      </div>

      {/* Animation shake via style inline */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-6px); }
          30%       { transform: translateX(6px); }
          45%       { transform: translateX(-4px); }
          60%       { transform: translateX(4px); }
          75%       { transform: translateX(-2px); }
          90%       { transform: translateX(2px); }
        }
      `}</style>
    </div>
  )
}
