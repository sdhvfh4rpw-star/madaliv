/**
 * AdminAuthContext
 * ─────────────────────────────────────────────────────────────
 * Gère la session de l'administrateur MadaLiv.
 *
 * Sécurité :
 *  - Vérifie app_metadata.role === 'admin' dans le JWT Supabase
 *    (le rôle est assigné côté SQL, pas via le formulaire)
 *  - Rate-limiting côté client : 5 tentatives → lockout 15 min
 *  - onAuthStateChange écoute les révocations de session
 *  - signOut révoque la session serveur + vide le state local
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── Constantes de sécurité ───────────────────────────────────
const MAX_ATTEMPTS    = 5
const LOCKOUT_MS      = 15 * 60 * 1000   // 15 minutes
const STORAGE_KEY     = 'madaliv_admin_attempts'

const AdminAuthContext = createContext(null)

// ── Helpers rate-limit (localStorage) ───────────────────────
function getRateData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}
function saveRateData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
function isLockedOut() {
  const { count, lockedUntil } = getRateData()
  if (!lockedUntil) return false
  if (Date.now() < lockedUntil) return { remaining: Math.ceil((lockedUntil - Date.now()) / 1000) }
  // lockout expiré → reset
  saveRateData({})
  return false
}
function recordFailedAttempt() {
  const data = getRateData()
  const count = (data.count || 0) + 1
  const lockedUntil = count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : data.lockedUntil
  saveRateData({ count, lockedUntil })
  return count
}
function resetAttempts() { saveRateData({}) }

// ── Vérification rôle admin dans le JWT ─────────────────────
function isAdminUser(session) {
  if (!session?.user) return false
  const meta = session.user.app_metadata || {}
  return meta.role === 'admin'
}

// ── Provider ─────────────────────────────────────────────────
export function AdminAuthProvider({ children }) {
  const [admin,   setAdmin]   = useState(null)   // user Supabase ou null
  const [loading, setLoading] = useState(true)   // vrai pendant la vérif initiale
  const [error,   setError]   = useState(null)

  // Vérification initiale de la session existante
  useEffect(() => {
    // ── getSession ───────────────────────────────────────
    supabase.auth.getSession()
      .then(({ data, error: sessionErr }) => {
        if (sessionErr) {
          console.warn('[AdminAuth] getSession error:', sessionErr.message)
          setLoading(false)
          return
        }
        const session = data?.session ?? null
        setAdmin(isAdminUser(session) ? session.user : null)
        setLoading(false)
      })
      .catch((err) => {
        console.error('[AdminAuth] getSession threw:', err?.message)
        setLoading(false)
      })

    // ── onAuthStateChange ────────────────────────────────
    let subscription = null
    try {
      const result = supabase.auth.onAuthStateChange((_event, session) => {
        setAdmin(isAdminUser(session) ? session.user : null)
        setLoading(false)
      })
      // Supabase v2 retourne { data: { subscription } }
      subscription = result?.data?.subscription ?? result?.subscription ?? null
    } catch (err) {
      console.error('[AdminAuth] onAuthStateChange threw:', err?.message)
    }

    return () => {
      try { subscription?.unsubscribe?.() } catch { /* ignore */ }
    }
  }, [])

  // ── Connexion ─────────────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    // Guards sur les arguments
    if (!email || typeof email !== 'string') {
      const msg = 'Email manquant.'
      setError(msg); return { error: msg }
    }
    if (!password || typeof password !== 'string') {
      const msg = 'Mot de passe manquant.'
      setError(msg); return { error: msg }
    }
    setError(null)

    // Vérifier lockout
    const lock = isLockedOut()
    if (lock) {
      const msg = `Trop de tentatives. Réessayez dans ${Math.ceil(lock.remaining / 60)} min ${lock.remaining % 60}s.`
      setError(msg)
      return { error: msg }
    }

    try {
      console.log('[AdminAuth] Tentative de connexion pour:', email)

      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password,
      })

      // ── Erreur Supabase Auth — message brut affiché ──────
      if (authErr) {
        // Log complet de l'objet d'erreur pour le debug
        console.error('[AdminAuth] ERREUR SUPABASE COMPLÈTE ↓')
        console.error(authErr)
        console.error('[AdminAuth] message :', authErr.message)
        console.error('[AdminAuth] status  :', authErr.status)
        console.error('[AdminAuth] code    :', authErr.code)
        console.error('[AdminAuth] name    :', authErr.name)

        // Comptabiliser la tentative échouée (rate-limiting)
        recordFailedAttempt()

        // Afficher le vrai message Supabase directement dans l'UI
        const msg = authErr.message || String(authErr) || 'Erreur inconnue de Supabase.'
        setError(msg)
        return { error: msg }
      }

      // ── Vérification que data est bien formé ────────────
      // Defensive : Supabase peut retourner data=null ou session=null
      // sans error dans certaines configurations cassées
      if (!data || !data.user || !data.session) {
        console.error('[AdminAuth] data inattendu après signIn:', data)
        const msg = `Réponse inattendue de Supabase. data=${JSON.stringify(data)}`
        setError(msg)
        return { error: msg }
      }

      console.log('[AdminAuth] Connexion réussie. app_metadata:', data.user.app_metadata)

      // ── Vérification du rôle admin ───────────────────────
      if (!isAdminUser(data.session)) {
        console.warn(
          '[AdminAuth] Rôle admin manquant.',
          '\n  app_metadata:', data.session?.user?.app_metadata,
          '\n  Solution: exécutez dans Supabase SQL Editor :',
          `\n  UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || \'{"role":"admin"}\'::jsonb WHERE email = '${email.trim()}';`
        )
        try { await supabase.auth.signOut() } catch { /* ignore */ }
        const msg = 'Connexion réussie mais le rôle "admin" est absent. Exécutez le SQL d\'initialisation (voir console).'
        setError(msg)
        return { error: msg }
      }

      resetAttempts()
      setAdmin(data.user)
      console.log('[AdminAuth] Admin connecté ✓')
      return { data }

    } catch (e) {
      console.error('[AdminAuth] EXCEPTION INATTENDUE ↓')
      console.error(e)
      // Extraire le message de manière défensive
      let msg = 'Exception inattendue.'
      try {
        if (typeof e === 'string') {
          msg = e
        } else if (e && typeof e.message === 'string' && e.message) {
          msg = e.message
        } else if (e) {
          msg = String(e)
        }
      } catch {
        msg = 'Erreur non sérialisable.'
      }
      setError(msg)
      return { error: msg }
    }
  }, [])

  // ── Déconnexion ───────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setAdmin(null)
    setError(null)
  }, [])

  return (
    <AdminAuthContext.Provider value={{ admin, loading, error, setError, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth doit être utilisé dans <AdminAuthProvider>')
  return ctx
}
