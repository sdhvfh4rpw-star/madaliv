import { useState, useEffect } from 'react'
import { Search, Eye, Ban, Package, MapPin, Navigation, User, TrendingUp, Bike, RefreshCw } from 'lucide-react'
import { splitCommission, formatAr } from '../../lib/pricing'
import { getAllOrders } from '../../lib/supabase'

/** Normalise une commande Supabase vers le format d'affichage. */
function normalizeOrder(o) {
  const x = o ?? {}
  return {
    id:          x.id ?? Math.random().toString(36).slice(2),
    code:        x.tracking_code ?? '—',
    status:      x.status ?? 'pending',
    client:      x.client?.name ?? '—',
    driver:      x.driver?.name ?? null,
    pickup:      x.pickup_label ?? '—',
    delivery:    x.delivery_label ?? '—',
    price:       x.price_ariary ?? 0,
    distance_km: x.distance_km ?? null,
    urgent:      Boolean(x.is_urgent),
    created:     x.created_at
      ? new Date(x.created_at).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })
      : '',
  }
}

const STATUS_CONFIG = {
  pending:   { label:'En attente', cls:'bg-yellow-500/15 text-yellow-300 border-yellow-500/25' },
  accepted:  { label:'Acceptée',   cls:'bg-blue-500/15   text-blue-300   border-blue-500/25' },
  pickup:    { label:'Collecte',   cls:'bg-purple-500/15 text-purple-300 border-purple-500/25' },
  ontheway:  { label:'En route',   cls:'bg-orange-500/15 text-orange-300 border-orange-500/25' },
  delivered: { label:'Livrée',     cls:'bg-green-500/15  text-green-300  border-green-500/25' },
  cancelled: { label:'Annulée',    cls:'bg-red-500/15    text-red-300    border-red-500/25' },
}

const STATUS_FILTERS = ['all', 'pending', 'accepted', 'pickup', 'ontheway', 'delivered', 'cancelled']

