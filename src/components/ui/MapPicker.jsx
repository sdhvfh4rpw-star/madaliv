/**
 * MapPicker — carte interactive de sélection GPS
 * ─────────────────────────────────────────────────────────────
 * Comportement :
 *  1. Le client appuie sur la carte → pose le marqueur de collecte (A)
 *  2. Appuie une deuxième fois → pose le marqueur de livraison (B)
 *  3. Les deux marqueurs sont glissables pour affiner la position
 *  4. Bouton "Ma position GPS" → géolocalisation navigateur
 *  5. Ligne pointillée bleue entre A et B
 *
 * API impérative (via ref) :
 *   ref.current.flyAndSetPickup({ lat, lng, label })
 *   ref.current.flyAndSetDelivery({ lat, lng, label })
 *
 * Props :
 *   onPickupChange(coords: {lat,lng,label})
 *   onDeliveryChange(coords: {lat,lng,label})
 *   height (px, défaut 300)
 */

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { RotateCcw, Crosshair, CheckCircle2, MapPin } from 'lucide-react'
import { reverseGeocode, snapToRoad } from '../../lib/geocoding'

const DEFAULT_CENTER = [-18.9137, 47.5361]
const DEFAULT_ZOOM   = 13

// ── Icône pin SVG ─────────────────────────────────────────────
function pinSVG(fill, border, letter) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z"
      fill="${fill}" stroke="${border}" stroke-width="2"/>
    <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
    <text x="16" y="20" text-anchor="middle" font-size="11"
      font-family="system-ui,sans-serif" font-weight="700" fill="${fill}">${letter}</text>
  </svg>`
}

function makeIcon(L, fill, border, letter) {
  return L.divIcon({
    className:   '',
    html:        pinSVG(fill, border, letter),
    iconSize:    [32, 42],
    iconAnchor:  [16, 42],
    popupAnchor: [0, -44],
  })
}

// ── Composant ─────────────────────────────────────────────────
const MapPicker = forwardRef(function MapPicker(
  {
    onPickupChange,
    onDeliveryChange,
    height = 300,
  },
  ref
) {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  const pickupMkRef   = useRef(null)
  const deliveryMkRef = useRef(null)
  const lineRef       = useRef(null)
  const leafletRef    = useRef(null)       // instance L conservée
  const stateRef      = useRef('pickup')   // 'pickup' | 'delivery' | 'done'
  const iconsRef      = useRef({})

  const [uiState,       setUiState]       = useState('pickup')
  const [locating,      setLocating]      = useState(false)
  const [geoError,      setGeoError]      = useState(null)
  const [pickupLabel,   setPickupLabel]   = useState(null)
  const [deliveryLabel, setDeliveryLabel] = useState(null)
  const [snapMsg,       setSnapMsg]       = useState(null)  // 'pickup' | 'delivery' | null
  const snapTimerRef = useRef(null)

  // ── Helpers internes ──────────────────────────────────────────
  async function getLabel(lat, lng) {
    try   { return await reverseGeocode(lat, lng) }
    catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}` }
  }

  /** Snap sur la route, place le marqueur, notifie le parent. */
  async function snapAndPlace(type, rawLat, rawLng) {
    const snap   = await snapToRoad(rawLat, rawLng)
    const lat    = snap.lat
    const lng    = snap.lng
    const label  = await getLabel(lat, lng)

    placeMarker(type, lat, lng, label)
    if (type === 'pickup')  onPickupChange?.({ lat, lng, label })
    else                    onDeliveryChange?.({ lat, lng, label })

    // Afficher le message "ajusté" 3 s si le point a vraiment bougé
    if (snap.snapped) {
      clearTimeout(snapTimerRef.current)
      setSnapMsg(type)
      snapTimerRef.current = setTimeout(() => setSnapMsg(null), 3000)
    }

    return { lat, lng, label }
  }

  function redrawLine() {
    const L   = leafletRef.current
    const map = mapRef.current
    if (!L || !map) return
    if (lineRef.current) { lineRef.current.remove(); lineRef.current = null }
    if (!pickupMkRef.current || !deliveryMkRef.current) return
    const p = pickupMkRef.current.getLatLng()
    const d = deliveryMkRef.current.getLatLng()
    lineRef.current = L.polyline(
      [[p.lat, p.lng], [d.lat, d.lng]],
      { color: '#3b82f6', weight: 3, dashArray: '8 6', opacity: 0.8 }
    ).addTo(map)
  }

  async function handleDrag(marker, type, setLabel) {
    const { lat, lng } = marker.getLatLng()
    const label = await getLabel(lat, lng)
    setLabel(label)
    if (type === 'pickup')  onPickupChange?.({ lat, lng, label })
    else                    onDeliveryChange?.({ lat, lng, label })
    redrawLine()
  }

  function placeMarker(type, lat, lng, label) {
    const L    = leafletRef.current
    const map  = mapRef.current
    if (!L || !map) return

    const isPickup = type === 'pickup'
    const mkRef    = isPickup ? pickupMkRef : deliveryMkRef
    const icon     = isPickup ? iconsRef.current.pickup : iconsRef.current.delivery
    const setLabel = isPickup ? setPickupLabel : setDeliveryLabel

    if (mkRef.current) mkRef.current.remove()
    const mk = L.marker([lat, lng], { icon, draggable: true }).addTo(map)
    mk.on('dragend', () => handleDrag(mk, type, setLabel))
    mkRef.current = mk
    setLabel(label)
    redrawLine()

    const newState = (pickupMkRef.current && deliveryMkRef.current) ? 'done'
      : isPickup ? 'delivery' : 'done'
    stateRef.current = newState
    setUiState(newState)
  }

  // ── API impérative exposée via ref ────────────────────────────
  useImperativeHandle(ref, () => ({
    flyAndSetPickup(coords) {
      const map = mapRef.current
      if (!map || !coords) return
      map.flyTo([coords.lat, coords.lng], 15, { duration: 0.8 })
      placeMarker('pickup', coords.lat, coords.lng, coords.label || coords.name || '')
      onPickupChange?.({ lat: coords.lat, lng: coords.lng, label: coords.label || coords.name || '' })
    },
    flyAndSetDelivery(coords) {
      const map = mapRef.current
      if (!map || !coords) return
      map.flyTo([coords.lat, coords.lng], 15, { duration: 0.8 })
      placeMarker('delivery', coords.lat, coords.lng, coords.label || coords.name || '')
      onDeliveryChange?.({ lat: coords.lat, lng: coords.lng, label: coords.label || coords.name || '' })
    },
    resetAll() { handleReset() },
  }), [])    // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialisation Leaflet ────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    import('leaflet').then(({ default: L }) => {
      leafletRef.current = L

      const map = L.map(containerRef.current, {
        center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM,
        zoomControl: true, attributionControl: true,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      iconsRef.current = {
        pickup:   makeIcon(L, '#E84C1E', '#b83a16', 'A'),
        delivery: makeIcon(L, '#007A4D', '#005535', 'B'),
      }

      // Clic carte → snap automatique sur la route
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng
        const type = (stateRef.current === 'delivery') ? 'delivery' : 'pickup'
        await snapAndPlace(type, lat, lng)
      })

      mapRef.current = map
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current    = null
      leafletRef.current= null
      pickupMkRef.current   = null
      deliveryMkRef.current = null
      lineRef.current       = null
    }
  }, [])    // eslint-disable-line react-hooks/exhaustive-deps

  // ── Réinitialisation ─────────────────────────────────────────
  const handleReset = useCallback(() => {
    pickupMkRef.current?.remove();   pickupMkRef.current   = null
    deliveryMkRef.current?.remove(); deliveryMkRef.current = null
    lineRef.current?.remove();       lineRef.current       = null
    stateRef.current = 'pickup'
    setUiState('pickup')
    setPickupLabel(null)
    setDeliveryLabel(null)
    onPickupChange?.(null)
    onDeliveryChange?.(null)
  }, [onPickupChange, onDeliveryChange])

  // ── Ma position GPS ───────────────────────────────────────────
  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non disponible')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false)
        const { latitude: lat, longitude: lng } = pos.coords
        mapRef.current?.setView([lat, lng], 15)
        await snapAndPlace('pickup', lat, lng)
      },
      (err) => {
        setLocating(false)
        setGeoError(
          err.code === 1 ? 'Accès refusé — autorisez la géolocalisation' :
          err.code === 2 ? 'Position indisponible' : 'Délai dépassé'
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [onPickupChange])    // eslint-disable-line react-hooks/exhaustive-deps

  const instructions = {
    pickup:   { text: 'Appuyez sur la carte pour placer la collecte  (A)',  cls: 'bg-brand-500 text-white' },
    delivery: { text: 'Appuyez maintenant pour placer la livraison  (B)',   cls: 'bg-green-600 text-white' },
    done:     { text: 'Glissez les marqueurs pour affiner la position',      cls: 'bg-blue-500 text-white'  },
  }[uiState]

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Barre d'état */}
      <div className={`flex items-center justify-between px-3 py-2 text-xs font-semibold ${instructions.cls}`}>
        <span className="flex items-center gap-1.5">
          {uiState === 'done' ? <CheckCircle2 size={13} /> : <MapPin size={13} />}
          {instructions.text}
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 opacity-80 hover:opacity-100 transition"
        >
          <RotateCcw size={12} /> Réinitialiser
        </button>
      </div>

      {/* Carte */}
      <div className="relative" style={{ height }}>
        <div ref={containerRef} className="w-full h-full" />

        {/* Bouton Ma position */}
        <button
          type="button"
          onClick={handleMyLocation}
          disabled={locating}
          className="absolute bottom-3 right-3 z-[20] bg-white border border-gray-200 shadow-md
            rounded-xl px-3 py-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700
            hover:bg-gray-50 active:scale-95 transition disabled:opacity-50"
        >
          {locating ? (
            <svg className="animate-spin h-3.5 w-3.5 text-brand-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : <Crosshair size={14} className="text-brand-500" />}
          Ma position GPS
        </button>

        {/* Message snap — disparaît après 3 s */}
        {snapMsg && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[20]
            bg-white/95 backdrop-blur border border-blue-200 shadow-md
            rounded-xl px-3 py-1.5 flex items-center gap-1.5 pointer-events-none
            animate-fade-in">
            <span className="text-sm">📍</span>
            <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">
              Point ajusté sur la route accessible
            </span>
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="bg-gray-50 px-3 py-2 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-brand-500 border-2 border-white shadow-sm" />
          <span className="text-[11px] font-medium text-gray-600">
            {pickupLabel
              ? <span className="text-gray-800 font-semibold truncate max-w-[110px] inline-block align-bottom">{pickupLabel}</span>
              : 'Collecte (A)'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-600 border-2 border-white shadow-sm" />
          <span className="text-[11px] font-medium text-gray-600">
            {deliveryLabel
              ? <span className="text-gray-800 font-semibold truncate max-w-[110px] inline-block align-bottom">{deliveryLabel}</span>
              : 'Livraison (B)'}
          </span>
        </div>
        {geoError && (
          <p className="text-[10px] text-red-500 flex-1 text-right">{geoError}</p>
        )}
      </div>
    </div>
  )
})

export default MapPicker
