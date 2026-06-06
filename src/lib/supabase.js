/**
 * supabase.js — MadaLiv
 * ─────────────────────────────────────────────────────────────
 * Client Supabase + toutes les opérations CRUD.
 */

import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL     ?? ''
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!URL || !KEY) {
  console.warn('[MadaLiv] Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes dans .env')
}

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
})

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════

export const getSession = () => supabase.auth.getSession()
export const signOut    = () => supabase.auth.signOut()

/** Inscription livreur par téléphone (OTP). */
export async function signUpDriverPhone(phone) {
  const { error } = await supabase.auth.signInWithOtp({ phone })
  if (error) throw error
}

export async function verifyPhoneOtp(phone, token) {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  if (error) throw error
  return data
}

// ══════════════════════════════════════════════════════════════
// CLIENTS
// ══════════════════════════════════════════════════════════════

/**
 * Récupère ou crée un client à partir de son numéro de téléphone.
 * Utilisé pour les commandes anonymes (sans compte Auth).
 */
export async function upsertClient({ name, phone }) {
  const { data, error } = await supabase
    .from('clients')
    .upsert({ name, phone }, { onConflict: 'phone', ignoreDuplicates: false })
    .select('id')
    .single()
  if (error) throw error
  return data
}

export async function getClientByPhone(phone) {
  const { data } = await supabase
    .from('clients').select('id,name,phone').eq('phone', phone).maybeSingle()
  return data
}

// ══════════════════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════════════════

/**
 * Crée une commande complète avec les données GPS et tarifaires.
 * @param {object} payload
 *   client_id?, pickup{lat,lng,label}, delivery{lat,lng,label},
 *   package_type, notes, is_urgent, is_heavy,
 *   price_ariary, driver_share, commission, distance_km
 */
export async function createOrder(payload) {
  try {
    const { pickup, delivery, ...rest } = payload

    // ── Helpers de cast safe ──────────────────────────────────
    const safeNum = (v) => {
      const n = Number(v)
      return isFinite(n) ? n : 0
    }
    const safeInt = (v) => {
      const n = Math.round(Number(v))
      return isFinite(n) ? n : 0
    }
    const safeStr = (v) => (v == null ? '' : String(v))
    const safeBool = (v) => Boolean(v)

    // ── Construction du record avec vérification de chaque champ ──
    const record = {
      // Champs optionnels / nullable
      client_id:       rest.client_id ?? null,
      notes:           rest.notes           != null ? safeStr(rest.notes)           : null,
      // Numéro du destinataire final (optionnel — pour notif SMS)
      // Migration : ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
      recipient_phone: rest.recipient_phone != null ? safeStr(rest.recipient_phone) : null,

      // Paiement — uniquement Mobile Money (MVola / Orange Money)
      // Migration :
      //   ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'mvola';
      //   ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
      payment_method: ['mvola','orange'].includes(rest.payment_method)
                        ? rest.payment_method : 'mvola',
      payment_status: ['paid','pending','failed'].includes(rest.payment_status)
                        ? rest.payment_status : 'pending',

      // Enum — valeurs acceptées par le schéma SQL
      package_type:   ['doc','food','clothes','parcel','other'].includes(rest.package_type)
                        ? rest.package_type
                        : 'parcel',

      // Booléens
      is_urgent:      safeBool(rest.is_urgent),
      is_heavy:       safeBool(rest.is_heavy),

      // Entiers (INTEGER NOT NULL dans le schéma)
      price_ariary:   safeInt(rest.price_ariary),
      driver_share:   safeInt(rest.driver_share),
      commission:     safeInt(rest.commission),

      // Décimal (NUMERIC(6,2))
      distance_km:    parseFloat(safeNum(rest.distance_km).toFixed(2)),

      // Coordonnées GPS (NUMERIC(10,7))
      pickup_lat:     parseFloat(safeNum(pickup?.lat).toFixed(7)),
      pickup_lng:     parseFloat(safeNum(pickup?.lng).toFixed(7)),
      pickup_label:   safeStr(pickup?.label),
      delivery_lat:   parseFloat(safeNum(delivery?.lat).toFixed(7)),
      delivery_lng:   parseFloat(safeNum(delivery?.lng).toFixed(7)),
      delivery_label: safeStr(delivery?.label),
    }

    console.log('[createOrder] record →', JSON.stringify(record, null, 2))

    const { data, error } = await supabase
      .from('orders')
      .insert([record])
      .select('id, tracking_code')
      .maybeSingle()   // ne lève jamais PGRST116 même si RLS bloque le SELECT

    console.log('[createOrder] response →', { data, error: error?.message ?? null })

    if (error) {
      // On log l'erreur mais on ne lance PAS d'exception —
      // l'appelant recevra null et générera un tracking code local
      console.error('[createOrder] Supabase error →', error)
      return null
    }

    return data   // { id, tracking_code } ou null si RLS bloque le RETURNING
  } catch (err) {
    // Catch de dernier recours (réseau coupé, JSON.stringify qui plante, etc.)
    console.error('[createOrder] exception inattendue →', err)
    return null
  }
}

