import { useState, useEffect } from 'react'
import {
  TrendingUp, Percent, Bike, Package, Calendar, RefreshCw,
  Users, Banknote, AlertTriangle
} from 'lucide-react'
import { formatAr } from '../../lib/pricing'
import { getMonthlyFinanceReport } from '../../lib/supabase'

// ── Helpers ───────────────────────────────────────────────────
function currentYearMonth() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}
function toMonthInputValue(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}
function monthLabel(year, month) {
  try {
    return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  } catch {
    return `${month}/${year}`
  }
}
function dayLabel(year, month, day) {
  try {
    return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' })
  } catch {
    return String(day)
  }
}
function timeLabel(iso) {
  try {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

// ── KPI résumé ────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3">
      <div className={`rounded-xl p-2.5 w-fit ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-white leading-none">{value}</p>
        <p className="text-gray-400 text-sm font-medium mt-1">{label}</p>
        {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────
export default function AdminFinance() {
  const init = currentYearMonth()
  const [year,  setYear]  = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [report,  setReport]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const r = await getMonthlyFinanceReport(year, month)
    setReport(r)
  }

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  function handleMonthChange(e) {
    const val = e.target.value  // "YYYY-MM"
    const [y, m] = (val || '').split('-').map(Number)
    if (Number.isFinite(y) && Number.isFinite(m)) {
      setYear(y)
      setMonth(m)
    }
  }

  // ── Données sécurisées (jamais null) ─────────────────────────
  const r        = report ?? {}
  const summary  = r.summary  ?? {}
  const byDay    = r.byDay    ?? []
  const byDriver = r.byDriver ?? []
  const payments = r.payments ?? []

  const totalRevenue     = summary.totalRevenue     ?? 0
  const totalCommission  = summary.totalCommission  ?? 0
  const totalDriverShare = summary.totalDriverShare ?? 0
  const totalDelivered   = summary.totalDelivered   ?? 0
  const avgPerCourse     = totalDelivered > 0 ? Math.round(totalRevenue / totalDelivered) : 0

  return (
    <div className="flex flex-col gap-6 max-w-7xl">

      {/* ── Header + sélecteur de mois ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-white font-extrabold text-2xl">Rapport financier</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{monthLabel(year, month)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="month"
              value={toMonthInputValue(year, month)}
              onChange={handleMonthChange}
              className="bg-gray-900 border border-gray-800 text-white text-sm rounded-xl pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Avertissement données indisponibles */}
      {report && report.ok === false && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-amber-400 shrink-0" />
          <p className="text-amber-300 text-sm">
            Données indisponibles ou base vide — affichage des valeurs à zéro.
          </p>
        </div>
      )}

      {/* ── 1. Résumé du mois ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={TrendingUp}
          label="Revenu total encaissé"
          value={loading ? '…' : formatAr(totalRevenue)}
          sub={`${totalDelivered} course${totalDelivered > 1 ? 's' : ''} livrée${totalDelivered > 1 ? 's' : ''}`}
          color="bg-brand-500"
        />
        <SummaryCard
          icon={Percent}
          label="Commission FAINGANA (15%)"
          value={loading ? '…' : formatAr(totalCommission)}
          sub={totalRevenue > 0 ? `${Math.round((totalCommission / totalRevenue) * 100)}% du revenu` : '—'}
          color="bg-violet-600"
        />
        <SummaryCard
          icon={Bike}
          label="Versé aux livreurs (85%)"
          value={loading ? '…' : formatAr(totalDriverShare)}
          sub={`${byDriver.length} livreur${byDriver.length > 1 ? 's' : ''}`}
          color="bg-green-600"
        />
        <SummaryCard
          icon={Package}
          label="Courses livrées"
          value={loading ? '…' : totalDelivered}
          sub={`Moy. ${formatAr(avgPerCourse)} / course`}
          color="bg-blue-500"
        />
      </div>

      {/* ── 2. Détail par jour ─────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
          <Calendar size={15} className="text-brand-400" />
          <h2 className="text-white font-bold text-sm">Détail par jour</h2>
          <span className="text-gray-500 text-xs ml-auto">{byDay.length} jour{byDay.length > 1 ? 's' : ''} avec activité</span>
        </div>

        {/* En-tête colonnes */}
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-800/60 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          <span>Jour</span>
          <span className="text-right">Courses</span>
          <span className="text-right">Revenu</span>
          <span className="text-right">Commission</span>
          <span className="text-right">Livreurs</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500 text-sm">Chargement…</div>
        ) : byDay.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-sm">Aucune course livrée ce mois</div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {byDay.map(d => (
              <div key={d.day} className="grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 sm:gap-4 px-5 py-3 hover:bg-gray-800/30 transition">
                <span className="text-white text-sm font-medium capitalize">{dayLabel(year, month, d.day)}</span>
                <span className="text-gray-300 text-sm text-right">{d.count}</span>
                <span className="text-white text-sm text-right font-semibold">{formatAr(d.revenue)}</span>
                <span className="text-violet-400 text-sm text-right">{formatAr(d.commission)}</span>
                <span className="text-green-400 text-sm text-right">{formatAr(d.driverShare)}</span>
              </div>
            ))}
            {/* Total */}
            <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 sm:gap-4 px-5 py-3 bg-gray-800/40 font-bold">
              <span className="text-gray-400 text-xs uppercase tracking-wide self-center">Total mois</span>
              <span className="text-white text-sm text-right">{totalDelivered}</span>
              <span className="text-white text-sm text-right">{formatAr(totalRevenue)}</span>
              <span className="text-violet-400 text-sm text-right">{formatAr(totalCommission)}</span>
              <span className="text-green-400 text-sm text-right">{formatAr(totalDriverShare)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Détail par livreur ──────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
          <Users size={15} className="text-green-400" />
          <h2 className="text-white font-bold text-sm">Détail par livreur</h2>
          <span className="text-gray-500 text-xs ml-auto">{byDriver.length} livreur{byDriver.length > 1 ? 's' : ''}</span>
        </div>

        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-800/60 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          <span>Livreur</span>
          <span className="text-right">Courses</span>
          <span className="text-right">Gagné</span>
          <span className="text-right">Payé</span>
          <span className="text-right">Solde</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500 text-sm">Chargement…</div>
        ) : byDriver.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-sm">Aucun livreur actif ce mois</div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {byDriver.map(d => (
              <div key={d.driverId} className="grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 sm:gap-4 px-5 py-3 hover:bg-gray-800/30 transition">
                <div className="min-w-0 col-span-2 sm:col-span-1">
                  <p className="text-white text-sm font-semibold truncate">{d.name}</p>
                  {d.phone && <p className="text-gray-500 text-[11px] font-mono">{d.phone}</p>}
                </div>
                <span className="text-gray-300 text-sm text-right self-center">{d.trips}</span>
                <span className="text-white text-sm text-right self-center font-semibold">{formatAr(d.totalEarned)}</span>
                <span className="text-gray-400 text-sm text-right self-center">{formatAr(d.totalPaid)}</span>
                <span className={`text-sm text-right self-center font-bold ${d.balance > 0 ? 'text-green-400' : d.balance < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {formatAr(d.balance)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Paiements versés ────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
          <Banknote size={15} className="text-green-400" />
          <h2 className="text-white font-bold text-sm">Paiements versés ce mois</h2>
          <span className="text-gray-500 text-xs ml-auto">
            {payments.length} versement{payments.length > 1 ? 's' : ''} ·{' '}
            {formatAr(payments.reduce((s, p) => s + (p.amount ?? 0), 0))}
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500 text-sm">Chargement…</div>
        ) : payments.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-sm">Aucun versement enregistré ce mois</div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {payments.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/30 transition">
                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                  <Banknote size={14} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{p.driverName}</p>
                  <p className="text-gray-500 text-[11px]">{timeLabel(p.created_at)}</p>
                </div>
                <span className="text-green-400 font-extrabold text-sm shrink-0">{formatAr(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
