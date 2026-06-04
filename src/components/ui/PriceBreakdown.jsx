/**
 * PriceBreakdown — composant réutilisable
 * Affiche le détail tarifaire d'une course :
 *   · lignes de détail (base + suppléments)
 *   · total en grand
 *   · part livreur / commission
 *   · avertissement longue distance
 *   · erreur distance max dépassée
 */
import { AlertTriangle, Clock, Zap, Scale, CalendarX, Info, TrendingUp, Bike } from 'lucide-react'
import { formatAr, formatKm, getPriceBreakdownLines, LONG_DISTANCE_KM } from '../../lib/pricing'

const SUPP_ICONS = {
  orange: { icon: Zap,        bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
  blue:   { icon: Scale,      bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100'   },
  purple: { icon: Clock,      bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  red:    { icon: CalendarX,  bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-100'    },
}

// ── Squelette de chargement ───────────────────────────────────
export function PriceSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex justify-between items-center mb-3">
        <div className="h-3 w-28 bg-gray-200 rounded-full" />
        <div className="h-4 w-20 bg-gray-200 rounded-full" />
      </div>
      <div className="h-px bg-gray-100 mb-3" />
      <div className="flex justify-between">
        <div className="h-3 w-24 bg-gray-200 rounded-full" />
        <div className="h-3 w-16 bg-gray-200 rounded-full" />
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────
export default function PriceBreakdown({ pricing, loading, error, showCommission = true, compact = false }) {

  // Chargement
  if (loading) return <PriceSkeleton />

  // Erreur distance max ou adresse inconnue
  if (error || (pricing && !pricing.valid)) {
    return (
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 animate-slide-up">
        <AlertTriangle size={17} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-700">Livraison impossible</p>
          <p className="text-xs text-red-600 mt-0.5">{error || pricing?.error}</p>
        </div>
      </div>
    )
  }

  if (!pricing) return null

  const lines = getPriceBreakdownLines(pricing)

  // ── Mode compact (dashboard livreur) ─────────────────────
  if (compact) {
    return (
      <div className="bg-brand-50 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 animate-fade-in">
        <div>
          <p className="text-xs text-gray-500">{formatKm(pricing.distanceKm)}</p>
          <p className="font-extrabold text-brand-600 text-base leading-none">{formatAr(pricing.driverShare)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">votre part</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total client</p>
          <p className="font-semibold text-gray-700 text-sm">{formatAr(pricing.totalPrice)}</p>
        </div>
      </div>
    )
  }

  // ── Mode complet (écran commande client) ──────────────────
  return (
    <div className="flex flex-col gap-2 animate-slide-up">
      {/* Avertissement longue distance */}
      {pricing.isLongDistance && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <Clock size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-700">Livraison longue distance</p>
            <p className="text-xs text-amber-600 mt-0.5">Délai estimé 45 à 60 min</p>
          </div>
        </div>
      )}

      <div className="card">
        {/* Lignes de détail */}
        <div className="flex flex-col gap-1.5 mb-3">
          {lines.map(({ label, value, color }) => {
            if (!color) {
              return (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-700">{value}</span>
                </div>
              )
            }
            const style = SUPP_ICONS[color] || SUPP_ICONS.orange
            const Icon  = style.icon
            return (
              <div key={label} className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl border ${style.bg} ${style.border}`}>
                <span className={`flex items-center gap-1.5 font-medium ${style.text}`}>
                  <Icon size={11} />
                  {label}
                </span>
                <span className={`font-bold ${style.text}`}>{value}</span>
              </div>
            )
          })}
        </div>

        {/* Séparateur */}
        <div className="h-px bg-gray-100 mb-3" />

        {/* Total */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-gray-800">Prix total</span>
          <span className="font-extrabold text-xl text-brand-600">{formatAr(pricing.totalPrice)}</span>
        </div>

        {/* Répartition commission */}
        {showCommission && (
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Bike size={11} /> Part livreur (85%)
              </span>
              <span className="font-bold text-green-600">{formatAr(pricing.driverShare)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-500">
                <TrendingUp size={11} /> Commission MadaLiv (15%)
              </span>
              <span className="font-semibold text-gray-500">{formatAr(pricing.commission)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
