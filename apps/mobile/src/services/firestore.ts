/**
 * Firestore service layer — school platform
 * Utilise l'instance Firebase centrale depuis @/config/firebase
 */
import {
  collection, doc,
  onSnapshot, query, where, orderBy,
  addDoc, updateDoc, serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db, auth } from '@/config/firebase'

export { db, auth }

// ── Collection helpers ───────────────────────────────────────────────────────
export const cols = {
  users:       () => collection(db, 'users'),
  courses:     (schoolId: string) => collection(db, 'schools', schoolId, 'courses'),
  exercises:   (schoolId: string) => collection(db, 'schools', schoolId, 'exercises'),
  submissions: (schoolId: string) => collection(db, 'schools', schoolId, 'submissions'),
  fees:        (schoolId: string) => collection(db, 'schools', schoolId, 'fees'),
  supplies:    (schoolId: string) => collection(db, 'schools', schoolId, 'supplies'),
}

// ── Types ────────────────────────────────────────────────────────────────────
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
