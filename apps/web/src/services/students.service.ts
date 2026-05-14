import { query, orderBy, where } from 'firebase/firestore'
import {
  schoolCol, schoolDoc,
  addDocument, updateDocument, deleteDocument,
  getDocuments, subscribeToQuery,
} from './db'
import type { StudentMember, CreateInput, UpdateInput } from '@school/shared-types'

export type StudentCreate = CreateInput<StudentMember>
export type StudentUpdate = UpdateInput<StudentMember>

// ─── Collection ref ───────────────────────────────────────────────────────────

function col(schoolId: string) {
  return schoolCol(schoolId, 'students')
}

function ref(schoolId: string, id: string) {
  return schoolDoc(schoolId, 'students', id)
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Subscribe to all students in a school, ordered by name */
export function subscribeStudents(
  schoolId: string,
  onData: (students: StudentMember[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(col(schoolId), orderBy('displayName', 'asc'))
  return subscribeToQuery<StudentMember>(q, onData, onError)
}

/** Subscribe to students in a specific class */
export function subscribeStudentsByClass(
  schoolId: string,
  classId: string,
  onData: (students: StudentMember[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    col(schoolId),
    where('classId', '==', classId),
    orderBy('displayName', 'asc')
  )
  return subscribeToQuery<StudentMember>(q, onData, onError)
}

/** One-time fetch of all students */
export function fetchStudents(schoolId: string): Promise<StudentMember[]> {
  const q = query(col(schoolId), orderBy('displayName', 'asc'))
  return getDocuments<StudentMember>(q)
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function addStudent(schoolId: string, data: StudentCreate): Promise<string> {
  return addDocument(col(schoolId), { ...data, schoolId })
}

export function updateStudent(schoolId: string, id: string, data: StudentUpdate): Promise<void> {
  return updateDocument(ref(schoolId, id), data)
}

export function deleteStudent(schoolId: string, id: string): Promise<void> {
  return deleteDocument(ref(schoolId, id))
}
