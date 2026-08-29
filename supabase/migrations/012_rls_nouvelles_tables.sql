-- ============================================================
-- 012 — Row Level Security pour les tables 004 à 011
-- Cahier des charges §21.1, §26 (critères d'acceptation)
--
-- Règles cardinales :
--   1. École A ne voit jamais école B  -> is_same_school(school_id)
--   2. Enseignant limité à ses classes -> teaches_class(class_id)
--   3. Parent limité à ses enfants     -> is_my_child(student_id)
--   4. Élève limité à lui-même         -> auth.uid() = student_id
--   5. Données santé : accès restreint + journalisé
--   6. Solutions d'exercices : jamais lisibles côté client
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- ACTIVATION
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE sites                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_context      ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_guardians        ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorized_pickups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_health           ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_access_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE required_documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_signals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_followups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years           ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_periods         ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_rules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_weights       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_coefficients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE curricula                ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_capacities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_history            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_summaries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_corrections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_configs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_candidates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_invigilators        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines            ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_reasons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_justifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_permissions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_participants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_summons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_absences         ENABLE ROW LEVEL SECURITY;
ALTER TABLE replacements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_books            ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_copies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_loans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_reservations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_vehicles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_routes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_stops          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_boardings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_incidents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE infirmary_visits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccinations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tickets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_records            ENABLE ROW LEVEL SECURITY;
ALTER TABLE canteen_menus            ENABLE ROW LEVEL SECURITY;
ALTER TABLE canteen_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE canteen_meals_served     ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_receipts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_flags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_replies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_quotas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_solutions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_usage             ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_versions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations          ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- IDENTITÉ, RÔLES, STRUCTURE
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY sites_read ON sites FOR SELECT
  USING (is_same_school(school_id) OR is_super_admin());
CREATE POLICY sites_write ON sites FOR ALL
  USING (is_direction() AND is_same_school(school_id))
  WITH CHECK (is_direction() AND is_same_school(school_id));

-- Chacun voit ses propres rôles ; seule la direction les attribue.
CREATE POLICY user_roles_read ON user_roles FOR SELECT
  USING (user_id = auth.uid() OR (is_same_school(school_id) AND is_school_staff()) OR is_super_admin());
CREATE POLICY user_roles_write ON user_roles FOR ALL
  USING (is_direction() AND is_same_school(school_id))
  WITH CHECK (is_direction() AND is_same_school(school_id));

CREATE POLICY context_own ON user_active_context FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Les permissions sont lisibles par tous (l'UI en a besoin),
-- modifiables seulement par la direction de l'école concernée.
CREATE POLICY perms_read ON role_permissions FOR SELECT
  USING (school_id IS NULL OR is_same_school(school_id));
CREATE POLICY perms_write ON role_permissions FOR ALL
  USING (is_direction() AND school_id IS NOT NULL AND is_same_school(school_id))
  WITH CHECK (is_direction() AND school_id IS NOT NULL AND is_same_school(school_id));

CREATE POLICY assign_read ON teacher_assignments FOR SELECT
  USING (is_same_school(school_id));
CREATE POLICY assign_write ON teacher_assignments FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de','secretaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de','secretaire'));

-- ═══════════════════════════════════════════════════════════════
-- DOSSIER ÉLÈVE
-- ═══════════════════════════════════════════════════════════════

-- §26 : « un parent ne voit que les enfants auxquels il est rattaché »
CREATE POLICY guardians_read ON student_guardians FOR SELECT
  USING (
    is_same_school(school_id)
    AND (guardian_id = auth.uid() OR student_id = auth.uid() OR is_school_staff() OR is_direction())
  );
CREATE POLICY guardians_write ON student_guardians FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','secretaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','secretaire'));

CREATE POLICY pickups_read ON authorized_pickups FOR SELECT
  USING (is_same_school(school_id) AND (is_my_child(student_id) OR is_school_staff() OR is_direction()));
CREATE POLICY pickups_write ON authorized_pickups FOR ALL
  USING (is_same_school(school_id) AND (is_my_child(student_id) OR has_any_role('directeur','secretaire','sg')))
  WITH CHECK (is_same_school(school_id) AND (is_my_child(student_id) OR has_any_role('directeur','secretaire','sg')));

-- §21.2 : santé — accès strictement nécessaire.
-- Ni l'enseignant ni l'élève lui-même n'y accèdent librement.
CREATE POLICY health_read ON student_health FOR SELECT
  USING (
    is_same_school(school_id)
    AND (is_my_child(student_id) OR has_any_role('directeur','sg','support'))
  );
CREATE POLICY health_write ON student_health FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','sg','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','sg','support'));

CREATE POLICY health_log_read ON health_access_log FOR SELECT
  USING (is_same_school(school_id) AND is_direction());
CREATE POLICY health_log_insert ON health_access_log FOR INSERT
  WITH CHECK (is_same_school(school_id));

CREATE POLICY docs_read ON student_documents FOR SELECT
  USING (is_same_school(school_id) AND can_see_student(student_id));
CREATE POLICY docs_write ON student_documents FOR ALL
  USING (is_same_school(school_id) AND (has_any_role('directeur','secretaire') OR is_my_child(student_id)))
  WITH CHECK (is_same_school(school_id) AND (has_any_role('directeur','secretaire') OR is_my_child(student_id)));

CREATE POLICY reqdocs_read ON required_documents FOR SELECT
  USING (is_same_school(school_id));
CREATE POLICY reqdocs_write ON required_documents FOR ALL
  USING (is_same_school(school_id) AND is_direction())
  WITH CHECK (is_same_school(school_id) AND is_direction());

CREATE POLICY consents_own ON consents FOR ALL
  USING (user_id = auth.uid() OR (is_same_school(school_id) AND is_direction()))
  WITH CHECK (user_id = auth.uid());

CREATE POLICY enroll_read ON student_enrollments FOR SELECT
  USING (is_same_school(school_id) AND can_see_student(student_id));
CREATE POLICY enroll_write ON student_enrollments FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','secretaire','de'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','secretaire','de'));

