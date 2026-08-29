-- ============================================================
-- 013 — Buckets Storage et policies d'accès aux fichiers
-- Cahier des charges §21.2, §26
--
-- « Les documents sensibles sont protégés par autorisation
--   serveur, pas uniquement par une URL secrète. »
--
-- Tous les buckets sont PRIVÉS sauf school-assets (logos publics).
-- L'accès passe par des URL signées à durée courte, générées
-- après vérification RLS.
--
-- Convention de chemin : <school_id>/<domaine>/<entité>/<fichier>
-- Le premier segment porte le tenant : c'est lui qui est vérifié.
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- BUCKETS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('school-assets',  'school-assets',  TRUE,   10485760,
   ARRAY['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('user-media',     'user-media',     FALSE,   5242880,
   ARRAY['image/png','image/jpeg','image/webp']),
  ('student-docs',   'student-docs',   FALSE,  10485760,
   ARRAY['application/pdf','image/png','image/jpeg','image/webp']),
  ('admissions',     'admissions',     FALSE,  10485760,
   ARRAY['application/pdf','image/png','image/jpeg','image/webp']),
  ('receipts',       'receipts',       FALSE,  10485760, ARRAY['application/pdf']),
  ('bulletins',      'bulletins',      FALSE,  10485760, ARRAY['application/pdf']),
  ('exports',        'exports',        FALSE,  52428800,
   ARRAY['application/pdf','text/csv',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('courses',        'courses',        FALSE,  52428800,
   ARRAY['application/pdf','image/png','image/jpeg','video/mp4','audio/mpeg']),
  ('homework',       'homework',       FALSE,  20971520,
   ARRAY['application/pdf','image/png','image/jpeg','audio/mpeg','audio/mp4']),
  ('health',         'health',         FALSE,  10485760,
   ARRAY['application/pdf','image/png','image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- HELPER — le tenant est le premier segment du chemin
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION storage_school_id(p_name TEXT)
RETURNS UUID AS $$
  SELECT NULLIF(SPLIT_PART(p_name, '/', 1), '')::UUID
$$ LANGUAGE SQL IMMUTABLE;

-- Le fichier appartient-il à l'école de l'utilisateur ?
CREATE OR REPLACE FUNCTION storage_same_school(p_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT storage_school_id(p_name) = auth_school_id()
$$ LANGUAGE SQL STABLE;

-- Le deuxième segment désigne l'élève : <school_id>/<student_id>/...
CREATE OR REPLACE FUNCTION storage_student_id(p_name TEXT)
RETURNS UUID AS $$
  SELECT NULLIF(SPLIT_PART(p_name, '/', 2), '')::UUID
$$ LANGUAGE SQL IMMUTABLE;

-- ═══════════════════════════════════════════════════════════════
-- school-assets — logos, en-têtes, cachets (public en lecture)
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY assets_read ON storage.objects FOR SELECT
  USING (bucket_id = 'school-assets');

CREATE POLICY assets_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'school-assets'
    AND storage_same_school(name)
    AND is_direction()
  );

CREATE POLICY assets_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'school-assets' AND storage_same_school(name) AND is_direction());

CREATE POLICY assets_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'school-assets' AND storage_same_school(name) AND is_direction());

-- ═══════════════════════════════════════════════════════════════
-- user-media — photos de profil. Chemin : <school_id>/<user_id>/...
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY media_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-media'
    AND storage_same_school(name)
    AND (
      storage_student_id(name) = auth.uid()
      OR is_my_child(storage_student_id(name))
      OR is_school_staff() OR is_direction()
    )
  );

CREATE POLICY media_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-media'
    AND storage_same_school(name)
    AND (storage_student_id(name) = auth.uid() OR has_any_role('directeur','secretaire'))
  );

CREATE POLICY media_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-media'
    AND storage_same_school(name)
    AND (storage_student_id(name) = auth.uid() OR has_any_role('directeur','secretaire'))
  );

-- ═══════════════════════════════════════════════════════════════
-- student-docs — pièces du dossier élève
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY sdocs_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'student-docs'
    AND storage_same_school(name)
    AND can_see_student(storage_student_id(name))
  );

