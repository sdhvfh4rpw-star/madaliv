/**
 * LocationSearch — champ de recherche avec autocomplétion
 * ─────────────────────────────────────────────────────────────
 * Recherche dans la base antananarivo.js en temps réel.
 * Navigation clavier : ↑ ↓ Entrée Échap.
 * Clic externe → ferme la liste.
 *
 * Props :
 *   label          string   — "Collecte" | "Livraison"
 *   placeholder    string
 *   markerColor    string   — couleur du pastille (CSS)
 *   onSelect(loc)  function — appelé avec { name, lat, lng, type }
 *   value          string   — valeur contrôlée (label du lieu sélectionné)
 *   onClear()      function — efface la sélection
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, MapPin, ChevronRight } from 'lucide-react'
import { searchLocations, TYPES } from '../../data/antananarivo'

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
  const [focused,  setFocused]  = useState(-1)   // index sélectionné au clavier

  const inputRef    = useRef(null)
  const listRef     = useRef(null)
  const containerRef= useRef(null)
  const debounceRef = useRef(null)

  // Sync prop value → query input (quand on clear ou sélectionne de l'extérieur)
  useEffect(() => { setQuery(value) }, [value])

  // Fermer si clic hors composant
  useEffect(() => {
    function onOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setFocused(-1)
      }
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('touchstart', onOutside)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [])

  // Recherche debounce 200ms
  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    setFocused(-1)
    clearTimeout(debounceRef.current)
    if (val.length < 2) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(() => {
      const res = searchLocations(val, 8)
      setResults(res)
      setOpen(res.length > 0)
    }, 180)
  }

  function handleSelect(loc) {
    setQuery(loc.name)
    setResults([])
    setOpen(false)
    setFocused(-1)
    onSelect?.(loc)
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setOpen(false)
    setFocused(-1)
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
      setOpen(false)
      setFocused(-1)
      inputRef.current?.blur()
    }
  }

  // Scroll item focusé dans la liste
  useEffect(() => {
    if (focused < 0 || !listRef.current) return
    const item = listRef.current.children[focused]
    item?.scrollIntoView({ block: 'nearest' })
  }, [focused])

  return (
    <div ref={containerRef} className="relative">
      {/* Label */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0"
          style={{ background: markerColor }}
        />
        {label}
      </p>

      {/* Input */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.length >= 2 && results.length > 0) setOpen(true)
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="input-field pl-9 pr-8 text-sm"
        />
        {query && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); handleClear() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Liste de résultats */}
      {open && results.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-[500]
            bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden
            max-h-64 overflow-y-auto animate-fade-in"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,.12)' }}
        >
          <ul ref={listRef} role="listbox">
            {results.map((loc, i) => {
              const typeInfo = TYPES[loc.type] || TYPES.repere
              const isFocused = i === focused
              return (
                <li
                  key={loc.id}
                  role="option"
                  aria-selected={isFocused}
                  onMouseDown={e => { e.preventDefault(); handleSelect(loc) }}
                  onMouseEnter={() => setFocused(i)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                    ${isFocused ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                >
                  {/* Icône type */}
                  <span
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ background: typeInfo.color + '18' }}
                  >
                    {typeInfo.icon}
                  </span>

                  {/* Nom + type */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{loc.name}</p>
                    <p className="text-[10px] font-medium" style={{ color: typeInfo.color }}>
                      {typeInfo.label}
                      {loc.arr && <span className="text-gray-400"> · Arr. {loc.arr}</span>}
                    </p>
                  </div>

                  {/* Flèche */}
                  <ChevronRight size={14} className="text-gray-300 shrink-0" />
                </li>
              )
            })}
          </ul>

          {/* Astuce */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
              <MapPin size={10} /> Ou appuyez sur la carte pour placer le marqueur
            </p>
          </div>
        </div>
      )}

      {/* Aucun résultat */}
      {open && results.length === 0 && query.length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[500]
          bg-white border border-gray-200 rounded-2xl shadow-xl px-4 py-3 text-sm text-gray-500 animate-fade-in">
          Aucun résultat — appuyez directement sur la carte
        </div>
      )}
    </div>
  )
}