-- Les signaux de risque ne sont jamais visibles par l'élève ni le parent.
CREATE POLICY risk_read ON risk_signals FOR SELECT
  USING (is_same_school(school_id) AND (is_school_staff() OR is_direction() OR assigned_to = auth.uid()));
CREATE POLICY risk_write ON risk_signals FOR ALL
  USING (is_same_school(school_id) AND (is_school_staff() OR is_direction()))
  WITH CHECK (is_same_school(school_id) AND (is_school_staff() OR is_direction()));

CREATE POLICY risk_fu_all ON risk_followups FOR ALL
  USING (EXISTS (SELECT 1 FROM risk_signals r WHERE r.id = signal_id
                   AND is_same_school(r.school_id) AND (is_school_staff() OR is_direction())))
  WITH CHECK (EXISTS (SELECT 1 FROM risk_signals r WHERE r.id = signal_id
                   AND is_same_school(r.school_id) AND (is_school_staff() OR is_direction())));

-- ═══════════════════════════════════════════════════════════════
-- RÉFÉRENTIEL ACADÉMIQUE — lecture large, écriture DE/direction
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY years_read ON academic_years FOR SELECT USING (is_same_school(school_id));
CREATE POLICY years_write ON academic_years FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de'));

CREATE POLICY periods_read ON academic_periods FOR SELECT USING (is_same_school(school_id));
CREATE POLICY periods_write ON academic_periods FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de'));

CREATE POLICY grules_read ON grading_rules FOR SELECT USING (is_same_school(school_id));
CREATE POLICY grules_write ON grading_rules FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de'));

CREATE POLICY aweights_read ON assessment_weights FOR SELECT USING (is_same_school(school_id));
CREATE POLICY aweights_write ON assessment_weights FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de'));

CREATE POLICY scoef_read ON subject_coefficients FOR SELECT USING (is_same_school(school_id));
CREATE POLICY scoef_write ON subject_coefficients FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de'));

CREATE POLICY curric_read ON curricula FOR SELECT USING (is_same_school(school_id));
CREATE POLICY curric_write ON curricula FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de'));

CREATE POLICY cprog_read ON curriculum_progress FOR SELECT USING (is_same_school(school_id));
CREATE POLICY cprog_write ON curriculum_progress FOR ALL
  USING (is_same_school(school_id) AND (teaches_class(class_id) OR has_any_role('directeur','de')))
  WITH CHECK (is_same_school(school_id) AND (teaches_class(class_id) OR has_any_role('directeur','de')));

CREATE POLICY rooms_read ON rooms FOR SELECT USING (is_same_school(school_id));
CREATE POLICY rooms_write ON rooms FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de','secretaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de','secretaire'));

-- ═══════════════════════════════════════════════════════════════
-- ADMISSIONS — jamais visibles par les élèves ni les parents
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY apps_read ON applications FOR SELECT
  USING (is_same_school(school_id) AND (is_school_staff() OR is_direction()));
CREATE POLICY apps_write ON applications FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','secretaire','de'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','secretaire','de'));

