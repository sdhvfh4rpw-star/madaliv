/**
 * LocationSearch — champ de recherche avec autocomplétion
 * ─────────────────────────────────────────────────────────────
 * Priorité : Google Places (couverture complète d'Antananarivo).
 * Fallback : base statique antananarivo.js si Google indisponible
 * (clé absente, script non chargé, ou requête en échec).
 *
 * Navigation clavier : ↑ ↓ Entrée Échap. Clic externe → ferme.
 *
 * Props :
 *   label, placeholder, markerColor
 *   onSelect(loc)  — appelé avec { lat, lng, name, type? }
 *   value          — valeur contrôlée
 *   onClear()
 */

import { useState, useRef, useEffect } from 'react'
import { Search, X, MapPin, ChevronRight, Loader2 } from 'lucide-react'
import { searchLocations, TYPES } from '../../data/antananarivo'
import {
  isGoogleConfigured, loadGoogleMaps, getPlacePredictions, getPlaceDetails,
} from '../../lib/googleMaps'

// ── Normalisation des résultats (Google ou statique) ──────────
function staticToItems(query) {
  try {
    const res = searchLocations(query, 8) ?? []
    return res.map(loc => ({
      key:       `s_${loc.id}`,
      primary:   loc.name ?? '',
      secondary: TYPES[loc.type]?.label ?? '',
      icon:      TYPES[loc.type]?.icon ?? '📍',
      color:     TYPES[loc.type]?.color ?? '#ec4899',
      source:    'static',
      lat:       loc.lat,
      lng:       loc.lng,
      type:      loc.type,
    }))
  } catch (e) {
    console.error('[LocationSearch] staticToItems:', e)
    return []
  }
}
function googleToItems(preds) {
  if (!Array.isArray(preds)) return []
  return preds.map(p => ({
    key:       `g_${p.placeId}`,
    primary:   p.primary ?? p.description ?? '',
    secondary: p.secondary ?? '',
    icon:      '📍',
    color:     '#4285F4',
    source:    'google',
    placeId:   p.placeId,
  }))
}

