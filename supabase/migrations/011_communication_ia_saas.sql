-- ============================================================
-- 011 — Communication omnicanale, journal IA, console SaaS
-- Cahier des charges §4.2, §12.3, §16.4, §17, §20.2, §21.4
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- TYPES
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE ai_verdict AS ENUM ('accepte', 'sanitise', 'a_revoir', 'bloque');

CREATE TYPE ai_task AS ENUM (
  'fiche_cours', 'exercice', 'quiz', 'correction',
  'appreciation', 'explication', 'chat_eleve', 'analyse_progression'
);

CREATE TYPE campaign_status AS ENUM ('brouillon', 'planifiee', 'en_cours', 'terminee', 'annulee');

CREATE TYPE support_ticket_kind AS ENUM (
  'bug', 'question', 'reclamation', 'demande_rdv', 'suggestion', 'incident'
);

-- ═══════════════════════════════════════════════════════════════
-- MODÈLES DE MESSAGES (§17 — multilingues, à variables)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE message_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,  -- NULL = modèle plateforme
  code          TEXT NOT NULL,          -- 'absence_alert', 'payment_reminder'…
  channel       messaging_channel NOT NULL,
  locale        TEXT DEFAULT 'fr',
  subject       TEXT,
  body          TEXT NOT NULL,          -- variables : {{eleve}}, {{montant}}, {{date}}
  variables     TEXT[] DEFAULT '{}',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, code, channel, locale)
);

-- Idem 004 : protéger les modèles plateforme (school_id NULL)
CREATE UNIQUE INDEX idx_templates_default
  ON message_templates(code, channel, locale) WHERE school_id IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- CAMPAGNES ET CIBLAGE (§17)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE message_campaigns (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  template_id    UUID REFERENCES message_templates(id),
  channels       messaging_channel[] NOT NULL DEFAULT '{push}',
  body           TEXT NOT NULL,
  -- Ciblage : école, site, cycle, niveau, classe, rôle, statut de paiement
  target_kind    TEXT NOT NULL DEFAULT 'school'
                 CHECK (target_kind IN ('school','site','cycle','level','class','role','unpaid','custom')),
  target_ids     UUID[] DEFAULT '{}',
  target_roles   staff_role[] DEFAULT '{}',
  scheduled_at   TIMESTAMPTZ,
  status         campaign_status DEFAULT 'brouillon',
  sent_count     INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count   INTEGER DEFAULT 0,
  read_count     INTEGER DEFAULT 0,
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  sent_at        TIMESTAMPTZ
);

CREATE INDEX idx_campaigns_school ON message_campaigns(school_id, created_at DESC);
CREATE INDEX idx_campaigns_due    ON message_campaigns(scheduled_at) WHERE status = 'planifiee';

-- Accusés de lecture (§17)
CREATE TABLE message_receipts (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  campaign_id  UUID REFERENCES message_campaigns(id) ON DELETE CASCADE,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel      messaging_channel,
  delivered_at TIMESTAMPTZ,
  read_at      TIMESTAMPTZ,
  acknowledged BOOLEAN DEFAULT FALSE,
  UNIQUE (campaign_id, user_id, channel)
);

CREATE INDEX idx_receipts_user ON message_receipts(user_id) WHERE read_at IS NULL;

-- Jetons de notification push
CREATE TABLE push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  platform    TEXT CHECK (platform IN ('ios','android','web')),
  device_name TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications in-app
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT,
  deep_link    TEXT,
  entity_table TEXT,
  entity_id    UUID,
  is_read      BOOLEAN DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours'),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifs_user ON notifications(user_id, created_at DESC) WHERE NOT is_read;

