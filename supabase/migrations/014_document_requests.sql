-- ============================================================
-- 014 — Demandes de documents officiels
-- Cahier des charges §9, §16.4, §20.1, §3.3
--
-- Manque révélé par la maquette `direction---validation` :
-- « Certificat de Scolarité · Junior Bantsimba · 6ème B ·
--   Demandé par Parent le 13/05/2024 · Motif : Visa Ambassade ».
--
-- Le schéma savait stocker un document produit (`student_documents`,
-- `export_jobs`) mais pas la **demande** qui le précède : qui a
-- demandé quoi, pourquoi, et qui doit signer. Or c'est précisément
-- ce qui remplit la file de validation du directeur.
-- ============================================================

CREATE TYPE document_request_status AS ENUM (
  'demande',       -- déposée par un parent, un élève ou le secrétariat
  'en_preparation',-- le secrétariat constitue la pièce
  'a_signer',      -- prête, en attente de signature
  'signe',         -- signée, disponible au retrait ou en téléchargement
  'remis',         -- effectivement remise au demandeur
  'refuse',
  'annule'
);

CREATE TYPE official_document_kind AS ENUM (
  'certificat_scolarite',
  'attestation_inscription',
  'releve_notes',
  'bulletin_duplicata',
  'certificat_fin_cycle',
  'attestation_paiement',
  'convocation',
  'carte_scolaire',
  'autre'
);

-- ═══════════════════════════════════════════════════════════════
-- DEMANDES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE document_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  reference       TEXT NOT NULL,
  kind            official_document_kind NOT NULL,
  title           TEXT NOT NULL,
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_name    TEXT,
  class_name      TEXT,
  academic_year   TEXT,

  -- Qui demande, et pourquoi. Le motif n'est pas décoratif : un
  -- certificat pour un visa n'a pas la même urgence qu'un duplicata,
  -- et le directeur en tient compte au moment de signer.
  requested_by    UUID REFERENCES profiles(id),
  requester_name  TEXT,
  requester_role  staff_role,
  purpose         TEXT,
  copies          SMALLINT DEFAULT 1 CHECK (copies BETWEEN 1 AND 20),
  needed_by       DATE,

  status          document_request_status DEFAULT 'demande',
  -- Workflow §3.3 : préparation secrétaire → signature directeur.
  prepared_by     UUID REFERENCES profiles(id),
  prepared_at     TIMESTAMPTZ,
  signed_by       UUID REFERENCES profiles(id),
  signed_at       TIMESTAMPTZ,
  refusal_reason  TEXT,
  delivered_at    TIMESTAMPTZ,

  -- Document produit : un chemin Storage, jamais une URL publique (§21.2).
  storage_path    TEXT,
  verification_code TEXT UNIQUE,   -- QR de vérification (§20.1)

  -- Certains documents se paient (duplicata, carte perdue).
  fee_amount      NUMERIC(12,2),
  fee_paid        BOOLEAN DEFAULT FALSE,
  payment_id      UUID REFERENCES payments(id),

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, reference)
);

CREATE INDEX idx_docreq_status  ON document_requests(school_id, status, created_at DESC);
CREATE INDEX idx_docreq_student ON document_requests(student_id);
-- La file de signature du directeur, requêtée à chaque ouverture d'écran.
CREATE INDEX idx_docreq_to_sign ON document_requests(school_id, needed_by)
  WHERE status = 'a_signer';

-- Historique des changements d'état (§21.4 : toute action sensible tracée)
CREATE TABLE document_request_events (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id   UUID NOT NULL REFERENCES document_requests(id) ON DELETE CASCADE,
  from_status  document_request_status,
  to_status    document_request_status NOT NULL,
  comment      TEXT,
  actor_id     UUID REFERENCES profiles(id),
  actor_name   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_docreq_events ON document_request_events(request_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- MODÈLES DE DOCUMENTS
-- Chaque école a ses en-têtes, ses formules et son signataire.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE document_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  kind          official_document_kind NOT NULL,
  name          TEXT NOT NULL,
  body          TEXT NOT NULL,          -- variables : {{eleve}}, {{classe}}, {{annee}}
  variables     TEXT[] DEFAULT '{}',
  header_url    TEXT,                   -- en-tête, chemin Storage
  stamp_url     TEXT,                   -- cachet de l'établissement
  -- Le rôle habilité à signer ce type de document (§3.3).
  signer_role   staff_role DEFAULT 'directeur',
  requires_fee  BOOLEAN DEFAULT FALSE,
  default_fee   NUMERIC(12,2),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, kind)
);

-- ═══════════════════════════════════════════════════════════════
-- NUMÉROTATION ET TRAÇABILITÉ
-- ═══════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS document_request_seq START 1;

CREATE OR REPLACE FUNCTION next_document_reference()
RETURNS TEXT AS $$
  SELECT 'DOC-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
         LPAD(nextval('document_request_seq')::TEXT, 5, '0')
$$ LANGUAGE SQL VOLATILE;

