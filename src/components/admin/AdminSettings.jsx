import { useState } from 'react'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Shield, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Bike, Mail } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AdminSettings() {
  const { admin } = useAdminAuth()

  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })
  const [showPwd, setShowPwd]   = useState({ current: false, next: false, confirm: false })
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMsg,     setPwdMsg]     = useState(null)   // {type:'success'|'error', text}

  function toggleShow(field) {
    setShowPwd(p => ({ ...p, [field]: !p[field] }))
  }

  async function handleChangePwd(e) {
    e.preventDefault()
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdMsg({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' })
      return
    }
    if (pwdForm.next.length < 12) {
      setPwdMsg({ type: 'error', text: 'Le mot de passe doit contenir au moins 12 caractères.' })
      return
    }

    setPwdLoading(true)
    setPwdMsg(null)

    // Supabase : re-authentification puis update
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: admin.email, password: pwdForm.current,
    })
    if (signInErr) {
      setPwdMsg({ type: 'error', text: 'Mot de passe actuel incorrect.' })
      setPwdLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: pwdForm.next })
    setPwdLoading(false)
    if (error) {
      setPwdMsg({ type: 'error', text: error.message })
    } else {
      setPwdMsg({ type: 'success', text: 'Mot de passe mis à jour avec succès.' })
      setPwdForm({ current: '', next: '', confirm: '' })
    }
  }

  const strengthScore = (() => {
    const p = pwdForm.next
    let s = 0
    if (p.length >= 12)                        s++
    if (/[A-Z]/.test(p))                       s++
    if (/[0-9]/.test(p))                       s++
    if (/[^A-Za-z0-9]/.test(p))               s++
    return s
  })()
  const strengthLabel = ['', 'Faible', 'Moyen', 'Bon', 'Excellent'][strengthScore]
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'][strengthScore]

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-white font-extrabold text-2xl">Paramètres</h1>
        <p className="text-gray-400 text-sm mt-1">Gestion du compte administrateur</p>
      </div>

      {/* Infos compte */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-800">
          <div className="bg-brand-500 rounded-2xl p-3 shadow-lg shadow-brand-500/20">
            <Bike size={22} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold">Faingana Administration</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Shield size={12} className="text-blue-400" />
              <p className="text-blue-400 text-xs font-medium">Compte administrateur unique</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-xs mb-1">Email</p>
            <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2.5">
              <Mail size={14} className="text-gray-500" />
              <span className="text-white text-sm">{admin?.email}</span>
            </div>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Rôle</p>
            <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2.5">
              <Shield size={14} className="text-blue-400" />
              <span className="text-blue-300 text-sm font-semibold">Administrateur</span>
            </div>
          </div>
        </div>
      </div>

      {/* Changer mot de passe */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={16} className="text-brand-400" />
          <h2 className="text-white font-bold text-sm">Changer le mot de passe</h2>
        </div>

        {pwdMsg && (
          <div className={`flex items-start gap-3 rounded-xl px-4 py-3 mb-4 border
            ${pwdMsg.type === 'success'
              ? 'bg-green-500/10 border-green-500/25 text-green-300'
              : 'bg-red-500/10 border-red-500/25 text-red-300'}`}>
            {pwdMsg.type === 'success'
              ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              : <AlertTriangle size={15} className="shrink-0 mt-0.5" />}
            <p className="text-sm">{pwdMsg.text}</p>
          </div>
        )}

        <form onSubmit={handleChangePwd} className="flex flex-col gap-4">
          {[
            { field: 'current', label: 'Mot de passe actuel',     placeholder: '••••••••' },
            { field: 'next',    label: 'Nouveau mot de passe',     placeholder: 'Min. 12 caractères' },
            { field: 'confirm', label: 'Confirmer le nouveau',     placeholder: '••••••••' },
          ].map(({ field, label, placeholder }) => (
            <div key={field}>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={showPwd[field] ? 'text' : 'password'}
                  value={pwdForm[field]}
                  onChange={e => setPwdForm(p => ({ ...p, [field]: e.target.value }))}
                  placeholder={placeholder}
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600
                    rounded-xl px-4 pr-11 py-3 text-sm outline-none
                    focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => toggleShow(field)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  {showPwd[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Indicateur force */}
              {field === 'next' && pwdForm.next && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1,2,3,4].map(n => (
                      <div key={n} className={`flex-1 h-1 rounded-full transition-colors
                        ${n <= strengthScore ? strengthColor : 'bg-gray-700'}`} />
                    ))}
                  </div>
                  <span className={`text-xs font-semibold
                    ${strengthScore <= 1 ? 'text-red-400' : strengthScore === 2 ? 'text-yellow-400' : strengthScore === 3 ? 'text-blue-400' : 'text-green-400'}`}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>
          ))}

          <div className="bg-gray-800/50 rounded-xl px-4 py-3 text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1.5">Exigences :</p>
            {[
              [pwdForm.next.length >= 12,       '12 caractères minimum'],
              [/[A-Z]/.test(pwdForm.next),      'Une lettre majuscule'],
              [/[0-9]/.test(pwdForm.next),      'Un chiffre'],
              [/[^A-Za-z0-9]/.test(pwdForm.next), 'Un caractère spécial'],
            ].map(([ok, label]) => (
              <div key={label} className={`flex items-center gap-2 ${ok ? 'text-green-400' : 'text-gray-500'}`}>
                <span>{ok ? '✓' : '○'}</span> {label}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={pwdLoading || strengthScore < 3}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-700 disabled:text-gray-500
              text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.98] disabled:cursor-not-allowed"
          >
            {pwdLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Mise à jour…
              </span>
            ) : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </div>

      {/* Info sécurité */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl px-5 py-4">
        <div className="flex items-start gap-3">
          <Shield size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300/80 leading-relaxed">
            <p className="font-semibold text-blue-300 mb-1">Politique de sécurité Faingana</p>
            <ul className="space-y-1 text-xs">
              <li>• Compte admin unique, créé manuellement via Supabase SQL</li>
              <li>• 5 tentatives de connexion max avant verrouillage 15 min</li>
              <li>• Sessions expirées automatiquement après inactivité</li>
              <li>• Rôle vérifié côté JWT (app_metadata.role = 'admin')</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
