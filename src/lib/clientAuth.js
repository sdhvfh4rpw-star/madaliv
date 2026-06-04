/**
 * clientAuth.js — MadaLiv
 * ─────────────────────────────────────────────────────────────
 * Authentification client via Supabase.
 *
 * Stratégie : le numéro de téléphone est l'identifiant principal.
 * Supabase Auth étant basé email/password, on dérive un email
 * interne à partir du numéro : 0341234567 → 261341234567@madaliv.app
 * Cet email n'est jamais montré à l'utilisateur.
 */

import { supabase } from './supabase'

// ── Normalisation téléphone ───────────────────────────────────

/**
 * Normalise un numéro malgache en E.164 sans le +.
 * 034 12 345 67 → 261341234567
 */
export function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('261') && digits.length >= 11) return digits
  if (digits.startsWith('0')   && digits.length === 10) return `261${digits.slice(1)}`
  if (digits.length === 9)                              return `261${digits}`
  return digits
}

/** Dérive un email Supabase interne à partir du téléphone. */
export function phoneToAuthEmail(phone) {
  return `${normalizePhone(phone)}@madaliv.app`
}

/** Formate un numéro pour l'affichage : 034 12 345 67 */
export function formatPhoneDisplay(phone) {
  const n = normalizePhone(phone).replace(/^261/, '0')
  return n.replace(/(\d{3})(\d{2})(\d{3})(\d{2})/, '$1 $2 $3 $4')
}

// ── Inscription ───────────────────────────────────────────────

/**
 * Crée un compte client.
 * @param {{ fullName, phone, email?, password, avatarDataURL? }} params
 * @returns {{ client, user, error? }}
 */
export async function signUpClient({ fullName, phone, email, password, avatarDataURL }) {
  const authEmail = phoneToAuthEmail(phone)

  // 1. Créer le compte Supabase Auth
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email:    authEmail,
    password,
    options: {
      data: {
        full_name:  fullName,
        phone:      normalizePhone(phone),
        real_email: email || null,
      },
      emailRedirectTo: undefined,   // pas de confirmation par email
    },
  })
  if (authErr) throw authErr

  const user = authData.user

  // 2. Upload selfie si fournie
  let avatarUrl = null
  if (avatarDataURL && user) {
    try {
      avatarUrl = await uploadClientAvatar(user.id, avatarDataURL)
    } catch (e) {
      console.warn('[clientAuth] Avatar upload failed:', e.message)
    }
  }

  // 3. Upsert dans la table clients
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .upsert({
      user_id:    user.id,
      name:       fullName,
      phone:      normalizePhone(phone),
      email:      email || null,
      auth_email: authEmail,
      avatar_url: avatarUrl,
    }, { onConflict: 'auth_email' })
    .select('*')
    .single()

  if (clientErr) throw clientErr
  return { client, user }
}

// ── Connexion ─────────────────────────────────────────────────

/**
 * Connecte un client par numéro de téléphone + mot de passe.
 */
export async function signInClient({ phone, password }) {
  const authEmail = phoneToAuthEmail(phone)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  })
  if (error) throw error

  // Récupérer le profil client
  const client = await getClientProfile(data.user.id)
  return { user: data.user, client }
}

// ── Déconnexion ───────────────────────────────────────────────

export async function signOutClient() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── Profil ────────────────────────────────────────────────────

export async function getClientProfile(userId) {
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export async function updateClientProfile(clientId, updates) {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', clientId)
    .select('*')
    .single()
  if (error) throw error
  return data
}

// ── Historique des commandes ──────────────────────────────────

export async function getClientOrders(clientId, limit = 20) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, tracking_code, status, created_at, price_ariary, pickup_label, delivery_label, payment_method, payment_status, rating')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

// ── Storage avatar ────────────────────────────────────────────

export async function uploadClientAvatar(userId, dataURL) {
  // Convertir data-URL en File
  const [header, base64] = dataURL.split(',')
  const mime  = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const bytes = atob(base64)
  const u8    = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) u8[i] = bytes.charCodeAt(i)
  const file = new File([u8], 'avatar.jpg', { type: mime })

  const path = `${userId}/avatar.jpg`
  const { error } = await supabase.storage
    .from('client-avatars')
    .upload(path, file, { upsert: true })
  if (error) throw error

  return supabase.storage.from('client-avatars').getPublicUrl(path).data.publicUrl
}
