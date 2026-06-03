// ═══════════════════════════════════════════
// RÔLES
// ═══════════════════════════════════════════

export enum UserRole {
  ADMIN = 'admin',
  DIRECTION = 'direction',
  TEACHER = 'teacher',
  STUDENT = 'student',
  PARENT = 'parent',
}

// ═══════════════════════════════════════════
// UTILISATEURS
// ═══════════════════════════════════════════

export interface UserProfile {
  id: string
  email: string
  displayName: string
  photoUrl?: string
  photoURL?: string   // alias Firebase Auth
  role: UserRole
  schoolId: string
  isActive: boolean
  createdAt: number
  updatedAt: number
  // Champs spécifiques par rôle (présents selon le rôle, non requis dans le type de base)
  studentId?: string  // parent → UID de l'enfant suivi
  childId?:   string  // alias alternatif utilisé sur certains comptes parent
}

export type ArchiveStatus = 'active' | 'archived' | 'transferred'
export type ArchiveReason = 'graduated' | 'transferred' | 'dropout' | 'expelled'

export interface AcademicYearRecord {
  year:      string    // "2024-2025"
  classId:   string
  className: string
  average:   number
  rank?:     number
  promoted:  boolean   // false = redoublant
}

export interface StudentMember extends UserProfile {
  role:          UserRole.STUDENT
  levelId:       string
  levelName:     string
  classId:       string
  className:     string
  studentNumber: string
  parentEmail?:  string
  // ── Cycle de vie ──────────────────────────────────────────────
  archiveStatus:   ArchiveStatus       // défaut 'active'
  archivedAt?:     number              // timestamp
  archiveReason?:  ArchiveReason
  academicHistory: AcademicYearRecord[] // snapshot par année, jamais supprimé
}

export interface TeacherMember extends UserProfile {
  role: UserRole.TEACHER
  subjects: string[]
  employeeId: string
}

// ═══════════════════════════════════════════
// ÉCOLE
// ═══════════════════════════════════════════

export interface School {
  id: string
  name: string
  slug: string
  logoUrl?: string
  address: {
    street: string
    city: string
    country: string
  }
  contactEmail: string
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  activeStudentCount: number
  academicYear: string
  status: 'active' | 'suspended' | 'trial'
  features: {
    aiEnabled: boolean
    examBank: boolean
    analytics: boolean
  }
  createdAt: number
  updatedAt: number
}

export interface SchoolLevel {
  id: string
  name: string
  shortName: string
  order: number
  cycle: string
  studentCount: number
  isActive: boolean
}

export interface SchoolClass {
  id: string
  name: string
  levelId: string
  levelName: string
  academicYear: string
  mainTeacherId: string
  mainTeacherName: string
  studentCount: number
  isActive: boolean
}

export interface Subject {
  id: string
  name: string
  shortName: string
  color: string
  iconEmoji: string
  levels: string[]
  isActive: boolean
}

// ═══════════════════════════════════════════
// COURS
// ═══════════════════════════════════════════

export interface Course {
  id: string
  schoolId: string
  subjectId: string
  subjectName: string
  levelId: string
  levelName: string
  title: string
  description: string
  summary: string
  thumbnailUrl?: string
  authorId: string
  authorName: string
  tags: string[]
  status: 'draft' | 'published' | 'archived'
  order: number
  estimatedDuration: number
  viewCount: number
  completionRate: number
  createdAt: number
  updatedAt: number
}

export interface CourseSection {
  id: string
  courseId: string
  title: string
  content: string
  order: number
  type: 'text' | 'video' | 'pdf' | 'quiz'
  mediaUrl?: string
  storagePath?: string
  duration: number
  isVisible: boolean
  createdAt: number
}

// ═══════════════════════════════════════════
// EXERCICES
// ═══════════════════════════════════════════

export type QuestionType = 'qcm' | 'open' | 'fill_blank' | 'matching' | 'true_false'
export type ExerciseDifficulty = 'easy' | 'medium' | 'hard'

