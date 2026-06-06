-- ============================================================
-- FAINGANA — Compte commerçant
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- Réutilise la table clients existante : on ajoute deux colonnes.
alter table clients add column if not exists is_merchant boolean not null default false;
alter table clients add column if not exists shop_name   text;

-- Index pour filtrer rapidement les commerçants (optionnel)
create index if not exists idx_clients_merchant on clients(is_merchant) where is_merchant = true;
