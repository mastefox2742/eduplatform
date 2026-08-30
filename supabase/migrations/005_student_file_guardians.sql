-- ============================================================
-- 005 — Dossier élève unifié, tuteurs légaux, santé, documents,
--       consentements
-- Cahier des charges §7.1, §7.2, §7.3, §16, §17, §21.2, §21.3
--
-- Remplace `profiles.children JSONB` par une vraie table de
-- liaison. La colonne JSONB est conservée le temps de la bascule
-- du code, puis supprimée en 013.
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- TYPES
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE guardian_relation AS ENUM (
  'pere', 'mere', 'tuteur', 'grand_parent', 'frere_soeur', 'autre'
);

CREATE TYPE document_kind AS ENUM (
  'acte_naissance', 'bulletin_precedent', 'photo', 'certificat_medical',
  'piece_parent', 'certificat_scolarite', 'contrat', 'autorisation',
  'justificatif_absence', 'diplome', 'autre'
);

CREATE TYPE consent_purpose AS ENUM (
  'notifications', 'whatsapp', 'sms', 'email',
  'photos', 'sorties', 'transport_gps', 'donnees_sante', 'marketing'
);

CREATE TYPE risk_kind     AS ENUM ('academique', 'assiduite', 'discipline', 'financier', 'comportement');
CREATE TYPE risk_priority AS ENUM ('faible', 'moyen', 'eleve', 'critique');
CREATE TYPE risk_status   AS ENUM ('ouvert', 'en_suivi', 'resolu', 'abandonne');

-- ═══════════════════════════════════════════════════════════════
-- TUTEURS LÉGAUX (§7.1)
-- Un parent peut suivre plusieurs enfants ; un enfant peut avoir
-- plusieurs responsables. Un seul responsable financier.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE student_guardians (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id          UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guardian_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Tuteur sans compte sur la plateforme (parent sans smartphone)
  guardian_name      TEXT NOT NULL,
  guardian_phone     TEXT,
  guardian_whatsapp  TEXT,
  guardian_email     TEXT,
  relation           guardian_relation NOT NULL DEFAULT 'autre',
  is_financial       BOOLEAN DEFAULT FALSE,  -- responsable des frais
  is_emergency       BOOLEAN DEFAULT FALSE,  -- contact d'urgence
  can_pickup         BOOLEAN DEFAULT TRUE,   -- autorisé à récupérer l'enfant
  is_primary         BOOLEAN DEFAULT FALSE,  -- interlocuteur principal
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guardians_student  ON student_guardians(student_id);
CREATE INDEX idx_guardians_guardian ON student_guardians(guardian_id) WHERE guardian_id IS NOT NULL;
-- Un seul responsable financier par élève
CREATE UNIQUE INDEX idx_guardians_one_financial
  ON student_guardians(student_id) WHERE is_financial;

-- Personnes habilitées à récupérer l'enfant sans être tuteur (§16.5)
CREATE TABLE authorized_pickups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  relation      TEXT,
  id_document   TEXT,
  photo_url     TEXT,
  valid_from    DATE DEFAULT CURRENT_DATE,
  valid_until   DATE,
  authorized_by UUID REFERENCES profiles(id),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pickups_student ON authorized_pickups(student_id) WHERE is_active;

-- ═══════════════════════════════════════════════════════════════
-- DONNÉES SENSIBLES SANTÉ (§7.1, §18.3, §21.2)
-- Table séparée du dossier courant : accès strictement limité.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE student_health (
  student_id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  blood_group         TEXT,
  allergies           TEXT[],
  chronic_conditions  TEXT[],
  medications         TEXT,
  emergency_contact   TEXT,
  emergency_phone     TEXT,
  doctor_name         TEXT,
  doctor_phone        TEXT,
  care_authorization  BOOLEAN DEFAULT FALSE,   -- autorisation de soins
  notes               TEXT,
  updated_by          UUID REFERENCES profiles(id),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Journal de consultation des données santé (§21.2 — historique d'accès)
CREATE TABLE health_access_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  accessed_by UUID REFERENCES profiles(id),
  reason      TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_access ON health_access_log(student_id, accessed_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- DOCUMENTS DU DOSSIER (§7.1, §9, §20.1)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE student_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind          document_kind NOT NULL DEFAULT 'autre',
  label         TEXT NOT NULL,
  storage_path  TEXT NOT NULL,          -- chemin Supabase Storage, jamais une URL publique
  mime_type     TEXT,
  size_bytes    BIGINT,
  is_verified   BOOLEAN DEFAULT FALSE,
  verified_by   UUID REFERENCES profiles(id),
  verified_at   TIMESTAMPTZ,
  expires_at    DATE,
  uploaded_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_docs ON student_documents(student_id, kind);

-- Pièces attendues par niveau, pour le suivi des dossiers incomplets (§9)
CREATE TABLE required_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  level_id      UUID REFERENCES levels(id) ON DELETE CASCADE,
  kind          document_kind NOT NULL,
  label         TEXT NOT NULL,
  is_mandatory  BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, level_id, kind)
);

-- ═══════════════════════════════════════════════════════════════
-- CONSENTEMENTS RGPD (§17, §21.3)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE consents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Consentement donné POUR un élève (cas du parent qui consent pour l'enfant)
  student_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  purpose       consent_purpose NOT NULL,
  granted       BOOLEAN NOT NULL,
  granted_at    TIMESTAMPTZ DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ,
  ip_address    INET,
  user_agent    TEXT,
  UNIQUE (user_id, student_id, purpose)
);

CREATE INDEX idx_consents_user ON consents(user_id, purpose) WHERE granted;

-- ═══════════════════════════════════════════════════════════════
-- PARCOURS SCOLAIRE (§7.2 — cycle de vie élève)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE student_enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  academic_year   TEXT NOT NULL,
  class_id        UUID REFERENCES classes(id),
  class_name      TEXT,
  level_id        UUID REFERENCES levels(id),
  level_name      TEXT,
  site_id         UUID REFERENCES sites(id),
  enrolled_at     DATE DEFAULT CURRENT_DATE,
  left_at         DATE,
  outcome         TEXT CHECK (outcome IN
                    ('en_cours','admis','redouble','oriente','transfere','abandon','exclu','diplome')),
  outcome_note    TEXT,
  is_repeat       BOOLEAN DEFAULT FALSE,   -- redoublement
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, academic_year)
);