/** Récupère une commande par code de suivi. */
export async function getOrderByCode(code) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      driver:drivers(id, name, phone, rating, total_trips,
                     bike_model, bike_color, profile_photo_url,
                     validation_status)
    `)
    .eq('tracking_code', code.toUpperCase().trim())
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getOrderById(id) {
  const { data, error } = await supabase
    .from('orders').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

/** Met à jour le statut d'une commande. */
export async function updateOrderStatus(id, status) {
  const { error } = await supabase
    .from('orders').update({ status }).eq('id', id)
  if (error) throw error
}

/** Livreur accepte une course. */
export async function acceptOrder(orderId, driverId) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'accepted', driver_id: driverId })
    .eq('id', orderId).eq('status', 'pending')
  if (error) throw error
}

/** Client confirme le livreur assigné. */
export async function confirmDriverByClient(orderId) {
  const { error } = await supabase
    .from('orders')
    .update({ driver_confirmed_by_client: true, driver_confirmed_at: new Date() })
    .eq('id', orderId)
  if (error) throw error
}

/** Enregistre une photo de preuve sur la commande. */
export async function saveProofPhoto(orderId, type, url) {
  const field    = type === 'pickup' ? 'pickup_proof_url'  : 'delivery_proof_url'
  const atField  = type === 'pickup' ? 'pickup_proof_at'   : 'delivery_proof_at'
  const { error } = await supabase
    .from('orders').update({ [field]: url, [atField]: new Date() }).eq('id', orderId)
  if (error) throw error
}

/** Liste des commandes en attente (pour les livreurs). */
export async function getPendingOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, tracking_code, status, pickup_label, pickup_lat, pickup_lng, delivery_label, delivery_lat, delivery_lng, price_ariary, driver_share, commission, distance_km, is_urgent, is_heavy, package_type, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data ?? []
}

/** Courses actives d'un livreur. */
export async function getDriverActiveOrders(driverId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('driver_id', driverId)
    .not('status', 'in', '("delivered","cancelled")')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ══════════════════════════════════════════════════════════════
// DRIVERS
// ══════════════════════════════════════════════════════════════

/**
 * Inscription livreur — insert dans drivers + driver_documents.
 * Les URLs des photos sont passées après upload Storage.
 */
export async function registerDriver({
  name, phone, city, bikeModel, bikeColor,
  profilePhotoUrl, fullBodyPhotoUrl, cinPhotoUrl, bikePhotoUrl,
  userId = null,
}) {
  const { data, error } = await supabase
    .from('drivers')
    .insert([{
      user_id:             userId,
      name,
      phone,
      phone_verified:      true,
      city,
      bike_model:          bikeModel,
      bike_color:          bikeColor,
      profile_photo_url:   profilePhotoUrl,
      full_body_photo_url: fullBodyPhotoUrl,
      cin_photo_url:       cinPhotoUrl,
      bike_photo_url:      bikePhotoUrl,
      validation_status:   'pending',
    }])
    .select('id')
    .single()
  if (error) throw error

  // Insérer les refs dans driver_documents
  const driverId = data.id
  await supabase.from('driver_documents').insert([
    { driver_id: driverId, doc_type: 'profile',   storage_path: `${driverId}/profile.jpg`,  public_url: profilePhotoUrl  },
    { driver_id: driverId, doc_type: 'full_body', storage_path: `${driverId}/fullbody.jpg`, public_url: fullBodyPhotoUrl },
    { driver_id: driverId, doc_type: 'cin',       storage_path: `${driverId}/cin.jpg`,      public_url: cinPhotoUrl      },
    { driver_id: driverId, doc_type: 'bike',      storage_path: `${driverId}/bike.jpg`,     public_url: bikePhotoUrl     },
  ])

  return driverId
}

export async function getDriverById(id) {
  const { data, error } = await supabase
    .from('drivers').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getDriverByUserId(userId) {
  const { data } = await supabase
    .from('drivers').select('*').eq('user_id', userId).maybeSingle()
  return data
}

/** Mettre à jour la disponibilité. */
export async function setDriverAvailability(driverId, isAvailable) {
  const { error } = await supabase
    .from('drivers').update({ is_available: isAvailable }).eq('id', driverId)
  if (error) throw error
}

/** Mettre à jour la position GPS. */
export async function updateDriverLocation(driverId, lat, lng) {
  await supabase.from('drivers')
    .update({ last_lat: lat, last_lng: lng, location_updated_at: new Date() })
    .eq('id', driverId)
  // Log historique
  await supabase.from('driver_locations').insert([{ driver_id: driverId, lat, lng }])
}

// ── Admin : validation ────────────────────────────────────────
export async function getPendingDrivers() {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('validation_status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * Tous les livreurs (tous statuts) pour le panneau admin.
 * Ultra-défensive : ne lève jamais d'exception → [] en cas d'erreur.
 */
export async function getAllDrivers() {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[getAllDrivers] Supabase error:', error.message)
      return []
    }
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error('[getAllDrivers] exception:', err)
    return []
  }
}

export async function approveDriver(driverId, adminUserId) {
  const { error } = await supabase.from('drivers')
    .update({ validation_status: 'approved', validated_by: adminUserId, validated_at: new Date(), rejection_reason: null })
    .eq('id', driverId)
  if (error) throw error
  await supabase.from('admin_actions')
    .insert([{ admin_id: adminUserId, action: 'approve_driver', target_id: driverId }])
}

export async function rejectDriver(driverId, adminUserId, reason) {
  const { error } = await supabase.from('drivers')
    .update({ validation_status: 'rejected', validated_by: adminUserId, validated_at: new Date(), rejection_reason: reason })
    .eq('id', driverId)
  if (error) throw error
  await supabase.from('admin_actions')
    .insert([{ admin_id: adminUserId, action: 'reject_driver', target_id: driverId, reason }])
}

export async function suspendDriver(driverId, adminUserId, reason) {
  const { error } = await supabase.from('drivers')
    .update({ validation_status: 'suspended', suspension_reason: reason, is_available: false })
    .eq('id', driverId)
  if (error) throw error
  await supabase.from('admin_actions')
    .insert([{ admin_id: adminUserId, action: 'suspend_driver', target_id: driverId, reason }])
}

// ══════════════════════════════════════════════════════════════
// RATINGS
// ══════════════════════════════════════════════════════════════

export async function submitRating({ orderId, driverId, clientId, rating, comment }) {
  // Insérer dans ratings (le trigger recalcule la moyenne du driver)
  const { error: rErr } = await supabase.from('ratings')
    .insert([{ order_id: orderId, driver_id: driverId, client_id: clientId, rating, comment }])
  if (rErr) throw rErr
  // Marquer la commande comme notée
  await supabase.from('orders')
    .update({ rating, rating_comment: comment, rated_at: new Date() })
    .eq('id', orderId)
}

// ══════════════════════════════════════════════════════════════
// SOLDES LIVREURS
// ══════════════════════════════════════════════════════════════

/**
 * Retourne tous les livreurs approuvés ayant un solde > 0.
 * Utilisé dans la section "Paiements du soir" de l'admin.
 */
export async function getDriversWithBalance() {
  const { data, error } = await supabase
    .from('drivers')
    .select('id, name, phone, pending_balance, rating, total_trips, profile_photo_url')
    .eq('validation_status', 'approved')
    .gt('pending_balance', 0)
    .order('pending_balance', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Paie un livreur via la RPC `pay_driver` :
 * remet pending_balance à 0 + insère dans driver_payments.
 * @returns {number} Montant versé (en ariary)
 */
export async function payDriver(driverId, adminId, note = null) {
  const { data, error } = await supabase
    .rpc('pay_driver', { p_driver_id: driverId, p_admin_id: adminId, p_note: note })
  if (error) throw error
  return data  // INTEGER = montant payé
}

/**
 * Paie tous les livreurs avec un solde > 0 en une passe.
 * @returns {{ paid: number, total: number }} nb de livreurs payés + total Ar
 */
export async function payAllDrivers(adminId) {
  const drivers = await getDriversWithBalance()
  if (!drivers.length) return { paid: 0, total: 0 }

  const results = await Promise.allSettled(
    drivers.map(d => payDriver(d.id, adminId, 'Paiement groupé du soir'))
  )

  const paid  = results.filter(r => r.status === 'fulfilled').length
  const total = results
    .filter(r => r.status === 'fulfilled')
    .reduce((sum, r) => sum + (r.value ?? 0), 0)

  return { paid, total }
}

/**
 * Retourne l'historique des paiements d'un livreur.
 */
export async function getDriverPaymentHistory(driverId, limit = 30) {
  const { data, error } = await supabase
    .from('driver_payments')
    .select('id, amount, note, created_at')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

/**
 * Souscrit aux changements de solde d'un livreur (Realtime).
 * Appelé dans DriverDashboard pour le solde temps réel.
 */
export function subscribeToDriverBalance(driverId, onUpdate) {
  return supabase
    .channel(`driver_balance:${driverId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${driverId}` },
      (payload) => onUpdate(payload.new.pending_balance ?? 0)
    )
    .subscribe()
}

// ══════════════════════════════════════════════════════════════
// ADMIN STATS (via RPC)
// ══════════════════════════════════════════════════════════════

export async function getAdminStats() {
  const { data, error } = await supabase.rpc('get_admin_stats')
  if (error) throw error
  return data
}

export async function getRecentOrders(limit = 10) {
  const { data, error } = await supabase.rpc('get_recent_orders', { p_limit: limit })
  if (error) throw error
  return data ?? []
}

// ══════════════════════════════════════════════════════════════
// RAPPORT FINANCIER MENSUEL
// ══════════════════════════════════════════════════════════════

/** Structure vide retournée en cas d'erreur ou de mois sans données. */
function emptyFinanceReport(year, month) {
  return {
    ok: false,
    year, month,
    summary:  { totalRevenue: 0, totalCommission: 0, totalDriverShare: 0, totalDelivered: 0 },
    byDay:    [],
    byDriver: [],
    payments: [],
  }
}

/** Cast numérique sûr — retourne 0 pour null/undefined/NaN. */
function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Rapport financier d'un mois donné.
 * @param {number} year   Année (ex: 2026)
 * @param {number} month  Mois 1-12
 * @returns {Promise<object>}  jamais d'exception — structure vide si erreur
 */
export async function getMonthlyFinanceReport(year, month) {
  try {
    // Bornes du mois (month 1-12 → index 0-11)
    const startISO = new Date(year, month - 1, 1).toISOString()
    const endISO   = new Date(year, month, 1).toISOString()

    // ── 1. Commandes livrées du mois ─────────────────────────
    let orders = []
    try {
      const res = await supabase
        .from('orders')
        .select('created_at, price_ariary, commission, driver_share, driver_id, status')
        .eq('status', 'delivered')
        .gte('created_at', startISO)
        .lt('created_at', endISO)
      orders = res.error ? [] : (res.data ?? [])
    } catch { orders = [] }

    // ── 2. Livreurs (id → nom, téléphone) ────────────────────
    let drivers = []
    try {
      const res = await supabase.from('drivers').select('id, name, phone')
      drivers = res.error ? [] : (res.data ?? [])
    } catch { drivers = [] }
    const driverMap = {}
    for (const d of drivers) driverMap[d.id] = d

    // ── 3. Paiements versés du mois ──────────────────────────
    let payments = []
    try {
      const res = await supabase
        .from('driver_payments')
        .select('id, driver_id, amount, created_at')
        .gte('created_at', startISO)
        .lt('created_at', endISO)
        .order('created_at', { ascending: false })
      payments = res.error ? [] : (res.data ?? [])
    } catch { payments = [] }

    // ── Agrégat : résumé ─────────────────────────────────────
    let totalRevenue = 0, totalCommission = 0, totalDriverShare = 0
    for (const o of orders) {
      totalRevenue     += num(o.price_ariary)
      totalCommission  += num(o.commission)
      totalDriverShare += num(o.driver_share)
    }

    // ── Agrégat : par jour ───────────────────────────────────
    const dayMap = {}
    for (const o of orders) {
      let dayNum = 0
      try { dayNum = new Date(o.created_at).getDate() } catch { dayNum = 0 }
      if (!dayMap[dayNum]) {
        dayMap[dayNum] = { day: dayNum, count: 0, revenue: 0, commission: 0, driverShare: 0 }
      }
      dayMap[dayNum].count       += 1
      dayMap[dayNum].revenue     += num(o.price_ariary)
      dayMap[dayNum].commission  += num(o.commission)
      dayMap[dayNum].driverShare += num(o.driver_share)
    }
    const byDay = Object.values(dayMap).sort((a, b) => a.day - b.day)

    // ── Agrégat : par livreur ────────────────────────────────
    const drvMap = {}
    function ensureDriver(id) {
      if (!drvMap[id]) {
        drvMap[id] = {
          driverId:    id,
          name:        driverMap[id]?.name  ?? 'Inconnu',
          phone:       driverMap[id]?.phone ?? '',
          trips:       0,
          totalEarned: 0,
          totalPaid:   0,
        }
      }
      return drvMap[id]
    }
    for (const o of orders) {
      const d = ensureDriver(o.driver_id ?? 'unknown')
      d.trips       += 1
      d.totalEarned += num(o.driver_share)
    }
    for (const p of payments) {
      const d = ensureDriver(p.driver_id ?? 'unknown')
      d.totalPaid += num(p.amount)
    }
    const byDriver = Object.values(drvMap)
      .map(d => ({ ...d, balance: d.totalEarned - d.totalPaid }))
      .sort((a, b) => b.totalEarned - a.totalEarned)

    // ── Liste des paiements (avec nom livreur) ───────────────
    const paymentsList = payments.map(p => ({
      id:         p.id,
      driverName: driverMap[p.driver_id]?.name ?? 'Inconnu',
      amount:     num(p.amount),
      created_at: p.created_at,
    }))

    return {
      ok: true,
      year, month,
      summary: {
        totalRevenue,
        totalCommission,
        totalDriverShare,
        totalDelivered: orders.length,
      },
      byDay,
      byDriver,
      payments: paymentsList,
    }
  } catch (err) {
    console.error('[getMonthlyFinanceReport]', err)
    return emptyFinanceReport(year, month)
  }
}

// ══════════════════════════════════════════════════════════════
// REALTIME
// ══════════════════════════════════════════════════════════════

/**
 * Souscrit aux changements d'une commande spécifique.
 * Retourne l'objet subscription (appeler .unsubscribe() au cleanup).
 */
export function subscribeToOrder(orderId, onChange) {
  return supabase
    .channel(`order:${orderId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
      (payload) => onChange(payload.new)
    )
    .subscribe()
}

