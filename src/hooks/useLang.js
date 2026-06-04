import { useState, useCallback } from 'react'
import { translations, defaultLang } from '../i18n/translations'

export function useLang() {
  const [lang, setLang] = useState(() => localStorage.getItem('madaliv_lang') || defaultLang)

  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations[defaultLang]?.[key] ?? key
  }, [lang])

  const toggleLang = useCallback(() => {
    const next = lang === 'fr' ? 'mg' : 'fr'
    setLang(next)
    localStorage.setItem('madaliv_lang', next)
  }, [lang])

  return { lang, t, toggleLang }
}
