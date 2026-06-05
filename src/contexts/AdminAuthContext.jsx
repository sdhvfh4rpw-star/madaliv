import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user ?? null
      const isAdmin = user?.app_metadata?.role === 'admin'
      setAdmin(isAdmin ? user : null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      const isAdmin = user?.app_metadata?.role === 'admin'
      setAdmin(isAdmin ? user : null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const isAdmin = data?.user?.app_metadata?.role === 'admin'
    if (!isAdmin) {
      await supabase.auth.signOut()
      throw new Error('Accès refusé : ce compte n\'a pas le rôle administrateur.')
    }
    setAdmin(data.user)
  }

  async function signOut() {
    await supabase.auth.signOut()
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
