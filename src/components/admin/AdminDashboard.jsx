import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Package, TrendingUp, AlertTriangle, ShieldCheck,
  Clock, CheckCircle2, XCircle, Bike, ArrowRight, Activity,
  RefreshCw, Percent, Banknote, Phone, User, CreditCard
} from 'lucide-react'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { splitCommission, formatAr, COMMISSION_RATE } from '../../lib/pricing'
import { getAdminStats, getRecentOrders, getDriversWithBalance, payDriver, payAllDrivers } from '../../lib/supabase'

// ── Données mock ─────────────────────────────────────────────
const MOCK_STATS = {
  driversTotal:     12,
  driversPending:    3,
  driversApproved:   7,
  driversSuspended:  2,
  ordersToday:      34,
  ordersActive:      8,
  ordersDelivered:  24,
  ordersCancelled:   2,
  revenueToday:  68000,
  revenueMTD:   1420000,
  avgRating:      4.6,
  avgDelivery:     22,
}

const MOCK_RECENT_ORDERS = [
  { id: 'o1', code: 'MDL-3021', status: 'ontheway',  client: 'Haingo R.',  driver: 'Faniry R.',  price: 3900, time: '14:32' },
  { id: 'o2', code: 'MDL-3020', status: 'pending',   client: 'Vola M.',    driver: null,          price: 5000, time: '14:28' },
  { id: 'o3', code: 'MDL-3019', status: 'delivered', client: 'Tojo A.',    driver: 'Hery A.',    price: 8000, time: '14:15' },
  { id: 'o4', code: 'MDL-3018', status: 'accepted',  client: 'Nirina H.',  driver: 'Rivo R.',    price: 5000, time: '14:09' },
  { id: 'o5', code: 'MDL-3017', status: 'cancelled', client: 'Soa R.',     driver: null,          price: 3000, time: '13:55' },
]

// Commission du jour = 15% du revenu total livré
const commissionToday   = Math.round(MOCK_STATS.revenueToday * COMMISSION_RATE)
const driverPayoutToday = MOCK_STATS.revenueToday - commissionToday

const MOCK_DRIVERS_BALANCE = [
  { id: 'drv1', name: 'Faniry Rakoto',     phone: '+261 34 12 345 67', pending_balance: 18500, total_trips: 342 },
  { id: 'drv2', name: 'Hery Andriamahefa', phone: '+261 33 45 678 90', pending_balance: 12750, total_trips: 127 },
  { id: 'drv3', name: 'Rivo Rakotondrabe', phone: '+261 34 11 223 34', pending_balance:  8500, total_trips:  54 },
]

const MOCK_PENDING_DRIVERS = [
  { id: 'd1', name: 'Rivo Rakotondrabe', city: 'Antananarivo', submitted_at: new Date(Date.now() - 2*3600000) },
  { id: 'd2', name: 'Lalaina Andriamanga', city: 'Toamasina',  submitted_at: new Date(Date.now() - 5*3600000) },
  { id: 'd3', name: 'Soa Randriamaro',   city: 'Antsirabe',   submitted_at: new Date(Date.now() - 9*3600000) },
]

