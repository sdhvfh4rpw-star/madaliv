import { useState } from 'react'
import { ShieldCheck, ShieldX, Eye, Clock, CheckCircle2, XCircle, AlertTriangle, User, Bike, Phone, Calendar } from 'lucide-react'
import VerifiedBadge from '../ui/VerifiedBadge'

const MOCK_DRIVERS = [
  {
    id: 'd1',
    name: 'Rivo Rakotondrabe',
    phone: '+261 34 56 789 01',
    city: 'Antananarivo',
    bikeModel: 'Honda CG 125',
    bikeColor: 'Rouge',
    rating: null,
    total_trips: 0,
    validation_status: 'pending',
    submitted_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    profilePhoto: null, fullBodyPhoto: null, cinPhoto: null, bikePhoto: null,
  },
  {
    id: 'd2',
    name: 'Lalaina Andriamanga',
    phone: '+261 33 11 222 33',
    city: 'Toamasina',
    bikeModel: 'Yamaha FZ 150',
    bikeColor: 'Bleu',
    rating: null,
    total_trips: 0,
    validation_status: 'pending',
    submitted_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    profilePhoto: null, fullBodyPhoto: null, cinPhoto: null, bikePhoto: null,
  },
  {
    id: 'd3',
    name: 'Faniry Rakoto',
    phone: '+261 34 12 345 67',
    city: 'Antananarivo',
    bikeModel: 'Honda CG 125',
    bikeColor: 'Noir',
    rating: 4.8,
    total_trips: 342,
    validation_status: 'approved',
    submitted_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    profilePhoto: null, fullBodyPhoto: null, cinPhoto: null, bikePhoto: null,
  },
]

const STATUS_CONFIG = {
  pending:   { color: 'bg-yellow-100 text-yellow-700', icon: Clock,        label: 'En attente' },
  approved:  { color: 'bg-green-100 text-green-700',   icon: CheckCircle2, label: 'Approuvé' },
  rejected:  { color: 'bg-red-100 text-red-700',       icon: XCircle,      label: 'Rejeté' },
  suspended: { color: 'bg-gray-100 text-gray-600',     icon: AlertTriangle, label: 'Suspendu' },
}

