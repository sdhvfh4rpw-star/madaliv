import { useState, useEffect } from 'react'
import {
  MessageSquareWarning, RefreshCw, CheckCircle2, Phone, Package,
  Clock, AlertTriangle, Filter
} from 'lucide-react'
import { getClaims, resolveClaim } from '../../lib/supabase'

// ── Style par catégorie ───────────────────────────────────────
function categoryStyle(cat) {
  const c = (cat ?? '').toLowerCase()
  if (c.includes('perdu'))    return { icon: '📦', cls: 'bg-red-500/10 text-red-300' }
  if (c.includes('endommag')) return { icon: '💔', cls: 'bg-orange-500/10 text-orange-300' }
  if (c.includes('retard'))   return { icon: '⏰', cls: 'bg-yellow-500/10 text-yellow-300' }
  if (c.includes('livreur'))  return { icon: '🏍️', cls: 'bg-blue-500/10 text-blue-300' }
  return { icon: '🔖', cls: 'bg-gray-500/10 text-gray-300' }
}

function timeLabel(iso) {
  try {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

export default function AdminClaims() {
  const [claims,   setClaims]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter,   setFilter]   = useState('all')   // all | open | resolved
  const [resolvingId, setResolvingId] = useState(null)

  async function load() {
    const data = await getClaims()   // jamais d'exception → []
    setClaims(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function handleResolve(claim) {
    setResolvingId(claim.id)
    const ok = await resolveClaim(claim.id)
    if (ok) {
      setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, status: 'resolved' } : c))
    }
    setResolvingId(null)
  }

  // ── Données sécurisées ───────────────────────────────────────
  const safeClaims = Array.isArray(claims) ? claims : []
  const openCount     = safeClaims.filter(c => c?.status !== 'resolved').length
  const resolvedCount = safeClaims.filter(c => c?.status === 'resolved').length

  const FILTERS = [
    { id: 'all',      label: 'Toutes',   count: safeClaims.length },
    { id: 'open',     label: 'Ouvertes', count: openCount },
    { id: 'resolved', label: 'Résolues', count: resolvedCount },
  ]
  const filtered = safeClaims.filter(c => {
    if (filter === 'open')     return c?.status !== 'resolved'
    if (filter === 'resolved') return c?.status === 'resolved'
    return true
  })

  return (
    <div className="flex flex-col gap-6 max-w-5xl">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white font-extrabold text-2xl">Réclamations</h1>
          <p className="text-gray-500 text-sm mt-1">
            {openCount ?? 0} ouverte{(openCount ?? 0) > 1 ? 's' : ''} · {resolvedCount ?? 0} résolue{(resolvedCount ?? 0) > 1 ? 's' : ''}
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

      {/* ── Filtres ──────────────────────────────────────── */}
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition
              ${filter === f.id ? 'bg-brand-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}
          >
            {f.label}
            <span className={`text-[10px] font-bold ${filter === f.id ? 'opacity-70' : 'opacity-50'}`}>{f.count ?? 0}</span>
          </button>
        ))}
      </div>

      {/* ── Liste ────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
          <MessageSquareWarning size={15} className="text-brand-400" />
          <h2 className="text-white font-bold text-sm">Liste des réclamations</h2>
          <span className="text-gray-500 text-xs ml-auto">{filtered.length} affichée{filtered.length > 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-500 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <CheckCircle2 size={28} className="text-green-500/40" />
            <p className="text-gray-500 text-sm">
              {filter === 'open' ? 'Aucune réclamation ouverte' : 'Aucune réclamation'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {filtered.map(claim => {
              const cat      = categoryStyle(claim?.category)
              const resolved = claim?.status === 'resolved'
              return (
                <div key={claim?.id ?? Math.random()} className="px-5 py-4 hover:bg-gray-800/30 transition">
                  <div className="flex items-start gap-3">
                    {/* Icône catégorie */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${cat.cls}`}>
                      {cat.icon}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cat.cls}`}>
                          {claim?.category ?? 'Autre'}
                        </span>
                        {resolved ? (
                          <span className="text-[10px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={10} /> Résolue
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle size={10} /> Ouverte
                          </span>
                        )}
                      </div>

                      {/* Message */}
                      {claim?.message && (
                        <p className="text-gray-300 text-sm mt-1.5 leading-relaxed">{claim.message}</p>
                      )}

                      {/* Méta */}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 flex-wrap">
                        {claim?.order_code && (
                          <span className="flex items-center gap-1 font-mono">
                            <Package size={11} /> {claim.order_code}
                          </span>
                        )}
                        {claim?.client_phone && (
                          <a href={`tel:${claim.client_phone}`} className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                            <Phone size={11} /> {claim.client_phone}
                          </a>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {timeLabel(claim?.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Action résoudre */}
                    {!resolved && (
                      <button
                        onClick={() => handleResolve(claim)}
                        disabled={resolvingId === claim?.id}
                        className="flex items-center gap-1.5 bg-green-500/15 hover:bg-green-500 text-green-400 hover:text-black text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 disabled:opacity-40 shrink-0"
                      >
                        {resolvingId === claim?.id ? (
                          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                        ) : <CheckCircle2 size={13} />}
                        Résoudre
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