export interface MCQQuestion {
  id: string
  type: 'qcm'
  text: string
  options: string[]
  correctIndex: number
  explanation: string
  points: number
}

export interface OpenQuestion {
  id: string
  type: 'open'
  text: string
  expectedAnswer: string
  rubric: string
  sampleAnswer: string
  points: number
}

export interface FillBlankQuestion {
  id: string
  type: 'fill_blank'
  text: string
  blanks: Array<{ id: string; answer: string; alternatives?: string[] }>
  points: number
}

export type Question = MCQQuestion | OpenQuestion | FillBlankQuestion

export interface Exercise {
  id: string
  schoolId: string
  courseId?: string
  subjectId: string
  subjectName: string
  levelId: string
  levelName: string
  title: string
  instructions: string
  type: QuestionType
  difficulty: ExerciseDifficulty
  points: number
  estimatedTime: number
  tags: string[]
  authorId: string
  authorName: string
  status: 'draft' | 'published' | 'archived'
  isInExamBank: boolean
  attemptCount: number
  avgScore: number
  createdAt: number
  updatedAt: number
}

export interface ExerciseSolution {
  questions: Question[]
  aiHints: string[]
  teacherNotes: string
  gradingCriteria: string
}

// ═══════════════════════════════════════════
// PROGRESSION ÉLÈVE
// ═══════════════════════════════════════════

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'needs_review'

export interface StudentProgress {
  id: string
  schoolId: string
  userId: string
  userDisplayName: string
  exerciseId: string
  exerciseTitle: string
  courseId?: string
  subjectId: string
  levelId: string
  classId: string
  status: ProgressStatus
  attempts: number
  maxAttempts: number
  bestScore: number
  lastScore: number
  maxPoints: number
  timeSpent: number
  answers: Array<{
    questionId: string
    answer: string | number | string[]
    isCorrect: boolean
    pointsAwarded: number
  }>
  feedback?: string
  teacherComment?: string
  isGradedByTeacher: boolean
  startedAt?: number
  completedAt?: number
  updatedAt: number
}

export interface ProgressSummary {
  totalExercises: number
  completedExercises: number
  completionRate: number
  averageScore: number
  lastActivity: number | null
  bySubject: Record<string, { avgScore: number; completed: number }>
}

// ═══════════════════════════════════════════
// EXAMENS
// ═══════════════════════════════════════════

export interface Exam {
  id: string
  schoolId: string
  subjectId: string
  subjectName: string
  levelId: string
  levelName: string
  title: string
  description: string
  type: 'devoir' | 'controle' | 'bac_blanc' | 'brevet_blanc'
  academicYear: string
  trimester: 1 | 2 | 3
  duration: number
  totalPoints: number
  exerciseIds: string[]
  authorId: string
  authorName: string
  status: 'draft' | 'ready' | 'assigned' | 'closed'
  assignedClasses: string[]
  scheduledAt?: number
  closedAt?: number
  avgClassScore: number
  submissionCount: number
  createdAt: number
  updatedAt: number
}

// ═══════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════

export type NotificationType =
  | 'new_course'
  | 'new_exercise'
  | 'exam_scheduled'
  | 'grade_available'
  | 'announcement'
  | 'reminder'

export interface Notification {
  id: string
  schoolId: string
  recipientId: string
  recipientRole: UserRole
  title: string
  body: string
  type: NotificationType
  data?: Record<string, string>
  isRead: boolean
  createdAt: number
  expiresAt?: number
}

// ═══════════════════════════════════════════
// IA
// ═══════════════════════════════════════════

export interface AIFeedback {
  exerciseId: string
  studentAnswer: string
  score: number
  maxScore: number
  isCorrect: boolean
  explanation: string
  hints: string[]
  encouragement: string
  areasToImprove: string[]
}

export interface AIProgressAnalysis {
  studentId: string
  period: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  predictedTrimesterScore: number
  studyPlanSuggestions: string[]
}

