-- ============================================================
-- 007 — Évaluations, notes, examens, workflows de validation
-- Cahier des charges §3.3, §10.2, §13.1, §13.2, §13.3
--
-- Manque comblé : le schéma initial ne stockait qu'une moyenne
-- par matière dans `bulletins`. Les notes individuelles n'avaient
-- nulle part où vivre. `bulletins` devient une vue de synthèse
-- calculée à partir de `grades`.
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- TYPES
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE grade_state AS ENUM (
  'saisie',      -- note normale
  'absent',      -- absent à l'épreuve
  'exempte',     -- dispensé
  'annulee',     -- annulée (fraude, erreur)
  'rattrapage'   -- note de rattrapage
);

CREATE TYPE validation_state AS ENUM (
  'brouillon', 'soumis', 'controle', 'valide', 'rejete', 'publie'
);

CREATE TYPE exam_kind AS ENUM ('blanc', 'etat', 'interne', 'concours');

-- ═══════════════════════════════════════════════════════════════
-- ÉVALUATIONS (§13.1)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE assessments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id       UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id     UUID REFERENCES subjects(id),
  subject_name   TEXT,
  teacher_id     UUID NOT NULL REFERENCES profiles(id),
  teacher_name   TEXT,
  period_id      UUID REFERENCES academic_periods(id),
  academic_year  TEXT NOT NULL,
  kind           assessment_kind NOT NULL DEFAULT 'devoir',
  title          TEXT NOT NULL,
  instructions   TEXT,
  max_score      NUMERIC(5,2) NOT NULL DEFAULT 20,
  coefficient    NUMERIC(4,2) NOT NULL DEFAULT 1,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_min   INTEGER,
  attachments    TEXT[] DEFAULT '{}',
  -- Workflow §3.3 : saisie enseignant -> contrôle DE -> validation
  state          validation_state DEFAULT 'brouillon',
  submitted_at   TIMESTAMPTZ,
  validated_by   UUID REFERENCES profiles(id),
  validated_at   TIMESTAMPTZ,
  rejection_note TEXT,
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  CHECK (max_score > 0),
  CHECK (coefficient > 0)
);

CREATE INDEX idx_assessments_class  ON assessments(class_id, academic_year, period_id);
CREATE INDEX idx_assessments_teacher ON assessments(teacher_id, date DESC);
CREATE INDEX idx_assessments_state  ON assessments(school_id, state);

-- ═══════════════════════════════════════════════════════════════
-- NOTES INDIVIDUELLES (§13.1)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE grades (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  assessment_id  UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score          NUMERIC(5,2),
  state          grade_state DEFAULT 'saisie',
  comment        TEXT,
  competencies   JSONB DEFAULT '{}'::jsonb,   -- §13.1 : évaluation par compétence
  entered_by     UUID REFERENCES profiles(id),
  entered_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (assessment_id, student_id),
  -- Une note chiffrée n'est exigée que pour l'état 'saisie'
  CHECK (state <> 'saisie' OR score IS NOT NULL),
  CHECK (score IS NULL OR score >= 0)
);

CREATE INDEX idx_grades_student    ON grades(student_id);
CREATE INDEX idx_grades_assessment ON grades(assessment_id);

