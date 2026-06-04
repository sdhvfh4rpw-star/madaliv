/**
 * Supabase Edge Function : send-push
 * ─────────────────────────────────────────────────────────────
 * Envoie des notifications push Firebase depuis le serveur.
 * Le FIREBASE_SERVER_KEY ne doit JAMAIS être côté client.
 *
 * Déploiement :
 *   supabase functions deploy send-push
 *
 * Variables d'environnement Supabase (Dashboard > Edge Functions > Secrets) :
 *   FIREBASE_SERVER_KEY   — Server Key FCM (pas la clé Web !)
 *
 * Appel depuis le client :
 *   supabase.functions.invoke('send-push', { body: { type, payload } })
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send'
const SERVER_KEY   = Deno.env.get('FIREBASE_SERVER_KEY') ?? ''

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const { type, payload } = await req.json()
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  let fcmPayload: Record<string, unknown>

  // ── Construction du message FCM selon le type ────────────────
  if (type === 'new_order') {
    // Envoyer à tous les livreurs disponibles via le topic "available_drivers"
    // Les livreurs s'abonnent à ce topic au login depuis le client
    fcmPayload = {
      to: '/topics/available_drivers',
      notification: {
        title: '🚴 Nouvelle livraison disponible',
        body:  `${payload.price?.toLocaleString('fr') ?? '?'} Ar — ${payload.distanceKm ?? '?'} km`,
        icon:  '/icon-192.png',
      },
      data: {
        type:    'new_order',
        trackingCode: payload.trackingCode ?? '',
        url:     '/dashboard',
      },
    }
  } else if (type === 'driver_accepted') {
    if (!payload.clientFcmToken) {
      return new Response(JSON.stringify({ ok: false, reason: 'no_client_token' }), { status: 200 })
    }
    fcmPayload = {
      to: payload.clientFcmToken,
      notification: {
        title: '🏍️ Votre livreur est en route !',
        body:  `${payload.driverName ?? 'Votre livreur'} a accepté votre commande`,
        icon:  '/icon-192.png',
      },
      data: { type: 'driver_accepted', url: '/?tab=track' },
    }
  } else if (type === 'delivered') {
    if (!payload.clientFcmToken) {
      return new Response(JSON.stringify({ ok: false, reason: 'no_client_token' }), { status: 200 })
    }
    fcmPayload = {
      to: payload.clientFcmToken,
      notification: {
        title: '✅ Livraison effectuée',
        body:  'Notez votre livreur pour améliorer le service',
        icon:  '/icon-192.png',
      },
      data: { type: 'delivered', url: `/?track=${payload.trackingCode ?? ''}` },
    }
  } else {
    return new Response(JSON.stringify({ ok: false, reason: 'unknown_type' }), { status: 200 })
  }

  // ── Envoi vers FCM ────────────────────────────────────────────
  if (!SERVER_KEY) {
    console.warn('[send-push] FIREBASE_SERVER_KEY non configurée — push non envoyé')
    return new Response(JSON.stringify({ ok: false, reason: 'no_server_key' }), { status: 200 })
  }

  const res = await fetch(FCM_ENDPOINT, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `key=${SERVER_KEY}`,
    },
    body: JSON.stringify(fcmPayload),
  })

  const result = await res.json()
  console.log('[send-push] FCM response:', result)

  return new Response(JSON.stringify({ ok: res.ok, fcm: result }), {
    status:  200,
    headers: { 'Content-Type': 'application/json' },
  })
})
