-- ============================================================
-- EduSchool — Schéma PostgreSQL initial
-- Migration depuis Firestore (NoSQL) vers PostgreSQL (relationnel)
--
-- Conventions :
--   - Toutes les tables ont school_id pour le multi-tenant
--   - RLS (Row Level Security) activé sur toutes les tables
--   - UUIDs pour les IDs primaires
--   - Timestamps en timestamptz (timezone-aware)
-- ============================================================

-- Extensions
-- uuid-ossp n'est plus necessaire : gen_random_uuid() est integre a
-- PostgreSQL depuis la 13. Supabase installe les extensions dans le
-- schema `extensions`, hors du chemin de recherche des migrations, ce
-- qui rendait uuid_generate_v4() introuvable a l'application.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Pour la recherche full-text

-- ═══════════════════════════════════════════════════════════════
-- TYPES ÉNUMÉRÉS
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE user_role AS ENUM ('admin', 'direction', 'teacher', 'student', 'parent');
CREATE TYPE school_status AS ENUM ('active', 'suspended', 'trial');
CREATE TYPE school_plan AS ENUM ('free', 'starter', 'pro', 'enterprise');
CREATE TYPE archive_status AS ENUM ('active', 'archived', 'transferred');
CREATE TYPE archive_reason AS ENUM ('graduated', 'transferred', 'dropout', 'expelled');
CREATE TYPE bulletin_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'published');
CREATE TYPE trimestre AS ENUM ('T1', 'T2', 'T3');
CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent', 'justified', 'pending');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE cash_method AS ENUM ('especes', 'cheque', 'virement', 'autre');
CREATE TYPE contract_type AS ENUM ('permanent', 'contractuel', 'vacataire');
CREATE TYPE payment_basis AS ENUM ('monthly', 'hourly');
CREATE TYPE payroll_status AS ENUM ('draft', 'validated', 'paid');
CREATE TYPE discipline_type AS ENUM ('sanction', 'merite');
CREATE TYPE sanction_type AS ENUM ('avertissement', 'blame', 'retenue', 'exclusion_temp', 'exclusion_def');
CREATE TYPE merite_type AS ENUM ('encouragement', 'tableau_honneur', 'felicitations', 'prix_excellence');
CREATE TYPE lead_status AS ENUM ('nouveau', 'contacte', 'visite', 'inscrit', 'perdu');
CREATE TYPE messaging_channel AS ENUM ('whatsapp', 'sms', 'push');
CREATE TYPE export_format AS ENUM ('xlsx', 'csv', 'pdf');
CREATE TYPE export_status AS ENUM ('queued', 'processing', 'done', 'error');
CREATE TYPE remplacement_status AS ENUM ('pending', 'accepted', 'rejected', 'validated');

-- ═══════════════════════════════════════════════════════════════
-- ÉCOLES (multi-tenant root)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE schools (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  logo_url         TEXT,
  address_street   TEXT,
  address_city     TEXT,
  address_country  TEXT DEFAULT 'CI',
  contact_email    TEXT,
  -- Une ecole en essai est sur le plan gratuit : l'essai est un statut,
  -- pas un plan. 'trial' appartient a school_status, pas a school_plan.
  plan             school_plan DEFAULT 'free',
  status           school_status DEFAULT 'trial',
  active_students  INTEGER DEFAULT 0,
  academic_year    TEXT DEFAULT '2025-2026',
  features         JSONB DEFAULT '{"aiEnabled": false, "examBank": false, "analytics": false}'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- UTILISATEURS (extension de auth.users de Supabase)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id       UUID REFERENCES schools(id),
  role            user_role NOT NULL DEFAULT 'student',
  display_name    TEXT,
  photo_url       TEXT,
  phone           TEXT,
  whatsapp        TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  -- Élève
  class_id        UUID,
  class_name      TEXT,
  level_id        UUID,
  level_name      TEXT,
  student_number  TEXT,
  parent_email    TEXT,
  birth_date      DATE,
  birth_place     TEXT,
  gender          TEXT,
  archive_status  archive_status DEFAULT 'active',
  archive_reason  archive_reason,
  archived_at     TIMESTAMPTZ,
  academic_history JSONB DEFAULT '[]'::jsonb,
  -- Parent
  children        JSONB DEFAULT '[]'::jsonb,
  -- Professeur
  subjects        TEXT[] DEFAULT '{}',
  employee_id     TEXT,
  -- Métadonnées
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_profiles_school_role ON profiles(school_id, role);
CREATE INDEX idx_profiles_class ON profiles(class_id);
CREATE INDEX idx_profiles_parent_email ON profiles(parent_email);

-- ═══════════════════════════════════════════════════════════════
-- CLASSES ET NIVEAUX
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE levels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  short_name    TEXT,
  order_num     INTEGER DEFAULT 0,
  cycle         TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE classes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  level_id            UUID REFERENCES levels(id),
  name                TEXT NOT NULL,
  level_name          TEXT,
  academic_year       TEXT DEFAULT '2025-2026',
  main_teacher_id     UUID REFERENCES profiles(id),
  main_teacher_name   TEXT,
  student_count       INTEGER DEFAULT 0,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classes_school ON classes(school_id);

-- ═══════════════════════════════════════════════════════════════
-- MATIÈRES ET EMPLOIS DU TEMPS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE subjects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  short_name   TEXT,
  color        TEXT DEFAULT '#2563EB',
  icon_emoji   TEXT DEFAULT '📚',
  coefficient  NUMERIC(4,2) DEFAULT 1,
  is_active    BOOLEAN DEFAULT TRUE
);

