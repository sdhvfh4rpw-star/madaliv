-- ============================================================
-- MadaLiv — Création du compte administrateur unique
-- ============================================================
-- À exécuter UNE SEULE FOIS dans le SQL Editor de Supabase.
-- ============================================================

-- ── 1. Créer l'utilisateur admin via auth.users ──────────────
--
-- OPTION A : via le dashboard Supabase
--   Authentication > Users > "Add user"
--   Email : admin@madaliv.mg
--   Password : (voir politique ci-dessous)
--   ⚠ Cochez "Auto-confirm user"
--
-- OPTION B : via SQL (remplacer les valeurs)

/*
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at
) values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@madaliv.mg',
  crypt('CHANGE_ME_STRONG_PASSWORD_MIN_16_CHARS', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"], "role": "admin"}',
  '{"name": "Administrateur MadaLiv"}',
  'authenticated',
  'authenticated',
  now(),
  now()
);
*/

-- ── 2. Assigner le rôle admin (sur un user existant) ────────
-- Remplacer l'UUID par celui de l'admin créé à l'étape 1.

update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
where email = 'admin@madaliv.mg';

-- Vérification
select id, email, raw_app_meta_data
from auth.users
where email = 'admin@madaliv.mg';

-- ── 3. Table admin_profiles (optionnel — métadonnées étendues)
create table if not exists admin_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text unique not null,
  created_at timestamptz default now(),
  last_login timestamptz
);

-- Insérer le profil admin
insert into admin_profiles (id, email)
select id, email from auth.users where email = 'admin@madaliv.mg'
on conflict (email) do nothing;

-- ── 4. Mettre à jour last_login via trigger ──────────────────
create or replace function update_admin_last_login()
returns trigger language plpgsql security definer as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update admin_profiles
    set last_login = new.last_sign_in_at
    where id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_admin_last_login
  after update on auth.users
  for each row execute function update_admin_last_login();

-- ── 5. RLS sur admin_profiles ────────────────────────────────
alter table admin_profiles enable row level security;

create policy "admin_own_profile" on admin_profiles
  for all using (id = auth.uid());

-- ── 6. Politique mot de passe Supabase ──────────────────────
-- Dans Supabase Dashboard > Authentication > Settings :
-- ✓ Enable email confirmations : OFF (admin créé manuellement)
-- ✓ Minimum password length   : 12
-- ✓ Password strength         : Strong (lettres + chiffres + symboles)

-- ── 7. Sécurité supplémentaire recommandée ───────────────────
-- Dans Supabase Dashboard > Authentication > Rate Limits :
-- Sign in attempts : 5 per minute (correspond à notre client-side guard)
-- Token expiry     : 3600 secondes (1 heure)

-- ── 8. IMPORTANT : Retirer l'accès public à auth.users ───────
-- Vérifier que la RLS sur auth.users est active (par défaut dans Supabase).
-- Ne jamais exposer auth.users via l'API publique.

-- ── Vérification finale ──────────────────────────────────────
do $$
declare
  admin_exists boolean;
begin
  select exists(
    select 1 from auth.users
    where email = 'admin@madaliv.mg'
      and (raw_app_meta_data ->> 'role') = 'admin'
  ) into admin_exists;

  if admin_exists then
    raise notice '✅ Compte admin configuré correctement.';
  else
    raise warning '⚠ Compte admin introuvable ou rôle manquant.';
  end if;
end;
$$;
