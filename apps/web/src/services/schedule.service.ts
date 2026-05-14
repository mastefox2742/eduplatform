import { query, orderBy, where } from 'firebase/firestore'
import {
  schoolCol, schoolDoc,
  addDocument, updateDocument, deleteDocument,
  getDocuments, subscribeToQuery,
} from './db'
import type { ScheduleSlot, DayOfWeek, SlotType, CreateInput, UpdateInput } from '@school/shared-types'

export type SlotCreate = CreateInput<ScheduleSlot>
export type SlotUpdate = UpdateInput<ScheduleSlot>

function col(schoolId: string) {
  return schoolCol(schoolId, 'schedule')
}

function ref(schoolId: string, id: string) {
  return schoolDoc(schoolId, 'schedule', id)
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

/** All slots for a school, ordered by day then start time */
export function subscribeSchedule(
  schoolId: string,
  onData: (slots: ScheduleSlot[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(col(schoolId), orderBy('day', 'asc'), orderBy('startTime', 'asc'))
  return subscribeToQuery<ScheduleSlot>(q, onData, onError)
}

/** Slots for a specific teacher */
export function subscribeTeacherSchedule(
  schoolId: string,
  teacherId: string,
  onData: (slots: ScheduleSlot[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    col(schoolId),
    where('teacherId', '==', teacherId),
    orderBy('day', 'asc'),
    orderBy('startTime', 'asc')
  )
  return subscribeToQuery<ScheduleSlot>(q, onData, onError)
}

/** Slots for a specific class */
export function subscribeClassSchedule(
  schoolId: string,
  classId: string,
  onData: (slots: ScheduleSlot[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    col(schoolId),
    where('classId', '==', classId),
    orderBy('day', 'asc'),
    orderBy('startTime', 'asc')
  )
  return subscribeToQuery<ScheduleSlot>(q, onData, onError)
}

/** Slots by type (e.g. only exams) */
export function subscribeScheduleByType(
  schoolId: string,
  type: SlotType,
  onData: (slots: ScheduleSlot[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    col(schoolId),
    where('type', '==', type),
    orderBy('day', 'asc'),
    orderBy('startTime', 'asc')
  )
  return subscribeToQuery<ScheduleSlot>(q, onData, onError)
}

export function fetchSchedule(schoolId: string): Promise<ScheduleSlot[]> {
  const q = query(col(schoolId), orderBy('day', 'asc'), orderBy('startTime', 'asc'))
  return getDocuments<ScheduleSlot>(q)
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function addSlot(schoolId: string, data: SlotCreate): Promise<string> {
  return addDocument(col(schoolId), { ...data, schoolId })
}

export function updateSlot(schoolId: string, id: string, data: SlotUpdate): Promise<void> {
  return updateDocument(ref(schoolId, id), data)
}

export function deleteSlot(schoolId: string, id: string): Promise<void> {
  return deleteDocument(ref(schoolId, id))
}
