import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import { Bike } from 'lucide-react'

export default function AdminProtectedRoute() {
  const { admin, loading } = useAdminAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand-500 rounded-xl p-2">
            <Bike size={20} className="text-white" />
          </div>
          <span className="text-white font-extrabold text-xl tracking-tight">MadaLiv</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Vérification de la session…
        </div>
      </div>
    )
  }

  if (!admin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  // Utilise <Outlet /> directement — AdminLayout est déclaré dans App.jsx
  // comme enfant de cette route, donc <Outlet /> rend AdminLayout + ses enfants
  return <Outlet />
}
