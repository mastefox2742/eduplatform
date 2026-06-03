/**
 * Firestore service layer — school platform
 * Utilise l'instance Firebase centrale depuis @/config/firebase
 */
import {
  collection, doc,
  onSnapshot, query, where, orderBy,
  addDoc, updateDoc, setDoc, serverTimestamp,
  Timestamp, arrayUnion,
} from 'firebase/firestore'
import { db, auth } from '@/config/firebase'

export { db, auth }

// ── Collection helpers ───────────────────────────────────────────────────────
export const cols = {
  users:         () => collection(db, 'users'),
  courses:       (schoolId: string) => collection(db, 'schools', schoolId, 'courses'),
  exercises:     (schoolId: string) => collection(db, 'schools', schoolId, 'exercises'),
  submissions:   (schoolId: string) => collection(db, 'schools', schoolId, 'submissions'),
  fees:          (schoolId: string) => collection(db, 'schools', schoolId, 'fees'),
  supplies:      (schoolId: string) => collection(db, 'schools', schoolId, 'supplies'),
  // ── Nouvelles collections ────────────────────────────────────────────────────
  assessments:   (schoolId: string) => collection(db, 'schools', schoolId, 'assessments'),
  attendance:    (schoolId: string) => collection(db, 'schools', schoolId, 'attendance'),
  bulletins:     (schoolId: string) => collection(db, 'schools', schoolId, 'bulletins'),
  messages:      (schoolId: string) => collection(db, 'schools', schoolId, 'messages'),
  announcements: (schoolId: string) => collection(db, 'schools', schoolId, 'announcements'),
  schedules:     (schoolId: string) => collection(db, 'schools', schoolId, 'schedules'),
  schoolConfig:  (schoolId: string) => collection(db, 'schools', schoolId, 'school_config'),
}

// ── Types ────────────────────────────────────────────────────────────────────

export type Trimestre       = 'T1' | 'T2' | 'T3'
export type AssessmentType  = 'exercise' | 'exam' | 'quiz' | 'homework'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | null
export type BulletinStatus  = 'draft' | 'submitted' | 'approved' | 'rejected' | 'published'

export interface FSAssessment {
  id:         string
  teacherId:  string
  classId:    string
  className:  string
  subject:    string
  title:      string
  date:       string
  maxScore:   number
  coeff:      number
  type:       AssessmentType
  trimestre:  Trimestre
  schoolYear: string
  grades:     Record<string, { value: number | null; comment?: string }>
  createdAt:  Timestamp
  updatedAt:  Timestamp
}

export interface FSAttendanceDoc {
  id:         string
  classId:    string
  className:  string
  date:       string          // ISO YYYY-MM-DD
  dayLabel:   string
  teacherId:  string
  subject:    string
  schoolYear: string
  records:    Record<string, { status: AttendanceStatus; note?: string }>
  savedAt:    Timestamp
}

export interface FSBulletin {
  id:              string
  studentId:       string
  studentName:     string
  classId:         string
  className:       string
  teacherId:       string
  teacherName?:    string   // dénormalisé à la soumission pour éviter un lookup côté lecture
  trimestre:       Trimestre
  schoolYear:      string
  subject:         string
  average:         number | null
  conduct:         string
  appreciation:    string
  assessments:     { title: string; value: number | null; maxScore: number; coeff: number }[]
  status:          BulletinStatus
  directorComment?: string
  rejectionReason?: string
  submittedAt?:    Timestamp
  approvedAt?:     Timestamp
  publishedAt?:    Timestamp
  createdAt:       Timestamp
  updatedAt:       Timestamp
}

export interface FSMessage {
  id:           string
  threadId:     string
  senderId:     string
  senderName:   string
  senderRole:   string
  text:         string
  sentAt:       Timestamp
  read:         boolean
}

export interface FSAnnouncement {
  id:         string
  schoolId:   string
  authorId:   string
  authorName: string
  title:      string
  body:       string
  category:   'general' | 'urgent' | 'event' | 'exam' | 'holiday'
  audience:   'all' | 'parents' | 'students' | 'teachers'
  readBy:     string[]
  pinned:     boolean
  createdAt:  Timestamp
}

export interface FSCourse {
  id:          string
  title:       string
  subject:     string
  content:     string
  teacherId:   string
  teacherName: string
  classTarget: string
  createdAt:   Timestamp
  updatedAt:   Timestamp
  published:   boolean
  emoji?:      string
}

export interface FSExercise {
  id:          string
  title:       string
  subject:     string
  description: string
  teacherId:   string
  teacherName: string
  classTarget: string
  dueDate:     string
  points:      number
  createdAt:   Timestamp
  published:   boolean
}

export interface FSSubmission {
  id:           string
  exerciseId:   string
  studentId:    string
  studentName:  string
  studentClass: string
  photoUri?:    string
  studentNote?: string
  aiScore?:     number
  aiSummary?:   string
  teacherGrade?: number
  teacherNote?:  string
  reviewed:     boolean
  submittedAt:  Timestamp
}

