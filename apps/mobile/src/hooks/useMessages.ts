/**
 * useMessages — Messagerie temps réel avec Firebase
 *
 * Architecture :
 *  - Thread = conversation (document dans messages/)
 *  - Msg    = message individuel (sous-collection messages/{id}/msgs/)
 *
 * Stratégie hybride :
 *  - Mode démo  (schoolId === 'demo') : état local pur, aucun appel Firebase
 *  - Mode réel  : `sendMsg` écrit en Firebase, `useThreadMessages` écoute en temps réel
 *    Les messages démo servent d'état initial ; Firebase ajoute par-dessus.
 */
import { useEffect, useState } from 'react'
import {
  collection, doc, query, where, orderBy,
  onSnapshot, addDoc, setDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/services/firestore'

// ── Types exportés ─────────────────────────────────────────────────────────────

export interface FSThread {
  id:               string
  participants:     string[]
  participantNames: Record<string, string>
  participantRoles: Record<string, string>
  studentId?:       string
  studentName?:     string
  classId?:         string
  tag?:             'absence' | 'note' | 'comportement' | 'general'
  urgent?:          boolean
  lastMessage:      string
  lastMessageAt:    any    // Timestamp
  lastSenderId:     string
  unreadCounts:     Record<string, number>
}

export interface FSMsg {
  id:         string
  senderId:   string
  senderName: string
  senderRole: 'teacher' | 'parent' | 'direction' | 'student'
  text:       string
  sentAt:     any    // Timestamp
  readBy:     string[]
}

// ── Hook : liste des threads d'un utilisateur ──────────────────────────────────

export function useThreads(schoolId: string, userId: string) {
  const [threads, setThreads] = useState<FSThread[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!schoolId || schoolId === 'demo' || !userId) return

    setLoading(true)
    const q = query(
      collection(db, 'schools', schoolId, 'messages'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc'),
    )

    const unsub = onSnapshot(q,
      snap => {
        setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() } as FSThread)))
        setLoading(false)
      },
      _err => setLoading(false),
    )

    return unsub
  }, [schoolId, userId])

  return { threads, loading }
}

// ── Hook : messages d'un thread spécifique (temps réel) ───────────────────────

export function useThreadMessages(schoolId: string, threadId: string | null) {
  const [messages, setMessages] = useState<FSMsg[]>([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (!schoolId || schoolId === 'demo' || !threadId) return

    setLoading(true)
    const q = query(
      collection(db, 'schools', schoolId, 'messages', threadId, 'msgs'),
      orderBy('sentAt', 'asc'),
    )

    const unsub = onSnapshot(q,
      snap => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as FSMsg)))
        setLoading(false)
      },
      _err => setLoading(false),
    )

    return unsub
  }, [schoolId, threadId])

  return { messages, loading }
}

// ── Envoi d'un message (fire-and-forget) ──────────────────────────────────────

/**
 * Envoie un message dans un thread.
 * Crée le document thread s'il n'existe pas encore (merge: true).
 *
 * @param schoolId   - ID de l'école
 * @param threadId   - ID du thread (peut être un ID démo comme 'cv1')
 * @param senderId   - UID de l'expéditeur
 * @param senderName - Nom affiché de l'expéditeur
 * @param senderRole - Rôle de l'expéditeur
 * @param text       - Contenu du message
 */
export async function sendMsg(
  schoolId:   string,
  threadId:   string,
  senderId:   string,
  senderName: string,
  senderRole: 'teacher' | 'parent' | 'direction' | 'student',
  text:       string,
) {
  if (!schoolId || schoolId === 'demo' || !threadId || !text.trim()) return

  try {
    // 1. Ajouter le message dans la sous-collection
    const msgsRef = collection(db, 'schools', schoolId, 'messages', threadId, 'msgs')
    await addDoc(msgsRef, {
      senderId, senderName, senderRole,
      text: text.trim(),
      sentAt: serverTimestamp(),
      readBy: [senderId],
    })

    // 2. Mettre à jour le document thread (lastMessage, date, etc.)
    const threadRef = doc(db, 'schools', schoolId, 'messages', threadId)
    await setDoc(threadRef, {
      lastMessage:    text.trim(),
      lastMessageAt:  serverTimestamp(),
      lastSenderId:   senderId,
      updatedAt:      serverTimestamp(),
    }, { merge: true })

  } catch (e) {
    console.warn('[useMessages] sendMsg failed:', e)
  }
}

// ── Marquer un thread comme lu ────────────────────────────────────────────────

export async function markThreadRead(
  schoolId: string,
  threadId: string,
  userId:   string,
) {
  if (!schoolId || schoolId === 'demo' || !threadId) return
  try {
    await setDoc(
      doc(db, 'schools', schoolId, 'messages', threadId),
      { [`unreadCounts.${userId}`]: 0, [`readBy.${userId}`]: serverTimestamp() },
      { merge: true },
    )
  } catch (e) {
    console.warn('[useMessages] markThreadRead failed:', e)
  }
}
