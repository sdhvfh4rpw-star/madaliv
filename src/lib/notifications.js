/**
 * notifications.js — MadaLiv
 * ─────────────────────────────────────────────────────────────
 * Firebase Cloud Messaging côté client.
 *
 * Architecture :
 *   CLIENT → demande permission → obtient FCM token → sauvegarde dans Supabase
 *   CLIENT → écoute les messages foreground (app ouverte)
 *   SERVEUR → envoie les pushs aux autres appareils via Supabase Edge Function
 *             (le serveur doit utiliser FIREBASE_SERVER_KEY, jamais le client)
 *
 * Mode test (VITE_FIREBASE_KEY absent) :
 *   → Toutes les fonctions retournent gracieusement
 *   → Les notifications sont simulées via le NotificationContext (toasts)
 *
 * Variables .env :
 *   VITE_FIREBASE_KEY              — API Key Firebase Web
 *   VITE_FIREBASE_AUTH_DOMAIN      — xxx.firebaseapp.com
 *   VITE_FIREBASE_PROJECT_ID       — project-id
 *   VITE_FIREBASE_MESSAGING_SENDER — Sender ID
 *   VITE_FIREBASE_APP_ID           — App ID
 *   VITE_FIREBASE_VAPID_KEY        — Clé VAPID pour Web Push
 */

const IS_CONFIGURED = !!(import.meta.env.VITE_FIREBASE_KEY)

const FIREBASE_CONFIG = {
  apiKey:            import.meta.env.VITE_FIREBASE_KEY           ?? '',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN   ?? '',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID    ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER ?? '',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID        ?? '',
}
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? ''

// Instances Firebase (lazy-initialized)
let _app       = null
let _messaging = null

async function getMessagingInstance() {
  if (_messaging) return _messaging
  if (!IS_CONFIGURED) return null

  try {
    const { initializeApp, getApps } = await import('firebase/app')
    const { getMessaging }           = await import('firebase/messaging')

    if (!getApps().length) _app = initializeApp(FIREBASE_CONFIG)
    else _app = getApps()[0]

    _messaging = getMessaging(_app)

    // Passer la config au Service Worker pour les messages en arrière-plan
    const reg = await navigator.serviceWorker?.getRegistration('/firebase-messaging-sw.js')
    reg?.active?.postMessage({ type: 'FIREBASE_CONFIG', config: FIREBASE_CONFIG })

    return _messaging
  } catch (err) {
    console.warn('[notifications] Impossible d\'initialiser Firebase:', err.message)
    return null
  }
}

// ── Permission & Token ────────────────────────────────────────

/**
 * Demande la permission de notification et retourne le FCM token.
 * Le token doit être sauvegardé en base pour pouvoir envoyer des pushs ciblés.
 *
 * @returns {Promise<{ granted: boolean, token: string|null, testMode: boolean }>}
 */
export async function requestPermission() {
  if (!IS_CONFIGURED) {
    console.log('[notifications] Mode test — permission simulée')
    return { granted: true, token: null, testMode: true }
  }

  if (!('Notification' in window)) {
    return { granted: false, token: null, testMode: false }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { granted: false, token: null, testMode: false }
  }

  try {
    const { getToken } = await import('firebase/messaging')
    const messaging    = await getMessagingInstance()
    if (!messaging) return { granted: true, token: null, testMode: false }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    console.log('[notifications] FCM token obtenu:', token?.slice(0, 20) + '…')
    return { granted: true, token, testMode: false }
  } catch (err) {
    console.error('[notifications] getToken error:', err)
    return { granted: true, token: null, testMode: false }
  }
}

/**
 * Sauvegarde le FCM token du livreur dans Supabase (table drivers).
 * Appelé une fois après requestPermission().
 */
export async function saveFcmToken(driverId, token) {
  if (!token || !driverId) return
  try {
    const { supabase } = await import('./supabase')
    await supabase.from('drivers').update({ fcm_token: token }).eq('id', driverId)
  } catch (err) {
    console.warn('[notifications] saveFcmToken:', err.message)
  }
}

// ── Écoute des messages foreground ───────────────────────────

/**
 * Configure le handler pour les messages reçus quand l'app est ouverte.
 * Les messages en arrière-plan sont gérés par le Service Worker.
 *
 * @param {function} handler  ({ title, body, data }) => void
 * @returns {function} unsubscribe
 */
export async function onMessageReceived(handler) {
  if (!IS_CONFIGURED) {
    console.log('[notifications] Mode test — onMessage non branché (utiliser toasts)')
    return () => {}
  }

  try {
    const { onMessage } = await import('firebase/messaging')
    const messaging     = await getMessagingInstance()
    if (!messaging) return () => {}

    return onMessage(messaging, (payload) => {
      console.log('[notifications] Message reçu:', payload)
      handler({
        title: payload.notification?.title ?? 'FAINGANA',
        body:  payload.notification?.body  ?? '',
        data:  payload.data ?? {},
        icon:  payload.notification?.icon  ?? '🚴',
      })
    })
  } catch (err) {
    console.error('[notifications] onMessage error:', err)
    return () => {}
  }
}

// ── Envoi via Edge Function ───────────────────────────────────
/**
 * Envoie une notification push via la Supabase Edge Function.
 * L'Edge Function détient la clé serveur Firebase (jamais le client).
 *
 * @param {'new_order'|'driver_accepted'|'delivered'} type
 * @param {object} payload  Données spécifiques au type
 * @returns {Promise<boolean>}  true si envoi réussi
 */
export async function sendPushNotification(type, payload) {
  if (!IS_CONFIGURED) {
    console.log('[notifications] Mode test — push simulé:', type, payload)
    return false   // Le NotificationContext prend le relais avec un toast
  }

  try {
    const { supabase } = await import('./supabase')
    const { error } = await supabase.functions.invoke('send-push', {
      body: { type, payload }
    })
    if (error) throw error
    return true
  } catch (err) {
    console.warn('[notifications] sendPushNotification failed:', err.message)
    return false
  }
}

// ── Helpers de type ───────────────────────────────────────────

/** Notification push : nouvelle commande → livreurs disponibles */
export function notifyNewOrder({ trackingCode, price, distanceKm }) {
  return sendPushNotification('new_order', {
    trackingCode,
    title: '🚴 Nouvelle livraison disponible',
    body:  `${price.toLocaleString('fr-MG')} Ar — ${distanceKm} km`,
    url:   '/dashboard',
  })
}

/** Notification push : livreur accepté → client */
export function notifyDriverAccepted({ driverName, clientFcmToken }) {
  return sendPushNotification('driver_accepted', {
    clientFcmToken,
    title: '🏍️ Votre livreur est en route !',
    body:  `${driverName} a accepté votre commande`,
    url:   '/?tab=track',
  })
}

/** Notification push : livraison terminée → client */
export function notifyDelivered({ trackingCode, clientFcmToken }) {
  return sendPushNotification('delivered', {
    clientFcmToken,
    trackingCode,
    title: '✅ Livraison effectuée',
    body:  'Notez votre livreur pour améliorer le service',
    url:   `/?track=${trackingCode}`,
  })
}