CREATE OR REPLACE FUNCTION log_document_request_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO document_request_events (request_id, from_status, to_status, comment, actor_id)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.refusal_reason, auth.uid());
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO document_request_events (request_id, to_status, comment, actor_id)
    VALUES (NEW.id, NEW.status, 'Demande créée', auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_docreq_status
  AFTER INSERT OR UPDATE ON document_requests
  FOR EACH ROW EXECUTE FUNCTION log_document_request_status();

CREATE TRIGGER trg_docreq_updated_at BEFORE UPDATE ON document_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_doctpl_updated_at BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- FILE DE VALIDATION DU DIRECTEUR
-- Une vue unique : bulletins et documents mêlés, triés par urgence.
-- C'est exactement ce que montre la maquette `direction---validation`.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW validation_queue AS
  SELECT
    'bulletin'::TEXT              AS item_type,
    b.id                          AS item_id,
    b.school_id,
    b.student_id,
    p.display_name                AS student_name,
    c.name                        AS class_name,
    b.general_average             AS average,
    b.council_decision            AS council_note,
    NULL::TEXT                    AS purpose,
    NULL::TEXT                    AS requester_name,
    ap.label                      AS period_label,
    b.submitted_at                AS submitted_at,
    NULL::DATE                    AS needed_by
  FROM bulletin_summaries b
  LEFT JOIN profiles p          ON p.id = b.student_id
  LEFT JOIN classes  c          ON c.id = b.class_id
  LEFT JOIN academic_periods ap ON ap.id = b.period_id
  WHERE b.state IN ('soumis', 'controle')

  UNION ALL

  SELECT
    'document'::TEXT,
    d.id,
    d.school_id,
    d.student_id,
    d.student_name,
    d.class_name,
    NULL::NUMERIC,
    NULL::TEXT,
    d.purpose,
    d.requester_name,
    d.academic_year,
    d.created_at,
    d.needed_by
  FROM document_requests d
  WHERE d.status = 'a_signer';

-- La vue hérite du RLS des tables sous-jacentes : un directeur ne
-- voit que la file de son établissement, sans policy supplémentaire.

-- ═══════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE document_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates      ENABLE ROW LEVEL SECURITY;

-- Le demandeur suit sa demande ; le personnel habilité la traite.
CREATE POLICY docreq_read ON document_requests FOR SELECT
  USING (
    is_same_school(school_id)
    AND (
      requested_by = auth.uid()
      OR is_my_child(student_id)
      OR student_id = auth.uid()
      OR has_any_role('directeur', 'secretaire', 'de')
    )
  );

-- Un parent peut demander un document pour son enfant (§16.4).
CREATE POLICY docreq_insert ON document_requests FOR INSERT
  WITH CHECK (
    is_same_school(school_id)
    AND (
      is_my_child(student_id)
      OR student_id = auth.uid()
      OR has_any_role('directeur', 'secretaire')
    )
  );

-- Seul le personnel fait avancer une demande. Un demandeur ne peut
-- pas signer la sienne.
CREATE POLICY docreq_update ON document_requests FOR UPDATE
  USING (is_same_school(school_id) AND has_any_role('directeur', 'secretaire', 'de'));

CREATE POLICY docreq_events_read ON document_request_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM document_requests r
    WHERE r.id = request_id AND is_same_school(r.school_id)
      AND (r.requested_by = auth.uid() OR has_any_role('directeur', 'secretaire', 'de'))
  ));

CREATE POLICY doctpl_read ON document_templates FOR SELECT
  USING (is_same_school(school_id));
CREATE POLICY doctpl_write ON document_templates FOR ALL
  USING (is_same_school(school_id) AND has_any_role('directeur', 'secretaire'))
  WITH CHECK (is_same_school(school_id) AND has_any_role('directeur', 'secretaire'));

-- ═══════════════════════════════════════════════════════════════
-- MODÈLES PAR DÉFAUT
-- ═══════════════════════════════════════════════════════════════

INSERT INTO document_templates (school_id, kind, name, body, variables, signer_role)
SELECT s.id, t.kind::official_document_kind, t.name, t.body, t.vars, 'directeur'
FROM schools s
CROSS JOIN (VALUES
  ('certificat_scolarite', 'Certificat de scolarité',
   'Je soussigné(e), Directeur de {{ecole}}, certifie que l''élève {{eleve}}, né(e) le {{date_naissance}}, est régulièrement inscrit(e) en classe de {{classe}} pour l''année scolaire {{annee}}.',
   ARRAY['ecole','eleve','date_naissance','classe','annee']),
  ('attestation_inscription', 'Attestation d''inscription',
   'La présente atteste que {{eleve}} est inscrit(e) en {{classe}} pour l''année scolaire {{annee}} au sein de {{ecole}}.',
   ARRAY['eleve','classe','annee','ecole']),
  ('releve_notes', 'Relevé de notes',
   'Relevé de notes de {{eleve}}, classe de {{classe}}, {{periode}} de l''année scolaire {{annee}}. Moyenne générale : {{moyenne}}/20.',
   ARRAY['eleve','classe','periode','annee','moyenne']),
  ('certificat_fin_cycle', 'Certificat de fin de cycle',
   'Il est certifié que {{eleve}} a achevé le cycle {{cycle}} au sein de {{ecole}} à l''issue de l''année scolaire {{annee}}.',
   ARRAY['eleve','cycle','ecole','annee']),
  ('attestation_paiement', 'Attestation de paiement',
   'Il est attesté que les frais de scolarité de {{eleve}}, classe de {{classe}}, sont acquittés pour {{periode}} de l''année {{annee}}.',
   ARRAY['eleve','classe','periode','annee'])
) AS t(kind, name, body, vars)
ON CONFLICT (school_id, kind) DO NOTHING;