// ═══════════════════════════════════════════
// DEVOIRS & EXAMENS
// ═══════════════════════════════════════════

export type AssessmentType = 'departmental' | 'class' | 'trimester_exam'
export type AssessmentStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'grading' | 'graded'
export type Trimester = 1 | 2 | 3

export interface AssessmentGrade {
  studentId: string
  studentName: string
  score: number | null
  comment?: string
}

export interface Assessment {
  id: string
  schoolId: string
  title: string
  type: AssessmentType
  subjectId: string
  subjectName: string
  teacherId: string
  teacherName: string
  classIds: string[]
  classNames: string[]
  trimester: Trimester
  scheduledDate: number
  duration: number
  coefficient: number
  maxScore: number
  status: AssessmentStatus
  instructions: string
  fileUrl?: string
  submittedAt?: number
  approvedAt?: number
  approvedBy?: string
  rejectedAt?: number
  rejectionReason?: string
  grades: AssessmentGrade[]
  avgScore?: number
  createdAt: number
  updatedAt: number
}

// ═══════════════════════════════════════════
// PRÉSENCE PROFESSEURS
// ═══════════════════════════════════════════

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'justified' | 'pending'

export interface TeacherAttendanceRecord {
  id: string
  schoolId: string
  teacherId: string
  teacherName: string
  date: string
  dayLabel: string
  scheduledStart: string
  scheduledEnd: string
  scheduledHours: number
  actualStart: string | null
  actualEnd: string | null
  effectiveHours: number
  status: AttendanceStatus
  justification?: string
  validatedBy?: string
  createdAt: number
}

// ═══════════════════════════════════════════
// EMPLOIS DU TEMPS
// ═══════════════════════════════════════════

export type SlotType = 'cours' | 'td' | 'examen' | 'reunion' | 'permanence'
export type DayOfWeek = 0 | 1 | 2 | 3 | 4

export interface ScheduleSlot {
  id: string
  schoolId: string
  day: DayOfWeek
  startTime: string
  endTime: string
  type: SlotType
  subjectName: string
  subjectId: string
  teacherId: string
  teacherName: string
  classId: string
  className: string
  room: string
  color: string
  recurrent: boolean
  validFrom: number
  validTo: number
}

// ═══════════════════════════════════════════
// DISCIPLINE & VIE SCOLAIRE
// ═══════════════════════════════════════════

export type SanctionType = 'avertissement' | 'blame' | 'retenue' | 'exclusion_temp' | 'exclusion_def'
export type MeriteType   = 'encouragement' | 'tableau_honneur' | 'felicitations' | 'prix_excellence'

export interface DisciplineRecord {
  id:          string
  schoolId:    string
  studentId:   string
  studentName: string
  classId:     string
  className:   string
  type:        'sanction' | 'merite'
  sanction?:   SanctionType
  merite?:     MeriteType
  motif:       string
  description: string
  issuedBy:    string       // userId du prof ou censeur
  issuedByName: string
  date:        string       // ISO
  duration?:   number       // jours (pour exclusion_temp)
  parentNotified: boolean
  parentNotifiedAt?: number
  createdAt:   number
}

// ═══════════════════════════════════════════
// CAHIER DE TEXTES NUMÉRIQUE
// ═══════════════════════════════════════════

export type CahierStatus = 'draft' | 'submitted' | 'visa_ok' | 'visa_retard' | 'alerte'

export interface CahierTexte {
  id:           string
  schoolId:     string
  teacherId:    string
  teacherName:  string
  classId:      string
  className:    string
  subjectId:    string
  subjectName:  string
  date:         string      // ISO YYYY-MM-DD
  trimestre:    string
  seanceNum:    number
  chapitre:     string
  contenu:      string      // Ce qui a été fait
  devoirs?:     string      // Devoirs donnés
  objetifs:     string      // Objectifs de la séance
  status:       CahierStatus
  visaBy?:      string
  visaAt?:      number
  visaComment?: string
  createdAt:    number
  updatedAt:    number
}

