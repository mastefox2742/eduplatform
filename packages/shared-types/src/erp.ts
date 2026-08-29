// ═══════════════════════════════════════════════════════════════
// Types ERP — migrations 004 à 013
//
// Ces types suivent le schéma PostgreSQL en snake_case, car ils
// décrivent ce que Supabase renvoie. Le mapping vers les types UI
// en camelCase (index.ts) se fait dans les hooks.
//
// Référence : cahier_des_charges_projetto1.md
// ═══════════════════════════════════════════════════════════════

// ── Rôles et périmètres (§3.1, §3.2) ──────────────────────────────────────────

export type StaffRole =
  | 'super_admin'
  | 'directeur'
  | 'secretaire'
  | 'gestionnaire'
  | 'de'
  | 'sg'
  | 'enseignant'
  | 'parent'
  | 'eleve'
  | 'support'

export type ScopeKind = 'school' | 'site' | 'cycle' | 'level' | 'class' | 'subject'

export type PermissionAction =
  | 'read' | 'create' | 'update' | 'validate' | 'publish' | 'export' | 'delete'

export type SchoolCycle = 'primaire' | 'college' | 'lycee'

export interface UserRoleRow {
  id: string
  school_id: string
  user_id: string
  role: StaffRole
  scope_kind: ScopeKind
  scope_id: string | null
  scope_cycle: SchoolCycle | null
  academic_year: string | null
  is_active: boolean
  granted_by: string | null
  granted_at: string
  revoked_at: string | null
}

/** Contexte affiché en permanence dans l'interface (§3.1). */
export interface ActiveContext {
  user_id: string
  school_id: string | null
  site_id: string | null
  academic_year: string | null
  cycle: SchoolCycle | null
  active_role: StaffRole | null
}

export interface SiteRow {
  id: string
  school_id: string
  name: string
  short_name: string | null
  address: string | null
  city: string | null
  phone: string | null
  cycles: SchoolCycle[]
  is_main: boolean
  is_active: boolean
}

export interface TeacherAssignmentRow {
  id: string
  school_id: string
  teacher_id: string
  class_id: string
  subject_id: string | null
  academic_year: string
  hours_week: number | null
  is_main_teacher: boolean
  is_active: boolean
}

// ── Dossier élève (§7) ────────────────────────────────────────────────────────

export type GuardianRelation =
  | 'pere' | 'mere' | 'tuteur' | 'grand_parent' | 'frere_soeur' | 'autre'

export interface StudentGuardianRow {
  id: string
  school_id: string
  student_id: string
  /** null si le tuteur n'a pas de compte sur la plateforme */
  guardian_id: string | null
  guardian_name: string
  guardian_phone: string | null
  guardian_whatsapp: string | null
  guardian_email: string | null
  relation: GuardianRelation
  is_financial: boolean
  is_emergency: boolean
  can_pickup: boolean
  is_primary: boolean
  notes: string | null
}

export type DocumentKind =
  | 'acte_naissance' | 'bulletin_precedent' | 'photo' | 'certificat_medical'
  | 'piece_parent' | 'certificat_scolarite' | 'contrat' | 'autorisation'
  | 'justificatif_absence' | 'diplome' | 'autre'

export interface StudentDocumentRow {
  id: string
  school_id: string
  student_id: string
  kind: DocumentKind
  label: string
  /** Chemin Storage, jamais une URL publique (§21.2) */
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  is_verified: boolean
  expires_at: string | null
  created_at: string
}

/** Accès restreint : ni enseignant ni élève (§21.2). */
export interface StudentHealthRow {
  student_id: string
  school_id: string
  blood_group: string | null
  allergies: string[] | null
  chronic_conditions: string[] | null
  medications: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  care_authorization: boolean
  notes: string | null
}

export type ConsentPurpose =
  | 'notifications' | 'whatsapp' | 'sms' | 'email'
  | 'photos' | 'sorties' | 'transport_gps' | 'donnees_sante' | 'marketing'

export interface ConsentRow {
  id: string
  school_id: string
  user_id: string
  student_id: string | null
  purpose: ConsentPurpose
  granted: boolean
  granted_at: string
  revoked_at: string | null
}

export type EnrollmentOutcome =
  | 'en_cours' | 'admis' | 'redouble' | 'oriente'
  | 'transfere' | 'abandon' | 'exclu' | 'diplome'

