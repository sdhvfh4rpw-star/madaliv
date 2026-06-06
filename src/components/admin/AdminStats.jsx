import { useState, useEffect } from 'react'
import { TrendingUp, Star, Package, Bike, RefreshCw, Activity } from 'lucide-react'
import { getAdminStats, getAllDrivers } from '../../lib/supabase'
import { formatAr } from '../../lib/pricing'

const EMPTY_STATS = {
  orders_today: 0, orders_active: 0, orders_delivered_today: 0, orders_cancelled_today: 0,
  revenue_today: 0, commission_today: 0, driver_payout_today: 0, avg_rating: 0,
  drivers_approved: 0,
}

export default function AdminStats() {
  const [stats,   setStats]   = useState(EMPTY_STATS)
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const [s, drv] = await Promise.all([
      getAdminStats().catch(() => null),
      getAllDrivers().catch(() => []),
    ])
    setStats(s ?? EMPTY_STATS)
    setDrivers(Array.isArray(drv) ? drv : [])
  }
  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [])
  async function handleRefresh() { setRefreshing(true); await load(); setRefreshing(false) }

  const s = stats ?? EMPTY_STATS

  // Top livreurs réels — triés par nombre de courses
  const topDrivers = (Array.isArray(drivers) ? drivers : [])
    .filter(d => d?.validation_status === 'approved')
    .slice()
    .sort((a, b) => (b?.total_trips ?? 0) - (a?.total_trips ?? 0))
    .slice(0, 5)

  const totals = [
    { icon: Package,    label: "Courses aujourd'hui", value: loading ? '…' : (s.orders_today ?? 0),               color: 'bg-brand-500' },
    { icon: TrendingUp, label: 'Revenu du jour',       value: loading ? '…' : formatAr(s.revenue_today ?? 0),     color: 'bg-green-600' },
    { icon: Star,       label: 'Note moyenne',         value: loading ? '…' : `★ ${(s.avg_rating ?? 0) || '—'}`,  color: 'bg-yellow-500' },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white font-extrabold text-2xl">Statistiques</h1>
          <p className="text-gray-400 text-sm mt-1">Données en temps réel</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Totaux du jour */}
      <div className="grid grid-cols-3 gap-4">
        {totals.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-2">
            <div className={`${color} rounded-xl p-2 w-fit`}>
              <Icon size={16} className="text-white" />
            </div>
            <p className="text-white font-extrabold text-xl leading-none">{value}</p>
            <p className="text-gray-500 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Répartition des courses du jour (données réelles) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-bold text-sm mb-4">Courses du jour</h2>
        {(() => {
          const delivered = s.orders_delivered_today ?? 0
          const active    = s.orders_active ?? 0
          const cancelled = s.orders_cancelled_today ?? 0
          const total     = delivered + active + cancelled
          const rows = [
            { label: 'Livrées',  value: delivered, color: 'bg-green-500' },
            { label: 'En cours', value: active,    color: 'bg-orange-500' },
            { label: 'Annulées', value: cancelled, color: 'bg-red-500' },
          ]
          if (total === 0) {
            return <p className="text-gray-600 text-sm text-center py-4">{loading ? 'Chargement…' : 'Aucune course aujourd\'hui'}</p>
          }
          return (
            <div className="flex flex-col gap-3">
              {rows.map(({ label, value, color }) => {
                const pct = total > 0 ? Math.round((value / total) * 100) : 0
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-400 text-xs">{label}</span>
                      <span className="text-white text-xs font-bold">{value}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* Top livreurs (réels, par nombre de courses) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-bold text-sm">Top livreurs</h2>
        </div>
        {topDrivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bike size={26} className="text-gray-700" />
            <p className="text-gray-500 text-sm">{loading ? 'Chargement…' : 'Aucun livreur'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {topDrivers.map((d, i) => {
              const dr = d ?? {}
              return (
                <div key={dr.id ?? i} className="flex items-center gap-4 px-5 py-4">
                  <span className={`text-sm font-extrabold w-6 text-center
                    ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-500' : 'text-gray-600'}`}>
                    #{i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {dr.profile_photo_url
                      ? <img src={dr.profile_photo_url} alt={dr.name ?? ''} className="w-full h-full object-cover" />
                      : <Bike size={16} className="text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{dr.name ?? 'Sans nom'}</p>
                    <p className="text-gray-500 text-xs">
                      {(dr.total_trips ?? 0)} course{(dr.total_trips ?? 0) > 1 ? 's' : ''} · ★ {dr.rating ?? '—'}
                    </p>
                  </div>
                  <Activity size={14} className="text-gray-600 shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
