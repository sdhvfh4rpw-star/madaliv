-- ════════════════════════════════════════════════════════════════
-- FAINGANA / MadaLiv — Compte commerçant
-- À exécuter dans l'éditeur SQL de Supabase.
-- Réutilise la table clients existante : on lui ajoute deux colonnes.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_merchant boolean NOT NULL DEFAULT false;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS shop_name text;

-- Les clients déjà inscrits restent de simples clients (is_merchant = false).
-- shop_name reste NULL tant qu'ils ne deviennent pas commerçants.
