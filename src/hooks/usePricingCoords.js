/**
 * usePricingCoords
 * ─────────────────────────────────────────────────────────────
 * Calcule le tarif à partir de coordonnées GPS.
 * Utilise OSRM pour la distance routière réelle ;
 * bascule sur Haversine si OSRM est indisponible.
 *
 * Usage :
 *   const { pricing, durationMin, approximate, loading }
 *     = usePricingCoords(pickupCoords, deliveryCoords, { urgent, heavy })
 *
 * - pricing     : PricingResult | null
 * - durationMin       : durée ajustée trafic en minutes (null si fallback Haversine)
 * - trafficMultiplier : facteur appliqué (1.0 / 1.5 / 2.5)
 * - approximate       : true = distance Haversine (OSRM indisponible)
 * - loading           : true pendant l'appel réseau
 */

import { useState, useEffect, useRef } from 'react'
import { osrmRoute, haversineDistance, getTrafficMultiplier } from '../lib/geocoding'
import { calcPricing } from '../lib/pricing'

const DEBOUNCE_MS = 600   // évite les appels pendant le glisser-déposer du marqueur

export function usePricingCoords(pickupCoords, deliveryCoords, options = {}) {
  const { urgent = false, heavy = false, date } = options

  const [pricing,     setPricing]     = useState(null)
  const [durationMin,       setDurationMin]       = useState(null)
  const [trafficMultiplier, setTrafficMultiplier] = useState(1.0)
  const [approximate,       setApproximate]       = useState(false)
  const [loading,           setLoading]           = useState(false)

  const timerRef  = useRef(null)
  const cancelRef = useRef(false)   // annule les résultats d'une requête obsolète

  useEffect(() => {
    // Réinitialiser si les deux points ne sont pas définis
    if (!pickupCoords?.lat || !deliveryCoords?.lat) {
      setPricing(null)
      setDurationMin(null)
      setApproximate(false)
      setLoading(false)
      clearTimeout(timerRef.current)
      return
    }

    setLoading(true)
    clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      cancelRef.current = false

      // ── 1. Tentative OSRM ────────────────────────────────────
      const osrm = await osrmRoute(
        pickupCoords.lat, pickupCoords.lng,
        deliveryCoords.lat, deliveryCoords.lng,
      )

      if (cancelRef.current) return   // des nouvelles coords sont arrivées entre-temps

      // Multiplicateur trafic calculé au moment de la requête
      const multiplier = getTrafficMultiplier(date ? new Date(date) : new Date())
      setTrafficMultiplier(multiplier)

      let distanceKm
      let isApproximate

      if (osrm) {
        distanceKm   = osrm.distanceKm
        isApproximate = false
        // Durée OSRM × multiplicateur trafic, arrondie à l'entier supérieur
        setDurationMin(Math.ceil(osrm.durationMin * multiplier))
      } else {
        // ── 2. Fallback Haversine ──────────────────────────────
        distanceKm   = parseFloat(haversineDistance(
          pickupCoords.lat, pickupCoords.lng,
          deliveryCoords.lat, deliveryCoords.lng,
        ).toFixed(2))
        isApproximate = true
        setDurationMin(null)
      }

      setApproximate(isApproximate)
      setPricing(calcPricing(distanceKm, { urgent, heavy, date }))
      setLoading(false)
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timerRef.current)
      cancelRef.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickupCoords?.lat, pickupCoords?.lng,
    deliveryCoords?.lat, deliveryCoords?.lng,
    urgent, heavy,
  ])

  return { pricing, durationMin, trafficMultiplier, approximate, loading }
}
