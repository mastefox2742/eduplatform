-- ============================================================
-- 004 — Rôles cumulables, sites/campus, permissions granulaires
-- Cahier des charges §3.1, §3.2, §4.1, §21.1
--
-- Principe : un utilisateur peut porter PLUSIEURS rôles, chacun
-- limité à une école, un site, un cycle, un niveau, une classe
-- ou une matière. `profiles.role` est conservé comme rôle
-- principal (compatibilité) mais n'est plus la source de vérité
-- des permissions.
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- NOUVEAUX TYPES
-- ═══════════════════════════════════════════════════════════════

-- Rôles métier complets (§3.2). Les 5 valeurs de `user_role`
-- restent valides ; on ajoute les rôles administratifs manquants.
CREATE TYPE staff_role AS ENUM (
  'super_admin',   -- plateforme SaaS, tous tenants
  'directeur',
  'secretaire',
  'gestionnaire',  -- comptable / caissier
  'de',            -- directeur des études
  'sg',            -- surveillant général
  'enseignant',
  'parent',
  'eleve',
  'support'        -- bibliothèque, infirmerie, transport, accueil, stock
);

CREATE TYPE scope_kind AS ENUM ('school', 'site', 'cycle', 'level', 'class', 'subject');

CREATE TYPE permission_action AS ENUM (
  'read', 'create', 'update', 'validate', 'publish', 'export', 'delete'
);

CREATE TYPE school_cycle AS ENUM ('primaire', 'college', 'lycee');

-- ═══════════════════════════════════════════════════════════════
-- SITES / CAMPUS (§4.1 — plusieurs sites par établissement)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE sites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  short_name    TEXT,
  address       TEXT,
  city          TEXT,
  phone         TEXT,
  cycles        school_cycle[] DEFAULT '{}',
  is_main       BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sites_school ON sites(school_id);
CREATE UNIQUE INDEX idx_sites_one_main ON sites(school_id) WHERE is_main;

-- Rattachement des structures existantes à un site
ALTER TABLE classes ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);
ALTER TABLE levels  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);
ALTER TABLE levels  ADD COLUMN IF NOT EXISTS cycle_enum school_cycle;

-- ═══════════════════════════════════════════════════════════════
-- RÔLES CUMULABLES (§3.1)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE user_roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          staff_role NOT NULL,
  -- Périmètre du rôle. scope_kind='school' => tout l'établissement.
  scope_kind    scope_kind NOT NULL DEFAULT 'school',
  scope_id      UUID,            -- site_id / level_id / class_id / subject_id
  scope_cycle   school_cycle,    -- si scope_kind='cycle'
  academic_year TEXT,            -- NULL = toutes les années
  is_active     BOOLEAN DEFAULT TRUE,
  granted_by    UUID REFERENCES profiles(id),
  granted_at    TIMESTAMPTZ DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ,
  CHECK (scope_kind <> 'cycle' OR scope_cycle IS NOT NULL),
  CHECK (scope_kind IN ('school','cycle') OR scope_id IS NOT NULL)
);

CREATE INDEX idx_user_roles_user   ON user_roles(user_id) WHERE is_active;
CREATE INDEX idx_user_roles_school ON user_roles(school_id, role) WHERE is_active;
CREATE UNIQUE INDEX idx_user_roles_unique
  ON user_roles(
    user_id, role, scope_kind,
    COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(academic_year, '')
  )
  WHERE is_active;

-- ═══════════════════════════════════════════════════════════════
-- CONTEXTE ACTIF (§3.1 — bascule sans déconnexion)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE user_active_context (
  user_id        UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  school_id      UUID REFERENCES schools(id) ON DELETE CASCADE,
  site_id        UUID REFERENCES sites(id),
  academic_year  TEXT,
  cycle          school_cycle,
  active_role    staff_role,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- PERMISSIONS GRANULAIRES (§21.1)
-- Surcharge par école : une petite structure peut élargir,
-- un grand établissement peut restreindre.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE role_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,  -- NULL = défaut plateforme
  role            staff_role NOT NULL,
  resource        TEXT NOT NULL,          -- 'grades', 'bulletins', 'payments', ...
  action          permission_action NOT NULL,
  allowed         BOOLEAN NOT NULL DEFAULT TRUE,
  offline_allowed BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, role, resource, action)
);

CREATE INDEX idx_role_permissions_lookup ON role_permissions(role, resource, action);

-- En PostgreSQL, NULL <> NULL : la contrainte UNIQUE ci-dessus ne protège
-- pas les défauts plateforme (school_id NULL). Index partiel explicite.
CREATE UNIQUE INDEX idx_role_permissions_default
  ON role_permissions(role, resource, action) WHERE school_id IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- AFFECTATIONS ENSEIGNANT (§12.1 — limité à ses classes/matières)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE teacher_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id      UUID REFERENCES subjects(id),
  academic_year   TEXT NOT NULL,
  hours_week      NUMERIC(5,2),
  is_main_teacher BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (teacher_id, class_id, subject_id, academic_year)
);

