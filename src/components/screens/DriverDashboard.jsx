import { useState, useRef, useEffect } from 'react'
import { TrendingUp, Star, Bike, Phone, CheckCircle, XCircle, Package, Camera, Image, AlertTriangle, ShieldCheck, User, Navigation, MapPin, Wallet, History, ChevronDown, ChevronUp } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import VerifiedBadge from '../ui/VerifiedBadge'
import MapRoute from '../ui/MapRoute'
import { splitCommission, formatAr, formatKm, DRIVER_RATE } from '../../lib/pricing'
import { subscribeToDriverBalance } from '../../lib/supabase'
import { useNotifications } from '../../contexts/NotificationContext'

const MOCK_DRIVER_PROFILE = {
  id: 'drv-mock-001',
  name: 'Hery Andriamahefa',
  rating: 4.9,
  total_trips: 127,
  validation_status: 'approved',
  is_verified: true,
  photo_url: null,
  suspension_reason: null,
  pending_balance: 18500,   // Solde à recevoir ce soir (mis à jour par Realtime)
}

// Coordonnées réelles Antananarivo
const MOCK_PENDING = [
  {
    id: 101,
    tracking_code: 'MDL-3012',
    pickup:   { lat: -18.9108, lng: 47.5258, label: 'Tsaralalàna' },
    delivery: { lat: -18.9350, lng: 47.5270, label: 'Ankadifotsy' },
    type: '📦',
    distance_km: 2.4,
    price: 3900,
    urgent: true,
  },
  {
    id: 102,
    tracking_code: 'MDL-3015',
    pickup:   { lat: -18.9161, lng: 47.5360, label: 'Analakely' },
    delivery: { lat: -18.8950, lng: 47.5520, label: 'Ivandry' },
    type: '📄',
    distance_km: 4.1,
    price: 5000,
    urgent: false,
  },
]

const MOCK_ACTIVE = [
  {
    id: 99,
    tracking_code: 'MDL-2990',
    status: 'accepted',
    pickup:   { lat: -18.9215, lng: 47.5310, label: 'Behoririka' },
    delivery: { lat: -18.9260, lng: 47.5190, label: 'Isotry' },
    client: 'Haingo R.',
    phone: '+261 33 98 765 43',
    recipient_phone: '+261 34 11 223 34',
    price: 5000,
    distance_km: 3.2,
    notes: 'Maison rouge après le 3ème escalier, appelle en arrivant au carrefour Total',
    pickup_proof: null,
    delivery_proof: null,
  }
]

// ── Historique des courses (mock — en prod : requête Supabase) ──
const MOCK_HISTORY = [
  {
    date:  '2026-06-04',
    trips: [
      { id:'h1', code:'MDL-2990', pickup:'Behoririka',   delivery:'Isotry',         price:5000,  rating:5, time:'18:42' },
      { id:'h2', code:'MDL-2985', pickup:'Analakely',    delivery:'Ankadifotsy',    price:3900,  rating:4, time:'16:15' },
      { id:'h3', code:'MDL-2980', pickup:'Tsaralalàna',  delivery:'Ambohimanarina', price:8000,  rating:5, time:'13:30' },
    ],
  },
  {
    date:  '2026-06-03',
    trips: [
      { id:'h4', code:'MDL-2970', pickup:'Mahamasina',   delivery:'Ivandry',        price:10200, rating:4, time:'17:55' },
      { id:'h5', code:'MDL-2965', pickup:'67 Ha',        delivery:'Anosibe',        price:3900,  rating:5, time:'14:20' },
    ],
  },
  {
    date:  '2026-06-02',
    trips: [
      { id:'h6', code:'MDL-2955', pickup:'Andravoahangy',delivery:'Ankorondrano',   price:6600,  rating:3, time:'19:10' },
      { id:'h7', code:'MDL-2950', pickup:'Behoririka',   delivery:'67 Ha',          price:5000,  rating:5, time:'11:05' },
      { id:'h8', code:'MDL-2945', pickup:'Isotry',       delivery:'Ambohipo',       price:10200, rating:4, time:'09:30' },
    ],
  },
]

