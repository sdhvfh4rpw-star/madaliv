-- ============================================================
-- MadaLiv — Système de solde livreur
-- Exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- ── 1. Colonne pending_balance sur drivers ───────────────────
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS pending_balance INTEGER NOT NULL DEFAULT 0;

-- ── 2. Table driver_payments (historique des versements) ─────
CREATE TABLE IF NOT EXISTS driver_payments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id  UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  amount     INTEGER     NOT NULL,
  admin_id   UUID        REFERENCES auth.users(id),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_payments_driver ON driver_payments(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_payments_date   ON driver_payments(created_at DESC);

-- RLS driver_payments
ALTER TABLE driver_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "driver_see_own_payments" ON driver_payments
  FOR SELECT USING (driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid() LIMIT 1)
                    OR (auth.jwt()->'app_metadata'->>'role') = 'admin');
CREATE POLICY "admin_insert_payments" ON driver_payments
  FOR INSERT WITH CHECK ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- Realtime pour le dashboard livreur
ALTER PUBLICATION supabase_realtime ADD TABLE driver_payments;

-- ── 3. Trigger : créditer pending_balance à chaque livraison ─
CREATE OR REPLACE FUNCTION credit_driver_balance_on_delivery()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Déclenché uniquement quand le statut passe à 'delivered'
  IF NEW.status = 'delivered'
     AND OLD.status IS DISTINCT FROM 'delivered'
     AND NEW.driver_id IS NOT NULL
     AND NEW.driver_share IS NOT NULL
     AND NEW.driver_share > 0
  THEN
    UPDATE drivers
      SET pending_balance = pending_balance + NEW.driver_share,
          updated_at      = now()
      WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_driver_balance ON orders;
CREATE TRIGGER trg_credit_driver_balance
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION credit_driver_balance_on_delivery();

-- ── 4. Fonction RPC : payer un livreur ───────────────────────
-- Remet pending_balance à 0 et enregistre le paiement.
CREATE OR REPLACE FUNCTION pay_driver(
  p_driver_id UUID,
  p_admin_id  UUID DEFAULT NULL,
  p_note      TEXT DEFAULT NULL
)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_amount INTEGER;
BEGIN
  -- Lire et verrouiller le solde
  SELECT pending_balance INTO v_amount
    FROM drivers WHERE id = p_driver_id FOR UPDATE;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN 0;
  END IF;

  -- Remettre le solde à 0
  UPDATE drivers
    SET pending_balance = 0, updated_at = now()
    WHERE id = p_driver_id;

  -- Enregistrer le paiement
  INSERT INTO driver_payments(driver_id, amount, admin_id, note)
    VALUES (p_driver_id, v_amount, p_admin_id, p_note);

  RETURN v_amount;
END;
$$;

-- ── 5. Vue : livreurs avec solde en attente ──────────────────
CREATE OR REPLACE VIEW drivers_with_balance AS
  SELECT id, name, phone, pending_balance, rating, total_trips,
         profile_photo_url, validation_status
  FROM drivers
  WHERE pending_balance > 0
    AND validation_status = 'approved'
  ORDER BY pending_balance DESC;

-- ── 6. Vérification ─────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ Système de solde livreur installé.';
  RAISE NOTICE '   Table : driver_payments';
  RAISE NOTICE '   Colonne : drivers.pending_balance';
  RAISE NOTICE '   Trigger : trg_credit_driver_balance';
  RAISE NOTICE '   RPC : pay_driver(driver_id, admin_id, note)';
END;
$$;