CREATE INDEX idx_teacher_assign_teacher ON teacher_assignments(teacher_id, academic_year) WHERE is_active;
CREATE INDEX idx_teacher_assign_class   ON teacher_assignments(class_id, academic_year)   WHERE is_active;

-- ═══════════════════════════════════════════════════════════════
-- FONCTIONS D'AUTORISATION
-- ═══════════════════════════════════════════════════════════════

-- Tous les rôles actifs de l'utilisateur courant
CREATE OR REPLACE FUNCTION auth_roles()
RETURNS staff_role[] AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT role), '{}')
  FROM user_roles
  WHERE user_id = auth.uid() AND is_active AND revoked_at IS NULL
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- L'utilisateur porte-t-il ce rôle (tout périmètre confondu) ?
CREATE OR REPLACE FUNCTION has_role(p_role staff_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = p_role
      AND is_active AND revoked_at IS NULL
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- L'utilisateur porte-t-il l'un de ces rôles ?
CREATE OR REPLACE FUNCTION has_any_role(VARIADIC p_roles staff_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = ANY(p_roles)
      AND is_active AND revoked_at IS NULL
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Super admin plateforme
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT has_role('super_admin')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Rôles de pilotage d'un établissement
CREATE OR REPLACE FUNCTION is_school_staff()
RETURNS BOOLEAN AS $$
  SELECT has_any_role('directeur','secretaire','gestionnaire','de','sg')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- L'enseignant est-il affecté à cette classe (et matière si fournie) ?
CREATE OR REPLACE FUNCTION teaches_class(p_class_id UUID, p_subject_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_assignments
    WHERE teacher_id = auth.uid()
      AND class_id = p_class_id
      AND (p_subject_id IS NULL OR subject_id = p_subject_id OR subject_id IS NULL)
      AND is_active
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Vérification de permission, avec surcharge par école
CREATE OR REPLACE FUNCTION can(p_resource TEXT, p_action permission_action)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT rp.allowed
       FROM role_permissions rp
      WHERE rp.role = ANY (auth_roles())
        AND rp.resource = p_resource
        AND rp.action   = p_action
        AND rp.school_id = auth_school_id()
      ORDER BY rp.allowed DESC
      LIMIT 1),
    (SELECT rp.allowed
       FROM role_permissions rp
      WHERE rp.role = ANY (auth_roles())
        AND rp.resource = p_resource
        AND rp.action   = p_action
        AND rp.school_id IS NULL
      ORDER BY rp.allowed DESC
      LIMIT 1),
    FALSE
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- RÉTROCOMPATIBILITÉ
-- Les anciennes fonctions (is_direction, is_teacher…) continuent
-- de marcher, mais consultent désormais aussi user_roles.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_direction()
RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('direction', 'admin')
      OR has_any_role('directeur','super_admin')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'teacher' OR has_role('enseignant')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_student()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'student' OR has_role('eleve')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_parent()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'parent' OR has_role('parent')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- PERMISSIONS PAR DÉFAUT DE LA PLATEFORME (school_id = NULL)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO role_permissions (school_id, role, resource, action, allowed, offline_allowed) VALUES
-- Directeur : pilotage complet de son école
(NULL,'directeur','students','read',TRUE,TRUE),        (NULL,'directeur','students','create',TRUE,FALSE),
(NULL,'directeur','students','update',TRUE,FALSE),     (NULL,'directeur','students','export',TRUE,FALSE),
(NULL,'directeur','grades','read',TRUE,TRUE),          (NULL,'directeur','grades','validate',TRUE,FALSE),
(NULL,'directeur','bulletins','read',TRUE,TRUE),       (NULL,'directeur','bulletins','validate',TRUE,TRUE),
(NULL,'directeur','bulletins','publish',TRUE,FALSE),   (NULL,'directeur','payments','read',TRUE,TRUE),
(NULL,'directeur','payments','validate',TRUE,FALSE),   (NULL,'directeur','discipline','validate',TRUE,FALSE),
(NULL,'directeur','budget','read',TRUE,FALSE),         (NULL,'directeur','budget','update',TRUE,FALSE),
(NULL,'directeur','reports','export',TRUE,FALSE),      (NULL,'directeur','permissions','update',TRUE,FALSE),
(NULL,'directeur','audit','read',TRUE,FALSE),          (NULL,'directeur','announcements','create',TRUE,FALSE),
-- Secrétaire : administration scolaire
(NULL,'secretaire','students','read',TRUE,TRUE),       (NULL,'secretaire','students','create',TRUE,FALSE),
(NULL,'secretaire','students','update',TRUE,FALSE),    (NULL,'secretaire','documents','create',TRUE,FALSE),
(NULL,'secretaire','documents','export',TRUE,FALSE),   (NULL,'secretaire','admissions','read',TRUE,FALSE),
(NULL,'secretaire','admissions','update',TRUE,FALSE),  (NULL,'secretaire','bulletins','read',TRUE,FALSE),
-- Gestionnaire : finances
(NULL,'gestionnaire','payments','read',TRUE,TRUE),     (NULL,'gestionnaire','payments','create',TRUE,TRUE),
(NULL,'gestionnaire','invoices','create',TRUE,FALSE),  (NULL,'gestionnaire','invoices','read',TRUE,TRUE),
(NULL,'gestionnaire','cash','create',TRUE,TRUE),       (NULL,'gestionnaire','cash','read',TRUE,TRUE),
(NULL,'gestionnaire','expenses','create',TRUE,FALSE),  (NULL,'gestionnaire','budget','read',TRUE,FALSE),
(NULL,'gestionnaire','students','read',TRUE,FALSE),
-- DE : pédagogie et résultats
(NULL,'de','grades','read',TRUE,TRUE),                 (NULL,'de','grades','validate',TRUE,TRUE),
(NULL,'de','bulletins','read',TRUE,TRUE),              (NULL,'de','bulletins','validate',TRUE,TRUE),
(NULL,'de','schedule','create',TRUE,FALSE),            (NULL,'de','schedule','update',TRUE,FALSE),
(NULL,'de','exams','create',TRUE,FALSE),               (NULL,'de','students','read',TRUE,TRUE),
(NULL,'de','discipline','read',TRUE,FALSE),            (NULL,'de','courses','read',TRUE,FALSE),
-- SG : vie scolaire
(NULL,'sg','attendance','read',TRUE,TRUE),             (NULL,'sg','attendance','create',TRUE,TRUE),
(NULL,'sg','attendance','validate',TRUE,TRUE),         (NULL,'sg','discipline','create',TRUE,TRUE),
(NULL,'sg','discipline','read',TRUE,TRUE),             (NULL,'sg','discipline','validate',TRUE,FALSE),
(NULL,'sg','exits','create',TRUE,TRUE),                (NULL,'sg','students','read',TRUE,TRUE),
-- Enseignant : ses classes uniquement
(NULL,'enseignant','grades','create',TRUE,TRUE),       (NULL,'enseignant','grades','read',TRUE,TRUE),
(NULL,'enseignant','grades','update',TRUE,TRUE),       (NULL,'enseignant','attendance','create',TRUE,TRUE),
(NULL,'enseignant','attendance','read',TRUE,TRUE),     (NULL,'enseignant','courses','create',TRUE,TRUE),
(NULL,'enseignant','courses','update',TRUE,TRUE),      (NULL,'enseignant','devoirs','create',TRUE,TRUE),
(NULL,'enseignant','bulletins','create',TRUE,TRUE),    (NULL,'enseignant','students','read',TRUE,TRUE),
-- Parent : ses enfants
(NULL,'parent','students','read',TRUE,FALSE),          (NULL,'parent','grades','read',TRUE,FALSE),
(NULL,'parent','bulletins','read',TRUE,FALSE),         (NULL,'parent','invoices','read',TRUE,FALSE),
(NULL,'parent','payments','create',TRUE,FALSE),        (NULL,'parent','attendance','read',TRUE,FALSE),
-- Élève : ses propres données
(NULL,'eleve','grades','read',TRUE,FALSE),             (NULL,'eleve','courses','read',TRUE,FALSE),
(NULL,'eleve','devoirs','read',TRUE,FALSE),            (NULL,'eleve','attendance','read',TRUE,FALSE),
(NULL,'eleve','bulletins','read',TRUE,FALSE)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- MIGRATION DES DONNÉES EXISTANTES
-- Chaque profil existant reçoit son rôle équivalent dans user_roles
-- ═══════════════════════════════════════════════════════════════

INSERT INTO user_roles (school_id, user_id, role, scope_kind)
SELECT p.school_id, p.id,
       CASE p.role
         WHEN 'admin'     THEN 'directeur'::staff_role
         WHEN 'direction' THEN 'directeur'::staff_role
         WHEN 'teacher'   THEN 'enseignant'::staff_role
         WHEN 'student'   THEN 'eleve'::staff_role
         WHEN 'parent'    THEN 'parent'::staff_role
       END,
       'school'
FROM profiles p
WHERE p.school_id IS NOT NULL AND p.is_active
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER trg_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
