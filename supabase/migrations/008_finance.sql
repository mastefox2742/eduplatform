-- ============================================================
-- 008 — Tarification, facturation, échéanciers, caisse, remises
-- Cahier des charges §14.1, §14.2, §14.3, §16.3, §22
--
-- Le schéma initial n'avait que `payments` (une transaction) et
-- `cash_payments`. Il manquait tout l'amont : ce que l'élève DOIT.
-- On introduit fee_structures -> invoices -> installments -> payments.
--
-- Règle §22 : un paiement ne devient 'success' que par
-- confirmation serveur vérifiée et idempotente.
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- TYPES
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE fee_kind AS ENUM (
  'inscription', 'reinscription', 'scolarite', 'transport', 'cantine',
  'examen', 'uniforme', 'activite', 'fourniture', 'penalite', 'autre'
);

CREATE TYPE invoice_status AS ENUM (
  'brouillon', 'emise', 'partiellement_payee', 'payee', 'en_retard', 'annulee'
);

CREATE TYPE discount_kind AS ENUM (
  'fratrie', 'bourse', 'aide_sociale', 'exceptionnelle', 'exoneration', 'personnel'
);

CREATE TYPE cash_session_status AS ENUM ('ouverte', 'fermee', 'rapprochee');

-- ═══════════════════════════════════════════════════════════════
-- GRILLES TARIFAIRES (§14.1)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE fee_structures (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year  TEXT NOT NULL,
  level_id       UUID REFERENCES levels(id) ON DELETE CASCADE,
  class_id       UUID REFERENCES classes(id) ON DELETE CASCADE,
  cycle          school_cycle,
  name           TEXT NOT NULL,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_struct ON fee_structures(school_id, academic_year) WHERE is_active;

-- Lignes de frais d'une grille
CREATE TABLE fee_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  structure_id      UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  kind              fee_kind NOT NULL DEFAULT 'scolarite',
  label             TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL,
  currency          TEXT DEFAULT 'XOF',
  is_mandatory      BOOLEAN DEFAULT TRUE,
  is_recurring      BOOLEAN DEFAULT FALSE,
  installments_count SMALLINT DEFAULT 1,     -- nombre de tranches
  due_month         SMALLINT,                -- mois d'échéance si unique
  order_num         SMALLINT DEFAULT 0,
  CHECK (amount >= 0),
  CHECK (installments_count >= 1)
);

CREATE INDEX idx_fee_items_struct ON fee_items(structure_id);

-- ═══════════════════════════════════════════════════════════════
-- REMISES ET BOURSES (§14.1)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE discounts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  academic_year  TEXT NOT NULL,
  kind           discount_kind NOT NULL,
  label          TEXT,
  percent        NUMERIC(5,2),           -- soit un %
  amount         NUMERIC(12,2),          -- soit un montant fixe
  applies_to     fee_kind,               -- NULL = tous les frais
  reason         TEXT,
  -- Workflow §3.3 : proposition gestionnaire -> décision directeur
  state          validation_state DEFAULT 'brouillon',
  requested_by   UUID REFERENCES profiles(id),
  approved_by    UUID REFERENCES profiles(id),
  approved_at    TIMESTAMPTZ,
  valid_from     DATE DEFAULT CURRENT_DATE,
  valid_until    DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CHECK (percent IS NOT NULL OR amount IS NOT NULL),
  CHECK (percent IS NULL OR (percent > 0 AND percent <= 100))
);

CREATE INDEX idx_discounts_student ON discounts(student_id, academic_year);

-- ═══════════════════════════════════════════════════════════════
-- FACTURES (§14.1)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guardian_id       UUID REFERENCES profiles(id),        -- responsable financier
  academic_year     TEXT NOT NULL,
  invoice_num       TEXT NOT NULL,
  structure_id      UUID REFERENCES fee_structures(id),
  gross_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance           NUMERIC(12,2) GENERATED ALWAYS AS (net_amount - paid_amount) STORED,
  currency          TEXT DEFAULT 'XOF',
  status            invoice_status DEFAULT 'brouillon',
  issued_at         DATE,
  due_date          DATE,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  pdf_path          TEXT,
  issued_by         UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, invoice_num),
  CHECK (paid_amount >= 0),
  CHECK (net_amount >= 0)
);

