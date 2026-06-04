import { useState } from 'react'
import { Search, Phone, MessageCircle, User, ShieldCheck, Image, Camera, Clock, AlertCircle, RefreshCw, UserCheck } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import DriverConfirmModal from '../ui/DriverConfirmModal'
import RatingModal from '../ui/RatingModal'
import VerifiedBadge from '../ui/VerifiedBadge'
import MapLive from '../ui/MapLive'
import { useRealtimeOrder } from '../../hooks/useRealtimeOrder'

const STATUS_FLOW = ['pending', 'accepted', 'pickup', 'ontheway', 'delivered']

// Coordonnées réelles Antananarivo
const MOCK_DRIVER = {
  id: 'drv1',
  name: 'Faniry Rakoto',
  phone: '+261 34 12 345 67',
  rating: 4.8,
  total_trips: 342,
  bike_model: 'Honda CG 125',
  bike_color: 'Rouge',
  is_verified: true,
  photo_url: null,
}

const MOCK_ORDER = {
  id: 1,
  tracking_code: 'MDL-2847',
  status: 'ontheway',
  pickup:   { lat: -18.9161, lng: 47.5360, label: 'Analakely' },
  delivery: { lat: -18.9100, lng: 47.4980, label: 'Ambohimanarina' },
  eta: 14,
  driver: MOCK_DRIVER,
  recipient_phone: '+261 34 98 765 43',
  pickup_proof_url:    null,
  delivery_proof_url:  null,
  pickup_proof_at:     new Date(Date.now() - 10 * 60000).toISOString(),
  delivery_proof_at:   null,
}

