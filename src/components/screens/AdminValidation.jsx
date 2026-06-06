import { useState, useEffect } from 'react'
import { ShieldCheck, ShieldX, Eye, Clock, CheckCircle2, XCircle, AlertTriangle, User, Bike, Phone, Calendar, RefreshCw } from 'lucide-react'
import VerifiedBadge from '../ui/VerifiedBadge'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { getAllDrivers, approveDriver, rejectDriver, suspendDriver } from '../../lib/supabase'

// ── Traductions par défaut (le composant peut être utilisé sans prop t) ──
const LABELS = {
  pendingDrivers:   'En attente',
  approvedDrivers:  'Approuvés',
  rejectedDrivers:  'Rejetés / Suspendus',
  noPendingDrivers: 'Aucun livreur dans cette catégorie',
  submittedOn:      'Soumis le',
  suspendedWarning: 'Livreur suspendu (note < 3.5)',
  viewDocs:         'Voir documents',
  reject:           'Rejeter',
  approve:          'Approuver',
  driverApproved:   'Livreur approuvé ✓',
  driverRejected:   'Candidature rejetée',
  adminTitle:       'Validation des livreurs',
  adminSub:         'Vérifiez et validez les candidatures',
  back:             'Retour',
}
/** t sûr : utilise la prop t si fournie, sinon le dictionnaire local, sinon la clé. */
function makeT(tProp) {
  return (key) => {
    if (typeof tProp === 'function') {
      const v = tProp(key)
      if (v && v !== key) return v
    }
    return LABELS[key] ?? key
  }
}