-- Règles de messagerie (§17 — horaires, pièces jointes, blocage)
CREATE TABLE messaging_rules (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id          UUID UNIQUE NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  allowed_from       TIME DEFAULT '07:00',
  allowed_to         TIME DEFAULT '19:00',
  allow_attachments  BOOLEAN DEFAULT TRUE,
  max_attachment_mb  SMALLINT DEFAULT 5,
  parent_to_teacher  BOOLEAN DEFAULT TRUE,
  student_to_teacher BOOLEAN DEFAULT TRUE,
  auto_archive_days  SMALLINT DEFAULT 365,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Signalement de message (§17)
CREATE TABLE message_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  flagged_by  UUID REFERENCES profiles(id),
  reason      TEXT NOT NULL,
  status      TEXT DEFAULT 'ouvert' CHECK (status IN ('ouvert','examine','classe','sanctionne')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- RENDEZ-VOUS ET RÉCLAMATIONS (§16.4)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE appointments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  requester_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  staff_id      UUID REFERENCES profiles(id),
  student_id    UUID REFERENCES profiles(id),
  subject       TEXT NOT NULL,
  scheduled_at  TIMESTAMPTZ,
  duration_min  SMALLINT DEFAULT 30,
  location      TEXT,
  status        TEXT DEFAULT 'demande'
                CHECK (status IN ('demande','confirme','refuse','tenu','annule','absent')),
  notes         TEXT,
  minutes       TEXT,
  follow_up     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_staff ON appointments(staff_id, scheduled_at);

CREATE TABLE support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  reference     TEXT,
  kind          support_ticket_kind DEFAULT 'question',
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL,
  opened_by     UUID NOT NULL REFERENCES profiles(id),
  student_id    UUID REFERENCES profiles(id),
  priority      ticket_priority DEFAULT 'normale',
  status        ticket_status DEFAULT 'ouvert',
  assigned_to   UUID REFERENCES profiles(id),
  sla_due_at    TIMESTAMPTZ,
  resolution    TEXT,
  attachments   TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_open ON support_tickets(school_id, priority)
  WHERE status NOT IN ('resolu','ferme');

CREATE TABLE support_ticket_replies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id),
  author_name TEXT,
  body        TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- JOURNAL DE L'USAGE IA (§12.3)
-- « auteur, contexte, modèle, document source, décision, motif »
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE ai_usage_logs (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES profiles(id),
  user_role        staff_role,
  task             ai_task NOT NULL,
  model            TEXT NOT NULL,
  -- Contexte pédagogique
  class_id         UUID REFERENCES classes(id),
  subject_id       UUID REFERENCES subjects(id),
  student_id       UUID REFERENCES profiles(id),
  entity_table     TEXT,
  entity_id        UUID,
  -- Source fournie à l'IA (jamais une invention)
  source_kind      TEXT,     -- 'solution_prof','cours','bareme','aucune'
  source_ref       TEXT,
  prompt_hash      TEXT,     -- empreinte, pas le prompt en clair
  -- Résultat du garde-fou anti-hallucination
  verdict          ai_verdict NOT NULL DEFAULT 'accepte',
  risk_level       TEXT CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  violations       JSONB DEFAULT '[]'::jsonb,
  blocked_reason   TEXT,
  -- Responsabilité humaine (§12.3 : l'enseignant valide)
  reviewed_by      UUID REFERENCES profiles(id),
  reviewed_at      TIMESTAMPTZ,
  published        BOOLEAN DEFAULT FALSE,
  -- Coût et performance
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  latency_ms       INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_logs_school ON ai_usage_logs(school_id, created_at DESC);
CREATE INDEX idx_ai_logs_user   ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_logs_blocked ON ai_usage_logs(school_id, verdict)
  WHERE verdict IN ('bloque','a_revoir');

-- Quotas IA par rôle et par école (§4.1 limites par plan)
CREATE TABLE ai_quotas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role            staff_role NOT NULL,
  requests_hour   INTEGER DEFAULT 20,
  requests_day    INTEGER DEFAULT 100,
  UNIQUE (school_id, role)
);

-- Solutions de référence fournies par l'enseignant (§12.3)
-- La correction IA ne peut s'appuyer QUE là-dessus.
CREATE TABLE teacher_solutions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  exercise_id    UUID REFERENCES exercises(id) ON DELETE CASCADE,
  assessment_id  UUID REFERENCES assessments(id) ON DELETE CASCADE,
  question_ref   TEXT,
  solution       TEXT NOT NULL,
  explanation    TEXT,
  criteria       JSONB DEFAULT '[]'::jsonb,   -- grille de correction explicite
  max_points     NUMERIC(5,2),
  created_by     UUID NOT NULL REFERENCES profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_solutions_exercise ON teacher_solutions(exercise_id);

-- ═══════════════════════════════════════════════════════════════
-- CONSOLE SAAS — SUPER ADMIN (§4.2)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE plan_limits (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan               school_plan NOT NULL UNIQUE,
  max_students       INTEGER,
  max_staff          INTEGER,
  max_classes        INTEGER,
  max_sites          INTEGER DEFAULT 1,
  storage_mb         INTEGER,
  sms_per_month      INTEGER DEFAULT 0,
  whatsapp_per_month INTEGER DEFAULT 0,
  ai_requests_month  INTEGER DEFAULT 0,
  modules            TEXT[] DEFAULT '{}',
  price_monthly      NUMERIC(12,2),
  currency           TEXT DEFAULT 'XOF'
);

INSERT INTO plan_limits (plan, max_students, max_staff, max_classes, max_sites, storage_mb, sms_per_month, whatsapp_per_month, ai_requests_month, modules, price_monthly) VALUES
('free',        50,   10,  5,  1,   500,     0,    0,     0, '{}', 0),
('starter',    300,   40, 20,  1,  5000,   500, 1000,  1000, '{"transport","cantine"}', 25000),
('pro',       1000,  150, 60,  3, 25000,  3000, 5000, 10000, '{"transport","cantine","bibliotheque","infirmerie","stocks"}', 75000),
('enterprise', NULL, NULL, NULL, 20, 200000, NULL, NULL, NULL, '{"transport","cantine","bibliotheque","infirmerie","stocks","alumni","api"}', 250000)
ON CONFLICT (plan) DO NOTHING;

-- Consommation mensuelle par école (facturation SaaS §4.2)
CREATE TABLE school_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  month           TEXT NOT NULL,             -- "2026-08"
  active_students INTEGER DEFAULT 0,
  active_staff    INTEGER DEFAULT 0,
  storage_mb      NUMERIC(12,2) DEFAULT 0,
  sms_sent        INTEGER DEFAULT 0,
  whatsapp_sent   INTEGER DEFAULT 0,
  ai_requests     INTEGER DEFAULT 0,
  exports_count   INTEGER DEFAULT 0,
  computed_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, month)
);

