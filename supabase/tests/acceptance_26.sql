-- ============================================================
-- Tests des critères d'acceptation §26 du cahier des charges
--
-- Usage :
--   supabase db reset          -- rejoue 001 -> 013 sur une base vide
--   psql "$DB_URL" -f supabase/tests/acceptance_26.sql
--
-- Chaque test simule un utilisateur réel en posant les claims JWT
-- que Supabase injecte normalement, puis vérifie ce que RLS laisse
-- effectivement passer. Un test qui échoue lève une exception et
-- interrompt le script.
--
-- Ces tests s'exécutent dans une transaction annulée à la fin :
-- ils ne laissent aucune donnée derrière eux.
-- ============================================================

BEGIN;

SET search_path TO public;

-- ═══════════════════════════════════════════════════════════════
-- OUTILLAGE
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION assert(p_condition BOOLEAN, p_label TEXT)
RETURNS VOID AS $$
BEGIN
  IF p_condition THEN
    RAISE NOTICE '  OK   %', p_label;
  ELSE
    RAISE EXCEPTION 'ECHEC : %', p_label;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Simule un utilisateur connecté : pose auth.uid() et les claims.
CREATE OR REPLACE FUNCTION login_as(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_user_id::TEXT)::TEXT, TRUE);
  PERFORM set_config('role', 'authenticated', TRUE);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- JEU D'ESSAI : deux écoles, pour éprouver l'isolation
-- ═══════════════════════════════════════════════════════════════

-- Les insertions du jeu d'essai se font en tant que propriétaire,
-- donc hors RLS. C'est volontaire : on teste la LECTURE, pas le seed.
SET LOCAL role TO postgres;

DO $seed$
DECLARE
  v_school_a  UUID := '11111111-1111-1111-1111-111111111111';
  v_school_b  UUID := '22222222-2222-2222-2222-222222222222';
  v_dir_a     UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_prof_a1   UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
  v_prof_a2   UUID := 'aaaaaaaa-0000-0000-0000-000000000003';
  v_eleve_a1  UUID := 'aaaaaaaa-0000-0000-0000-000000000004';
  v_eleve_a2  UUID := 'aaaaaaaa-0000-0000-0000-000000000005';
  v_parent_a  UUID := 'aaaaaaaa-0000-0000-0000-000000000006';
  v_dir_b     UUID := 'bbbbbbbb-0000-0000-0000-000000000001';
  v_eleve_b   UUID := 'bbbbbbbb-0000-0000-0000-000000000002';
  v_classe_a1 UUID := 'cccccccc-0000-0000-0000-000000000001';
  v_classe_a2 UUID := 'cccccccc-0000-0000-0000-000000000002';
  v_maths     UUID := 'dddddddd-0000-0000-0000-000000000001';