CREATE POLICY appdocs_all ON application_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM applications a WHERE a.id = application_id
                   AND is_same_school(a.school_id) AND is_school_staff()))
  WITH CHECK (EXISTS (SELECT 1 FROM applications a WHERE a.id = application_id
                   AND is_same_school(a.school_id) AND is_school_staff()));

CREATE POLICY appevents_read ON application_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM applications a WHERE a.id = application_id
                   AND is_same_school(a.school_id) AND is_school_staff()));

CREATE POLICY capacities_read ON level_capacities FOR SELECT USING (is_same_school(school_id));
CREATE POLICY capacities_write ON level_capacities FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de'));

-- ═══════════════════════════════════════════════════════════════
-- ÉVALUATIONS ET NOTES
-- §26 : « un enseignant ne peut modifier que ses classes,
--         matières et périodes ouvertes »
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY assess_read ON assessments FOR SELECT
  USING (
    is_same_school(school_id)
    AND (
      is_direction() OR has_any_role('de','sg','secretaire')
      OR teacher_id = auth.uid()
      OR teaches_class(class_id)
      -- Élève/parent : seulement une évaluation publiée de sa classe
      OR (state = 'publie' AND EXISTS (
            SELECT 1 FROM student_enrollments se
            WHERE se.class_id = assessments.class_id
              AND (se.student_id = auth.uid() OR is_my_child(se.student_id))))
    )
  );

CREATE POLICY assess_insert ON assessments FOR INSERT
  WITH CHECK (
    is_same_school(school_id)
    AND (
      has_any_role('directeur','de')
      OR (teacher_id = auth.uid() AND teaches_class(class_id, subject_id)
          AND (period_id IS NULL OR period_is_open(period_id)))
    )
  );

CREATE POLICY assess_update ON assessments FOR UPDATE
  USING (
    is_same_school(school_id)
    AND (
      has_any_role('directeur','de')
      -- L'enseignant ne modifie que ses propres évaluations non validées
      OR (teacher_id = auth.uid() AND state IN ('brouillon','rejete')
          AND (period_id IS NULL OR period_is_open(period_id)))
    )
  );

CREATE POLICY assess_delete ON assessments FOR DELETE
  USING (
    is_same_school(school_id)
    AND (has_any_role('directeur','de')
         OR (teacher_id = auth.uid() AND state = 'brouillon'))
  );

CREATE POLICY grades_read ON grades FOR SELECT
  USING (
    is_same_school(school_id)
    AND (
      student_id = auth.uid()
      OR is_my_child(student_id)
      OR is_direction() OR has_any_role('de','sg')
      OR EXISTS (SELECT 1 FROM assessments a WHERE a.id = assessment_id
                   AND (a.teacher_id = auth.uid() OR teaches_class(a.class_id)))
    )
  );

CREATE POLICY grades_insert ON grades FOR INSERT
  WITH CHECK (
    is_same_school(school_id)
    AND EXISTS (
      SELECT 1 FROM assessments a
      WHERE a.id = assessment_id
        AND (has_any_role('directeur','de')
             OR (a.teacher_id = auth.uid()
                 AND a.state IN ('brouillon','rejete')
                 AND (a.period_id IS NULL OR period_is_open(a.period_id))))
    )
  );

CREATE POLICY grades_update ON grades FOR UPDATE
  USING (
    is_same_school(school_id)
    AND EXISTS (
      SELECT 1 FROM assessments a
      WHERE a.id = assessment_id
        AND (has_any_role('directeur','de')
             OR (a.teacher_id = auth.uid()
                 AND a.state IN ('brouillon','rejete')
                 AND (a.period_id IS NULL OR period_is_open(a.period_id))))
    )
  );

-- L'historique se lit, ne s'écrit ni ne s'efface depuis le client.
CREATE POLICY ghist_read ON grade_history FOR SELECT
  USING (is_same_school(school_id) AND (is_direction() OR has_role('de')));

CREATE POLICY bsum_read ON bulletin_summaries FOR SELECT
  USING (
    is_same_school(school_id)
    AND (
      is_direction() OR has_any_role('de','secretaire','sg')
      OR EXISTS (SELECT 1 FROM teacher_assignments ta
                   WHERE ta.teacher_id = auth.uid() AND ta.class_id = bulletin_summaries.class_id)
      -- Élève et parent : uniquement après publication (§13.3)
      OR (state = 'publie' AND (student_id = auth.uid() OR is_my_child(student_id)))
    )
  );

CREATE POLICY bsum_write ON bulletin_summaries FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de','enseignant'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de','enseignant'));