CREATE TABLE saas_invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  month         TEXT NOT NULL,
  plan          school_plan NOT NULL,
  base_amount   NUMERIC(12,2) NOT NULL,
  overage_amount NUMERIC(12,2) DEFAULT 0,
  total_amount  NUMERIC(12,2) NOT NULL,
  currency      TEXT DEFAULT 'XOF',
  status        invoice_status DEFAULT 'emise',
  due_date      DATE,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (school_id, month)
);

-- Impersonation contrôlée avec consentement (§4.2)
CREATE TABLE impersonation_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID NOT NULL REFERENCES profiles(id),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES profiles(id),
  reason         TEXT NOT NULL,
  consent_given_by UUID REFERENCES profiles(id),
  consent_at     TIMESTAMPTZ,
  started_at     TIMESTAMPTZ DEFAULT NOW(),
  ended_at       TIMESTAMPTZ,
  actions_count  INTEGER DEFAULT 0
);

CREATE INDEX idx_impersonation ON impersonation_sessions(school_id, started_at DESC);

-- Versions d'application déployées (§4.2)
CREATE TABLE app_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      TEXT NOT NULL CHECK (platform IN ('web','ios','android')),
  version       TEXT NOT NULL,
  build_number  INTEGER,
  is_mandatory  BOOLEAN DEFAULT FALSE,
  min_supported TEXT,
  release_notes TEXT,
  released_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (platform, version)
);

-- ═══════════════════════════════════════════════════════════════
-- RGPD — FILE D'EFFACEMENT (§21.3)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE deletion_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by   UUID REFERENCES profiles(id),
  reason         TEXT,
  status         TEXT DEFAULT 'en_attente'
                 CHECK (status IN ('en_attente','approuve','traite','refuse')),
  legal_hold     BOOLEAN DEFAULT FALSE,   -- conservation légale obligatoire
  hold_reason    TEXT,
  scheduled_for  DATE,
  processed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE retention_policies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  entity        TEXT NOT NULL,
  retain_years  SMALLINT NOT NULL,
  legal_basis   TEXT,
  UNIQUE (school_id, entity)
);

CREATE UNIQUE INDEX idx_retention_default
  ON retention_policies(entity) WHERE school_id IS NULL;

INSERT INTO retention_policies (school_id, entity, retain_years, legal_basis) VALUES
(NULL, 'audit_logs',        5, 'Traçabilité des actions sensibles'),
(NULL, 'bulletins',        10, 'Archives scolaires'),
(NULL, 'invoices',          10, 'Obligation comptable'),
(NULL, 'student_health',     3, 'Données médicales — durée réduite'),
(NULL, 'messages',           2, 'Communication courante'),
(NULL, 'notifications',      1, 'Information éphémère')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- AUDIT — enrichissement de la table existante (§21.4)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_table TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id    UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address   INET;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent   TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity     TEXT DEFAULT 'info'
  CHECK (severity IN ('info','warning','critical'));
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value    JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value    JSONB;

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_table, entity_id);