// ═══════════════════════════════════════════
// DEVOIRS & CHECK-LIST ÉLÈVE
// ═══════════════════════════════════════════

export interface Devoir {
  id:           string
  schoolId:     string
  teacherId:    string
  teacherName:  string
  classId:      string
  className:    string
  subjectName:  string
  title:        string
  description:  string
  consigneAudio?: string   // Storage path fichier audio
  attachments:  string[]   // Storage paths
  dueDate:      string     // ISO YYYY-MM-DD
  dueTime?:     string     // "08:00"
  trimestre:    string
  points:       number
  createdAt:    number
}

export interface DevoirSubmission {
  id:         string
  devoirId:   string
  studentId:  string
  status:     'pending' | 'done' | 'late'
  checkedAt?: number
  createdAt:  number
}

// ═══════════════════════════════════════════
// GAMIFICATION
// ═══════════════════════════════════════════

export type BadgeId =
  | 'presence_perfect'    // 100% de présence le mois
  | 'presence_good'       // ≥ 90% présence
  | 'scholar_first'       // 1er de la classe
  | 'scholar_top3'        // Top 3
  | 'maths_champion'      // 3 exercices maths d'affilée sans faute
  | 'reader'              // 5 cours lus
  | 'speed_learner'       // Exercice complété en moins de 5 min
  | 'consistent'          // Connexion 7 jours de suite
  | 'team_player'         // Devoirs rendus à l'heure 10 fois
  | 'honor_roll'          // Tableau d'honneur

export interface StudentBadge {
  id:          string
  studentId:   string
  schoolId:    string
  badgeId:     BadgeId
  label:       string
  description: string
  icon:        string     // emoji
  awardedAt:   number
  seen:        boolean
}

export interface StudentXP {
  studentId:  string
  schoolId:   string
  totalXP:    number
  level:      number      // paliers : 1-10
  badges:     BadgeId[]
  streak:     number      // jours consécutifs de connexion
  updatedAt:  number
}

// ═══════════════════════════════════════════
// REMPLACEMENTS & PERMUTATIONS
// ═══════════════════════════════════════════

export type RemplacementStatus = 'pending' | 'accepted' | 'rejected' | 'validated'

export interface RemplacementRequest {
  id:              string
  schoolId:        string
  requesterId:     string     // prof qui demande
  requesterName:   string
  targetTeacherId: string     // prof cible pour échange (optionnel)
  targetTeacherName?: string
  slotId:          string     // créneau de l'emploi du temps à échanger
  slotDate:        string
  slotTime:        string
  subject:         string
  classId:         string
  className:       string
  reason:          string
  type:            'absence' | 'permutation'
  status:          RemplacementStatus
  targetSlotId?:   string     // créneau proposé en échange
  validatedBy?:    string
  validatedAt?:    number
  createdAt:       number
}

// ═══════════════════════════════════════════
// CRM INSCRIPTIONS & RELANCES
// ═══════════════════════════════════════════

export type LeadStatus = 'nouveau' | 'contacte' | 'visite' | 'inscrit' | 'perdu'
export type RelanceChannel = 'push' | 'sms' | 'whatsapp'

export interface InscriptionLead {
  id:            string
  schoolId:      string
  parentName:    string
  parentPhone:   string
  parentEmail?:  string
  studentName:   string
  studentAge?:   number
  targetLevel?:  string
  source:        'referral' | 'walk_in' | 'social' | 'web' | 'autre'
  status:        LeadStatus
  notes:         string
  nextFollowUp?: string     // ISO date
  assignedTo?:   string     // userId secrétaire / direction
  createdAt:     number
  updatedAt:     number
}

export interface RelanceLog {
  id:         string
  schoolId:   string
  targetId:   string      // parentId ou leadId
  targetName: string
  channel:    RelanceChannel
  message:    string
  sentAt:     number
  sentBy:     string      // 'system' | userId
  success:    boolean
}