-- Historique complet des modifications (§13.1 « historique des corrections »)
CREATE TABLE grade_history (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  grade_id      UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  old_score     NUMERIC(5,2),
  new_score     NUMERIC(5,2),
  old_state     grade_state,
  new_state     grade_state,
  reason        TEXT,
  changed_by    UUID REFERENCES profiles(id),
  changed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grade_history ON grade_history(grade_id, changed_at DESC);

CREATE OR REPLACE FUNCTION log_grade_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.score IS DISTINCT FROM OLD.score OR NEW.state IS DISTINCT FROM OLD.state THEN
    INSERT INTO grade_history (grade_id, school_id, old_score, new_score, old_state, new_state, changed_by)
    VALUES (NEW.id, NEW.school_id, OLD.score, NEW.score, OLD.state, NEW.state, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_grade_history
  AFTER UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION log_grade_change();

-- ═══════════════════════════════════════════════════════════════
-- BULLETINS — extension du modèle existant
-- La table `bulletins` de 001 reste (une ligne par matière).
-- On ajoute le rattachement aux nouvelles périodes et le calcul.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS period_id     UUID REFERENCES academic_periods(id);
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS subject_id    UUID REFERENCES subjects(id);
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS coefficient   NUMERIC(4,2) DEFAULT 1;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS rank_in_class INTEGER;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS class_average NUMERIC(5,2);
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- Synthèse d'un bulletin complet (toutes matières) — le document signé
CREATE TABLE bulletin_summaries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id          UUID REFERENCES classes(id),
  period_id         UUID REFERENCES academic_periods(id),
  academic_year     TEXT NOT NULL,
  trimestre         trimestre,
  general_average   NUMERIC(5,2),
  class_average     NUMERIC(5,2),
  rank_in_class     INTEGER,
  class_size        INTEGER,
  absences_count    INTEGER DEFAULT 0,
  late_count        INTEGER DEFAULT 0,
  conduct           TEXT,
  general_comment   TEXT,
  council_decision  TEXT,      -- passage, redoublement, orientation
  honor             TEXT,      -- encouragements, tableau d'honneur, félicitations
  state             validation_state DEFAULT 'brouillon',
  submitted_at      TIMESTAMPTZ,
  validated_by      UUID REFERENCES profiles(id),
  validated_at      TIMESTAMPTZ,
  published_at      TIMESTAMPTZ,
  signed_by         UUID REFERENCES profiles(id),
  signature_url     TEXT,
  pdf_path          TEXT,
  verification_code TEXT UNIQUE,   -- §13.3 : QR de vérification
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, period_id)
);

CREATE INDEX idx_bulletin_sum_class ON bulletin_summaries(class_id, period_id);
CREATE INDEX idx_bulletin_sum_state ON bulletin_summaries(school_id, state);

-- Correction après publication : uniquement tracée (§13.3)
CREATE TABLE bulletin_corrections (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  summary_id     UUID NOT NULL REFERENCES bulletin_summaries(id) ON DELETE CASCADE,
  field_changed  TEXT NOT NULL,
  old_value      TEXT,
  new_value      TEXT,
  reason         TEXT NOT NULL,
  corrected_by   UUID REFERENCES profiles(id),
  parents_notified BOOLEAN DEFAULT FALSE,
  corrected_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- WORKFLOWS CONFIGURABLES (§3.3, §90 « configurables par école »)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE workflow_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  process           TEXT NOT NULL,     -- 'grades','bulletin','absence','sanction_legere', ...
  step_num          SMALLINT NOT NULL,
  step_label        TEXT NOT NULL,
  required_role     staff_role NOT NULL,
  is_optional       BOOLEAN DEFAULT FALSE,
  amount_threshold  NUMERIC(12,2),     -- pour les seuils financiers (§3.3)
  sla_hours         INTEGER,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, process, step_num)
);

