/**
 * firebase-messaging-sw.js
 * Service Worker Firebase Cloud Messaging — MadaLiv
 * ─────────────────────────────────────────────────────────────
 * Gère les notifications push reçues QUAND L'APP EST EN ARRIÈRE-PLAN.
 * Doit être à la racine du domaine (public/).
 *
 * Configuration via firebaseConfig injectée depuis le SW scope.
 * Les variables d'env Vite ne sont PAS disponibles ici — utiliser
 * importScripts ou passer la config via postMessage au moment de
 * l'enregistrement du SW.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')

// La config sera injectée dynamiquement par notifications.js
// via self.__firebaseConfig au moment du SW registration.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    if (!self.__firebaseApp) {
      self.__firebaseApp = firebase.initializeApp(event.data.config)
      self.__messaging   = firebase.messaging()

      self.__messaging.onBackgroundMessage((payload) => {
        const { title, body, icon, data } = payload.notification ?? {}
        self.registration.showNotification(title ?? 'Faingana', {
          body:    body  ?? '',
          icon:    icon  ?? '/icon-192.png',
          badge:   '/icon-192.png',
          data:    data  ?? {},
          actions: payload.data?.actions ? JSON.parse(payload.data.actions) : [],
          vibrate: [200, 100, 200],
        })
      })
    }
  }
})

// Clic sur une notification → ouvrir l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) { existing.focus(); existing.navigate(url) }
      else clients.openWindow(url)
    })
  )
})
