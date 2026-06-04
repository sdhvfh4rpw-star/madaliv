import { Home, Package, MapPin, LayoutDashboard, UserCircle } from 'lucide-react'

const TABS = [
  { id: 'home',      icon: Home,            labelKey: 'home'      },
  { id: 'order',     icon: Package,         labelKey: 'order'     },
  { id: 'track',     icon: MapPin,          labelKey: 'track'     },
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { id: 'profile',   icon: UserCircle,      labelKey: 'profile'   },
]

export default function BottomNav({ current, onChange, t, isLoggedIn }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-50">
      <div className="flex">
        {TABS.map(({ id, icon: Icon, labelKey }) => {
          const active = current === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors relative
                ${active ? 'text-brand-500' : 'text-gray-400'}`}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{t(labelKey)}</span>
              {/* Badge point vert si connecté sur l'onglet profil */}
              {id === 'profile' && isLoggedIn && (
                <span className="absolute top-1.5 right-[calc(50%-10px)] w-2 h-2 rounded-full bg-green-500 border-2 border-white" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