-- Détection d'anomalies (§21.4)
CREATE TABLE security_alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID REFERENCES schools(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,   -- 'connexion_inhabituelle','export_massif','acces_interdit'
  severity     TEXT DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  user_id      UUID REFERENCES profiles(id),
  detail       TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}'::jsonb,
  is_resolved  BOOLEAN DEFAULT FALSE,
  resolved_by  UUID REFERENCES profiles(id),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_open ON security_alerts(school_id, severity)
  WHERE NOT is_resolved;

-- Écriture d'audit depuis l'application
CREATE OR REPLACE FUNCTION write_audit(
  p_action       TEXT,
  p_entity_table TEXT DEFAULT NULL,
  p_entity_id    UUID DEFAULT NULL,
  p_metadata     JSONB DEFAULT '{}'::jsonb,
  p_severity     TEXT DEFAULT 'info'
)
RETURNS VOID AS $$
  INSERT INTO audit_logs (school_id, actor_uid, actor_role, action, entity_table, entity_id, metadata, severity)
  VALUES (auth_school_id(), auth.uid(), auth_role(), p_action, p_entity_table, p_entity_id, p_metadata, p_severity)
$$ LANGUAGE SQL SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- FILE DE SYNCHRONISATION HORS LIGNE (§19.2, §19.3)
-- Miroir serveur de la file locale, pour l'observabilité.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE sync_operations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_op_id   TEXT NOT NULL,          -- id généré par l'app mobile
  op_type        TEXT NOT NULL,
  entity_table   TEXT,
  entity_id      UUID,
  label          TEXT,                   -- « Présence de la 3e A »
  payload        JSONB NOT NULL,
  client_created_at TIMESTAMPTZ NOT NULL,
  status         TEXT DEFAULT 'en_attente'
                 CHECK (status IN ('en_attente','synchronise','erreur','conflit')),
  retries        SMALLINT DEFAULT 0,
  error_msg      TEXT,
  conflict_with  JSONB,                  -- version serveur en cas de conflit
  resolution     TEXT CHECK (resolution IN ('client','serveur','manuel')),
  resolved_by    UUID REFERENCES profiles(id),
  synced_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  -- §19.3 : rejouer deux fois la même opération ne duplique rien
  UNIQUE (user_id, client_op_id)
);

CREATE INDEX idx_sync_pending ON sync_operations(user_id, status)
  WHERE status IN ('en_attente','erreur','conflit');

-- ═══════════════════════════════════════════════════════════════
-- MODÈLES DE MESSAGES PAR DÉFAUT
-- ═══════════════════════════════════════════════════════════════

INSERT INTO message_templates (school_id, code, channel, locale, subject, body, variables) VALUES
(NULL, 'absence_alert', 'sms', 'fr', NULL,
 'Bonjour, votre enfant {{eleve}} est absent(e) aujourd''hui {{date}} a {{ecole}}. Merci de justifier.',
 '{eleve,date,ecole}'),
(NULL, 'absence_alert', 'whatsapp', 'fr', NULL,
 'Bonjour, votre enfant *{{eleve}}* est absent(e) le {{date}}. Merci de justifier via l''application.',
 '{eleve,date}'),
(NULL, 'payment_reminder', 'sms', 'fr', NULL,
 'Rappel : solde de {{montant}} {{devise}} du pour {{eleve}}, echeance {{echeance}}. {{ecole}}',
 '{montant,devise,eleve,echeance,ecole}'),
(NULL, 'bulletin_published', 'push', 'fr', 'Bulletin disponible',
 'Le bulletin de {{eleve}} pour le {{periode}} est disponible.',
 '{eleve,periode}'),
(NULL, 'late_alert', 'sms', 'fr', NULL,
 'Votre enfant {{eleve}} est arrive en retard de {{minutes}} min le {{date}}.',
 '{eleve,minutes,date}'),
(NULL, 'summons', 'whatsapp', 'fr', NULL,
 'Vous etes convoque(e) le {{date}} a {{heure}} concernant {{eleve}}. Motif : {{motif}}.',
 '{date,heure,eleve,motif}')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_solutions_updated_at BEFORE UPDATE ON teacher_solutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_messaging_rules_updated_at BEFORE UPDATE ON messaging_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