CREATE TABLE schedule_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id        UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id      UUID REFERENCES profiles(id),
  subject_id      UUID REFERENCES subjects(id),
  day_of_week     SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Lundi
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  room            TEXT,
  academic_year   TEXT DEFAULT '2025-2026',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slots_school_class ON schedule_slots(school_id, class_id);
CREATE INDEX idx_slots_teacher ON schedule_slots(teacher_id);

-- ═══════════════════════════════════════════════════════════════
-- BULLETINS DE NOTES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE bulletins (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES profiles(id),
  student_name      TEXT NOT NULL,
  class_id          UUID REFERENCES classes(id),
  class_name        TEXT,
  teacher_id        UUID REFERENCES profiles(id),
  teacher_name      TEXT,
  trimestre         trimestre NOT NULL,
  school_year       TEXT DEFAULT '2025-2026',
  subject           TEXT NOT NULL,
  average           NUMERIC(5,2),
  conduct           TEXT DEFAULT 'Bien',
  appreciation      TEXT,
  director_comment  TEXT,
  rejection_reason  TEXT,
  status            bulletin_status DEFAULT 'draft',
  submitted_at      TIMESTAMPTZ,
  approved_at       TIMESTAMPTZ,
  published_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Évaluations liées à un bulletin
CREATE TABLE bulletin_assessments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_id   UUID NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  value         NUMERIC(5,2),
  max_score     NUMERIC(5,2) DEFAULT 20,
  coefficient   NUMERIC(4,2) DEFAULT 1
);

CREATE INDEX idx_bulletins_school_student ON bulletins(school_id, student_id);
CREATE INDEX idx_bulletins_school_status ON bulletins(school_id, status);
CREATE INDEX idx_bulletins_school_class ON bulletins(school_id, class_id);
CREATE INDEX idx_bulletins_trimestre ON bulletins(school_id, trimestre);

-- ═══════════════════════════════════════════════════════════════
-- PRÉSENCES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE attendance_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id      UUID REFERENCES classes(id),
  class_name    TEXT,
  teacher_id    UUID REFERENCES profiles(id),
  subject       TEXT,
  date          DATE NOT NULL,
  day_label     TEXT,
  school_year   TEXT DEFAULT '2025-2026',
  saved_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attendance_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id     UUID REFERENCES profiles(id),
  student_name   TEXT,
  status         attendance_status DEFAULT 'present',
  note           TEXT
);

CREATE UNIQUE INDEX idx_attendance_session_student ON attendance_records(session_id, student_id);
CREATE INDEX idx_attendance_school_date ON attendance_sessions(school_id, date);

-- ═══════════════════════════════════════════════════════════════
-- PAIEMENTS (Mobile Money + Espèces)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id       UUID REFERENCES profiles(id),
  student_name     TEXT,
  parent_id        UUID REFERENCES profiles(id),
  parent_name      TEXT,
  fee_id           TEXT,
  fee_label        TEXT,
  amount           NUMERIC(12,2) NOT NULL,
  currency         TEXT DEFAULT 'XOF',
  network          TEXT,         -- 'Orange Money', 'Wave', etc.
  transaction_id   TEXT UNIQUE,
  status           payment_status DEFAULT 'pending',
  month            TEXT,         -- "2026-05"
  date             DATE,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cash_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id       UUID REFERENCES profiles(id),
  student_name     TEXT NOT NULL,
  parent_name      TEXT NOT NULL,
  parent_phone     TEXT,
  fee_label        TEXT NOT NULL,
  amount           NUMERIC(12,2) NOT NULL,
  currency         TEXT DEFAULT 'XOF',
  method           cash_method DEFAULT 'especes',
  cheque_num       TEXT,
  bank_name        TEXT,
  receipt_num      TEXT UNIQUE,
  storage_url      TEXT,
  received_by      UUID REFERENCES profiles(id),
  received_by_name TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE receipts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  payment_id    UUID REFERENCES payments(id),
  student_id    UUID REFERENCES profiles(id),
  parent_id     UUID REFERENCES profiles(id),
  amount        NUMERIC(12,2),
  currency      TEXT DEFAULT 'XOF',
  fee_label     TEXT,
  receipt_num   TEXT UNIQUE NOT NULL,
  storage_url   TEXT NOT NULL,
  generated_by  UUID REFERENCES profiles(id),
  generated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_school_parent ON payments(school_id, parent_id);
