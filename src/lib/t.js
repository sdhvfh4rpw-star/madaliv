/**
 * t.js — MadaLiv
 * Traduction statique uniquement en français.
 * Remplace le hook useLang (suppression du malgache).
 */
import { translations } from '../i18n/translations'

const FR = translations.fr

/** Retourne le texte français pour une clé de traduction. */
export function t(key) {
  return FR[key] ?? key
}
