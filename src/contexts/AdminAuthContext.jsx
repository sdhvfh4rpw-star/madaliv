import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Vérifier la session existante au chargement
    supabase.auth.getSession()
      .then(({ data }) => {
        const user = data?.session?.user ?? null
        if (user?.app_metadata?.role === 'admin') {
          setAdmin(user)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Écouter UNIQUEMENT les déconnexions pour mettre à jour le state.
    // On n'écrase PAS admin sur SIGNED_IN — signIn() s'en charge directement.
    // Cela évite la race condition où onAuthStateChange remplace setAdmin(user)
    // par setAdmin(null) si le JWT n'a pas encore le role dans le callback.
    let subscription = null
    try {
      const result = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          setAdmin(null)
        }
        // TOKEN_REFRESHED : mettre à jour l'objet user sans risque
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          const user = session.user
          if (user.app_metadata?.role === 'admin') {
            setAdmin(user)
          }
        }
      })
      subscription = result?.data?.subscription ?? null
    } catch (err) {
      console.error('[AdminAuth] onAuthStateChange error:', err)
    }

    return () => {
      try { subscription?.unsubscribe?.() } catch { /* ignore */ }
    }
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const user = data?.user
    if (!user?.app_metadata?.role === 'admin' || user?.app_metadata?.role !== 'admin') {
      await supabase.auth.signOut().catch(() => {})
      throw new Error('Accès refusé : ce compte n\'a pas le rôle administrateur.')
    }
    setAdmin(user)
  }

  async function signOut() {
    await supabase.auth.signOut().catch(() => {})
    setAdmin(null)
  }

  return (
    <AdminAuthContext.Provider value={{ admin, loading, isAuthenticated: !!admin, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
