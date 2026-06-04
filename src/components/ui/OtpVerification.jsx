import { useState, useRef, useEffect } from 'react'
import { Phone, CheckCircle2, RefreshCw } from 'lucide-react'

/**
 * Vérification du numéro de téléphone par OTP (6 chiffres).
 * En production : brancher sur Supabase Auth phone ou un service SMS (ex: Vonage/Africa's Talking).
 */
export default function OtpVerification({ phone, onVerified, t }) {
  const [step, setStep]           = useState('idle')   // idle | sending | sent | verifying | verified | error
  const [digits, setDigits]       = useState(['','','','','',''])
  const [countdown, setCountdown] = useState(0)
  const [errorMsg, setErrorMsg]   = useState('')
  const inputRefs = useRef([])

  // Décompte renvoi SMS
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function sendOtp() {
    if (!phone || phone.length < 10) return
    setStep('sending')
    // Simulation — en prod : appel Supabase Auth signInWithOtp({ phone })
    await new Promise(r => setTimeout(r, 1000))
    setStep('sent')
    setCountdown(60)
    setDigits(['','','','','',''])
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  function handleDigit(idx, val) {
    const clean = val.replace(/\D/g,'').slice(-1)
    const next = [...digits]
    next[idx] = clean
    setDigits(next)
    if (clean && idx < 5) inputRefs.current[idx + 1]?.focus()
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  async function verifyOtp() {
    const code = digits.join('')
    if (code.length < 6) return
    setStep('verifying')
    setErrorMsg('')
    await new Promise(r => setTimeout(r, 900))
    // Simulation — en prod : Supabase verifyOtp({ phone, token: code, type: 'sms' })
    if (code === '123456' || true) { // accepte tout en démo
      setStep('verified')
      onVerified?.()
    } else {
      setStep('sent')
      setErrorMsg('Code incorrect. Réessayez.')
    }
  }

  if (step === 'verified') {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
        <CheckCircle2 size={18} className="text-green-500" />
        <span className="text-sm font-semibold text-green-700">{t('phoneVerified')}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <div className="input-field pl-9 text-sm font-medium text-gray-700 flex items-center min-h-[48px]">
            {phone || <span className="text-gray-400">{t('phonePlaceholder')}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={sendOtp}
          disabled={step === 'sending' || !phone}
          className="btn-primary text-xs px-4 py-3 whitespace-nowrap shrink-0"
        >
          {step === 'sending' ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : t('sendOtp')}
        </button>
      </div>

      {(step === 'sent' || step === 'verifying') && (
        <div className="flex flex-col gap-3 animate-slide-up">
          <p className="text-xs text-gray-500 text-center">
            {t('otpSent')} · <span className="font-mono font-bold">{phone}</span>
          </p>

          {/* OTP digit inputs */}
          <div className="flex gap-2 justify-center">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-10 h-12 text-center text-lg font-bold rounded-xl border-2 outline-none transition
                  ${d ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 bg-gray-50'}
                  focus:border-brand-500`}
              />
            ))}
          </div>

          {errorMsg && (
            <p className="text-xs text-red-500 text-center">{errorMsg}</p>
          )}

          <button
            type="button"
            onClick={verifyOtp}
            disabled={digits.join('').length < 6 || step === 'verifying'}
            className="btn-primary w-full"
          >
            {step === 'verifying' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                {t('loading')}
              </span>
            ) : t('otpVerify')}
          </button>

          <button
            type="button"
            onClick={sendOtp}
            disabled={countdown > 0}
            className="flex items-center justify-center gap-1.5 text-xs text-gray-400 disabled:opacity-50"
          >
            <RefreshCw size={12} />
            {countdown > 0 ? `${t('otpResend')} (${countdown}s)` : t('otpResend')}
          </button>
        </div>
      )}
    </div>
  )
}
