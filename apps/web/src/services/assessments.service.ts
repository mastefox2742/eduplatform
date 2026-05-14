import { query, orderBy, where } from 'firebase/firestore'
import {
  schoolCol, schoolDoc,
  addDocument, updateDocument, deleteDocument,
  getDocuments, subscribeToQuery, withUpdated,
} from './db'
import type { Assessment, AssessmentStatus, Trimester, CreateInput, UpdateInput } from '@school/shared-types'

export type AssessmentCreate = CreateInput<Assessment>
export type AssessmentUpdate = UpdateInput<Assessment>

function col(schoolId: string) {
  return schoolCol(schoolId, 'assessments')
}

function ref(schoolId: string, id: string) {
  return schoolDoc(schoolId, 'assessments', id)
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

/** All assessments for a school, ordered by scheduled date desc */
export function subscribeAssessments(
  schoolId: string,
  onData: (items: Assessment[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(col(schoolId), orderBy('scheduledDate', 'desc'))
  return subscribeToQuery<Assessment>(q, onData, onError)
}

/** Assessments for a specific teacher */
export function subscribeTeacherAssessments(
  schoolId: string,
  teacherId: string,
  onData: (items: Assessment[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    col(schoolId),
    where('teacherId', '==', teacherId),
    orderBy('scheduledDate', 'desc')
  )
  return subscribeToQuery<Assessment>(q, onData, onError)
}

/** Assessments for a specific trimester */
export function subscribeAssessmentsByTrimester(
  schoolId: string,
  trimester: Trimester,
  onData: (items: Assessment[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    col(schoolId),
    where('trimester', '==', trimester),
    orderBy('scheduledDate', 'desc')
  )
  return subscribeToQuery<Assessment>(q, onData, onError)
}

/** Pending assessments (submitted → awaiting approval) */
export function subscribePendingAssessments(
  schoolId: string,
  onData: (items: Assessment[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    col(schoolId),
    where('status', '==', 'submitted' satisfies AssessmentStatus),
    orderBy('submittedAt', 'asc')
  )
  return subscribeToQuery<Assessment>(q, onData, onError)
}

export function fetchAssessments(schoolId: string): Promise<Assessment[]> {
  const q = query(col(schoolId), orderBy('scheduledDate', 'desc'))
  return getDocuments<Assessment>(q)
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function addAssessment(schoolId: string, data: AssessmentCreate): Promise<string> {
  return addDocument(col(schoolId), { ...data, schoolId })
}

export function updateAssessment(schoolId: string, id: string, data: AssessmentUpdate): Promise<void> {
  return updateDocument(ref(schoolId, id), data)
}

export function deleteAssessment(schoolId: string, id: string): Promise<void> {
  return deleteDocument(ref(schoolId, id))
}

/** Teacher submits an assessment to the direction */
export function submitAssessment(schoolId: string, id: string): Promise<void> {
  return updateDocument(ref(schoolId, id), withUpdated({
    status: 'submitted' satisfies AssessmentStatus,
    submittedAt: Date.now(),
  }))
}

/** Direction approves an assessment */
export function approveAssessment(schoolId: string, id: string, approvedBy: string): Promise<void> {
  return updateDocument(ref(schoolId, id), withUpdated({
    status: 'approved' satisfies AssessmentStatus,
    approvedAt: Date.now(),
    approvedBy,
  }))
}

/** Direction rejects an assessment */
export function rejectAssessment(schoolId: string, id: string, reason: string): Promise<void> {
  return updateDocument(ref(schoolId, id), withUpdated({
    status: 'rejected' satisfies AssessmentStatus,
    rejectedAt: Date.now(),
    rejectionReason: reason,
  }))
}

/** Move to grading phase */
export function startGrading(schoolId: string, id: string): Promise<void> {
  return updateDocument(ref(schoolId, id), withUpdated({
    status: 'grading' satisfies AssessmentStatus,
  }))
}

/** Save grades and mark as graded */
export function saveGrades(
  schoolId: string,
  id: string,
  grades: Assessment['grades'],
  avgScore: number
): Promise<void> {
  return updateDocument(ref(schoolId, id), withUpdated({
    grades,
    avgScore,
    status: 'graded' satisfies AssessmentStatus,
  }))
}
