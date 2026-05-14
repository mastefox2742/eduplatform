// ═══════════════════════════════════════════
// RÔLES
// ═══════════════════════════════════════════

export enum UserRole {
  ADMIN = 'admin',
  DIRECTION = 'direction',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

// ═══════════════════════════════════════════
// UTILISATEURS
// ═══════════════════════════════════════════

export interface UserProfile {
  id: string
  email: string
  displayName: string
  photoUrl?: string
  role: UserRole
  schoolId: string
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface StudentMember extends UserProfile {
  role: UserRole.STUDENT
  levelId: string
  levelName: string
  classId: string
  className: string
  studentNumber: string
  parentEmail?: string
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
// UTILITAIRES
// ═══════════════════════════════════════════

export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'schoolId' | 'createdAt'>>

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.DIRECTION]: 'Direction',
  [UserRole.TEACHER]: 'Professeur',
  [UserRole.STUDENT]: 'Élève',
}

export const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
}