// ═══════════════════════════════════════════
// ANNALES D'EXAMENS OFFICIELS
// ═══════════════════════════════════════════

export type ExamLevel  = 'CEPE' | 'BEPC' | 'BAC'
export type AnnaleStatus = 'draft' | 'published'

export interface Annale {
  id:         string
  schoolId:   string        // '' = globale (partagée toutes écoles)
  level:      ExamLevel
  subject:    string
  year:       number
  country:    string        // 'CI' | 'SN' | 'CG' | 'CM' | ...
  title:      string
  pdfUrl?:    string        // Storage path
  questions:  AnnaleQuestion[]
  status:     AnnaleStatus
  viewCount:  number
  createdAt:  number
}

export interface AnnaleQuestion {
  id:           string
  text:         string
  type:         'qcm' | 'open' | 'calcul'
  options?:     string[]
  correctIndex?: number
  solution:     string
  points:       number
  hint?:        string
}

// ═══════════════════════════════════════════
// FICHE PÉDAGOGIQUE (IA prof)
// ═══════════════════════════════════════════

export interface FichePedagogique {
  id:          string
  schoolId:    string
  teacherId:   string
  subjectName: string
  className:   string
  chapitre:    string
  objectifs:   string[]
  prerequis:   string[]
  duree:       number       // minutes
  materiel:    string[]
  introduction: string
  developpement: string[]   // étapes
  conclusion:  string
  evaluation:  string
  generatedAt: number
  model:       string
}

// ═══════════════════════════════════════════
// PAIE & GESTION RH ENSEIGNANTS
// ═══════════════════════════════════════════

export type ContractType   = 'permanent' | 'contractuel' | 'vacataire'
export type PaymentBasis   = 'monthly' | 'hourly'
export type PayrollStatus  = 'draft' | 'validated' | 'paid'

export interface TeacherContract {
  id:             string
  teacherId:      string
  teacherName:    string
  schoolId:       string
  contractType:   ContractType
  paymentBasis:   PaymentBasis
  baseSalary?:    number       // pour les permanents et contractuels (FCFA/mois)
  hourlyRate?:    number       // pour les vacataires (FCFA/heure)
  expectedHoursPerWeek?: number
  currency:       string       // 'XOF' | 'XAF' | 'GNF'
  startDate:      string       // ISO
  endDate?:       string
  isActive:       boolean
  createdAt:      number
  updatedAt:      number
}

export interface MonthlyPayroll {
  id:             string
  schoolId:       string
  teacherId:      string
  teacherName:    string
  contractId:     string
  month:          string       // "2026-05"
  scheduledHours: number       // heures prévues dans l'emploi du temps
  effectiveHours: number       // heures réellement effectuées (présences)
  absenceHours:   number       // scheduledHours - effectiveHours
  grossAmount:    number       // montant brut calculé
  deductions:     { label: string; amount: number }[]
  netAmount:      number
  currency:       string
  status:         PayrollStatus
  generatedAt:    number
  validatedBy?:   string
  validatedAt?:   number
  paidAt?:        number
  notes?:         string
}

// ═══════════════════════════════════════════
// BUDGET & COMPTABILITÉ
// ═══════════════════════════════════════════

export type FlowType         = 'income' | 'expense'
export type BudgetCategory   = 'scolarite' | 'salaires' | 'fournitures' | 'maintenance' | 'electricite' | 'eau' | 'transport' | 'evenements' | 'autre'

export interface BudgetLine {
  id:           string
  schoolId:     string
  year:         string          // "2025-2026"
  category:     BudgetCategory
  label:        string
  type:         FlowType
  budgeted:     number         // montant prévisionnel
  actual:       number         // montant réel (agrégé depuis Expense)
  currency:     string
  alertThreshold: number       // % du budget déclenche une alerte (ex: 90)
}

