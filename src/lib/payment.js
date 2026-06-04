/**
 * payment.js — MadaLiv
 * ─────────────────────────────────────────────────────────────
 * Intégration Mobile Money Madagascar.
 *
 * Modes :
 *   PROD  → Clés VITE_MVOLA_KEY / VITE_ORANGE_KEY configurées
 *            → Appel API réel (endpoints à renseigner par l'opérateur)
 *   TEST  → Clés absentes → simulation 3 s + message "Mode test"
 *
 * Variables .env :
 *   VITE_MVOLA_KEY    — Clé marchande MVola (Telma)
 *   VITE_ORANGE_KEY   — Clé marchande Orange Money Madagascar
 *
 * Codes USSD indicatifs (vérifier avec l'opérateur) :
 *   MVola       : #111*2*AMOUNT*REFERENCE# ou menu #111#
 *   Orange Money: #144*1*AMOUNT*REFERENCE# ou menu #144#
 */

const MVOLA_KEY  = import.meta.env.VITE_MVOLA_KEY   ?? ''
const ORANGE_KEY = import.meta.env.VITE_ORANGE_KEY  ?? ''

const TEST_DELAY_MS = 3000

// ── Helpers ───────────────────────────────────────────────────

/** Formate un montant en ariary pour l'affichage USSD. */
export function formatUssdAmount(amount) {
  return Math.round(amount).toString()
}

/**
 * Construit l'instruction USSD à afficher à l'utilisateur.
 * @param {'mvola'|'orange'} method
 * @param {number} amount   Montant en ariary
 * @param {string} ref      Code commande (ex: MDL-2847)
 */
export function getUssdInstruction(method, amount, ref) {
  const ar  = formatUssdAmount(amount)
  const cfg = PAYMENT_METHODS[method]
  return {
    code:    cfg.ussdCode(ar, ref),
    steps:   cfg.steps(ar, ref),
    hotline: cfg.hotline,
  }
}

/** Métadonnées des méthodes de paiement. */
export const PAYMENT_METHODS = {
  mvola: {
    id:      'mvola',
    name:    'MVola',
    logo:    '🔵',
    color:   'bg-blue-500',
    border:  'border-blue-400',
    bgLight: 'bg-blue-50',
    textDark:'text-blue-800',
    prefix:  ['032', '033'],
    hotline: '111',
    ussdCode: (ar, ref) => `#111*2*${ar}*${ref}#`,
    steps: (ar, ref) => [
      `Composez #111# sur votre téléphone`,
      `Choisissez "Payer un marchand"`,
      `Entrez le montant : ${Number(ar).toLocaleString('fr-MG')} Ar`,
      `Référence : ${ref}`,
      `Confirmez avec votre code PIN MVola`,
    ],
  },
  orange: {
    id:      'orange',
    name:    'Orange Money',
    logo:    '🟠',
    color:   'bg-orange-500',
    border:  'border-orange-400',
    bgLight: 'bg-orange-50',
    textDark:'text-orange-800',
    prefix:  ['032', '034'],
    hotline: '900',
    ussdCode: (ar, ref) => `#144*1*${ar}*${ref}#`,
    steps: (ar, ref) => [
      `Composez #144# sur votre téléphone`,
      `Choisissez "Paiement marchand"`,
      `Entrez le montant : ${Number(ar).toLocaleString('fr-MG')} Ar`,
      `Référence : ${ref}`,
      `Confirmez avec votre code PIN Orange Money`,
    ],
  },
}

// ── Résultat standard ─────────────────────────────────────────
/**
 * @typedef {object} PaymentResult
 * @property {boolean} ok
 * @property {'mvola'|'orange'|'cash'} method
 * @property {'paid'|'cash'|'failed'} status
 * @property {boolean} testMode
 * @property {string} [transactionId]
 * @property {string} [error]
 */

// ── MVola ─────────────────────────────────────────────────────

