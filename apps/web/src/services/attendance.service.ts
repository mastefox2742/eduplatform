import { query, orderBy, where } from 'firebase/firestore'
import {
  schoolCol, schoolDoc,
  addDocument, updateDocument,
  getDocuments, subscribeToQuery, withUpdated,
} from './db'
import type { TeacherAttendanceRecord, AttendanceStatus, CreateInput, UpdateInput } from '@school/shared-types'

export type AttendanceCreate = CreateInput<TeacherAttendanceRecord>
export type AttendanceUpdate = UpdateInput<TeacherAttendanceRecord>

function col(schoolId: string) {
  return schoolCol(schoolId, 'attendance')
}

function ref(schoolId: string, id: string) {
  return schoolDoc(schoolId, 'attendance', id)
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

/** Subscribe to attendance records for a specific week (date range) */
export function subscribeAttendanceByWeek(
  schoolId: string,
  weekStart: string,   // 'YYYY-MM-DD'
  weekEnd: string,     // 'YYYY-MM-DD'
  onData: (records: TeacherAttendanceRecord[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    col(schoolId),
    where('date', '>=', weekStart),
    where('date', '<=', weekEnd),
    orderBy('date', 'asc'),
    orderBy('teacherName', 'asc')
  )
  return subscribeToQuery<TeacherAttendanceRecord>(q, onData, onError)
}

/** Subscribe to a teacher's own attendance records */
export function subscribeTeacherAttendance(
  schoolId: string,
  teacherId: string,
  onData: (records: TeacherAttendanceRecord[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    col(schoolId),
    where('teacherId', '==', teacherId),
    orderBy('date', 'desc')
  )
  return subscribeToQuery<TeacherAttendanceRecord>(q, onData, onError)
}

/** Subscribe to pending/absent records that need validation */
export function subscribePendingAttendance(
  schoolId: string,
  onData: (records: TeacherAttendanceRecord[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    col(schoolId),
    where('status', 'in', ['pending', 'absent'] satisfies AttendanceStatus[]),
    orderBy('date', 'desc')
  )
  return subscribeToQuery<TeacherAttendanceRecord>(q, onData, onError)
}

export function fetchAttendanceByWeek(
  schoolId: string,
  weekStart: string,
  weekEnd: string
): Promise<TeacherAttendanceRecord[]> {
  const q = query(
    col(schoolId),
    where('date', '>=', weekStart),
    where('date', '<=', weekEnd),
    orderBy('date', 'asc')
  )
  return getDocuments<TeacherAttendanceRecord>(q)
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function addAttendanceRecord(schoolId: string, data: AttendanceCreate): Promise<string> {
  return addDocument(col(schoolId), { ...data, schoolId })
}

export function updateAttendanceRecord(schoolId: string, id: string, data: AttendanceUpdate): Promise<void> {
  return updateDocument(ref(schoolId, id), data)
}

/** Mark a record as present with actual times */
export function markPresent(
  schoolId: string,
  id: string,
  actualStart: string,
  actualEnd: string,
  effectiveHours: number
): Promise<void> {
  return updateDocument(ref(schoolId, id), withUpdated({
    status: 'present' satisfies AttendanceStatus,
    actualStart,
    actualEnd,
    effectiveHours,
  }))
}

/** Validate a justified absence */
export function justifyAbsence(
  schoolId: string,
  id: string,
  justification: string,
  validatedBy: string
): Promise<void> {
  return updateDocument(ref(schoolId, id), withUpdated({
    status: 'justified' satisfies AttendanceStatus,
    justification,
    validatedBy,
  }))
}
