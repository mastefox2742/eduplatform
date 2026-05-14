import { query, orderBy, where } from 'firebase/firestore'
import {
  schoolCol, schoolDoc,
  addDocument, updateDocument, deleteDocument,
  getDocuments, subscribeToQuery,
} from './db'
import type { TeacherMember, CreateInput, UpdateInput } from '@school/shared-types'

export type TeacherCreate = CreateInput<TeacherMember>
export type TeacherUpdate = UpdateInput<TeacherMember>

function col(schoolId: string) {
  return schoolCol(schoolId, 'teachers')
}

function ref(schoolId: string, id: string) {
  return schoolDoc(schoolId, 'teachers', id)
}

/** Subscribe to all teachers ordered by name */
export function subscribeTeachers(
  schoolId: string,
  onData: (teachers: TeacherMember[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(col(schoolId), orderBy('displayName', 'asc'))
  return subscribeToQuery<TeacherMember>(q, onData, onError)
}

/** Subscribe to active teachers only */
export function subscribeActiveTeachers(
  schoolId: string,
  onData: (teachers: TeacherMember[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    col(schoolId),
    where('isActive', '==', true),
    orderBy('displayName', 'asc')
  )
  return subscribeToQuery<TeacherMember>(q, onData, onError)
}

export function fetchTeachers(schoolId: string): Promise<TeacherMember[]> {
  const q = query(col(schoolId), orderBy('displayName', 'asc'))
  return getDocuments<TeacherMember>(q)
}

export function addTeacher(schoolId: string, data: TeacherCreate): Promise<string> {
  return addDocument(col(schoolId), { ...data, schoolId })
}

export function updateTeacher(schoolId: string, id: string, data: TeacherUpdate): Promise<void> {
  return updateDocument(ref(schoolId, id), data)
}

export function deleteTeacher(schoolId: string, id: string): Promise<void> {
  return deleteDocument(ref(schoolId, id))
}