BEGIN
  -- Écoles
  INSERT INTO schools (id, name, slug, academic_year) VALUES
    (v_school_a, 'Ecole Alpha', 'alpha', '2025-2026'),
    (v_school_b, 'Ecole Beta',  'beta',  '2025-2026');

  -- auth.users minimal (profiles y référence)
  INSERT INTO auth.users (id, email, instance_id, aud, role)
  SELECT u, u::TEXT || '@test.local',
         '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'
  FROM unnest(ARRAY[v_dir_a, v_prof_a1, v_prof_a2, v_eleve_a1, v_eleve_a2,
                    v_parent_a, v_dir_b, v_eleve_b]) AS u
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, school_id, role, display_name) VALUES
    (v_dir_a,    v_school_a, 'direction', 'Directeur Alpha'),
    (v_prof_a1,  v_school_a, 'teacher',   'Prof Maths Alpha'),
    (v_prof_a2,  v_school_a, 'teacher',   'Prof Autre Alpha'),
    (v_eleve_a1, v_school_a, 'student',   'Eleve A1'),
    (v_eleve_a2, v_school_a, 'student',   'Eleve A2'),
    (v_parent_a, v_school_a, 'parent',    'Parent A'),
    (v_dir_b,    v_school_b, 'direction', 'Directeur Beta'),
    (v_eleve_b,  v_school_b, 'student',   'Eleve B');

  INSERT INTO user_roles (school_id, user_id, role, scope_kind) VALUES
    (v_school_a, v_dir_a,    'directeur',  'school'),
    (v_school_a, v_prof_a1,  'enseignant', 'school'),
    (v_school_a, v_prof_a2,  'enseignant', 'school'),
    (v_school_a, v_eleve_a1, 'eleve',      'school'),
    (v_school_a, v_eleve_a2, 'eleve',      'school'),
    (v_school_a, v_parent_a, 'parent',     'school'),
    (v_school_b, v_dir_b,    'directeur',  'school'),
    (v_school_b, v_eleve_b,  'eleve',      'school')
  ON CONFLICT DO NOTHING;

  INSERT INTO classes (id, school_id, name, academic_year) VALUES
    (v_classe_a1, v_school_a, '6e A', '2025-2026'),
    (v_classe_a2, v_school_a, '6e B', '2025-2026');

  INSERT INTO subjects (id, school_id, name) VALUES
    (v_maths, v_school_a, 'Mathematiques');

  -- prof_a1 enseigne en 6e A seulement
  INSERT INTO teacher_assignments (school_id, teacher_id, class_id, subject_id, academic_year)
  VALUES (v_school_a, v_prof_a1, v_classe_a1, v_maths, '2025-2026');

  -- prof_a2 enseigne en 6e B seulement
  INSERT INTO teacher_assignments (school_id, teacher_id, class_id, subject_id, academic_year)
  VALUES (v_school_a, v_prof_a2, v_classe_a2, v_maths, '2025-2026');

  -- eleve_a1 en 6e A, eleve_a2 en 6e B
  INSERT INTO student_enrollments (school_id, student_id, academic_year, class_id, outcome) VALUES
    (v_school_a, v_eleve_a1, '2025-2026', v_classe_a1, 'en_cours'),
    (v_school_a, v_eleve_a2, '2025-2026', v_classe_a2, 'en_cours')
  ON CONFLICT (student_id, academic_year) DO UPDATE SET class_id = EXCLUDED.class_id;

  -- parent_a est rattaché à eleve_a1 UNIQUEMENT
  INSERT INTO student_guardians (school_id, student_id, guardian_id, guardian_name, relation, is_financial)
  VALUES (v_school_a, v_eleve_a1, v_parent_a, 'Parent A', 'pere', TRUE);

  -- Données santé pour eleve_a1
  INSERT INTO student_health (student_id, school_id, blood_group, allergies)
  VALUES (v_eleve_a1, v_school_a, 'O+', ARRAY['arachide']);
END
$seed$;

-- ═══════════════════════════════════════════════════════════════
-- §26.1 — Une école ne voit jamais les données d'une autre
-- ═══════════════════════════════════════════════════════════════

RESET role;
SET LOCAL role TO authenticated;

DO $t1$
DECLARE n INT;
BEGIN
  RAISE NOTICE '--- 26.1 Isolation multi-tenant ---';

  PERFORM login_as('aaaaaaaa-0000-0000-0000-000000000001'::UUID);  -- directeur A

  SELECT COUNT(*) INTO n FROM classes;
  PERFORM assert(n = 2, 'Directeur A voit ses 2 classes');

  SELECT COUNT(*) INTO n FROM classes WHERE school_id = '22222222-2222-2222-2222-222222222222';
  PERFORM assert(n = 0, 'Directeur A ne voit aucune classe de l ecole B');

  SELECT COUNT(*) INTO n FROM student_guardians
   WHERE school_id = '22222222-2222-2222-2222-222222222222';
  PERFORM assert(n = 0, 'Directeur A ne voit aucun tuteur de l ecole B');

  PERFORM login_as('bbbbbbbb-0000-0000-0000-000000000001'::UUID);  -- directeur B

  SELECT COUNT(*) INTO n FROM classes;
  PERFORM assert(n = 0, 'Directeur B ne voit aucune classe de l ecole A');

  SELECT COUNT(*) INTO n FROM student_enrollments;
  PERFORM assert(n = 0, 'Directeur B ne voit aucune inscription de l ecole A');