export default function LocationSearch({
  label,
  placeholder,
  markerColor = '#E84C1E',
  onSelect,
  value = '',
  onClear,
}) {
  const [query,    setQuery]    = useState(value)
  const [results,  setResults]  = useState([])
  const [open,     setOpen]     = useState(false)
  const [focused,  setFocused]  = useState(-1)
  const [loading,  setLoading]  = useState(false)   // recherche en cours
  const [resolving,setResolving]= useState(false)   // récupération coords (Google)
  const [error,    setError]    = useState(null)

  const inputRef     = useRef(null)
  const listRef      = useRef(null)
  const containerRef = useRef(null)
  const debounceRef  = useRef(null)
  const lastQueryRef = useRef('')   // anti-résultat-obsolète

  // Précharger Google (silencieux) au montage
  useEffect(() => {
    if (isGoogleConfigured()) { loadGoogleMaps().catch(() => {}) }
  }, [])

  // Sync prop value → query
  useEffect(() => { setQuery(value) }, [value])

  // Fermer si clic hors composant
  useEffect(() => {
    function onOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false); setFocused(-1)
      }
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('touchstart', onOutside)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [])

  // ── Recherche (Google → fallback statique) ───────────────────
  async function runSearch(val) {
    lastQueryRef.current = val
    setLoading(true)
    setError(null)
    let items = []
    try {
      // 1. Google Places (null = indisponible)
      const preds = isGoogleConfigured() ? await getPlacePredictions(val) : null
      if (preds && preds.length > 0) {
        items = googleToItems(preds)
      } else {
        // 2. Fallback statique (Google off, vide, ou en échec)
        items = staticToItems(val)
      }
    } catch (e) {
      console.error('[LocationSearch] runSearch:', e)
      items = staticToItems(val)
    }
    // Ignorer si une recherche plus récente a eu lieu
    if (lastQueryRef.current !== val) return
    setResults(items)
    setOpen(items.length > 0)
    setLoading(false)
  }

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    setFocused(-1)
    clearTimeout(debounceRef.current)
    if (val.trim().length < 2) {
      setResults([]); setOpen(false); setLoading(false)
      return
    }
    debounceRef.current = setTimeout(() => { runSearch(val.trim()) }, 250)
  }

  // ── Sélection d'un résultat ──────────────────────────────────
  async function handleSelect(item) {
    if (!item) return
    setOpen(false)
    setFocused(-1)
    setQuery(item.primary)

    // Statique → coords déjà connues
    if (item.source === 'static') {
      if (isFinite(item.lat) && isFinite(item.lng)) {
        onSelect?.({ lat: Number(item.lat), lng: Number(item.lng), name: item.primary, type: item.type })
      }
      return
    }

    // Google → récupérer les coords via Place Details
    setResolving(true)
    setError(null)
    try {
      const details = await getPlaceDetails(item.placeId)
      if (details && isFinite(details.lat) && isFinite(details.lng)) {
        onSelect?.({ lat: details.lat, lng: details.lng, name: details.name || item.primary })
      } else {
        // Fallback : tenter une correspondance statique sur le nom
        const st = staticToItems(item.primary)[0]
        if (st && isFinite(st.lat) && isFinite(st.lng)) {
          onSelect?.({ lat: Number(st.lat), lng: Number(st.lng), name: st.primary, type: st.type })
        } else {
          setError('Position introuvable — appuyez sur la carte pour placer le marqueur.')
        }
      }
    } catch (e) {
      console.error('[LocationSearch] handleSelect details:', e)
      setError('Position introuvable — appuyez sur la carte.')
    } finally {
      setResolving(false)
    }
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setOpen(false)
    setFocused(-1)
    setError(null)
    onClear?.()
    inputRef.current?.focus()
  }

  // Navigation clavier
  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocused(f => Math.min(f + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocused(f => Math.max(f - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focused >= 0 && results[focused]) handleSelect(results[focused])
    } else if (e.key === 'Escape') {
      setOpen(false); setFocused(-1); inputRef.current?.blur()
    }
  }

  useEffect(() => {
    if (focused < 0 || !listRef.current) return
    listRef.current.children[focused]?.scrollIntoView({ block: 'nearest' })
  }, [focused])

  return (
    <div ref={containerRef} className="relative">
      {/* Label */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0" style={{ background: markerColor }} />
        {label}
      </p>

      {/* Input */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (query.trim().length >= 2 && results.length > 0) setOpen(true) }}
          placeholder={placeholder}
          autoComplete="off"
          className="input-field pl-9 pr-8 text-sm"
        />
        {/* Indicateur chargement / bouton clear */}
        {(loading || resolving) ? (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); handleClear() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      {/* Erreur de résolution */}
      {error && (
        <p className="text-[11px] text-red-500 mt-1">{error}</p>
      )}

      {/* Liste de résultats */}
      {open && results.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-[500]
            bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden
            max-h-64 overflow-y-auto animate-fade-in"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,.12)' }}
        >
          <ul ref={listRef} role="listbox">
            {results.map((item, i) => {
              const isFocused = i === focused
              return (
                <li
                  key={item.key ?? i}
                  role="option"
                  aria-selected={isFocused}
                  onMouseDown={e => { e.preventDefault(); handleSelect(item) }}
                  onMouseEnter={() => setFocused(i)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                    ${isFocused ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                >
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ background: (item.color ?? '#ec4899') + '18' }}
                  >
                    {item.icon ?? '📍'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.primary || '—'}</p>
                    {item.secondary && (
                      <p className="text-[10px] font-medium text-gray-400 truncate">{item.secondary}</p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-gray-300 shrink-0" />
                </li>
              )
            })}
          </ul>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
              <MapPin size={10} /> Ou appuyez sur la carte pour placer le marqueur
            </p>
          </div>
        </div>
      )}

      {/* Aucun résultat */}
      {open && results.length === 0 && !loading && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[500]
          bg-white border border-gray-200 rounded-2xl shadow-xl px-4 py-3 text-sm text-gray-500 animate-fade-in">
          Aucun résultat — appuyez directement sur la carte
        </div>
      )}
    </div>
  )
}