CREATE INDEX idx_enrollments_year  ON student_enrollments(school_id, academic_year);
CREATE INDEX idx_enrollments_class ON student_enrollments(class_id, academic_year);

-- ═══════════════════════════════════════════════════════════════
-- SUIVI PRÉVENTIF — ÉLÈVE À RISQUE (§7.3)
-- Aucune décision automatique : un signal est une alerte à traiter
-- par un humain, avec plan de remédiation et résultat.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE risk_signals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind           risk_kind NOT NULL,
  priority       risk_priority NOT NULL DEFAULT 'moyen',
  title          TEXT NOT NULL,
  explanation    TEXT NOT NULL,        -- pourquoi le signal a été levé
  evidence       JSONB DEFAULT '{}'::jsonb,  -- chiffres qui ont déclenché l'alerte
  detected_at    TIMESTAMPTZ DEFAULT NOW(),
  detected_by    TEXT DEFAULT 'system' CHECK (detected_by IN ('system','teacher','sg','de','directeur')),
  assigned_to    UUID REFERENCES profiles(id),
  status         risk_status DEFAULT 'ouvert',
  action_plan    TEXT,
  due_date       DATE,
  resolution     TEXT,
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_student ON risk_signals(student_id, status);
CREATE INDEX idx_risk_open    ON risk_signals(school_id, priority, detected_at DESC) WHERE status IN ('ouvert','en_suivi');

