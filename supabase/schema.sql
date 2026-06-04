-- ============================================================
-- MadaLiv – Schéma Supabase v2 (avec système de sécurité)
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- ─── Types ENUM ─────────────────────────────────────────────

create type order_status as enum (
  'pending', 'accepted', 'pickup', 'ontheway', 'delivered', 'cancelled'
);

create type package_type as enum (
  'doc', 'food', 'clothes', 'parcel', 'other'
);

-- Statut de validation du livreur par l'admin
create type driver_validation_status as enum (
  'pending',    -- candidature soumise, en attente de review
  'approved',   -- validé par l'admin, peut travailler
  'rejected',   -- refusé (documents manquants, non conformes…)
  'suspended'   -- suspendu automatiquement (note < 3.5) ou manuellement
);

-- ─── Clients ────────────────────────────────────────────────
create table clients (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade,
  name         text not null,
  phone        text unique not null,
  phone_verified boolean default false,
  created_at   timestamptz default now()
);

-- ─── Drivers ────────────────────────────────────────────────
create table drivers (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references auth.users(id) on delete cascade,
  name                text not null,
  phone               text unique not null,
  phone_verified      boolean default false,
  city                text,
  bike_model          text,
  bike_color          text,
  bike_plate          text unique,

  -- Photos soumises à la validation
  profile_photo_url   text,   -- selfie du livreur
  cin_photo_url       text,   -- recto CIN malgache
  bike_photo_url      text,   -- moto + plaque lisible

  -- Validation admin
  validation_status   driver_validation_status default 'pending',
  validated_by        uuid references auth.users(id),  -- admin qui a approuvé/rejeté
  validated_at        timestamptz,
  rejection_reason    text,
  suspension_reason   text,

  -- Métriques
  rating              numeric(3,2) default 5.0 check (rating between 1 and 5),
  rating_count        integer default 0,
  total_trips         integer default 0,
  is_available        boolean default false,

  -- Localisation GPS temps réel
  location            geography(Point, 4326),
  location_updated_at timestamptz,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Vrai si le livreur est approuvé et non suspendu
create or replace function is_verified_driver(driver_id uuid)
returns boolean language sql stable as $$
  select validation_status = 'approved'
  from drivers where id = driver_id;
$$;

-- ─── Orders ─────────────────────────────────────────────────
create sequence tracking_seq start 1000;

create table orders (
  id                  uuid primary key default uuid_generate_v4(),
  tracking_code       text unique,
  client_id           uuid references clients(id),
  driver_id           uuid references drivers(id),

  status              order_status default 'pending',
  package_type        package_type default 'parcel',
  description         text,
  is_urgent           boolean default false,
  price_ariary        integer not null,

  -- Adresses
  pickup_address      text not null,
  pickup_coords       geography(Point, 4326),
  delivery_address    text not null,
  delivery_coords     geography(Point, 4326),

  -- Photos de preuve (§4 : photo collecte + livraison)
  pickup_proof_url    text,          -- photo prise par livreur à la collecte
  pickup_proof_at     timestamptz,
  delivery_proof_url  text,          -- photo prise par livreur à la livraison
  delivery_proof_at   timestamptz,

  -- Confirmation client (§3 : le client confirme le livreur assigné)
  driver_confirmed_by_client boolean default false,
  driver_confirmed_at        timestamptz,

  -- Notation (§5)
  rating              smallint check (rating between 1 and 5),
  rating_comment      text,
  rated_at            timestamptz,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Génère le code de tracking MDL-XXXX
create or replace function set_tracking_code()
returns trigger language plpgsql as $$
begin
  new.tracking_code := 'MDL-' || to_char(nextval('tracking_seq'), 'FM0000');
  return new;
end;
$$;

create trigger trg_tracking_code
  before insert on orders
  for each row when (new.tracking_code is null)
  execute function set_tracking_code();

-- ─── Suspension automatique (§5) ────────────────────────────
-- Déclenché après chaque mise à jour de rating sur orders
create or replace function check_driver_suspension()
returns trigger language plpgsql as $$
declare
  avg_rating numeric;
  trip_count integer;
begin
  if new.rating is null or new.driver_id is null then
    return new;
  end if;

  -- Recalculer la moyenne du livreur
  select
    avg(rating)::numeric(3,2),
    count(*)
  into avg_rating, trip_count
  from orders
  where driver_id = new.driver_id
    and rating is not null;

  -- Mettre à jour le driver
  update drivers
  set
    rating       = avg_rating,
    rating_count = trip_count,
    updated_at   = now()
  where id = new.driver_id;

  -- Suspension automatique si note < 3.5 ET au moins 5 courses notées
  if avg_rating < 3.5 and trip_count >= 5 then
    update drivers
    set
      validation_status  = 'suspended',
      suspension_reason  = 'Suspension automatique : note moyenne ' || avg_rating || '/5 (seuil : 3.5)',
      is_available       = false,
      updated_at         = now()
    where id = new.driver_id
      and validation_status = 'approved';
  end if;

  return new;
end;
$$;

create trigger trg_auto_suspension
  after insert or update of rating on orders
  for each row
  execute function check_driver_suspension();

-- ─── OTP / Vérification téléphone ───────────────────────────
create table phone_verifications (
  id         uuid primary key default uuid_generate_v4(),
  phone      text not null,
  code       text not null,            -- hash en prod (bcrypt/sha256)
  expires_at timestamptz not null,
  used       boolean default false,
  created_at timestamptz default now()
);

-- Nettoyer les OTP expirés (à appeler via pg_cron ou edge function)
create or replace function cleanup_expired_otps() returns void language sql as $$
  delete from phone_verifications where expires_at < now() - interval '1 hour';
$$;

-- ─── Driver location log ─────────────────────────────────────
create table driver_locations (
  id          bigserial primary key,
  driver_id   uuid references drivers(id) on delete cascade,
  location    geography(Point, 4326) not null,
  order_id    uuid references orders(id),     -- null si hors course
  recorded_at timestamptz default now()
);

-- ─── Reviews (log des notes) ─────────────────────────────────
create table reviews (
  id         uuid primary key default uuid_generate_v4(),
  order_id   uuid references orders(id) unique,
  driver_id  uuid references drivers(id),
  client_id  uuid references clients(id),
  rating     smallint not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz default now()
);

-- ─── Admin audit log ─────────────────────────────────────────
create table admin_actions (
  id          uuid primary key default uuid_generate_v4(),
  admin_id    uuid references auth.users(id),
  action      text not null,    -- 'approve_driver' | 'reject_driver' | 'suspend_driver'
  target_id   uuid,             -- id du driver concerné
  reason      text,
  created_at  timestamptz default now()
);

-- ─── Storage buckets ─────────────────────────────────────────
-- À créer dans le dashboard Supabase :
-- bucket: driver-docs     (private, accès admin + owner)
--   → {driver_id}/profile.jpg
--   → {driver_id}/cin.jpg
--   → {driver_id}/bike.jpg
-- bucket: delivery-proofs (private, accès client + driver de la course)
--   → {order_id}/pickup.jpg
--   → {order_id}/delivery.jpg

-- ─── RLS Policies ────────────────────────────────────────────
alter table orders              enable row level security;
alter table drivers             enable row level security;
alter table clients             enable row level security;
alter table reviews             enable row level security;
alter table phone_verifications enable row level security;
alter table admin_actions       enable row level security;

-- Clients : voir leurs propres commandes uniquement
create policy "client_own_orders" on orders
  for all using (
    client_id in (select id from clients where user_id = auth.uid())
  );

-- Livreurs : voir commandes pending + les leurs
create policy "driver_see_orders" on orders
  for select using (
    status = 'pending'
    or driver_id in (select id from drivers where user_id = auth.uid())
  );

-- Livreurs : mettre à jour statut, photos de preuve sur leurs courses
create policy "driver_update_own_orders" on orders
  for update using (
    driver_id in (select id from drivers where user_id = auth.uid())
  )
  with check (
    driver_id in (select id from drivers where user_id = auth.uid())
  );

-- Drivers : voir/modifier son propre profil
create policy "driver_own_profile" on drivers
  for all using (user_id = auth.uid());

-- Admin : accès complet (role 'admin' défini dans auth.users metadata)
create policy "admin_full_access_drivers" on drivers
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "admin_full_access_orders" on orders
  for all using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ─── Realtime subscriptions ──────────────────────────────────
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table driver_locations;
alter publication supabase_realtime add table drivers;   -- pour mise à jour badge vérifié

-- ─── Index ───────────────────────────────────────────────────
create index on orders(status);
create index on orders(driver_id);
create index on orders(client_id);
create index on orders(tracking_code);
create index on drivers(validation_status);
create index on drivers(rating);
create index on driver_locations(driver_id, recorded_at desc);
create index on reviews(driver_id);
create index on phone_verifications(phone, expires_at);

-- ─── Données de test ─────────────────────────────────────────
-- Insérer un admin (à remplacer par un vrai user_id après signup)
-- update auth.users set raw_app_meta_data = '{"role": "admin"}' where email = 'admin@madaliv.mg';
