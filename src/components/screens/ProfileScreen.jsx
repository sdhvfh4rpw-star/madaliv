import { useState, useEffect } from 'react'
import {
  LogOut, Package, Phone, Mail, Star, Clock, ChevronDown, ChevronUp,
  CreditCard, Image, Camera, TrendingUp, Calendar, AlertCircle, CheckCircle2, Send,
  Store, ChevronRight
} from 'lucide-react'
import { useClientAuth } from '../../contexts/ClientAuthContext'
import { getClientOrders, formatPhoneDisplay } from '../../lib/clientAuth'
import { formatAr } from '../../lib/pricing'
import { submitClaim } from '../../lib/supabase'
import { sendClaimEmail } from '../../lib/email'
import RatingModal from '../ui/RatingModal'

// ── Catégories de réclamation ─────────────────────────────────
const CLAIM_CATEGORIES = [
  { id: 'lost',    label: 'Colis perdu',      icon: '📦' },
  { id: 'damaged', label: 'Colis endommagé',  icon: '💔' },
  { id: 'delay',   label: 'Retard',           icon: '⏰' },
  { id: 'driver',  label: 'Problème livreur',  icon: '🏍️' },
  { id: 'other',   label: 'Autre',            icon: '🔖' },
]

// ── Formulaire de réclamation (inline) ────────────────────────
function ClaimForm({ orderCode, clientPhone, onClose }) {
  const [category, setCategory] = useState('')
  const [message,  setMessage]  = useState('')
  const [sending,  setSending]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState(null)

  async function handleSend() {
    if (!category) { setError('Choisissez une catégorie'); return }
    setSending(true)
    setError(null)
    const catLabel = CLAIM_CATEGORIES.find(c => c.id === category)?.label ?? category
    const ok = await submitClaim(orderCode, clientPhone, catLabel, message.trim() || null)
    // Notification email support (non bloquant, ne casse jamais)
    sendClaimEmail({ orderCode, clientPhone, category: catLabel, message: message.trim() })
    setSending(false)
    if (ok) {
      setDone(true)
      setTimeout(() => onClose?.(), 1800)
    } else {
      setError('Envoi impossible — réessayez plus tard.')
    }
  }

  if (done) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col items-center gap-2 py-3 animate-fade-in">
        <CheckCircle2 size={28} className="text-green-500" />
        <p className="text-sm font-semibold text-green-700">Réclamation envoyée</p>
        <p className="text-xs text-gray-400 text-center">Notre équipe vous contactera bientôt.</p>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-3 animate-fade-in">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Signaler un problème</p>

      {/* Catégories */}
      <div className="flex flex-wrap gap-1.5">
        {CLAIM_CATEGORIES.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => { setCategory(c.id); setError(null) }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition
              ${category === c.id
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}
          >
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      {/* Message */}
      <textarea
        rows={2}
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Décrivez le problème (optionnel)…"
        className="input-field resize-none text-sm"
      />

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold active:scale-95 transition"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
        >
          {sending ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : <Send size={14} />}
          Envoyer
        </button>
      </div>
    </div>
  )
}