/**
 * Initie un paiement MVola.
 * En mode test (VITE_MVOLA_KEY absent) → simule 3 s de délai.
 *
 * @param {number} amount      Montant en ariary
 * @param {string} phone       Numéro MVola du client (ex: 032 XX XXX XX)
 * @param {string} orderCode   Code commande (ex: MDL-2847)
 * @returns {Promise<PaymentResult>}
 */
export async function initMVola(amount, phone, orderCode) {
  if (!MVOLA_KEY) {
    // ── Mode test ──────────────────────────────────────────────
    console.log('[payment] MVola — MODE TEST (3 s)')
    await new Promise(r => setTimeout(r, TEST_DELAY_MS))
    return {
      ok: true,
      method:        'mvola',
      status:        'paid',
      testMode:      true,
      transactionId: `TEST-MVola-${Date.now()}`,
    }
  }

  // ── Mode production ────────────────────────────────────────
  // TODO : remplacer par l'endpoint réel MVola Merchant API
  // Endpoint approximatif (à confirmer avec Telma) :
  //   POST https://devapi.mvola.mg/mvola/mm/transactions/type/merchantpay/1.0.0/
  //   Headers: Authorization: Bearer <token>, X-Callback-URL, X-CorrelationID
  //   Body: { amount, currency: 'Ar', descriptionText: orderCode,
  //           requestingOrganisationTransactionReference: orderCode,
  //           debitParty: [{ key:'msisdn', value: phone }], ... }
  try {
    console.log('[payment] MVola prod → amount:', amount, 'phone:', phone, 'ref:', orderCode)
    // const res = await fetch('https://devapi.mvola.mg/...', { method:'POST', ... })
    // const data = await res.json()
    // return { ok: res.ok, method:'mvola', status: res.ok ? 'paid' : 'failed', transactionId: data.serverCorrelationId }
    throw new Error('Endpoint MVola non configuré — implémentez l\'appel API ici')
  } catch (err) {
    console.error('[payment] MVola error →', err)
    return { ok: false, method: 'mvola', status: 'failed', error: err.message }
  }
}

// ── Orange Money ──────────────────────────────────────────────

/**
 * Initie un paiement Orange Money Madagascar.
 * En mode test (VITE_ORANGE_KEY absent) → simule 3 s de délai.
 *
 * @param {number} amount      Montant en ariary
 * @param {string} phone       Numéro Orange Money du client
 * @param {string} orderCode   Code commande
 * @returns {Promise<PaymentResult>}
 */
export async function initOrangeMoney(amount, phone, orderCode) {
  if (!ORANGE_KEY) {
    // ── Mode test ──────────────────────────────────────────────
    console.log('[payment] Orange Money — MODE TEST (3 s)')
    await new Promise(r => setTimeout(r, TEST_DELAY_MS))
    return {
      ok: true,
      method:        'orange',
      status:        'paid',
      testMode:      true,
      transactionId: `TEST-Orange-${Date.now()}`,
    }
  }

  // ── Mode production ────────────────────────────────────────
  // TODO : remplacer par l'endpoint réel Orange Money Madagascar API
  // Endpoint approximatif (à confirmer avec Orange Madagascar) :
  //   POST https://api.orange.com/orange-money-webpay/mg/v1/webpayment
  //   Headers: Authorization: Bearer <token>
  //   Body: { merchant_key: ORANGE_KEY, currency: 'MGA', order_id: orderCode,
  //           amount, return_url, cancel_url, notif_url }
  try {
    console.log('[payment] Orange Money prod → amount:', amount, 'phone:', phone, 'ref:', orderCode)
    throw new Error('Endpoint Orange Money non configuré — implémentez l\'appel API ici')
  } catch (err) {
    console.error('[payment] Orange Money error →', err)
    return { ok: false, method: 'orange', status: 'failed', error: err.message }
  }
}

/** Paiement à la livraison (pas d'appel réseau). */
export async function initCashPayment() {
  return { ok: true, method: 'cash', status: 'cash', testMode: false }
}
