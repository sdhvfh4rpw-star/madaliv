/**
 * MapLive — carte de suivi en temps réel
 * ─────────────────────────────────────────────────────────────
 * Affiche : marqueur collecte (A) + livraison (B) + route fixe
 *           + marqueur livreur animé qui progresse le long du trajet.
 *
 * En production : remplacer le setInterval de simulation
 * par un canal Supabase Realtime sur driver_locations.
 *
 * Props :
 *   pickup        : { lat, lng, label? }
 *   delivery      : { lat, lng, label? }
 *   driverCoords  : { lat, lng } | null  (depuis Supabase realtime)
 *   status        : order status string
 *   eta           : number (minutes)
 *   height        : number (px)
 */

import { useEffect, useRef, useState } from 'react'
import { Clock, Bike } from 'lucide-react'

function pinSVG(fill, border, letter) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 32 42">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z"
      fill="${fill}" stroke="${border}" stroke-width="2"/>
    <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
    <text x="16" y="20" text-anchor="middle" font-size="11"
      font-family="system-ui,sans-serif" font-weight="700" fill="${fill}">${letter}</text>
  </svg>`
}

// Interpolation linéaire entre deux points
function lerp(a, b, t) { return a + (b - a) * t }

export default function MapLive({
  pickup,
  delivery,
  driverCoords: externalDriverCoords = null,
  status = 'ontheway',
  eta   = 12,
  height = 240,
}) {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  const driverMkRef   = useRef(null)
  const simTimerRef   = useRef(null)
  const simProgressRef= useRef(0.15)    // 0→1 : position sur le trajet

  const [currentEta, setCurrentEta] = useState(eta)

  // ── Init carte ───────────────────────────────────────────────
  useEffect(() => {
    if (!pickup || !delivery || mapRef.current) return
    const el = containerRef.current
    if (!el) return

    import('leaflet').then(({ default: L }) => {
      const mid = [(pickup.lat + delivery.lat) / 2, (pickup.lng + delivery.lng) / 2]
      const map = L.map(el, {
        center: mid, zoom: 13,
        zoomControl: false, attributionControl: false,
        dragging: true, scrollWheelZoom: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)

      // Marqueurs fixes
      const iconA = L.divIcon({ className:'', html: pinSVG('#E84C1E','#b83a16','A'), iconSize:[28,38], iconAnchor:[14,38] })
      const iconB = L.divIcon({ className:'', html: pinSVG('#007A4D','#005535','B'), iconSize:[28,38], iconAnchor:[14,38] })
      L.marker([pickup.lat,   pickup.lng],   { icon: iconA }).addTo(map)
      L.marker([delivery.lat, delivery.lng], { icon: iconB }).addTo(map)

      // Ligne de trajet
      const line = L.polyline(
        [[pickup.lat, pickup.lng], [delivery.lat, delivery.lng]],
        { color: '#3b82f6', weight: 4, dashArray: '10 6', opacity: 0.7 }
      ).addTo(map)
      map.fitBounds(line.getBounds(), { padding: [48, 48] })

      // Marqueur livreur (pulsant)
      const driverIcon = L.divIcon({
        className: '',
        html: `<div class="driver-marker-pulse" style="
          width:22px;height:22px;border-radius:50%;
          background:#E84C1E;border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`,
        iconSize:   [22, 22],
        iconAnchor: [11, 11],
      })

      // Position initiale du livreur
      const initLat = externalDriverCoords?.lat ?? lerp(pickup.lat,  delivery.lat,  simProgressRef.current)
      const initLng = externalDriverCoords?.lng ?? lerp(pickup.lng, delivery.lng, simProgressRef.current)
      const driverMk = L.marker([initLat, initLng], { icon: driverIcon, zIndexOffset: 1000 }).addTo(map)
      driverMkRef.current = driverMk

      // Simulation de mouvement si pas de données temps réel
      if (!externalDriverCoords && (status === 'ontheway' || status === 'pickup')) {
        simTimerRef.current = setInterval(() => {
          simProgressRef.current = Math.min(simProgressRef.current + 0.008, 0.98)
          const lat = lerp(pickup.lat,  delivery.lat,  simProgressRef.current)
          const lng = lerp(pickup.lng, delivery.lng, simProgressRef.current)
          driverMkRef.current?.setLatLng([lat, lng])
          // Décrémente ETA
          setCurrentEta(e => Math.max(1, e - 0.1))
        }, 1800)
      }

      mapRef.current = map
    })

    return () => {
      clearInterval(simTimerRef.current)
      mapRef.current?.remove()
      mapRef.current  = null
      driverMkRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lat, pickup?.lng, delivery?.lat, delivery?.lng])

  // ── Mise à jour position externe (Supabase Realtime) ─────────
  useEffect(() => {
    if (!externalDriverCoords || !driverMkRef.current) return
    driverMkRef.current.setLatLng([externalDriverCoords.lat, externalDriverCoords.lng])
  }, [externalDriverCoords?.lat, externalDriverCoords?.lng])

  if (!pickup || !delivery) return null

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <div className="relative" style={{ height }}>
        <div ref={containerRef} className="w-full h-full" />

        {/* ETA + statut */}
        <div className="absolute top-2 right-2 z-[20] flex flex-col gap-1.5 items-end pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-1.5">
            <Clock size={13} className="text-brand-500" />
            <span className="text-xs font-bold text-brand-600">~{Math.ceil(currentEta)} min</span>
          </div>
          {(status === 'ontheway' || status === 'pickup') && (
            <div className="bg-brand-500 px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1.5">
              <Bike size={12} className="text-white" />
              <span className="text-[10px] font-bold text-white">En route</span>
            </div>
          )}
        </div>

        {/* Légende badges A / B */}
        <div className="absolute bottom-2 left-2 z-[20] pointer-events-none flex flex-col gap-1">
          <span className="bg-white/90 backdrop-blur-sm text-[10px] font-bold text-brand-600 px-2 py-0.5 rounded-lg shadow-sm">
            A — {pickup.label || 'Collecte'}
          </span>
          <span className="bg-white/90 backdrop-blur-sm text-[10px] font-bold text-green-700 px-2 py-0.5 rounded-lg shadow-sm">
            B — {delivery.label || 'Livraison'}
          </span>
        </div>
      </div>
    </div>
  )
}
