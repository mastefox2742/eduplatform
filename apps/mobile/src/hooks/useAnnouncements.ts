/**
 * useAnnouncements — Annonces scolaires avec Firebase temps réel
 *
 * Utilisé par :
 *  - (direction)/announcements.tsx  → crée et gère les annonces
 *  - (parent)/index.tsx             → affiche les annonces récentes
 *  - (student)/index.tsx            → idem
 *  - (teacher)/index.tsx            → idem pour les enseignants
 */
import { useState, useEffect, useCallback } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  doc, addDoc, updateDoc, arrayUnion, serverTimestamp,
} from 'firebase/firestore'
import { db, type FSAnnouncement } from '@/services/firestore'

export type { FSAnnouncement }

// ── Hook principal ─────────────────────────────────────────────────────────────

/**
 * Charge les annonces d'une école en temps réel, avec filtre optionnel sur l'audience.
 *
 * @param schoolId - ID de l'école (ou 'demo' pour mode hors-ligne)
 * @param audience - Filtre audience : 'all' | 'parents' | 'students' | 'teachers'
 *                  Si omis, retourne toutes les annonces.
 */
export function useAnnouncements(
  schoolId: string,
  audience?: 'all' | 'parents' | 'students' | 'teachers',
) {
  const [announcements, setAnnouncements] = useState<FSAnnouncement[]>([])
  const [loading,       setLoading]       = useState(false)

  useEffect(() => {
    if (!schoolId || schoolId === 'demo') return

    setLoading(true)

    let q = query(
      collection(db, 'schools', schoolId, 'announcements'),
      orderBy('createdAt', 'desc'),
    )

    // Filtre audience : retourne les annonces pour 'all' ET pour l'audience spécifiée
    // Firestore ne supporte pas OR nativement → on charge tout et on filtre côté client
    // (les annonces sont peu nombreuses, pas de souci perf)

    const unsub = onSnapshot(q,
      snap => {
        let docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as FSAnnouncement))
        // Filtre côté client si audience spécifiée
        if (audience && audience !== 'all') {
          docs = docs.filter(a => a.audience === 'all' || a.audience === audience)
        }
        setAnnouncements(docs)
        setLoading(false)
      },
      _err => setLoading(false),
    )

    return unsub
  }, [schoolId, audience])

  return { announcements, loading }
}

// ── Création d'une annonce ─────────────────────────────────────────────────────

export async function publishAnnouncement(
  schoolId:   string,
  authorId:   string,
  authorName: string,
  data: {
    title:    string
    body:     string
    category: FSAnnouncement['category']
    audience: FSAnnouncement['audience']
    pinned?:  boolean
  },
): Promise<string | null> {
  if (!schoolId || schoolId === 'demo') return null
  try {
    const ref = await addDoc(collection(db, 'schools', schoolId, 'announcements'), {
      schoolId,
      authorId,
      authorName,
      title:    data.title,
      body:     data.body,
      category: data.category,
      audience: data.audience,
      pinned:   data.pinned ?? false,
      readBy:   [authorId],    // L'auteur l'a "lue" d'office
      createdAt: serverTimestamp(),
    })
    return ref.id
  } catch (e) {
    console.warn('[useAnnouncements] publishAnnouncement failed:', e)
    return null
  }
}

// ── Marquer une annonce comme lue ─────────────────────────────────────────────

export async function markAnnouncementRead(
  schoolId:       string,
  announcementId: string,
  userId:         string,
) {
  if (!schoolId || schoolId === 'demo') return
  try {
    await updateDoc(
      doc(db, 'schools', schoolId, 'announcements', announcementId),
      { readBy: arrayUnion(userId) },
    )
  } catch (e) {
    console.warn('[useAnnouncements] markRead failed:', e)
  }
}
