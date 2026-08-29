-- ============================================================
-- 010 — Modules optionnels : bibliothèque, transport, infirmerie,
--       stocks, maintenance, RH (congés)
-- Cahier des charges §18.1 à §18.5, §16.5
--
-- Ces modules sont activables par école via schools.features.
-- Ils ne sont jamais obligatoires pour faire tourner le cœur.
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- TYPES
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE loan_status      AS ENUM ('en_cours', 'rendu', 'en_retard', 'perdu');
CREATE TYPE stock_move_kind  AS ENUM ('entree', 'sortie', 'inventaire', 'perte');
CREATE TYPE ticket_priority  AS ENUM ('basse', 'normale', 'haute', 'urgente');
CREATE TYPE ticket_status    AS ENUM ('ouvert', 'assigne', 'en_cours', 'resolu', 'ferme');
CREATE TYPE leave_status     AS ENUM ('demande', 'approuve', 'refuse', 'annule');

-- ═══════════════════════════════════════════════════════════════
-- 18.1 BIBLIOTHÈQUE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE library_books (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  isbn          TEXT,
  title         TEXT NOT NULL,
  author        TEXT,
  publisher     TEXT,
  year          SMALLINT,
  category      TEXT,
  subject_id    UUID REFERENCES subjects(id),
  level_id      UUID REFERENCES levels(id),
  cover_url     TEXT,
  total_copies  INTEGER DEFAULT 1,
  available     INTEGER DEFAULT 1,
  shelf         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CHECK (available >= 0),
  CHECK (available <= total_copies)
);

CREATE INDEX idx_books_school ON library_books(school_id);
CREATE INDEX idx_books_title  ON library_books USING gin (title gin_trgm_ops);

CREATE TABLE library_copies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  book_id      UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  barcode      TEXT UNIQUE,
  condition    TEXT DEFAULT 'bon' CHECK (condition IN ('neuf','bon','use','abime','perdu')),
  is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE library_loans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  book_id       UUID NOT NULL REFERENCES library_books(id),
  copy_id       UUID REFERENCES library_copies(id),
  borrower_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  borrower_name TEXT,
  loaned_at     DATE DEFAULT CURRENT_DATE,
  due_date      DATE NOT NULL,
  returned_at   DATE,
  status        loan_status DEFAULT 'en_cours',
  penalty       NUMERIC(10,2) DEFAULT 0,
  penalty_paid  BOOLEAN DEFAULT FALSE,
  notes         TEXT,
  issued_by     UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loans_borrower ON library_loans(borrower_id, status);
CREATE INDEX idx_loans_overdue  ON library_loans(school_id, due_date) WHERE status = 'en_cours';

CREATE TABLE library_reservations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  book_id      UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reserved_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  fulfilled    BOOLEAN DEFAULT FALSE,
  UNIQUE (book_id, user_id, fulfilled)
);

-- ═══════════════════════════════════════════════════════════════
-- 18.2 TRANSPORT
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE transport_vehicles (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plate_number   TEXT NOT NULL,
  model          TEXT,
  capacity       INTEGER NOT NULL DEFAULT 0,
  driver_id      UUID REFERENCES profiles(id),
  driver_name    TEXT,
  driver_phone   TEXT,
  assistant_name TEXT,
  insurance_expiry DATE,
  inspection_expiry DATE,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, plate_number)
);

CREATE TABLE transport_routes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  vehicle_id   UUID REFERENCES transport_vehicles(id),
  direction    TEXT DEFAULT 'aller_retour' CHECK (direction IN ('aller','retour','aller_retour')),
  departure_time TIME,
  return_time  TIME,
  monthly_fee  NUMERIC(12,2),
  is_active    BOOLEAN DEFAULT TRUE
);

CREATE TABLE transport_stops (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  route_id    UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  order_num   SMALLINT NOT NULL,
  pickup_time TIME,
  latitude    NUMERIC(10,7),
  longitude   NUMERIC(10,7),
  UNIQUE (route_id, order_num)
);

CREATE TABLE transport_subscriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  route_id      UUID NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  stop_id       UUID REFERENCES transport_stops(id),
  academic_year TEXT NOT NULL,
  starts_on     DATE DEFAULT CURRENT_DATE,
  ends_on       DATE,
  is_active     BOOLEAN DEFAULT TRUE,
  UNIQUE (student_id, academic_year, route_id)
);

