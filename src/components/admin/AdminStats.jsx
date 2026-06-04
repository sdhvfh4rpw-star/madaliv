import { TrendingUp, Star, Clock, Package, Users, Bike } from 'lucide-react'

const WEEKLY = [
  { day: 'Lun', orders: 28, revenue: 56000, rating: 4.7 },
  { day: 'Mar', orders: 35, revenue: 70000, rating: 4.8 },
  { day: 'Mer', orders: 22, revenue: 44000, rating: 4.5 },
  { day: 'Jeu', orders: 41, revenue: 82000, rating: 4.9 },
  { day: 'Ven', orders: 38, revenue: 76000, rating: 4.6 },
  { day: 'Sam', orders: 52, revenue: 104000, rating: 4.8 },
  { day: 'Auj', orders: 34, revenue: 68000, rating: 4.6 },
]

const TOP_DRIVERS = [
  { name: 'Faniry Rakoto',      trips: 342, rating: 4.9, revenue: 684000 },
  { name: 'Hery Andriamahefa',  trips: 289, rating: 4.8, revenue: 578000 },
  { name: 'Rivo Rakotondrabe',  trips: 201, rating: 4.7, revenue: 402000 },
  { name: 'Lalaina Andriamanga',trips: 178, rating: 4.6, revenue: 356000 },
]

function BarGroup({ item, max }) {
  const pct = (item.orders / max) * 100
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <span className="text-gray-500 text-[10px] font-semibold">{item.orders}</span>
      <div className="w-full bg-gray-800 rounded-full overflow-hidden" style={{ height: 80 }}>
        <div
          className="w-full bg-brand-500 rounded-full transition-all"
          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
        />
      </div>
      <span className="text-gray-500 text-[10px]">{item.day}</span>
    </div>
  )
}

export default function AdminStats() {
  const maxOrders = Math.max(...WEEKLY.map(w => w.orders))

  const totals = {
    orders:  WEEKLY.reduce((s, w) => s + w.orders, 0),
    revenue: WEEKLY.reduce((s, w) => s + w.revenue, 0),
    avgRating: (WEEKLY.reduce((s, w) => s + w.rating, 0) / WEEKLY.length).toFixed(1),
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <div>
        <h1 className="text-white font-extrabold text-2xl">Statistiques</h1>
        <p className="text-gray-400 text-sm mt-1">Synthèse des 7 derniers jours</p>
      </div>

      {/* Totaux */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Package,   label:'Courses',      value: totals.orders,                    color:'bg-brand-500' },
          { icon: TrendingUp, label:'Revenus',      value: `${totals.revenue.toLocaleString()} Ar`, color:'bg-green-600' },
          { icon: Star,      label:'Note moy.',    value: `★ ${totals.avgRating}`,          color:'bg-yellow-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-2">
            <div className={`${color} rounded-xl p-2 w-fit`}>
              <Icon size={16} className="text-white" />
            </div>
            <p className="text-white font-extrabold text-xl leading-none">{value}</p>
            <p className="text-gray-500 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Histogramme */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-bold text-sm mb-5">Courses par jour</h2>
        <div className="flex items-end gap-3">
          {WEEKLY.map(item => <BarGroup key={item.day} item={item} max={maxOrders} />)}
        </div>
      </div>

      {/* Top livreurs */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-bold text-sm">Top livreurs du mois</h2>
        </div>
        <div className="divide-y divide-gray-800/60">
          {TOP_DRIVERS.map((d, i) => (
            <div key={d.name} className="flex items-center gap-4 px-5 py-4">
              <span className={`text-sm font-extrabold w-6 text-center
                ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-500' : 'text-gray-600'}`}>
                #{i + 1}
              </span>
              <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
                <Bike size={16} className="text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{d.name}</p>
                <p className="text-gray-500 text-xs">{d.trips} courses · ★ {d.rating}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-white text-sm font-semibold">{d.revenue.toLocaleString()} Ar</p>
                <p className="text-gray-600 text-xs">ce mois</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
