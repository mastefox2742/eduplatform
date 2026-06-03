-- ============================================================
-- EduSchool — Row Level Security (RLS)
-- Remplace les Firestore Security Rules
--
-- Principe :
--   1. Supabase Auth injecte le JWT dans chaque requête
--   2. Le JWT contient : sub (uid), role, school_id (via user_metadata)
--   3. Les fonctions helper lisent ces claims
--   4. Chaque table a ses politiques READ / INSERT / UPDATE / DELETE
-- ============================================================

-- ── Fonctions helper (équivalent aux fonctions dans firestore.rules) ──────────

-- Retourne le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'role',
    auth.jwt()->>'role',
    (SELECT role::TEXT FROM profiles WHERE id = auth.uid())
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Retourne le school_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION auth_school_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'school_id')::UUID,
    (auth.jwt()->>'school_id')::UUID,
    (SELECT school_id FROM profiles WHERE id = auth.uid())
  )
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Vérifie si l'utilisateur appartient à une école donnée
CREATE OR REPLACE FUNCTION is_same_school(p_school_id UUID)
RETURNS BOOLEAN AS $$
  SELECT auth_school_id() = p_school_id
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Vérifie si l'utilisateur est direction ou admin
CREATE OR REPLACE FUNCTION is_direction()
RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('direction', 'admin')
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Vérifie si l'utilisateur est professeur
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'teacher'
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Vérifie si l'utilisateur est élève
CREATE OR REPLACE FUNCTION is_student()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'student'
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Vérifie si l'utilisateur est parent
CREATE OR REPLACE FUNCTION is_parent()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'parent'
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Direction de la même école
CREATE OR REPLACE FUNCTION is_direction_same_school(p_school_id UUID)
RETURNS BOOLEAN AS $$
  SELECT is_direction() AND is_same_school(p_school_id)
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Prof de la même école
CREATE OR REPLACE FUNCTION is_teacher_same_school(p_school_id UUID)
RETURNS BOOLEAN AS $$
  SELECT is_teacher() AND is_same_school(p_school_id)
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- ACTIVATION DU RLS SUR TOUTES LES TABLES
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE schools              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels               ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletins            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE discipline_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE devoirs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE devoir_submissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_xp           ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises            ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_contracts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_payroll      ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscription_leads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_configs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- POLITIQUES RLS
-- ═══════════════════════════════════════════════════════════════

-- ── SCHOOLS ─────────────────────────────────────────────────────

-- Les membres de l'école voient leur école
CREATE POLICY "schools: membres lisent la leur"
  ON schools FOR SELECT
  USING (id = auth_school_id() OR auth_role() = 'admin');

-- Seul l'admin peut modifier les écoles
CREATE POLICY "schools: admin écrit"
  ON schools FOR ALL
  USING (auth_role() = 'admin');

-- ── PROFILES ────────────────────────────────────────────────────

-- Chacun lit son propre profil, la direction lit tous les profils de l'école
CREATE POLICY "profiles: lecture"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR is_direction_same_school(school_id)
    OR (is_teacher_same_school(school_id) AND role IN ('student','parent'))
    OR auth_role() = 'admin'
  );

-- Chacun met à jour son propre profil (champs limités), direction met à jour tout
CREATE POLICY "profiles: mise à jour"
  ON profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR is_direction_same_school(school_id)
    OR auth_role() = 'admin'
  );

-- La direction et l'admin créent des profils
CREATE POLICY "profiles: création"
  ON profiles FOR INSERT
  WITH CHECK (
    is_direction_same_school(school_id)
    OR auth_role() = 'admin'
  );

-- ── CLASSES & NIVEAUX ────────────────────────────────────────────

CREATE POLICY "classes: membres de l'école lisent"
  ON classes FOR SELECT
  USING (is_same_school(school_id) OR auth_role() = 'admin');

CREATE POLICY "classes: direction écrit"
  ON classes FOR ALL
  USING (is_direction_same_school(school_id) OR auth_role() = 'admin');