export default function AdminOrders() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')
  const [detail,  setDetail]  = useState(null)

  async function load() {
    const raw = await getAllOrders(200)   // jamais d'exception → []
    setOrders(Array.isArray(raw) ? raw.map(normalizeOrder) : [])
  }
  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [])
  async function handleRefresh() {
    setRefreshing(true); await load(); setRefreshing(false)
  }

  const allOrders = Array.isArray(orders) ? orders : []
  const filtered = allOrders.filter(o => {
    const matchStatus = filter === 'all' || o.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q
      || (o.code   ?? '').toLowerCase().includes(q)
      || (o.client ?? '').toLowerCase().includes(q)
      || (o.driver ?? '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  // ── Totaux commission (courses non annulées) ─────────────
  const deliveredOrders   = filtered.filter(o => o.status === 'delivered')
  const totalRevenue      = deliveredOrders.reduce((s, o) => s + o.price, 0)
  const totalCommission   = deliveredOrders.reduce((s, o) => s + splitCommission(o.price).commission, 0)
  const totalDriverPayout = totalRevenue - totalCommission

  return (
    <div className="flex flex-col gap-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white font-extrabold text-2xl">Commandes</h1>
          <p className="text-gray-400 text-sm mt-1">
            {loading ? 'Chargement…' : `${allOrders.length} commande${allOrders.length > 1 ? 's' : ''} au total`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par code, client, livreur…"
            className="w-full bg-gray-900 border border-gray-800 text-white placeholder-gray-600
              rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition
                ${filter === s
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'}`}
            >
              {s === 'all' ? 'Toutes' : STATUS_CONFIG[s]?.label}
              {s !== 'all' && (
                <span className="ml-1.5 opacity-60">{allOrders.filter(o => o.status === s).length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Récap financier (commandes filtrées livrées) ─── */}
      {deliveredOrders.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: TrendingUp, label: 'Revenus filtrés',  value: formatAr(totalRevenue),      color: 'text-white',    bg: 'bg-gray-900' },
            { icon: Package,    label: 'Part livreurs',    value: formatAr(totalDriverPayout),  color: 'text-green-400', bg: 'bg-gray-900' },
            { icon: TrendingUp, label: 'Commission (15%)', value: formatAr(totalCommission),    color: 'text-violet-400', bg: 'bg-gray-900' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`${bg} border border-gray-800 rounded-2xl px-4 py-3`}>
              <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wide mb-1">{label}</p>
              <p className={`font-extrabold text-sm ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {/* Header table */}
        <div className="hidden lg:grid grid-cols-[auto_1fr_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <span>Code</span>
          <span>Trajet</span>
          <span>Acteurs</span>
          <span>Dist.</span>
          <span>Prix · Comm.</span>
          <span>Statut</span>
          <span />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Package size={32} className="text-gray-700" />
            <p className="text-gray-500 text-sm">{loading ? 'Chargement…' : 'Aucune commande'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {filtered.map(order => {
              const sc = STATUS_CONFIG[order.status]
              return (
                <div
                  key={order.id}
                  className="grid grid-cols-1 lg:grid-cols-[auto_1fr_1fr_auto_auto_auto_auto] gap-3 lg:gap-4 px-5 py-4 hover:bg-gray-800/30 transition"
                >
                  {/* Code */}
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-bold font-mono">{order.code}</span>
                    {order.urgent && (
                      <span className="text-[9px] bg-orange-500/20 text-orange-400 font-bold px-1.5 py-0.5 rounded">
                        URGENT
                      </span>
                    )}
                    <span className="text-gray-600 text-xs font-mono lg:hidden">{order.created}</span>
                  </div>

                  {/* Trajet */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-300">
                      <Navigation size={11} className="text-brand-400 shrink-0" />
                      <span className="truncate">{order.pickup}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin size={11} className="text-green-500 shrink-0" />
                      <span className="truncate">{order.delivery}</span>
                    </div>
                  </div>

                  {/* Client / Livreur */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-300">
                      <User size={11} className="text-gray-500 shrink-0" />
                      {order.client}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Package size={11} className="text-gray-600 shrink-0" />
                      {order.driver || <span className="italic">Non assigné</span>}
                    </div>
                  </div>

                  {/* Distance */}
                  <div className="flex items-center">
                    <span className="text-gray-400 text-xs whitespace-nowrap">
                      {order.distance_km ? `${order.distance_km} km` : '—'}
                    </span>
                  </div>

                  {/* Prix + commission */}
                  {(() => {
                    const { commission, driverShare } = splitCommission(order.price)
                    return (
                      <div className="flex flex-col justify-center">
                        <span className="text-white text-sm font-semibold whitespace-nowrap">
                          {formatAr(order.price)}
                        </span>
                        {order.status !== 'cancelled' && (
                          <span className="text-violet-400 text-[10px] font-semibold whitespace-nowrap">
                            comm. {formatAr(commission)}
                          </span>
                        )}
                        {order.status !== 'cancelled' && (
                          <span className="text-green-500 text-[10px] whitespace-nowrap">
                            livr. {formatAr(driverShare)}
                          </span>
                        )}
                      </div>
                    )
                  })()}

                  {/* Statut */}
                  <div className="flex items-center">
                    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${sc.cls}`}>
                      {sc.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDetail(detail?.id === order.id ? null : order)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition"
                    >
                      <Eye size={15} />
                    </button>
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <button className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition">
                        <Ban size={15} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {detail && (() => {
        const { commission, driverShare } = splitCommission(detail.price)
        return (
          <div className="bg-gray-900 border border-brand-500/30 rounded-2xl p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Détail — {detail.code}</h3>
              <button onClick={() => setDetail(null)} className="text-gray-500 hover:text-white text-xs">Fermer ×</button>
            </div>

            {/* Infos générales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
              {[
                { label:'Collecte',  value: detail.pickup },
                { label:'Livraison', value: detail.delivery },
                { label:'Client',    value: detail.client },
                { label:'Livreur',   value: detail.driver || '—' },
                { label:'Distance',  value: detail.distance_km ? `${detail.distance_km} km` : '—' },
                { label:'Statut',    value: STATUS_CONFIG[detail.status]?.label },
                { label:'Urgent',    value: detail.urgent ? 'Oui (+30%)' : 'Non' },
                { label:'Heure',     value: detail.created },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                  <p className="text-white font-medium">{value}</p>
                </div>
              ))}
            </div>

            {/* Ventilation financière */}
            <div className="border-t border-gray-800 pt-4 grid grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, label: 'Prix total client', value: formatAr(detail.price),  color: 'text-white' },
                { icon: Bike,       label: 'Part livreur (85%)', value: formatAr(driverShare),  color: 'text-green-400' },
                { icon: TrendingUp, label: 'Commission (15%)',   value: formatAr(commission),   color: 'text-violet-400' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-gray-800 rounded-xl px-3 py-2.5">
                  <p className="text-gray-500 text-[10px] mb-1">{label}</p>
                  <p className={`font-extrabold text-sm ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
