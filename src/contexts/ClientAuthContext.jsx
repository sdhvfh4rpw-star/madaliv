/**
 * ClientAuthContext — MadaLiv
 * Gère la session du client (distinct de l'admin).
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { signUpClient, signInClient, signOutClient, getClientProfile } from '../lib/clientAuth'

const ClientAuthContext = createContext(null)

export function ClientAuthProvider({ children }) {
  const [user,    setUser]    = useState(null)   // Supabase auth user
  const [client,  setClient]  = useState(null)   // Profil dans la table clients
  const [loading, setLoading] = useState(true)

  // Vérifier la session existante au chargement
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        const profile = await getClientProfile(session.user.id)
        setClient(profile)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        const profile = await getClientProfile(session.user.id)
        setClient(profile)
      } else {
        setUser(null)
        setClient(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const register = useCallback(async (params) => {
    const result = await signUpClient(params)
    setUser(result.user)
    setClient(result.client)
    return result
  }, [])

  const login = useCallback(async (params) => {
    const result = await signInClient(params)
    setUser(result.user)
    setClient(result.client)
    return result
  }, [])

  const logout = useCallback(async () => {
    await signOutClient()
    setUser(null)
    setClient(null)
  }, [])

  // Rafraîchir le profil (après upload avatar, etc.)
  const refreshProfile = useCallback(async () => {
    if (!user) return
    const profile = await getClientProfile(user.id)
    setClient(profile)
  }, [user])

  const isLoggedIn = !!user
  const isMerchant = !!client?.is_merchant   // raccourci commerçant

  return (
    <ClientAuthContext.Provider value={{
      user, client, loading, isLoggedIn, isMerchant,
      register, login, logout, refreshProfile,
    }}>
      {children}
    </ClientAuthContext.Provider>
  )
}

export function useClientAuth() {
  const ctx = useContext(ClientAuthContext)
  if (!ctx) throw new Error('useClientAuth doit être dans <ClientAuthProvider>')
  return ctx
}
