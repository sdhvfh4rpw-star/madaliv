import { User, Star, Bike, ShieldCheck, Phone, X, CheckCircle2 } from 'lucide-react'
import VerifiedBadge from './VerifiedBadge'

/**
 * Modal affiché au client avant chaque course.
 * Montre : photo, nom, note, nb de courses, moto.
 * Actions : confirmer ou annuler.
 */
export default function DriverConfirmModal({ driver, onConfirm, onCancel, t }) {
  if (!driver) return null

  const ratingColor =
    driver.rating >= 4.5 ? 'text-green-600' :
    driver.rating >= 3.5 ? 'text-yellow-600' : 'text-red-500'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Sheet */}
      <div className="relative bg-white w-full max-w-md rounded-t-3xl px-5 pt-3 pb-8 animate-slide-up shadow-2xl">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-5 right-5 p-1.5 rounded-full bg-gray-100 text-gray-500"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-1">
            {t('driverAssigned')}
          </p>
          <h2 className="font-extrabold text-lg text-gray-900">{t('yourDriver')}</h2>
        </div>

        {/* Driver card */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {driver.photo_url ? (
                <img
                  src={driver.photo_url}
                  alt={driver.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center border-2 border-white shadow-md">
                  <User size={32} className="text-brand-500" />
                </div>
              )}
              {driver.is_verified && (
                <div className="absolute -bottom-2 -right-2">
                  <VerifiedBadge size="sm" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-extrabold text-gray-900 text-base truncate">{driver.name}</h3>
              </div>

              {driver.is_verified && (
                <VerifiedBadge size="sm" showLabel className="mb-2" />
              )}

              {/* Rating */}
              <div className="flex items-center gap-1 mb-1">
                {[1,2,3,4,5].map(s => (
                  <Star
                    key={s}
                    size={14}
                    className={s <= Math.round(driver.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                  />
                ))}
                <span className={`text-sm font-bold ml-1 ${ratingColor}`}>{driver.rating.toFixed(1)}</span>
              </div>

              <p className="text-xs text-gray-500 font-medium">
                {driver.total_trips.toLocaleString()} {t('totalTrips')}
              </p>

              <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
                <Bike size={12} />
                <span className="truncate">{driver.bike_model} · {driver.bike_color}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { icon: ShieldCheck, label: 'Identité vérifiée', color: 'text-blue-500', bg: 'bg-blue-50' },
            { icon: Bike,        label: 'Moto enregistrée', color: 'text-brand-500', bg: 'bg-brand-50' },
            { icon: Star,        label: driver.rating >= 4 ? 'Bien noté' : 'Noté', color: 'text-yellow-500', bg: 'bg-yellow-50' },
          ].map(({ icon: Icon, label, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl flex flex-col items-center gap-1 py-2.5 px-2`}>
              <Icon size={16} className={color} />
              <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onConfirm}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            {t('confirmDriver')}
          </button>
          <button
            onClick={onCancel}
            className="w-full text-sm font-semibold text-gray-500 py-3 rounded-2xl hover:bg-gray-50 transition active:scale-95"
          >
            {t('cancelOrder')}
          </button>
        </div>
      </div>
    </div>
  )
}