CREATE POLICY "levels: lecture"
  ON levels FOR SELECT
  USING (is_same_school(school_id) OR auth_role() = 'admin');

CREATE POLICY "levels: direction écrit"
  ON levels FOR ALL
  USING (is_direction_same_school(school_id) OR auth_role() = 'admin');

-- ── MATIÈRES & EMPLOIS DU TEMPS ──────────────────────────────────

CREATE POLICY "subjects: lecture"
  ON subjects FOR SELECT
  USING (is_same_school(school_id) OR auth_role() = 'admin');

CREATE POLICY "subjects: direction écrit"
  ON subjects FOR ALL
  USING (is_direction_same_school(school_id) OR auth_role() = 'admin');

CREATE POLICY "schedule_slots: lecture"
  ON schedule_slots FOR SELECT
  USING (is_same_school(school_id) OR auth_role() = 'admin');

CREATE POLICY "schedule_slots: direction écrit"
  ON schedule_slots FOR ALL
  USING (is_direction_same_school(school_id) OR auth_role() = 'admin');

-- ── BULLETINS ────────────────────────────────────────────────────

-- Direction lit tous les bulletins de l'école
CREATE POLICY "bulletins: direction lit tout"
  ON bulletins FOR SELECT
  USING (is_direction_same_school(school_id));

-- Prof lit seulement ses bulletins
CREATE POLICY "bulletins: prof lit les siens"
  ON bulletins FOR SELECT
  USING (is_teacher_same_school(school_id) AND teacher_id = auth.uid());

-- Parent lit les bulletins publiés de son enfant
CREATE POLICY "bulletins: parent lit publiés enfant"
  ON bulletins FOR SELECT
  USING (
    is_parent()
    AND status = 'published'
    AND student_id IN (
      SELECT (child->>'studentId')::UUID
      FROM profiles p,
           jsonb_array_elements(p.children) AS child
      WHERE p.id = auth.uid()
    )
  );

-- Élève lit ses propres bulletins publiés
CREATE POLICY "bulletins: élève lit les siens publiés"
  ON bulletins FOR SELECT
  USING (is_student() AND student_id = auth.uid() AND status = 'published');

-- Prof crée/soumet ses bulletins
CREATE POLICY "bulletins: prof crée"
  ON bulletins FOR INSERT
  WITH CHECK (is_teacher_same_school(school_id) AND teacher_id = auth.uid());

-- Prof met à jour ses bulletins non-publiés
CREATE POLICY "bulletins: prof met à jour"
  ON bulletins FOR UPDATE
  USING (
    is_teacher_same_school(school_id)
    AND teacher_id = auth.uid()
    AND status IN ('draft', 'rejected')
  );

-- Direction valide / rejette / publie
CREATE POLICY "bulletins: direction valide"
  ON bulletins FOR UPDATE
  USING (is_direction_same_school(school_id));

-- ── PRÉSENCES ────────────────────────────────────────────────────

CREATE POLICY "attendance_sessions: direction et profs lisent"
  ON attendance_sessions FOR SELECT
  USING (
    is_same_school(school_id)
    AND (is_direction() OR is_teacher() OR auth_role() = 'admin')
  );

CREATE POLICY "attendance_sessions: prof crée"
  ON attendance_sessions FOR INSERT
  WITH CHECK (is_teacher_same_school(school_id) AND teacher_id = auth.uid());

CREATE POLICY "attendance_sessions: prof met à jour les siennes"
  ON attendance_sessions FOR UPDATE
  USING (is_teacher_same_school(school_id) AND teacher_id = auth.uid());

CREATE POLICY "attendance_records: direction et profs lisent"
  ON attendance_records FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM attendance_sessions
      WHERE school_id = auth_school_id()
    )
  );

CREATE POLICY "attendance_records: écriture"
  ON attendance_records FOR ALL
  USING (
    session_id IN (
      SELECT id FROM attendance_sessions
      WHERE school_id = auth_school_id()
      AND (is_direction() OR teacher_id = auth.uid())
    )
  );

