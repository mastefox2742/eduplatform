/**
 * Helpers Firestore génériques — wrappent les SDK calls avec gestion d'erreur
 * et timestamps automatiques.
 */
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, serverTimestamp,
  type Query, type CollectionReference, type WhereFilterOp,
  type DocumentData, type QueryConstraint, Timestamp,
} from 'firebase/firestore'
import { db } from '@/config/firebase'

// ─── Path helpers ────────────────────────────────────────────────────────────

/** Returns the Firestore path for a school sub-collection */
export function schoolCol(schoolId: string, colName: string) {
  return collection(db, 'schools', schoolId, colName)
}

/** Returns a document ref inside a school sub-collection */
export function schoolDoc(schoolId: string, colName: string, docId: string) {
  return doc(db, 'schools', schoolId, colName, docId)
}

// ─── Timestamp helpers ───────────────────────────────────────────────────────

export function now(): number {
  return Date.now()
}

/** Convert Firestore Timestamp or number to JS number (ms) */
export function toMs(v: Timestamp | number | undefined): number {
  if (!v) return 0
  if (v instanceof Timestamp) return v.toMillis()
  return v
}

/** Adds createdAt + updatedAt to a create payload */
export function withTimestamps<T extends object>(data: T): T & { createdAt: number; updatedAt: number } {
  const ts = Date.now()
  return { ...data, createdAt: ts, updatedAt: ts }
}

/** Adds updatedAt to an update payload */
export function withUpdated<T extends object>(data: T): T & { updatedAt: number } {
  return { ...data, updatedAt: Date.now() }
}

// ─── Generic CRUD ────────────────────────────────────────────────────────────

/** Add a document with auto timestamps */
export async function addDocument<T extends object>(
  col: CollectionReference,
  data: T
): Promise<string> {
  const ref = await addDoc(col, withTimestamps(data))
  return ref.id
}

/** Update a document by id with auto updatedAt */
export async function updateDocument(
  docRef: ReturnType<typeof doc>,
  data: Partial<DocumentData>
): Promise<void> {
  await updateDoc(docRef, withUpdated(data))
}

/** Delete a document */
export async function deleteDocument(docRef: ReturnType<typeof doc>): Promise<void> {
  await deleteDoc(docRef)
}

/** Get a single document and map to typed object */
export async function getDocument<T>(
  docRef: ReturnType<typeof doc>
): Promise<T | null> {
  const snap = await getDoc(docRef)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as T
}

/** Get all documents from a query */
export async function getDocuments<T>(q: Query): Promise<T[]> {
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as T))
}

// ─── Real-time subscriptions ─────────────────────────────────────────────────

/** Subscribe to a collection query with typed callback */
export function subscribeToQuery<T>(
  q: Query,
  onData: (items: T[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as T))
      onData(items)
    },
    (err) => onError?.(err)
  )
}

/** Subscribe to a single document */
export function subscribeToDoc<T>(
  docRef: ReturnType<typeof doc>,
  onData: (item: T | null) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) { onData(null); return }
      onData({ id: snap.id, ...snap.data() } as T)
    },
    (err) => onError?.(err)
  )
}

// ─── Query builder helpers ────────────────────────────────────────────────────

export { collection, doc, query, where, orderBy, limit, getDocs, getDoc }
export type { Query, CollectionReference, QueryConstraint }
