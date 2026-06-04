import { useState } from 'react'
import { Bike, User, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'
import PhotoUpload from '../ui/PhotoUpload'
import OtpVerification from '../ui/OtpVerification'
import { registerDriver } from '../../lib/supabase'
import { uploadDriverDocs } from '../../lib/storage'

const STEPS = ['infos', 'phone', 'docs', 'review']

const CITIES = [
  'Antananarivo', 'Toamasina', 'Antsirabe', 'Fianarantsoa',
  'Mahajanga', 'Toliara', 'Antsiranana', 'Ambovombe',
]

export default function DriverRegistration({ t, onBack }) {
  const [step, setStep]     = useState(0)
  const [form, setForm]     = useState({
    fullName: '', phone: '', city: '', bikeModel: '', bikeColor: '',
    profilePhoto: null, fullBodyPhoto: null, cinPhoto: null, bikePhoto: null,
    phoneVerified: false,
  })
  const [errors,     setErrors]     = useState({})
  const [submitted,  setSubmitted]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
    setErrors(e => ({ ...e, [field]: false }))
  }

  // ── Validation par étape ─────────────────────────────────
  function validateStep() {
    const e = {}
    if (step === 0) {
      if (!form.fullName.trim())   e.fullName  = true
      if (!form.city)              e.city      = true
      if (!form.bikeModel.trim())  e.bikeModel = true
      if (!form.bikeColor.trim())  e.bikeColor = true
    }
    if (step === 1) {
      if (!form.phoneVerified) e.phoneVerified = true
    }
    if (step === 2) {
      if (!form.profilePhoto)  e.profilePhoto  = true
      if (!form.fullBodyPhoto) e.fullBodyPhoto = true
      if (!form.cinPhoto)      e.cinPhoto      = true
      if (!form.bikePhoto)     e.bikePhoto     = true
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() {
    if (validateStep()) setStep(s => s + 1)
  }

  async function submit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      // 1. Créer d'abord un driver sans photos pour obtenir l'ID
      const tempId = crypto.randomUUID()

      // 2. Uploader les 4 photos dans Supabase Storage
      let profilePhotoUrl = null, fullBodyPhotoUrl = null, cinPhotoUrl = null, bikePhotoUrl = null
      try {
        const urls = await uploadDriverDocs(tempId, {
          profile:  form.profilePhoto,
          fullBody: form.fullBodyPhoto,
          cin:      form.cinPhoto,
          bike:     form.bikePhoto,
        })
        profilePhotoUrl  = urls.profileUrl
        fullBodyPhotoUrl = urls.fullBodyUrl
        cinPhotoUrl      = urls.cinUrl
        bikePhotoUrl     = urls.bikeUrl
      } catch (storageErr) {
        // Si Storage n'est pas configuré, continuer sans photos
        console.warn('[DriverRegistration] Storage indisponible:', storageErr.message)
      }

      // 3. Insérer dans la table drivers
      await registerDriver({
        name:             form.fullName,
        phone:            form.phone,
        city:             form.city,
        bikeModel:        form.bikeModel,
        bikeColor:        form.bikeColor,
        profilePhotoUrl,
        fullBodyPhotoUrl,
        cinPhotoUrl,
        bikePhotoUrl,
      })

      setSubmitted(true)
    } catch (err) {
      console.error('[DriverRegistration]', err)
      // Gestion des erreurs Supabase communes
      if (err.code === '23505') {
        setSubmitError('Ce numéro de téléphone ou cette plaque est déjà enregistré.')
      } else {
        setSubmitError(err.message || 'Une erreur est survenue. Réessayez.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submitted ────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center animate-fade-in">
        <div className="w-24 h-24 bg-brand-50 rounded-3xl flex items-center justify-center mb-5 shadow-lg">
          <CheckCircle2 size={44} className="text-brand-500" />
        </div>
        <h2 className="font-extrabold text-2xl text-gray-900 mb-3">{t('registrationSent')}</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-6">{t('registrationSentDesc')}</p>

        <div className="bg-white rounded-2xl px-6 py-4 w-full max-w-xs shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle size={16} className="text-yellow-600" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-700">{t('pendingValidation')}</p>
              <p className="text-[10px] text-gray-400">Délai : 24–48 heures</p>
            </div>
          </div>
        </div>

        <button onClick={onBack} className="btn-secondary w-full max-w-xs">{t('back')}</button>
      </div>
    )
  }

  const progress = ((step) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-gray-50 pb-28 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white px-5 pt-12 pb-8">
        <button onClick={onBack} className="text-gray-400 text-sm mb-4 flex items-center gap-1">
          ← {t('back')}
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-brand-500 rounded-2xl p-2.5">
            <Bike size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl">{t('driverRegTitle')}</h1>
            <p className="text-gray-400 text-xs">{t('driverRegSub')}</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors shrink-0
                ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-brand-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-colors ${i < step ? 'bg-green-500' : 'bg-gray-700'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5">
        {/* ── STEP 0 : Informations ───────────────────────── */}
        {step === 0 && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <h2 className="font-bold text-gray-800">Informations personnelles</h2>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                {t('fullName')} <span className="text-brand-500">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  placeholder={t('fullNamePlaceholder')}
                  className={`input-field pl-9 ${errors.fullName ? 'border-red-400 bg-red-50' : ''}`}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                {t('city')} <span className="text-brand-500">*</span>
              </label>
              <select
                value={form.city}
                onChange={e => set('city', e.target.value)}
                className={`input-field ${errors.city ? 'border-red-400 bg-red-50' : ''}`}
              >
                <option value="">{t('cityPlaceholder')}</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  {t('bikeModel')} <span className="text-brand-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.bikeModel}
                  onChange={e => set('bikeModel', e.target.value)}
                  placeholder={t('bikeModelPlaceholder')}
                  className={`input-field ${errors.bikeModel ? 'border-red-400 bg-red-50' : ''}`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  {t('bikeColor')} <span className="text-brand-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.bikeColor}
                  onChange={e => set('bikeColor', e.target.value)}
                  placeholder={t('bikeColorPlaceholder')}
                  className={`input-field ${errors.bikeColor ? 'border-red-400 bg-red-50' : ''}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1 : Vérification téléphone ─────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <h2 className="font-bold text-gray-800">Vérification téléphone</h2>
            <p className="text-sm text-gray-500">Votre numéro sera utilisé pour les alertes de livraison.</p>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                {t('phone')} <span className="text-brand-500">*</span>
              </label>
              <div className="relative mb-3">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => { set('phone', e.target.value); set('phoneVerified', false) }}
                  placeholder={t('phonePlaceholder')}
                  className={`input-field ${errors.phoneVerified ? 'border-red-400 bg-red-50' : ''}`}
                  disabled={form.phoneVerified}
                />
              </div>
              <OtpVerification
                phone={form.phone}
                onVerified={() => set('phoneVerified', true)}
                t={t}
              />
            </div>

            {errors.phoneVerified && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={13} /> Vérifiez votre numéro avant de continuer
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2 : Documents ───────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-5 animate-slide-up">
            <h2 className="font-bold text-gray-800">Photos & documents</h2>
            <p className="text-sm text-gray-500">
              Ces documents servent à vérifier votre identité. Ils ne seront pas partagés avec les clients.
            </p>

            <PhotoUpload
              label={t('profilePhoto')}
              description={t('profilePhotoDesc')}
              value={form.profilePhoto}
              onChange={(url) => set('profilePhoto', url)}
              capture="user"
              required
              error={!!errors.profilePhoto}
            />

            <PhotoUpload
              label={t('fullBodyPhoto')}
              description={t('fullBodyPhotoDesc')}
              value={form.fullBodyPhoto}
              onChange={(url) => set('fullBodyPhoto', url)}
              capture="user"
              required
              error={!!errors.fullBodyPhoto}
            />

            <PhotoUpload
              label={t('cinPhoto')}
              description={t('cinPhotoDesc')}
              value={form.cinPhoto}
              onChange={(url) => set('cinPhoto', url)}
              capture="environment"
              required
              error={!!errors.cinPhoto}
            />

            <PhotoUpload
              label={t('bikePhoto')}
              description={t('bikePhotoDesc')}
              value={form.bikePhoto}
              onChange={(url) => set('bikePhoto', url)}
              capture="environment"
              required
              error={!!errors.bikePhoto}
            />

            {Object.keys(errors).length > 0 && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={13} /> {t('allFieldsRequired')}
              </p>
            )}
          </div>
        )}

        {/* ── STEP 3 : Récapitulatif ───────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <h2 className="font-bold text-gray-800">Récapitulatif</h2>

            {/* Profile preview */}
            <div className="card flex items-center gap-4">
              {form.profilePhoto ? (
                <img src={form.profilePhoto} alt="profil" className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center">
                  <User size={28} className="text-brand-500" />
                </div>
              )}
              <div>
                <p className="font-bold text-gray-900">{form.fullName}</p>
                <p className="text-xs text-gray-500">{form.city}</p>
                <p className="text-xs text-gray-500">{form.phone}</p>
                <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                  {t('pendingValidation')}
                </span>
              </div>
            </div>

            {/* Bike info */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Bike size={16} className="text-brand-500" />
                <span className="font-semibold text-sm text-gray-700">Informations moto</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-xs text-gray-400">Modèle</p><p className="font-medium">{form.bikeModel}</p></div>
                <div><p className="text-xs text-gray-400">Couleur</p><p className="font-medium">{form.bikeColor}</p></div>
              </div>
            </div>

            {/* Documents check */}
            <div className="card">
              <p className="font-semibold text-sm text-gray-700 mb-3">Documents soumis</p>
              {[
                { label: t('profilePhoto'),  ok: !!form.profilePhoto  },
                { label: t('fullBodyPhoto'), ok: !!form.fullBodyPhoto },
                { label: t('cinPhoto'),      ok: !!form.cinPhoto      },
                { label: t('bikePhoto'),     ok: !!form.bikePhoto     },
                { label: t('phoneVerified'), ok: form.phoneVerified   },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-600">{label}</span>
                  {ok
                    ? <CheckCircle2 size={16} className="text-green-500" />
                    : <AlertCircle  size={16} className="text-red-400" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Navigation buttons ───────────────────────────── */}
        <div className="mt-6 flex flex-col gap-2.5">
          {/* Erreur de soumission */}
          {submitError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          {step < STEPS.length - 1 ? (
            <button onClick={next} className="btn-primary w-full flex items-center justify-center gap-2">
              Continuer <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="btn-primary w-full">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Envoi en cours…
                </span>
              ) : t('submitRegistration')}
            </button>
          )}
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="w-full text-sm text-gray-400 py-2">
              ← {t('back')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
