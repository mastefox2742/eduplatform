/**
 * Devoirs & Check-list — Élève
 * Vue de tous les devoirs à rendre, avec check interactive
 * Pièces jointes + consignes audio du prof
 * XP gagné quand devoir coché → badge "Élève sérieux"
 */
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { httpsCallable } from 'firebase/functions'
import {
  collection, query, where, orderBy, onSnapshot,
  doc, setDoc, serverTimestamp,
} from 'firebase/firestore'
import { db, functions } from '@/config/firebase'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Devoir {
  id:           string
  subjectName:  string
  title:        string
  description:  string
  dueDate:      string
  dueTime?:     string
  teacherName:  string
  points:       number
  attachments:  string[]
  done:         boolean
}

// ── Cloud Function ─────────────────────────────────────────────────────────────
const awardXPCF = httpsCallable(functions, 'checkAndAwardBadges')

const SUBJECT_COLORS: Record<string, string> = {
  'Mathématiques': '#2563EB', 'Français': '#7C3AED', 'Histoire-Géo': '#D97706',
  'Sciences': '#059669', 'Anglais': '#DC2626', 'Physique-Chimie': '#0891B2',
}

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

export default function DevoirsScreen() {
  const { user, profile } = useAuth()
  const schoolId  = profile?.schoolId   ?? 'demo'
  const studentId = user?.uid           ?? ''
  const classId   = (profile as any)?.classId ?? ''

  const [devoirs,  setDevoirs]  = useState<Devoir[]>([])
  const [loading,  setLoading]  = useState(true)
  const [checking, setChecking] = useState<string | null>(null)

  useEffect(() => {
    if (schoolId === 'demo' || !classId) {
      setDevoirs(DEMO_DEVOIRS)
      setLoading(false)
      return
    }

    // 1. Charger les devoirs de la classe
    const qDevoirs = query(
      collection(db, 'schools', schoolId, 'devoirs'),
      where('classId', '==', classId),
      orderBy('dueDate'),
    )

    return onSnapshot(qDevoirs, async snap => {
      const devoirsRaw = snap.docs.map(d => ({ id: d.id, ...d.data() } as Omit<Devoir, 'done'>))

      // 2. Charger les soumissions de l'élève
      const subSnap = await import('firebase/firestore').then(fb =>
        fb.getDocs(fb.query(
          fb.collection(db, 'schools', schoolId, 'devoirSubmissions'),
          fb.where('studentId', '==', studentId),
        ))
      )
      const doneIds = new Set(subSnap.docs.map(d => d.data().devoirId as string))

      setDevoirs(devoirsRaw.map(d => ({ ...d, done: doneIds.has(d.id), attachments: d.attachments ?? [] })))
      setLoading(false)
    })
  }, [schoolId, classId, studentId])

  const handleCheck = useCallback(async (devoir: Devoir) => {
    if (devoir.done) return
    setChecking(devoir.id)
    try {
      // Enregistrer la soumission
      if (schoolId !== 'demo') {
        await setDoc(
          doc(db, 'schools', schoolId, 'devoirSubmissions', `${devoir.id}_${studentId}`),
          { devoirId: devoir.id, studentId, status: 'done', checkedAt: serverTimestamp(), createdAt: serverTimestamp() },
          { merge: true }
        )
        // Ajouter XP
        await awardXPCF({ schoolId, studentId, event: 'homework_done', metadata: { devoirId: devoir.id } })
      }

      setDevoirs(prev => prev.map(d => d.id === devoir.id ? { ...d, done: true } : d))
      Alert.alert('✅ Bravo !', `Devoir "${devoir.title}" marqué comme fait. +10 XP 🎉`)
    } catch (e: any) {
      Alert.alert('Erreur', e?.message)
    } finally {
      setChecking(null)
    }
  }, [schoolId, studentId])

  const pending = devoirs.filter(d => !d.done)
  const done    = devoirs.filter(d =>  d.done)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes devoirs</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{pending.length} à faire</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* À faire */}
            {pending.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>À rendre</Text>
                {pending.map(d => <DevoirCard key={d.id} devoir={d} checking={checking} onCheck={handleCheck} />)}
              </>
            )}

            {/* Faits */}
            {done.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.gray[400], marginTop: spacing.lg }]}>Faits ✓</Text>
                {done.map(d => <DevoirCard key={d.id} devoir={d} checking={checking} onCheck={handleCheck} />)}
              </>
            )}

            {devoirs.length === 0 && (
              <View style={styles.empty}>
                <Text style={{ fontSize: 48 }}>📚</Text>
                <Text style={styles.emptyText}>Aucun devoir en cours — profites-en pour réviser !</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function DevoirCard({ devoir, checking, onCheck }: { devoir: Devoir; checking: string | null; onCheck: (d: Devoir) => void }) {
  const days     = daysUntil(devoir.dueDate)
  const isLate   = days < 0
  const isUrgent = days >= 0 && days <= 1
  const subColor = SUBJECT_COLORS[devoir.subjectName] ?? colors.primary

  const urgencyColor = isLate ? '#DC2626' : isUrgent ? '#F59E0B' : '#059669'
  const urgencyLabel = isLate ? 'En retard' : days === 0 ? "Aujourd'hui" : days === 1 ? 'Demain' : `Dans ${days} j`

  return (
    <View style={[styles.card, devoir.done && styles.cardDone, { borderLeftColor: subColor }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.cardSubjectRow}>
            <View style={[styles.subjectDot, { backgroundColor: subColor }]} />
            <Text style={styles.subjectName}>{devoir.subjectName}</Text>
            <View style={[styles.urgencyChip, { backgroundColor: urgencyColor + '15' }]}>
              <Text style={[styles.urgencyText, { color: urgencyColor }]}>{urgencyLabel}</Text>
            </View>
          </View>
          <Text style={[styles.cardTitle, devoir.done && styles.cardTitleDone]}>{devoir.title}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{devoir.description}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkBtn, devoir.done && styles.checkBtnDone]}
          onPress={() => onCheck(devoir)}
          disabled={devoir.done || checking === devoir.id}
        >
          {checking === devoir.id
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name={devoir.done ? 'checkmark' : 'checkmark-circle-outline'} size={22} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>
          📅 {devoir.dueDate}{devoir.dueTime ? ` à ${devoir.dueTime}` : ''} · {devoir.teacherName}
        </Text>
        {devoir.points > 0 && <Text style={styles.cardPoints}>{devoir.points} pts</Text>}
        {devoir.attachments?.length > 0 && (
          <TouchableOpacity onPress={() => Linking.openURL(devoir.attachments[0])}>
            <Text style={styles.attachLink}>📎 Pièce jointe</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const DEMO_DEVOIRS: Devoir[] = [
  { id: 'd1', subjectName: 'Mathématiques', title: 'Exercices page 42', description: 'Faire les exercices 3, 4 et 5 sur les équations du 2nd degré', dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], dueTime: '08:00', teacherName: 'M. Leblanc', points: 20, attachments: [], done: false },
  { id: 'd2', subjectName: 'Français',      title: 'Résumé du chapitre 3', description: 'Rédiger un résumé de 15 lignes du chapitre 3 de "L\'Enfant Noir"', dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], teacherName: 'Mme Konan', points: 15, attachments: [], done: false },
  { id: 'd3', subjectName: 'Histoire-Géo',  title: 'Carte de l\'Afrique', description: 'Apprendre les capitales des pays d\'Afrique de l\'Ouest', dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], teacherName: 'M. Diop', points: 10, attachments: [], done: false },
  { id: 'd4', subjectName: 'Sciences',      title: 'TP Photosynthèse', description: 'Rédiger le compte-rendu du TP de la semaine dernière', dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], teacherName: 'Mme Sow', points: 20, attachments: [], done: true },
]

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.gray[50] },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  headerTitle:    { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerBadge:    { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full },
  headerBadgeText:{ color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },
  list:           { padding: spacing.md, paddingBottom: 40 },
  sectionTitle:   { fontSize: fontSize.sm, fontWeight: '700', color: colors.gray[600], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  card:           { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4, ...shadow.sm },
  cardDone:       { opacity: 0.6 },
  cardTop:        { flexDirection: 'row', gap: spacing.sm, marginBottom: 8 },
  cardSubjectRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  subjectDot:     { width: 8, height: 8, borderRadius: 4 },
  subjectName:    { fontSize: fontSize.xs, fontWeight: '600', color: colors.gray[500] },
  urgencyChip:    { paddingHorizontal: 7, paddingVertical: 1, borderRadius: radius.full },
  urgencyText:    { fontSize: 10, fontWeight: '700' },
  cardTitle:      { fontSize: fontSize.md, fontWeight: '700', color: colors.gray[900], marginBottom: 2 },
  cardTitleDone:  { textDecorationLine: 'line-through', color: colors.gray[400] },
  cardDesc:       { fontSize: fontSize.sm, color: colors.gray[500] },
  checkBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  checkBtnDone:   { backgroundColor: '#059669' },
  cardFooter:     { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  cardMeta:       { fontSize: fontSize.xs, color: colors.gray[400], flex: 1 },
  cardPoints:     { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
  attachLink:     { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  empty:          { alignItems: 'center', marginTop: 60, gap: 12, paddingHorizontal: spacing.xl },
  emptyText:      { fontSize: fontSize.md, color: colors.gray[400], textAlign: 'center' },
})
