/**
 * ToastNotification — affiche les notifications in-app
 * ─────────────────────────────────────────────────────────────
 * Utilisé en mode test (Firebase non configuré) ET pour les
 * messages FCM foreground (app ouverte).
 *
 * S'empile proprement (max 3 toasts simultanés).
 * Se ferme automatiquement après `duration` ms.
 */

import { useEffect } from 'react'
import { X, Bell } from 'lucide-react'

const TYPE_CONFIG = {
  new_order:        { bg: 'bg-brand-500',   icon: '🚴', border: 'border-brand-400' },
  driver_accepted:  { bg: 'bg-blue-600',    icon: '🏍️', border: 'border-blue-400'  },
  delivered:        { bg: 'bg-green-600',   icon: '✅', border: 'border-green-400' },
  info:             { bg: 'bg-gray-800',    icon: '🔔', border: 'border-gray-600'  },
  success:          { bg: 'bg-green-600',   icon: '✅', border: 'border-green-400' },
  warning:          { bg: 'bg-amber-500',   icon: '⚠️', border: 'border-amber-400' },
  error:            { bg: 'bg-red-600',     icon: '❌', border: 'border-red-400'   },
}

// ── Toast individuel ─────────────────────────────────────────
function Toast({ toast, onDismiss }) {
  const cfg = TYPE_CONFIG[toast.type] ?? TYPE_CONFIG.info

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 5000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  return (
    <div
      className={`flex items-start gap-3 w-full max-w-sm rounded-2xl border px-4 py-3
        shadow-2xl text-white animate-slide-up pointer-events-auto
        ${cfg.bg} ${cfg.border}`}
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,.35)' }}
    >
      <span className="text-xl shrink-0 mt-0.5">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm leading-tight">{toast.title}</p>
        {toast.body && (
          <p className="text-white/80 text-xs mt-0.5 leading-relaxed">{toast.body}</p>
        )}
        {toast.testMode && (
          <span className="inline-block text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full mt-1 font-semibold">
            Mode test — notification simulée
          </span>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 mt-0.5 opacity-70 hover:opacity-100 transition"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ── Container de toasts ───────────────────────────────────────
export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2
        w-[calc(100%-2rem)] max-w-sm pointer-events-none px-0"
      aria-live="polite"
    >
      {toasts.slice(0, 3).map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
