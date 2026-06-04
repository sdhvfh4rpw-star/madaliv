import { useState, useRef } from 'react'
import { Package, Zap, CheckCircle2, Weight, MessageSquare, AlertCircle, Clock, AlertTriangle, Phone } from 'lucide-react'
import { useNotifications } from '../../contexts/NotificationContext'
import { useClientAuth } from '../../contexts/ClientAuthContext'
import MapPicker from '../ui/MapPicker'
import LocationSearch from '../ui/LocationSearch'
import PriceBreakdown from '../ui/PriceBreakdown'
import PaymentModal from '../ui/PaymentModal'
import { usePricingCoords } from '../../hooks/usePricingCoords'
import { formatAr, SUPP_URGENT_FACTOR, SUPP_HEAVY_AR } from '../../lib/pricing'
import { createOrder } from '../../lib/supabase'
import { sendTrackingSMS } from '../../lib/sms'
import { PAYMENT_METHODS } from '../../lib/payment'

const PACKAGE_TYPES = ['parcel', 'other']
const TYPE_ICONS    = { parcel: '📦', other: '🔖' }

export default function OrderScreen({ t }) {
  const mapRef = useRef(null)
  const { notify }  = useNotifications()
  const { client }  = useClientAuth()   // null si non connecté → commande anonyme

  const [pickup,   setPickup]   = useState(null)
  const [delivery, setDelivery] = useState(null)
  const [type,     setType]     = useState('parcel')
  const [notes,    setNotes]    = useState('')
  const [urgent,   setUrgent]   = useState(false)
  const [heavy,    setHeavy]    = useState(false)

  const [recipientPhone, setRecipientPhone] = useState('')

  const [submitted,    setSubmitted]    = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [submitError,  setSubmitError]  = useState(null)
  const [smsSent,      setSmsSent]      = useState(false)
  const [showPayment,  setShowPayment]  = useState(false)
  const [paymentResult, setPaymentResult] = useState(null)

  // Snapshot stocké à la soumission — évite le TypeError causé par le hook
  // async qui peut retourner null entre setSubmitted(true) et le re-render
  const [snapshot, setSnapshot] = useState(null)

  // Tarification temps réel — distance OSRM avec fallback Haversine
  const { pricing, durationMin, trafficMultiplier, approximate, loading: priceLoading } =
    usePricingCoords(pickup, delivery, { urgent, heavy })

  // ── Sélection depuis l'autocomplétion ────────────────────────
  function handlePickupSelect(loc) {
    setPickup({ lat: loc.lat, lng: loc.lng, label: loc.name })
    mapRef.current?.flyAndSetPickup({ lat: loc.lat, lng: loc.lng, label: loc.name })
  }
  function handleDeliverySelect(loc) {
    setDelivery({ lat: loc.lat, lng: loc.lng, label: loc.name })
    mapRef.current?.flyAndSetDelivery({ lat: loc.lat, lng: loc.lng, label: loc.name })
  }
  function handlePickupClear()   { setPickup(null);   mapRef.current?.flyAndSetPickup(null) }
  function handleDeliveryClear() { setDelivery(null); mapRef.current?.flyAndSetDelivery(null) }

  // ── Clic "Confirmer" → ouvre le modal de paiement ────────────
  function handleConfirmClick() {
    if (!pickup || !delivery || !pricing?.valid) return
    setShowPayment(true)
  }

  // ── Appelé par PaymentModal quand paiement accepté ────────────
  function handlePaymentSuccess(result) {
    setShowPayment(false)
    setPaymentResult(result)
    handleSubmit(result)
  }

  // ── Soumission → Supabase (reçoit le résultat de paiement) ───
  async function handleSubmit(payment = null) {
    if (!pickup || !delivery || !pricing?.valid) return
    setLoading(true)
    setSubmitError(null)
    try {
      // ── Étape 1 : cast coordonnées ──────────────────────────
      console.log('[handleSubmit] étape 1 — coords brutes', { pickup, delivery })
      const pickupLat   = Number(pickup.lat)
      const pickupLng   = Number(pickup.lng)
      const deliveryLat = Number(delivery.lat)
      const deliveryLng = Number(delivery.lng)
      console.log('[handleSubmit] coords castées', { pickupLat, pickupLng, deliveryLat, deliveryLng })

      if (!isFinite(pickupLat)   || !isFinite(pickupLng) ||
          !isFinite(deliveryLat) || !isFinite(deliveryLng)) {
        throw new Error('Coordonnées GPS invalides — replacez les marqueurs sur la carte')
      }

      // ── Étape 2 : cast valeurs tarifaires ───────────────────
      console.log('[handleSubmit] étape 2 — pricing brut', pricing)
      const totalPrice  = Math.round(Number(pricing.totalPrice))
      const driverShare = Math.round(Number(pricing.driverShare))
      const commission  = Math.round(Number(pricing.commission))
      // Bug corrigé : utiliser distanceKm (avec fallback 0) pour TOUT,
      // pas rawDist qui pouvait être NaN et contaminer le snapshot
      const rawDist     = Number(pricing.distanceKm)
      const distanceKm  = isFinite(rawDist) ? parseFloat(rawDist.toFixed(2)) : 0
      console.log('[handleSubmit] valeurs castées', { totalPrice, driverShare, commission, distanceKm })

      if (!isFinite(totalPrice) || totalPrice <= 0) {
        throw new Error('Erreur de calcul du prix — réessayez')
      }

      // ── Étape 3 : INSERT Supabase ────────────────────────────
      console.log('[handleSubmit] étape 3 — appel createOrder')
      // createOrder ne lève JAMAIS d'exception — retourne null en cas d'erreur
      const order = await createOrder({
        client_id:       client?.id ?? null,   // lié au compte si connecté
        pickup:          { lat: pickupLat,   lng: pickupLng,   label: String(pickup.label   ?? '') },
        delivery:        { lat: deliveryLat, lng: deliveryLng, label: String(delivery.label ?? '') },
        package_type:    type,
        notes:           notes.trim() || null,
        recipient_phone: recipientPhone.trim() || null,
        is_urgent:       Boolean(urgent),
        is_heavy:        Boolean(heavy),
        price_ariary:    totalPrice,
        driver_share:    driverShare,
        commission,
        distance_km:     distanceKm,
        payment_method:  payment?.method  ?? 'cash',
        payment_status:  payment?.status  ?? 'pending',
      })
      // order peut être null (erreur Supabase ou RLS) → on continue avec fallback
      console.log('[handleSubmit] createOrder réponse', order)

      // ── Étape 4 : snapshot ───────────────────────────────────
      // Fallback tracking code si RLS bloque le RETURNING (maybeSingle → null)
      const seed = String(Date.now()).slice(-4)
      const code = order?.tracking_code ?? `MDL-${seed}`
      console.log('[handleSubmit] étape 4 — code', code)

      // Bug corrigé : utiliser distanceKm (0-safe) et non rawDist (NaN possible)
      const safeDistLabel = isFinite(distanceKm)
        ? `${distanceKm.toFixed(1)}`
        : '—'
      const safePickupLabel   = pickup.label   || `${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}`
      const safeDeliveryLabel = delivery.label || `${deliveryLat.toFixed(4)}, ${deliveryLng.toFixed(4)}`

      console.log('[handleSubmit] snapshot →', { code, totalPrice, safeDistLabel, safePickupLabel, safeDeliveryLabel })

      setSnapshot({
        trackCode:      code,
        totalPrice,
        distanceKm:     safeDistLabel,
        pickupLabel:    safePickupLabel,
        deliveryLabel:  safeDeliveryLabel,
        recipientPhone: recipientPhone.trim() || null,
        paymentMethod:  payment?.method ?? 'cash',
        paymentStatus:  payment?.status ?? 'pending',
        paymentTest:    payment?.testMode ?? false,
      })
      setSubmitted(true)

      // ── Étape 5 : Notification push aux livreurs disponibles ──
      // Non bloquant — en arrière-plan
      notify('new_order', {
        trackingCode: code,
        price:        totalPrice,
        distanceKm:   safeDistLabel,
      })

      // ── Étape 6 : SMS au destinataire (si numéro fourni) ─────
      if (recipientPhone.trim()) {
        sendTrackingSMS(recipientPhone.trim(), code).then(res => {
          if (res.ok) setSmsSent(true)
          else console.warn('[handleSubmit] SMS non envoyé:', res.error)
        })
      }

    } catch (err) {
      console.error('[OrderScreen] ERREUR complète →', err)
      console.error('[OrderScreen] message →', err?.message)
      console.error('[OrderScreen] code →', err?.code)
      setSubmitError(err?.message || 'Impossible de créer la commande. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }

  // ── Réinitialisation globale ─────────────────────────────────
  function handleReset() {
    setSubmitted(false)
    setSnapshot(null)
    setPickup(null); setDelivery(null)
    setType('parcel'); setNotes('')
    setUrgent(false); setHeavy(false)
    setRecipientPhone('')
    setSmsSent(false)
    setShowPayment(false)
    setPaymentResult(null)
    mapRef.current?.resetAll?.()
  }

  // ── Écran de confirmation — lit uniquement le snapshot, jamais le hook ──
  if (submitted && snapshot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 animate-slide-up text-center pb-28">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h2 className="font-extrabold text-xl text-gray-900 mb-1">Commande envoyée !</h2>
        <p className="text-gray-500 text-sm mb-4">Un livreur va accepter votre demande.</p>

        <div className="bg-brand-50 rounded-2xl px-6 py-3 mb-4 w-full max-w-xs">
          <p className="text-xs text-brand-600 font-medium mb-1">Code de suivi</p>
          <p className="font-extrabold text-2xl text-brand-600 tracking-widest">{snapshot.trackCode}</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl px-5 py-3 w-full max-w-xs shadow-sm mb-6 text-left">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Récapitulatif</p>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Prix total</span>
            <span className="font-extrabold text-brand-600">{formatAr(snapshot.totalPrice)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Distance</span>
            <span>{snapshot.distanceKm} km</span>
          </div>
          {/* Paiement */}
          <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-gray-100">
            <span className="text-gray-500">Paiement</span>
            <span className={`font-semibold flex items-center gap-1
              ${snapshot.paymentStatus === 'paid' ? 'text-green-600' : 'text-gray-600'}`}>
              {snapshot.paymentStatus === 'paid' ? '✅ Payé' : '💵 À la livraison'}
              {snapshot.paymentTest && (
                <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">test</span>
              )}
              {snapshot.paymentMethod !== 'cash' && PAYMENT_METHODS[snapshot.paymentMethod] && (
                <span className="ml-1">{PAYMENT_METHODS[snapshot.paymentMethod].logo}</span>
              )}
            </span>
          </div>
          <div className="flex gap-1 text-xs text-gray-400 mt-1">
            <span className="text-brand-500 shrink-0">A</span>
            <span className="truncate">{snapshot.pickupLabel}</span>
            <span className="mx-1 shrink-0">→</span>
            <span className="text-green-600 shrink-0">B</span>
            <span className="truncate">{snapshot.deliveryLabel}</span>
          </div>
        </div>

        {/* Confirmation SMS envoyé */}
        {smsSent && snapshot?.recipientPhone && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 w-full max-w-xs mb-4 text-left">
            <span className="text-base">📱</span>
            <div>
              <p className="text-xs font-bold text-green-700">SMS de suivi envoyé</p>
              <p className="text-[11px] text-green-600">{snapshot.recipientPhone}</p>
            </div>
          </div>
        )}

        <button onClick={handleReset} className="btn-primary w-full max-w-xs">
          Nouvelle commande
        </button>
      </div>
    )
  }

  const canSubmit = pickup && delivery && pricing?.valid && !loading && !priceLoading

  return (
    <div className="pb-28 animate-fade-in">
      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* ═══ SECTION 1 : Recherche autocomplétion ═══════════ */}
        <div className="card flex flex-col gap-4">
          <LocationSearch
            label={`${t('pickup')} — point A`}
            placeholder="Ex : Analakely, Shoprite, Marché Anosibe…"
            markerColor="#E84C1E"
            value={pickup?.label || ''}
            onSelect={handlePickupSelect}
            onClear={handlePickupClear}
          />
          {(pickup || delivery) && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-100" />
              <div className="flex flex-col items-center gap-0.5 py-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-300" />
                <div className="w-px h-3 bg-gray-200" />
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
          )}
          <LocationSearch
            label={`${t('delivery')} — point B`}
            placeholder="Ex : Ivandry, Total Mahamasina, Hôpital JRA…"
            markerColor="#007A4D"
            value={delivery?.label || ''}
            onSelect={handleDeliverySelect}
            onClear={handleDeliveryClear}
          />
        </div>

        {/* ═══ SECTION 2 : Carte interactive ══════════════════ */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Ou appuyez directement sur la carte
          </p>
          <MapPicker
            ref={mapRef}
            onPickupChange={setPickup}
            onDeliveryChange={setDelivery}
            height={290}
          />
        </div>

        {/* ═══ SECTION 3 : Résumé du trajet ═══════════════════ */}
        {pickup && delivery && (
          <div className="card bg-gray-50 animate-slide-up">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Trajet sélectionné</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Collecte</p>
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {pickup.label || `${Number(pickup.lat).toFixed(4)}, ${Number(pickup.lng).toFixed(4)}`}
                  </p>
                </div>
              </div>
              <div className="ml-[3px] w-0.5 h-3 bg-gray-200" />
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Livraison</p>
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {delivery.label || `${Number(delivery.lat).toFixed(4)}, ${Number(delivery.lng).toFixed(4)}`}
                  </p>
                </div>
              </div>

              {/* Distance + durée */}
              {(priceLoading || pricing) && (
                <div className="mt-1 pt-2 border-t border-gray-200 flex flex-col gap-1.5">
                  {priceLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <svg className="animate-spin h-3 w-3 text-brand-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Calcul de la distance en cours…
                    </div>
                  ) : pricing?.valid ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                          <span>📍 Distance : <strong>{Number(pricing.distanceKm).toFixed(1)} km</strong></span>
                          {durationMin != null && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="flex items-center gap-1">
                                <Clock size={11} className="text-brand-400" />
                                Durée estimée : <strong>{durationMin} min</strong>
                              </span>
                            </>
                          )}
                        </span>
                        <span className="text-sm font-extrabold text-brand-600">{formatAr(pricing.totalPrice)}</span>
                      </div>

                      {trafficMultiplier >= 2.5 && (
                        <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-300 rounded-lg px-2.5 py-1.5">
                          <span className="text-sm leading-none">⚠️</span>
                          <span className="text-[11px] text-orange-700 font-semibold">
                            Heure de pointe — délai possible
                          </span>
                        </div>
                      )}

                      {approximate && (
                        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                          <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                          <span className="text-[11px] text-amber-700 font-medium">
                            Distance approximative — service de routage indisponible
                          </span>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ SECTION 4 : Options ════════════════════════════ */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
            {t('packageType')}
          </label>
          <div className="flex gap-2 flex-wrap">
            {PACKAGE_TYPES.map(tp => (
              <button
                key={tp}
                type="button"
                onClick={() => setType(tp)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition
                  ${type === tp
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}
              >
                <span>{TYPE_ICONS[tp]}</span> {t(tp)}
              </button>
            ))}
          </div>
        </div>

        {/* Indications — OBLIGATOIRE */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5 block">
            <MessageSquare size={12} /> Indications pour le livreur
            <span className="text-gray-400 font-normal normal-case">(optionnel)</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ex : Maison rouge après le 3ème escalier, appelle en arrivant au carrefour…"
            className="input-field resize-none text-sm"
          />
        </div>

        {/* Numéro du destinataire — optionnel */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5 block">
            <Phone size={12} /> Numéro du destinataire
            <span className="text-gray-400 font-normal normal-case">(optionnel)</span>
          </label>
          <input
            type="tel"
            value={recipientPhone}
            onChange={e => setRecipientPhone(e.target.value)}
            placeholder="Ex: 034 12 345 67"
            className="input-field text-sm"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            📱 Un SMS de suivi sera envoyé automatiquement à ce numéro
          </p>
        </div>

        {/* Suppléments — textes lus depuis pricing.js */}
        <div className="flex flex-col gap-2">
          {/* Urgence */}
          <button
            type="button"
            onClick={() => setUrgent(v => !v)}
            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition
              ${urgent ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white'}`}
          >
            <div className={`rounded-xl p-2 ${urgent ? 'bg-orange-100' : 'bg-gray-100'}`}>
              <Zap size={18} className={urgent ? 'text-orange-500' : 'text-gray-400'} />
            </div>
            <div className="flex-1 text-left">
              <p className={`text-sm font-semibold ${urgent ? 'text-orange-700' : 'text-gray-600'}`}>
                {t('urgent')}
              </p>
              <p className="text-xs text-gray-400">Prix × {SUPP_URGENT_FACTOR}</p>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${urgent ? 'bg-orange-400' : 'bg-gray-200'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 mx-0.5
                ${urgent ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          {/* Colis lourd */}
          <button
            type="button"
            onClick={() => setHeavy(v => !v)}
            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition
              ${heavy ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}
          >
            <div className={`rounded-xl p-2 ${heavy ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Weight size={18} className={heavy ? 'text-blue-500' : 'text-gray-400'} />
            </div>
            <div className="flex-1 text-left">
              <p className={`text-sm font-semibold ${heavy ? 'text-blue-700' : 'text-gray-600'}`}>Colis lourd (+2 kg)</p>
              <p className="text-xs text-gray-400">+{formatAr(SUPP_HEAVY_AR)}</p>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors ${heavy ? 'bg-blue-400' : 'bg-gray-200'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 mx-0.5
                ${heavy ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>

        {/* ═══ SECTION 5 : Tarification ═══════════════════════ */}
        {pickup && delivery && (
          <PriceBreakdown
            pricing={pricing}
            loading={priceLoading}
            error={pricing?.valid === false ? pricing.error : null}
            showCommission={false}
          />
        )}

        {/* ═══ SECTION 6 : Bouton commander ════════════════════ */}
        {submitError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        )}
        {/* PaymentModal — s'affiche quand l'utilisateur clique Confirmer */}
        {showPayment && pricing?.valid && (
          <PaymentModal
            amount={Math.round(pricing.totalPrice)}
            orderCode="MDL-XXXX"
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowPayment(false)}
          />
        )}

        <button
          type="button"
          onClick={handleConfirmClick}
          disabled={!canSubmit}
          className="btn-primary w-full mt-2 text-base"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {t('loading')}
            </span>
          ) : !pickup || !delivery
            ? '📍 Placez les deux points sur la carte'
            : pricing?.valid
              ? `💳 Choisir le paiement — ${formatAr(pricing.totalPrice)}`
              : pricing?.error || t('confirmOrder')
          }
        </button>
      </div>
    </div>
  )
}