END
$t1$;

-- ═══════════════════════════════════════════════════════════════
-- §26.2 — Un enseignant ne modifie que ses classes et matières
-- ═══════════════════════════════════════════════════════════════

DO $t2$
DECLARE
  v_prof_a1   UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
  v_classe_a1 UUID := 'cccccccc-0000-0000-0000-000000000001';
  v_classe_a2 UUID := 'cccccccc-0000-0000-0000-000000000002';
  v_maths     UUID := 'dddddddd-0000-0000-0000-000000000001';
  v_ok        BOOLEAN;
BEGIN
  RAISE NOTICE '--- 26.2 Perimetre enseignant ---';

  PERFORM login_as(v_prof_a1);

  PERFORM assert(teaches_class(v_classe_a1), 'Prof A1 est affecte a la 6e A');
  PERFORM assert(NOT teaches_class(v_classe_a2), 'Prof A1 n est PAS affecte a la 6e B');

  -- Évaluation dans SA classe : doit passer
  BEGIN
    INSERT INTO assessments (school_id, class_id, subject_id, teacher_id, academic_year, title, max_score)
    VALUES ('11111111-1111-1111-1111-111111111111', v_classe_a1, v_maths, v_prof_a1,
            '2025-2026', 'Controle 1', 20);
    v_ok := TRUE;
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    v_ok := FALSE;
  END;
  PERFORM assert(v_ok, 'Prof A1 peut creer une evaluation dans SA classe');

  -- Évaluation dans la classe d'un collègue : doit être refusée
  BEGIN
    INSERT INTO assessments (school_id, class_id, subject_id, teacher_id, academic_year, title, max_score)
    VALUES ('11111111-1111-1111-1111-111111111111', v_classe_a2, v_maths, v_prof_a1,
            '2025-2026', 'Intrusion', 20);
    v_ok := TRUE;
  EXCEPTION WHEN insufficient_privilege THEN
    v_ok := FALSE;
  END;
  PERFORM assert(NOT v_ok, 'Prof A1 ne peut PAS creer une evaluation dans la 6e B');
END
$t2$;

-- ═══════════════════════════════════════════════════════════════
-- §26.3 — Un parent ne voit que ses enfants rattachés
-- ═══════════════════════════════════════════════════════════════

DO $t3$
DECLARE
  v_parent_a UUID := 'aaaaaaaa-0000-0000-0000-000000000006';
  v_eleve_a1 UUID := 'aaaaaaaa-0000-0000-0000-000000000004';
  v_eleve_a2 UUID := 'aaaaaaaa-0000-0000-0000-000000000005';
  n INT;
BEGIN
  RAISE NOTICE '--- 26.3 Perimetre parent ---';

  PERFORM login_as(v_parent_a);

  PERFORM assert(is_my_child(v_eleve_a1), 'Parent A est rattache a l eleve A1');
  PERFORM assert(NOT is_my_child(v_eleve_a2), 'Parent A n est PAS rattache a l eleve A2');
  PERFORM assert(array_length(my_children(), 1) = 1, 'Parent A a exactement 1 enfant');

  SELECT COUNT(*) INTO n FROM student_enrollments;
  PERFORM assert(n = 1, 'Parent A ne voit que la scolarite de son enfant');

  SELECT COUNT(*) INTO n FROM student_health WHERE student_id = v_eleve_a2;
  PERFORM assert(n = 0, 'Parent A ne voit pas la sante de l enfant d autrui');

  SELECT COUNT(*) INTO n FROM student_health WHERE student_id = v_eleve_a1;
  PERFORM assert(n = 1, 'Parent A voit la sante de SON enfant');
