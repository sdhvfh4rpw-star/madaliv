/**
 * pricing.js — MadaLiv
 * ─────────────────────────────────────────────────────────────
 * Toutes les fonctions de calcul tarifaire.
 * Aucune dépendance extérieure — 100% testable en isolation.
 *
 * Grille tarifaire (prix client TTC frais mobile money inclus) :
 *   0–2 km      →  4 100 Ar   (base nette 4 000 × 1.02, arrondi 100)
 *   2–5 km      →  6 600 Ar
 *   5–10 km     → 10 200 Ar
 *   10–15 km    → 15 300 Ar
 *   15–30 km    → 22 500 Ar
 *   > 30 km     → refus
 *
 * Frais mobile money intégrés dans les prix :
 *   MOBILE_MONEY_FEE = 2 %  =  1.5 % (commission marchand MVola/Orange)
 *                               + 0.5 % (marge de sécurité)
 *   Les prix de la grille = prix de base × 1.02, arrondi au 100 Ar.
 *   Objectif : le commerçant ne subit pas les frais de transfert.
 *
 * Suppléments :
 *   Urgent        : base × 1.4
 *   Colis lourd   : +2 000 Ar (plat, après multiplication urgence)
 *   Soir (≥ 18h)  : +2 000 Ar
 *   Dimanche/férié: +3 000 Ar
 *
 * Commission admin : 15 %  →  livreur : 85 %
 *   ⚠️  Calculés sur le PRIX NET (totalPrice / 1.02), pas sur le prix TTC.
 *   Le client paie le frais mobile money ; le livreur et l'admin
 *   reçoivent leur part calculée sur le montant hors frais.
 */

// ── Constantes ───────────────────────────────────────────────

export const MAX_KM            = 30
export const COMMISSION_RATE   = 0.15
export const DRIVER_RATE       = 0.85
export const LONG_DISTANCE_KM  = 15   // seuil avertissement

/**
 * Frais de transfert mobile money absorbés dans le prix client.
 *   1.5 % = commission marchand MVola / Orange Money Madagascar
 *   0.5 % = marge de sécurité pour variations tarifaires opérateur
 *
 * Commission et part livreur sont calculées sur totalPrice / (1 + MOBILE_MONEY_FEE)
 * afin que le livreur et l'admin ne financent pas les frais de paiement.
 */
export const MOBILE_MONEY_FEE = 0.02

// Prix grille = prix_base × (1 + MOBILE_MONEY_FEE), arrondi au 100 Ar le plus proche
const TARIFF_GRID = [
  { maxKm:  2, price:  4100 },   // 4 000 × 1.02 = 4 080 → 4 100
  { maxKm:  5, price:  6600 },   // 6 500 × 1.02 = 6 630 → 6 600
  { maxKm: 10, price: 10200 },   // 10 000 × 1.02 = 10 200
  { maxKm: 15, price: 15300 },   // 15 000 × 1.02 = 15 300
  { maxKm: 30, price: 22500 },   // 22 000 × 1.02 = 22 440 → 22 500
]

export const SUPP_URGENT_FACTOR = 1.4
export const SUPP_HEAVY_AR      = 2000
export const SUPP_EVENING_AR    = 2000
export const SUPP_HOLIDAY_AR    = 3000

// ── Jours fériés Madagascar ──────────────────────────────────
// Format: [mois (1-12), jour] — hors Pâques (calculé dynamiquement)

const FIXED_HOLIDAYS = [
  [1,  1],   // Nouvel An
  [3, 29],   // Martyrs (Insurrection 1947)
  [5,  1],   // Fête du Travail
  [5, 25],   // Journée de l'Afrique
  [6, 26],   // Fête de l'Indépendance
  [8, 15],   // Assomption
  [11, 1],   // Toussaint
  [12, 25],  // Noël
]

/** Calcule la date du lundi de Pâques pour une année donnée (algorithme de Meeus/Jones/Butcher). */
function easterMonday(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day   = ((h + l - 7 * m + 114) % 31) + 1
  // +1 jour pour lundi de Pâques
  const easter = new Date(year, month - 1, day + 1)
  return [easter.getMonth() + 1, easter.getDate()]
}

/** Ascension = Pâques + 39 jours */
function ascension(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day   = ((h + l - 7 * m + 114) % 31) + 1
  const asc   = new Date(year, month - 1, day + 39)
  return [asc.getMonth() + 1, asc.getDate()]
}

/** Retourne true si `date` est un dimanche ou jour férié à Madagascar. */
export function isHolidayOrSunday(date = new Date()) {
  if (date.getDay() === 0) return true  // dimanche
  const m = date.getMonth() + 1
  const d = date.getDate()
  const y = date.getFullYear()
  const moving = [easterMonday(y), ascension(y)]
  const all    = [...FIXED_HOLIDAYS, ...moving]
  return all.some(([hm, hd]) => hm === m && hd === d)
}

/** Retourne true si l'heure est ≥ 18h00. */
export function isEvening(date = new Date()) {
  return date.getHours() >= 18
}

// ── Grille tarifaire ─────────────────────────────────────────

/**
 * Retourne le prix de base (Ar) pour une distance donnée.
 * Retourne null si la distance dépasse MAX_KM.
 */