export interface StudentEnrollmentRow {
  id: string
  school_id: string
  student_id: string
  academic_year: string
  class_id: string | null
  class_name: string | null
  level_id: string | null
  level_name: string | null
  site_id: string | null
  enrolled_at: string
  left_at: string | null
  outcome: EnrollmentOutcome | null
  is_repeat: boolean
}

// ── Élève à risque (§7.3) ─────────────────────────────────────────────────────

export type RiskKind = 'academique' | 'assiduite' | 'discipline' | 'financier' | 'comportement'
export type RiskPriority = 'faible' | 'moyen' | 'eleve' | 'critique'
export type RiskStatus = 'ouvert' | 'en_suivi' | 'resolu' | 'abandonne'

export interface RiskSignalRow {
  id: string
  school_id: string
  student_id: string
  kind: RiskKind
  priority: RiskPriority
  title: string
  /** Pourquoi le signal a été levé — jamais une décision automatique */
  explanation: string
  evidence: Record<string, unknown>
  detected_at: string
  assigned_to: string | null
  status: RiskStatus
  action_plan: string | null
  due_date: string | null
  resolution: string | null
}

// ── Référentiel académique (§5) ───────────────────────────────────────────────

export interface AcademicYearRow {
  id: string
  school_id: string
  label: string
  starts_on: string
  ends_on: string
  period_kind: 'trimestre' | 'semestre'
  is_current: boolean
  is_closed: boolean
}

export interface AcademicPeriodRow {
  id: string
  school_id: string
  year_id: string
  code: string
  label: string
  order_num: number
  starts_on: string
  ends_on: string
  grades_open_at: string | null
  grades_close_at: string | null
  is_locked: boolean
}

export interface GradingRulesRow {
  id: string
  school_id: string
  level_id: string | null
  max_score: number
  decimals: number
  rounding: 'half_up' | 'half_down' | 'floor' | 'ceil'
  pass_threshold: number
  honor_threshold: number
  excellence_threshold: number
  repeat_threshold: number
  rank_enabled: boolean
  /** §15.7 : pas de classement humiliant côté élève */
  rank_visible_student: boolean
}

// ── Admissions (§6) ───────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'recue' | 'incomplete' | 'en_etude' | 'entretien'
  | 'admise' | 'liste_attente' | 'refusee' | 'inscrite' | 'annulee'

export interface ApplicationRow {
  id: string
  school_id: string
  reference: string
  academic_year: string
  first_name: string
  last_name: string
  gender: 'M' | 'F' | 'autre' | null
  birth_date: string | null
  target_level_id: string | null
  target_level_name: string | null
  target_cycle: SchoolCycle | null
  guardian_name: string
  guardian_phone: string
  guardian_email: string | null
  status: ApplicationStatus
  status_reason: string | null
  interview_at: string | null
  interview_score: number | null
  entrance_exam_score: number | null
  waitlist_rank: number | null
  fee_paid: boolean
  student_id: string | null
  created_at: string
}

// ── Évaluations et notes (§13) ────────────────────────────────────────────────

export type AssessmentKind =
  | 'interrogation' | 'devoir' | 'composition' | 'oral'
  | 'pratique' | 'projet' | 'examen_blanc'

export type ValidationState =
  | 'brouillon' | 'soumis' | 'controle' | 'valide' | 'rejete' | 'publie'

export type GradeState = 'saisie' | 'absent' | 'exempte' | 'annulee' | 'rattrapage'

export interface AssessmentRow {
  id: string
  school_id: string
  class_id: string
  subject_id: string | null
  subject_name: string | null
  teacher_id: string
  teacher_name: string | null
  period_id: string | null
  academic_year: string
  kind: AssessmentKind
  title: string
  instructions: string | null
  max_score: number
  coefficient: number
  date: string
  duration_min: number | null
  attachments: string[]
  state: ValidationState
  validated_at: string | null
  published_at: string | null
}

export interface GradeRow {
  id: string
  school_id: string
  assessment_id: string
  student_id: string
  score: number | null
  state: GradeState
  comment: string | null
  competencies: Record<string, unknown>
  entered_by: string | null
  entered_at: string
}

