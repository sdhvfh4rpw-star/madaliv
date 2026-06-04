import { useState } from 'react'
import { Star, User, AlertTriangle, CheckCircle2, X } from 'lucide-react'

/**
 * Modal de notation obligatoire après livraison.
 * Suspension automatique si note moyenne < 3.5.
 */
export default function RatingModal({ order, driver, onSubmit, onSkip, t }) {
  const [stars, setStars]     = useState(0)
  const [hover, setHover]     = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    if (stars === 0) return
    // En prod : INSERT INTO reviews + UPDATE drivers.rating
    await new Promise(r => setTimeout(r, 600))
    setSubmitted(true)
    setTimeout(() => onSubmit?.({ stars, comment }), 1200)
  }

  const labels = t('rateLabels')

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-3xl p-8 w-full max-w-sm text-center animate-slide-up">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h3 className="font-extrabold text-lg text-gray-900 mb-1">{t('ratingSubmitted')}</h3>
          <div className="flex justify-center gap-1 mt-3">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={20} className={s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative bg-white w-full max-w-md rounded-t-3xl px-5 pt-3 pb-8 animate-slide-up shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Skip button */}
        {onSkip && (
          <button
            onClick={onSkip}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-gray-100 text-gray-400"
          >
            <X size={16} />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            {driver?.photo_url ? (
              <img src={driver.photo_url} alt={driver.name} className="w-14 h-14 rounded-2xl object-cover" />
            ) : (
              <User size={24} className="text-brand-500" />
            )}
          </div>
          <h2 className="font-extrabold text-lg text-gray-900">{t('rateTitle')}</h2>
          <p className="text-xs text-gray-500 mt-1">{t('rateSub')}</p>
          {driver && (
            <p className="text-sm font-semibold text-gray-700 mt-1">{driver.name}</p>
          )}
        </div>

        {/* Star selector */}
        <div className="flex flex-col items-center gap-2 mb-5">
          <div
            className="flex gap-3"
            onMouseLeave={() => setHover(0)}
          >
            {[1,2,3,4,5].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStars(s)}
                onMouseEnter={() => setHover(s)}
                onTouchStart={() => setHover(s)}
                className="transition-transform active:scale-110"
              >
                <Star
                  size={38}
                  className={`transition-colors ${
                    s <= (hover || stars)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-200 fill-gray-200'
                  }`}
                />
              </button>
            ))}
          </div>
          {(hover || stars) > 0 && (
            <p className="text-sm font-semibold text-gray-600 animate-fade-in">
              {labels[(hover || stars) - 1]}
            </p>
          )}
        </div>

        {/* Warning note basse */}
        {stars > 0 && stars < 3 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 flex gap-2 mb-4 animate-slide-up">
            <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-700 leading-relaxed">
              Une note inférieure à <strong>3.5 de moyenne</strong> entraîne la suspension automatique du livreur.
            </p>
          </div>
        )}

        {/* Comment */}
        <div className="mb-5">
          <textarea
            rows={2}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={t('rateCommentPlaceholder')}
            className="input-field resize-none text-sm"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={stars === 0}
          className="btn-primary w-full"
        >
          {t('submitRating')}
        </button>
      </div>
    </div>
  )
}
