import { Routes, Route, Navigate } from 'react-router-dom'

// ── App client (PWA mobile) ──────────────────────────────────
import ClientApp from './ClientApp'

// ── Espace admin ─────────────────────────────────────────────
import AdminLogin           from './components/admin/AdminLogin'
import AdminLayout          from './components/admin/AdminLayout'
import AdminDashboard       from './components/admin/AdminDashboard'
import AdminOrders          from './components/admin/AdminOrders'
import AdminStats           from './components/admin/AdminStats'
import AdminSettings        from './components/admin/AdminSettings'
import AdminProtectedRoute  from './components/admin/AdminProtectedRoute'

// AdminValidation est réutilisé dans l'espace admin
import AdminValidation from './components/screens/AdminValidation'

export default function App() {
  return (
    <Routes>
      {/* ── App client PWA (/  et toutes les sous-routes) ── */}
      <Route path="/*" element={<ClientApp />} />

      {/* ── Espace admin (/admin/*) ─────────────────────── */}

      {/* Login — accessible sans auth */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Guard admin — AdminProtectedRoute rend <Outlet /> si authentifié */}
      <Route path="/admin" element={<AdminProtectedRoute />}>
        {/* AdminLayout enveloppe toutes les pages admin */}
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="drivers"  element={<AdminValidation isAdminPanel />} />
          <Route path="orders"   element={<AdminOrders />} />
          <Route path="stats"    element={<AdminStats />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>

      {/* Catch-all /admin/* → /admin */}
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
