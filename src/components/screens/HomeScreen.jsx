import { Package, MapPin, Bike, ChevronRight, Clock, Star } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'

const MOCK_ORDERS = [
  { id: 1, tracking_code: 'MDL-2847', status: 'ontheway', pickup: 'Analakely', delivery: 'Ambohimanarina', eta: 12 },
  { id: 2, tracking_code: 'MDL-2801', status: 'accepted',  pickup: 'Behoririka',  delivery: 'Isotry',          eta: 25 },
]

export default function HomeScreen({ t, onNavigate }) {
  return (
    <div className="pb-24 animate-fade-in">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 text-white px-5 pt-6 pb-10 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-2 top-16 w-24 h-24 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-white rounded-xl p-1.5">
              <Bike size={20} className="text-brand-500" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">MadaLiv</span>
          </div>
          <h2 className="text-2xl font-extrabold leading-tight whitespace-pre-line mb-2">
            {t('heroTitle')}
          </h2>
          <p className="text-white/80 text-sm mb-6 leading-relaxed">{t('heroSub')}</p>
          <button
            onClick={() => onNavigate('order')}
            className="bg-white text-brand-600 font-bold px-5 py-3 rounded-2xl text-sm flex items-center gap-2 shadow-lg active:scale-95 transition"
          >
            <Package size={16} />
            {t('orderNow')}
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 -mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('order')}
          className="card flex flex-col items-start gap-2 active:scale-95 transition"
        >
          <div className="bg-brand-50 rounded-xl p-2.5">
            <Package size={20} className="text-brand-500" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{t('order')}</p>
            <p className="text-xs text-gray-400">{t('step1Desc').slice(0, 28)}…</p>
          </div>
        </button>
        <button
          onClick={() => onNavigate('track')}
          className="card flex flex-col items-start gap-2 active:scale-95 transition"
        >
          <div className="bg-green-50 rounded-xl p-2.5">
            <MapPin size={20} className="text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{t('track')}</p>
            <p className="text-xs text-gray-400">{t('trackTitle').slice(0, 28)}…</p>
          </div>
        </button>
      </div>

      {/* Active orders */}
      <div className="px-4 mt-6">
        <h3 className="font-bold text-sm text-gray-700 mb-3">{t('activeOrders')}</h3>
        {MOCK_ORDERS.length === 0 ? (
          <div className="card text-center py-8 text-gray-400 text-sm">{t('noActiveOrders')}</div>
        ) : (
          <div className="flex flex-col gap-3">
            {MOCK_ORDERS.map((order) => (
              <button
                key={order.id}
                onClick={() => onNavigate('track')}
                className="card flex items-center gap-3 text-left active:scale-[0.98] transition"
              >
                <div className="bg-brand-50 rounded-xl p-2.5 shrink-0">
                  <Bike size={20} className="text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-500">{order.tracking_code}</span>
                    <StatusBadge status={order.status} label={t(`status_${order.status}`)} />
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {order.pickup} → {order.delivery}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1 text-xs text-brand-500 font-semibold">
                    <Clock size={12} />
                    {order.eta} {t('minutes')}
                  </div>
                  <ChevronRight size={14} className="text-gray-300 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="px-4 mt-6">
        <h3 className="font-bold text-sm text-gray-700 mb-3">{t('howItWorks')}</h3>
        <div className="flex flex-col gap-0">
          {[
            { num: '1', title: t('step1Title'), desc: t('step1Desc'), color: 'bg-brand-500' },
            { num: '2', title: t('step2Title'), desc: t('step2Desc'), color: 'bg-blue-500' },
            { num: '3', title: t('step3Title'), desc: t('step3Desc'), color: 'bg-green-500' },
          ].map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`${step.color} text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0`}>
                  {step.num}
                </div>
                {i < 2 && <div className="w-0.5 h-8 bg-gray-100 my-1" />}
              </div>
              <div className="pb-4 pt-0.5">
                <p className="font-semibold text-sm text-gray-800">{step.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Promo banner */}
      <div className="px-4 mt-2">
        <div className="bg-gradient-to-r from-mada-green to-green-600 rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2">
            <Star size={18} className="text-white" />
          </div>
          <div className="text-white">
            <p className="font-bold text-sm">Première livraison offerte !</p>
            <p className="text-xs text-white/80">Utilisez le code: MADA1</p>
          </div>
        </div>
      </div>
    </div>
  )
}
