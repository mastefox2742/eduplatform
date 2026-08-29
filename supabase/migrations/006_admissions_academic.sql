-- ============================================================
-- 006 — Admissions/inscriptions et référentiel académique
-- Cahier des charges §5.1, §5.2, §6.1, §6.2
--
-- `inscription_leads` (003) reste le CRM amont (prospect).
-- Une candidature formelle vit désormais dans `applications`.
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- TYPES
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE application_status AS ENUM (
  'recue', 'incomplete', 'en_etude', 'entretien',
  'admise', 'liste_attente', 'refusee', 'inscrite', 'annulee'
);

CREATE TYPE assessment_kind AS ENUM (
  'interrogation', 'devoir', 'composition', 'oral',
  'pratique', 'projet', 'examen_blanc'
);

CREATE TYPE period_kind AS ENUM ('trimestre', 'semestre');

-- ═══════════════════════════════════════════════════════════════
-- ANNÉES SCOLAIRES (§5.1)
-- Remplace progressivement les colonnes texte `academic_year`.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE academic_years (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,              -- "2025-2026"
  starts_on     DATE NOT NULL,
  ends_on       DATE NOT NULL,
  period_kind   period_kind DEFAULT 'trimestre',
  is_current    BOOLEAN DEFAULT FALSE,
  is_closed     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, label),
  CHECK (ends_on > starts_on)
);

CREATE UNIQUE INDEX idx_year_one_current ON academic_years(school_id) WHERE is_current;

-- Périodes (T1/T2/T3 ou semestres), avec fenêtre de saisie des notes (§5.2)
CREATE TABLE academic_periods (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  year_id           UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,           -- 'T1', 'T2', 'T3', 'S1'…
  label             TEXT NOT NULL,
  order_num         SMALLINT NOT NULL,
  starts_on         DATE NOT NULL,
  ends_on           DATE NOT NULL,
  -- Ouverture/fermeture de la saisie des notes (§5.2, §10.2)
  grades_open_at    TIMESTAMPTZ,
  grades_close_at   TIMESTAMPTZ,
  is_locked         BOOLEAN DEFAULT FALSE,
  locked_by         UUID REFERENCES profiles(id),
  locked_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (year_id, code)
);

CREATE INDEX idx_periods_year ON academic_periods(year_id, order_num);

-- ═══════════════════════════════════════════════════════════════
-- RÈGLES DE CALCUL ET BARÈMES (§5.2)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE grading_rules (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id             UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  level_id              UUID REFERENCES levels(id) ON DELETE CASCADE,  -- NULL = toute l'école
  cycle                 school_cycle,
  max_score             NUMERIC(5,2) DEFAULT 20,
  decimals              SMALLINT DEFAULT 2,
  rounding              TEXT DEFAULT 'half_up' CHECK (rounding IN ('half_up','half_down','floor','ceil')),
  pass_threshold        NUMERIC(5,2) DEFAULT 10,
  honor_threshold       NUMERIC(5,2) DEFAULT 14,
  excellence_threshold  NUMERIC(5,2) DEFAULT 16,
  repeat_threshold      NUMERIC(5,2) DEFAULT 8,     -- en dessous : redoublement proposé
  rank_enabled          BOOLEAN DEFAULT TRUE,
  rank_visible_student  BOOLEAN DEFAULT FALSE,      -- §15.7 : pas de classement humiliant
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, level_id)
);

-- Pondération par type d'évaluation (§5.2)
CREATE TABLE assessment_weights (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  level_id      UUID REFERENCES levels(id) ON DELETE CASCADE,
  kind          assessment_kind NOT NULL,
  weight        NUMERIC(5,2) NOT NULL DEFAULT 1,
  UNIQUE (school_id, level_id, kind)
);

-- Coefficient d'une matière par niveau (§5.1)
CREATE TABLE subject_coefficients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id    UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  level_id      UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  coefficient   NUMERIC(4,2) NOT NULL DEFAULT 1,
  hours_week    NUMERIC(4,2),
  is_optional   BOOLEAN DEFAULT FALSE,
  UNIQUE (subject_id, level_id)
);

-- Programme par matière/niveau/période (§5.2)
CREATE TABLE curricula (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id    UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  level_id      UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  period_id     UUID REFERENCES academic_periods(id) ON DELETE CASCADE,
  chapter_num   SMALLINT,
  title         TEXT NOT NULL,
  objectives    TEXT,
  competencies  TEXT[],
  hours_planned NUMERIC(5,2),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_curricula ON curricula(school_id, subject_id, level_id);

-- Suivi de la progression réelle sur le programme (§10.1)
CREATE TABLE curriculum_progress (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  curriculum_id  UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  class_id       UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id     UUID REFERENCES profiles(id),
  status         TEXT DEFAULT 'non_demarre'
                 CHECK (status IN ('non_demarre','en_cours','termine','reporte')),
  hours_done     NUMERIC(5,2) DEFAULT 0,
  completed_at   DATE,
  notes          TEXT,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (curriculum_id, class_id)
);

-- ═══════════════════════════════════════════════════════════════
-- ADMISSIONS (§6.1, §6.2)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE applications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  site_id             UUID REFERENCES sites(id),
  lead_id             UUID REFERENCES inscription_leads(id),   -- origine CRM
  reference           TEXT NOT NULL,                           -- "CAND-2026-00042"
  academic_year       TEXT NOT NULL,
  -- Candidat
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  gender              TEXT CHECK (gender IN ('M','F','autre')),
  birth_date          DATE,
  birth_place         TEXT,
  nationality         TEXT,
  address             TEXT,
  photo_url           TEXT,
  previous_school     TEXT,
  previous_level      TEXT,
  previous_average    NUMERIC(5,2),
  -- Cible
  target_level_id     UUID REFERENCES levels(id),
  target_level_name   TEXT,
  target_cycle        school_cycle,
  -- Responsable
  guardian_name       TEXT NOT NULL,
  guardian_phone      TEXT NOT NULL,
  guardian_email      TEXT,
  guardian_relation   guardian_relation DEFAULT 'tuteur',
  -- Instruction du dossier
  status              application_status DEFAULT 'recue',
  status_reason       TEXT,
  internal_notes      TEXT,
  interview_at        TIMESTAMPTZ,
  interview_score     NUMERIC(5,2),
  interview_notes     TEXT,
  entrance_exam_score NUMERIC(5,2),
  decided_by          UUID REFERENCES profiles(id),
  decided_at          TIMESTAMPTZ,
  waitlist_rank       INTEGER,
  -- Frais de dossier (§6.1)
  fee_amount          NUMERIC(12,2),
  fee_paid            BOOLEAN DEFAULT FALSE,
  fee_payment_id      UUID REFERENCES payments(id),
  -- Conversion en élève (§6.2)
  student_id          UUID REFERENCES profiles(id),
  enrolled_at         TIMESTAMPTZ,
  source              TEXT DEFAULT 'portail',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, reference)
);