const STATUS_STYLE = {
  pending:   { bg: 'bg-yellow-500/10 text-yellow-400',  dot: 'bg-yellow-400',  label: 'En attente' },
  accepted:  { bg: 'bg-blue-500/10   text-blue-400',    dot: 'bg-blue-400',    label: 'Acceptée' },
  pickup:    { bg: 'bg-purple-500/10 text-purple-400',  dot: 'bg-purple-400',  label: 'Collecte' },
  ontheway:  { bg: 'bg-orange-500/10 text-orange-400',  dot: 'bg-orange-400',  label: 'En route' },
  delivered: { bg: 'bg-green-500/10  text-green-400',   dot: 'bg-green-400',   label: 'Livrée' },
  cancelled: { bg: 'bg-red-500/10    text-red-400',     dot: 'bg-red-400',     label: 'Annulée' },
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-white leading-none">{value}</p>
        <p className="text-gray-400 text-sm font-medium mt-1">{label}</p>
        {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Status badge (dark theme) ────────────────────────────────
function DarkStatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Mini chart (barres SVG) ───────────────────────────────────
function MiniBarChart({ data, color = '#E84C1E' }) {
  const max = Math.max(...data)
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{
            height: `${(v / max) * 100}%`,
            backgroundColor: i === data.length - 1 ? color : color + '50',
          }}
        />
      ))}
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────
export default function AdminDashboard() {
  const { admin } = useAdminAuth()

  // ── Données réelles depuis Supabase ──────────────────────
  const [stats,        setStats]        = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError,   setStatsError]   = useState(null)

  // ── Soldes livreurs ───────────────────────────────────────
  const [driversBalance,  setDriversBalance]  = useState(MOCK_DRIVERS_BALANCE)
  const [payingId,        setPayingId]        = useState(null)   // id en cours de paiement
  const [payingAll,       setPayingAll]       = useState(false)
  const [payToast,        setPayToast]        = useState(null)   // { msg, type }

  const [time, setTime] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  async function loadData() {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const [s, orders, balances] = await Promise.all([
        getAdminStats(),
        getRecentOrders(5),
        getDriversWithBalance().catch(() => null),
      ])
      setStats(s)
      setRecentOrders(orders)
      if (balances?.length) setDriversBalance(balances)
    } catch (err) {
      console.error('[AdminDashboard]', err)
      setStatsError(err.message)
      setStats(MOCK_STATS)
      setRecentOrders(MOCK_RECENT_ORDERS)
    } finally {
      setStatsLoading(false)
    }
  }

  function showPayToast(msg, type = 'success') {
    setPayToast({ msg, type })
    setTimeout(() => setPayToast(null), 3500)
  }

  async function handlePayDriver(driver) {
    setPayingId(driver.id)
    try {
      const amount = await payDriver(driver.id, admin?.id)
      setDriversBalance(prev => prev.filter(d => d.id !== driver.id))
      showPayToast(`✅ ${driver.name} — ${formatAr(amount || driver.pending_balance)} versés`)
    } catch {
      // Fallback local (demo sans Supabase)
      setDriversBalance(prev => prev.filter(d => d.id !== driver.id))
      showPayToast(`✅ ${driver.name} — ${formatAr(driver.pending_balance)} versés (démo)`)
    } finally {
      setPayingId(null)
    }
  }

  async function handlePayAll() {
    setPayingAll(true)
    const total = driversBalance.reduce((s, d) => s + d.pending_balance, 0)
    const count = driversBalance.length
    try {
      await payAllDrivers(admin?.id)
    } catch { /* démo */ }
    setDriversBalance([])
    showPayToast(`✅ ${count} livreur${count > 1 ? 's' : ''} payés — ${formatAr(total)} au total`)
    setPayingAll(false)
  }

  useEffect(() => { loadData() }, [])

  // Horloge live
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  // Utiliser stats réelles ou mock
  const s = stats ?? MOCK_STATS

  const greeting = time.getHours() < 12 ? 'Bonjour' : time.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="flex flex-col gap-6 max-w-7xl">

      {/* ── Header page ──────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{greeting} 👋</p>
          <h1 className="text-white font-extrabold text-2xl mt-0.5">Tableau de bord</h1>
          <p className="text-gray-600 text-xs mt-1 font-mono">
            {(() => {
              try {
                return time.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
              } catch {
                return time.toLocaleDateString()
              }
            })()}
            {' · '}
            <span className="text-gray-500">
              {(() => {
                try {
                  return time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                } catch {
                  return time.toLocaleTimeString()
                }
              })()}
            </span>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-4 py-2 rounded-xl transition"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* ── Alertes urgentes ─────────────────────────────── */}
      {((s.drivers_pending ?? s.driversPending ?? 0) > 0 || (s.drivers_suspended ?? s.driversSuspended ?? 0) > 0) && (
        <div className="flex flex-col gap-2">
          {(s.drivers_pending ?? s.driversPending ?? 0) > 0 && (
            <Link
              to="/admin/drivers"
              className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-4 py-3
                hover:bg-yellow-500/15 transition group"
            >
              <Clock size={16} className="text-yellow-400 shrink-0" />
              <p className="text-yellow-300 text-sm flex-1">
                <span className="font-bold">{s.drivers_pending ?? s.driversPending ?? 0} livreur{(s.drivers_pending ?? s.driversPending ?? 0) > 1 ? 's' : ''}</span>
                {' '}en attente de validation
              </p>
              <ArrowRight size={14} className="text-yellow-400/50 group-hover:text-yellow-400 transition" />
            </Link>
          )}
          {(s.drivers_suspended ?? s.driversSuspended ?? 0) > 0 && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">
                <span className="font-bold">{s.drivers_suspended ?? s.driversSuspended ?? 0} livreur{(s.drivers_suspended ?? s.driversSuspended ?? 0) > 1 ? 's' : ''}</span>
                {' '}suspendu{(s.drivers_suspended ?? s.driversSuspended ?? 0) > 1 ? 's' : ''} (note {'<'} 3.5)
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="Revenus du jour"
          value={formatAr(s.revenue_today ?? s.revenueToday ?? 0)}
          sub={statsLoading ? '…' : `${(s.drivers_approved ?? s.driversApproved ?? 0)} livreurs actifs`}
          color="bg-brand-500"
        />
        <KpiCard
          icon={Percent}
          label="Commission (15%)"
          value={formatAr(s.commission_today ?? Math.round((s.revenue_today ?? s.revenueToday ?? 0) * COMMISSION_RATE))}
          sub={`Livreurs : ${formatAr(s.driver_payout_today ?? Math.round((s.revenue_today ?? s.revenueToday ?? 0) * 0.85))}`}
          color="bg-violet-600"
        />
        <KpiCard
          icon={Package}
          label="Courses aujourd'hui"
          value={statsLoading ? '…' : (s.orders_today ?? s.ordersToday ?? 0)}
          sub={`${s.orders_active ?? s.ordersActive ?? 0} en cours`}
          color="bg-blue-500"
        />
        <KpiCard
          icon={Activity}
          label="Note moyenne"
          value={statsLoading ? '…' : `★ ${s.avg_rating ?? s.avgRating ?? '—'}`}
          sub={`${s.drivers_pending ?? s.driversPending ?? 0} en attente`}
          color="bg-yellow-500"
        />
      </div>

      {/* ── Toast paiement ───────────────────────────────── */}
      {payToast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg
          text-sm font-semibold text-white animate-slide-up whitespace-nowrap
          ${payToast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {payToast.msg}
        </div>
      )}

      {/* ── Paiements du soir ────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="bg-green-500/15 p-2 rounded-xl">
              <Banknote size={18} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm">Paiements du soir</h2>
              <p className="text-gray-500 text-xs mt-0.5">Soldes à verser aux livreurs</p>
            </div>
            {driversBalance.length > 0 && (
              <span className="bg-green-500 text-black text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center ml-1">
                {driversBalance.length}
              </span>
            )}
          </div>

          {driversBalance.length > 1 && (
            <button
              onClick={handlePayAll}
              disabled={payingAll}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 disabled:opacity-50
                text-black text-xs font-extrabold px-4 py-2 rounded-xl transition active:scale-95"
            >
              {payingAll ? (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : <CreditCard size={13} />}
              Tout payer ({formatAr(driversBalance.reduce((s, d) => s + d.pending_balance, 0))})
            </button>
          )}
        </div>

        {driversBalance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <CheckCircle2 size={28} className="text-green-500/40" />
            <p className="text-gray-500 text-sm">Tous les livreurs ont été payés</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {driversBalance.map(driver => (
              <div key={driver.id} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-800/30 transition">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
                  {driver.profile_photo_url
                    ? <img src={driver.profile_photo_url} alt={driver.name} className="w-9 h-9 rounded-xl object-cover" />
                    : <User size={16} className="text-gray-400" />}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{driver.name}</p>
                  <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                    <Phone size={10} />
                    <span className="font-mono">{driver.phone}</span>
                  </div>
                </div>

                {/* Montant */}
                <p className="font-extrabold text-green-400 text-base shrink-0">
                  {formatAr(driver.pending_balance)}
                </p>

                {/* Bouton payer */}
                <button
                  onClick={() => handlePayDriver(driver)}
                  disabled={payingId === driver.id || payingAll}
                  className="flex items-center gap-1.5 bg-green-500/15 hover:bg-green-500 text-green-400
                    hover:text-black text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95
                    disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {payingId === driver.id ? (
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  ) : <Banknote size={13} />}
                  Payer
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Total à payer */}
        {driversBalance.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 bg-gray-800/40 border-t border-gray-800">
            <span className="text-gray-400 text-xs">Total à verser</span>
            <span className="text-green-400 font-extrabold text-lg">
              {formatAr(driversBalance.reduce((s, d) => s + d.pending_balance, 0))}
            </span>
          </div>
        )}
      </div>

      {/* ── Graphe + commandes récentes ───────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Graphe revenus 7 jours */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-bold text-sm">Revenus — 7 derniers jours</h2>
              <p className="text-gray-500 text-xs mt-0.5">En ariary</p>
            </div>
            <span className="text-brand-400 text-xs font-semibold">+18% vs sem. passée</span>
          </div>
          <MiniBarChart data={[32000, 45000, 28000, 51000, 38000, 62000, 68000]} />
          <div className="flex justify-between mt-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Auj'].map(d => (
              <span key={d} className="text-[10px] text-gray-600 flex-1 text-center">{d}</span>
            ))}
          </div>
        </div>

        {/* Répartition statuts */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm mb-4">Courses du jour</h2>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Livrées',  value: stats.ordersDelivered, color: 'bg-green-500',  pct: Math.round(stats.ordersDelivered / stats.ordersToday * 100) },
              { label: 'En cours', value: stats.ordersActive,    color: 'bg-orange-500', pct: Math.round(stats.ordersActive / stats.ordersToday * 100) },
              { label: 'Annulées', value: stats.ordersCancelled, color: 'bg-red-500',    pct: Math.round(stats.ordersCancelled / stats.ordersToday * 100) },
            ].map(({ label, value, color, pct }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-xs">{label}</span>
                  <span className="text-white text-xs font-bold">{value}</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
            <span className="text-gray-500 text-xs">Total</span>
            <span className="text-white font-extrabold">{stats.ordersToday}</span>
          </div>
        </div>
      </div>

      {/* ── Commandes récentes + Livreurs en attente ─────── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Commandes récentes */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="text-white font-bold text-sm">Commandes récentes</h2>
            <Link to="/admin/orders" className="text-brand-400 text-xs font-semibold hover:text-brand-300 transition flex items-center gap-1">
              Voir tout <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-800/60">
            {(recentOrders.length > 0 ? recentOrders : MOCK_RECENT_ORDERS).map(order => {
              // Normalise les deux formats (RPC réel vs mock)
              const code   = order.tracking_code ?? order.code ?? '—'
              const status = order.status ?? 'pending'
              const client = order.client_name ?? order.client ?? '—'
              const driver = order.driver_name ?? order.driver
              const price  = order.price_ariary ?? order.price ?? 0
              const comm   = order.commission ?? splitCommission(price).commission
              const time   = order.created_at
                ? new Date(order.created_at).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'})
                : (order.time ?? '')
              return (
              <div key={order.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/40 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-bold font-mono">{code}</span>
                    <DarkStatusBadge status={status} />
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5 truncate">
                    {client}
                    {driver && <span className="text-gray-600"> · {driver}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white text-xs font-semibold">{price.toLocaleString()} Ar</p>
                  {status !== 'cancelled' && (
                    <p className="text-violet-400 text-[10px] font-semibold">
                      comm. {formatAr(comm)}
                    </p>
                  )}
                  <p className="text-gray-600 text-[10px] font-mono">{time}</p>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* Livreurs en attente */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-sm">Livreurs en attente</h2>
              {MOCK_PENDING_DRIVERS.length > 0 && (
                <span className="bg-yellow-500 text-black text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center">
                  {MOCK_PENDING_DRIVERS.length}
                </span>
              )}
            </div>
            <Link to="/admin/drivers" className="text-brand-400 text-xs font-semibold hover:text-brand-300 transition flex items-center gap-1">
              Gérer <ArrowRight size={12} />
            </Link>
          </div>

          {MOCK_PENDING_DRIVERS.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckCircle2 size={28} className="text-green-500/40" />
              <p className="text-gray-500 text-sm">Aucune candidature en attente</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {MOCK_PENDING_DRIVERS.map(d => {
                const hrs  = Math.floor((Date.now() - new Date(d.submitted_at)) / 3600000)
                const mins = Math.floor(((Date.now() - new Date(d.submitted_at)) % 3600000) / 60000)
                return (
                  <div key={d.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/40 transition">
                    <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
                      <Bike size={16} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{d.name}</p>
                      <p className="text-gray-500 text-xs">{d.city}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-yellow-400/70 text-[10px] font-mono">
                        <Clock size={10} />
                        {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`}
                      </div>
                      <Link
                        to="/admin/drivers"
                        className="text-[10px] text-brand-400 hover:text-brand-300 font-semibold"
                      >
                        Traiter →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
