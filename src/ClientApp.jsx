/**
 * ClientApp — Application mobile PWA pour les clients et livreurs.
 */
import { useState, useEffect } from 'react'
import { t } from './lib/t'
import { useNotifications } from './contexts/NotificationContext'
import { useClientAuth } from './contexts/ClientAuthContext'
import BottomNav from './components/ui/BottomNav'
import TopBar from './components/ui/TopBar'
import ToastContainer from './components/ui/ToastNotification'
import HomeScreen from './components/screens/HomeScreen'
import OrderScreen from './components/screens/OrderScreen'
import TrackingScreen from './components/screens/TrackingScreen'
import DriverDashboard from './components/screens/DriverDashboard'
import DriverRegistration from './components/screens/DriverRegistration'
import AuthScreen from './components/screens/AuthScreen'
import ProfileScreen from './components/screens/ProfileScreen'
import MerchantDashboard from './components/screens/MerchantDashboard'

const FULLSCREEN = ['driver-register', 'auth']

const SCREEN_TITLES = {
  home:              null,
  order:             'order',
  track:             'trackTitle',
  dashboard:         'driverDash',
  'driver-register': null,
  auth:              null,
  profile:           'profile',
  merchant:          'merchant',
}

export default function ClientApp() {
  const { toasts, dismissToast, askPermission } = useNotifications()
  const { isLoggedIn, client }                  = useClientAuth()
  const [screen, setScreen] = useState('home')

  const titleKey     = SCREEN_TITLES[screen]
  const isFullscreen = FULLSCREEN.includes(screen)

  // Demande permission notification avec délai
  useEffect(() => {
    const timer = setTimeout(async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        await askPermission()
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [askPermission])

  // Si l'utilisateur clique "Profil" sans être connecté → ouvrir auth
  function handleNavChange(id) {
    if (id === 'profile' && !isLoggedIn) {
      setScreen('auth')
    } else {
      setScreen(id)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {/* Notifications in-app */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* TopBar standard */}
      {screen !== 'home' && !isFullscreen && (
        <TopBar
          title={titleKey ? t(titleKey) : ''}
          onBack={() => setScreen('home')}
        >
          {/* Prénom client dans la topbar si connecté */}
          {isLoggedIn && client && screen !== 'profile' && (
            <button
              onClick={() => setScreen('profile')}
              className="flex items-center gap-1.5 bg-brand-50 text-brand-600 text-xs font-semibold px-2.5 py-1 rounded-full"
            >
              {client.avatar_url ? (
                <img src={client.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-brand-200 flex items-center justify-center text-[10px] font-bold">
                  {client.name?.[0]?.toUpperCase() ?? '?'}
                </span>
              )}
              {client.name?.split(' ')[0]}
            </button>
          )}
        </TopBar>
      )}

      {/* Avatar client sur home (si connecté) */}
      {screen === 'home' && isLoggedIn && client && (
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-end px-4 pt-3">
          <button
            onClick={() => setScreen('profile')}
            className="flex items-center gap-1.5 bg-white/20 backdrop-blur text-white text-xs font-semibold px-2.5 py-1 rounded-full border border-white/30"
          >
            {client.avatar_url ? (
              <img src={client.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <span className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-bold">
                {client.name?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
            {client.name?.split(' ')[0]}
          </button>
        </div>
      )}

      {/* Contenu principal */}
      <main className="overflow-y-auto h-screen">
        {screen === 'home'            && <HomeScreen       t={t} onNavigate={handleNavChange} />}
        {screen === 'order'           && <OrderScreen      t={t} />}
        {screen === 'track'           && <TrackingScreen   t={t} />}
        {screen === 'dashboard'       && <DriverDashboard  t={t} />}
        {screen === 'driver-register' && <DriverRegistration t={t} onBack={() => setScreen('home')} />}
        {screen === 'auth'            && (
          <AuthScreen
            onBack={() => setScreen('home')}
            defaultTab="login"
          />
        )}
        {screen === 'profile'         && (
          isLoggedIn
            ? <ProfileScreen t={t} onNavigate={handleNavChange} />
            : <AuthScreen onBack={() => setScreen('home')} />
        )}
        {screen === 'merchant'        && (
          isLoggedIn && client?.is_merchant
            ? <MerchantDashboard t={t} onNavigate={handleNavChange} />
            : isLoggedIn
              ? <ProfileScreen t={t} onNavigate={handleNavChange} />
              : <AuthScreen onBack={() => setScreen('home')} />
        )}
      </main>

      {!isFullscreen && (
        <BottomNav
          current={screen === 'auth' || screen === 'merchant' ? 'profile' : screen}
          onChange={handleNavChange}
          t={t}
          isLoggedIn={isLoggedIn}
        />
      )}

      {/* Raccourci dev : inscription livreur */}
      {screen === 'home' && (
        <button
          onClick={() => setScreen('driver-register')}
          className="fixed bottom-24 right-4 bg-gray-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-lg opacity-60 hover:opacity-100 transition z-40"
        >
          + Livreur
        </button>
      )}
    </div>
  )
}
