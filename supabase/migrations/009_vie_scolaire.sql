-- ============================================================
-- 009 — Vie scolaire : absences élèves, justificatifs, sorties,
--       incidents, remplacements, cahier de texte
-- Cahier des charges §11.1, §11.2, §11.3, §10.1, §12.1
--
-- `attendance_sessions` / `attendance_records` (001) restent le
-- support de l'appel. On ajoute ici tout ce qui l'entoure :
-- justification par le parent, validation SG, sorties, incidents.
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- TYPES
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE justification_status AS ENUM ('en_attente', 'acceptee', 'refusee');

CREATE TYPE incident_severity AS ENUM ('mineur', 'moyen', 'grave', 'tres_grave');

CREATE TYPE incident_status AS ENUM (
  'declare', 'en_instruction', 'convocation', 'sanctionne', 'classe_sans_suite', 'clos'
);

CREATE TYPE exit_status AS ENUM ('demande', 'approuve', 'refuse', 'sorti', 'revenu');

-- ═══════════════════════════════════════════════════════════════
-- MOTIFS CONFIGURABLES (§11.1)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE absence_reasons (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,
  label          TEXT NOT NULL,
  is_justified   BOOLEAN DEFAULT TRUE,     -- ce motif vaut-il justification ?
  applies_to     TEXT DEFAULT 'both' CHECK (applies_to IN ('absence','retard','both')),
  requires_proof BOOLEAN DEFAULT FALSE,
  is_active      BOOLEAN DEFAULT TRUE,
  UNIQUE (school_id, code)
);

-- ═══════════════════════════════════════════════════════════════
-- JUSTIFICATIFS D'ABSENCE (§11.1, §16.4)
-- Le parent transmet, le SG valide.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE absence_justifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  record_id       UUID REFERENCES attendance_records(id) ON DELETE CASCADE,
  date_from       DATE NOT NULL,
  date_to         DATE NOT NULL,
  reason_id       UUID REFERENCES absence_reasons(id),
  reason_text     TEXT,
  proof_path      TEXT,                    -- pièce jointe Supabase Storage
  submitted_by    UUID REFERENCES profiles(id),
  submitted_by_name TEXT,
  status          justification_status DEFAULT 'en_attente',
  reviewed_by     UUID REFERENCES profiles(id),
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CHECK (date_to >= date_from)
);

CREATE INDEX idx_justif_student ON absence_justifications(student_id, date_from DESC);
CREATE INDEX idx_justif_pending ON absence_justifications(school_id) WHERE status = 'en_attente';

-- Enrichissement de l'appel existant
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS reason_id      UUID REFERENCES absence_reasons(id);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS late_minutes   SMALLINT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS justified_by   UUID REFERENCES profiles(id);
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS justified_at   TIMESTAMPTZ;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS parent_alerted BOOLEAN DEFAULT FALSE;

ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS period_id  UUID REFERENCES academic_periods(id);
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS slot_id    UUID REFERENCES schedule_slots(id);
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id);
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS is_locked  BOOLEAN DEFAULT FALSE;

-- ═══════════════════════════════════════════════════════════════
-- AUTORISATIONS DE SORTIE (§11.3, §16.5)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE exit_permissions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by     UUID REFERENCES profiles(id),
  requested_by_name TEXT,
  reason           TEXT NOT NULL,
  exit_date        DATE NOT NULL,
  exit_time        TIME,
  expected_return  TIME,
  pickup_person    TEXT,
  pickup_id        UUID REFERENCES authorized_pickups(id),
  status           exit_status DEFAULT 'demande',
  approved_by      UUID REFERENCES profiles(id),
  approved_at      TIMESTAMPTZ,
  refusal_reason   TEXT,
  -- Registre des sorties/retours (§11.3)
  left_at          TIMESTAMPTZ,
  returned_at      TIMESTAMPTZ,
  pass_code        TEXT,                  -- billet de sortie numérique
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exits_student ON exit_permissions(student_id, exit_date DESC);
CREATE INDEX idx_exits_pending ON exit_permissions(school_id) WHERE status = 'demande';

