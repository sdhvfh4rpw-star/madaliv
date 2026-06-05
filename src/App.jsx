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
      {/* ── Espace admin — en premier pour éviter que /* ne les capture ── */}

      <Route path="/admin/login" element={<AdminLogin />} />

      <Route path="/admin" element={<AdminProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="drivers"  element={<AdminValidation isAdminPanel />} />
          <Route path="orders"   element={<AdminOrders />} />
          <Route path="stats"    element={<AdminStats />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>

      {/* ── App client PWA — catch-all en dernier ── */}
      <Route path="/*" element={<ClientApp />} />
    </Routes>
  )
}
