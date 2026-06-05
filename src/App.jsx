import { Routes, Route, Navigate } from 'react-router-dom'

// ── App client (PWA mobile) ──────────────────────────────────
import ClientApp from './ClientApp'

// ── Espace admin ─────────────────────────────────────────────
import AdminLogin           from './components/admin/AdminLogin'
import AdminDashboard       from './components/admin/AdminDashboard'
import AdminOrders          from './components/admin/AdminOrders'
import AdminStats           from './components/admin/AdminStats'
import AdminSettings        from './components/admin/AdminSettings'
import AdminProtectedRoute  from './components/admin/AdminProtectedRoute'
import AdminValidation      from './components/screens/AdminValidation'

export default function App() {
  return (
    <Routes>
      {/* ── Admin — déclaré avant /* pour éviter la capture par le catch-all ── */}

      <Route path="/admin/login" element={<AdminLogin />} />

      {/*
        AdminProtectedRoute inclut directement AdminLayout (qui rend <Outlet />).
        Structure à 2 niveaux seulement — évite les routes pathless imbriquées
        qui peuvent causer des problèmes de contexte Outlet en production.
      */}
      <Route path="/admin" element={<AdminProtectedRoute />}>
        <Route index element={<AdminDashboard />} />
        <Route path="drivers"  element={<AdminValidation isAdminPanel />} />
        <Route path="orders"   element={<AdminOrders />} />
        <Route path="stats"    element={<AdminStats />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* ── App client PWA — catch-all en dernier ── */}
      <Route path="/*" element={<ClientApp />} />
    </Routes>
  )
}