CREATE POLICY sdocs_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student-docs'
    AND storage_same_school(name)
    AND (has_any_role('directeur','secretaire') OR is_my_child(storage_student_id(name)))
  );

CREATE POLICY sdocs_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'student-docs'
    AND storage_same_school(name)
    AND has_any_role('directeur','secretaire')
  );

-- ═══════════════════════════════════════════════════════════════
-- admissions — pièces de candidature (jamais visibles aux familles
-- inscrites ni aux enseignants)
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY adm_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'admissions'
    AND storage_same_school(name)
    AND has_any_role('directeur','secretaire','de')
  );

CREATE POLICY adm_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'admissions'
    AND storage_same_school(name)
    AND has_any_role('directeur','secretaire')
  );

-- ═══════════════════════════════════════════════════════════════
-- receipts — reçus de paiement
-- Chemin : <school_id>/<student_id>/<receipt>.pdf
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY receipts_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND storage_same_school(name)
    AND (
      is_my_child(storage_student_id(name))
      OR storage_student_id(name) = auth.uid()
      OR has_any_role('directeur','gestionnaire','secretaire')
    )
  );

-- Les reçus sont générés côté serveur uniquement (service_role).
-- Aucune policy INSERT cliente : un reçu ne se dépose pas à la main.

-- ═══════════════════════════════════════════════════════════════
-- bulletins — PDF signés
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY bull_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bulletins'
    AND storage_same_school(name)
    AND (
      has_any_role('directeur','de','secretaire')
      -- L'élève et le parent n'y accèdent qu'après publication
      OR EXISTS (
        SELECT 1 FROM bulletin_summaries b
        WHERE b.student_id = storage_student_id(name)
          AND b.state = 'publie'
          AND (b.student_id = auth.uid() OR is_my_child(b.student_id))
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- exports — fichiers XLSX/CSV/PDF générés
-- Chemin : <school_id>/<requested_by>/<fichier>
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY exp_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'exports'
    AND storage_same_school(name)
    AND (storage_student_id(name) = auth.uid() OR is_direction())
  );

CREATE POLICY exp_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'exports' AND storage_same_school(name) AND is_direction());

-- ═══════════════════════════════════════════════════════════════
-- courses — supports pédagogiques
-- Chemin : <school_id>/<class_id>/<fichier>
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY courses_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'courses'
    AND storage_same_school(name)
    AND (
      is_school_staff() OR is_direction()
      OR teaches_class(storage_student_id(name))
      OR EXISTS (
        SELECT 1 FROM student_enrollments se
        WHERE se.class_id = storage_student_id(name)
          AND (se.student_id = auth.uid() OR is_my_child(se.student_id))
      )
    )
  );

CREATE POLICY courses_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'courses'
    AND storage_same_school(name)
    AND (teaches_class(storage_student_id(name)) OR has_any_role('directeur','de'))
  );

CREATE POLICY courses_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'courses'
    AND storage_same_school(name)
    AND (teaches_class(storage_student_id(name)) OR has_any_role('directeur','de'))
  );

-- ═══════════════════════════════════════════════════════════════
-- homework — copies rendues par les élèves
-- Chemin : <school_id>/<student_id>/<devoir_id>/<fichier>
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY hw_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'homework'
    AND storage_same_school(name)
    AND can_see_student(storage_student_id(name))
  );

CREATE POLICY hw_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'homework'
    AND storage_same_school(name)
    AND (storage_student_id(name) = auth.uid() OR is_my_child(storage_student_id(name)))
  );

-- Un élève peut remplacer sa copie tant qu'elle n'est pas corrigée ;
-- l'enseignant ne modifie pas le fichier d'origine, il annote à côté.
CREATE POLICY hw_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'homework'
    AND storage_same_school(name)
    AND storage_student_id(name) = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════════
-- health — justificatifs médicaux, carnets de vaccination
-- Le bucket le plus restreint du système.
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY health_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'health'
    AND storage_same_school(name)
    AND (
      is_my_child(storage_student_id(name))
      OR has_any_role('directeur','sg','support')
    )
  );

CREATE POLICY health_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'health'
    AND storage_same_school(name)
    AND (
      is_my_child(storage_student_id(name))
      OR has_any_role('directeur','sg','support')
    )
  );