function DocsViewer({ driver, onClose }) {
  const docs = [
    { label: 'Selfie visage',    src: driver.profilePhoto,  placeholder: '👤' },
    { label: 'Photo en pied',    src: driver.fullBodyPhoto, placeholder: '🧍' },
    { label: 'Carte CIN',        src: driver.cinPhoto,      placeholder: '🪪' },
    { label: 'Moto (couleur)',   src: driver.bikePhoto,     placeholder: '🏍️' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl px-5 pt-3 pb-8 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Documents — {driver.name}</h3>
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
                  <p className="text-xs text-gray-400">Photo non disponible (démo)</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Driver details */}
        <div className="mt-4 card bg-gray-50">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-400">Moto</p><p className="font-medium">{driver.bikeModel}</p></div>
            <div><p className="text-xs text-gray-400">Couleur</p><p className="font-medium">{driver.bikeColor}</p></div>
            <div><p className="text-xs text-gray-400">Ville</p><p className="font-medium">{driver.city}</p></div>
            <div><p className="text-xs text-gray-400">Téléphone</p><p className="font-medium text-xs">{driver.phone}</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RejectModal({ driver, onConfirm, onClose }) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-5">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-slide-up shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-100 rounded-2xl p-2.5">
            <ShieldX size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Rejeter la candidature</h3>
            <p className="text-xs text-gray-500">{driver.name}</p>
          </div>
        </div>

        <textarea
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Motif de rejet (ex: documents illisibles, plaque non visible...)"
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

export default function AdminValidation({ t, onBack, isAdminPanel = false }) {
  const [drivers, setDrivers]         = useState(MOCK_DRIVERS)
  const [tab, setTab]                 = useState('pending')
  const [viewingDocs, setViewingDocs] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [toast, setToast]             = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function approve(id) {
    setDrivers(ds => ds.map(d => d.id === id ? { ...d, validation_status: 'approved' } : d))
    showToast(t('driverApproved'))
  }

  function reject(id, reason) {
    setDrivers(ds => ds.map(d => d.id === id ? { ...d, validation_status: 'rejected', rejection_reason: reason } : d))
    setRejectTarget(null)
    showToast(t('driverRejected'), 'error')
  }

  function suspend(id) {
    setDrivers(ds => ds.map(d => d.id === id ? { ...d, validation_status: 'suspended' } : d))
    showToast('Livreur suspendu', 'error')
  }

  const tabs = [
    { key: 'pending',  label: t('pendingDrivers'),  count: drivers.filter(d => d.validation_status === 'pending').length },
    { key: 'approved', label: t('approvedDrivers'), count: drivers.filter(d => d.validation_status === 'approved').length },
    { key: 'rejected', label: t('rejectedDrivers'), count: drivers.filter(d => ['rejected','suspended'].includes(d.validation_status)).length },
  ]

  const filtered = drivers.filter(d =>
    tab === 'pending'  ? d.validation_status === 'pending' :
    tab === 'approved' ? d.validation_status === 'approved' :
    ['rejected', 'suspended'].includes(d.validation_status)
  )

  return (
    <div className={`${isAdminPanel ? '' : 'min-h-screen bg-gray-50'} pb-10 animate-fade-in`}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white animate-slide-up
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.msg}
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

      {/* Header — masqué si intégré dans le panel admin */}
      {!isAdminPanel && <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white px-5 pt-12 pb-6">
        <button onClick={onBack} className="text-gray-400 text-sm mb-4 flex items-center gap-1">
          ← {t('back')}
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-500 rounded-2xl p-2.5">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl">{t('adminTitle')}</h1>
            <p className="text-gray-400 text-xs">{t('adminSub')}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mt-5">
          {[
            { label: 'En attente', value: drivers.filter(d => d.validation_status === 'pending').length, color: 'text-yellow-400' },
            { label: 'Approuvés',  value: drivers.filter(d => d.validation_status === 'approved').length, color: 'text-green-400' },
            { label: 'Suspendus',  value: drivers.filter(d => d.validation_status === 'suspended').length, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="flex-1 bg-white/10 rounded-xl p-3 text-center">
              <p className={`font-extrabold text-2xl ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-[10px] font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>}

      {/* Panel admin title */}
      {isAdminPanel && (
        <div className="mb-4">
          <h1 className="text-white font-extrabold text-2xl">Livreurs</h1>
          <p className="text-gray-400 text-sm mt-1">Validation des candidatures</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-4 pt-4 gap-2 overflow-x-auto pb-1">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition
              ${tab === key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {label}
            {count > 0 && (
              <span className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center
                ${tab === key ? 'bg-white text-gray-900' : 'bg-gray-100'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Driver list */}
      <div className="px-4 pt-3 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">
            <ShieldCheck size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('noPendingDrivers')}</p>
          </div>
        ) : (
          filtered.map(driver => {
            const cfg = STATUS_CONFIG[driver.validation_status]
            const StatusIcon = cfg.icon
            return (
              <div key={driver.id} className="card animate-fade-in">
                {/* Driver header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {driver.profilePhoto
                      ? <img src={driver.profilePhoto} alt={driver.name} className="w-full h-full object-cover" />
                      : <User size={24} className="text-gray-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900">{driver.name}</p>
                      {driver.validation_status === 'approved' && <VerifiedBadge size="sm" />}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Phone size={11} /> {driver.phone}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Bike size={11} /> {driver.bikeModel} · {driver.bikeColor}
                    </div>
                    {driver.rating && (
                      <p className="text-xs text-yellow-600 font-semibold">★ {driver.rating} · {driver.total_trips} courses</p>
                    )}
                  </div>
                  <span className={`status-badge ${cfg.color} shrink-0`}>
                    <StatusIcon size={11} />
                    {cfg.label}
                  </span>
                </div>

                {/* Submitted date */}
                <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-3">
                  <Calendar size={11} />
                  {t('submittedOn')} {new Date(driver.submitted_at).toLocaleDateString('fr-MG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Rejection reason */}
                {driver.rejection_reason && (
                  <div className="bg-red-50 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
                    <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{driver.rejection_reason}</p>
                  </div>
                )}

                {/* Suspended warning */}
                {driver.validation_status === 'suspended' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
                    <AlertTriangle size={13} className="text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-700 font-medium">{t('suspendedWarning')}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setViewingDocs(driver)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-semibold border border-gray-200 active:scale-95 transition"
                  >
                    <Eye size={13} /> {t('viewDocs')}
                  </button>

                  {driver.validation_status === 'pending' && (
                    <>
                      <button
                        onClick={() => setRejectTarget(driver)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-semibold active:scale-95 transition"
                      >
                        <ShieldX size={13} /> {t('reject')}
                      </button>
                      <button
                        onClick={() => approve(driver.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold active:scale-95 transition ml-auto"
                      >
                        <ShieldCheck size={13} /> {t('approve')}
                      </button>
                    </>
                  )}

                  {driver.validation_status === 'approved' && (
                    <button
                      onClick={() => suspend(driver.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-semibold active:scale-95 transition ml-auto"
                    >
                      <AlertTriangle size={13} /> Suspendre
                    </button>
                  )}

                  {driver.validation_status === 'rejected' && (
                    <button
                      onClick={() => approve(driver.id)}
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
