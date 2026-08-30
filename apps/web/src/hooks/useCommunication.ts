/**
 * useCommunication — annonces et messagerie.
 * Cahier des charges §17.
 *
 * Deux règles gouvernent ce domaine, et elles sont visibles à l'écran :
 *
 *  - **Une annonce publiée ne se rattrape pas.** Elle part sur les
 *    téléphones des familles. D'où le brouillon obligatoire, la
 *    confirmation explicite avant envoi, et l'affichage du nombre de
 *    destinataires réels.
 *  - **Le canal dépend de l'urgence, pas de l'habitude.** Une
 *    convocation urgente part par SMS parce que tous les parents n'ont
 *    pas de connexion (§19) ; une information ordinaire reste dans
 *    l'application, où elle ne coûte rien.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'
import { PREVIEW_MODE } from '@/config/preview'

export type Audience = 'toute_ecole' | 'niveau' | 'classe' | 'enseignants' | 'parents'
export type Channel = 'app' | 'sms' | 'whatsapp'
export type AnnouncementStatus = 'brouillon' | 'publie'

export interface Announcement {
  id: string
  title: string
  body: string
  audience: Audience
  audienceLabel: string
  channels: Channel[]
  status: AnnouncementStatus
  recipientCount: number
  readCount: number
  authorName: string
  createdAt: string
  publishedAt: string | null
}

export interface Conversation {
  id: string
  participantName: string
  participantRole: string
  subject: string
  lastMessage: string
  lastAt: string
  unread: boolean
  /** Un parent qui attend depuis plus de 48 h est signalé. */
  waitingHours: number
}

export const AUDIENCE_LABELS: Record<Audience, string> = {
  toute_ecole: 'Toute l’école',
  niveau: 'Un niveau',
  classe: 'Une classe',
  enseignants: 'Les enseignants',
  parents: 'Les parents',
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  app: 'Application',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
}

const PREVIEW_ANNOUNCEMENTS: Announcement[] = [
  { id: 'n1', title: 'Réunion parents-professeurs — 3ème', body: 'La réunion se tiendra le samedi 12 septembre à 9 h dans la salle polyvalente. La présence d’au moins un responsable est vivement souhaitée.', audience: 'niveau', audienceLabel: 'Niveau 3ème', channels: ['app', 'sms'], status: 'publie', recipientCount: 84, readCount: 61, authorName: 'Mme Nsimba', createdAt: '2026-08-25T08:00:00Z', publishedAt: '2026-08-25T09:00:00Z' },
  { id: 'n2', title: 'Fermeture exceptionnelle — jeudi', body: 'L’établissement sera fermé jeudi 3 septembre pour la journée de formation des enseignants. Les cours reprennent vendredi aux horaires habituels.', audience: 'toute_ecole', audienceLabel: 'Toute l’école', channels: ['app', 'sms', 'whatsapp'], status: 'publie', recipientCount: 412, readCount: 388, authorName: 'Mme Nsimba', createdAt: '2026-08-28T14:00:00Z', publishedAt: '2026-08-28T14:20:00Z' },
  { id: 'n3', title: 'Rappel — échéance de scolarité du 15 septembre', body: 'La deuxième tranche de la scolarité est due au plus tard le 15 septembre. Le paiement est possible par Mobile Money depuis l’application.', audience: 'parents', audienceLabel: 'Tous les parents', channels: ['app'], status: 'brouillon', recipientCount: 298, readCount: 0, authorName: 'Mme Nsimba', createdAt: '2026-08-30T07:30:00Z', publishedAt: null },
]

