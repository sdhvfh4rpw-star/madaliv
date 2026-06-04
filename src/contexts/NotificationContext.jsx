/**
 * NotificationContext — MadaLiv
 * ─────────────────────────────────────────────────────────────
 * Gère :
 *   1. La permission FCM + token (une fois au chargement)
 *   2. Les messages Firebase reçus en foreground
 *   3. Les toasts simulés en mode test
 *   4. L'API `notify(type, data)` utilisée par les écrans
 *
 * Utilisation :
 *   const { notify, permission } = useNotifications()
 *   notify('new_order', { trackingCode:'MDL-1234', price:5000, distanceKm:3.2 })
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import {
  requestPermission, onMessageReceived,
  notifyNewOrder, notifyDriverAccepted, notifyDelivered,
} from '../lib/notifications'

const NotificationContext = createContext(null)

let toastCounter = 0

export function NotificationProvider({ children }) {
  const [toasts,     setToasts]     = useState([])
  const [permission, setPermission] = useState('default')  // default | granted | denied
  const [fcmToken,   setFcmToken]   = useState(null)
  const unsubRef = useRef(null)

  // ── Initialisation FCM au montage ────────────────────────────
  useEffect(() => {
    // Demande la permission si pas encore accordée
    if ('Notification' in window && Notification.permission === 'granted') {
      setPermission('granted')
    }

    // Écoute les messages FCM foreground
    onMessageReceived((msg) => {
      showToast({
        type:  msg.data?.type ?? 'info',
        title: msg.title,
        body:  msg.body,
      })
    }).then(unsub => { unsubRef.current = unsub })

    return () => { unsubRef.current?.() }
  }, [])

  // ── Demander la permission explicitement ─────────────────────
  const askPermission = useCallback(async () => {
    const result = await requestPermission()
    setPermission(result.granted ? 'granted' : 'denied')
    if (result.token) setFcmToken(result.token)
    return result
  }, [])

  // ── Afficher un toast in-app ─────────────────────────────────
  const showToast = useCallback(({ type = 'info', title, body, duration = 5000, testMode = false }) => {
    const id = ++toastCounter
    setToasts(prev => [...prev, { id, type, title, body, duration, testMode }])
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── API principale : notify(type, data) ──────────────────────
  /**
   * Envoie une notification push (réelle ou simulée).
   *
   * Types supportés :
   *   'new_order'       { trackingCode, price, distanceKm }
   *   'driver_accepted' { driverName, clientFcmToken? }
   *   'delivered'       { trackingCode, clientFcmToken? }
   */
  const notify = useCallback(async (type, data = {}) => {
    let sent = false

    // ── Tentative envoi push réel ────────────────────────────
    if (type === 'new_order') {
      sent = await notifyNewOrder(data)
    } else if (type === 'driver_accepted') {
      sent = await notifyDriverAccepted(data)
    } else if (type === 'delivered') {
      sent = await notifyDelivered(data)
    }

    // ── Fallback toast (mode test ou push échoué) ────────────
    if (!sent) {
      const TOAST_TEMPLATES = {
        new_order: {
          title: '🚴 Nouvelle livraison disponible',
          body:  `${(data.price ?? 0).toLocaleString('fr-MG')} Ar — ${data.distanceKm ?? '?'} km`,
        },
        driver_accepted: {
          title: '🏍️ Votre livreur est en route !',
          body:  data.driverName ? `${data.driverName} a accepté votre commande` : 'Un livreur est en route',
        },
        delivered: {
          title: '✅ Livraison effectuée',
          body:  'Notez votre livreur pour améliorer le service',
        },
      }
      const tpl = TOAST_TEMPLATES[type]
      if (tpl) {
        showToast({ type, ...tpl, testMode: true, duration: 6000 })
      }
    }
  }, [showToast])

  return (
    <NotificationContext.Provider value={{ notify, showToast, dismissToast, toasts, permission, fcmToken, askPermission }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications doit être utilisé dans <NotificationProvider>')
  return ctx
}