-- ── PAIEMENTS ────────────────────────────────────────────────────

CREATE POLICY "payments: direction voit tout"
  ON payments FOR SELECT
  USING (is_direction_same_school(school_id));

CREATE POLICY "payments: parent voit les siens"
  ON payments FOR SELECT
  USING (is_parent() AND parent_id = auth.uid());

CREATE POLICY "payments: élève voit les siens"
  ON payments FOR SELECT
  USING (is_student() AND student_id = auth.uid());

-- Seul le système (service_role) insère les paiements
CREATE POLICY "payments: service role insère"
  ON payments FOR INSERT
  WITH CHECK (auth_role() = 'admin');

CREATE POLICY "cash_payments: direction lit"
  ON cash_payments FOR SELECT
  USING (is_direction_same_school(school_id));

CREATE POLICY "receipts: parent voit les siens"
  ON receipts FOR SELECT
  USING (
    is_direction_same_school(school_id)
    OR (is_parent() AND parent_id = auth.uid())
  );

-- ── DISCIPLINE ────────────────────────────────────────────────────

CREATE POLICY "discipline: direction et profs lisent"
  ON discipline_records FOR SELECT
  USING (
    is_same_school(school_id)
    AND (is_direction() OR is_teacher())
  );

CREATE POLICY "discipline: direction et profs créent"
  ON discipline_records FOR INSERT
  WITH CHECK (
    is_same_school(school_id)
    AND (is_direction() OR is_teacher())
  );

CREATE POLICY "discipline: direction met à jour"
  ON discipline_records FOR UPDATE
  USING (is_direction_same_school(school_id));

-- ── DEVOIRS ──────────────────────────────────────────────────────

CREATE POLICY "devoirs: membres de l'école lisent"
  ON devoirs FOR SELECT
  USING (is_same_school(school_id));

CREATE POLICY "devoirs: prof crée les siens"
  ON devoirs FOR INSERT
  WITH CHECK (is_teacher_same_school(school_id) AND teacher_id = auth.uid());

CREATE POLICY "devoirs: prof met à jour les siens"
  ON devoirs FOR UPDATE
  USING (is_teacher_same_school(school_id) AND teacher_id = auth.uid());

CREATE POLICY "devoir_submissions: lecture"
  ON devoir_submissions FOR SELECT
  USING (
    student_id = auth.uid()
    OR devoir_id IN (SELECT id FROM devoirs WHERE school_id = auth_school_id()
                     AND (is_teacher() OR is_direction()))
  );

CREATE POLICY "devoir_submissions: élève coche"
  ON devoir_submissions FOR INSERT
  WITH CHECK (is_student() AND student_id = auth.uid());

-- ── GAMIFICATION ─────────────────────────────────────────────────

CREATE POLICY "student_xp: tous lisent"
  ON student_xp FOR SELECT
  USING (is_same_school(school_id));

-- Écriture via service_role (Edge Functions) uniquement
CREATE POLICY "student_xp: service écrit"
  ON student_xp FOR ALL
  USING (auth_role() = 'admin');

-- ── ANNONCES ─────────────────────────────────────────────────────

CREATE POLICY "announcements: membres de l'école lisent"
  ON announcements FOR SELECT
  USING (is_same_school(school_id));

CREATE POLICY "announcements: direction crée"
  ON announcements FOR INSERT
  WITH CHECK (is_direction_same_school(school_id));

CREATE POLICY "announcements: direction met à jour"
  ON announcements FOR UPDATE
  USING (is_direction_same_school(school_id));

-- Permettre à tous les membres de marquer comme lu (via array append)
CREATE POLICY "announcements: marquer lu"
  ON announcements FOR UPDATE
  USING (is_same_school(school_id))
  WITH CHECK (is_same_school(school_id));

-- ── MESSAGES ─────────────────────────────────────────────────────

