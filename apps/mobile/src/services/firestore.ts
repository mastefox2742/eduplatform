/**
 * Firestore service layer — school platform
 */
import { initializeApp, getApps } from 'firebase/app'
import {
  getFirestore, collection, doc,
  onSnapshot, query, where, orderBy,
  addDoc, updateDoc, serverTimestamp,
  Timestamp, DocumentData, QuerySnapshot
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Firebase config (demo — replace with real values via env)
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? 'demo-key',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? 'demo.firebaseapp.com',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? 'school-demo',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? 'school-demo.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             ?? '1:000000000000:web:demo',
}

export const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0]

export const db   = getFirestore(firebaseApp)
export const auth = getAuth(firebaseApp)

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
export async function addSubmission(schoolId: string, data: Omit<FSSubmission, 'id' | 'submittedAt'>) {
  return addDoc(cols.submissions(schoolId), { ...data, submittedAt: serverTimestamp() })
}

export async function reviewSubmission(schoolId: string, submissionId: string, grade: number, note: string) {
  return updateDoc(doc(cols.submissions(schoolId), submissionId), {
    teacherGrade: grade, teacherNote: note, reviewed: true,
  })
}

export async function publishCourse(schoolId: string, courseId: string, published: boolean) {
  return updateDoc(doc(cols.courses(schoolId), courseId), { published, updatedAt: serverTimestamp() })
}
