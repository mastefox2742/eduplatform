import { query, orderBy, where } from 'firebase/firestore'
import {
  schoolCol, schoolDoc,
  addDocument, updateDocument, deleteDocument,
  getDocuments, subscribeToQuery,
} from './db'
import type { SchoolClass, CreateInput, UpdateInput } from '@school/shared-types'

export type ClassCreate = CreateInput<SchoolClass>
export type ClassUpdate = UpdateInput<SchoolClass>

function col(schoolId: string) {
  return schoolCol(schoolId, 'classes')
}

function ref(schoolId: string, id: string) {
  return schoolDoc(schoolId, 'classes', id)
}

/** Subscribe to all classes, ordered by name */
export function subscribeClasses(
  schoolId: string,
  onData: (classes: SchoolClass[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(col(schoolId), orderBy('name', 'asc'))
  return subscribeToQuery<SchoolClass>(q, onData, onError)
}

/** Subscribe to active classes only */
export function subscribeActiveClasses(
  schoolId: string,
  onData: (classes: SchoolClass[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    col(schoolId),
    where('isActive', '==', true),
    orderBy('name', 'asc')
  )
  return subscribeToQuery<SchoolClass>(q, onData, onError)
}

export function fetchClasses(schoolId: string): Promise<SchoolClass[]> {
  const q = query(col(schoolId), orderBy('name', 'asc'))
  return getDocuments<SchoolClass>(q)
}

export function addClass(schoolId: string, data: ClassCreate): Promise<string> {
  return addDocument(col(schoolId), { ...data, schoolId })
}

export function updateClass(schoolId: string, id: string, data: ClassUpdate): Promise<void> {
  return updateDocument(ref(schoolId, id), data)
}

export function deleteClass(schoolId: string, id: string): Promise<void> {
  return deleteDocument(ref(schoolId, id))
}
