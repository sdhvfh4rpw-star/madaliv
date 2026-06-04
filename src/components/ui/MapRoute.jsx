/**
 * MapRoute — carte statique affichant un trajet entre deux points
 * ─────────────────────────────────────────────────────────────
 * Utilisé dans le tableau de bord livreur.
 * Affiche : marqueur collecte (orange A) + marqueur livraison (vert B)
 *           + ligne polyline bleue + badge distance + badge gain livreur.
 *
 * Props :
 *   pickup   : { lat, lng, label? }
 *   delivery : { lat, lng, label? }
 *   distanceKm : number
 *   driverShare : number (Ariary)
 *   height : number (px)
 */

import { useEffect, useRef } from 'react'
import { formatAr, formatKm } from '../../lib/pricing'

function pinSVG(fill, border, letter) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 32 42">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z"
      fill="${fill}" stroke="${border}" stroke-width="2"/>
    <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
    <text x="16" y="20" text-anchor="middle" font-size="11"
      font-family="system-ui,sans-serif" font-weight="700" fill="${fill}">${letter}</text>
  </svg>`
}

export default function MapRoute({ pickup, delivery, distanceKm, driverShare, height = 200 }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)

  useEffect(() => {
    if (!pickup || !delivery || mapRef.current) return
    const el = containerRef.current
    if (!el) return

    import('leaflet').then(({ default: L }) => {
      const mid = [
        (pickup.lat  + delivery.lat)  / 2,
        (pickup.lng  + delivery.lng)  / 2,
      ]
      const map = L.map(el, {
        center: mid, zoom: 13,
        zoomControl: false, attributionControl: false,
        dragging: true, scrollWheelZoom: false, doubleClickZoom: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)

      const mkA = L.divIcon({ className:'', html: pinSVG('#E84C1E','#b83a16','A'), iconSize:[28,38], iconAnchor:[14,38] })
      const mkB = L.divIcon({ className:'', html: pinSVG('#007A4D','#005535','B'), iconSize:[28,38], iconAnchor:[14,38] })

      L.marker([pickup.lat,   pickup.lng],   { icon: mkA }).addTo(map)
        .bindPopup(pickup.label   || 'Collecte',   { closeButton: false })
      L.marker([delivery.lat, delivery.lng], { icon: mkB }).addTo(map)
        .bindPopup(delivery.label || 'Livraison', { closeButton: false })

      const line = L.polyline(
        [[pickup.lat, pickup.lng], [delivery.lat, delivery.lng]],
        { color: '#3b82f6', weight: 3, dashArray: '8 5', opacity: 0.85 }
      ).addTo(map)

      // Ajuster le zoom pour voir les deux marqueurs
      map.fitBounds(line.getBounds(), { padding: [36, 36] })

      mapRef.current = map
    })

    return () => { mapRef.current?.remove(); mapRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lat, pickup?.lng, delivery?.lat, delivery?.lng])

  if (!pickup || !delivery) return null

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <div className="relative" style={{ height }}>
        <div ref={containerRef} className="w-full h-full" />

        {/* Badges superposés */}
        {distanceKm !== undefined && (
          <div className="absolute top-2 left-2 z-[20] flex flex-col gap-1.5 pointer-events-none">
            <span className="bg-white/90 backdrop-blur-sm text-xs font-bold text-gray-700 px-2.5 py-1 rounded-xl shadow-sm border border-gray-100">
              📍 {formatKm(distanceKm)}
            </span>
            {driverShare !== undefined && (
              <span className="bg-green-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-xl shadow-sm">
                🏍️ {formatAr(driverShare)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="bg-gray-50 px-3 py-2 flex items-center gap-4 text-[11px] text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
          {pickup.label  || 'Collecte'}
        </span>
        <span className="text-gray-300">→</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-600" />
          {delivery.label || 'Livraison'}
        </span>
      </div>
    </div>
  )
}