export interface GradeHistoryRow {
  id: number
  grade_id: string
  old_score: number | null
  new_score: number | null
  old_state: GradeState | null
  new_state: GradeState | null
  reason: string | null
  changed_by: string | null
  changed_at: string
}

export interface BulletinSummaryRow {
  id: string
  school_id: string
  student_id: string
  class_id: string | null
  period_id: string | null
  academic_year: string
  general_average: number | null
  class_average: number | null
  rank_in_class: number | null
  class_size: number | null
  absences_count: number
  late_count: number
  conduct: string | null
  general_comment: string | null
  council_decision: string | null
  honor: string | null
  state: ValidationState
  published_at: string | null
  pdf_path: string | null
  /** QR de vérification anti-falsification (§13.3) */
  verification_code: string | null
}

// ── Finance (§14) ─────────────────────────────────────────────────────────────

export type FeeKind =
  | 'inscription' | 'reinscription' | 'scolarite' | 'transport' | 'cantine'
  | 'examen' | 'uniforme' | 'activite' | 'fourniture' | 'penalite' | 'autre'

export type InvoiceStatus =
  | 'brouillon' | 'emise' | 'partiellement_payee' | 'payee' | 'en_retard' | 'annulee'

export type DiscountKind =
  | 'fratrie' | 'bourse' | 'aide_sociale' | 'exceptionnelle' | 'exoneration' | 'personnel'

export interface InvoiceRow {
  id: string
  school_id: string
  student_id: string
  guardian_id: string | null
  academic_year: string
  invoice_num: string
  gross_amount: number
  discount_amount: number
  net_amount: number
  paid_amount: number
  /** Colonne calculée : net_amount - paid_amount */
  balance: number
  currency: string
  status: InvoiceStatus
  issued_at: string | null
  due_date: string | null
  pdf_path: string | null
}

export interface InstallmentRow {
  id: string
  school_id: string
  invoice_id: string
  student_id: string
  number: number
  label: string | null
  amount: number
  paid_amount: number
  due_date: string
  paid_at: string | null
  /** Colonne calculée */
  is_paid: boolean
  penalty: number
  reminders_sent: number
}

export interface DiscountRow {
  id: string
  school_id: string
  student_id: string
  academic_year: string
  kind: DiscountKind
  label: string | null
  percent: number | null
  amount: number | null
  applies_to: FeeKind | null
  reason: string | null
  state: ValidationState
  approved_by: string | null
}

export type CashSessionStatus = 'ouverte' | 'fermee' | 'rapprochee'

export interface CashSessionRow {
  id: string
  school_id: string
  site_id: string | null
  cashier_id: string
  cashier_name: string | null
  opened_at: string
  opening_balance: number
  closed_at: string | null
  closing_balance: number | null
  counted_balance: number | null
  /** Écart entre comptage physique et théorique */
  variance: number | null
  status: CashSessionStatus
}

// ── Vie scolaire (§11) ────────────────────────────────────────────────────────

export type JustificationStatus = 'en_attente' | 'acceptee' | 'refusee'
export type IncidentSeverity = 'mineur' | 'moyen' | 'grave' | 'tres_grave'
export type ExitStatus = 'demande' | 'approuve' | 'refuse' | 'sorti' | 'revenu'

export interface AbsenceJustificationRow {
  id: string
  school_id: string
  student_id: string
  record_id: string | null
  date_from: string
  date_to: string
  reason_id: string | null
  reason_text: string | null
  proof_path: string | null
  submitted_by: string | null
  status: JustificationStatus
  reviewed_by: string | null
  review_note: string | null
  created_at: string
}

export interface ExitPermissionRow {
  id: string
  school_id: string
  student_id: string
  reason: string
  exit_date: string
  exit_time: string | null
  expected_return: string | null
  pickup_person: string | null
  status: ExitStatus
  left_at: string | null
  returned_at: string | null
  /** Billet de sortie numérique */
  pass_code: string | null
}

export interface IncidentRow {
  id: string
  school_id: string
  reference: string | null
  title: string
  description: string
  location: string | null
  occurred_at: string
  severity: IncidentSeverity
  status: 'declare' | 'en_instruction' | 'convocation' | 'sanctionne' | 'classe_sans_suite' | 'clos'
  is_confidential: boolean
  declared_by: string | null
  attachments: string[]
  resolution: string | null
}