-- Présence à bord (§18.2)
CREATE TABLE transport_boardings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  route_id    UUID NOT NULL REFERENCES transport_routes(id),
  student_id  UUID NOT NULL REFERENCES profiles(id),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  direction   TEXT CHECK (direction IN ('aller','retour')),
  boarded_at  TIMESTAMPTZ,
  alighted_at TIMESTAMPTZ,
  status      TEXT DEFAULT 'present' CHECK (status IN ('present','absent','non_pointe')),
  recorded_by UUID REFERENCES profiles(id),
  UNIQUE (student_id, date, direction)
);

CREATE INDEX idx_boardings_date ON transport_boardings(school_id, date);

CREATE TABLE transport_incidents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  vehicle_id  UUID REFERENCES transport_vehicles(id),
  route_id    UUID REFERENCES transport_routes(id),
  kind        TEXT CHECK (kind IN ('retard','panne','accident','autre')),
  description TEXT NOT NULL,
  delay_min   INTEGER,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  parents_notified BOOLEAN DEFAULT FALSE,
  reported_by UUID REFERENCES profiles(id)
);

-- ═══════════════════════════════════════════════════════════════
-- 18.3 INFIRMERIE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE infirmary_visits (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  arrived_at     TIMESTAMPTZ DEFAULT NOW(),
  left_at        TIMESTAMPTZ,
  complaint      TEXT NOT NULL,
  observations   TEXT,
  care_given     TEXT,
  temperature    NUMERIC(4,1),
  outcome        TEXT CHECK (outcome IN ('retour_classe','repos','parent_appele','evacuation','hopital')),
  parent_called  BOOLEAN DEFAULT FALSE,
  parent_called_at TIMESTAMPTZ,
  attended_by    UUID REFERENCES profiles(id),
  attended_by_name TEXT,
  is_confidential BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_infirmary_student ON infirmary_visits(student_id, arrived_at DESC);

CREATE TABLE vaccinations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vaccine      TEXT NOT NULL,
  dose_num     SMALLINT,
  given_on     DATE,
  next_due     DATE,
  proof_path   TEXT,
  recorded_by  UUID REFERENCES profiles(id)
);

-- ═══════════════════════════════════════════════════════════════
-- 18.4 STOCKS ET MAINTENANCE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE stock_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  site_id        UUID REFERENCES sites(id),
  code           TEXT,
  name           TEXT NOT NULL,
  category       TEXT,   -- manuel, uniforme, fourniture, equipement, mobilier
  unit           TEXT DEFAULT 'unite',
  quantity       NUMERIC(12,2) DEFAULT 0,
  alert_threshold NUMERIC(12,2) DEFAULT 0,
  unit_cost      NUMERIC(12,2),
  supplier_id    UUID REFERENCES suppliers(id),
  location       TEXT,
  is_asset       BOOLEAN DEFAULT FALSE,   -- immobilisation
  acquired_on    DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, code)
);

CREATE INDEX idx_stock_low ON stock_items(school_id)
  WHERE quantity <= alert_threshold;

CREATE TABLE stock_movements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  item_id      UUID NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  kind         stock_move_kind NOT NULL,
  quantity     NUMERIC(12,2) NOT NULL,
  unit_cost    NUMERIC(12,2),
  reason       TEXT,
  reference    TEXT,
  destination  TEXT,
  moved_by     UUID REFERENCES profiles(id),
  moved_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_moves ON stock_movements(item_id, moved_at DESC);

-- Mise à jour automatique du stock
CREATE OR REPLACE FUNCTION apply_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stock_items SET quantity = CASE NEW.kind
    WHEN 'entree'     THEN quantity + NEW.quantity
    WHEN 'sortie'     THEN quantity - NEW.quantity
    WHEN 'perte'      THEN quantity - NEW.quantity
    WHEN 'inventaire' THEN NEW.quantity
  END
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_stock_movement
  AFTER INSERT ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION apply_stock_movement();