-- Instance d'un workflow en cours
CREATE TABLE workflow_instances (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  process        TEXT NOT NULL,
  entity_table   TEXT NOT NULL,
  entity_id      UUID NOT NULL,
  current_step   SMALLINT DEFAULT 1,
  state          validation_state DEFAULT 'soumis',
  assigned_to    UUID REFERENCES profiles(id),
  due_at         TIMESTAMPTZ,
  started_by     UUID REFERENCES profiles(id),
  started_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX idx_wf_entity   ON workflow_instances(entity_table, entity_id);
CREATE INDEX idx_wf_assigned ON workflow_instances(assigned_to) WHERE completed_at IS NULL;

CREATE TABLE workflow_steps_log (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instance_id  UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_num     SMALLINT,
  action       TEXT NOT NULL,       -- 'submit','approve','reject','publish'
  actor_id     UUID REFERENCES profiles(id),
  actor_role   staff_role,
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- EXAMENS (§13.2)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE exams (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  kind           exam_kind NOT NULL DEFAULT 'interne',
  name           TEXT NOT NULL,
  academic_year  TEXT NOT NULL,
  level_id       UUID REFERENCES levels(id),
  starts_on      DATE,
  ends_on        DATE,
  registration_deadline DATE,
  official_ref   TEXT,              -- référence ministérielle
  is_published   BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exam_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  exam_id      UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id   UUID REFERENCES subjects(id),
  subject_name TEXT,
  date         DATE NOT NULL,
  start_time   TIME,
  end_time     TIME,
  room         TEXT,
  capacity     INTEGER,
  coefficient  NUMERIC(4,2) DEFAULT 1,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exam_candidates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  exam_id        UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  candidate_num  TEXT,
  anonymous_code TEXT,          -- anonymat des copies
  file_complete  BOOLEAN DEFAULT FALSE,
  missing_docs   TEXT[],
  registered_at  TIMESTAMPTZ DEFAULT NOW(),
  result_score   NUMERIC(5,2),
  result_status  TEXT CHECK (result_status IN ('admis','ajourne','absent','refuse','en_attente')),
  result_mention TEXT,
  UNIQUE (exam_id, student_id)
);

CREATE INDEX idx_exam_candidates ON exam_candidates(exam_id, result_status);

-- Surveillants affectés (§13.2)
CREATE TABLE exam_invigilators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  teacher_id  UUID NOT NULL REFERENCES profiles(id),
  role        TEXT DEFAULT 'surveillant',
  UNIQUE (session_id, teacher_id)
);

-- ═══════════════════════════════════════════════════════════════
-- CALCUL DES MOYENNES
-- ═══════════════════════════════════════════════════════════════

-- Moyenne d'un élève dans une matière sur une période
CREATE OR REPLACE FUNCTION student_subject_average(
  p_student_id UUID, p_subject_id UUID, p_period_id UUID
)
RETURNS NUMERIC AS $$
  SELECT ROUND(
    SUM(g.score / a.max_score * 20 * a.coefficient) / NULLIF(SUM(a.coefficient), 0),
    2
  )
  FROM grades g
  JOIN assessments a ON a.id = g.assessment_id
  WHERE g.student_id = p_student_id
    AND a.subject_id = p_subject_id
    AND a.period_id  = p_period_id
    AND g.state = 'saisie'
    AND a.state IN ('valide','publie')
$$ LANGUAGE SQL STABLE;

-- Moyenne générale d'un élève sur une période, pondérée par coefficient matière
CREATE OR REPLACE FUNCTION student_general_average(
  p_student_id UUID, p_period_id UUID
)
RETURNS NUMERIC AS $$
  WITH per_subject AS (
    SELECT a.subject_id,
           SUM(g.score / a.max_score * 20 * a.coefficient)
             / NULLIF(SUM(a.coefficient), 0) AS avg_subject
    FROM grades g
    JOIN assessments a ON a.id = g.assessment_id
    WHERE g.student_id = p_student_id
      AND a.period_id = p_period_id
      AND g.state = 'saisie'
      AND a.state IN ('valide','publie')
    GROUP BY a.subject_id
  )
  -- Le coefficient est celui du NIVEAU de l'élève : sans ce filtre,
  -- une matière coefficientée sur plusieurs niveaux dupliquerait les lignes.
  , student_level AS (
    SELECT se.level_id
    FROM student_enrollments se
    JOIN academic_periods ap ON ap.id = p_period_id
    JOIN academic_years  ay ON ay.id = ap.year_id
    WHERE se.student_id = p_student_id
      AND se.academic_year = ay.label
    LIMIT 1
  )
  SELECT ROUND(
    SUM(ps.avg_subject * COALESCE(sc.coefficient, 1))
      / NULLIF(SUM(COALESCE(sc.coefficient, 1)), 0),
    2
  )
  FROM per_subject ps
  LEFT JOIN subject_coefficients sc
         ON sc.subject_id = ps.subject_id
        AND sc.level_id   = (SELECT level_id FROM student_level)
$$ LANGUAGE SQL STABLE;

-- Complétude de saisie : combien de notes manquent pour une évaluation (§10.2)
CREATE OR REPLACE FUNCTION assessment_completeness(p_assessment_id UUID)
RETURNS TABLE (expected INTEGER, entered INTEGER, missing INTEGER) AS $$
  SELECT
    (SELECT COUNT(*)::INT FROM student_enrollments se
      JOIN assessments a ON a.class_id = se.class_id
      WHERE a.id = p_assessment_id AND se.outcome = 'en_cours'),
    (SELECT COUNT(*)::INT FROM grades WHERE assessment_id = p_assessment_id),
    (SELECT COUNT(*)::INT FROM student_enrollments se
      JOIN assessments a ON a.class_id = se.class_id
      WHERE a.id = p_assessment_id AND se.outcome = 'en_cours')
    - (SELECT COUNT(*)::INT FROM grades WHERE assessment_id = p_assessment_id)
$$ LANGUAGE SQL STABLE;

-- La période est-elle ouverte à la saisie ? (§5.2, §26 « périodes ouvertes »)
CREATE OR REPLACE FUNCTION period_is_open(p_period_id UUID)
RETURNS BOOLEAN AS $$
  SELECT NOT is_locked
     AND (grades_open_at  IS NULL OR NOW() >= grades_open_at)
     AND (grades_close_at IS NULL OR NOW() <= grades_close_at)
  FROM academic_periods WHERE id = p_period_id
$$ LANGUAGE SQL STABLE;

-- ═══════════════════════════════════════════════════════════════
-- WORKFLOWS PAR DÉFAUT
-- ═══════════════════════════════════════════════════════════════

INSERT INTO workflow_configs (school_id, process, step_num, step_label, required_role)
SELECT s.id, w.process, w.step_num, w.step_label, w.role::staff_role
FROM schools s
CROSS JOIN (VALUES
  ('grades',           1, 'Saisie enseignant',        'enseignant'),
  ('grades',           2, 'Contrôle DE',              'de'),
  ('grades',           3, 'Validation finale',        'directeur'),
  ('bulletin',         1, 'Proposition enseignant',   'enseignant'),
  ('bulletin',         2, 'Contrôle DE',              'de'),
  ('bulletin',         3, 'Signature directeur',      'directeur'),
  ('absence',          1, 'Saisie',                   'enseignant'),
  ('absence',          2, 'Validation SG',            'sg'),
  ('sanction_legere',  1, 'Déclaration SG',           'sg'),
  ('sanction_legere',  2, 'Contrôle DE',              'de'),
  ('sanction_lourde',  1, 'Déclaration SG',           'sg'),
  ('sanction_lourde',  2, 'Contrôle DE',              'de'),
  ('sanction_lourde',  3, 'Décision directeur',       'directeur'),
  ('facture',          1, 'Émission gestionnaire',    'gestionnaire'),
  ('facture',          2, 'Validation directeur',     'directeur'),
  ('remise',           1, 'Proposition gestionnaire', 'gestionnaire'),
  ('remise',           2, 'Décision directeur',       'directeur'),
  ('depense',          1, 'Saisie gestionnaire',      'gestionnaire'),
  ('depense',          2, 'Approbation directeur',    'directeur'),
  ('document',         1, 'Préparation secrétaire',   'secretaire'),
  ('document',         2, 'Signature directeur',      'directeur')
) AS w(process, step_num, step_label, role)
ON CONFLICT (school_id, process, step_num) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER trg_assessments_updated_at BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_grades_updated_at BEFORE UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bulletin_sum_updated_at BEFORE UPDATE ON bulletin_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
