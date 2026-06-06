import { useState, useRef, useEffect, useCallback } from 'react'
import {
  TrendingUp, Star, Bike, Phone, CheckCircle, XCircle, Package, Camera, Image,
  AlertTriangle, ShieldCheck, User, Wallet, History, ChevronDown, ChevronUp,
  LogOut, RefreshCw, Clock, Ban,
} from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import VerifiedBadge from '../ui/VerifiedBadge'
import MapRoute from '../ui/MapRoute'
import { splitCommission, formatAr, formatKm } from '../../lib/pricing'
import {
  supabase,
  acceptOrder as acceptOrderDb,
  updateOrderStatus,
  saveProofPhoto,
  setDriverAvailability,
  subscribeToDriverBalance,
} from '../../lib/supabase'
import { uploadProofPhoto } from '../../lib/storage'
import { getAvailableOrders, getMyActiveOrders, getMyDeliveredOrders } from '../../lib/driverAuth'
import { useDriverAuth } from '../../contexts/DriverAuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import DriverLogin from './DriverLogin'

const PACKAGE_EMOJI = { doc: '📄', food: '🍔', clothes: '👕', parcel: '📦', other: '📦' }

// ── Normalise une commande Supabase → forme attendue par l'UI / MapRoute ──
function normalizeOrder(o) {
  if (!o || typeof o !== 'object') return null
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : null }
  return {
    id:             o.id,
    tracking_code:  o.tracking_code ?? '—',
    type:           PACKAGE_EMOJI[o.package_type] ?? '📦',
    urgent:         !!o.is_urgent,
    price:          num(o.price_ariary) ?? 0,
    distance_km:    num(o.distance_km) ?? 0,
    pickup:         { lat: num(o.pickup_lat),   lng: num(o.pickup_lng),   label: o.pickup_label   ?? '' },
    delivery:       { lat: num(o.delivery_lat), lng: num(o.delivery_lng), label: o.delivery_label ?? '' },
    notes:          o.notes ?? '',
    client:         'Client',
    phone:          o.client_phone ?? null,       // souvent indisponible (pas de jointure)
    recipient_phone: o.recipient_phone ?? null,
    status:         o.status ?? 'pending',
    pickup_proof:   o.pickup_proof_url ?? null,
    delivery_proof: o.delivery_proof_url ?? null,
  }
}

const driverShareOf = (tr) =>
  Number(tr?.driver_share) || splitCommission(tr?.price_ariary ?? 0).driverShare