CREATE POLICY bcorr_read ON bulletin_corrections FOR SELECT
  USING (EXISTS (SELECT 1 FROM bulletin_summaries b WHERE b.id = summary_id
                   AND is_same_school(b.school_id) AND (is_direction() OR has_role('de'))));
CREATE POLICY bcorr_insert ON bulletin_corrections FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM bulletin_summaries b WHERE b.id = summary_id
                   AND is_same_school(b.school_id) AND (is_direction() OR has_role('de'))));

-- ═══════════════════════════════════════════════════════════════
-- WORKFLOWS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY wfconf_read ON workflow_configs FOR SELECT USING (is_same_school(school_id));
CREATE POLICY wfconf_write ON workflow_configs FOR ALL
  USING (is_same_school(school_id) AND is_direction())
  WITH CHECK (is_same_school(school_id) AND is_direction());

CREATE POLICY wfinst_read ON workflow_instances FOR SELECT
  USING (is_same_school(school_id) AND (is_school_staff() OR is_direction() OR assigned_to = auth.uid() OR started_by = auth.uid()));
CREATE POLICY wfinst_write ON workflow_instances FOR ALL
  USING (is_same_school(school_id) AND (is_school_staff() OR is_direction()))
  WITH CHECK (is_same_school(school_id));

CREATE POLICY wflog_read ON workflow_steps_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM workflow_instances w WHERE w.id = instance_id AND is_same_school(w.school_id)));
CREATE POLICY wflog_insert ON workflow_steps_log FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workflow_instances w WHERE w.id = instance_id AND is_same_school(w.school_id)));

-- ═══════════════════════════════════════════════════════════════
-- EXAMENS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY exams_read ON exams FOR SELECT
  USING (is_same_school(school_id) AND (is_published OR is_school_staff() OR is_direction()));
CREATE POLICY exams_write ON exams FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de'));

CREATE POLICY esess_read ON exam_sessions FOR SELECT USING (is_same_school(school_id));
CREATE POLICY esess_write ON exam_sessions FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de'));

CREATE POLICY ecand_read ON exam_candidates FOR SELECT
  USING (is_same_school(school_id)
         AND (student_id = auth.uid() OR is_my_child(student_id) OR is_school_staff() OR is_direction()));
CREATE POLICY ecand_write ON exam_candidates FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de','secretaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de','secretaire'));

CREATE POLICY einv_read ON exam_invigilators FOR SELECT
  USING (EXISTS (SELECT 1 FROM exam_sessions s WHERE s.id = session_id AND is_same_school(s.school_id)));
CREATE POLICY einv_write ON exam_invigilators FOR ALL
  USING (EXISTS (SELECT 1 FROM exam_sessions s WHERE s.id = session_id
                   AND is_same_school(s.school_id) AND has_any_role('directeur','de')))
  WITH CHECK (EXISTS (SELECT 1 FROM exam_sessions s WHERE s.id = session_id
                   AND is_same_school(s.school_id) AND has_any_role('directeur','de')));

-- ═══════════════════════════════════════════════════════════════
-- FINANCE — l'enseignant n'y a aucun accès
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY fee_struct_read ON fee_structures FOR SELECT
  USING (is_same_school(school_id) AND (has_any_role('directeur','gestionnaire','secretaire') OR is_parent()));
CREATE POLICY fee_struct_write ON fee_structures FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'));

CREATE POLICY fee_items_read ON fee_items FOR SELECT
  USING (is_same_school(school_id) AND (has_any_role('directeur','gestionnaire','secretaire') OR is_parent()));
CREATE POLICY fee_items_write ON fee_items FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'));

CREATE POLICY discounts_read ON discounts FOR SELECT
  USING (is_same_school(school_id)
         AND (is_my_child(student_id) OR has_any_role('directeur','gestionnaire')));
CREATE POLICY discounts_write ON discounts FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'));

CREATE POLICY invoices_read ON invoices FOR SELECT
  USING (
    is_same_school(school_id)
    AND (student_id = auth.uid() OR is_my_child(student_id) OR guardian_id = auth.uid()
         OR has_any_role('directeur','gestionnaire','secretaire'))
  );
CREATE POLICY invoices_write ON invoices FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'));

CREATE POLICY ilines_read ON invoice_lines FOR SELECT
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id
                   AND is_same_school(i.school_id)
                   AND (i.student_id = auth.uid() OR is_my_child(i.student_id)
                        OR has_any_role('directeur','gestionnaire','secretaire'))));
