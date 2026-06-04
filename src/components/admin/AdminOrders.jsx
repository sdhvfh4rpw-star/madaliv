import { useState } from 'react'
import { Search, Eye, Ban, Package, MapPin, Navigation, User, TrendingUp, Bike } from 'lucide-react'
import { splitCommission, formatAr } from '../../lib/pricing'

const ALL_ORDERS = [
  { id:'o1',  code:'MDL-3021', status:'ontheway',  client:'Haingo R.',  driver:'Faniry Rakoto',  pickup:'Analakely',    delivery:'Ambohimanarina', price:3900,  distance_km:2.4, urgent:true,  created:'14:32' },
  { id:'o2',  code:'MDL-3020', status:'pending',   client:'Vola M.',    driver:null,              pickup:'Tsaralalàna',  delivery:'Ankadifotsy',    price:5000,  distance_km:3.1, urgent:false, created:'14:28' },
  { id:'o3',  code:'MDL-3019', status:'delivered', client:'Tojo A.',    driver:'Hery Andria.',   pickup:'Behoririka',   delivery:'Isotry',         price:8000,  distance_km:6.8, urgent:false, created:'14:15' },
  { id:'o4',  code:'MDL-3018', status:'accepted',  client:'Nirina H.',  driver:'Rivo Rako.',     pickup:'Analakely',    delivery:'Ivandry',        price:5000,  distance_km:4.1, urgent:false, created:'14:09' },
  { id:'o5',  code:'MDL-3017', status:'cancelled', client:'Soa R.',     driver:null,              pickup:'Behoririka',   delivery:'Mahamasina',     price:3000,  distance_km:1.9, urgent:false, created:'13:55' },
  { id:'o6',  code:'MDL-3016', status:'delivered', client:'Rado M.',    driver:'Faniry Rakoto',  pickup:'Isotry',       delivery:'67 Ha',          price:10400, distance_km:8.0, urgent:true,  created:'13:40' },
  { id:'o7',  code:'MDL-3015', status:'ontheway',  client:'Niry A.',    driver:'Lalaina A.',     pickup:'Tsaralalàna',  delivery:'Ambohipo',       price:8000,  distance_km:7.3, urgent:false, created:'13:30' },
  { id:'o8',  code:'MDL-3014', status:'pickup',    client:'Fara R.',    driver:'Hery Andria.',   pickup:'Analakely',    delivery:'Ankadifotsy',    price:5000,  distance_km:2.9, urgent:false, created:'13:15' },
]

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
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')
  const [detail,  setDetail]  = useState(null)

  const filtered = ALL_ORDERS.filter(o => {
    const matchStatus = filter === 'all' || o.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q
      || o.code.toLowerCase().includes(q)
      || o.client.toLowerCase().includes(q)
      || (o.driver || '').toLowerCase().includes(q)
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
      <div>
        <h1 className="text-white font-extrabold text-2xl">Commandes</h1>
        <p className="text-gray-400 text-sm mt-1">{ALL_ORDERS.length} commandes au total</p>
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
                <span className="ml-1.5 opacity-60">{ALL_ORDERS.filter(o => o.status === s).length}</span>
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
            <p className="text-gray-500 text-sm">Aucune commande trouvée</p>
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
