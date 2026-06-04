-- ============================================================
-- MadaLiv — Authentification client
-- Exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- Ajouter les colonnes manquantes à la table clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email       TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url  TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS auth_email  TEXT UNIQUE;  -- email dérivé du tél. utilisé pour l'auth

-- Stocker le dernier ordre par date pour l'historique
CREATE INDEX IF NOT EXISTS idx_orders_client_date ON orders(client_id, created_at DESC);

-- Bucket Storage pour les avatars clients (public)
-- À créer dans Dashboard > Storage > New bucket :
--   Nom : client-avatars   |  Public : OUI  |  Max : 5 MB

-- Policy Storage client-avatars :
-- SELECT : true (public)
-- INSERT : auth.uid() IS NOT NULL
