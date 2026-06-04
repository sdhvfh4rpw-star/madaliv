/**
 * usePricing — hook React
 * ─────────────────────────────────────────────────────────────
 * Écoute les changements d'adresses + options, débounce 700ms,
 * géocode via Nominatim (avec fallback local) et retourne le
 * tarif calculé en temps réel.
 *
 * Usage :
 *   const { pricing, loading, error } = usePricing(pickup, delivery, { urgent, heavy })
 */

import { useState, useEffect, useRef } from 'react'
import { geocodeAndDistance, tryLocalGeocode, haversineDistance } from '../lib/geocoding'
import { calcPricing } from '../lib/pricing'

const DEBOUNCE_MS   = 700     // délai avant de lancer le géocodage
const MIN_ADDR_LEN  = 4       // nb minimum de caractères pour déclencher

export function usePricing(pickup, delivery, options = {}) {
  const [pricing, setPricing]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState(null)
  const timerRef  = useRef(null)
  const abortRef  = useRef(false)    // annule les résultats d'une requête obsolète

  const { urgent = false, heavy = false, date } = options

  useEffect(() => {
    // Reset si l'une des adresses est trop courte
    if (!pickup || !delivery || pickup.length < MIN_ADDR_LEN || delivery.length < MIN_ADDR_LEN) {
      setPricing(null)
      setError(null)
      setLoading(false)
      clearTimeout(timerRef.current)
      return
    }

    setLoading(true)
    setError(null)
    clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      abortRef.current = false

      try {
        let distanceKm = null

        // ── 1. Tentative fallback local (0 requête réseau) ──────
        const pLocal = tryLocalGeocode(pickup)
        const dLocal = tryLocalGeocode(delivery)

        if (pLocal && dLocal) {
          distanceKm = haversineDistance(pLocal.lat, pLocal.lng, dLocal.lat, dLocal.lng)
        } else {
          // ── 2. Nominatim ──────────────────────────────────────
          const result = await geocodeAndDistance(pickup, delivery)
          if (abortRef.current) return   // résultat obsolète, ignorer

          if (!result) {
            setError('Adresse introuvable — vérifiez les champs de saisie')
            setLoading(false)
            setPricing(null)
            return
          }
          distanceKm = result.distanceKm
        }

        if (abortRef.current) return

        // ── 3. Calcul du tarif ────────────────────────────────
        const result = calcPricing(distanceKm, { urgent, heavy, date })
        setPricing(result)
        setError(result.valid ? null : result.error)
      } catch (e) {
        if (!abortRef.current) {
          setError('Impossible de calculer la distance')
          setPricing(null)
        }
      } finally {
        if (!abortRef.current) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timerRef.current)
      abortRef.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, delivery, urgent, heavy])

  return { pricing, loading, error }
}
