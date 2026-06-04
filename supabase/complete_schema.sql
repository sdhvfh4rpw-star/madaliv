-- ============================================================
-- MadaLiv — Schéma complet Supabase
-- Exécuter dans : Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Types ENUM ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending','accepted','pickup','ontheway','delivered','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE package_type AS ENUM (
    'doc','food','clothes','parcel','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE driver_status AS ENUM (
    'pending','approved','rejected','suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ══════════════════════════════════════════════════════════════
-- TABLES
-- ══════════════════════════════════════════════════════════════

-- ── clients ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT,
  phone           TEXT UNIQUE,
  phone_verified  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── drivers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  phone               TEXT UNIQUE NOT NULL,
  phone_verified      BOOLEAN NOT NULL DEFAULT false,
  city                TEXT,
  bike_model          TEXT,
  bike_color          TEXT,
  bike_plate          TEXT UNIQUE,
  -- Validation admin
  validation_status   driver_status NOT NULL DEFAULT 'pending',
  validated_by        UUID REFERENCES auth.users(id),
  validated_at        TIMESTAMPTZ,
  rejection_reason    TEXT,
  suspension_reason   TEXT,
  -- Photos (URL publiques après upload Storage)
  profile_photo_url   TEXT,
  cin_photo_url       TEXT,
  bike_photo_url      TEXT,
  -- Métriques
  rating              NUMERIC(3,2) NOT NULL DEFAULT 5.0
                        CHECK (rating BETWEEN 1 AND 5),
  rating_count        INTEGER NOT NULL DEFAULT 0,
  total_trips         INTEGER NOT NULL DEFAULT 0,
  is_available        BOOLEAN NOT NULL DEFAULT false,
  -- GPS (lat/lng simples, pas besoin de PostGIS)
  last_lat            NUMERIC(10,7),
  last_lng            NUMERIC(10,7),
  location_updated_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── driver_documents ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id    UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  doc_type     TEXT NOT NULL CHECK (doc_type IN ('profile','cin','bike')),
  storage_path TEXT NOT NULL,
  public_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── orders ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_code TEXT UNIQUE,
  client_id     UUID REFERENCES clients(id),
  driver_id     UUID REFERENCES drivers(id),
  -- Statut
  status        order_status NOT NULL DEFAULT 'pending',
  -- Colis
  package_type  package_type NOT NULL DEFAULT 'parcel',
  description   TEXT,
  notes         TEXT,
  is_urgent     BOOLEAN NOT NULL DEFAULT false,
  is_heavy      BOOLEAN NOT NULL DEFAULT false,
  -- Tarification
  price_ariary  INTEGER NOT NULL,
  driver_share  INTEGER NOT NULL,
  commission    INTEGER NOT NULL,
  distance_km   NUMERIC(6,2),
  -- Points GPS collecte
  pickup_label  TEXT,
  pickup_lat    NUMERIC(10,7),
  pickup_lng    NUMERIC(10,7),
  -- Points GPS livraison
  delivery_label TEXT,
  delivery_lat   NUMERIC(10,7),
  delivery_lng   NUMERIC(10,7),
  -- Photos de preuve
  pickup_proof_url    TEXT,
  pickup_proof_at     TIMESTAMPTZ,
  delivery_proof_url  TEXT,
  delivery_proof_at   TIMESTAMPTZ,
  -- Confirmation client
  driver_confirmed_by_client BOOLEAN NOT NULL DEFAULT false,
  driver_confirmed_at        TIMESTAMPTZ,
  -- Notation
  rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
  rating_comment  TEXT,
  rated_at        TIMESTAMPTZ,
  -- Horodatage
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── ratings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL UNIQUE REFERENCES orders(id),
  driver_id  UUID NOT NULL REFERENCES drivers(id),
  client_id  UUID REFERENCES clients(id),
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── commissions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL UNIQUE REFERENCES orders(id),
  driver_id         UUID REFERENCES drivers(id),
  total_price       INTEGER NOT NULL,
  driver_share      INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  commission_rate   NUMERIC(4,2) NOT NULL DEFAULT 0.15,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','paid')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── admin_actions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_actions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id   UUID REFERENCES auth.users(id),
  action     TEXT NOT NULL,
  target_id  UUID,
  reason     TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── driver_locations (historique GPS) ───────────────────────
CREATE TABLE IF NOT EXISTS driver_locations (
  id          BIGSERIAL PRIMARY KEY,
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  lat         NUMERIC(10,7) NOT NULL,
  lng         NUMERIC(10,7) NOT NULL,
  order_id    UUID REFERENCES orders(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- SÉQUENCE & TRIGGER : code de suivi MDL-XXXX
-- ══════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS tracking_seq START 1000;

CREATE OR REPLACE FUNCTION set_tracking_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := 'MDL-' || LPAD(nextval('tracking_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tracking_code ON orders;
CREATE TRIGGER trg_tracking_code
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_tracking_code();

-- ══════════════════════════════════════════════════════════════
-- TRIGGER : updated_at automatique
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_orders_updated ON orders;
CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_drivers_updated ON drivers;
CREATE TRIGGER trg_drivers_updated
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ══════════════════════════════════════════════════════════════
-- TRIGGER : suspension automatique si note < 3.5 (≥ 5 courses)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_driver_suspension()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  avg_r  NUMERIC;
  cnt    INTEGER;
BEGIN
  IF NEW.rating IS NULL OR NEW.driver_id IS NULL THEN RETURN NEW; END IF;

  SELECT AVG(r.rating)::NUMERIC(3,2), COUNT(*)
    INTO avg_r, cnt
    FROM ratings r WHERE r.driver_id = NEW.driver_id;

  UPDATE drivers
    SET rating = avg_r, rating_count = cnt, updated_at = now()
    WHERE id = NEW.driver_id;

  IF avg_r < 3.5 AND cnt >= 5 THEN
    UPDATE drivers SET
      validation_status = 'suspended',
      suspension_reason = 'Suspension auto : note ' || avg_r || '/5',
      is_available      = false,
      updated_at        = now()
    WHERE id = NEW.driver_id AND validation_status = 'approved';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_suspension ON ratings;
CREATE TRIGGER trg_auto_suspension
  AFTER INSERT OR UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION check_driver_suspension();

-- ══════════════════════════════════════════════════════════════
-- TRIGGER : créer la commission quand une commande est livrée
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_commission_on_delivery()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status <> 'delivered' THEN
    INSERT INTO commissions
      (order_id, driver_id, total_price, driver_share, commission_amount)
    VALUES
      (NEW.id, NEW.driver_id, NEW.price_ariary, NEW.driver_share, NEW.commission)
    ON CONFLICT (order_id) DO NOTHING;

    IF NEW.driver_id IS NOT NULL THEN
      UPDATE drivers SET total_trips = total_trips + 1 WHERE id = NEW.driver_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commission ON orders;
CREATE TRIGGER trg_commission
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION create_commission_on_delivery();

-- ══════════════════════════════════════════════════════════════
-- FONCTION RPC : statistiques admin (utilisée par AdminDashboard)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE res JSON;
BEGIN
  SELECT json_build_object(
    'drivers_total',         (SELECT COUNT(*)                FROM drivers),
    'drivers_pending',       (SELECT COUNT(*)                FROM drivers WHERE validation_status = 'pending'),
    'drivers_approved',      (SELECT COUNT(*)                FROM drivers WHERE validation_status = 'approved'),
    'drivers_suspended',     (SELECT COUNT(*)                FROM drivers WHERE validation_status = 'suspended'),
    'orders_today',          (SELECT COUNT(*)                FROM orders  WHERE created_at::date  = CURRENT_DATE),
    'orders_active',         (SELECT COUNT(*)                FROM orders  WHERE status IN ('pending','accepted','pickup','ontheway')),
    'orders_delivered_today',(SELECT COUNT(*)                FROM orders  WHERE status = 'delivered' AND updated_at::date = CURRENT_DATE),
    'orders_cancelled_today',(SELECT COUNT(*)                FROM orders  WHERE status = 'cancelled' AND updated_at::date = CURRENT_DATE),
    'revenue_today',         (SELECT COALESCE(SUM(price_ariary),0) FROM orders WHERE status = 'delivered' AND updated_at::date = CURRENT_DATE),
    'commission_today',      (SELECT COALESCE(SUM(commission),0)   FROM orders WHERE status = 'delivered' AND updated_at::date = CURRENT_DATE),
    'driver_payout_today',   (SELECT COALESCE(SUM(driver_share),0) FROM orders WHERE status = 'delivered' AND updated_at::date = CURRENT_DATE),
    'avg_rating',            (SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 5.0) FROM drivers WHERE rating_count > 0)
  ) INTO res;
  RETURN res;
END;
$$;

-- ── Commandes récentes pour l'admin ─────────────────────────
CREATE OR REPLACE FUNCTION get_recent_orders(p_limit INT DEFAULT 10)
RETURNS TABLE(
  id UUID, tracking_code TEXT, status order_status,
  client_name TEXT, driver_name TEXT,
  price_ariary INT, commission INT, driver_share INT,
  distance_km NUMERIC, created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
    SELECT o.id, o.tracking_code, o.status,
           c.name AS client_name, d.name AS driver_name,
           o.price_ariary, o.commission, o.driver_share,
           o.distance_km, o.created_at
    FROM orders o
    LEFT JOIN clients c ON c.id = o.client_id
    LEFT JOIN drivers d ON d.id = o.driver_id
    ORDER BY o.created_at DESC
    LIMIT p_limit;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- REALTIME
-- ══════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;

-- ══════════════════════════════════════════════════════════════
-- INDEX
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_orders_status         ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking       ON orders(tracking_code);
CREATE INDEX IF NOT EXISTS idx_orders_client         ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver         ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_created        ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drivers_status        ON drivers(validation_status);
CREATE INDEX IF NOT EXISTS idx_drivers_available     ON drivers(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_driver_locs_driver    ON driver_locations(driver_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_commissions_date      ON commissions(created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

-- ── Helpers ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'role') = 'admin',
    false
  );
$$;

CREATE OR REPLACE FUNCTION my_driver_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM drivers WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION my_client_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM clients WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── clients ──────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_own"   ON clients FOR ALL
  USING  (user_id = auth.uid() OR is_admin());
CREATE POLICY "client_insert" ON clients FOR INSERT
  WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

-- ── drivers ──────────────────────────────────────────────────
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_own"    ON drivers FOR ALL
  USING  (user_id = auth.uid() OR is_admin());
CREATE POLICY "driver_read_approved" ON drivers FOR SELECT
  USING  (validation_status = 'approved');

-- ── driver_documents ─────────────────────────────────────────
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_docs_own" ON driver_documents FOR ALL
  USING  (driver_id = my_driver_id() OR is_admin());

-- ── orders ───────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Client : ses commandes
CREATE POLICY "order_client_own" ON orders FOR ALL
  USING  (client_id = my_client_id() OR is_admin());
-- Livreur : commandes pending (pour les voir) + ses propres
CREATE POLICY "order_driver_see_pending" ON orders FOR SELECT
  USING  (status = 'pending' OR driver_id = my_driver_id() OR is_admin());
-- Livreur : mettre à jour ses propres courses
CREATE POLICY "order_driver_update" ON orders FOR UPDATE
  USING  (driver_id = my_driver_id() OR is_admin())
  WITH CHECK (driver_id = my_driver_id() OR is_admin());
-- Insertion publique (client non-authenti fié)
CREATE POLICY "order_insert_anon" ON orders FOR INSERT
  WITH CHECK (true);

-- ── ratings ──────────────────────────────────────────────────
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_all" ON ratings FOR ALL
  USING  (client_id = my_client_id() OR driver_id = my_driver_id() OR is_admin());
CREATE POLICY "ratings_insert" ON ratings FOR INSERT
  WITH CHECK (true);

-- ── commissions ──────────────────────────────────────────────
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commissions_driver" ON commissions FOR SELECT
  USING  (driver_id = my_driver_id() OR is_admin());

-- ── admin_actions ────────────────────────────────────────────
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_actions_only" ON admin_actions FOR ALL
  USING  (is_admin());

-- ── driver_locations ─────────────────────────────────────────
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_locs_own" ON driver_locations FOR ALL
  USING  (driver_id = my_driver_id() OR is_admin());
CREATE POLICY "driver_locs_insert" ON driver_locations FOR INSERT
  WITH CHECK (driver_id = my_driver_id());

-- ══════════════════════════════════════════════════════════════
-- STORAGE BUCKETS (exécuter séparément si besoin)
-- ══════════════════════════════════════════════════════════════
-- Dans Dashboard > Storage > New bucket :
--   Nom : driver-docs       | Public : NON  | Taille max : 10 MB
--   Nom : delivery-proofs   | Public : OUI  | Taille max : 10 MB
--
-- Policies Storage (driver-docs, privé) :
--   SELECT : bucket_id = 'driver-docs' AND (storage.foldername(name))[1] = auth.uid()::text OR is_admin()
--   INSERT : bucket_id = 'driver-docs' AND (storage.foldername(name))[1] = auth.uid()::text
--
-- Policies Storage (delivery-proofs, public en lecture) :
--   SELECT : true
--   INSERT : auth.uid() IS NOT NULL

-- ══════════════════════════════════════════════════════════════
-- COMPTE ADMIN (exécuter une seule fois)
-- ══════════════════════════════════════════════════════════════
-- 1. Dashboard > Authentication > Users > Add user
--    Email : admin@madaliv.mg  |  Password : (fort, ≥ 16 chars)
--    ✓ Auto-confirm
-- 2. Exécuter :
--    UPDATE auth.users
--      SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
--      WHERE email = 'admin@madaliv.mg';
