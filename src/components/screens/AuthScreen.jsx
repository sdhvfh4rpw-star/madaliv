import { useState } from 'react'
import { Eye, EyeOff, Phone, User, Lock, Mail, AlertCircle, CheckCircle2, Bike, Store } from 'lucide-react'
import { useClientAuth } from '../../contexts/ClientAuthContext'
import PhotoUpload from '../ui/PhotoUpload'

// ── Validation ────────────────────────────────────────────────
function validatePhone(p) {
  const d = p.replace(/\D/g, '')
  return d.length >= 9 && d.length <= 12
}
function validatePassword(p) { return p.length >= 6 }

// ── Onglet Connexion ──────────────────────────────────────────
function LoginTab({ onSuccess, onSwitchTab }) {
  const { login } = useClientAuth()
  const [phone,    setPhone]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!phone.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      await login({ phone: phone.trim(), password })
      onSuccess?.()
    } catch (err) {
      console.error('[AuthScreen] login error:', err)
      if (err.message?.toLowerCase().includes('invalid')) {
        setError('Numéro ou mot de passe incorrect.')
      } else {
        setError(err.message || 'Erreur de connexion.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
          Numéro de téléphone
        </label>
        <div className="relative">
          <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="034 12 345 67"
            className="input-field pl-9"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
          Mot de passe
        </label>
        <div className="relative">
          <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input-field pl-9 pr-10"
            required
          />
          <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !phone || !password}
        className="btn-primary w-full mt-1"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Connexion…
          </span>
        ) : 'Se connecter'}
      </button>

      <p className="text-center text-xs text-gray-500">
        Pas encore de compte ?{' '}
        <button type="button" onClick={onSwitchTab} className="text-brand-500 font-semibold">
          S'inscrire
        </button>
      </p>
    </form>
  )
}