CREATE INDEX idx_payments_school_status ON payments(school_id, status);

-- ═══════════════════════════════════════════════════════════════
-- DISCIPLINE & VIE SCOLAIRE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE discipline_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES profiles(id),
  student_name      TEXT NOT NULL,
  class_id          UUID REFERENCES classes(id),
  class_name        TEXT,
  type              discipline_type NOT NULL,
  sanction          sanction_type,
  merite            merite_type,
  motif             TEXT NOT NULL,
  description       TEXT,
  issued_by         UUID REFERENCES profiles(id),
  issued_by_name    TEXT,
  date              DATE DEFAULT CURRENT_DATE,
  duration_days     INTEGER,         -- Pour exclusion_temp
  parent_notified   BOOLEAN DEFAULT FALSE,
  parent_notified_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discipline_school_student ON discipline_records(school_id, student_id);

-- ═══════════════════════════════════════════════════════════════
-- DEVOIRS & CHECK-LIST
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE devoirs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id       UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id     UUID REFERENCES profiles(id),
  teacher_name   TEXT,
  class_name     TEXT,
  subject_name   TEXT,
  title          TEXT NOT NULL,
  description    TEXT,
  due_date       DATE NOT NULL,
  due_time       TIME,
  trimestre      trimestre,
  points         INTEGER DEFAULT 0,
  attachments    TEXT[] DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE devoir_submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devoir_id   UUID NOT NULL REFERENCES devoirs(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES profiles(id),
  status      TEXT DEFAULT 'done' CHECK (status IN ('pending', 'done', 'late')),
  checked_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (devoir_id, student_id)
);

CREATE INDEX idx_devoirs_school_class ON devoirs(school_id, class_id);

-- ═══════════════════════════════════════════════════════════════
-- GAMIFICATION
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE student_xp (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_xp    INTEGER DEFAULT 0,
  level_num   INTEGER DEFAULT 1,
  streak      INTEGER DEFAULT 0,
  badges      TEXT[] DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, student_id)
);

