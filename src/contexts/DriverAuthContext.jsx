/**
 * DriverAuthContext — FAINGANA
 * Gère la session du livreur (distincte du client et de l'admin).
 *
 * La session Supabase est partagée entre client / livreur / admin :
 * on ne réagit donc QU'aux sessions dont l'email appartient à
 * l'espace livreur (isDriverEmail). Une session client ou admin
 * laisse l'état livreur vide → aucune contamination croisée.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  signInDriver,
  signOutDriver,
  getDriverByUserId,
  isDriverEmail,
} from '../lib/driverAuth'

const DriverAuthContext = createContext(null)

export function DriverAuthProvider({ children }) {
  const [user,    setUser]    = useState(null)   // Supabase auth user (livreur)
  const [driver,  setDriver]  = useState(null)   // Ligne dans la table drivers
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    // Session existante au chargement
    supabase.auth.getSession()
      .then(async ({ data }) => {
        const u = data?.session?.user ?? null
        if (alive && u && isDriverEmail(u.email)) {
          setUser(u)
          setDriver(await getDriverByUserId(u.id))
        }
      })
      .catch((e) => console.error('[DriverAuth] getSession:', e))
      .finally(() => { if (alive) setLoading(false) })

    // Changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      try {
        if (u && isDriverEmail(u.email)) {
          setUser(u)
          setDriver(await getDriverByUserId(u.id))
        } else {
          // Session client / admin / déconnexion → on vide l'état livreur
          setUser(null)
          setDriver(null)
        }
      } catch (e) {
        console.error('[DriverAuth] onAuthStateChange:', e)
        setUser(null)
        setDriver(null)
      } finally {
        if (alive) setLoading(false)
      }
    })

    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  const login = useCallback(async (params) => {
    const result = await signInDriver(params)   // { user, driver }
    setUser(result.user)
    setDriver(result.driver)
    return result
  }, [])

  const logout = useCallback(async () => {
    try { await signOutDriver() } catch (e) { console.error('[DriverAuth] logout:', e) }
    setUser(null)
    setDriver(null)
  }, [])

  const refresh = useCallback(async () => {
    if (!user) return
    setDriver(await getDriverByUserId(user.id))
  }, [user])

  const isLoggedIn = !!user

  return (
    <DriverAuthContext.Provider value={{
      user, driver, loading, isLoggedIn,
      login, logout, refresh,
    }}>
      {children}
    </DriverAuthContext.Provider>
  )
}

export function useDriverAuth() {
  const ctx = useContext(DriverAuthContext)
  if (!ctx) throw new Error('useDriverAuth doit être dans <DriverAuthProvider>')
  return ctx
}