// ── Onglet Inscription ────────────────────────────────────────
function RegisterTab({ onSuccess, onSwitchTab }) {
  const { register } = useClientAuth()
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', password: '', confirmPwd: '', avatar: null,
    isMerchant: false, shopName: '',
  })
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [errors,   setErrors]   = useState({})

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
    setErrors(e => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!form.fullName.trim())           e.fullName  = 'Nom obligatoire'
    if (!validatePhone(form.phone))      e.phone     = 'Numéro invalide (ex: 034 12 345 67)'
    if (!validatePassword(form.password))e.password  = 'Minimum 6 caractères'
    if (form.password !== form.confirmPwd) e.confirmPwd = 'Les mots de passe ne correspondent pas'
    if (!form.avatar)                    e.avatar    = 'Selfie obligatoire'
    if (form.isMerchant && !form.shopName.trim()) e.shopName = 'Nom de la boutique obligatoire'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError(null)
    try {
      await register({
        fullName:       form.fullName.trim(),
        phone:          form.phone.trim(),
        email:          form.email.trim() || undefined,
        password:       form.password,
        avatarDataURL:  form.avatar,
        isMerchant:     form.isMerchant,
        shopName:       form.isMerchant ? form.shopName.trim() : null,
      })
      onSuccess?.()
    } catch (err) {
      console.error('[AuthScreen] register error:', err)
      if (err.message?.includes('already registered') || err.message?.includes('already exists')) {
        setError('Ce numéro est déjà enregistré. Connectez-vous.')
      } else {
        setError(err.message || 'Erreur lors de l\'inscription.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Nom complet */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
          Nom complet <span className="text-brand-500">*</span>
        </label>
        <div className="relative">
          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)}
            placeholder="Ex: Rakoto Jean" className={`input-field pl-9 ${errors.fullName ? 'border-red-400' : ''}`} />
        </div>
        {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
      </div>

      {/* Téléphone */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
          Numéro de téléphone <span className="text-brand-500">*</span>
        </label>
        <div className="relative">
          <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="034 12 345 67" className={`input-field pl-9 ${errors.phone ? 'border-red-400' : ''}`} />
        </div>
        {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
      </div>

      {/* Email optionnel */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1 block">
          <Mail size={11} /> Email
          <span className="text-gray-400 font-normal normal-case">(optionnel)</span>
        </label>
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
          placeholder="votre@email.com" className="input-field" />
      </div>

      {/* Mot de passe */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
            Mot de passe <span className="text-brand-500">*</span>
          </label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type={showPwd ? 'text' : 'password'} value={form.password}
              onChange={e => set('password', e.target.value)} placeholder="••••••"
              className={`input-field pl-8 pr-8 ${errors.password ? 'border-red-400' : ''}`} />
            <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
            Confirmer <span className="text-brand-500">*</span>
          </label>
          <input type="password" value={form.confirmPwd} onChange={e => set('confirmPwd', e.target.value)}
            placeholder="••••••" className={`input-field ${errors.confirmPwd ? 'border-red-400' : ''}`} />
          {errors.confirmPwd && <p className="text-[11px] text-red-500 mt-1">{errors.confirmPwd}</p>}
        </div>
      </div>

      {/* Selfie */}
      <div>
        <PhotoUpload
          label="Selfie — photo de profil"
          description="Photo claire de votre visage (obligatoire)"
          value={form.avatar}
          onChange={url => set('avatar', url)}
          capture="user"
          required
          error={!!errors.avatar}
        />
        {errors.avatar && <p className="text-xs text-red-500 mt-1">{errors.avatar}</p>}
      </div>

      {/* Compte commerçant */}
      <div>
        <button
          type="button"
          onClick={() => set('isMerchant', !form.isMerchant)}
          className={`flex items-center gap-3 w-full p-3.5 rounded-2xl border-2 transition text-left
            ${form.isMerchant ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-white'}`}
        >
          <div className={`rounded-xl p-2 ${form.isMerchant ? 'bg-brand-100' : 'bg-gray-100'}`}>
            <Store size={18} className={form.isMerchant ? 'text-brand-500' : 'text-gray-400'} />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${form.isMerchant ? 'text-brand-700' : 'text-gray-600'}`}>
              Je suis un commerçant
            </p>
            <p className="text-xs text-gray-400">Accédez à votre espace boutique</p>
          </div>
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition
            ${form.isMerchant ? 'bg-brand-500 border-brand-500' : 'border-gray-300'}`}>
            {form.isMerchant && <CheckCircle2 size={14} className="text-white" />}
          </div>
        </button>

        {/* Nom de la boutique — visible si commerçant */}
        {form.isMerchant && (
          <div className="mt-3 animate-slide-up">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Nom de la boutique <span className="text-brand-500">*</span>
            </label>
            <div className="relative">
              <Store size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={form.shopName}
                onChange={e => set('shopName', e.target.value)}
                placeholder="Ex: Épicerie Rasoa"
                className={`input-field pl-9 ${errors.shopName ? 'border-red-400' : ''}`}
              />
            </div>
            {errors.shopName && <p className="text-xs text-red-500 mt-1">{errors.shopName}</p>}
          </div>
        )}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Inscription…
          </span>
        ) : 'Créer mon compte'}
      </button>

      <p className="text-center text-xs text-gray-500">
        Déjà inscrit ?{' '}
        <button type="button" onClick={onSwitchTab} className="text-brand-500 font-semibold">
          Se connecter
        </button>
      </p>
    </form>
  )
}

// ── Écran principal ───────────────────────────────────────────
export default function AuthScreen({ onBack, defaultTab = 'login' }) {
  const [tab, setTab] = useState(defaultTab)   // 'login' | 'register'
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-slide-up">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={38} className="text-green-500" />
        </div>
        <h2 className="font-extrabold text-xl text-gray-900 mb-2">
          {tab === 'register' ? 'Compte créé !' : 'Connecté !'}
        </h2>
        <p className="text-gray-500 text-sm mb-6">Bienvenue sur FAINGANA 🚀</p>
        <button onClick={onBack} className="btn-primary w-full max-w-xs">
          Continuer
        </button>
      </div>
    )
  }

  return (
    <div className="pb-28 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 text-white px-5 pt-12 pb-6">
        <button onClick={onBack} className="text-white/70 text-sm mb-4 flex items-center gap-1">
          ← Retour
        </button>
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-white/20 rounded-xl p-2">
            <Bike size={20} className="text-white" />
          </div>
          <h1 className="font-extrabold text-xl">FAINGANA</h1>
        </div>
        <p className="text-white/70 text-sm">Livraison rapide à Madagascar</p>
      </div>

      <div className="px-4 pt-5">
        {/* Onglets */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
          {[
            { id: 'login',    label: 'Connexion'  },
            { id: 'register', label: 'Inscription' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition
                ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'login'
          ? <LoginTab    onSuccess={() => setDone(true)} onSwitchTab={() => setTab('register')} />
          : <RegisterTab onSuccess={() => setDone(true)} onSwitchTab={() => setTab('login')} />
        }
      </div>
    </div>
  )
}
