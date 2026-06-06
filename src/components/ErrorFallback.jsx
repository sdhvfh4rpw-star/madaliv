import { AlertTriangle } from 'lucide-react'

/**
 * Écran de secours affiché par le Sentry ErrorBoundary lorsqu'une
 * erreur de rendu React survient — au lieu d'une page blanche.
 *
 * Reçoit de Sentry : { error, componentStack, eventId, resetError }.
 * Le bouton recharge l'application pour repartir d'un état propre.
 */
export default function ErrorFallback({ resetError }) {
  function handleRetry() {
    try { resetError?.() } catch { /* noop */ }
    try { window.location.reload() } catch { /* noop */ }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mb-5">
        <AlertTriangle size={38} className="text-red-500" />
      </div>
      <h1 className="font-extrabold text-xl text-gray-900 mb-2">Une erreur est survenue</h1>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-6">
        Veuillez réessayer. Si le problème persiste, fermez puis rouvrez l'application.
      </p>
      <button
        onClick={handleRetry}
        className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-sm transition active:scale-95"
      >
        Réessayer
      </button>
    </div>
  )
}