END
$t3$;

-- ═══════════════════════════════════════════════════════════════
-- §21.2 — Santé : hors de portée des enseignants et des élèves
-- ═══════════════════════════════════════════════════════════════

DO $t4$
DECLARE n INT;
BEGIN
  RAISE NOTICE '--- 21.2 Donnees de sante ---';

  PERFORM login_as('aaaaaaaa-0000-0000-0000-000000000002'::UUID);  -- prof
  SELECT COUNT(*) INTO n FROM student_health;
  PERFORM assert(n = 0, 'Un enseignant ne voit aucune donnee de sante');

  PERFORM login_as('aaaaaaaa-0000-0000-0000-000000000004'::UUID);  -- eleve lui-meme
  SELECT COUNT(*) INTO n FROM student_health;
  PERFORM assert(n = 0, 'Un eleve ne consulte pas son propre dossier medical');

  PERFORM login_as('aaaaaaaa-0000-0000-0000-000000000001'::UUID);  -- directeur
  SELECT COUNT(*) INTO n FROM student_health;
  PERFORM assert(n = 1, 'Le directeur accede au dossier medical');
END
$t4$;

-- ═══════════════════════════════════════════════════════════════
-- §26.4 — Une note publiée suit le workflow, son historique existe
-- ═══════════════════════════════════════════════════════════════

DO $t5$
DECLARE
  v_prof_a1  UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
  v_eleve_a1 UUID := 'aaaaaaaa-0000-0000-0000-000000000004';
  v_assess   UUID;
  v_grade    UUID;
  n INT;
BEGIN
  RAISE NOTICE '--- 26.4 Notes et tracabilite ---';

  PERFORM login_as(v_prof_a1);

  SELECT id INTO v_assess FROM assessments WHERE title = 'Controle 1' LIMIT 1;

  INSERT INTO grades (school_id, assessment_id, student_id, score, entered_by)
  VALUES ('11111111-1111-1111-1111-111111111111', v_assess, v_eleve_a1, 14, v_prof_a1)
  RETURNING id INTO v_grade;

  PERFORM assert(v_grade IS NOT NULL, 'Le prof saisit une note dans sa classe');

  -- Modification : doit laisser une trace
  UPDATE grades SET score = 16 WHERE id = v_grade;

  SELECT COUNT(*) INTO n FROM grade_history WHERE grade_id = v_grade;
  PERFORM assert(n = 1, 'La modification de note est historisee');

  SELECT COUNT(*) INTO n FROM grade_history
   WHERE grade_id = v_grade AND old_score = 14 AND new_score = 16;
  PERFORM assert(n = 1, 'L historique retient l ancienne ET la nouvelle valeur');
END
$t5$;

-- ═══════════════════════════════════════════════════════════════
-- §26.5 — Un paiement n'est « payé » qu'après confirmation
-- ═══════════════════════════════════════════════════════════════

DO $t6$
DECLARE
  v_school   UUID := '11111111-1111-1111-1111-111111111111';
  v_eleve_a1 UUID := 'aaaaaaaa-0000-0000-0000-000000000004';
  v_invoice  UUID;
  v_status   invoice_status;
  v_paid     NUMERIC;
