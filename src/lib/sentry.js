/**
 * sentry.js — FAINGANA
 * ─────────────────────────────────────────────────────────────
 * Surveillance des erreurs en production via Sentry.
 *
 * Principe DÉFENSIF :
 *  • Si VITE_SENTRY_DSN est absente (dev local, preview sans clé),
 *    Sentry ne s'initialise PAS et l'app fonctionne normalement.
 *  • Toute erreur d'initialisation est avalée : Sentry ne doit
 *    JAMAIS empêcher l'application de démarrer.
 *
 * La DSN est fournie par la variable d'environnement Vite
 * VITE_SENTRY_DSN (configurée sur Vercel).
 */

import * as Sentry from '@sentry/react'

let initialized = false

/** Initialise Sentry une seule fois, uniquement si une DSN est présente. */
export function initSentry() {
  if (initialized) return

  // import.meta.env.VITE_SENTRY_DSN est `undefined` si non définie.
  const dsn = import.meta.env?.VITE_SENTRY_DSN

  if (!dsn) {
    // Pas de DSN → monitoring désactivé, aucune erreur, app normale.
    return
  }

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env?.MODE ?? 'production',

      // Suivi des performances (raisonnable : 10 % des transactions)
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1,

      // La capture des erreurs non gérées (window.onerror +
      // unhandledrejection) est active par défaut dans @sentry/react.

      // Confidentialité : ne pas envoyer d'informations personnelles
      // (numéros de téléphone, etc.) par défaut.
      sendDefaultPii: false,
    })
    initialized = true
  } catch (e) {
    // Ne jamais bloquer l'app si Sentry échoue.
    console.error('[Sentry] initialisation impossible :', e)
  }
}

/** True si Sentry est actif (DSN présente et init réussie). */
export function isSentryEnabled() {
  return initialized
}
