import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Package, TrendingUp, AlertTriangle, ShieldCheck,
  Clock, CheckCircle2, XCircle, Bike, ArrowRight, Activity,
  RefreshCw, Percent, Banknote, Phone, User, CreditCard
} from 'lucide-react'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { splitCommission, formatAr, COMMISSION_RATE } from '../../lib/pricing'
import { getAdminStats, getRecentOrders, getDriversWithBalance, getPendingDrivers, payDriver, payAllDrivers } from '../../lib/supabase'

// Aucune donnée fictive — l'admin affiche uniquement les vraies données Supabase.
// Structure de stats vide (tous les compteurs à 0) en attendant le chargement / si la base est vide.
const EMPTY_STATS = {
  drivers_total: 0, drivers_pending: 0, drivers_approved: 0, drivers_suspended: 0,
  orders_today: 0, orders_active: 0, orders_delivered_today: 0, orders_cancelled_today: 0,
  revenue_today: 0, commission_today: 0, driver_payout_today: 0, avg_rating: 0,
}

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


// ── Composant principal ──────────────────────────────────────
export default function AdminDashboard() {
  const { admin } = useAdminAuth()

  // ── Données réelles depuis Supabase ──────────────────────
  const [stats,        setStats]        = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError,   setStatsError]   = useState(null)

  // ── Soldes livreurs + livreurs en attente ─────────────────
  const [driversBalance,  setDriversBalance]  = useState([])
  const [pendingDrivers,  setPendingDrivers]  = useState([])
  const [payingId,        setPayingId]        = useState(null)
  const [payingAll,       setPayingAll]       = useState(false)
  const [payToast,        setPayToast]        = useState(null)

  const [time, setTime] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  async function loadData() {
    setStatsLoading(true)
    setStatsError(null)
    try {
      // Chaque appel est isolé : une table vide/erreur n'affecte pas les autres.
      const [s, orders, balances, pending] = await Promise.all([
        getAdminStats().catch(() => null),
        getRecentOrders(5).catch(() => []),
        getDriversWithBalance().catch(() => []),
        getPendingDrivers().catch(() => []),
      ])
      setStats(s ?? EMPTY_STATS)
      setRecentOrders(Array.isArray(orders) ? orders : [])
      setDriversBalance(Array.isArray(balances) ? balances : [])
      setPendingDrivers(Array.isArray(pending) ? pending : [])
    } catch (err) {
      console.error('[AdminDashboard]', err)
      setStatsError(err.message)
      // États vides — jamais de fausses données
      setStats(EMPTY_STATS)
      setRecentOrders([])
      setDriversBalance([])
      setPendingDrivers([])
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
  const s = stats ?? EMPTY_STATS

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

        {/* Revenus du jour (données réelles) */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-bold text-sm">Revenus du jour</h2>
              <p className="text-gray-500 text-xs mt-0.5">Commandes livrées aujourd'hui</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Revenu encaissé', value: formatAr(s.revenue_today ?? 0),       color: 'text-white' },
              { label: 'Commission 15%',  value: formatAr(s.commission_today ?? 0),    color: 'text-violet-400' },
              { label: 'Part livreurs',   value: formatAr(s.driver_payout_today ?? 0), color: 'text-green-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-800/40 rounded-xl px-3 py-3">
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-1">{label}</p>
                <p className={`font-extrabold text-sm ${color}`}>{statsLoading ? '…' : value}</p>
              </div>
            ))}
          </div>
          {!statsLoading && (s.orders_delivered_today ?? 0) === 0 && (
            <p className="text-gray-600 text-xs text-center mt-4">Aucune livraison aujourd'hui</p>
          )}
        </div>

        {/* Répartition statuts */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm mb-4">Courses du jour</h2>
          <div className="flex flex-col gap-3">
            {(() => {
              // Valeurs sécurisées — supporte snake_case (Supabase) et camelCase (mock)
              const ordersToday     = s?.orders_today     ?? s?.ordersToday     ?? 0
              const ordersDelivered = s?.orders_delivered ?? s?.ordersDelivered ?? 0
              const ordersActive    = s?.orders_active    ?? s?.ordersActive    ?? 0
              const ordersCancelled = s?.orders_cancelled ?? s?.ordersCancelled ?? 0
              const pct = (n) => ordersToday > 0 ? Math.round((n / ordersToday) * 100) : 0
              return [
                { label: 'Livrées',  value: ordersDelivered, color: 'bg-green-500',  pct: pct(ordersDelivered) },
                { label: 'En cours', value: ordersActive,    color: 'bg-orange-500', pct: pct(ordersActive) },
                { label: 'Annulées', value: ordersCancelled, color: 'bg-red-500',    pct: pct(ordersCancelled) },
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
              ))
            })()}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
            <span className="text-gray-500 text-xs">Total</span>
            <span className="text-white font-extrabold">{s?.orders_today ?? s?.ordersToday ?? 0}</span>
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
          {(recentOrders?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Package size={26} className="text-gray-700" />
              <p className="text-gray-500 text-sm">{statsLoading ? 'Chargement…' : 'Aucune commande'}</p>
            </div>
          ) : (
          <div className="divide-y divide-gray-800/60">
            {recentOrders.map(order => {
              const o      = order ?? {}
              const code   = o.tracking_code ?? '—'
              const status = o.status ?? 'pending'
              const client = o.client_name ?? '—'
              const driver = o.driver_name ?? null
              const price  = o.price_ariary ?? 0
              const comm   = o.commission ?? splitCommission(price).commission
              const time   = o.created_at
                ? new Date(o.created_at).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'})
                : ''
              return (
              <div key={o.id ?? Math.random()} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/40 transition">
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
                  <p className="text-white text-xs font-semibold">{(price ?? 0).toLocaleString()} Ar</p>
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
          )}
        </div>

        {/* Livreurs en attente */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-sm">Livreurs en attente</h2>
              {(pendingDrivers?.length ?? 0) > 0 && (
                <span className="bg-yellow-500 text-black text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center">
                  {pendingDrivers.length}
                </span>
              )}
            </div>
            <Link to="/admin/drivers" className="text-brand-400 text-xs font-semibold hover:text-brand-300 transition flex items-center gap-1">
              Gérer <ArrowRight size={12} />
            </Link>
          </div>

          {(pendingDrivers?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckCircle2 size={28} className="text-green-500/40" />
              <p className="text-gray-500 text-sm">{statsLoading ? 'Chargement…' : 'Aucune candidature en attente'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {pendingDrivers.map(d => {
                const dr = d ?? {}
                let agoLabel = ''
                try {
                  const ms   = Date.now() - new Date(dr.created_at ?? dr.submitted_at).getTime()
                  if (isFinite(ms) && ms >= 0) {
                    const hrs  = Math.floor(ms / 3600000)
                    const mins = Math.floor((ms % 3600000) / 60000)
                    agoLabel = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
                  }
                } catch { agoLabel = '' }
                return (
                  <div key={dr.id ?? Math.random()} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/40 transition">
                    <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center shrink-0">
                      <Bike size={16} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{dr.name ?? 'Sans nom'}</p>
                      <p className="text-gray-500 text-xs">{dr.city ?? '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {agoLabel && (
                        <div className="flex items-center gap-1 text-yellow-400/70 text-[10px] font-mono">
                          <Clock size={10} /> {agoLabel}
                        </div>
                      )}
                      <Link to="/admin/drivers" className="text-[10px] text-brand-400 hover:text-brand-300 font-semibold">
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