BEGIN
  RAISE NOTICE '--- 26.5 Paiement et idempotence ---';

  PERFORM set_config('role','postgres',TRUE);

  INSERT INTO invoices (school_id, student_id, academic_year, invoice_num, status, due_date)
  VALUES (v_school, v_eleve_a1, '2025-2026', 'FAC-TEST-001', 'emise', CURRENT_DATE + 30)
  RETURNING id INTO v_invoice;

  INSERT INTO invoice_lines (invoice_id, kind, label, amount)
  VALUES (v_invoice, 'scolarite', 'Trimestre 1', 100000);

  PERFORM recompute_invoice(v_invoice);

  SELECT net_amount, status INTO v_paid, v_status FROM invoices WHERE id = v_invoice;
  PERFORM assert(v_paid = 100000, 'Le net de la facture vient des lignes');
  PERFORM assert(v_status = 'emise', 'Sans paiement, la facture reste emise');

  -- Paiement initié mais NON confirmé
  INSERT INTO payments (school_id, student_id, invoice_id, amount, status,
                        provider, provider_ref, idempotency_key)
  VALUES (v_school, v_eleve_a1, v_invoice, 100000, 'pending',
          'cinetpay', 'TXN-TEST-1', 'IDEM-1');

  SELECT status INTO v_status FROM invoices WHERE id = v_invoice;
  PERFORM assert(v_status = 'emise',
    'Un paiement pending ne rend PAS la facture payee');

  -- Confirmation serveur
  UPDATE payments SET status = 'success', webhook_verified = TRUE
   WHERE idempotency_key = 'IDEM-1';

  SELECT status, paid_amount INTO v_status, v_paid FROM invoices WHERE id = v_invoice;
  PERFORM assert(v_status = 'payee', 'Apres confirmation, la facture est payee');
  PERFORM assert(v_paid = 100000, 'Le montant paye est reporte sur la facture');

  -- §22 : rejouer le même webhook ne doit pas doubler l'encaissement
  BEGIN
    INSERT INTO payments (school_id, student_id, invoice_id, amount, status,
                          provider, provider_ref, idempotency_key)
    VALUES (v_school, v_eleve_a1, v_invoice, 100000, 'success',
            'cinetpay', 'TXN-TEST-1', 'IDEM-1');
    PERFORM assert(FALSE, 'Le doublon de webhook aurait du etre rejete');
  EXCEPTION WHEN unique_violation THEN
    PERFORM assert(TRUE, 'Un webhook rejoue est rejete (idempotence)');
  END;

  SELECT paid_amount INTO v_paid FROM invoices WHERE id = v_invoice;
  PERFORM assert(v_paid = 100000, 'Le montant paye n a pas double');
END
$t6$;

-- ═══════════════════════════════════════════════════════════════
-- §26.6 — Une opération hors ligne se retrouve dans la file
-- ═══════════════════════════════════════════════════════════════

DO $t7$
DECLARE
  v_prof_a1 UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
  n INT;
  v_ok BOOLEAN;
BEGIN
  RAISE NOTICE '--- 26.6 File de synchronisation ---';

  PERFORM set_config('role','authenticated',TRUE);
  PERFORM login_as(v_prof_a1);

  INSERT INTO sync_operations (school_id, user_id, client_op_id, op_type, label,
                               payload, client_created_at)
  VALUES ('11111111-1111-1111-1111-111111111111', v_prof_a1, 'op-local-1',
          'saveAttendance', 'Presence de la 6e A', '{"n":28}'::jsonb, NOW());

  SELECT COUNT(*) INTO n FROM sync_operations WHERE status = 'en_attente';
  PERFORM assert(n = 1, 'L operation hors ligne apparait en attente');

  -- Rejouer la même opération locale ne la duplique pas
  BEGIN
    INSERT INTO sync_operations (school_id, user_id, client_op_id, op_type, label,
                                 payload, client_created_at)
    VALUES ('11111111-1111-1111-1111-111111111111', v_prof_a1, 'op-local-1',
            'saveAttendance', 'Presence de la 6e A', '{"n":28}'::jsonb, NOW());
    v_ok := TRUE;
  EXCEPTION WHEN unique_violation THEN
    v_ok := FALSE;
  END;
  PERFORM assert(NOT v_ok, 'Rejouer une operation locale ne la duplique pas');

  -- Un autre utilisateur ne voit pas cette file
  PERFORM login_as('aaaaaaaa-0000-0000-0000-000000000003'::UUID);
  SELECT COUNT(*) INTO n FROM sync_operations;
  PERFORM assert(n = 0, 'La file de sync est privee a son auteur');
