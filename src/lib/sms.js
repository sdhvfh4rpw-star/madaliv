/**
 * sms.js — MadaLiv
 * ─────────────────────────────────────────────────────────────
 * Envoi de SMS via l'API Twilio.
 *
 * ⚠️  SÉCURITÉ : Les variables VITE_TWILIO_* sont exposées côté client.
 *     En production, remplacer cet appel direct par une Supabase Edge Function
 *     qui garde le token Twilio côté serveur.
 *     Pour le MVP / démo, l'appel direct fonctionne.
 *
 * Variables .env requises :
 *   VITE_TWILIO_SID    — Account SID Twilio (ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
 *   VITE_TWILIO_TOKEN  — Auth Token Twilio
 *   VITE_TWILIO_PHONE  — Numéro expéditeur Twilio (ex: +12015551234)
 *
 * Utilisation :
 *   const { ok, error } = await sendTrackingSMS('+261341234567', 'MDL-2847')
 */

const TWILIO_SID   = import.meta.env.VITE_TWILIO_SID   ?? ''
const TWILIO_TOKEN = import.meta.env.VITE_TWILIO_TOKEN  ?? ''
const TWILIO_FROM  = import.meta.env.VITE_TWILIO_PHONE  ?? ''
const TRACKING_BASE_URL = 'https://madaliv.vercel.app'

/**
 * Formate un numéro malgache en E.164 (+261XXXXXXXXX).
 * Accepte les formats : 034 12 345 67, 0341234567, +2613412345 …
 */
function toE164Mg(phone) {
  // Garder uniquement les chiffres
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('261') && digits.length >= 11) return `+${digits}`
  if (digits.startsWith('0')   && digits.length === 10) return `+261${digits.slice(1)}`
  if (digits.length === 9) return `+261${digits}`
  // Retourner tel quel si le format est inconnu
  return phone.startsWith('+') ? phone : `+${digits}`
}

/**
 * Envoie un SMS de suivi de livraison au destinataire.
 *
 * @param {string} phone         Numéro du destinataire (format malgache accepté)
 * @param {string} trackingCode  Code de suivi, ex: "MDL-2847"
 * @returns {Promise<{ ok: boolean, sid?: string, error?: string }>}
 */
export async function sendTrackingSMS(phone, trackingCode) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.warn('[sms] Variables Twilio non configurées — SMS non envoyé')
    return { ok: false, error: 'Twilio non configuré' }
  }

  const to      = toE164Mg(phone)
  const message = `Votre livraison FAINGANA est en route ! Suivez-la ici : ${TRACKING_BASE_URL}?track=${trackingCode}`
  const url     = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`

  // Authentification Basic : base64(SID:TOKEN)
  const credentials = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)

  try {
    const body = new URLSearchParams({ From: TWILIO_FROM, To: to, Body: message })

    const res = await fetch(url, {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[sms] Erreur Twilio →', data)
      return { ok: false, error: data?.message ?? `HTTP ${res.status}` }
    }

    console.log('[sms] SMS envoyé →', { to, sid: data.sid })
    return { ok: true, sid: data.sid }

  } catch (err) {
    console.error('[sms] Exception →', err)
    return { ok: false, error: err?.message ?? 'Erreur réseau' }
  }
}
