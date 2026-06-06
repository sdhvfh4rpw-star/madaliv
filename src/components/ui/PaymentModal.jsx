/**
 * PaymentModal — sélection du mode de paiement
 * ─────────────────────────────────────────────────────────────
 * États :
 *   select   → choix MVola / Orange Money
 *   waiting  → instructions USSD + attente confirmation
 *   success  → paiement confirmé (affiché brièvement)
 *
 * Props :
 *   amount    {number}   Montant en ariary
 *   orderCode {string}   Code commande (ex: MDL-2847)
 *   onSuccess (result)   Paiement accepté → créer la commande
 *   onCancel  ()         Fermer sans payer
 */

import { useState, useEffect } from 'react'
import { X, Phone, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import {
  PAYMENT_METHODS, getUssdInstruction,
  initMVola, initOrangeMoney, formatUssdAmount
} from '../../lib/payment'
import { formatAr } from '../../lib/pricing'

// ── Sous-composant : bouton de méthode ────────────────────────
function MethodButton({ method, selected, onSelect }) {
  const m = PAYMENT_METHODS[method]
  return (
    <button
      type="button"
      onClick={() => onSelect(method)}
      className={`flex items-center gap-3 w-full p-4 rounded-2xl border-2 transition active:scale-[0.98]
        ${selected
          ? `${m.border} ${m.bgLight}`
          : 'border-gray-200 bg-white hover:border-gray-300'}`}
    >
      <span className="text-2xl">{m.logo}</span>
      <div className="flex-1 text-left">
        <p className={`font-bold text-sm ${selected ? m.textDark : 'text-gray-800'}`}>{m.name}</p>
        <p className="text-[11px] text-gray-400">Hotline : {m.hotline}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition
        ${selected ? `${m.color} border-transparent` : 'border-gray-300'}`}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  )
}

// ── Composant principal ───────────────────────────────────────
export default function PaymentModal({ amount, orderCode, onSuccess, onCancel }) {
  const [screen,   setScreen]   = useState('select')  // select | waiting | success
  const [method,   setMethod]   = useState('mvola')
  const [phone,    setPhone]    = useState('')
  const [error,    setError]    = useState(null)
  const [testMode, setTestMode] = useState(false)
  const [countdown, setCountdown] = useState(3)

  // Compte à rebours en mode test
  useEffect(() => {
    if (screen !== 'waiting') return
    setCountdown(3)
    const iv = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(iv); return 0 }
      return c - 1
    }), 1000)
    return () => clearInterval(iv)
  }, [screen])

  async function handlePay() {
    if (!phone.trim()) {
      setError('Entrez votre numéro mobile money')
      return
    }
    setError(null)
    setScreen('waiting')

    const result = method === 'orange'
      ? await initOrangeMoney(amount, phone, orderCode)
      : await initMVola(amount, phone, orderCode)

    if (!result.ok) {
      setScreen('select')
      setError(result.error ?? 'Paiement échoué — réessayez')
      return
    }

    if (result.testMode) setTestMode(true)
    setScreen('success')

    // Attendre un court instant pour montrer la confirmation avant de fermer
    setTimeout(() => onSuccess(result), 1200)
  }

  const instruction = (screen === 'waiting')
    ? getUssdInstruction(method, amount, orderCode)
    : null

  const methodInfo = PAYMENT_METHODS[method]

  // ── Écran succès ──────────────────────────────────────────────
  if (screen === 'success') {
    return (
      <ModalShell onClose={null}>
        <div className="flex flex-col items-center py-6 text-center gap-3">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <p className="font-extrabold text-lg text-gray-900">Paiement confirmé !</p>
          {testMode && (
            <span className="text-[11px] bg-amber-100 text-amber-700 font-semibold px-3 py-1 rounded-full">
              Mode test — paiement simulé
            </span>
          )}
          <p className="text-sm text-gray-500">Création de la commande en cours…</p>
        </div>
      </ModalShell>
    )
  }

  // ── Écran attente paiement USSD ───────────────────────────────
  if (screen === 'waiting') {
    return (
      <ModalShell onClose={onCancel}>
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className={`flex items-center gap-3 p-4 rounded-2xl ${methodInfo?.bgLight ?? 'bg-gray-50'}`}>
            <span className="text-2xl">{methodInfo?.logo}</span>
            <div>
              <p className={`font-bold text-sm ${methodInfo?.textDark ?? 'text-gray-800'}`}>
                En attente de paiement
              </p>
              <p className="text-xs text-gray-500">{phone}</p>
            </div>
            <div className="ml-auto">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          </div>

          {/* Montant */}
          <div className="text-center py-2">
            <p className="text-3xl font-extrabold text-gray-900">
              {formatAr(amount)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Réf : {orderCode}</p>
          </div>

          {/* Instructions USSD */}
          {instruction && (
            <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
              {/* Code USSD */}
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-center">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">
                  Composez ce code
                </p>
                <p className="font-mono font-extrabold text-xl text-gray-900 tracking-widest">
                  {instruction.code}
                </p>
              </div>

              {/* Étapes */}
              <div className="flex flex-col gap-2">
                {instruction.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5
                      ${methodInfo?.color ?? 'bg-gray-500'}`}>
                      {i + 1}
                    </span>
                    <p className="text-xs text-gray-700 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode test */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertTriangle size={14} className="text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-700 font-medium">
              Mode test — paiement simulé en {countdown}s
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-400 hover:text-gray-600 text-center py-1 transition"
          >
            Annuler le paiement
          </button>
        </div>
      </ModalShell>
    )
  }

  // ── Écran sélection ───────────────────────────────────────────
  return (
    <ModalShell onClose={onCancel}>
      <div className="flex flex-col gap-4">
        {/* Titre */}
        <div className="text-center">
          <p className="font-extrabold text-lg text-gray-900">Choisissez votre paiement</p>
          <p className="text-2xl font-extrabold text-brand-600 mt-1">{formatAr(amount)}</p>
        </div>

        {/* Méthodes — uniquement Mobile Money */}
        <div className="flex flex-col gap-2">
          <MethodButton method="mvola"  selected={method === 'mvola'}  onSelect={setMethod} />
          <MethodButton method="orange" selected={method === 'orange'} onSelect={setMethod} />
        </div>

        {/* Champ numéro mobile money */}
        <div className="animate-slide-up">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
            Votre numéro {PAYMENT_METHODS[method]?.name}
          </label>
          <div className="relative">
            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError(null) }}
              placeholder="Ex: 034 12 345 67"
              className={`input-field pl-9 ${error ? 'border-red-400 bg-red-50' : ''}`}
              autoFocus
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertTriangle size={11} /> {error}
            </p>
          )}
        </div>

        {/* Bouton payer */}
        <button
          type="button"
          onClick={handlePay}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white transition active:scale-[0.98] shadow-md
            ${method === 'orange' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          💳 Payer {formatAr(amount)} par {PAYMENT_METHODS[method]?.name}
        </button>

        {/* Sécurité */}
        <p className="text-[10px] text-gray-400 text-center">
          🔒 Paiement sécurisé · Votre numéro n'est jamais stocké
        </p>
      </div>
    </ModalShell>
  )
}

// ── Shell modal réutilisable ──────────────────────────────────
function ModalShell({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-3xl px-5 pt-3 pb-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 text-gray-500"
          >
            <X size={16} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
