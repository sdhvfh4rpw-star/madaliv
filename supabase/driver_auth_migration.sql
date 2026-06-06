-- ============================================================
-- FAINGANA — Authentification livreur
-- À exécuter dans Supabase Dashboard > SQL Editor
-- (idempotent : sûr à ré-exécuter)
-- ============================================================

-- ── 1. Lien compte auth ↔ livreur ───────────────────────────
-- La colonne existe déjà dans complete_schema.sql ; ceci la crée
-- si votre base est antérieure.
alter table drivers add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Un compte auth = un seul livreur
create unique index if not exists idx_drivers_user_id on drivers(user_id) where user_id is not null;

-- ── 2. RLS : permettre à un livreur de RÉCLAMER une course ───
-- L'ancienne policy d'UPDATE exigeait driver_id = my_driver_id()
-- dans le USING. Or, au moment d'accepter une course "pending",
-- driver_id vaut NULL → l'UPDATE ne touchait aucune ligne.
-- On autorise donc l'UPDATE des commandes pending, tout en
-- garantissant (WITH CHECK) qu'un livreur ne peut se l'attribuer
-- qu'à LUI-MÊME.
drop policy if exists "order_driver_update" on orders;
create policy "order_driver_update" on orders for update
  using      (status = 'pending' or driver_id = my_driver_id() or is_admin())
  with check (driver_id = my_driver_id() or is_admin());

-- (Pour mémoire — déjà présentes dans complete_schema.sql :)
--   • drivers       : policy "driver_own" → user_id = auth.uid()  (lecture/écriture de SA fiche)
--   • orders SELECT : policy "order_driver_see_pending" → voit les pending + ses courses
