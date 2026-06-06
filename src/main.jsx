import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ClientAuthProvider } from './contexts/ClientAuthContext'
import { DriverAuthProvider } from './contexts/DriverAuthContext'
import { initSentry } from './lib/sentry'
import ErrorFallback from './components/ErrorFallback'
import App from './App'
import './index.css'

// Surveillance des erreurs — no-op si VITE_SENTRY_DSN est absente (dev local).
initSentry()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* ErrorBoundary Sentry : capture les erreurs de rendu React et
        affiche un écran de secours au lieu d'une page blanche.
        Fonctionne même si Sentry n'est pas initialisé (capture = no-op). */}
    <Sentry.ErrorBoundary fallback={(props) => <ErrorFallback {...props} />}>
      <BrowserRouter>
        <AdminAuthProvider>
          <NotificationProvider>
            <ClientAuthProvider>
              <DriverAuthProvider>
                <App />
              </DriverAuthProvider>
            </ClientAuthProvider>
          </NotificationProvider>
        </AdminAuthProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)
