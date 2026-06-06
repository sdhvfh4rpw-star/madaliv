import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ClientAuthProvider } from './contexts/ClientAuthContext'
import { DriverAuthProvider } from './contexts/DriverAuthContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
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
  </React.StrictMode>
)