export interface Expense {
  id:           string
  schoolId:     string
  category:     BudgetCategory
  label:        string
  amount:       number
  currency:     string
  date:         string          // ISO YYYY-MM-DD
  paidBy:       string          // userId
  paidByName:   string
  receiptUrl?:  string          // Storage path
  notes?:       string
  createdAt:    number
}

// ═══════════════════════════════════════════
// EXPORT UNIVERSEL
// ═══════════════════════════════════════════

export type ExportFormat  = 'xlsx' | 'csv' | 'pdf'
export type ExportDataset = 'students' | 'grades' | 'attendance' | 'teachers' | 'payments' | 'payroll' | 'budget'
export type ExportStatus  = 'queued' | 'processing' | 'done' | 'error'

export interface ExportJob {
  id:          string
  schoolId:    string
  requestedBy: string
  dataset:     ExportDataset
  format:      ExportFormat
  filters:     Record<string, string>    // { trimestre: 'T2', classId: '...' }
  status:      ExportStatus
  storageUrl?: string                   // chemin Storage quand done
  signedUrl?:  string                   // URL signée 24h
  rowCount?:   number
  errorMsg?:   string
  requestedAt: number
  completedAt?: number
}

// ═══════════════════════════════════════════
// RAPPORTS MINISTÉRIELS
// ═══════════════════════════════════════════

export type MinistryReportType = 'cepe_inscription' | 'bepc_inscription' | 'bac_inscription' | 'statistiques_annuelles' | 'liste_effectifs'

export interface MinistryReportJob {
  id:           string
  schoolId:     string
  type:         MinistryReportType
  academicYear: string
  requestedBy:  string
  status:       'pending' | 'ready' | 'error'
  storageUrl?:  string
  errorMsg?:    string
  missingData?: string[]    // liste des champs manquants pour la conformité
  requestedAt:  number
  completedAt?: number
}

// ═══════════════════════════════════════════
// CAISSE PHYSIQUE (paiements espèces/chèques)
// ═══════════════════════════════════════════

export type CashPaymentMethod = 'especes' | 'cheque' | 'virement' | 'autre'

export interface CashPayment {
  id:            string
  schoolId:      string
  studentId:     string
  studentName:   string
  parentName:    string
  parentPhone?:  string
  feeLabel:      string
  amount:        number
  currency:      string
  method:        CashPaymentMethod
  chequeNum?:    string
  bankName?:     string
  receivedBy:    string
  receivedByName: string
  receiptNum:    string
  notes?:        string
  createdAt:     number
}

// ═══════════════════════════════════════════
// PASSERELLE MESSAGERIE (WhatsApp / SMS)
// ═══════════════════════════════════════════

export type MessagingChannel = 'whatsapp' | 'sms' | 'push'
export type MessageEventType =
  | 'absence_alert'
  | 'sanction_alert'
  | 'payment_reminder'
  | 'bulletin_published'
  | 'exam_result'
  | 'announcement'

export interface MessageLog {
  id:         string
  schoolId:   string
  channel:    MessagingChannel
  eventType:  MessageEventType
  recipient:  string    // numéro de téléphone ou uid
  message:    string
  status:     'sent' | 'delivered' | 'failed'
  provider:   string    // 'twilio' | 'africas_talking' | 'fcm'
  sentAt:     number
  errorMsg?:  string
}

// ═══════════════════════════════════════════
// MULTI-ENFANTS PARENT
// ═══════════════════════════════════════════

export interface ChildRef {
  studentId:  string
  name:       string
  className:  string
  schoolId:   string
  avatar?:    string
  levelName?: string
}

export interface ParentProfile extends UserProfile {
  role:     UserRole.PARENT
  children: ChildRef[]
  phone?:   string
  whatsapp?: string
}

// ═══════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════

export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'schoolId' | 'createdAt'>>

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.DIRECTION]: 'Direction',
  [UserRole.TEACHER]: 'Professeur',
  [UserRole.STUDENT]: 'Élève',
  [UserRole.PARENT]: 'Parent',
}

export const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
}