CREATE POLICY ilines_write ON invoice_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id
                   AND is_same_school(i.school_id) AND has_any_role('directeur','gestionnaire')))
  WITH CHECK (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id
                   AND is_same_school(i.school_id) AND has_any_role('directeur','gestionnaire')));

CREATE POLICY install_read ON installments FOR SELECT
  USING (is_same_school(school_id)
         AND (student_id = auth.uid() OR is_my_child(student_id)
              OR has_any_role('directeur','gestionnaire','secretaire')));
CREATE POLICY install_write ON installments FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'));

-- §22 : les webhooks n'appartiennent à aucun client.
-- Seul le service_role (Edge Function) y touche : aucune policy permissive.
CREATE POLICY webhooks_none ON payment_webhooks FOR SELECT USING (is_super_admin());

CREATE POLICY refunds_read ON refunds FOR SELECT
  USING (is_same_school(school_id)
         AND (is_my_child(student_id) OR has_any_role('directeur','gestionnaire')));
CREATE POLICY refunds_write ON refunds FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'));

CREATE POLICY cashsess_read ON cash_sessions FOR SELECT
  USING (is_same_school(school_id) AND (cashier_id = auth.uid() OR has_any_role('directeur','gestionnaire')));
CREATE POLICY cashsess_write ON cash_sessions FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'));

CREATE POLICY cashmov_read ON cash_movements FOR SELECT
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'));
CREATE POLICY cashmov_write ON cash_movements FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'));

CREATE POLICY suppliers_read ON suppliers FOR SELECT
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire','support'));
CREATE POLICY suppliers_write ON suppliers FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'));

-- ═══════════════════════════════════════════════════════════════
-- VIE SCOLAIRE
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY reasons_read ON absence_reasons FOR SELECT USING (is_same_school(school_id));
CREATE POLICY reasons_write ON absence_reasons FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','sg'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','sg'));

-- Le parent dépose un justificatif ; le SG le valide.
CREATE POLICY justif_read ON absence_justifications FOR SELECT
  USING (is_same_school(school_id) AND can_see_student(student_id));
CREATE POLICY justif_insert ON absence_justifications FOR INSERT
  WITH CHECK (is_same_school(school_id)
              AND (is_my_child(student_id) OR has_any_role('sg','secretaire','directeur')));
CREATE POLICY justif_update ON absence_justifications FOR UPDATE
  USING (is_same_school(school_id) AND has_any_role('sg','directeur','de'));

CREATE POLICY exits_read ON exit_permissions FOR SELECT
  USING (is_same_school(school_id) AND can_see_student(student_id));
CREATE POLICY exits_insert ON exit_permissions FOR INSERT
  WITH CHECK (is_same_school(school_id)
              AND (is_my_child(student_id) OR has_any_role('sg','directeur','secretaire')));
CREATE POLICY exits_update ON exit_permissions FOR UPDATE
  USING (is_same_school(school_id) AND has_any_role('sg','directeur'));

-- Un incident confidentiel n'est lisible que par direction et SG.
CREATE POLICY incidents_read ON incidents FOR SELECT
  USING (
    is_same_school(school_id)
    AND (
      has_any_role('directeur','sg','de')
      OR (NOT is_confidential AND declared_by = auth.uid())
    )
  );
CREATE POLICY incidents_write ON incidents FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','sg','de','enseignant'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','sg','de','enseignant'));

CREATE POLICY iparts_all ON incident_participants FOR ALL
  USING (EXISTS (SELECT 1 FROM incidents i WHERE i.id = incident_id
                   AND is_same_school(i.school_id) AND has_any_role('directeur','sg','de')))
  WITH CHECK (EXISTS (SELECT 1 FROM incidents i WHERE i.id = incident_id
                   AND is_same_school(i.school_id) AND has_any_role('directeur','sg','de')));

CREATE POLICY summons_read ON parent_summons FOR SELECT
  USING (is_same_school(school_id)
         AND (is_my_child(student_id) OR guardian_id = auth.uid() OR has_any_role('directeur','sg','de')));
CREATE POLICY summons_write ON parent_summons FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','sg','de'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','sg','de'));

CREATE POLICY tabs_read ON teacher_absences FOR SELECT
  USING (is_same_school(school_id) AND (teacher_id = auth.uid() OR has_any_role('directeur','de','sg')));
CREATE POLICY tabs_write ON teacher_absences FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','de','sg'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','de','sg'));