CREATE INDEX idx_invoices_student ON invoices(student_id, academic_year);
CREATE INDEX idx_invoices_status  ON invoices(school_id, status);
CREATE INDEX idx_invoices_overdue ON invoices(school_id, due_date)
  WHERE status IN ('emise','partiellement_payee','en_retard');

CREATE TABLE invoice_lines (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  fee_item_id  UUID REFERENCES fee_items(id),
  kind         fee_kind NOT NULL DEFAULT 'scolarite',
  label        TEXT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL,
  discount     NUMERIC(12,2) DEFAULT 0,
  net          NUMERIC(12,2) GENERATED ALWAYS AS (amount - discount) STORED
);

CREATE INDEX idx_invoice_lines ON invoice_lines(invoice_id);

-- ═══════════════════════════════════════════════════════════════
-- ÉCHÉANCIERS (§14.1 — tranches)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE installments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  number        SMALLINT NOT NULL,          -- tranche 1, 2, 3…
  label         TEXT,
  amount        NUMERIC(12,2) NOT NULL,
  paid_amount   NUMERIC(12,2) DEFAULT 0,
  due_date      DATE NOT NULL,
  paid_at       TIMESTAMPTZ,
  is_paid       BOOLEAN GENERATED ALWAYS AS (paid_amount >= amount) STORED,
  penalty       NUMERIC(12,2) DEFAULT 0,
  reminders_sent SMALLINT DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  UNIQUE (invoice_id, number)
);

CREATE INDEX idx_installments_due ON installments(school_id, due_date) WHERE paid_amount = 0;
CREATE INDEX idx_installments_student ON installments(student_id);

-- ═══════════════════════════════════════════════════════════════
-- PAIEMENTS — extension de la table existante
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id      UUID REFERENCES invoices(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS installment_id  UUID REFERENCES installments(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider        TEXT;      -- 'cinetpay','bizao'
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_ref    TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS webhook_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS raw_payload     JSONB;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason  TEXT;

-- §22 : une même notification traitée deux fois ne crée qu'un encaissement
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency
  ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_ref
  ON payments(provider, provider_ref) WHERE provider_ref IS NOT NULL;

-- Journal brut des webhooks, avant traitement (§14.2, §22)
CREATE TABLE payment_webhooks (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider       TEXT NOT NULL,
  provider_ref   TEXT,
  signature      TEXT,
  signature_ok   BOOLEAN DEFAULT FALSE,
  payload        JSONB NOT NULL,
  processed      BOOLEAN DEFAULT FALSE,
  processed_at   TIMESTAMPTZ,
  payment_id     UUID REFERENCES payments(id),
  error_msg      TEXT,
  received_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_unprocessed ON payment_webhooks(received_at) WHERE NOT processed;

-- Remboursements et trop-perçus (§14.2)
CREATE TABLE refunds (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payment_id    UUID REFERENCES payments(id),
  invoice_id    UUID REFERENCES invoices(id),
  student_id    UUID REFERENCES profiles(id),
  amount        NUMERIC(12,2) NOT NULL,
  reason        TEXT NOT NULL,
  method        cash_method DEFAULT 'especes',
  state         validation_state DEFAULT 'brouillon',
  requested_by  UUID REFERENCES profiles(id),
  approved_by   UUID REFERENCES profiles(id),
  approved_at   TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CHECK (amount > 0)
);

-- ═══════════════════════════════════════════════════════════════
-- CAISSE PHYSIQUE (§14.3 — ouverture/fermeture journalière)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE cash_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  site_id          UUID REFERENCES sites(id),
  cashier_id       UUID NOT NULL REFERENCES profiles(id),
  cashier_name     TEXT,
  opened_at        TIMESTAMPTZ DEFAULT NOW(),
  opening_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  closed_at        TIMESTAMPTZ,
  closing_balance  NUMERIC(12,2),
  counted_balance  NUMERIC(12,2),          -- comptage physique
  variance         NUMERIC(12,2) GENERATED ALWAYS AS (counted_balance - closing_balance) STORED,
  variance_note    TEXT,
  status           cash_session_status DEFAULT 'ouverte',
  reconciled_by    UUID REFERENCES profiles(id),
  reconciled_at    TIMESTAMPTZ,
  currency         TEXT DEFAULT 'XOF'
);

CREATE INDEX idx_cash_sessions ON cash_sessions(school_id, opened_at DESC);
-- Une seule caisse ouverte par caissier
CREATE UNIQUE INDEX idx_cash_one_open ON cash_sessions(cashier_id) WHERE status = 'ouverte';

-- Rattachement des encaissements espèces à une session de caisse
ALTER TABLE cash_payments ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES cash_sessions(id);
ALTER TABLE cash_payments ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id);
ALTER TABLE cash_payments ADD COLUMN IF NOT EXISTS installment_id UUID REFERENCES installments(id);

-- Mouvements de caisse hors scolarité (§14.3)
CREATE TABLE cash_movements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id   UUID REFERENCES cash_sessions(id),
  direction    TEXT NOT NULL CHECK (direction IN ('entree','sortie')),
  category     TEXT,
  label        TEXT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL,
  justification TEXT,
  receipt_url  TEXT,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CHECK (amount > 0)
);