export interface LessonLogRow {
  id: string
  school_id: string
  class_id: string
  subject_id: string | null
  teacher_id: string
  curriculum_id: string | null
  date: string
  objectives: string | null
  content: string
  resources: string[]
  homework: string | null
  homework_due: string | null
  is_validated: boolean
  de_comment: string | null
}

// ── IA encadrée (§12.3) ───────────────────────────────────────────────────────

export type AiVerdict = 'accepte' | 'sanitise' | 'a_revoir' | 'bloque'

export type AiTask =
  | 'fiche_cours' | 'exercice' | 'quiz' | 'correction'
  | 'appreciation' | 'explication' | 'chat_eleve' | 'analyse_progression'

export interface AiUsageLogRow {
  id: number
  school_id: string
  user_id: string | null
  user_role: StaffRole | null
  task: AiTask
  model: string
  class_id: string | null
  subject_id: string | null
  student_id: string | null
  /** Source fournie à l'IA : rien ne doit être inventé hors de là */
  source_kind: string | null
  source_ref: string | null
  verdict: AiVerdict
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null
  violations: unknown[]
  blocked_reason: string | null
  /** L'enseignant reste responsable de la publication */
  reviewed_by: string | null
  published: boolean
  created_at: string
}

/** Jamais lisible côté élève (RLS + Edge Function). */
export interface TeacherSolutionRow {
  id: string
  school_id: string
  exercise_id: string | null
  assessment_id: string | null
  question_ref: string | null
  solution: string
  explanation: string | null
  criteria: unknown[]
  max_points: number | null
  created_by: string
}

// ── Synchronisation hors ligne (§19) ──────────────────────────────────────────

export type SyncStatus = 'en_attente' | 'synchronise' | 'erreur' | 'conflit'

export interface SyncOperationRow {
  id: string
  school_id: string
  user_id: string
  /** Identifiant généré par l'app : garantit l'idempotence */
  client_op_id: string
  op_type: string
  entity_table: string | null
  entity_id: string | null
  /** Libellé lisible : « Présence de la 6e A » (§19.3) */
  label: string | null
  payload: Record<string, unknown>
  client_created_at: string
  status: SyncStatus
  retries: number
  error_msg: string | null
  conflict_with: Record<string, unknown> | null
  resolution: 'client' | 'serveur' | 'manuel' | null
  synced_at: string | null
}

// ── Libellés d'affichage ──────────────────────────────────────────────────────

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  super_admin:  'Super administrateur',
  directeur:    'Directeur',
  secretaire:   'Secrétaire',
  gestionnaire: 'Gestionnaire / Comptable',
  de:           'Directeur des Études',
  sg:           'Surveillant Général',
  enseignant:   'Enseignant',
  parent:       'Parent / Tuteur',
  eleve:        'Élève',
  support:      'Personnel support',
}

export const VALIDATION_STATE_LABELS: Record<ValidationState, string> = {
  brouillon: 'Brouillon',
  soumis:    'Soumis',
  controle:  'En contrôle',
  valide:    'Validé',
  rejete:    'Rejeté',
  publie:    'Publié',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  brouillon:           'Brouillon',
  emise:               'Émise',
  partiellement_payee: 'Partiellement payée',
  payee:               'Payée',
  en_retard:           'En retard',
  annulee:             'Annulée',
}

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  en_attente:   'En attente',
  synchronise:  'Synchronisé',
  erreur:       'Erreur',
  conflit:      'Conflit',
}

export const RISK_PRIORITY_LABELS: Record<RiskPriority, string> = {
  faible:   'Faible',
  moyen:    'Moyen',
  eleve:    'Élevé',
  critique: 'Critique',
}

// ── Garde-fous d'affichage ────────────────────────────────────────────────────

/**
 * Un bulletin n'est visible par l'élève ou le parent qu'une fois publié
 * (§13.3). RLS l'impose côté base ; cette fonction évite d'afficher un
 * état intermédiaire dans l'interface.
 */
export function isBulletinVisibleToFamily(b: BulletinSummaryRow): boolean {
  return b.state === 'publie' && b.published_at !== null
}

/**
 * Une facture n'est « payée » qu'après confirmation serveur (§22).
 * Ne jamais déduire le paiement d'une réponse du client.
 */
export function isInvoiceSettled(i: InvoiceRow): boolean {
  return i.status === 'payee' && i.balance <= 0
}
