/**
 * driverAuth.js — FAINGANA
 * ─────────────────────────────────────────────────────────────
 * Authentification livreur (même modèle que clientAuth.js).
 *
 * Le numéro de téléphone est l'identifiant ; on dérive un email
 * interne avec un domaine DISTINCT de celui des clients pour que
 * les deux systèmes d'auth ne se confondent jamais :
 *   client  : 261XXXXXXXXX@madaliv.app
 *   livreur : 261XXXXXXXXX@driver.faingana.app
 *
 * Ultra-défensif : les lectures de données ne lèvent jamais
 * d'exception (retour [] ou null).
 */

import { supabase } from './supabase'
import { normalizePhone } from './clientAuth'

const DRIVER_DOMAIN = '@driver.faingana.app'

/** Email interne livreur dérivé du téléphone. */
export function driverPhoneToEmail(phone) {
  return `${normalizePhone(phone)}${DRIVER_DOMAIN}`
}

/** True si l'email appartient à l'espace livreur. */
export function isDriverEmail(email) {
  return typeof email === 'string' && email.endsWith(DRIVER_DOMAIN)
}

// ── Auth ──────────────────────────────────────────────────────

/**
 * Crée le compte auth du livreur (appelé à la fin de l'inscription).
 * @returns {object|null} l'utilisateur Supabase
 */
export async function signUpDriverAuth({ phone, password }) {
  const email = driverPhoneToEmail(phone)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { phone: normalizePhone(phone), role: 'driver' },
      emailRedirectTo: undefined,
    },
  })
  if (error) throw error
  return data?.user ?? null
}

/** Connexion livreur par téléphone + mot de passe. */
export async function signInDriver({ phone, password }) {
  const email = driverPhoneToEmail(phone)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  const driver = await getDriverByUserId(data.user.id)
  return { user: data.user, driver }
}

/** Déconnexion. */
export async function signOutDriver() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/** Profil livreur lié au compte auth. */
export async function getDriverByUserId(userId) {
  try {
    if (!userId) return null
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    return data ?? null
  } catch (e) {
    console.error('[driverAuth] getDriverByUserId:', e)
    return null
  }
}

// ── Données du livreur (toutes ultra-défensives → [] ) ────────

/** Courses disponibles (en attente, non assignées). */
export async function getAvailableOrders() {
  try {
    // select('*') : sûr même si des colonnes optionnelles (recipient_phone,
    // payment_method…) n'existent pas encore dans la base.
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .is('driver_id', null)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) { console.error('[driverAuth] getAvailableOrders:', error.message); return [] }
    return Array.isArray(data) ? data : []
  } catch (e) {
    console.error('[driverAuth] getAvailableOrders:', e)
    return []
  }
}

/** Courses en cours du livreur. */
export async function getMyActiveOrders(driverId) {
  try {
    if (!driverId) return []
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('driver_id', driverId)
      .not('status', 'in', '("delivered","cancelled")')
      .order('updated_at', { ascending: false })
    if (error) { console.error('[driverAuth] getMyActiveOrders:', error.message); return [] }
    return Array.isArray(data) ? data : []
  } catch (e) {
    console.error('[driverAuth] getMyActiveOrders:', e)
    return []
  }
}

/** Historique des courses livrées par le livreur. */
export async function getMyDeliveredOrders(driverId, limit = 50) {
  try {
    if (!driverId) return []
    const { data, error } = await supabase
      .from('orders')
      .select('id, tracking_code, pickup_label, delivery_label, price_ariary, driver_share, rating, created_at, updated_at')
      .eq('driver_id', driverId)
      .eq('status', 'delivered')
      .order('updated_at', { ascending: false })
      .limit(limit)
    if (error) { console.error('[driverAuth] getMyDeliveredOrders:', error.message); return [] }
    return Array.isArray(data) ? data : []
  } catch (e) {
    console.error('[driverAuth] getMyDeliveredOrders:', e)
    return []
  }
}