/**
 * Souscrit à toutes les nouvelles commandes en statut 'pending'.
 * Utilisé par le tableau de bord livreur.
 */
export function subscribeToNewOrders(onInsert) {
  return supabase
    .channel('new_orders')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload) => onInsert(payload.new)
    )
    .subscribe()
}

/**
 * Souscrit à la position d'un livreur.
 */
export function subscribeToDriverLocation(driverId, onUpdate) {
  return supabase
    .channel(`driver_loc:${driverId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'drivers',
        filter: `id=eq.${driverId}` },
      (payload) => onUpdate({ lat: payload.new.last_lat, lng: payload.new.last_lng })
    )
    .subscribe()
}

// ══════════════════════════════════════════════════════════════
// RÉCLAMATIONS (claims)
// ══════════════════════════════════════════════════════════════

/**
 * Enregistre une réclamation client. Ultra-défensive.
 * @returns {Promise<boolean>}  true si enregistrée, false sinon — jamais d'exception
 */
export async function submitClaim(orderCode, clientPhone, category, message) {
  try {
    const { error } = await supabase.from('claims').insert([{
      order_code:   orderCode ? String(orderCode) : null,
      client_phone: clientPhone ? String(clientPhone) : null,
      category:     category ? String(category) : 'other',
      message:      message ? String(message) : null,
      status:       'open',
    }])
    if (error) {
      console.error('[submitClaim] Supabase error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[submitClaim] exception:', err)
    return false
  }
}

/**
 * Liste toutes les réclamations (admin). Jamais d'exception → [].
 */
export async function getClaims() {
  try {
    const { data, error } = await supabase
      .from('claims')
      .select('id, order_code, client_phone, category, message, status, created_at')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[getClaims] Supabase error:', error.message)
      return []
    }
    return data ?? []
  } catch (err) {
    console.error('[getClaims] exception:', err)
    return []
  }
}

/**
 * Marque une réclamation comme résolue. Jamais d'exception.
 * @returns {Promise<boolean>}
 */
export async function resolveClaim(claimId) {
  try {
    const { error } = await supabase
      .from('claims')
      .update({ status: 'resolved' })
      .eq('id', claimId)
    if (error) {
      console.error('[resolveClaim] Supabase error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[resolveClaim] exception:', err)
    return false
  }
}