// ── Barre de progression ─────────────────────────────────────
function ProgressBar({ status }) {
  const current = STATUS_FLOW.indexOf(status)
  const LABELS  = ['Créée', 'Acceptée', 'Collectée', 'En route', 'Livrée']
  return (
    <div className="flex items-start">
      {STATUS_FLOW.map((s, i) => {
        const done   = i <= current
        const active = i === current
        return (
          <div key={s} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-center w-full">
              {i > 0 && <div className={`flex-1 h-0.5 transition-colors ${i <= current ? 'bg-brand-500' : 'bg-gray-200'}`} />}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all
                ${active ? 'bg-brand-500 text-white ring-4 ring-brand-100' : done ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {done && !active ? '✓' : i + 1}
              </div>
              {i < STATUS_FLOW.length - 1 && <div className={`flex-1 h-0.5 transition-colors ${i < current ? 'bg-brand-500' : 'bg-gray-200'}`} />}
            </div>
            <span className={`text-[9px] font-medium ${active ? 'text-brand-600' : done ? 'text-gray-500' : 'text-gray-300'}`}>
              {LABELS[i]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Carte photo de preuve ────────────────────────────────────
function ProofPhotoCard({ label, url, takenAt, t }) {
  return (
    <div className="flex-1 flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      {url ? (
        <div className="relative rounded-xl overflow-hidden">
          <img src={url} alt={label} className="w-full h-28 object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
            <p className="text-[9px] text-white/80">
              {t('photoTakenAt')} {new Date(takenAt).toLocaleTimeString('fr', { hour:'2-digit', minute:'2-digit' })}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-gray-100 border border-dashed border-gray-300 h-28 flex flex-col items-center justify-center gap-1.5">
          <Camera size={20} className="text-gray-300" />
          <p className="text-[10px] text-gray-400 text-center">{t('noPhotoYet')}</p>
        </div>
      )}
    </div>
  )
}

// ── Écran principal ──────────────────────────────────────────
export default function TrackingScreen({ t }) {
  const [inputCode, setInputCode]   = useState('')
  const [searchCode, setSearchCode] = useState('')   // déclenche le hook

  const { order, loading, error, refetch } = useRealtimeOrder(searchCode)

  const [showConfirm,     setShowConfirm]     = useState(false)
  const [showRating,      setShowRating]       = useState(false)
  const [driverConfirmed, setDriverConfirmed]  = useState(false)

  // Déclencher la modal de confirmation quand un livreur est assigné
  const prevStatus = useState(null)
  if (order && order.driver && !driverConfirmed &&
      !['pending','cancelled'].includes(order.status) && !showConfirm) {
    // Montrer la modal seulement si elle n'est pas déjà affichée
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!inputCode.trim()) return
    setSearchCode(inputCode.trim().toUpperCase())
    setDriverConfirmed(false)
    setShowConfirm(false)
  }

  // Adapter les coords depuis la BDD (pickup_lat/lng → {lat,lng,label})
  const pickupCoords  = order ? { lat: order.pickup_lat,   lng: order.pickup_lng,   label: order.pickup_label }  : null
  const deliveryCoords= order ? { lat: order.delivery_lat, lng: order.delivery_lng, label: order.delivery_label } : null

  return (
    <div className="pb-28 animate-fade-in">
      {/* Modals */}
      {showConfirm && order?.driver && (
        <DriverConfirmModal
          driver={order.driver}
          onConfirm={() => { setShowConfirm(false); setDriverConfirmed(true) }}
          onCancel={() => { setShowConfirm(false); setOrder(o => o ? { ...o, status: 'cancelled' } : o) }}
          t={t}
        />
      )}
      {showRating && order?.driver && (
        <RatingModal
          order={order} driver={order.driver}
          onSubmit={() => setShowRating(false)}
          onSkip={() => setShowRating(false)}
          t={t}
        />
      )}

      <div className="px-4 pt-4">
        {/* Barre de recherche */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              placeholder={t('enterCode')}
              className="input-field pl-9 uppercase font-mono tracking-wider"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary px-4 py-3 shrink-0 text-sm">
            {loading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : t('trackBtn')}
          </button>
        </form>

        {/* Erreur Supabase */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <AlertCircle size={15} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600 flex-1">{error}</p>
            <button onClick={refetch} className="text-xs text-red-500 font-semibold flex items-center gap-1">
              <RefreshCw size={12} /> Réessayer
            </button>
          </div>
        )}

        {order && (
          <div className="flex flex-col gap-4 animate-slide-up">
            {/* En-tête commande */}
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{t('orderCode')}</p>
                  <p className="font-extrabold text-lg font-mono tracking-wider text-gray-900">{order.tracking_code}</p>
                </div>
                <StatusBadge status={order.status} label={t(`status_${order.status}`)} />
              </div>
              <ProgressBar status={order.status} />
            </div>

            {/* ── Carte en temps réel ─────────────────── */}
            {order.status !== 'cancelled' && pickupCoords?.lat && deliveryCoords?.lat && (
              <MapLive
                pickup={pickupCoords}
                delivery={deliveryCoords}
                status={order.status}
                eta={order.eta ?? 15}
                height={260}
              />
            )}

            {/* Numéro du destinataire — visible par le livreur pour contacter */}
            {order.recipient_phone && driverConfirmed && (
              <div className="card border border-green-200 bg-green-50">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Phone size={12} /> Destinataire final
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-green-800">{order.recipient_phone}</p>
                    <p className="text-[11px] text-green-600 mt-0.5">Personne qui reçoit le colis</p>
                  </div>
                  <a
                    href={`tel:${order.recipient_phone}`}
                    className="flex items-center gap-1.5 bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition shadow-sm"
                  >
                    <Phone size={13} /> Appeler
                  </a>
                </div>
              </div>
            )}

            {/* Carte livreur — affiché seulement si confirmé */}
            {order.driver && driverConfirmed && (
              <div className="card">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-3">{t('driver')}</p>
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                      <User size={22} className="text-brand-600" />
                    </div>
                    {order.driver.is_verified && (
                      <div className="absolute -bottom-1.5 -right-1.5"><VerifiedBadge size="sm" /></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{order.driver.name}</p>
                    {order.driver.is_verified && (
                      <div className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold mb-0.5">
                        <ShieldCheck size={11} /> {t('verifiedDriver')}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">{order.driver.bike_model} · {order.driver.bike_color}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-yellow-500 font-semibold">★ {order.driver.rating}</span>
                      <span className="text-xs text-gray-400">{order.driver.total_trips.toLocaleString()} {t('courses')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={`tel:${order.driver.phone}`} className="bg-green-50 p-3 rounded-xl text-green-600">
                      <Phone size={18} />
                    </a>
                    <button className="bg-brand-50 p-3 rounded-xl text-brand-600">
                      <MessageCircle size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Attente confirmation */}
            {order.driver && !driverConfirmed && !['pending','cancelled'].includes(order.status) && (
              <button
                onClick={() => setShowConfirm(true)}
                className="card border-2 border-brand-200 bg-brand-50 flex items-center justify-between active:scale-[0.98] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                    <User size={18} className="text-brand-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-brand-700">{t('driverAssigned')}</p>
                    <p className="text-xs text-brand-500">{t('confirmDriver')} →</p>
                  </div>
                </div>
              </button>
            )}

            {/* Photos de preuve */}
            {['ontheway','delivered'].includes(order.status) && (
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <Image size={15} className="text-brand-500" />
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Photos de preuve</p>
                  <span className="text-[9px] bg-green-100 text-green-600 font-bold px-1.5 py-0.5 rounded-full ml-auto">● Live</span>
                </div>
                <div className="flex gap-3">
                  <ProofPhotoCard label={t('pickupPhoto')}   url={order.pickup_proof_url}   takenAt={order.pickup_proof_at}   t={t} />
                  <ProofPhotoCard label={t('deliveryPhoto')} url={order.delivery_proof_url} takenAt={order.delivery_proof_at} t={t} />
                </div>
              </div>
            )}

            {/* ETA */}
            {!['delivered','cancelled'].includes(order.status) && (
              <div className="card bg-gradient-to-r from-brand-50 to-orange-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-brand-500" />
                  <span className="text-sm font-semibold text-brand-700">{t('estimatedArrival')}</span>
                </div>
                <span className="font-extrabold text-2xl text-brand-600">
                  ~{order.eta} <span className="text-base font-semibold">{t('minutes')}</span>
                </span>
              </div>
            )}

            {/* Bouton noter */}
            {order.status === 'delivered' && (
              <button onClick={() => setShowRating(true)} className="btn-primary w-full flex items-center justify-center gap-2">
                ⭐ {t('rateTitle')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