CREATE POLICY repl_read ON replacements FOR SELECT USING (is_same_school(school_id));
CREATE POLICY repl_write ON replacements FOR ALL
  USING (is_same_school(school_id)
         AND (has_any_role('directeur','de') OR replacement_teacher = auth.uid()))
  WITH CHECK (is_same_school(school_id)
         AND (has_any_role('directeur','de') OR replacement_teacher = auth.uid()));

CREATE POLICY llogs_read ON lesson_logs FOR SELECT
  USING (
    is_same_school(school_id)
    AND (
      teacher_id = auth.uid() OR has_any_role('directeur','de','sg')
      OR EXISTS (SELECT 1 FROM student_enrollments se WHERE se.class_id = lesson_logs.class_id
                   AND (se.student_id = auth.uid() OR is_my_child(se.student_id)))
    )
  );
CREATE POLICY llogs_write ON lesson_logs FOR ALL
  USING (is_same_school(school_id) AND (teacher_id = auth.uid() OR has_any_role('directeur','de')))
  WITH CHECK (is_same_school(school_id) AND (teacher_id = auth.uid() OR has_any_role('directeur','de')));

-- ═══════════════════════════════════════════════════════════════
-- MODULES OPTIONNELS
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY books_read ON library_books FOR SELECT USING (is_same_school(school_id));
CREATE POLICY books_write ON library_books FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','support'));

CREATE POLICY copies_read ON library_copies FOR SELECT USING (is_same_school(school_id));
CREATE POLICY copies_write ON library_copies FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','support'));

CREATE POLICY loans_read ON library_loans FOR SELECT
  USING (is_same_school(school_id)
         AND (borrower_id = auth.uid() OR is_my_child(borrower_id) OR has_any_role('directeur','support')));
CREATE POLICY loans_write ON library_loans FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','support'));

CREATE POLICY resa_all ON library_reservations FOR ALL
  USING (is_same_school(school_id) AND (user_id = auth.uid() OR has_any_role('directeur','support')))
  WITH CHECK (is_same_school(school_id) AND (user_id = auth.uid() OR has_any_role('directeur','support')));

CREATE POLICY vehicles_read ON transport_vehicles FOR SELECT USING (is_same_school(school_id));
CREATE POLICY vehicles_write ON transport_vehicles FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','support'));

CREATE POLICY routes_read ON transport_routes FOR SELECT USING (is_same_school(school_id));
CREATE POLICY routes_write ON transport_routes FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','support'));

CREATE POLICY stops_read ON transport_stops FOR SELECT USING (is_same_school(school_id));
CREATE POLICY stops_write ON transport_stops FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','support'));

CREATE POLICY tsub_read ON transport_subscriptions FOR SELECT
  USING (is_same_school(school_id) AND can_see_student(student_id));
CREATE POLICY tsub_write ON transport_subscriptions FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','support','secretaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','support','secretaire'));

CREATE POLICY board_read ON transport_boardings FOR SELECT
  USING (is_same_school(school_id) AND can_see_student(student_id));
CREATE POLICY board_write ON transport_boardings FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','support','sg'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','support','sg'));

CREATE POLICY tinc_read ON transport_incidents FOR SELECT USING (is_same_school(school_id));
CREATE POLICY tinc_write ON transport_incidents FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','support','sg'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','support','sg'));

-- Infirmerie : même restriction que les données de santé.
CREATE POLICY infirm_read ON infirmary_visits FOR SELECT
  USING (is_same_school(school_id)
         AND (is_my_child(student_id) OR has_any_role('directeur','sg','support')));
CREATE POLICY infirm_write ON infirmary_visits FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','sg','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','sg','support'));

CREATE POLICY vacc_read ON vaccinations FOR SELECT
  USING (is_same_school(school_id)
         AND (is_my_child(student_id) OR has_any_role('directeur','sg','support')));
CREATE POLICY vacc_write ON vaccinations FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','support'));

CREATE POLICY stock_read ON stock_items FOR SELECT
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire','support'));
CREATE POLICY stock_write ON stock_items FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','gestionnaire','support'));

CREATE POLICY smov_read ON stock_movements FOR SELECT
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire','support'));
CREATE POLICY smov_write ON stock_movements FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','gestionnaire','support'));

CREATE POLICY maint_read ON maintenance_tickets FOR SELECT
  USING (is_same_school(school_id)
         AND (reported_by = auth.uid() OR assigned_to = auth.uid()
              OR has_any_role('directeur','gestionnaire','support')));
CREATE POLICY maint_write ON maintenance_tickets FOR ALL
  USING (is_same_school(school_id)
         AND (reported_by = auth.uid() OR has_any_role('directeur','gestionnaire','support')))
  WITH CHECK (is_same_school(school_id));