-- Notes de suivi d'un signal
CREATE TABLE risk_followups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id   UUID NOT NULL REFERENCES risk_signals(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id),
  author_name TEXT,
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- FONCTIONS D'AUTORISATION LIÉES À LA FAMILLE
-- Critère d'acceptation §26 : « un parent ne voit que les enfants
-- auxquels il est explicitement rattaché ».
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_my_child(p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_guardians
    WHERE guardian_id = auth.uid() AND student_id = p_student_id
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION my_children()
RETURNS UUID[] AS $$
  SELECT COALESCE(ARRAY_AGG(student_id), '{}')
  FROM student_guardians WHERE guardian_id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- L'élève concerné, son tuteur, ou le personnel habilité
CREATE OR REPLACE FUNCTION can_see_student(p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT auth.uid() = p_student_id
      OR is_my_child(p_student_id)
      OR is_school_staff()
      OR is_direction()
      OR EXISTS (
           SELECT 1 FROM teacher_assignments ta
           JOIN student_enrollments se ON se.class_id = ta.class_id
           WHERE ta.teacher_id = auth.uid() AND ta.is_active
             AND se.student_id = p_student_id
         )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- REPRISE DES DONNÉES EXISTANTES
-- `profiles.children` (JSONB) et `profiles.parent_email`
-- deviennent des lignes de student_guardians.
-- ═══════════════════════════════════════════════════════════════

-- Cas 1 : parent identifié par profiles.children = [{id, name}, ...]
INSERT INTO student_guardians (school_id, student_id, guardian_id, guardian_name, relation, is_primary, is_financial)
SELECT p.school_id,
       (child->>'id')::UUID,
       p.id,
       COALESCE(p.display_name, 'Parent'),
       'tuteur',
       TRUE,
       TRUE
FROM profiles p, jsonb_array_elements(p.children) AS child
WHERE p.role = 'parent'
  AND p.children <> '[]'::jsonb
  AND (child->>'id') IS NOT NULL
  AND EXISTS (SELECT 1 FROM profiles s WHERE s.id = (child->>'id')::UUID)
ON CONFLICT DO NOTHING;

-- Cas 2 : élève rattaché par parent_email à un profil parent existant
INSERT INTO student_guardians (school_id, student_id, guardian_id, guardian_name, guardian_email, relation, is_primary, is_financial)
SELECT s.school_id, s.id, pa.id, COALESCE(pa.display_name,'Parent'), s.parent_email, 'tuteur', TRUE, TRUE
FROM profiles s
JOIN profiles pa ON pa.school_id = s.school_id
                AND pa.role = 'parent'
                AND lower(pa.parent_email) = lower(s.parent_email)
WHERE s.role = 'student'
  AND s.parent_email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM student_guardians g WHERE g.student_id = s.id)
ON CONFLICT DO NOTHING;

-- Cas 3 : élève dont le parent n'a pas de compte — tuteur "hors plateforme"
INSERT INTO student_guardians (school_id, student_id, guardian_id, guardian_name, guardian_email, relation, is_primary, is_financial)
SELECT s.school_id, s.id, NULL, 'Parent / tuteur', s.parent_email, 'tuteur', TRUE, TRUE
FROM profiles s
WHERE s.role = 'student'
  AND s.parent_email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM student_guardians g WHERE g.student_id = s.id)
ON CONFLICT DO NOTHING;

-- Historique de scolarité de l'année courante à partir des profils
INSERT INTO student_enrollments (school_id, student_id, academic_year, class_id, class_name, level_id, level_name, outcome)
SELECT p.school_id, p.id,
       COALESCE((SELECT academic_year FROM schools WHERE id = p.school_id), '2025-2026'),
       p.class_id, p.class_name, p.level_id, p.level_name,
       CASE WHEN p.archive_status = 'active' THEN 'en_cours' ELSE 'transfere' END
FROM profiles p
WHERE p.role = 'student' AND p.school_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER trg_guardians_updated_at BEFORE UPDATE ON student_guardians
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_health_updated_at BEFORE UPDATE ON student_health
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_risk_updated_at BEFORE UPDATE ON risk_signals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
