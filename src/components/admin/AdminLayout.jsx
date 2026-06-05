import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import {
  Bike, LayoutDashboard, Users, Package, BarChart2,
  LogOut, Menu, X, ShieldCheck, Bell, Settings, ChevronRight
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/admin',          label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/admin/drivers',  label: 'Livreurs',         icon: Users },
  { to: '/admin/orders',   label: 'Commandes',        icon: Package },
  { to: '/admin/stats',    label: 'Statistiques',     icon: BarChart2 },
  { to: '/admin/settings', label: 'Paramètres',       icon: Settings },
]

export default function AdminLayout() {
  const { admin, signOut } = useAdminAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut,  setLoggingOut]  = useState(false)

  async function handleSignOut() {
    setLoggingOut(true)
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  const adminEmail = admin?.email || 'admin@madaliv.mg'
  const adminInitial = adminEmail[0].toUpperCase()

  return (
    <div className="min-h-screen bg-gray-950 flex">

      {/* ── Sidebar desktop ─────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 border-r border-gray-800 min-h-screen sticky top-0">
        <SidebarContent
          adminEmail={adminEmail}
          adminInitial={adminInitial}
          loggingOut={loggingOut}
          onSignOut={handleSignOut}
          onNav={() => {}}
        />
      </aside>

      {/* ── Sidebar mobile (drawer) ──────────────────────── */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-full w-72 bg-gray-900 border-r border-gray-800 z-50 lg:hidden flex flex-col animate-slide-up">
            <SidebarContent
              adminEmail={adminEmail}
              adminInitial={adminInitial}
              loggingOut={loggingOut}
              onSignOut={handleSignOut}
              onNav={() => setSidebarOpen(false)}
            />
          </aside>
        </>
      )}

      {/* ── Main content ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="lg:hidden bg-gray-900 border-b border-gray-800 px-4 h-14 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="bg-brand-500 rounded-lg p-1.5">
              <Bike size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm">Faingana Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-white transition"
            >
              <Menu size={22} />
            </button>
          </div>
        </header>

        {/* Top bar desktop */}
        <header className="hidden lg:flex bg-gray-900 border-b border-gray-800 px-6 h-14 items-center justify-between sticky top-0 z-30">
          <div />
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-2.5 bg-gray-800 rounded-xl px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                {adminInitial}
              </div>
              <span className="text-gray-300 text-sm font-medium truncate max-w-[160px]">{adminEmail}</span>
              <ShieldCheck size={14} className="text-blue-400" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ── Sidebar partagée ─────────────────────────────────────────
function SidebarContent({ adminEmail, adminInitial, loggingOut, onSignOut, onNav }) {
  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500 rounded-xl p-2 shadow-lg shadow-brand-500/30">
            <Bike size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-extrabold text-base leading-tight">Faingana</p>
            <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest">Administration</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNav}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group
                 ${isActive
                   ? 'bg-brand-500/15 text-brand-400 border border-brand-500/25'
                   : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={14} className="text-brand-400/60" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Admin profile + logout */}
      <div className="px-3 pb-4 border-t border-gray-800 pt-4">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2 bg-gray-800 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {adminInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{adminEmail}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck size={10} className="text-blue-400" />
              <p className="text-blue-400 text-[10px] font-medium">Administrateur</p>
            </div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400
            hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          {loggingOut ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : <LogOut size={17} />}
          {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
        </button>
      </div>
    </>
  )
}

// ── Cloche notif (décorative pour l'instant) ─────────────────
function NotificationBell() {
  return (
    <button className="relative text-gray-400 hover:text-white transition p-1.5">
      <Bell size={18} />
      <span className="absolute top-1 right-1 w-2 h-2 bg-brand-500 rounded-full border-2 border-gray-900" />
    </button>
  )
}
