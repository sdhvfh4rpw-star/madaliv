/**
 * MerchantDashboard — FAINGANA / MadaLiv
 * ─────────────────────────────────────────────────────────────
 * Espace boutique, visible uniquement si client.is_merchant === true.
 * Réutilise le système client existant (getClientOrders) et reste
 * ultra-défensif : aucune donnée ne doit jamais faire planter l'écran.
 */
import { useState, useEffect } from 'react'
import { Store, Package, TrendingUp, Calendar, Clock, Phone } from 'lucide-react'
import { useClientAuth } from '../../contexts/ClientAuthContext'
import { getClientOrders, formatPhoneDisplay } from '../../lib/clientAuth'
import { formatAr } from '../../lib/pricing'

// Statuts — repris du reste de l'app (ProfileScreen)
const STATUS = {
  pending:   { label: 'En attente', dot: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50' },
  accepted:  { label: 'Acceptée',   dot: 'bg-blue-400',   text: 'text-blue-700',   bg: 'bg-blue-50'   },
  pickup:    { label: 'Collecte',   dot: 'bg-purple-400', text: 'text-purple-700', bg: 'bg-purple-50' },
  ontheway:  { label: 'En route',   dot: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50' },
  delivered: { label: 'Livrée ✓',   dot: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50'  },
  cancelled: { label: 'Annulée',    dot: 'bg-red-400',    text: 'text-red-600',    bg: 'bg-red-50'    },
}

/** Formate une date de façon sûre — jamais d'exception. */
function safeDate(value) {
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

/** Une ligne d'historique de livraison. */
function DeliveryRow({ order }) {
  const o  = order ?? {}
  const st = STATUS[o.status] ?? STATUS.pending

  return (
    <div className="card">
      {/* Code + statut */}
      <div className="flex items-start justify-between mb-2">
        <span className="font-bold text-sm font-mono text-gray-700">{o.tracking_code ?? '—'}</span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>
      </div>

      {/* Trajet */}
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
          <span className="truncate">{o.pickup_label || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          <span className="truncate">{o.delivery_label || '—'}</span>
        </div>
      </div>

      {/* Destinataire */}
      {o.recipient_phone && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
          <Phone size={11} className="shrink-0" />
          <span className="truncate">Destinataire : {formatPhoneDisplay(o.recipient_phone)}</span>
        </div>
      )}

      {/* Date + montant */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1 min-w-0">
          <Clock size={11} className="shrink-0" />
          <span className="truncate">{safeDate(o.created_at)}</span>
        </span>
        <span className="font-bold text-gray-700 text-sm shrink-0">{formatAr(o.price_ariary ?? 0)}</span>
      </div>
    </div>
  )
}

export default function MerchantDashboard({ onNavigate }) {
  const { client }  = useClientAuth()
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    if (!client?.id) { setLoading(false); return }
    setLoading(true)
    getClientOrders(client.id, 100)
      .then(data => {
        if (!alive) return
        setOrders(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        console.error('[MerchantDashboard] erreur chargement commandes:', err)
        if (!alive) return
        setOrders([])
        setLoading(false)
      })
    return () => { alive = false }
  }, [client?.id])

  // Garde — espace réservé aux commerçants
  if (!client?.is_merchant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center text-gray-400 animate-fade-in">
        <Store size={32} className="mb-2 opacity-30" />
        <p className="text-sm">Espace réservé aux commerçants.</p>
      </div>
    )
  }

  // ── Statistiques (ultra-défensives) ──────────────────────────
  const list            = Array.isArray(orders) ? orders : []
  const totalDeliveries = list.length
  const delivered       = list.filter(o => o?.status === 'delivered')
  const totalSpent      = delivered.reduce((s, o) => s + (Number(o?.price_ariary) || 0), 0)

  const now = new Date()
  const thisMonthCount = list.filter(o => {
    try {
      const d = new Date(o?.created_at)
      if (isNaN(d.getTime())) return false
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    } catch {
      return false
    }
  }).length

  const shopName = (client.shop_name && String(client.shop_name).trim()) || client.name || 'Ma boutique'

  const STATS = [
    { label: 'Livraisons',    value: totalDeliveries },
    { label: 'Total dépensé', value: formatAr(totalSpent ?? 0), small: true },
    { label: 'Ce mois-ci',    value: thisMonthCount },
  ]

  return (
    <div className="pb-28 animate-fade-in">
      {/* En-tête boutique */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-5 pt-6 pb-8 text-white">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center border-2 border-white/20 shrink-0">
            <Store size={26} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wide">Espace boutique</p>
            <h2 className="font-extrabold text-xl truncate">{shopName}</h2>
          </div>
        </div>

        {/* 3 stats */}
        <div className="flex gap-3 mt-5">
          {STATS.map(({ label, value, small }) => (
            <div key={label} className="flex-1 bg-white/10 rounded-xl py-2.5 text-center px-1">
              <p className={`font-extrabold leading-tight ${small ? 'text-sm' : 'text-xl'}`}>{value}</p>
              <p className="text-white/60 text-[10px] font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Bouton commander */}
        <button
          onClick={() => onNavigate?.('order')}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Package size={17} /> Commander une livraison
        </button>

        {/* Historique des livraisons de la boutique */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-gray-700">Livraisons de la boutique</h3>
            <span className="text-xs text-gray-400">{totalDeliveries} au total</span>
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
            </div>
          ) : list.length === 0 ? (
            <div className="card text-center py-8 text-gray-400">
              <Package size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune livraison pour l'instant</p>
              <p className="text-xs mt-1">Vos commandes apparaîtront ici.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {list.map((order, i) => (
                <DeliveryRow key={order?.id ?? i} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