CREATE POLICY "message_threads: participants lisent"
  ON message_threads FOR SELECT
  USING (auth.uid() = ANY(participants));

CREATE POLICY "message_threads: membres créent"
  ON message_threads FOR INSERT
  WITH CHECK (is_same_school(school_id) AND auth.uid() = ANY(participants));

CREATE POLICY "messages: participants lisent"
  ON messages FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM message_threads
      WHERE auth.uid() = ANY(participants)
    )
  );

CREATE POLICY "messages: participants envoient"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND thread_id IN (
      SELECT id FROM message_threads
      WHERE auth.uid() = ANY(participants)
    )
  );

-- ── COURS & EXERCICES ────────────────────────────────────────────

CREATE POLICY "courses: membres lisent les publiés ou les siens"
  ON courses FOR SELECT
  USING (
    is_same_school(school_id)
    AND (is_published = TRUE OR teacher_id = auth.uid() OR is_direction())
  );

CREATE POLICY "courses: prof crée les siens"
  ON courses FOR INSERT
  WITH CHECK (is_teacher_same_school(school_id) AND teacher_id = auth.uid());

CREATE POLICY "courses: prof met à jour les siens"
  ON courses FOR UPDATE
  USING (is_teacher_same_school(school_id) AND teacher_id = auth.uid());

CREATE POLICY "exercises: membres lisent les publiés"
  ON exercises FOR SELECT
  USING (
    is_same_school(school_id)
    AND (status = 'published' OR teacher_id = auth.uid() OR is_direction())
  );

CREATE POLICY "exercises: prof crée"
  ON exercises FOR INSERT
  WITH CHECK (is_teacher_same_school(school_id) AND teacher_id = auth.uid());

-- ── PAIE ─────────────────────────────────────────────────────────

CREATE POLICY "teacher_contracts: direction lit"
  ON teacher_contracts FOR SELECT
  USING (
    is_direction_same_school(school_id)
    OR (is_teacher() AND teacher_id = auth.uid())
  );

CREATE POLICY "teacher_contracts: direction écrit"
  ON teacher_contracts FOR ALL
  USING (is_direction_same_school(school_id));

CREATE POLICY "monthly_payroll: direction et prof lit"
  ON monthly_payroll FOR SELECT
  USING (
    is_direction_same_school(school_id)
    OR (is_teacher() AND teacher_id = auth.uid())
  );

-- ── BUDGET ───────────────────────────────────────────────────────

CREATE POLICY "budget_lines: direction"
  ON budget_lines FOR ALL
  USING (is_direction_same_school(school_id));

CREATE POLICY "expenses: direction"
  ON expenses FOR ALL
  USING (is_direction_same_school(school_id));

-- ── EXPORTS & CRM ────────────────────────────────────────────────

CREATE POLICY "export_jobs: direction"
  ON export_jobs FOR ALL
  USING (
    is_direction_same_school(school_id)
    OR requested_by = auth.uid()
  );

CREATE POLICY "inscription_leads: direction"
  ON inscription_leads FOR ALL
  USING (is_direction_same_school(school_id));

CREATE POLICY "message_logs: direction"
  ON message_logs FOR SELECT
  USING (is_direction_same_school(school_id));

-- ── CONFIG ÉCOLE ─────────────────────────────────────────────────

CREATE POLICY "school_configs: membres lisent"
  ON school_configs FOR SELECT
  USING (is_same_school(school_id));

CREATE POLICY "school_configs: direction écrit"
  ON school_configs FOR ALL
  USING (is_direction_same_school(school_id));

-- ── AUDIT LOGS (lecture seule direction) ─────────────────────────

CREATE POLICY "audit_logs: direction lit"
  ON audit_logs FOR SELECT
  USING (is_direction_same_school(school_id) OR auth_role() = 'admin');

-- Insertion uniquement via service_role (Edge Functions)
CREATE POLICY "audit_logs: service insère"
  ON audit_logs FOR INSERT
  WITH CHECK (TRUE);