export function getBasePrice(distanceKm) {
  if (distanceKm > MAX_KM) return null
  const tier = TARIFF_GRID.find(t => distanceKm <= t.maxKm)
  return tier ? tier.price : null
}

// ── Calcul complet ────────────────────────────────────────────

/**
 * Calcule le tarif complet d'une course.
 *
 * @param {number} distanceKm  - distance GPS à vol d'oiseau
 * @param {object} options
 *   @param {boolean} options.urgent   - livraison urgente
 *   @param {boolean} options.heavy    - colis > 2 kg
 *   @param {Date}   [options.date]    - date de la commande (défaut : maintenant)
 * @returns {PricingResult}
 */
export function calcPricing(distanceKm, options = {}) {
  const { urgent = false, heavy = false, date = new Date() } = options

  // ── Distance maximale dépassée ───────────────────────────
  if (distanceKm > MAX_KM) {
    return {
      valid: false,
      error: `Distance maximale dépassée — maximum ${MAX_KM} km`,
      distanceKm,
    }
  }

  const basePrice = getBasePrice(distanceKm)
  if (basePrice === null) {
    return { valid: false, error: 'Impossible de calculer le tarif', distanceKm }
  }

  // ── Supplément urgence (×1.3 sur le prix de base) ────────
  const afterUrgent = urgent ? Math.round(basePrice * SUPP_URGENT_FACTOR) : basePrice
  const urgentSupplement = afterUrgent - basePrice

  // ── Suppléments plats ─────────────────────────────────────
  const evening  = isEvening(date)
  const holiday  = isHolidayOrSunday(date)

  const heavySupplement   = heavy   ? SUPP_HEAVY_AR   : 0
  const eveningSupplement = evening ? SUPP_EVENING_AR  : 0
  const holidaySupplement = holiday ? SUPP_HOLIDAY_AR  : 0

  const totalSupplements = urgentSupplement + heavySupplement + eveningSupplement + holidaySupplement
  const totalPrice       = afterUrgent + heavySupplement + eveningSupplement + holidaySupplement

  // ── Commission & part livreur ─────────────────────────────
  // Calculées sur le PRIX NET (hors frais mobile money) afin que
  // livreur et admin ne subissent pas les 2 % de frais de transfert.
  // Le client paie totalPrice (TTC frais) ; la ventilation interne
  // se fait sur totalPrice / 1.02.
  const netPrice    = Math.round(totalPrice / (1 + MOBILE_MONEY_FEE))
  const mobileMoneyFeeAr = totalPrice - netPrice   // ≈ totalPrice × 0.0196
  const commission  = Math.round(netPrice * COMMISSION_RATE)
  const driverShare = netPrice - commission

  // ── Avertissement longue distance ─────────────────────────
  const isLongDistance = distanceKm > LONG_DISTANCE_KM

  return {
    valid:             true,
    distanceKm:        Math.round(distanceKm * 10) / 10,
    basePrice,
    urgentSupplement,
    heavySupplement,
    eveningSupplement,
    holidaySupplement,
    totalSupplements,
    totalPrice,         // prix TTC (inclut frais mobile money)
    netPrice,           // prix hors frais mobile money
    mobileMoneyFeeAr,   // montant des frais (totalPrice - netPrice)
    commission,         // 15 % de netPrice
    driverShare,        // 85 % de netPrice
    isLongDistance,
    // Flags appliqués
    urgentApplied:  urgent,
    heavyApplied:   heavy,
    eveningApplied: evening,
    holidayApplied: holiday,
  }
}

/**
 * Découpe un montant total en (commission, driverShare).
 * Utile pour les commandes déjà créées (sans recalculer).
 */
export function splitCommission(totalPrice) {
  const commission  = Math.round(totalPrice * COMMISSION_RATE)
  const driverShare = totalPrice - commission
  return { commission, driverShare }
}

// ── Formatage ─────────────────────────────────────────────────

/** Formate un nombre en "X XXX Ar" */
export function formatAr(amount) {
  return `${Math.round(amount).toLocaleString('fr-MG')} Ar`
}

/** Formate une distance en "X.X km" */
export function formatKm(km) {
  return `${(Math.round(km * 10) / 10).toFixed(1)} km`
}

// ── Résumé textuel pour la ligne livreur ─────────────────────

/**
 * Génère les lignes de détail tarifaire à afficher.
 * @returns {Array<{label, value, highlight?}>}
 */
export function getPriceBreakdownLines(pricing) {
  if (!pricing?.valid) return []
  const lines = [
    { label: `Prix de base (${formatKm(pricing.distanceKm)})`, value: formatAr(pricing.basePrice) },
  ]
  if (pricing.urgentApplied)  lines.push({ label: 'Supplément urgence (×1.3)',   value: `+${formatAr(pricing.urgentSupplement)}`,   color: 'orange' })
  if (pricing.heavyApplied)   lines.push({ label: 'Colis lourd (> 2 kg)',        value: `+${formatAr(pricing.heavySupplement)}`,    color: 'blue' })
  if (pricing.eveningApplied) lines.push({ label: 'Livraison soir (≥ 18h)',      value: `+${formatAr(pricing.eveningSupplement)}`,  color: 'purple' })
  if (pricing.holidayApplied) lines.push({ label: 'Dimanche / jour férié',       value: `+${formatAr(pricing.holidaySupplement)}`,  color: 'red' })
  return lines
}