CREATE INDEX idx_applications_status ON applications(school_id, status, created_at DESC);
CREATE INDEX idx_applications_year   ON applications(school_id, academic_year);

-- Pièces jointes à une candidature (§6.1)
CREATE TABLE application_documents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  kind           document_kind NOT NULL,
  label          TEXT,
  storage_path   TEXT NOT NULL,
  mime_type      TEXT,
  size_bytes     BIGINT,
  is_verified    BOOLEAN DEFAULT FALSE,
  verified_by    UUID REFERENCES profiles(id),
  rejection_note TEXT,
  uploaded_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_docs ON application_documents(application_id);

-- Historique des changements de statut (traçabilité §6.2)
CREATE TABLE application_events (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status    application_status,
  to_status      application_status NOT NULL,
  comment        TEXT,
  actor_id       UUID REFERENCES profiles(id),
  actor_name     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_events ON application_events(application_id, created_at DESC);

-- Places disponibles par niveau (§8.1 — « places disponibles »)
CREATE TABLE level_capacities (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  level_id       UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  academic_year  TEXT NOT NULL,
  capacity       INTEGER NOT NULL DEFAULT 0,
  reserved       INTEGER DEFAULT 0,
  UNIQUE (level_id, academic_year)
);

-- ═══════════════════════════════════════════════════════════════
-- NUMÉROTATION
-- ═══════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS application_seq START 1;

CREATE OR REPLACE FUNCTION next_application_ref()
RETURNS TEXT AS $$
  SELECT 'CAND-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
         LPAD(nextval('application_seq')::TEXT, 5, '0')
$$ LANGUAGE SQL VOLATILE;

CREATE SEQUENCE IF NOT EXISTS student_number_seq START 1;

CREATE OR REPLACE FUNCTION next_student_number(p_school_id UUID)
RETURNS TEXT AS $$
  SELECT UPPER(COALESCE((SELECT LEFT(slug, 3) FROM schools WHERE id = p_school_id), 'ECO'))
         || '-' || TO_CHAR(NOW(), 'YYYY') || '-'
         || LPAD(nextval('student_number_seq')::TEXT, 5, '0')
$$ LANGUAGE SQL VOLATILE;

-- Trace automatique de chaque changement de statut de candidature
CREATE OR REPLACE FUNCTION log_application_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO application_events (application_id, from_status, to_status, comment, actor_id)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.status_reason, auth.uid());
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO application_events (application_id, to_status, comment, actor_id)
    VALUES (NEW.id, NEW.status, 'Candidature créée', auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_application_status
  AFTER INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION log_application_status();

-- ═══════════════════════════════════════════════════════════════
-- AMORÇAGE À PARTIR DE L'EXISTANT
-- ═══════════════════════════════════════════════════════════════

-- Une année scolaire courante par école, tirée de schools.academic_year
INSERT INTO academic_years (school_id, label, starts_on, ends_on, is_current)
SELECT s.id,
       COALESCE(s.academic_year, '2025-2026'),
       MAKE_DATE(SPLIT_PART(COALESCE(s.academic_year,'2025-2026'), '-', 1)::INT, 9, 1),
       MAKE_DATE(SPLIT_PART(COALESCE(s.academic_year,'2025-2026'), '-', 2)::INT, 7, 31),
       TRUE
FROM schools s
ON CONFLICT (school_id, label) DO NOTHING;

-- Les trois trimestres standard pour chaque année créée
INSERT INTO academic_periods (school_id, year_id, code, label, order_num, starts_on, ends_on)
SELECT y.school_id, y.id, p.code, p.label, p.ord,
       y.starts_on + (p.start_offset || ' days')::INTERVAL,
       y.starts_on + (p.end_offset   || ' days')::INTERVAL
FROM academic_years y
CROSS JOIN (VALUES
  ('T1','1er trimestre',1,0,105),
  ('T2','2e trimestre',2,106,210),
  ('T3','3e trimestre',3,211,330)
) AS p(code,label,ord,start_offset,end_offset)
ON CONFLICT (year_id, code) DO NOTHING;

-- Règles de notation par défaut (barème /20, seuil 10)
INSERT INTO grading_rules (school_id, level_id)
SELECT id, NULL FROM schools
ON CONFLICT (school_id, level_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_grading_rules_updated_at BEFORE UPDATE ON grading_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
