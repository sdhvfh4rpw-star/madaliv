/**
 * storage.js — MadaLiv
 * ─────────────────────────────────────────────────────────────
 * Utilitaires Supabase Storage pour les photos.
 *
 * Buckets :
 *   driver-docs      (privé) — photos livreur (CIN, selfie, moto)
 *   delivery-proofs  (public) — photos de preuve collecte/livraison
 */

import { supabase } from './supabase'

// ── Conversion data-URL → File ────────────────────────────────
export function dataURLtoFile(dataURL, filename = 'photo.jpg') {
  const [header, base64] = dataURL.split(',')
  const mime  = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const bytes = atob(base64)
  const u8    = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) u8[i] = bytes.charCodeAt(i)
  return new File([u8], filename, { type: mime })
}

// ── Upload générique ─────────────────────────────────────────
/**
 * @param {string} bucket  - 'driver-docs' | 'delivery-proofs'
 * @param {string} path    - chemin dans le bucket, ex: 'abc123/profile.jpg'
 * @param {File|string} fileOrDataURL
 * @returns {Promise<string>} URL publique (ou signée pour bucket privé)
 */
async function uploadFile(bucket, path, fileOrDataURL) {
  const file = typeof fileOrDataURL === 'string'
    ? dataURLtoFile(fileOrDataURL, path.split('/').pop())
    : fileOrDataURL

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw error

  if (bucket === 'delivery-proofs') {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  // Bucket privé → URL signée valable 1 an
  const { data, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365)
  if (signErr) throw signErr
  return data.signedUrl
}

// ── Photos livreur ───────────────────────────────────────────
/**
 * Upload les 4 documents d'un livreur.
 * @param {string} driverId
 * @param {{ profile: string, fullBody: string, cin: string, bike: string }} photos  data-URLs
 * @returns {Promise<{ profileUrl, fullBodyUrl, cinUrl, bikeUrl }>}
 */
export async function uploadDriverDocs(driverId, photos) {
  const base = `${driverId}`
  const [profileUrl, fullBodyUrl, cinUrl, bikeUrl] = await Promise.all([
    uploadFile('driver-docs', `${base}/profile.jpg`,   photos.profile),
    uploadFile('driver-docs', `${base}/fullbody.jpg`,  photos.fullBody),
    uploadFile('driver-docs', `${base}/cin.jpg`,       photos.cin),
    uploadFile('driver-docs', `${base}/bike.jpg`,      photos.bike),
  ])
  return { profileUrl, fullBodyUrl, cinUrl, bikeUrl }
}

// ── Photos de preuve (collecte / livraison) ──────────────────
/**
 * @param {string} orderId
 * @param {'pickup'|'delivery'} type
 * @param {string} dataURL
 * @returns {Promise<string>} URL publique
 */
export async function uploadProofPhoto(orderId, type, dataURL) {
  return uploadFile('delivery-proofs', `${orderId}/${type}.jpg`, dataURL)
}

// ── URL signée pour affichage sécurisé ───────────────────────
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket).createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}