function HistorySection({ t }) {
  const [open, setOpen] = useState(false)

  const totalTrips   = MOCK_HISTORY.flatMap(d => d.trips).length
  const totalEarned  = MOCK_HISTORY.flatMap(d => d.trips)
    .reduce((s, tr) => s + splitCommission(tr.price).driverShare, 0)

  function formatDate(dateStr) {
    const d    = new Date(dateStr)
    const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
    const today = new Date().toDateString()
    if (d.toDateString() === today) return 'Aujourd\'hui'
    return `${days[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString('fr-FR',{month:'short'})}`
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-2"
      >
        <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
          <History size={15} className="text-brand-500" />
          Historique des courses
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{totalTrips} courses · {formatAr(totalEarned)}</span>
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-3 mt-1 animate-fade-in">
          {MOCK_HISTORY.map(day => {
            const dayGain = day.trips.reduce((s, tr) => s + splitCommission(tr.price).driverShare, 0)
            return (
              <div key={day.date}>
                {/* En-tête du jour */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    {formatDate(day.date)}
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400">{day.trips.length} course{day.trips.length > 1 ? 's' : ''}</span>
                    <span className="font-extrabold text-green-600">{formatAr(dayGain)}</span>
                  </div>
                </div>

                {/* Courses du jour */}
                <div className="flex flex-col gap-1.5">
                  {day.trips.map(trip => {
                    const share = splitCommission(trip.price).driverShare
                    return (
                      <div key={trip.id} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-3">
                        {/* Code + heure */}
                        <div className="shrink-0">
                          <p className="text-xs font-bold font-mono text-gray-700">{trip.code}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{trip.time}</p>
                        </div>

                        {/* Trajet */}
                        <div className="flex-1 min-w-0 text-xs text-gray-500 truncate">
                          {trip.pickup} → {trip.delivery}
                        </div>

                        {/* Note + gain */}
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-green-600 text-sm">{formatAr(share)}</p>
                          <p className="text-yellow-500 text-[10px]">
                            {'★'.repeat(trip.rating)}{'☆'.repeat(5 - trip.rating)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Total global */}
          <div className="card bg-gray-900 text-white flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Total {MOCK_HISTORY.length} derniers jours</p>
              <p className="font-bold text-sm">{totalTrips} courses effectuées</p>
            </div>
            <p className="font-extrabold text-xl text-green-400">{formatAr(totalEarned)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex-1 flex flex-col items-center gap-1 py-3">
      <div className={`rounded-xl p-2 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <p className="font-extrabold text-lg text-gray-900 leading-none">{value}</p>
      <p className="text-[10px] text-gray-400 text-center font-medium">{label}</p>
    </div>
  )
}

// ── Bouton de prise de photo ─────────────────────────────────
function PhotoProofButton({ label, done, onCapture, t }) {
  const inputRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onCapture(ev.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => !done && inputRef.current?.click()}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition active:scale-95
          ${done
            ? 'bg-green-100 text-green-700 cursor-default'
            : 'bg-brand-500 text-white shadow-sm hover:bg-brand-600'}`}
      >
        {done ? <CheckCircle size={15} /> : <Camera size={15} />}
        {done ? t('photoAdded') : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}

export default function DriverDashboard({ t }) {
  const [profile]           = useState(MOCK_DRIVER_PROFILE)
  const [available, setAvailable] = useState(profile.validation_status === 'approved')
  const [pending, setPending]     = useState(MOCK_PENDING)
  const [active, setActive]       = useState(MOCK_ACTIVE)

  const { notify } = useNotifications()

  // Solde en attente — mis à jour en temps réel via Supabase Realtime
  const [pendingBalance, setPendingBalance] = useState(profile.pending_balance ?? 0)

  useEffect(() => {
    if (!profile.id || profile.id.startsWith('drv-mock')) return  // pas de sub en mode démo
    const sub = subscribeToDriverBalance(profile.id, (balance) => {
      setPendingBalance(balance)
    })
    return () => { sub?.unsubscribe?.() }
  }, [profile.id])

  function acceptOrder(order) {
    setPending(p => p.filter(o => o.id !== order.id))
    setActive(a => [...a, {
      ...order,
      status: 'accepted',
      client: 'Client',
      phone: '+261 34 00 000 00',
      pickup_proof: null,
      delivery_proof: null,
    }])
    // Notifier le client que son livreur est en route
    notify('driver_accepted', { driverName: profile.name })
  }

  function declineOrder(id) {
    setPending(p => p.filter(o => o.id !== id))
  }

  // Avancer le statut avec vérification photo obligatoire
  function advanceStatus(id) {
    setActive(a => a.map(o => {
      if (o.id !== id) return o

      // accepted → pickup : photo de collecte obligatoire
      if (o.status === 'accepted' && !o.pickup_proof) {
        alert(t('photoRequired'))
        return o
      }
      // ontheway → delivered : photo de livraison obligatoire
      if (o.status === 'ontheway' && !o.delivery_proof) {
        alert(t('photoRequired'))
        return o
      }

      const flow = { accepted: 'pickup', pickup: 'ontheway', ontheway: 'delivered' }
      const next = flow[o.status]
      // Notifier le client quand la livraison est confirmée
      if (o.status === 'ontheway' && next === 'delivered') {
        notify('delivered', { trackingCode: o.tracking_code })
      }
      return next ? { ...o, status: next } : o
    }).filter(o => o.status !== 'delivered'))
  }

  function setPickupProof(id, url) {
    setActive(a => a.map(o => o.id === id ? { ...o, pickup_proof: url } : o))
  }

  function setDeliveryProof(id, url) {
    setActive(a => a.map(o => o.id === id ? { ...o, delivery_proof: url } : o))
  }

  const STATUS_BUTTON = {
    accepted: { label: t('markPickedUp'), color: 'bg-blue-500',   requires: 'pickup_proof',   photoLabel: t('takePickupPhoto') },
    pickup:   { label: t('markPickedUp'), color: 'bg-purple-500', requires: null,              photoLabel: null },
    ontheway: { label: t('markDelivered'), color: 'bg-green-500', requires: 'delivery_proof',  photoLabel: t('takeDeliveryPhoto') },
  }

  // ── Livreur suspendu ────────────────────────────────────────
  if (profile.validation_status === 'suspended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mb-4">
          <AlertTriangle size={36} className="text-red-500" />
        </div>
        <h2 className="font-extrabold text-xl text-gray-900 mb-2">Compte suspendu</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-4">{t('suspendedWarning')}</p>
        <div className="bg-red-50 rounded-2xl px-5 py-3 border border-red-100 w-full max-w-xs">
          <p className="text-xs text-red-600 font-medium">
            Note moyenne : <span className="font-extrabold">3.1 / 5</span>
          </p>
          <p className="text-xs text-red-500 mt-1">Contactez le support pour réactiver votre compte.</p>
        </div>
      </div>
    )
  }

  // ── Livreur en attente de validation ────────────────────────
  if (profile.validation_status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-yellow-100 rounded-3xl flex items-center justify-center mb-4">
          <ShieldCheck size={36} className="text-yellow-600" />
        </div>
        <h2 className="font-extrabold text-xl text-gray-900 mb-2">{t('pendingValidation')}</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{t('registrationSentDesc')}</p>
      </div>
    )
  }

  return (
    <div className="pb-28 animate-fade-in">
      {/* Driver header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white px-5 pt-5 pb-6 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />

        <div className="flex items-center gap-3 mb-5 relative">
          {/* Avatar */}
          <div className="relative shrink-0">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.name} className="w-12 h-12 rounded-2xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center">
                <User size={22} className="text-white" />
              </div>
            )}
            {profile.is_verified && (
              <div className="absolute -bottom-1.5 -right-1.5">
                <VerifiedBadge size="sm" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-base truncate">{profile.name}</p>
            </div>
            {profile.is_verified && (
              <div className="flex items-center gap-1 text-[10px] text-blue-300 font-semibold">
                <ShieldCheck size={10} /> {t('verifiedDriver')}
              </div>
            )}
            <p className="text-gray-400 text-xs">★ {profile.rating} · {profile.total_trips} courses ce mois</p>
          </div>

          <button
            onClick={() => setAvailable(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0
              ${available ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-white dot-ping' : 'bg-gray-400'}`} />
            {available ? t('available') : t('unavailable')}
          </button>
        </div>

        {/* Rating warning si proche de 3.5 */}
        {profile.rating < 4.0 && profile.rating >= 3.5 && (
          <div className="bg-orange-500/20 border border-orange-400/30 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
            <AlertTriangle size={14} className="text-orange-300 shrink-0" />
            <p className="text-xs text-orange-200">
              Attention : note à <strong>{profile.rating}</strong>. En dessous de 3.5, votre compte sera suspendu automatiquement.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-3 relative">
          <StatCard icon={TrendingUp} label={t('todayEarnings')} value="18 500 Ar" color="bg-brand-500" />
          <StatCard icon={Bike}       label={t('todayTrips')}    value="7"          color="bg-blue-500" />
          <StatCard icon={Star}       label={t('rating')}        value={profile.rating} color="bg-yellow-500" />
        </div>

        {/* Solde à recevoir ce soir */}
        <div className={`relative mt-3 rounded-2xl px-4 py-3 flex items-center gap-3 border
          ${pendingBalance > 0
            ? 'bg-green-500/15 border-green-500/30'
            : 'bg-white/5 border-white/10'}`}>
          <div className={`rounded-xl p-2 ${pendingBalance > 0 ? 'bg-green-500' : 'bg-gray-600'}`}>
            <Wallet size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide">
              Votre solde à recevoir ce soir
            </p>
            <p className={`font-extrabold text-xl leading-tight ${pendingBalance > 0 ? 'text-green-300' : 'text-white/40'}`}>
              {pendingBalance > 0 ? formatAr(pendingBalance) : '—'}
            </p>
          </div>
          {pendingBalance > 0 && (
            <span className="text-[10px] bg-green-500 text-black font-bold px-2 py-1 rounded-full animate-pulse">
              EN ATTENTE
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* ── Nouvelles demandes ──────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-gray-700">{t('pendingRequests')}</h3>
            {pending.length > 0 && (
              <span className="bg-brand-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </div>

          {pending.length === 0 ? (
            <div className="card text-center py-6 text-gray-400 text-sm">{t('noRequests')}</div>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map(order => (
                <div key={order.id} className="card animate-slide-up">
                  {/* En-tête : type + code + prix total */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{order.type}</span>
                      <div>
                        <p className="font-bold text-xs text-gray-500">{order.tracking_code}</p>
                        {order.urgent && (
                          <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">
                            URGENT
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400">Prix client</p>
                      <p className="font-extrabold text-gray-700 text-sm">{formatAr(order.price)}</p>
                    </div>
                  </div>

                  {/* Mini-carte du trajet */}
                  <MapRoute
                    pickup={order.pickup}
                    delivery={order.delivery}
                    distanceKm={order.distance_km}
                    height={160}
                  />

                  {/* ── Part livreur mise en avant ── */}
                  {(() => {
                    const { driverShare, commission } = splitCommission(order.price)
                    return (
                      <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">Votre gain</p>
                          <p className="font-extrabold text-green-700 text-lg leading-none">{formatAr(driverShare)}</p>
                          <p className="text-[10px] text-green-500 mt-0.5">sur {formatAr(order.price)} total</p>
                        </div>
                        <div className="text-right text-[10px] text-gray-400">
                          <p>{order.distance_km ? `${order.distance_km} km` : ''}</p>
                          <p>Commission : {formatAr(commission)}</p>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => declineOrder(order.id)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-semibold active:scale-95 transition"
                    >
                      <XCircle size={14} /> {t('decline')}
                    </button>
                    <button
                      onClick={() => acceptOrder(order)}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold active:scale-95 transition"
                    >
                      <CheckCircle size={14} /> {t('accept')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Courses en cours ────────────────────────────── */}
        {active.length > 0 && (
          <div>
            <h3 className="font-bold text-sm text-gray-700 mb-2">{t('inProgress')}</h3>
            <div className="flex flex-col gap-3">
              {active.map(order => {
                const btnCfg = STATUS_BUTTON[order.status]
                return (
                  <div key={order.id} className="card border-l-4 border-brand-500 flex flex-col gap-3">
                    {/* En-tête */}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm font-mono text-gray-700">{order.tracking_code}</span>
                      <StatusBadge status={order.status} label={t(`status_${order.status}`)} />
                    </div>

                    {/* ── Carte du trajet ──────────────────── */}
                    <MapRoute
                      pickup={order.pickup}
                      delivery={order.delivery}
                      distanceKm={order.distance_km}
                      driverShare={splitCommission(order.price).driverShare}
                      height={180}
                    />

                    {/* Indications du client — affichées en gros et en orange */}
                    {order.notes && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wide mb-1">
                          📋 Indications client
                        </p>
                        <p className="text-sm font-semibold text-orange-700 leading-snug">
                          {order.notes}
                        </p>
                      </div>
                    )}

                    {/* Client + destinataire + gain */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        {/* Appeler le client (expéditeur) */}
                        <a
                          href={`tel:${order.phone}`}
                          className="flex items-center gap-1.5 bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition shadow-sm"
                        >
                          <Phone size={13} /> Client — {order.client}
                        </a>
                        <div className="text-right">
                          <p className="font-extrabold text-green-600 text-sm">{formatAr(splitCommission(order.price).driverShare)}</p>
                          <p className="text-[10px] text-gray-400">votre gain · {formatKm(order.distance_km)}</p>
                        </div>
                      </div>

                      {/* Appeler le destinataire (si renseigné) */}
                      {order.recipient_phone && (
                        <a
                          href={`tel:${order.recipient_phone}`}
                          className="flex items-center gap-1.5 bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition shadow-sm w-fit"
                        >
                          <Phone size={13} /> Appeler destinataire — {order.recipient_phone}
                        </a>
                      )}
                    </div>

                    {/* ── Photos de preuve ─────────────────── */}
                    {btnCfg && (
                      <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
                        {/* Photo collecte (nécessaire pour accepted → pickup) */}
                        {(order.status === 'accepted') && (
                          <PhotoProofButton
                            label={t('takePickupPhoto')}
                            done={!!order.pickup_proof}
                            onCapture={url => setPickupProof(order.id, url)}
                            t={t}
                          />
                        )}

                        {/* Aperçu photo collecte si disponible */}
                        {order.pickup_proof && order.status !== 'accepted' && (
                          <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                            <Image size={13} className="text-green-600" />
                            <span className="text-xs text-green-700 font-medium">{t('pickupPhoto')} ✓</span>
                          </div>
                        )}

                        {/* Photo livraison (nécessaire pour ontheway → delivered) */}
                        {order.status === 'ontheway' && (
                          <PhotoProofButton
                            label={t('takeDeliveryPhoto')}
                            done={!!order.delivery_proof}
                            onCapture={url => setDeliveryProof(order.id, url)}
                            t={t}
                          />
                        )}

                        {/* Bouton avancer statut */}
                        <button
                          onClick={() => advanceStatus(order.id)}
                          className={`flex items-center justify-center gap-1.5 text-white text-xs font-bold px-3 py-3 rounded-xl active:scale-95 transition ${btnCfg.color}
                            ${
                              (order.status === 'accepted' && !order.pickup_proof) ||
                              (order.status === 'ontheway' && !order.delivery_proof)
                                ? 'opacity-50'
                                : ''
                            }`}
                        >
                          <Package size={14} />
                          {btnCfg.label}
                        </button>

                        {/* Message photo obligatoire */}
                        {((order.status === 'accepted' && !order.pickup_proof) ||
                          (order.status === 'ontheway' && !order.delivery_proof)) && (
                          <p className="text-[10px] text-orange-500 text-center flex items-center justify-center gap-1">
                            <AlertTriangle size={11} /> {t('photoRequired')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Historique des courses ───────────────────────── */}
        <HistorySection t={t} />
      </div>
    </div>
  )
}
