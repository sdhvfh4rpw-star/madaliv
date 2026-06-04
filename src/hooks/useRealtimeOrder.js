/**
 * useRealtimeOrder
 * ─────────────────────────────────────────────────────────────
 * Charge une commande par code de suivi et écoute ses
 * mises à jour en temps réel via Supabase Realtime.
 *
 * Usage :
 *   const { order, loading, error, refetch } = useRealtimeOrder('MDL-1234')
 */

import { useState, useEffect, useCallback } from 'react'
import { getOrderByCode, subscribeToOrder } from '../lib/supabase'

export function useRealtimeOrder(trackingCode) {
  const [order,   setOrder]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const fetchOrder = useCallback(async (code) => {
    if (!code) return
    setLoading(true)
    setError(null)
    try {
      const data = await getOrderByCode(code)
      setOrder(data)
    } catch (e) {
      setError(e.message || 'Commande introuvable')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Chargement initial
  useEffect(() => {
    if (trackingCode) fetchOrder(trackingCode)
  }, [trackingCode, fetchOrder])

  // Realtime : écoute les UPDATE sur cette commande
  useEffect(() => {
    if (!order?.id) return

    const sub = subscribeToOrder(order.id, (updated) => {
      setOrder(prev => prev ? { ...prev, ...updated } : updated)
    })

    return () => { sub.unsubscribe() }
  }, [order?.id])

  return { order, loading, error, refetch: () => fetchOrder(trackingCode) }
}