export interface FSFee {
  id:          string
  studentId:   string
  label:       string
  amount:      number
  currency:    string
  dueDate:     string
  invoiceNum:  string
  status:      'paid' | 'confirmed' | 'pending' | 'unpaid'
  createdAt:   Timestamp
}

// ── Mutation helpers ─────────────────────────────────────────────────────────
export async function addSubmission(
  schoolId: string,
  data: Omit<FSSubmission, 'id' | 'submittedAt'>,
) {
  return addDoc(cols.submissions(schoolId), { ...data, submittedAt: serverTimestamp() })
}

export async function reviewSubmission(
  schoolId: string,
  submissionId: string,
  grade: number,
  note: string,
) {
  return updateDoc(doc(cols.submissions(schoolId), submissionId), {
    teacherGrade: grade,
    teacherNote:  note,
    reviewed:     true,
  })
}

export async function publishCourse(schoolId: string, courseId: string, published: boolean) {
  return updateDoc(doc(cols.courses(schoolId), courseId), {
    published,
    updatedAt: serverTimestamp(),
  })
}

export async function addExercise(schoolId: string, data: any) {
  return addDoc(cols.exercises(schoolId), { ...data, createdAt: serverTimestamp() })
}

export async function saveQuizProgress(schoolId: string, studentId: string, exerciseId: string, score: number, maxScore: number) {
  // Save progress
  const progressCol = collection(db, 'schools', schoolId, 'progress')
  await addDoc(progressCol, {
    studentId,
    exerciseId,
    score,
    maxScore,
    completedAt: serverTimestamp()
  })
}

// ── Grades / Notes ────────────────────────────────────────────────────────────

/**
 * Enregistre ou met à jour la note d'un élève pour une évaluation.
 * Crée le document d'évaluation s'il n'existe pas encore.
 */
export async function saveAssessmentGrade(
  schoolId:     string,
  assessmentId: string,
  teacherId:    string,
  studentId:    string,
  value:        number | null,
  comment:      string,
) {
  const ref = doc(cols.assessments(schoolId), assessmentId)
  try {
    await updateDoc(ref, {
      [`grades.${studentId}.value`]:   value,
      [`grades.${studentId}.comment`]: comment || '',
      teacherId,
      updatedAt: serverTimestamp(),
    })
  } catch {
    // Document inexistant — on le crée
    await setDoc(ref, {
      teacherId,
      schoolYear: '2025-2026',
      grades: { [studentId]: { value, comment: comment || '' } },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
}

// ── Attendance / Présences ────────────────────────────────────────────────────

/**
 * Sauvegarde la feuille de présence d'une classe pour un jour donné.
 * Utilise setDoc avec merge pour permettre les mises à jour partielles.
 */
export async function saveAttendanceRecord(
  schoolId:  string,
  classId:   string,
  dateISO:   string,
  teacherId: string,
  records:   Record<string, { status: AttendanceStatus; note?: string }>,
  meta:      { className: string; dayLabel: string; subject: string },
) {
  const docId = `${classId}_${dateISO}`
  await setDoc(doc(cols.attendance(schoolId), docId), {
    classId, className: meta.className,
    date: dateISO, dayLabel: meta.dayLabel,
    teacherId, subject: meta.subject,
    schoolYear: '2025-2026',
    records,
    savedAt: serverTimestamp(),
  }, { merge: true })
}

// ── Bulletins ─────────────────────────────────────────────────────────────────

export async function submitBulletin(
  schoolId: string,
  data: Omit<FSBulletin, 'id' | 'createdAt' | 'updatedAt' | 'submittedAt' | 'approvedAt' | 'publishedAt'>,
) {
  return addDoc(cols.bulletins(schoolId), {
    ...data,
    status:      'submitted',
    submittedAt: serverTimestamp(),
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  })
}

export async function validateBulletin(schoolId: string, bulletinId: string, directorComment: string) {
  return updateDoc(doc(cols.bulletins(schoolId), bulletinId), {
    status:          'approved',
    directorComment,
    approvedAt:      serverTimestamp(),
    updatedAt:       serverTimestamp(),
  })
}

export async function rejectBulletin(schoolId: string, bulletinId: string, reason: string) {
  return updateDoc(doc(cols.bulletins(schoolId), bulletinId), {
    status:          'rejected',
    rejectionReason: reason,
    updatedAt:       serverTimestamp(),
  })
}

export async function publishBulletin(schoolId: string, bulletinId: string) {
  return updateDoc(doc(cols.bulletins(schoolId), bulletinId), {
    status:      'published',
    publishedAt: serverTimestamp(),
    updatedAt:   serverTimestamp(),
  })
}

// ── Annonces ──────────────────────────────────────────────────────────────────

export async function createAnnouncement(
  schoolId: string,
  data: Omit<FSAnnouncement, 'id' | 'readBy' | 'createdAt'>,
) {
  return addDoc(cols.announcements(schoolId), {
    ...data, readBy: [], createdAt: serverTimestamp(),
  })
}

export async function markAnnouncementRead(schoolId: string, announcementId: string, userId: string) {
  const ref = doc(cols.announcements(schoolId), announcementId)
  return updateDoc(ref, {
    readBy: arrayUnion(userId),
  })
}