// ── Helpers défensifs ─────────────────────────────────────────
function str(v, fallback = '—') {
  if (v === null || v === undefined || v === '') return fallback
  return String(v)
}
function safeDate(value, prefix = '') {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return ''
    return `${prefix}${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
  } catch {
    return ''
  }
}
/** Normalise un livreur (compatible snake_case Supabase + camelCase mock). */
function normalizeDriver(d) {
  const o = d ?? {}
  return {
    id:           o.id ?? Math.random().toString(36).slice(2),
    name:         o.name ?? '',
    phone:        o.phone ?? '',
    city:         o.city ?? '',
    bikeModel:    o.bike_model  ?? o.bikeModel  ?? '',
    bikeColor:    o.bike_color  ?? o.bikeColor  ?? '',
    rating:       o.rating ?? null,
    totalTrips:   o.total_trips ?? o.totalTrips ?? 0,
    status:       o.validation_status ?? 'pending',
    submittedAt:  o.created_at ?? o.submitted_at ?? null,
    rejectionReason: o.rejection_reason ?? o.rejectionReason ?? null,
    profilePhoto:  o.profile_photo_url   ?? o.profilePhoto  ?? null,
    fullBodyPhoto: o.full_body_photo_url ?? o.fullBodyPhoto ?? null,
    cinPhoto:      o.cin_photo_url        ?? o.cinPhoto      ?? null,
    bikePhoto:     o.bike_photo_url       ?? o.bikePhoto     ?? null,
  }
}

const STATUS_CONFIG = {
  pending:   { color: 'bg-yellow-100 text-yellow-700', icon: Clock,         label: 'En attente' },
  approved:  { color: 'bg-green-100 text-green-700',   icon: CheckCircle2,  label: 'Approuvé' },
  rejected:  { color: 'bg-red-100 text-red-700',       icon: XCircle,       label: 'Rejeté' },
  suspended: { color: 'bg-gray-100 text-gray-600',     icon: AlertTriangle, label: 'Suspendu' },
}
const FALLBACK_CFG = { color: 'bg-gray-100 text-gray-500', icon: AlertTriangle, label: '—' }

// ── Visionneuse documents ─────────────────────────────────────
function DocsViewer({ driver, onClose }) {
  const d = driver ?? {}
  const docs = [
    { label: 'Selfie visage',  src: d.profilePhoto,  placeholder: '👤' },
    { label: 'Photo en pied',  src: d.fullBodyPhoto, placeholder: '🧍' },
    { label: 'Carte CIN',      src: d.cinPhoto,      placeholder: '🪪' },
    { label: 'Moto (couleur)', src: d.bikePhoto,     placeholder: '🏍️' },
  ]
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl px-5 pt-3 pb-8 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Documents — {str(d.name)}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm font-medium">Fermer</button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {docs.map(({ label, src, placeholder }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
              {src ? (
                <img src={src} alt={label} className="w-full rounded-2xl object-cover max-h-48 border border-gray-100" />
              ) : (
                <div className="bg-gray-100 rounded-2xl h-36 flex flex-col items-center justify-center gap-2 border border-dashed border-gray-300">
                  <span className="text-3xl">{placeholder}</span>
                  <p className="text-xs text-gray-400">Photo non disponible</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 card bg-gray-50">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-400">Moto</p><p className="font-medium">{str(d.bikeModel)}</p></div>
            <div><p className="text-xs text-gray-400">Couleur</p><p className="font-medium">{str(d.bikeColor)}</p></div>
            <div><p className="text-xs text-gray-400">Ville</p><p className="font-medium">{str(d.city)}</p></div>
            <div><p className="text-xs text-gray-400">Téléphone</p><p className="font-medium text-xs">{str(d.phone)}</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal de rejet ────────────────────────────────────────────
function RejectModal({ driver, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-5">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-slide-up shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-100 rounded-2xl p-2.5"><ShieldX size={20} className="text-red-500" /></div>
          <div>
            <h3 className="font-bold text-gray-900">Rejeter la candidature</h3>
            <p className="text-xs text-gray-500">{str(driver?.name)}</p>
          </div>
        </div>
        <textarea
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Motif de rejet (ex: documents illisibles...)"
          className="input-field resize-none text-sm mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary text-sm py-2.5">Annuler</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-2xl text-sm active:scale-95 transition disabled:opacity-40"
          >
            Rejeter
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────
export default function AdminValidation({ t: tProp, onBack, isAdminPanel = false }) {
  const t = makeT(tProp)
  const auth = useAdminAuth()
  const adminId = auth?.admin?.id ?? null

  const [drivers,    setDrivers]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab,        setTab]        = useState('pending')
  const [viewingDocs, setViewingDocs]   = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [toast,      setToast]      = useState(null)

  async function load() {
    const raw = await getAllDrivers()          // jamais d'exception → []
    const list = Array.isArray(raw) ? raw.map(normalizeDriver) : []
    setDrivers(list)
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

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Actions (optimistes + Supabase, jamais de crash) ─────────
  async function approve(id) {
    setDrivers(ds => ds.map(d => d.id === id ? { ...d, status: 'approved', rejectionReason: null } : d))
    showToast(t('driverApproved'))
    try { await approveDriver(id, adminId) } catch (e) { console.error('[approve]', e) }
  }
  async function reject(id, reason) {
    setDrivers(ds => ds.map(d => d.id === id ? { ...d, status: 'rejected', rejectionReason: reason } : d))
    setRejectTarget(null)
    showToast(t('driverRejected'), 'error')
    try { await rejectDriver(id, adminId, reason) } catch (e) { console.error('[reject]', e) }
  }
  async function suspend(id) {
    setDrivers(ds => ds.map(d => d.id === id ? { ...d, status: 'suspended' } : d))
    showToast('Livreur suspendu', 'error')
    try { await suspendDriver(id, adminId, 'Suspension manuelle admin') } catch (e) { console.error('[suspend]', e) }
  }

  // ── Données sécurisées ───────────────────────────────────────
  const list = Array.isArray(drivers) ? drivers : []
  const countBy = (pred) => list.filter(pred).length

  const tabs = [
    { key: 'pending',  label: t('pendingDrivers'),  count: countBy(d => d.status === 'pending') },
    { key: 'approved', label: t('approvedDrivers'), count: countBy(d => d.status === 'approved') },
    { key: 'rejected', label: t('rejectedDrivers'), count: countBy(d => ['rejected','suspended'].includes(d.status)) },
  ]
  const filtered = list.filter(d =>
    tab === 'pending'  ? d.status === 'pending' :
    tab === 'approved' ? d.status === 'approved' :
    ['rejected', 'suspended'].includes(d.status)
  )

  return (
    <div className={`${isAdminPanel ? '' : 'min-h-screen bg-gray-50'} pb-10 animate-fade-in`}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white animate-slide-up
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {str(toast.msg, '')}
        </div>
      )}

      {/* Modals */}
      {viewingDocs && <DocsViewer driver={viewingDocs} onClose={() => setViewingDocs(null)} />}
      {rejectTarget && (
        <RejectModal
          driver={rejectTarget}
          onConfirm={(reason) => reject(rejectTarget.id, reason)}
          onClose={() => setRejectTarget(null)}
        />
      )}

      {/* Header mobile (hors panel admin) */}
      {!isAdminPanel && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white px-5 pt-12 pb-6">
          <button onClick={onBack} className="text-gray-400 text-sm mb-4 flex items-center gap-1">← {t('back')}</button>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-500 rounded-2xl p-2.5"><ShieldCheck size={22} className="text-white" /></div>
            <div>
              <h1 className="font-extrabold text-xl">{t('adminTitle')}</h1>
              <p className="text-gray-400 text-xs">{t('adminSub')}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            {[
              { label: 'En attente', value: countBy(d => d.status === 'pending'),   color: 'text-yellow-400' },
              { label: 'Approuvés',  value: countBy(d => d.status === 'approved'),  color: 'text-green-400' },
              { label: 'Suspendus',  value: countBy(d => d.status === 'suspended'), color: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="flex-1 bg-white/10 rounded-xl p-3 text-center">
                <p className={`font-extrabold text-2xl ${s.color}`}>{s.value ?? 0}</p>
                <p className="text-gray-400 text-[10px] font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Titre panel admin */}
      {isAdminPanel && (
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-white font-extrabold text-2xl">Livreurs</h1>
            <p className="text-gray-400 text-sm mt-1">Validation des candidatures</p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      )}

      {/* Onglets */}
      <div className="flex px-4 pt-4 gap-2 overflow-x-auto pb-1">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition
              ${tab === key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {label}
            {(count ?? 0) > 0 && (
              <span className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center
                ${tab === key ? 'bg-white text-gray-900' : 'bg-gray-100'}`}>
                {count ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="px-4 pt-3 flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => <div key={i} className="card h-32 animate-pulse bg-gray-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">
            <ShieldCheck size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('noPendingDrivers')}</p>
          </div>
        ) : (
          filtered.map(driver => {
            const d   = driver ?? {}
            const cfg = STATUS_CONFIG[d.status] ?? FALLBACK_CFG
            const StatusIcon = cfg.icon ?? AlertTriangle
            const dateStr = safeDate(d.submittedAt)
            return (
              <div key={d.id} className="card animate-fade-in">
                {/* En-tête livreur */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {d.profilePhoto
                      ? <img src={d.profilePhoto} alt={str(d.name, '')} className="w-full h-full object-cover" />
                      : <User size={24} className="text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900">{str(d.name, 'Sans nom')}</p>
                      {d.status === 'approved' && <VerifiedBadge size="sm" />}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Phone size={11} /> {str(d.phone)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Bike size={11} /> {str(d.bikeModel)} · {str(d.bikeColor)}
                    </div>
                    {d.rating != null && (
                      <p className="text-xs text-yellow-600 font-semibold">★ {d.rating ?? 0} · {d.totalTrips ?? 0} courses</p>
                    )}
                  </div>
                  <span className={`status-badge ${cfg.color} shrink-0`}>
                    <StatusIcon size={11} />
                    {cfg.label}
                  </span>
                </div>

                {/* Date de soumission */}
                {dateStr && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-3">
                    <Calendar size={11} />
                    {t('submittedOn')} {dateStr}
                  </div>
                )}

                {/* Motif de rejet */}
                {d.rejectionReason && (
                  <div className="bg-red-50 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
                    <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{str(d.rejectionReason, '')}</p>
                  </div>
                )}

                {/* Avertissement suspendu */}
                {d.status === 'suspended' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
                    <AlertTriangle size={13} className="text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700 font-medium">{t('suspendedWarning')}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setViewingDocs(d)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-semibold border border-gray-200 active:scale-95 transition"
                  >
                    <Eye size={13} /> {t('viewDocs')}
                  </button>

                  {d.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setRejectTarget(d)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-semibold active:scale-95 transition"
                      >
                        <ShieldX size={13} /> {t('reject')}
                      </button>
                      <button
                        onClick={() => approve(d.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold active:scale-95 transition ml-auto"
                      >
                        <ShieldCheck size={13} /> {t('approve')}
                      </button>
                    </>
                  )}

                  {d.status === 'approved' && (
                    <button
                      onClick={() => suspend(d.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-semibold active:scale-95 transition ml-auto"
                    >
                      <AlertTriangle size={13} /> Suspendre
                    </button>
                  )}

                  {['rejected','suspended'].includes(d.status) && (
                    <button
                      onClick={() => approve(d.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold active:scale-95 transition ml-auto"
                    >
                      <ShieldCheck size={13} /> Réactiver
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