-- ═══════════════════════════════════════════════════════════════
-- ANNONCES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  author_id    UUID REFERENCES profiles(id),
  author_name  TEXT,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  category     TEXT DEFAULT 'general'
               CHECK (category IN ('general','urgent','event','exam','holiday')),
  audience     TEXT DEFAULT 'all'
               CHECK (audience IN ('all','parents','students','teachers')),
  read_by      UUID[] DEFAULT '{}',
  opened_by    UUID[] DEFAULT '{}',
  pinned       BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_school ON announcements(school_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- MESSAGERIE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE message_threads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  participants UUID[] NOT NULL,
  last_message TEXT,
  last_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES profiles(id),
  sender_name TEXT,
  sender_role user_role,
  text        TEXT NOT NULL,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  is_read     BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_messages_thread ON messages(thread_id, sent_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- COURS ET EXERCICES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE courses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id     UUID REFERENCES profiles(id),
  teacher_name   TEXT,
  subject        TEXT,
  class_target   TEXT,
  title          TEXT NOT NULL,
  content        TEXT,
  pdf_url        TEXT,
  is_published   BOOLEAN DEFAULT FALSE,
  view_count     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exercises (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  course_id      UUID REFERENCES courses(id),
  teacher_id     UUID REFERENCES profiles(id),
  subject_name   TEXT,
  level_name     TEXT,
  title          TEXT NOT NULL,
  instructions   TEXT,
  type           TEXT DEFAULT 'qcm' CHECK (type IN ('qcm','open','fill_blank')),
  difficulty     TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  points         INTEGER DEFAULT 10,
  questions      JSONB DEFAULT '[]'::jsonb,
  status         TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- PAIE ENSEIGNANTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE teacher_contracts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id            UUID NOT NULL REFERENCES profiles(id),
  teacher_name          TEXT,
  contract_type         contract_type NOT NULL,
  payment_basis         payment_basis NOT NULL,
  base_salary           NUMERIC(12,2),
  hourly_rate           NUMERIC(8,2),
  expected_hours_week   NUMERIC(5,2),
  currency              TEXT DEFAULT 'XOF',
  start_date            DATE NOT NULL,
  end_date              DATE,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE monthly_payroll (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id        UUID NOT NULL REFERENCES profiles(id),
  teacher_name      TEXT,
  contract_id       UUID REFERENCES teacher_contracts(id),
  month             TEXT NOT NULL,                    -- "2026-05"
  scheduled_hours   NUMERIC(6,2) DEFAULT 0,
  effective_hours   NUMERIC(6,2) DEFAULT 0,
  absence_hours     NUMERIC(6,2) DEFAULT 0,
  gross_amount      NUMERIC(12,2) NOT NULL,
  deductions        JSONB DEFAULT '[]'::jsonb,
  net_amount        NUMERIC(12,2) NOT NULL,
  currency          TEXT DEFAULT 'XOF',
  status            payroll_status DEFAULT 'draft',
  generated_at      TIMESTAMPTZ DEFAULT NOW(),
  validated_by      UUID REFERENCES profiles(id),
  validated_at      TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  notes             TEXT,
  UNIQUE (school_id, teacher_id, month)
);

-- ═══════════════════════════════════════════════════════════════
-- BUDGET & TRÉSORERIE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE budget_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year     TEXT NOT NULL,
  category          TEXT NOT NULL,
  label             TEXT,
  type              TEXT DEFAULT 'expense' CHECK (type IN ('income','expense')),
  budgeted          NUMERIC(15,2) DEFAULT 0,
  currency          TEXT DEFAULT 'XOF',
  alert_threshold   INTEGER DEFAULT 90,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, academic_year, category)
);

CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  label           TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  currency        TEXT DEFAULT 'XOF',
  date            DATE DEFAULT CURRENT_DATE,
  paid_by         UUID REFERENCES profiles(id),
  paid_by_name    TEXT,
  receipt_url     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_school_category ON expenses(school_id, category, date);

-- ═══════════════════════════════════════════════════════════════
-- EXPORTS & RAPPORTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE export_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  requested_by  UUID REFERENCES profiles(id),
  dataset       TEXT NOT NULL,
  format        export_format DEFAULT 'xlsx',
  filters       JSONB DEFAULT '{}'::jsonb,
  status        export_status DEFAULT 'queued',
  storage_url   TEXT,
  signed_url    TEXT,
  row_count     INTEGER,
  filename      TEXT,
  error_msg     TEXT,
  requested_at  TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════
-- CRM & RELANCES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE inscription_leads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  parent_name    TEXT NOT NULL,
  parent_phone   TEXT,
  parent_email   TEXT,
  student_name   TEXT NOT NULL,
  student_age    INTEGER,
  target_level   TEXT,
  source         TEXT DEFAULT 'autre',
  status         lead_status DEFAULT 'nouveau',
  notes          TEXT,
  next_follow_up DATE,
  assigned_to    UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE message_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  channel     messaging_channel NOT NULL,
  event_type  TEXT,
  recipient   TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT DEFAULT 'sent' CHECK (status IN ('sent','delivered','failed')),
  provider    TEXT,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  sent_by     UUID REFERENCES profiles(id),
  error_msg   TEXT
);

-- ═══════════════════════════════════════════════════════════════
-- CONFIGURATION ÉCOLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE school_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID UNIQUE NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  annee           TEXT DEFAULT '2025-2026',
  trimestres      JSONB DEFAULT '[]'::jsonb,
  matieres_levels JSONB DEFAULT '{}'::jsonb,
  regles          JSONB DEFAULT '[]'::jsonb,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- AUDIT LOGS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE audit_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id   UUID REFERENCES schools(id),
  actor_uid   UUID REFERENCES profiles(id),
  actor_role  TEXT,
  action      TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les audits récents
CREATE INDEX idx_audit_school_date ON audit_logs(school_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS : updated_at automatique
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schools_updated_at          BEFORE UPDATE ON schools          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at         BEFORE UPDATE ON profiles         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bulletins_updated_at        BEFORE UPDATE ON bulletins        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_classes_updated_at          BEFORE UPDATE ON classes          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_school_configs_updated_at   BEFORE UPDATE ON school_configs   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_teacher_contracts_updated_at BEFORE UPDATE ON teacher_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