-- ═══════════════════════════════════════════════════════════════
-- INCIDENTS (§11.2)
-- Un incident précède et justifie une sanction.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE incidents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  reference       TEXT,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  location        TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity        incident_severity NOT NULL DEFAULT 'mineur',
  status          incident_status DEFAULT 'declare',
  is_confidential BOOLEAN DEFAULT FALSE,   -- §11.2 niveau de confidentialité
  declared_by     UUID REFERENCES profiles(id),
  declared_by_name TEXT,
  handled_by      UUID REFERENCES profiles(id),
  attachments     TEXT[] DEFAULT '{}',
  resolution      TEXT,
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incidents_school ON incidents(school_id, occurred_at DESC);
CREATE INDEX idx_incidents_open   ON incidents(school_id, severity) WHERE status <> 'clos';

-- Participants et témoins d'un incident
CREATE TABLE incident_participants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id   UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  student_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  person_name   TEXT,
  role          TEXT NOT NULL CHECK (role IN ('auteur','victime','temoin','implique')),
  statement     TEXT,
  UNIQUE (incident_id, student_id, role)
);

-- Convocations de parents (§11.2)
CREATE TABLE parent_summons (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  incident_id   UUID REFERENCES incidents(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guardian_id   UUID REFERENCES profiles(id),
  scheduled_at  TIMESTAMPTZ NOT NULL,
  location      TEXT,
  motive        TEXT NOT NULL,
  status        TEXT DEFAULT 'convoque'
                CHECK (status IN ('convoque','confirme','tenu','absent','annule')),
  attended      BOOLEAN,
  minutes       TEXT,                    -- compte rendu d'entretien
  follow_up     TEXT,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_summons_student ON parent_summons(student_id, scheduled_at DESC);

-- Rattachement des sanctions existantes à un incident
ALTER TABLE discipline_records ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES incidents(id);
ALTER TABLE discipline_records ADD COLUMN IF NOT EXISTS state       validation_state DEFAULT 'valide';
ALTER TABLE discipline_records ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES profiles(id);
ALTER TABLE discipline_records ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE discipline_records ADD COLUMN IF NOT EXISTS start_date  DATE;
ALTER TABLE discipline_records ADD COLUMN IF NOT EXISTS end_date    DATE;
ALTER TABLE discipline_records ADD COLUMN IF NOT EXISTS closed_at   TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════
-- REMPLACEMENTS ET ANNULATIONS DE COURS (§10.1)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE teacher_absences (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date_from      DATE NOT NULL,
  date_to        DATE NOT NULL,
  reason         TEXT,
  is_justified   BOOLEAN DEFAULT FALSE,
  proof_path     TEXT,
  declared_by    UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CHECK (date_to >= date_from)
);

CREATE INDEX idx_teacher_abs ON teacher_absences(school_id, date_from DESC);

CREATE TABLE replacements (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id          UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  slot_id            UUID REFERENCES schedule_slots(id) ON DELETE CASCADE,
  absence_id         UUID REFERENCES teacher_absences(id) ON DELETE CASCADE,
  date               DATE NOT NULL,
  original_teacher   UUID REFERENCES profiles(id),
  replacement_teacher UUID REFERENCES profiles(id),
  class_id           UUID REFERENCES classes(id),
  subject_id         UUID REFERENCES subjects(id),
  status             remplacement_status DEFAULT 'pending',
  is_cancelled       BOOLEAN DEFAULT FALSE,   -- cours annulé faute de remplaçant
  students_notified  BOOLEAN DEFAULT FALSE,
  proposed_by        UUID REFERENCES profiles(id),
  responded_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_replacements_date ON replacements(school_id, date);

-- ═══════════════════════════════════════════════════════════════
-- CAHIER DE TEXTE (§10.1, §12.1)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE lesson_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id       UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id     UUID REFERENCES subjects(id),
  teacher_id     UUID NOT NULL REFERENCES profiles(id),
  slot_id        UUID REFERENCES schedule_slots(id),
  curriculum_id  UUID REFERENCES curricula(id),
  period_id      UUID REFERENCES academic_periods(id),
  date           DATE NOT NULL,
  start_time     TIME,
  end_time       TIME,
  objectives     TEXT,
  content        TEXT NOT NULL,
  resources      TEXT[] DEFAULT '{}',
  homework       TEXT,
  homework_due   DATE,
  -- Contrôle DE (§10.1 « cahier de texte auditable »)
  is_validated   BOOLEAN DEFAULT FALSE,
  validated_by   UUID REFERENCES profiles(id),
  validated_at   TIMESTAMPTZ,
  de_comment     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lesson_logs ON lesson_logs(class_id, date DESC);
CREATE INDEX idx_lesson_logs_teacher ON lesson_logs(teacher_id, date DESC);

-- ═══════════════════════════════════════════════════════════════
-- SALLES (§5.1, §10.1 — détection de conflits)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE rooms (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  site_id      UUID REFERENCES sites(id),
  name         TEXT NOT NULL,
  capacity     INTEGER,
  kind         TEXT DEFAULT 'salle'
               CHECK (kind IN ('salle','labo','atelier','gymnase','amphi','informatique')),
  is_active    BOOLEAN DEFAULT TRUE,
  UNIQUE (school_id, name)
);

ALTER TABLE schedule_slots ADD COLUMN IF NOT EXISTS room_id   UUID REFERENCES rooms(id);
ALTER TABLE schedule_slots ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES academic_periods(id);

-- Détection de conflit d'emploi du temps (§10.1)
CREATE OR REPLACE FUNCTION schedule_conflicts(
  p_school_id UUID, p_academic_year TEXT
)
RETURNS TABLE (
  slot_a UUID, slot_b UUID, kind TEXT, detail TEXT
) AS $$
  SELECT a.id, b.id,
         CASE
           WHEN a.teacher_id = b.teacher_id THEN 'enseignant'
           WHEN a.class_id   = b.class_id   THEN 'classe'
           ELSE 'salle'
         END,
         'Jour ' || a.day_of_week || ' ' || a.start_time || '-' || a.end_time
  FROM schedule_slots a
  JOIN schedule_slots b
    ON b.id > a.id
   AND b.school_id = a.school_id
   AND b.academic_year = a.academic_year
   AND b.day_of_week = a.day_of_week
   AND a.start_time < b.end_time
   AND b.start_time < a.end_time
   AND (
        a.teacher_id = b.teacher_id
     OR a.class_id   = b.class_id
     OR (a.room_id IS NOT NULL AND a.room_id = b.room_id)
   )
  WHERE a.school_id = p_school_id
    AND a.academic_year = p_academic_year
    AND a.is_active AND b.is_active
$$ LANGUAGE SQL STABLE;

-- ═══════════════════════════════════════════════════════════════
-- MOTIFS D'ABSENCE PAR DÉFAUT
-- ═══════════════════════════════════════════════════════════════

INSERT INTO absence_reasons (school_id, code, label, is_justified, applies_to, requires_proof)
SELECT s.id, r.code, r.label, r.justified, r.applies, r.proof
FROM schools s
CROSS JOIN (VALUES
  ('MALADIE',   'Maladie',                     TRUE,  'both',    TRUE),
  ('FAMILLE',   'Raison familiale',            TRUE,  'both',    FALSE),
  ('TRANSPORT', 'Problème de transport',       TRUE,  'retard',  FALSE),
  ('CONVOC',    'Convocation administrative',  TRUE,  'absence', TRUE),
  ('RELIGIEUX', 'Fête religieuse',             TRUE,  'absence', FALSE),
  ('NON_JUST',  'Absence non justifiée',       FALSE, 'both',    FALSE),
  ('RETARD_NJ', 'Retard non justifié',         FALSE, 'retard',  FALSE)
) AS r(code, label, justified, applies, proof)
ON CONFLICT (school_id, code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER trg_incidents_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lesson_logs_updated_at BEFORE UPDATE ON lesson_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