const PREVIEW_CONVERSATIONS: Conversation[] = [
  { id: 'c1', participantName: 'M. Nguesso Patrick', participantRole: 'Parent — Elie Nguesso (3ème A)', subject: 'Absences de mon fils', lastMessage: 'Bonjour Madame, je voudrais comprendre les absences signalées. Elie part bien tous les matins.', lastAt: '2026-08-28T16:40:00Z', unread: true, waitingHours: 62 },
  { id: 'c2', participantName: 'Mme Mampouya Éliane', participantRole: 'Parent — Grace Mampouya (3ème A)', subject: 'Étalement de la scolarité', lastMessage: 'Serait-il possible d’échelonner le reste de la scolarité sur deux mois ?', lastAt: '2026-08-29T11:15:00Z', unread: true, waitingHours: 43 },
  { id: 'c3', participantName: 'M. Okemba Jean-Paul', participantRole: 'Enseignant — Mathématiques', subject: 'Salle pour le devoir surveillé', lastMessage: 'La salle 12 est prise vendredi, puis-je utiliser la salle polyvalente ?', lastAt: '2026-08-30T08:05:00Z', unread: false, waitingHours: 22 },
]

export function useCommunication() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (PREVIEW_MODE) {
      setAnnouncements(PREVIEW_ANNOUNCEMENTS)
      setConversations(PREVIEW_CONVERSATIONS)
      setLoading(false)
      return
    }
    setLoading(true)
    const [a, c] = await Promise.all([
      supabase.from('announcements')
        .select('id, title, body, audience, audience_label, channels, status, recipient_count, read_count, author_name, created_at, published_at')
        .order('created_at', { ascending: false }).limit(60),
      supabase.from('conversations')
        .select('id, participant_name, participant_role, subject, last_message, last_at, unread, waiting_hours')
        .order('last_at', { ascending: false }).limit(60),
    ])
    if (a.error) { setError(a.error.message); setLoading(false); return }

    setAnnouncements(((a.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      title: (r.title as string) ?? '',
      body: (r.body as string) ?? '',
      audience: (r.audience as Audience) ?? 'toute_ecole',
      audienceLabel: (r.audience_label as string) ?? '—',
      channels: (r.channels as Channel[]) ?? ['app'],
      status: (r.status as AnnouncementStatus) ?? 'brouillon',
      recipientCount: Number(r.recipient_count ?? 0),
      readCount: Number(r.read_count ?? 0),
      authorName: (r.author_name as string) ?? '—',
      createdAt: r.created_at as string,
      publishedAt: (r.published_at as string) ?? null,
    })))

    setConversations(((c.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      participantName: (r.participant_name as string) ?? '—',
      participantRole: (r.participant_role as string) ?? '—',
      subject: (r.subject as string) ?? '',
      lastMessage: (r.last_message as string) ?? '',
      lastAt: r.last_at as string,
      unread: (r.unread as boolean) ?? false,
      waitingHours: Number(r.waiting_hours ?? 0),
    })))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const publish = useCallback(async (id: string) => {
    setBusyId(id)
    const now = new Date().toISOString()
    if (!PREVIEW_MODE) {
      const { error: e } = await supabase.from('announcements')
        .update({ status: 'publie', published_at: now }).eq('id', id)
      if (e) { setBusyId(null); return { ok: false as const, error: e.message } }
    }
    setAnnouncements((l) => l.map((n) =>
      n.id === id ? { ...n, status: 'publie', publishedAt: now } : n))
    setBusyId(null)
    return { ok: true as const }
  }, [])

  const stats = useMemo(() => ({
    drafts: announcements.filter((a) => a.status === 'brouillon').length,
    published: announcements.filter((a) => a.status === 'publie').length,
    unreadThreads: conversations.filter((c) => c.unread).length,
    /** Deux jours sans réponse : le seuil au-delà duquel un parent rappelle. */
    stale: conversations.filter((c) => c.unread && c.waitingHours >= 48).length,
  }), [announcements, conversations])

  return { announcements, conversations, stats, isLoading, error, busyId, publish, reload: () => void load() }
}

export function readRate(a: Announcement): number {
  return a.recipientCount > 0 ? Math.round((a.readCount / a.recipientCount) * 100) : 0
}