-- ═══════════════════════════════════════════════════════════════
-- FOURNISSEURS ET DÉPENSES (§14.3)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE suppliers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  tax_id       TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS state validation_state DEFAULT 'valide';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES cash_sessions(id);

-- ═══════════════════════════════════════════════════════════════
-- NUMÉROTATION ET CALCULS
-- ═══════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

CREATE OR REPLACE FUNCTION next_invoice_num(p_school_id UUID)
RETURNS TEXT AS $$
  SELECT 'FAC-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
         LPAD(nextval('invoice_seq')::TEXT, 6, '0')
$$ LANGUAGE SQL VOLATILE;

-- Recalcule les totaux d'une facture depuis ses lignes et ses paiements
CREATE OR REPLACE FUNCTION recompute_invoice(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_gross    NUMERIC(12,2);
  v_discount NUMERIC(12,2);
  v_paid     NUMERIC(12,2);
  v_due      DATE;
BEGIN
  SELECT COALESCE(SUM(amount),0), COALESCE(SUM(discount),0)
    INTO v_gross, v_discount
    FROM invoice_lines WHERE invoice_id = p_invoice_id;

  SELECT COALESCE(SUM(amount),0) INTO v_paid
    FROM payments
   WHERE invoice_id = p_invoice_id AND status = 'success';

  SELECT COALESCE(v_paid,0) + COALESCE(SUM(cp.amount),0) INTO v_paid
    FROM cash_payments cp WHERE cp.invoice_id = p_invoice_id;

  SELECT due_date INTO v_due FROM invoices WHERE id = p_invoice_id;

  UPDATE invoices SET
    gross_amount    = v_gross,
    discount_amount = v_discount,
    net_amount      = v_gross - v_discount,
    paid_amount     = v_paid,
    status = CASE
      WHEN status = 'annulee'                       THEN 'annulee'
      WHEN v_paid >= (v_gross - v_discount)
           AND (v_gross - v_discount) > 0           THEN 'payee'
      WHEN v_paid > 0                               THEN 'partiellement_payee'
      WHEN v_due IS NOT NULL AND v_due < CURRENT_DATE THEN 'en_retard'
      WHEN status = 'brouillon'                     THEN 'brouillon'
      ELSE 'emise'
    END
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Un paiement confirmé met à jour la facture et la tranche
CREATE OR REPLACE FUNCTION on_payment_success()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'success') THEN
    IF NEW.installment_id IS NOT NULL THEN
      UPDATE installments
         SET paid_amount = paid_amount + NEW.amount,
             paid_at = COALESCE(paid_at, NOW())
       WHERE id = NEW.installment_id;
    END IF;
    IF NEW.invoice_id IS NOT NULL THEN
      PERFORM recompute_invoice(NEW.invoice_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_payment_success
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION on_payment_success();

-- Solde restant dû d'un élève sur une année
CREATE OR REPLACE FUNCTION student_balance(p_student_id UUID, p_year TEXT)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(balance), 0)
  FROM invoices
  WHERE student_id = p_student_id
    AND academic_year = p_year
    AND status NOT IN ('annulee','brouillon')
$$ LANGUAGE SQL STABLE;

-- Total des impayés d'une école (dashboard §8.1)
CREATE OR REPLACE FUNCTION school_unpaid_total(p_school_id UUID, p_year TEXT)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(balance), 0)
  FROM invoices
  WHERE school_id = p_school_id
    AND academic_year = p_year
    AND status IN ('emise','partiellement_payee','en_retard')
$$ LANGUAGE SQL STABLE;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER trg_fee_structures_updated_at BEFORE UPDATE ON fee_structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
