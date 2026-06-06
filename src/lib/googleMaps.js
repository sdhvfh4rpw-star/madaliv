/**
 * googleMaps.js — FAINGANA
 * ─────────────────────────────────────────────────────────────
 * Intégration Google Maps Places (Autocomplete + Place Details).
 *
 * Ultra-défensif : si VITE_GOOGLE_MAPS_KEY est absente, si le script
 * ne charge pas, ou si une requête échoue → renvoie null/[] sans
 * jamais lever d'exception. L'appelant bascule alors sur le système
 * statique (antananarivo.js).
 *
 * Variable .env :
 *   VITE_GOOGLE_MAPS_KEY — clé Google Maps JavaScript API (Places activé)
 */

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY ?? ''

/** True si une clé Google est configurée. */
export function isGoogleConfigured() {
  return Boolean(GOOGLE_KEY)
}

// ── Chargement unique du script ───────────────────────────────
let loadPromise = null

/**
 * Charge le script Google Maps une seule fois.
 * @returns {Promise<object|null>}  window.google ou null si indisponible
 */
export function loadGoogleMaps() {
  try {
    if (!GOOGLE_KEY) return Promise.resolve(null)
    if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.resolve(null)
    if (window.google?.maps?.places) return Promise.resolve(window.google)
    if (loadPromise) return loadPromise

    loadPromise = new Promise((resolve) => {
      try {
        const existing = document.getElementById('faingana-gmaps')
        if (existing) {
          existing.addEventListener('load',  () => resolve(window.google ?? null))
          existing.addEventListener('error', () => resolve(null))
          return
        }
        const script = document.createElement('script')
        script.id    = 'faingana-gmaps'
        script.async = true
        script.defer = true
        script.src =
          `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}` +
          `&libraries=places&language=fr&region=MG&loading=async`
        script.onload  = () => resolve(window.google ?? null)
        script.onerror = () => { console.warn('[googleMaps] échec chargement script'); resolve(null) }
        document.head.appendChild(script)
        // Filet de sécurité : ne jamais bloquer indéfiniment
        setTimeout(() => resolve(window.google ?? null), 8000)
      } catch (e) {
        console.error('[googleMaps] exception loadGoogleMaps:', e)
        resolve(null)
      }
    })
    return loadPromise
  } catch (e) {
    console.error('[googleMaps] exception:', e)
    return Promise.resolve(null)
  }
}

// ── Services (singletons) ─────────────────────────────────────
let _ac = null   // AutocompleteService
let _ps = null   // PlacesService
let _session = null

function getServices(google) {
  try {
    if (!_ac) _ac = new google.maps.places.AutocompleteService()
    if (!_ps) _ps = new google.maps.places.PlacesService(document.createElement('div'))
    if (!_session && google.maps.places.AutocompleteSessionToken) {
      _session = new google.maps.places.AutocompleteSessionToken()
    }
    return { ac: _ac, ps: _ps }
  } catch (e) {
    console.error('[googleMaps] getServices:', e)
    return null
  }
}

/** Bornes approximatives d'Antananarivo pour biaiser les résultats. */
function tanaBounds(google) {
  try {
    return new google.maps.LatLngBounds(
      new google.maps.LatLng(-19.05, 47.40),  // Sud-Ouest
      new google.maps.LatLng(-18.75, 47.65),  // Nord-Est
    )
  } catch {
    return null
  }
}

// ── Autocomplétion ────────────────────────────────────────────
/**
 * Prédictions Google Places, restreintes à Madagascar, biaisées Antananarivo.
 * @param {string} input
 * @returns {Promise<Array|null>}  liste de {placeId, primary, secondary} ;
 *   null = Google indisponible (→ l'appelant bascule sur le statique)
 */
export async function getPlacePredictions(input) {
  try {
    if (!input || input.trim().length < 2) return []
    const google = await loadGoogleMaps()
    if (!google?.maps?.places) return null
    const services = getServices(google)
    if (!services) return null

    return await new Promise((resolve) => {
      try {
        const req = {
          input: input.trim(),
          componentRestrictions: { country: 'mg' },
        }
        if (_session) req.sessionToken = _session
        const b = tanaBounds(google)
        if (b) req.bounds = b

        services.ac.getPlacePredictions(req, (preds, status) => {
          try {
            const OK = google.maps.places.PlacesServiceStatus.OK
            const ZERO = google.maps.places.PlacesServiceStatus.ZERO_RESULTS
            if (status === ZERO) { resolve([]); return }
            if (status !== OK || !Array.isArray(preds)) { resolve([]); return }
            resolve(preds.map(p => ({
              placeId:   p.place_id,
              primary:   p.structured_formatting?.main_text ?? p.description ?? '',
              secondary: p.structured_formatting?.secondary_text ?? '',
              description: p.description ?? '',
            })))
          } catch (e) {
            console.error('[googleMaps] predictions callback:', e)
            resolve([])
          }
        })
      } catch (e) {
        console.error('[googleMaps] predictions:', e)
        resolve(null)
      }
    })
  } catch (e) {
    console.error('[googleMaps] getPlacePredictions:', e)
    return null
  }
}

// ── Détails d'un lieu → coordonnées GPS ───────────────────────
/**
 * @param {string} placeId
 * @returns {Promise<{lat:number,lng:number,name:string}|null>}
 */
export async function getPlaceDetails(placeId) {
  try {
    if (!placeId) return null
    const google = await loadGoogleMaps()
    if (!google?.maps?.places) return null
    const services = getServices(google)
    if (!services) return null

    return await new Promise((resolve) => {
      try {
        const req = {
          placeId,
          fields: ['geometry', 'name', 'formatted_address'],
        }
        if (_session) req.sessionToken = _session

        services.ps.getDetails(req, (place, status) => {
          try {
            // Le token de session est consommé après les détails
            _session = null
            const OK = google.maps.places.PlacesServiceStatus.OK
            const loc = place?.geometry?.location
            if (status !== OK || !loc) { resolve(null); return }
            const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat
            const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng
            if (!isFinite(lat) || !isFinite(lng)) { resolve(null); return }
            resolve({
              lat: Number(lat),
              lng: Number(lng),
              name: place.name ?? place.formatted_address ?? '',
            })
          } catch (e) {
            console.error('[googleMaps] details callback:', e)
            resolve(null)
          }
        })
      } catch (e) {
        console.error('[googleMaps] details:', e)
        resolve(null)
      }
    })
  } catch (e) {
    console.error('[googleMaps] getPlaceDetails:', e)
    return null
  }
}
