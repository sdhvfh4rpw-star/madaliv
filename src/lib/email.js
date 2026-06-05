/**
 * email.js — FAINGANA
 * ─────────────────────────────────────────────────────────────
 * Notification email au support lors d'une réclamation.
 *
 * ⚠️  Un envoi d'email nécessite un service serveur (un client web
 *     ne peut pas envoyer de SMTP directement). En production,
 *     brancher sur une Supabase Edge Function ou un service type
 *     Resend / SendGrid via leur API REST.
 *
 *     Ici : si VITE_SUPPORT_EMAIL est défini, on POST vers une
 *     Edge Function "send-claim-email". Sinon → mode test (no-op).
 *
 * Variable .env :
 *   VITE_SUPPORT_EMAIL  — adresse du support (ex: support@faingana.mg)
 */

import { supabase } from './supabase'

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? ''

/**
 * Envoie un email de notification de réclamation au support.
 * @param {{ orderCode, clientPhone, category, message }} claim
 * @returns {Promise<boolean>}  true si envoyé, false si mode test ou erreur
 */
export async function sendClaimEmail(claim) {
  // Mode test : aucune adresse support configurée
  if (!SUPPORT_EMAIL) {
    console.log('[email] Mode test — VITE_SUPPORT_EMAIL non configuré, email non envoyé:', claim)
    return false
  }

  try {
    const subject = `[FAINGANA] Réclamation — ${claim?.category ?? 'Autre'}`
    const body = [
      `Nouvelle réclamation reçue :`,
      ``,
      `Commande   : ${claim?.orderCode   ?? '—'}`,
      `Téléphone  : ${claim?.clientPhone ?? '—'}`,
      `Catégorie  : ${claim?.category    ?? '—'}`,
      `Message    : ${claim?.message     ?? '—'}`,
    ].join('\n')

    const { error } = await supabase.functions.invoke('send-claim-email', {
      body: { to: SUPPORT_EMAIL, subject, text: body, claim },
    })

    if (error) {
      console.warn('[email] Edge function error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] exception:', err)
    return false
  }
}