-- RH : chacun voit ses congés, la direction voit tout.
CREATE POLICY leaves_read ON leave_requests FOR SELECT
  USING (is_same_school(school_id) AND (staff_id = auth.uid() OR has_any_role('directeur','de')));
CREATE POLICY leaves_insert ON leave_requests FOR INSERT
  WITH CHECK (is_same_school(school_id) AND staff_id = auth.uid());
CREATE POLICY leaves_update ON leave_requests FOR UPDATE
  USING (is_same_school(school_id)
         AND (has_any_role('directeur','de')
              OR (staff_id = auth.uid() AND status = 'demande')));

CREATE POLICY lbal_read ON leave_balances FOR SELECT
  USING (is_same_school(school_id) AND (staff_id = auth.uid() OR has_any_role('directeur','de')));
CREATE POLICY lbal_write ON leave_balances FOR ALL
  USING (is_same_school(school_id) AND is_direction())
  WITH CHECK (is_same_school(school_id) AND is_direction());

CREATE POLICY srec_read ON staff_records FOR SELECT
  USING (is_same_school(school_id) AND (staff_id = auth.uid() OR has_any_role('directeur','gestionnaire')));
CREATE POLICY srec_write ON staff_records FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','gestionnaire'));

CREATE POLICY menus_read ON canteen_menus FOR SELECT
  USING (is_same_school(school_id) AND (published OR has_any_role('directeur','support')));
CREATE POLICY menus_write ON canteen_menus FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','support'));

CREATE POLICY csub_read ON canteen_subscriptions FOR SELECT
  USING (is_same_school(school_id) AND can_see_student(student_id));
CREATE POLICY csub_write ON canteen_subscriptions FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','support','secretaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','support','secretaire'));

CREATE POLICY cmeals_read ON canteen_meals_served FOR SELECT
  USING (is_same_school(school_id) AND can_see_student(student_id));
CREATE POLICY cmeals_write ON canteen_meals_served FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','support'));

CREATE POLICY visitors_read ON visitors FOR SELECT
  USING (is_same_school(school_id) AND has_any_role('directeur','sg','secretaire','support'));
CREATE POLICY visitors_write ON visitors FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','sg','secretaire','support'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','sg','secretaire','support'));

-- ═══════════════════════════════════════════════════════════════
-- COMMUNICATION
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY templates_read ON message_templates FOR SELECT
  USING (school_id IS NULL OR is_same_school(school_id));
CREATE POLICY templates_write ON message_templates FOR ALL
  USING (school_id IS NOT NULL AND is_same_school(school_id) AND is_direction())
  WITH CHECK (school_id IS NOT NULL AND is_same_school(school_id) AND is_direction());

CREATE POLICY campaigns_read ON message_campaigns FOR SELECT
  USING (is_same_school(school_id) AND (is_school_staff() OR is_direction()));
CREATE POLICY campaigns_write ON message_campaigns FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur','secretaire','de','sg'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur','secretaire','de','sg'));

CREATE POLICY receipts_read ON message_receipts FOR SELECT
  USING (is_same_school(school_id) AND (user_id = auth.uid() OR is_direction()));
CREATE POLICY receipts_update ON message_receipts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY tokens_own ON push_tokens FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY notifs_own ON notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY notifs_update ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY mrules_read ON messaging_rules FOR SELECT USING (is_same_school(school_id));
CREATE POLICY mrules_write ON messaging_rules FOR ALL
  USING (is_same_school(school_id) AND is_direction())
  WITH CHECK (is_same_school(school_id) AND is_direction());

CREATE POLICY mflags_read ON message_flags FOR SELECT
  USING (is_same_school(school_id) AND (flagged_by = auth.uid() OR has_any_role('directeur','sg')));
CREATE POLICY mflags_insert ON message_flags FOR INSERT
  WITH CHECK (is_same_school(school_id) AND flagged_by = auth.uid());
CREATE POLICY mflags_update ON message_flags FOR UPDATE
  USING (is_same_school(school_id) AND has_any_role('directeur','sg'));

CREATE POLICY appt_read ON appointments FOR SELECT
  USING (is_same_school(school_id)
         AND (requester_id = auth.uid() OR staff_id = auth.uid() OR is_direction()));
CREATE POLICY appt_insert ON appointments FOR INSERT
  WITH CHECK (is_same_school(school_id) AND requester_id = auth.uid());
CREATE POLICY appt_update ON appointments FOR UPDATE
  USING (is_same_school(school_id)
         AND (staff_id = auth.uid() OR requester_id = auth.uid() OR is_direction()));

