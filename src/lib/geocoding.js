/**
 * geocoding.js — MadaLiv
 * ─────────────────────────────────────────────────────────────
 * Géocodage via OpenStreetMap Nominatim + distance Haversine.
 * Avec reverse geocoding pour nommer les points posés sur la carte.
 */

const NOMINATIM_SEARCH  = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'
const USER_AGENT        = 'MadaLiv/1.0 (contact@madaliv.mg)'

// ── Cache LRU (200 entrées) ──────────────────────────────────
const geoCache = new Map()
const CACHE_MAX = 200
function cacheGet(key)        { return geoCache.get(key.toLowerCase().trim()) }
function cacheSet(key, value) {
  if (geoCache.size >= CACHE_MAX) geoCache.delete(geoCache.keys().next().value)
  geoCache.set(key.toLowerCase().trim(), value)
}

// ── Rate-limit (≥ 1,1 s entre requêtes) ─────────────────────
let lastRequestTime = 0
async function throttledFetch(url) {
  const elapsed = Date.now() - lastRequestTime
  if (elapsed < 1100) await new Promise(r => setTimeout(r, 1100 - elapsed))
  lastRequestTime = Date.now()
  return fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } })
}

// ── Géocodage direct (adresse → coords) ─────────────────────
export async function geocodeAddress(address) {
  if (!address || address.trim().length < 3) return null
  const cached = cacheGet(address)
  if (cached !== undefined) return cached
  try {
    const params = new URLSearchParams({
      q: `${address.trim()}, Madagascar`, format: 'json',
      limit: '1', countrycodes: 'mg', addressdetails: '0',
    })
    const res  = await throttledFetch(`${NOMINATIM_SEARCH}?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!data.length) { cacheSet(address, null); return null }
    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name }
    cacheSet(address, result)
    return result
  } catch { return null }
}

// ── Géocodage inverse (coords → nom de quartier) ─────────────
/**
 * Retourne le nom du quartier/lieu le plus proche des coordonnées.
 * Utilisé pour nommer les marqueurs posés sur la carte.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string>}  ex: "Analakely" ou "-18.9161, 47.5360"
 */
export async function reverseGeocode(lat, lng) {
  const cacheKey = `rev:${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = cacheGet(cacheKey)
  if (cached !== undefined) return cached

  try {
    const params = new URLSearchParams({
      lat, lon: lng, format: 'json', zoom: '16', addressdetails: '1',
    })
    const res  = await throttledFetch(`${NOMINATIM_REVERSE}?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const addr = data.address || {}
    // Priorité : quartier > village > ville > coordonnées brutes
    const name =
      addr.suburb         ||
      addr.neighbourhood  ||
      addr.quarter        ||
      addr.village        ||
      addr.town           ||
      addr.city           ||
      data.display_name?.split(',')[0] ||
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    cacheSet(cacheKey, name)
    return name
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}

// ── Distance Haversine ────────────────────────────────────────
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R    = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}
function toRad(deg) { return deg * Math.PI / 180 }

// ── Multiplicateur trafic Antananarivo ───────────────────────

/**
 * Retourne le multiplicateur de durée selon l'heure à Antananarivo.
 *
 * Heures creuses  22h–6h  → ×1.0
 * Heures normales 6h–7h, 10h–16h, 20h–22h → ×1.5
 * Heures de pointe 7h–10h, 16h–20h → ×2.5
 *
 * @param {Date} [date]
 * @returns {number}
 */
export function getTrafficMultiplier(date = new Date()) {
  const h = date.getHours()
  if (h >= 22 || h < 6)  return 1.0   // creuses
  if (h < 7)             return 1.5   // normal 6h–7h
  if (h < 10)            return 2.5   // pointe matin 7h–10h
  if (h < 16)            return 1.5   // normal 10h–16h
  if (h < 20)            return 2.5   // pointe soir 16h–20h
  return 1.5                           // normal 20h–22h
}

// ── Snap sur la route la plus proche (OSRM nearest) ──────────

const OSRM_NEAREST = 'https://router.project-osrm.org/nearest/v1/driving'

/**
 * Ramène un point GPS sur la route la plus proche accessible par moto.
 * Utilise l'endpoint OSRM /nearest.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{lat:number, lng:number, snapped:boolean}>}
 *   snapped=true  → le point a été déplacé sur la route
 *   snapped=false → le point était déjà sur une route (< 20 m de différence)
 *                   ou l'API était indisponible (coords originales retournées)
 */
export async function snapToRoad(lat, lng) {
  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), 4000)
  try {
    const res  = await fetch(`${OSRM_NEAREST}/${lng},${lat}?number=1`, {
      signal:  controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)
    if (!res.ok) return { lat, lng, snapped: false }

    const data = await res.json()
    if (data.code !== 'Ok' || !data.waypoints?.[0]) return { lat, lng, snapped: false }

    const [snapLng, snapLat] = data.waypoints[0].location
    // Considérer comme "ajusté" si déplacement > 20 m
    const dist = haversineDistance(lat, lng, snapLat, snapLng) * 1000   // mètres
    return { lat: snapLat, lng: snapLng, snapped: dist > 20 }
  } catch {
    clearTimeout(timer)
    return { lat, lng, snapped: false }
  }
}

// ── Distance routière réelle via OSRM ────────────────────────

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'
const OSRM_TIMEOUT_MS = 5000   // bascule sur Haversine après 5 s

/**
 * Calcule la distance routière et la durée entre deux points via OSRM.
 * Retourne `null` si l'API est indisponible (→ fallback Haversine).
 *
 * @returns {Promise<{ distanceKm: number, durationMin: number } | null>}
 */
export async function osrmRoute(lat1, lng1, lat2, lng2) {
  // OSRM attend les coordonnées en ordre lng,lat
  const url = `${OSRM_BASE}/${lng1},${lat1};${lng2},${lat2}?overview=false`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)

    if (!res.ok) return null

    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]) return null

    const route = data.routes[0]
    return {
      distanceKm: parseFloat((route.distance / 1000).toFixed(2)),
      durationMin: Math.ceil(route.duration / 60),
    }
  } catch {
    clearTimeout(timer)
    return null   // timeout ou réseau indisponible
  }
}

// ── Géocodage + distance ─────────────────────────────────────
export async function geocodeAndDistance(pickup, delivery) {
  const [pCoords, dCoords] = await Promise.all([geocodeAddress(pickup), geocodeAddress(delivery)])
  if (!pCoords || !dCoords) return null
  return {
    distanceKm:     haversineDistance(pCoords.lat, pCoords.lng, dCoords.lat, dCoords.lng),
    pickupCoords:   pCoords,
    deliveryCoords: dCoords,
  }
}

// ── Coordonnées des quartiers principaux (fallback local) ─────
export const KNOWN_DISTRICTS = {
  'analakely':       { lat: -18.9161, lng: 47.5360 },
  'tsaralalana':     { lat: -18.9108, lng: 47.5258 },
  'tsaralalàna':     { lat: -18.9108, lng: 47.5258 },
  'behoririka':      { lat: -18.9215, lng: 47.5310 },
  'ambohimanarina':  { lat: -18.9100, lng: 47.4980 },
  'ankadifotsy':     { lat: -18.9350, lng: 47.5270 },
  'isotry':          { lat: -18.9260, lng: 47.5190 },
  'ivandry':         { lat: -18.8950, lng: 47.5520 },
  'ambohipo':        { lat: -18.8800, lng: 47.5450 },
  '67 ha':           { lat: -18.9440, lng: 47.5380 },
  'mahamasina':      { lat: -18.9300, lng: 47.5350 },
  'antananarivo':    { lat: -18.9137, lng: 47.5361 },
  'tana':            { lat: -18.9137, lng: 47.5361 },
}

export function tryLocalGeocode(address) {
  const key = address.toLowerCase().split(',')[0].trim()
  const coords = KNOWN_DISTRICTS[key]
  return coords ? { ...coords, displayName: address } : null
}