CREATE TABLE maintenance_tickets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  site_id       UUID REFERENCES sites(id),
  reference     TEXT,
  title         TEXT NOT NULL,
  description   TEXT,
  location      TEXT,
  item_id       UUID REFERENCES stock_items(id),
  priority      ticket_priority DEFAULT 'normale',
  status        ticket_status DEFAULT 'ouvert',
  reported_by   UUID REFERENCES profiles(id),
  assigned_to   UUID REFERENCES profiles(id),
  cost          NUMERIC(12,2),
  resolution    TEXT,
  photos        TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maint_open ON maintenance_tickets(school_id, priority)
  WHERE status NOT IN ('resolu','ferme');

-- ═══════════════════════════════════════════════════════════════
-- 18.5 RH — CONGÉS ET PLANNING
-- `teacher_contracts` et `monthly_payroll` existent déjà (001).
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE leave_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  staff_name    TEXT,
  kind          TEXT NOT NULL
                CHECK (kind IN ('annuel','maladie','maternite','paternite','sans_solde','formation','exceptionnel')),
  date_from     DATE NOT NULL,
  date_to       DATE NOT NULL,
  days_count    NUMERIC(5,1),
  reason        TEXT,
  proof_path    TEXT,
  status        leave_status DEFAULT 'demande',
  approved_by   UUID REFERENCES profiles(id),
  approved_at   TIMESTAMPTZ,
  refusal_note  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CHECK (date_to >= date_from)
);

CREATE INDEX idx_leaves_staff ON leave_requests(staff_id, date_from DESC);
CREATE INDEX idx_leaves_pending ON leave_requests(school_id) WHERE status = 'demande';

CREATE TABLE leave_balances (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  entitled_days NUMERIC(5,1) DEFAULT 0,
  taken_days    NUMERIC(5,1) DEFAULT 0,
  remaining     NUMERIC(5,1) GENERATED ALWAYS AS (entitled_days - taken_days) STORED,
  UNIQUE (staff_id, academic_year)
);

-- Dossier du personnel non enseignant (§18.5)
CREATE TABLE staff_records (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_num   TEXT,
  job_title      TEXT,
  department     TEXT,
  hired_on       DATE,
  left_on        DATE,
  contract_type  contract_type,
  base_salary    NUMERIC(12,2),
  bank_account   TEXT,
  mobile_money   TEXT,
  emergency_contact TEXT,
  documents      TEXT[] DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, staff_id)
);

-- ═══════════════════════════════════════════════════════════════
-- CANTINE (§14.1 mentionne les frais ; ici l'exploitation)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE canteen_menus (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  meal         TEXT DEFAULT 'dejeuner' CHECK (meal IN ('petit_dejeuner','dejeuner','gouter')),
  dishes       TEXT[] NOT NULL,
  allergens    TEXT[],
  published    BOOLEAN DEFAULT FALSE,
  UNIQUE (school_id, date, meal)
);

CREATE TABLE canteen_subscriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  diet          TEXT,      -- régime alimentaire
  allergies     TEXT[],
  days          SMALLINT[] DEFAULT '{0,1,2,3,4}',
  is_active     BOOLEAN DEFAULT TRUE,
  UNIQUE (student_id, academic_year)
);

CREATE TABLE canteen_meals_served (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  meal        TEXT DEFAULT 'dejeuner',
  served_at   TIMESTAMPTZ DEFAULT NOW(),
  scanned_code TEXT,
  UNIQUE (student_id, date, meal)
);

-- ═══════════════════════════════════════════════════════════════
-- VISITEURS (§11.3 — registre d'accès)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE visitors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  site_id       UUID REFERENCES sites(id),
  full_name     TEXT NOT NULL,
  phone         TEXT,
  id_document   TEXT,
  purpose       TEXT NOT NULL,
  person_visited UUID REFERENCES profiles(id),
  badge_num     TEXT,
  checked_in_at  TIMESTAMPTZ DEFAULT NOW(),
  checked_out_at TIMESTAMPTZ,
  recorded_by   UUID REFERENCES profiles(id),
  notes         TEXT
);

CREATE INDEX idx_visitors_date ON visitors(school_id, checked_in_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER trg_maint_updated_at BEFORE UPDATE ON maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_staff_records_updated_at BEFORE UPDATE ON staff_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