// ── Historique réel (commandes livrées, groupées par jour) ───────────────
function HistorySection({ history }) {
  const [open, setOpen] = useState(false)
  const trips = Array.isArray(history) ? history : []

  const totalTrips  = trips.length
  const totalEarned = trips.reduce((s, tr) => s + driverShareOf(tr), 0)

  // Grouper par jour (clé YYYY-MM-DD)
  const groups = {}
  for (const tr of trips) {
    const key = String(tr?.updated_at || tr?.created_at || '').slice(0, 10) || '—'
    if (!groups[key]) groups[key] = []
    groups[key].push(tr)
  }
  const days = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  function formatDay(key) {
    try {
      const d = new Date(`${key}T00:00:00`)
      if (isNaN(d.getTime())) return '—'
      const labels = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
      if (d.toDateString() === new Date().toDateString()) return "Aujourd'hui"
      return `${labels[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString('fr-FR', { month: 'short' })}`
    } catch { return '—' }
  }
  function formatTime(ts) {
    try {
      const d = new Date(ts)
      if (isNaN(d.getTime())) return ''
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } catch { return '' }
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between py-2">
        <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
          <History size={15} className="text-brand-500" />
          Historique des courses
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{totalTrips} course{totalTrips > 1 ? 's' : ''} · {formatAr(totalEarned)}</span>
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-3 mt-1 animate-fade-in">
          {days.length === 0 ? (
            <div className="card text-center py-6 text-gray-400 text-sm">Aucune course effectuée</div>
          ) : days.map(key => {
            const dayTrips = groups[key] ?? []
            const dayGain  = dayTrips.reduce((s, tr) => s + driverShareOf(tr), 0)
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{formatDay(key)}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400">{dayTrips.length} course{dayTrips.length > 1 ? 's' : ''}</span>
                    <span className="font-extrabold text-green-600">{formatAr(dayGain)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {dayTrips.map(trip => {
                    const share  = driverShareOf(trip)
                    const rating = Math.max(0, Math.min(5, Math.round(Number(trip?.rating) || 0)))
                    return (
                      <div key={trip?.id ?? trip?.tracking_code} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-3">
                        <div className="shrink-0">
                          <p className="text-xs font-bold font-mono text-gray-700">{trip?.tracking_code ?? '—'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{formatTime(trip?.updated_at || trip?.created_at)}</p>
                        </div>
                        <div className="flex-1 min-w-0 text-xs text-gray-500 truncate">
                          {(trip?.pickup_label ?? '—')} → {(trip?.delivery_label ?? '—')}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-green-600 text-sm">{formatAr(share)}</p>
                          <p className="text-yellow-500 text-[10px]">
                            {'★'.repeat(rating)}{'☆'.repeat(Math.max(0, 5 - rating))}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
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
          ${done ? 'bg-green-100 text-green-700 cursor-default' : 'bg-brand-500 text-white shadow-sm hover:bg-brand-600'}`}
      >
        {done ? <CheckCircle size={15} /> : <Camera size={15} />}
        {done ? t('photoAdded') : label}
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
    </div>
  )
}

export default function DriverDashboard({ t, onRegister }) {
  const tr = typeof t === 'function' ? t : (k) => k
  const { driver, loading, isLoggedIn, logout } = useDriverAuth()
  const { notify } = useNotifications()

  const [available, setAvailable]           = useState(false)
  const [pending, setPending]               = useState([])
  const [active, setActive]                 = useState([])
  const [history, setHistory]               = useState([])
  const [pendingBalance, setPendingBalance] = useState(0)
  const [refreshing, setRefreshing]         = useState(false)

  const driverId = driver?.id ?? null
  const status   = driver?.validation_status ?? null
  const isApproved = status === 'approved'

  // ── Chargement des données réelles ────────────────────────────
  const loadData = useCallback(async () => {
    if (!driverId) return
    setRefreshing(true)
    try {
      const [av, act, hist] = await Promise.all([
        getAvailableOrders(),
        getMyActiveOrders(driverId),
        getMyDeliveredOrders(driverId),
      ])
      setPending((Array.isArray(av) ? av : []).map(normalizeOrder).filter(Boolean))
      setActive((Array.isArray(act) ? act : []).map(normalizeOrder).filter(Boolean))
      setHistory(Array.isArray(hist) ? hist : [])
    } catch (e) {
      console.error('[DriverDashboard] loadData:', e)
    } finally {
      setRefreshing(false)
    }
  }, [driverId])

  // Synchroniser la disponibilité avec la fiche livreur
  useEffect(() => { setAvailable(!!driver?.is_available) }, [driver?.is_available])

  // Initialiser le solde affiché depuis la fiche livreur
  useEffect(() => { setPendingBalance(Number(driver?.pending_balance) || 0) }, [driverId, driver?.pending_balance])

  // Charger + s'abonner au temps réel quand le livreur est approuvé
  useEffect(() => {
    if (!driverId || !isApproved) return
    let alive = true
    loadData()

    const balSub = subscribeToDriverBalance(driverId, (b) => { if (alive) setPendingBalance(Number(b) || 0) })

    let orderSub
    try {
      orderSub = supabase
        .channel(`driver_orders:${driverId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => { if (alive) loadData() })
        .subscribe()
    } catch (e) { console.error('[DriverDashboard] orders sub:', e) }

    return () => {
      alive = false
      try { balSub?.unsubscribe?.() } catch { /* noop */ }
      try { orderSub?.unsubscribe?.() } catch { /* noop */ }
    }
  }, [driverId, isApproved, loadData])

  // ── Actions ───────────────────────────────────────────────────
  async function toggleAvailable() {
    if (!driverId) return
    const next = !available
    setAvailable(next)
    try {
      await setDriverAvailability(driverId, next)
    } catch (e) {
      console.error('[DriverDashboard] toggleAvailable:', e)
      setAvailable(!next)   // revert
    }
  }

  async function acceptOrder(order) {
    if (!driverId) return
    // Optimiste : déplacer de "disponibles" vers "en cours"
    setPending(p => p.filter(o => o.id !== order.id))
    setActive(a => [{ ...order, status: 'accepted' }, ...a])
    try {
      await acceptOrderDb(order.id, driverId)
      try { notify('driver_accepted', { driverName: driver?.name }) } catch { /* noop */ }
    } catch (e) {
      console.error('[DriverDashboard] acceptOrder:', e)
      // Revert + resync (la course a peut-être été prise par un autre)
      setActive(a => a.filter(o => o.id !== order.id))
      try { alert("Cette course n'est plus disponible.") } catch { /* noop */ }
      loadData()
    }
  }

  function declineOrder(id) {
    // Refus local : on masque la demande pour ce livreur (pas de changement DB)
    setPending(p => p.filter(o => o.id !== id))
  }

  async function advanceStatus(order) {
    const id = order.id
    if (order.status === 'accepted' && !order.pickup_proof)   { try { alert(tr('photoRequired')) } catch {} ; return }
    if (order.status === 'ontheway' && !order.delivery_proof) { try { alert(tr('photoRequired')) } catch {} ; return }

    const flow = { accepted: 'pickup', pickup: 'ontheway', ontheway: 'delivered' }
    const next = flow[order.status]
    if (!next) return

    // Optimiste
    if (next === 'delivered') setActive(a => a.filter(o => o.id !== id))
    else                      setActive(a => a.map(o => o.id === id ? { ...o, status: next } : o))

    try {
      await updateOrderStatus(id, next)
      if (next === 'delivered') {
        try { notify('delivered', { trackingCode: order.tracking_code }) } catch { /* noop */ }
        loadData()   // rafraîchir historique + solde
      }
    } catch (e) {
      console.error('[DriverDashboard] advanceStatus:', e)
      loadData()     // resynchroniser en cas d'échec
    }
  }

  async function setPickupProof(order, dataURL) {
    // Aperçu local immédiat (ne bloque pas si le Storage échoue)
    setActive(a => a.map(o => o.id === order.id ? { ...o, pickup_proof: dataURL } : o))
    try {
      const url = await uploadProofPhoto(order.id, 'pickup', dataURL)
      await saveProofPhoto(order.id, 'pickup', url)
      setActive(a => a.map(o => o.id === order.id ? { ...o, pickup_proof: url } : o))
    } catch (e) {
      console.error('[DriverDashboard] setPickupProof:', e)
    }
  }

  async function setDeliveryProof(order, dataURL) {
    setActive(a => a.map(o => o.id === order.id ? { ...o, delivery_proof: dataURL } : o))
    try {
      const url = await uploadProofPhoto(order.id, 'delivery', dataURL)
      await saveProofPhoto(order.id, 'delivery', url)
      setActive(a => a.map(o => o.id === order.id ? { ...o, delivery_proof: url } : o))
    } catch (e) {
      console.error('[DriverDashboard] setDeliveryProof:', e)
    }
  }

  const STATUS_BUTTON = {
    accepted: { label: tr('markPickedUp'),  color: 'bg-blue-500' },
    pickup:   { label: tr('markPickedUp'),  color: 'bg-purple-500' },
    ontheway: { label: tr('markDelivered'), color: 'bg-green-500' },
  }

  // ════════════════════════════════════════════════════════════
  // ÉTATS DE GARDE (l'ordre des hooks ci-dessus est inconditionnel)
  // ════════════════════════════════════════════════════════════

  // 1. Chargement de la session
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-gray-400">
        <svg className="animate-spin h-7 w-7 text-brand-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm">Chargement…</p>
      </div>
    )
  }

  // 2. Pas connecté → écran de connexion livreur
  if (!isLoggedIn) {
    return <DriverLogin t={t} onRegister={onRegister} />
  }

  // 3. Connecté mais aucune fiche livreur liée
  if (!driver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
          <User size={36} className="text-gray-400" />
        </div>
        <h2 className="font-extrabold text-xl text-gray-900 mb-2">Compte livreur introuvable</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-5">
          Aucune fiche livreur n'est associée à ce compte. Contactez le support ou inscrivez-vous comme livreur.
        </p>
        <button onClick={() => logout()} className="btn-secondary w-full max-w-xs flex items-center justify-center gap-2">
          <LogOut size={15} /> Se déconnecter
        </button>
      </div>
    )
  }

  // 4. Suspendu
  if (status === 'suspended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mb-4">
          <Ban size={36} className="text-red-500" />
        </div>
        <h2 className="font-extrabold text-xl text-gray-900 mb-2">Compte suspendu</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-4">{tr('suspendedWarning')}</p>
        <div className="bg-red-50 rounded-2xl px-5 py-3 border border-red-100 w-full max-w-xs mb-5">
          <p className="text-xs text-red-600 font-medium">
            Note moyenne : <span className="font-extrabold">{driver?.rating ?? '—'} / 5</span>
          </p>
          {driver?.suspension_reason && (
            <p className="text-xs text-red-500 mt-1">{driver.suspension_reason}</p>
          )}
          <p className="text-xs text-red-500 mt-1">Contactez le support pour réactiver votre compte.</p>
        </div>
        <button onClick={() => logout()} className="btn-secondary w-full max-w-xs flex items-center justify-center gap-2">
          <LogOut size={15} /> Se déconnecter
        </button>
      </div>
    )
  }

  // 5. Rejeté
  if (status === 'rejected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mb-4">
          <XCircle size={36} className="text-red-500" />
        </div>
        <h2 className="font-extrabold text-xl text-gray-900 mb-2">Inscription refusée</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-4">
          {driver?.rejection_reason || "Votre demande d'inscription n'a pas été acceptée. Contactez le support pour plus d'informations."}
        </p>
        <button onClick={() => logout()} className="btn-secondary w-full max-w-xs flex items-center justify-center gap-2">
          <LogOut size={15} /> Se déconnecter
        </button>
      </div>
    )
  }

  // 6. En attente de validation (pending ou statut inconnu)
  if (status !== 'approved') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-yellow-100 rounded-3xl flex items-center justify-center mb-4">
          <Clock size={36} className="text-yellow-600" />
        </div>
        <h2 className="font-extrabold text-xl text-gray-900 mb-2">{tr('pendingValidation')}</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-2">
          Votre compte est en attente de validation par notre équipe.
        </p>
        <p className="text-gray-400 text-xs leading-relaxed max-w-xs mb-5">{tr('registrationSentDesc')}</p>
        <button onClick={() => logout()} className="btn-secondary w-full max-w-xs flex items-center justify-center gap-2">
          <LogOut size={15} /> Se déconnecter
        </button>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════
  // TABLEAU DE BORD (livreur approuvé)
  // ════════════════════════════════════════════════════════════
  const ratingNum   = Number(driver?.rating)
  const ratingValid = isFinite(ratingNum) && ratingNum > 0
  const todayKey    = new Date().toISOString().slice(0, 10)
  const todayTrips  = history.filter(h => String(h?.updated_at || h?.created_at || '').slice(0, 10) === todayKey)
  const todayEarnings = todayTrips.reduce((s, trp) => s + driverShareOf(trp), 0)

  return (
    <div className="pb-28 animate-fade-in">
      {/* Driver header */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white px-5 pt-5 pb-6 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />

        <div className="flex items-center gap-3 mb-5 relative">
          {/* Avatar */}
          <div className="relative shrink-0">
            {driver?.profile_photo_url ? (
              <img src={driver.profile_photo_url} alt={driver?.name ?? ''} className="w-12 h-12 rounded-2xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center">
                <User size={22} className="text-white" />
              </div>
            )}
            {driver?.is_verified && (
              <div className="absolute -bottom-1.5 -right-1.5"><VerifiedBadge size="sm" /></div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">{driver?.name ?? 'Livreur'}</p>
            {driver?.is_verified && (
              <div className="flex items-center gap-1 text-[10px] text-blue-300 font-semibold">
                <ShieldCheck size={10} /> {tr('verifiedDriver')}
              </div>
            )}
            <p className="text-gray-400 text-xs">
              ★ {ratingValid ? ratingNum : '—'} · {driver?.total_trips ?? 0} course{(driver?.total_trips ?? 0) > 1 ? 's' : ''}
            </p>
          </div>

          <button
            onClick={toggleAvailable}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0
              ${available ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-white dot-ping' : 'bg-gray-400'}`} />
            {available ? tr('available') : tr('unavailable')}
          </button>
        </div>

        {/* Alerte note proche du seuil de suspension */}
        {ratingValid && ratingNum < 4.0 && ratingNum >= 3.5 && (
          <div className="bg-orange-500/20 border border-orange-400/30 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
            <AlertTriangle size={14} className="text-orange-300 shrink-0" />
            <p className="text-xs text-orange-200">
              Attention : note à <strong>{ratingNum}</strong>. En dessous de 3.5, votre compte sera suspendu automatiquement.
            </p>
          </div>
        )}

        {/* Stats du jour */}
        <div className="flex gap-3 relative">
          <StatCard icon={TrendingUp} label={tr('todayEarnings')} value={formatAr(todayEarnings)} color="bg-brand-500" />
          <StatCard icon={Bike}       label={tr('todayTrips')}    value={String(todayTrips.length)} color="bg-blue-500" />
          <StatCard icon={Star}       label={tr('rating')}        value={ratingValid ? ratingNum : '—'} color="bg-yellow-500" />
        </div>

        {/* Solde à recevoir ce soir */}
        <div className={`relative mt-3 rounded-2xl px-4 py-3 flex items-center gap-3 border
          ${pendingBalance > 0 ? 'bg-green-500/15 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
          <div className={`rounded-xl p-2 ${pendingBalance > 0 ? 'bg-green-500' : 'bg-gray-600'}`}>
            <Wallet size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide">Votre solde à recevoir ce soir</p>
            <p className={`font-extrabold text-xl leading-tight ${pendingBalance > 0 ? 'text-green-300' : 'text-white/40'}`}>
              {pendingBalance > 0 ? formatAr(pendingBalance) : '—'}
            </p>
          </div>
          {pendingBalance > 0 && (
            <span className="text-[10px] bg-green-500 text-black font-bold px-2 py-1 rounded-full animate-pulse">EN ATTENTE</span>
          )}
        </div>

        {/* Barre d'actions : rafraîchir + déconnexion */}
        <div className="relative mt-3 flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white/80 text-xs font-semibold py-2 rounded-xl transition"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Actualiser
          </button>
          <button
            onClick={() => logout()}
            className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white/80 text-xs font-semibold px-3 py-2 rounded-xl transition"
          >
            <LogOut size={13} /> Déconnexion
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* ── Nouvelles demandes ──────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-gray-700">{tr('pendingRequests')}</h3>
            {pending.length > 0 && (
              <span className="bg-brand-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </div>

          {pending.length === 0 ? (
            <div className="card text-center py-6 text-gray-400 text-sm">{tr('noRequests')}</div>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map(order => {
                const { driverShare, commission } = splitCommission(order.price)
                return (
                  <div key={order.id} className="card animate-slide-up">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{order.type}</span>
                        <div>
                          <p className="font-bold text-xs text-gray-500">{order.tracking_code}</p>
                          {order.urgent && (
                            <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">URGENT</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400">Prix client</p>
                        <p className="font-extrabold text-gray-700 text-sm">{formatAr(order.price)}</p>
                      </div>
                    </div>

                    <MapRoute pickup={order.pickup} delivery={order.delivery} distanceKm={order.distance_km} height={160} />

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

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => declineOrder(order.id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-semibold active:scale-95 transition"
                      >
                        <XCircle size={14} /> {tr('decline')}
                      </button>
                      <button
                        onClick={() => acceptOrder(order)}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold active:scale-95 transition"
                      >
                        <CheckCircle size={14} /> {tr('accept')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Courses en cours ────────────────────────────── */}
        {active.length > 0 && (
          <div>
            <h3 className="font-bold text-sm text-gray-700 mb-2">{tr('inProgress')}</h3>
            <div className="flex flex-col gap-3">
              {active.map(order => {
                const btnCfg = STATUS_BUTTON[order.status]
                const blocked =
                  (order.status === 'accepted' && !order.pickup_proof) ||
                  (order.status === 'ontheway' && !order.delivery_proof)
                return (
                  <div key={order.id} className="card border-l-4 border-brand-500 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm font-mono text-gray-700">{order.tracking_code}</span>
                      <StatusBadge status={order.status} label={tr(`status_${order.status}`)} />
                    </div>

                    <MapRoute
                      pickup={order.pickup}
                      delivery={order.delivery}
                      distanceKm={order.distance_km}
                      driverShare={splitCommission(order.price).driverShare}
                      height={180}
                    />

                    {order.notes && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wide mb-1">📋 Indications client</p>
                        <p className="text-sm font-semibold text-orange-700 leading-snug">{order.notes}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        {order.phone ? (
                          <a href={`tel:${order.phone}`} className="flex items-center gap-1.5 bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition shadow-sm">
                            <Phone size={13} /> Client — {order.client}
                          </a>
                        ) : <span />}
                        <div className="text-right">
                          <p className="font-extrabold text-green-600 text-sm">{formatAr(splitCommission(order.price).driverShare)}</p>
                          <p className="text-[10px] text-gray-400">votre gain · {formatKm(order.distance_km)}</p>
                        </div>
                      </div>

                      {order.recipient_phone && (
                        <a href={`tel:${order.recipient_phone}`} className="flex items-center gap-1.5 bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition shadow-sm w-fit">
                          <Phone size={13} /> Appeler destinataire — {order.recipient_phone}
                        </a>
                      )}
                    </div>

                    {btnCfg && (
                      <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
                        {order.status === 'accepted' && (
                          <PhotoProofButton
                            label={tr('takePickupPhoto')}
                            done={!!order.pickup_proof}
                            onCapture={url => setPickupProof(order, url)}
                            t={tr}
                          />
                        )}

                        {order.pickup_proof && order.status !== 'accepted' && (
                          <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                            <Image size={13} className="text-green-600" />
                            <span className="text-xs text-green-700 font-medium">{tr('pickupPhoto')} ✓</span>
                          </div>
                        )}

                        {order.status === 'ontheway' && (
                          <PhotoProofButton
                            label={tr('takeDeliveryPhoto')}
                            done={!!order.delivery_proof}
                            onCapture={url => setDeliveryProof(order, url)}
                            t={tr}
                          />
                        )}

                        <button
                          onClick={() => advanceStatus(order)}
                          className={`flex items-center justify-center gap-1.5 text-white text-xs font-bold px-3 py-3 rounded-xl active:scale-95 transition ${btnCfg.color} ${blocked ? 'opacity-50' : ''}`}
                        >
                          <Package size={14} /> {btnCfg.label}
                        </button>

                        {blocked && (
                          <p className="text-[10px] text-orange-500 text-center flex items-center justify-center gap-1">
                            <AlertTriangle size={11} /> {tr('photoRequired')}
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
        <HistorySection history={history} />
      </div>
    </div>
  )
}