// ── Constantes ────────────────────────────────────────────────
const STATUS = {
  pending:   { label: 'En attente', dot: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50'  },
  accepted:  { label: 'Acceptée',   dot: 'bg-blue-400',   text: 'text-blue-700',   bg: 'bg-blue-50'    },
  pickup:    { label: 'Collecte',   dot: 'bg-purple-400', text: 'text-purple-700', bg: 'bg-purple-50'  },
  ontheway:  { label: 'En route',   dot: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50'  },
  delivered: { label: 'Livrée ✓',   dot: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50'   },
  cancelled: { label: 'Annulée',    dot: 'bg-red-400',    text: 'text-red-600',    bg: 'bg-red-50'     },
}

const PAYMENT_LABEL = { mvola: '🔵 MVola', orange: '🟠 Orange Money', cash: '💵 Espèces' }

// ── Composant : carte de commande cliquable ───────────────────
function OrderCard({ order, onRate, clientPhone }) {
  const [expanded, setExpanded]   = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)
  const st = STATUS[order.status] ?? STATUS.pending
  const needsRating = order.status === 'delivered' && !order.rating
  const canClaim    = order.status === 'delivered'

  return (
    <div className={`card transition-all ${expanded ? 'ring-2 ring-brand-200' : ''}`}>
      {/* Ligne principale — toujours visible */}
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm font-mono text-gray-700">{order.tracking_code}</span>
            {order.rating && (
              <span className="text-yellow-500 text-xs">
                {'★'.repeat(order.rating)}{'☆'.repeat(5 - order.rating)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              {st.label}
            </span>
            {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </div>

        {/* Trajet */}
        <div className="flex flex-col gap-1 mb-2">
          {order.pickup_label && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
              <span className="truncate">{order.pickup_label}</span>
            </div>
          )}
          {order.delivery_label && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span className="truncate">{order.delivery_label}</span>
            </div>
          )}
        </div>

        {/* Pied de carte */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {new Date(order.created_at).toLocaleDateString('fr-FR', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </span>
          <span className="font-bold text-gray-700 text-sm">
            {formatAr(order.price_ariary ?? 0)}
          </span>
        </div>
      </button>

      {/* Détail — affiché si expandé */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-3 animate-fade-in">
          {/* Méthode de paiement */}
          {order.payment_method && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-500">
                <CreditCard size={12} /> Paiement
              </span>
              <span className="font-semibold text-gray-700">
                {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
                {order.payment_status === 'paid' && (
                  <span className="ml-1 text-green-600 font-bold">· Payé</span>
                )}
              </span>
            </div>
          )}

          {/* Note existante */}
          {order.rating && (
            <div className="bg-yellow-50 rounded-xl px-3 py-2">
              <p className="text-[10px] font-semibold text-yellow-600 uppercase tracking-wide mb-1">Votre note</p>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={14}
                    className={s <= order.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                ))}
                {order.rating_comment && (
                  <span className="text-xs text-gray-500 ml-2 italic">"{order.rating_comment}"</span>
                )}
              </div>
            </div>
          )}

          {/* Photos de preuve */}
          {(order.pickup_proof_url || order.delivery_proof_url) && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Photos de preuve
              </p>
              <div className="flex gap-2">
                {[
                  { label: 'Collecte',  url: order.pickup_proof_url },
                  { label: 'Livraison', url: order.delivery_proof_url },
                ].map(({ label, url }) => (
                  <div key={label} className="flex-1">
                    <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                    {url ? (
                      <img src={url} alt={label}
                        className="w-full h-24 object-cover rounded-xl border border-gray-100" />
                    ) : (
                      <div className="w-full h-24 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Camera size={18} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bouton noter le livreur */}
          {needsRating && (
            <button
              onClick={() => onRate(order)}
              className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <Star size={15} /> Noter le livreur
            </button>
          )}

          {/* Réclamation — uniquement sur commandes livrées */}
          {canClaim && !claimOpen && (
            <button
              onClick={() => setClaimOpen(true)}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold flex items-center justify-center gap-2 hover:border-red-300 hover:text-red-500 active:scale-[0.98] transition"
            >
              <AlertCircle size={15} /> Signaler un problème
            </button>
          )}
          {canClaim && claimOpen && (
            <ClaimForm
              orderCode={order.tracking_code}
              clientPhone={clientPhone}
              onClose={() => setClaimOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Statistiques mensuelles ───────────────────────────────────
function MonthlyStats({ orders }) {
  const now       = new Date()
  const thisMonth = orders.filter(o => {
    const d = new Date(o.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const delivered = thisMonth.filter(o => o.status === 'delivered')
  const total     = delivered.reduce((s, o) => s + (o.price_ariary ?? 0), 0)

  if (thisMonth.length === 0) return null

  const monthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="card bg-gradient-to-br from-brand-50 to-orange-50 border-brand-100">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={15} className="text-brand-500" />
        <p className="text-xs font-bold text-brand-700 uppercase tracking-wide">Ce mois · {monthName}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Commandes', value: thisMonth.length,  color: 'text-brand-600' },
          { label: 'Livrées',   value: delivered.length,  color: 'text-green-600' },
          { label: 'Dépensé',   value: formatAr(total),   color: 'text-gray-800'  },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className={`font-extrabold text-lg leading-tight ${color}`}>{value}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Écran principal ───────────────────────────────────────────
export default function ProfileScreen({ onNavigate }) {
  const { client, logout, isMerchant } = useClientAuth()
  const [orders,     setOrders]     = useState([])
  const [ordLoad,    setOrdLoad]    = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [ratingOrder, setRatingOrder] = useState(null)  // commande à noter
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (!client?.id) { setOrdLoad(false); return }
    getClientOrders(client.id, 50).then(data => {
      setOrders(data)
      setOrdLoad(false)
    }).catch(() => setOrdLoad(false))
  }, [client?.id])

  async function handleLogout() {
    setLoggingOut(true)
    try { await logout() } finally { setLoggingOut(false) }
  }

  function handleRatingSubmit() {
    setRatingOrder(null)
    // Rafraîchir les commandes après notation
    if (client?.id) {
      getClientOrders(client.id, 50).then(setOrders)
    }
  }

  if (!client) return null

  const initials = client.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  // Filtres
  const FILTERS = [
    { id: 'all',       label: 'Toutes'  },
    { id: 'delivered', label: 'Livrées' },
    { id: 'ontheway',  label: 'En cours' },
    { id: 'cancelled', label: 'Annulées' },
  ]
  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)

  // Stats globales
  const delivered     = orders.filter(o => o.status === 'delivered')
  const totalSpent    = delivered.reduce((s, o) => s + (o.price_ariary ?? 0), 0)
  const pendingRating = orders.filter(o => o.status === 'delivered' && !o.rating).length

  return (
    <div className="pb-28 animate-fade-in">
      {/* Modal notation */}
      {ratingOrder && (
        <RatingModal
          order={ratingOrder}
          driver={{ name: 'Votre livreur' }}
          onSubmit={handleRatingSubmit}
          onSkip={() => setRatingOrder(null)}
          t={k => ({ rateTitle:'Notez votre livreur', rateSub:'Votre avis améliore le service',
            rateDelivery:'Note', rateComment:'Commentaire (optionnel)',
            rateCommentPlaceholder:'Décrivez votre expérience...', submitRating:'Envoyer',
            ratingSubmitted:'Merci !', rateLabels:['Très mauvais','Mauvais','Correct','Bien','Excellent'] })[k] ?? k}
        />
      )}

      {/* Header profil */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-5 pt-6 pb-8 text-white">
        <div className="flex items-center gap-4">
          {client.avatar_url ? (
            <img src={client.avatar_url} alt={client.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shadow-lg" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center border-2 border-white/20">
              <span className="font-extrabold text-xl">{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-lg truncate">{client.name}</h2>
            <div className="flex items-center gap-1.5 text-white/70 text-xs mt-0.5">
              <Phone size={11} /> {formatPhoneDisplay(client.phone)}
            </div>
            {client.email && (
              <div className="flex items-center gap-1.5 text-white/70 text-xs mt-0.5">
                <Mail size={11} /> <span className="truncate">{client.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="flex gap-3 mt-5">
          {[
            { label: 'Commandes',       value: orders.length },
            { label: 'Livrées',         value: delivered.length },
            { label: 'Total dépensé',   value: formatAr(totalSpent), small: true },
          ].map(({ label, value, small }) => (
            <div key={label} className="flex-1 bg-white/10 rounded-xl py-2.5 text-center px-1">
              <p className={`font-extrabold leading-tight ${small ? 'text-sm' : 'text-xl'}`}>{value}</p>
              <p className="text-white/60 text-[10px] font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Alerte : commandes à noter */}
        {pendingRating > 0 && (
          <div className="mt-3 bg-white/15 border border-white/20 rounded-xl px-3 py-2 flex items-center gap-2">
            <Star size={14} className="text-yellow-300" />
            <p className="text-white/90 text-xs font-semibold">
              {pendingRating} livraison{pendingRating > 1 ? 's' : ''} à noter
            </p>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Accès espace boutique — uniquement pour les commerçants */}
        {isMerchant && (
          <button
            onClick={() => onNavigate?.('merchant')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white active:scale-[0.98] transition shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
              <Store size={20} className="text-white" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-bold text-sm">Mon espace boutique</p>
              <p className="text-white/60 text-xs truncate">
                {(client.shop_name && String(client.shop_name).trim()) || 'Gérer mes livraisons'}
              </p>
            </div>
            <ChevronRight size={18} className="text-white/50 shrink-0" />
          </button>
        )}

        {/* Stats mensuelles */}
        <MonthlyStats orders={orders} />

        {/* Bouton nouvelle commande */}
        <button
          onClick={() => onNavigate?.('order')}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Package size={17} /> Passer une commande
        </button>

        {/* Historique des commandes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-gray-700">Mes commandes</h3>
            <span className="text-xs text-gray-400">{orders.length} au total</span>
          </div>

          {/* Filtres */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
            {FILTERS.map(f => (
              <button key={f.id} type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition shrink-0
                  ${statusFilter === f.id ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {f.label}
                {f.id === 'all' && orders.length > 0 && (
                  <span className="ml-1 opacity-60">{orders.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Liste */}
          {ordLoad ? (
            <div className="flex flex-col gap-2">
              {[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-8 text-gray-400">
              <Package size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune commande</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(order => (
                <OrderCard key={order.id} order={order} onRate={setRatingOrder} clientPhone={client.phone} />
              ))}
            </div>
          )}
        </div>

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-gray-200
            text-gray-500 text-sm font-semibold hover:border-red-300 hover:text-red-500 transition active:scale-[0.98]"
        >
          <LogOut size={16} />
          {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
        </button>
      </div>
    </div>
  )
}