END
$t7$;

-- ═══════════════════════════════════════════════════════════════
-- §26.9 — Les solutions ne fuient jamais côté élève
-- ═══════════════════════════════════════════════════════════════

DO $t8$
DECLARE
  v_prof_a1  UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
  v_eleve_a1 UUID := 'aaaaaaaa-0000-0000-0000-000000000004';
  n INT;
BEGIN
  RAISE NOTICE '--- 26.9 Solutions d exercices ---';

  PERFORM login_as(v_prof_a1);
  INSERT INTO teacher_solutions (school_id, solution, explanation, created_by)
  VALUES ('11111111-1111-1111-1111-111111111111',
          'x = 4', 'On isole x', v_prof_a1);

  SELECT COUNT(*) INTO n FROM teacher_solutions;
  PERFORM assert(n = 1, 'L auteur voit sa propre solution');

  PERFORM login_as(v_eleve_a1);
  SELECT COUNT(*) INTO n FROM teacher_solutions;
  PERFORM assert(n = 0, 'Un eleve ne voit AUCUNE solution');

  PERFORM login_as('aaaaaaaa-0000-0000-0000-000000000003'::UUID);  -- autre prof
  SELECT COUNT(*) INTO n FROM teacher_solutions;
  PERFORM assert(n = 0, 'Un autre enseignant ne voit pas la solution d un collegue');
END
$t8$;

-- ═══════════════════════════════════════════════════════════════
-- §3.1 — Cumul de rôles
-- ═══════════════════════════════════════════════════════════════

DO $t9$
DECLARE
  v_prof_a1 UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
BEGIN
  RAISE NOTICE '--- 3.1 Cumul de roles ---';

  PERFORM set_config('role','postgres',TRUE);
  -- Le prof devient aussi Directeur des Etudes, cas courant
  INSERT INTO user_roles (school_id, user_id, role, scope_kind)
  VALUES ('11111111-1111-1111-1111-111111111111', v_prof_a1, 'de', 'school')
  ON CONFLICT DO NOTHING;

  PERFORM set_config('role','authenticated',TRUE);
  PERFORM login_as(v_prof_a1);

  PERFORM assert(has_role('enseignant'), 'Le cumul conserve le role enseignant');
  PERFORM assert(has_role('de'),         'Le cumul ajoute le role DE');
  PERFORM assert(array_length(auth_roles(), 1) = 2, 'Deux roles actifs simultanement');
  PERFORM assert(can('grades', 'validate'),
    'Le cumul DE ouvre la validation des notes');
END
$t9$;

-- ═══════════════════════════════════════════════════════════════
-- §5.2 / §26.2 — Période fermée : plus de saisie
-- ═══════════════════════════════════════════════════════════════

DO $t10$
DECLARE
  v_period UUID;
BEGIN
  RAISE NOTICE '--- 5.2 Verrouillage de periode ---';

  PERFORM set_config('role','postgres',TRUE);
  SELECT id INTO v_period FROM academic_periods
   WHERE school_id = '11111111-1111-1111-1111-111111111111' AND code = 'T1';

  PERFORM assert(period_is_open(v_period), 'La periode T1 est ouverte par defaut');

  UPDATE academic_periods SET is_locked = TRUE WHERE id = v_period;
  PERFORM assert(NOT period_is_open(v_period), 'Une periode verrouillee est fermee');

  UPDATE academic_periods SET is_locked = FALSE WHERE id = v_period;
END
$t10$;

-- ═══════════════════════════════════════════════════════════════

DO $done$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TOUS LES TESTS SONT PASSES';
  RAISE NOTICE '========================================';
END
$done$;

ROLLBACK;