CREATE POLICY tick_read ON support_tickets FOR SELECT
  USING (is_same_school(school_id)
         AND (opened_by = auth.uid() OR assigned_to = auth.uid() OR is_school_staff() OR is_direction()));
CREATE POLICY tick_insert ON support_tickets FOR INSERT
  WITH CHECK (is_same_school(school_id) AND opened_by = auth.uid());
CREATE POLICY tick_update ON support_tickets FOR UPDATE
  USING (is_same_school(school_id) AND (assigned_to = auth.uid() OR is_school_staff() OR is_direction()));

-- Une réponse interne n'est jamais visible par le demandeur.
CREATE POLICY treply_read ON support_ticket_replies FOR SELECT
  USING (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id
                   AND is_same_school(t.school_id)
                   AND (NOT support_ticket_replies.is_internal OR is_school_staff() OR is_direction())
                   AND (t.opened_by = auth.uid() OR t.assigned_to = auth.uid()
                        OR is_school_staff() OR is_direction())));
CREATE POLICY treply_insert ON support_ticket_replies FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- IA
-- ═══════════════════════════════════════════════════════════════

-- Chacun voit son propre usage ; la direction voit celui de l'école.
CREATE POLICY ai_logs_read ON ai_usage_logs FOR SELECT
  USING (is_same_school(school_id) AND (user_id = auth.uid() OR is_direction() OR has_role('de')));
-- Écriture réservée au serveur (service_role) : aucune policy INSERT.

CREATE POLICY ai_quotas_read ON ai_quotas FOR SELECT USING (is_same_school(school_id));
CREATE POLICY ai_quotas_write ON ai_quotas FOR ALL
  USING (is_same_school(school_id) AND is_direction())
  WITH CHECK (is_same_school(school_id) AND is_direction());

-- §12.3 et sécurité historique : une solution n'est JAMAIS
-- lisible par un élève. Seul son auteur et la direction y accèdent.
-- La correction IA passe par une Edge Function en service_role.
CREATE POLICY solutions_read ON teacher_solutions FOR SELECT
  USING (is_same_school(school_id) AND (created_by = auth.uid() OR has_any_role('directeur','de')));
CREATE POLICY solutions_write ON teacher_solutions FOR ALL
  USING (is_same_school(school_id) AND (created_by = auth.uid() OR is_direction()))
  WITH CHECK (is_same_school(school_id) AND created_by = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- SAAS ET CONFORMITÉ
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY plans_read ON plan_limits FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY plans_write ON plan_limits FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY usage_read ON school_usage FOR SELECT
  USING (is_super_admin() OR (is_same_school(school_id) AND is_direction()));

CREATE POLICY saasinv_read ON saas_invoices FOR SELECT
  USING (is_super_admin() OR (is_same_school(school_id) AND is_direction()));
CREATE POLICY saasinv_write ON saas_invoices FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY imp_read ON impersonation_sessions FOR SELECT
  USING (is_super_admin() OR (is_same_school(school_id) AND is_direction()));
CREATE POLICY imp_write ON impersonation_sessions FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY versions_read ON app_versions FOR SELECT USING (TRUE);
CREATE POLICY versions_write ON app_versions FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY del_read ON deletion_requests FOR SELECT
  USING (is_same_school(school_id) AND (user_id = auth.uid() OR is_direction()));
CREATE POLICY del_insert ON deletion_requests FOR INSERT
  WITH CHECK (is_same_school(school_id) AND (user_id = auth.uid() OR is_direction()));
CREATE POLICY del_update ON deletion_requests FOR UPDATE
  USING (is_same_school(school_id) AND is_direction());

CREATE POLICY retention_read ON retention_policies FOR SELECT
  USING (school_id IS NULL OR is_same_school(school_id));
CREATE POLICY retention_write ON retention_policies FOR ALL
  USING (is_super_admin() OR (is_same_school(school_id) AND is_direction()))
  WITH CHECK (is_super_admin() OR (is_same_school(school_id) AND is_direction()));

CREATE POLICY alerts_read ON security_alerts FOR SELECT
  USING (is_super_admin() OR (is_same_school(school_id) AND is_direction()));
CREATE POLICY alerts_update ON security_alerts FOR UPDATE
  USING (is_same_school(school_id) AND is_direction());

-- La file de sync appartient à son auteur.
CREATE POLICY sync_own ON sync_operations FOR ALL
  USING (user_id = auth.uid() OR (is_same_school(school_id) AND is_direction()))
  WITH CHECK (user_id = auth.uid());
