-- ============================================================
-- FAINGANA — Système de réclamation
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists claims (
  id           uuid        primary key default uuid_generate_v4(),
  order_code   text,
  client_phone text,
  category     text        not null,
  message      text,
  status       text        not null default 'open',   -- 'open' | 'resolved'
  created_at   timestamptz not null default now()
);

create index if not exists idx_claims_status  on claims(status);
create index if not exists idx_claims_created on claims(created_at desc);
create index if not exists idx_claims_phone   on claims(client_phone);

-- ── RLS ─────────────────────────────────────────────────────
alter table claims enable row level security;

-- N'importe qui peut créer une réclamation (client non authentifié inclus)
create policy "claims_insert_anyone" on claims
  for insert with check (true);

-- Seul l'admin peut lire / mettre à jour les réclamations
create policy "claims_admin_read" on claims
  for select using ((auth.jwt()->'app_metadata'->>'role') = 'admin');

create policy "claims_admin_update" on claims
  for update using ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- Le client peut relire ses propres réclamations (par téléphone)
-- (optionnel — décommenter si besoin côté client)
-- create policy "claims_client_read_own" on claims
--   for select using (true);

-- ── Realtime (optionnel) ─────────────────────────────────────
alter publication supabase_realtime add table claims;
