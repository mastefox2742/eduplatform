import { useState, useEffect, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import { useActiveChild } from '@/hooks/useActiveChild'
import { useBulletins } from '@/hooks/useBulletins'

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = 'notes' | 'absences' | 'emploi' | 'comportement'

// ─── Demo Data ────────────────────────────────────────────────────────────────

const CHILD = {
  name: 'OBAME Kevin',
  class: '3ème B',
  school: 'Collège Saint-Exupéry',
  rank: 8,
  total: 32,
  average: 14.2,
  conduct: 'Très Bien',
  teacher: 'M. NGUEMA Pierre',
  photo: 'OK',
}

const SUBJECTS = [
  { name: 'Mathématiques',      avg: 16.5, coef: 4, trend: 'up',   teacher: 'M. NGUEMA Pierre' },
  { name: 'Français',           avg: 13.0, coef: 4, trend: 'down', teacher: 'Mme ONDO Claire' },
  { name: 'Anglais',            avg: 15.5, coef: 3, trend: 'up',   teacher: 'M. ABENA Paul' },
  { name: 'Sciences Physiques', avg: 12.0, coef: 3, trend: 'same', teacher: 'Mme BIBANG Rose' },
  { name: 'SVT',                avg: 14.0, coef: 2, trend: 'up',   teacher: 'M. MEBALE Jacques' },
  { name: 'Histoire-Géo',       avg: 13.5, coef: 3, trend: 'same', teacher: 'Mme ELLA Marie' },
  { name: 'Philosophie',        avg: 11.0, coef: 2, trend: 'down', teacher: 'M. KOUMBA René' },
  { name: 'EPS',                avg: 17.0, coef: 1, trend: 'up',   teacher: 'M. IKOBEY Serge' },
]

const ABSENCES = [
  { date: '22 mai 2026',  day: 'Vendredi',  subject: 'Mathématiques', type: 'justified',   duration: '2h',  reason: 'Certificat médical' },
  { date: '15 mai 2026',  day: 'Vendredi',  subject: 'Français',      type: 'unjustified', duration: '1h',  reason: '' },
  { date: '8 mai 2026',   day: 'Vendredi',  subject: 'Histoire-Géo',  type: 'justified',   duration: '2h',  reason: 'Convocation médicale' },
  { date: '3 mai 2026',   day: 'Dimanche',  subject: 'EPS',           type: 'unjustified', duration: '2h',  reason: '' },
  { date: '24 avril 2026',day: 'Vendredi',  subject: 'SVT',           type: 'justified',   duration: '1h',  reason: 'Sortie scolaire autorisée' },
]

const SCHEDULE: Record<string, { time: string; subject: string; teacher: string; room: string }[]> = {
  'Lun': [
    { time: '07:30–09:00', subject: 'Mathématiques',      teacher: 'M. NGUEMA',   room: 'S.12' },
    { time: '09:15–10:45', subject: 'Français',           teacher: 'Mme ONDO',    room: 'S.04' },
    { time: '11:00–12:30', subject: 'Histoire-Géo',       teacher: 'Mme ELLA',    room: 'S.09' },
  ],
  'Mar': [
    { time: '07:30–09:00', subject: 'Sciences Physiques', teacher: 'Mme BIBANG',  room: 'Labo' },
    { time: '09:15–10:45', subject: 'Anglais',            teacher: 'M. ABENA',    room: 'S.11' },
    { time: '11:00–12:30', subject: 'EPS',                teacher: 'M. IKOBEY',   room: 'Gym'  },
  ],
  'Mer': [
    { time: '07:30–09:00', subject: 'Mathématiques',      teacher: 'M. NGUEMA',   room: 'S.12' },
    { time: '09:15–10:45', subject: 'SVT',                teacher: 'M. MEBALE',   room: 'Labo' },
  ],
  'Jeu': [
    { time: '07:30–09:00', subject: 'Français',           teacher: 'Mme ONDO',    room: 'S.04' },
    { time: '09:15–10:45', subject: 'Philosophie',        teacher: 'M. KOUMBA',   room: 'S.07' },
    { time: '11:00–12:30', subject: 'Anglais',            teacher: 'M. ABENA',    room: 'S.11' },
  ],
  'Ven': [
    { time: '07:30–09:00', subject: 'Mathématiques',      teacher: 'M. NGUEMA',   room: 'S.12' },
    { time: '09:15–10:45', subject: 'Sciences Physiques', teacher: 'Mme BIBANG',  room: 'Labo' },
    { time: '11:00–12:30', subject: 'Histoire-Géo',       teacher: 'Mme ELLA',    room: 'S.09' },
  ],
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

const CONDUCT_NOTES = [
  { date: 'Mai 2026',   note: 'Excellent comportement en classe, très participatif.', type: 'positive' },
  { date: 'Avril 2026', note: 'Légère inattention lors du cours de philosophie.', type: 'neutral' },
  { date: 'Mars 2026',  note: 'Comportement irréprochable — félicitations !', type: 'positive' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function avgColor(v: number) {
  if (v >= 14) return colors.success
  if (v >= 10) return colors.warning
  return colors.danger
}

function trendIcon(t: string): keyof typeof Ionicons.glyphMap {
  if (t === 'up')   return 'trending-up'
  if (t === 'down') return 'trending-down'
  return 'remove'
}

function trendColor(t: string) {
  if (t === 'up')   return colors.success
  if (t === 'down') return colors.danger
  return colors.gray[400]
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ParentChildScreen() {
  const { user, profile } = useAuth()
  // Utiliser l'enfant actif depuis le sélecteur multi-enfants
  const { activeChild, activeSchoolId } = useActiveChild()

  const schoolId  = activeSchoolId
  const studentId = activeChild?.studentId
    ?? profile?.studentId
    ?? profile?.childId
    ?? (profile?.role === 'student' ? user?.uid : '')
    ?? ''

  const [activeTab, setActiveTab] = useState<TabId>('notes')
  const [selectedDay, setSelectedDay] = useState('Lun')
  const [activeTri, setActiveTri] = useState<'T1' | 'T2' | 'T3'>('T2')

  // ── Bulletins publiés de l'enfant ─────────────────────────────────────────
  const shouldFetch = schoolId !== 'demo' && !!studentId
  const { bulletins } = useBulletins(
    shouldFetch ? schoolId : '',
    { studentId, status: 'published', trimestre: activeTri },
  )

  // Construction dynamique du profil élève depuis les bulletins Firebase
  const fbProfile = useMemo(() => {
    if (bulletins.length === 0) return null

    const subjects = bulletins.map(b => ({
      name:    b.subject,
      avg:     b.average ?? 0,
      coef:    1,             // pas de coeff par matière dans FSBulletin v1
      trend:   'same' as const,
      teacher: b.teacherName ?? b.teacherId,  // nom dénormalisé à la soumission, UID en fallback
    }))
    const totalWeight = subjects.reduce((s, sub) => s + sub.avg * sub.coef, 0)
    const totalCoef   = subjects.reduce((s, sub) => s + sub.coef, 0)
    const overallAvg  = totalCoef > 0 ? totalWeight / totalCoef : null

    const latest = bulletins[0]
    return {
      average:      overallAvg,
      conduct:      latest.conduct,
      appreciation: latest.appreciation,
      className:    latest.className,
      subjects,
    }
  }, [bulletins])

  // Source effective : Firebase si disponible, sinon demo
  const displaySubjects = fbProfile ? fbProfile.subjects : SUBJECTS
  const displayAvg      = fbProfile?.average ?? CHILD.average
  const displayConduct  = fbProfile?.conduct   ?? CHILD.conduct

  const justified   = ABSENCES.filter(a => a.type === 'justified').length
  const unjustified = ABSENCES.filter(a => a.type === 'unjustified').length

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{CHILD.photo}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{CHILD.name}</Text>
          <Text style={styles.headerSub}>{CHILD.class} · {CHILD.school}</Text>
        </View>
        <View style={styles.rankBadge}>
          <Text style={styles.rankNum}>{CHILD.rank}e</Text>
          <Text style={styles.rankSub}>/{CHILD.total}</Text>
        </View>
      </View>

      {/* ── Stats Summary ── */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderTopColor: colors.primary }]}>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{displayAvg.toFixed(1)}/20</Text>
          <Text style={styles.summaryLabel}>Moyenne</Text>
        </View>
        <View style={[styles.summaryCard, { borderTopColor: colors.warning }]}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{ABSENCES.length}j</Text>
          <Text style={styles.summaryLabel}>Absences</Text>
        </View>
        <View style={[styles.summaryCard, { borderTopColor: '#7c3aed' }]}>
          <Text style={[styles.summaryValue, { color: '#7c3aed' }]}>{displayConduct}</Text>
          <Text style={styles.summaryLabel}>Conduite</Text>
        </View>
      </View>

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        {([
          { id: 'notes',       label: 'Notes',    icon: 'stats-chart-outline' },
          { id: 'absences',    label: 'Absences', icon: 'calendar-outline' },
          { id: 'emploi',      label: 'Emploi',   icon: 'time-outline' },
          { id: 'comportement',label: 'Conduite', icon: 'ribbon-outline' },
        ] as { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[]).map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={activeTab === tab.id ? colors.primary : colors.gray[400]}
            />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ══ NOTES ══════════════════════════════════════════════ */}
        {activeTab === 'notes' && (
          <View style={styles.section}>
            {/* Sélecteur de trimestre (toujours visible) */}
            <View style={styles.triRow}>
              {(['T1', 'T2', 'T3'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.triChip, activeTri === t && styles.triChipActive]}
                  onPress={() => setActiveTri(t)}
                >
                  <Text style={[styles.triChipText, activeTri === t && styles.triChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Appréciation bulletin (Firebase uniquement) */}
            {fbProfile?.appreciation ? (
              <View style={styles.appreciationCard}>
                <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                <Text style={styles.appreciationText} numberOfLines={3}>
                  « {fbProfile.appreciation} »
                </Text>
              </View>
            ) : null}

            {/* Notes par matière */}
            {displaySubjects.map(s => (
              <View key={s.name} style={styles.subjectRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{s.name}</Text>
                  <Text style={styles.subjectTeacher}>
                    {s.teacher} · coef {s.coef}
                  </Text>
                </View>
                <Ionicons
                  name={trendIcon((s as any).trend ?? 'same')}
                  size={16}
                  color={trendColor((s as any).trend ?? 'same')}
                  style={{ marginRight: 6 }}
                />
                <View style={[styles.avgBubble, { backgroundColor: avgColor(s.avg) + '18' }]}>
                  <Text style={[styles.avgText, { color: avgColor(s.avg) }]}>
                    {s.avg.toFixed(1)}
                  </Text>
                </View>
              </View>
            ))}

            {/* Message si pas encore de bulletin publié pour ce trimestre */}
            {shouldFetch && bulletins.length === 0 && (
              <View style={styles.emptyBulletin}>
                <Ionicons name="document-outline" size={32} color={colors.gray[300]} />
                <Text style={styles.emptyBulletinText}>
                  Aucun bulletin publié pour le {activeTri}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ══ ABSENCES ══════════════════════════════════════════ */}
        {activeTab === 'absences' && (
          <View style={styles.section}>
            {/* Summary */}
            <View style={styles.absenceStats}>
              <View style={[styles.absStatBox, { backgroundColor: '#fee2e2' }]}>
                <Text style={[styles.absStatNum, { color: colors.danger }]}>{unjustified}</Text>
                <Text style={[styles.absStatLabel, { color: colors.danger }]}>Non justifiées</Text>
              </View>
              <View style={[styles.absStatBox, { backgroundColor: '#e0f2fe' }]}>
                <Text style={[styles.absStatNum, { color: colors.info }]}>{justified}</Text>
                <Text style={[styles.absStatLabel, { color: colors.info }]}>Justifiées</Text>
              </View>
              <View style={[styles.absStatBox, { backgroundColor: colors.gray[100] }]}>
                <Text style={[styles.absStatNum, { color: colors.gray[600] }]}>{ABSENCES.length}</Text>
                <Text style={[styles.absStatLabel, { color: colors.gray[600] }]}>Total</Text>
              </View>
            </View>

            {ABSENCES.map((a, i) => (
              <View key={i} style={styles.absenceCard}>
                <View style={[
                  styles.absenceType,
                  { backgroundColor: a.type === 'justified' ? '#e0f2fe' : '#fee2e2' },
                ]}>
                  <Ionicons
                    name={a.type === 'justified' ? 'document-text' : 'close-circle'}
                    size={16}
                    color={a.type === 'justified' ? colors.info : colors.danger}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.absDate}>{a.date} · {a.duration}</Text>
                  <Text style={styles.absSubject}>{a.subject}</Text>
                  {a.reason ? (
                    <Text style={styles.absReason}>📝 {a.reason}</Text>
                  ) : (
                    <Text style={[styles.absReason, { color: colors.danger }]}>⚠️ Non justifiée</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ══ EMPLOI DU TEMPS ══════════════════════════════════ */}
        {activeTab === 'emploi' && (
          <View style={styles.section}>
            {/* Day Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayStrip}
            >
              {DAYS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayChip, selectedDay === d && styles.dayChipActive]}
                  onPress={() => setSelectedDay(d)}
                >
                  <Text style={[styles.dayChipText, selectedDay === d && styles.dayChipTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {(SCHEDULE[selectedDay] ?? []).map((slot, i) => (
              <View key={i} style={styles.slotCard}>
                <View style={styles.slotTime}>
                  <Text style={styles.slotTimeText}>{slot.time.split('–')[0]}</Text>
                  <View style={styles.slotLine} />
                  <Text style={styles.slotTimeText}>{slot.time.split('–')[1]}</Text>
                </View>
                <View style={styles.slotBody}>
                  <Text style={styles.slotSubject}>{slot.subject}</Text>
                  <Text style={styles.slotMeta}>{slot.teacher} · {slot.room}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ══ COMPORTEMENT ══════════════════════════════════════ */}
        {activeTab === 'comportement' && (
          <View style={styles.section}>
            <View style={styles.conductSummary}>
              <Text style={styles.conductEmoji}>⭐</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.conductTitle}>Conduite générale : {displayConduct}</Text>
                <Text style={styles.conductSub}>Professeur principal : {CHILD.teacher}</Text>
              </View>
            </View>

            {CONDUCT_NOTES.map((n, i) => (
              <View key={i} style={[
                styles.conductCard,
                { borderLeftColor: n.type === 'positive' ? colors.success : n.type === 'neutral' ? colors.warning : colors.danger },
              ]}>
                <Text style={styles.conductDate}>{n.date}</Text>
                <Text style={styles.conductNote}>{n.note}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerAvatar: {
    width: 46, height: 46, borderRadius: radius.full,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.primary },
  headerName: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  headerSub:  { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 1 },
  rankBadge: {
    alignItems: 'center', backgroundColor: '#fef3c7',
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.md,
  },
  rankNum: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#d97706' },
  rankSub: { fontSize: 10, color: '#d97706' },

  // Summary
  summaryRow: {
    flexDirection: 'row', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  summaryCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.xs,
    borderTopWidth: 2, borderRadius: radius.sm,
  },
  summaryValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  summaryLabel: { fontSize: 10, color: colors.gray[500], marginTop: 1 },

  // Tab Bar
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 3, paddingVertical: 10,
  },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabLabel: { fontSize: 11, color: colors.gray[400], fontWeight: fontWeight.medium },
  tabLabelActive: { color: colors.primary, fontWeight: fontWeight.bold },

  // Section
  section: { padding: spacing.md, gap: spacing.sm },

  // Trimestre selector (Notes tab)
  triRow: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' },
  triChip: {
    paddingHorizontal: 18, paddingVertical: 5, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  triChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  triChipText:       { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[600] },
  triChipTextActive: { color: colors.white },

  // Appreciation card
  appreciationCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    backgroundColor: '#eff6ff', borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  appreciationText: {
    flex: 1, fontSize: fontSize.xs, color: colors.primary,
    fontStyle: 'italic', lineHeight: 18,
  },

  // Empty state
  emptyBulletin: {
    alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm,
  },
  emptyBulletinText: { fontSize: fontSize.sm, color: colors.gray[400], textAlign: 'center' },

  // Notes Tab
  subjectRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    ...shadow.sm,
  },
  subjectName:    { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800] },
  subjectTeacher: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  avgBubble: {
    width: 52, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  avgText: { fontSize: fontSize.base, fontWeight: fontWeight.bold },

  // Absences Tab
  absenceStats: { flexDirection: 'row', gap: spacing.xs },
  absStatBox: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md,
  },
  absStatNum:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  absStatLabel: { fontSize: 10, fontWeight: fontWeight.medium, marginTop: 2 },
  absenceCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, ...shadow.sm,
  },
  absenceType: {
    width: 34, height: 34, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  absDate:    { fontSize: fontSize.xs, color: colors.gray[500] },
  absSubject: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800], marginTop: 1 },
  absReason:  { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },

  // Schedule Tab
  dayStrip: { gap: spacing.xs, paddingBottom: spacing.sm },
  dayChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[600] },
  dayChipTextActive: { color: colors.white },
  slotCard: {
    flexDirection: 'row', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, ...shadow.sm,
  },
  slotTime: { alignItems: 'center', width: 52 },
  slotTimeText: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.primary },
  slotLine: { width: 1, flex: 1, backgroundColor: colors.primary + '40', marginVertical: 3 },
  slotBody: { flex: 1, justifyContent: 'center' },
  slotSubject: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[800] },
  slotMeta:    { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },

  // Conduct Tab
  conductSummary: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: '#fef3c7', borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: '#fde68a',
  },
  conductEmoji: { fontSize: 28 },
  conductTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#92400e' },
  conductSub:   { fontSize: fontSize.xs, color: '#b45309', marginTop: 2 },
  conductCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderLeftWidth: 3, ...shadow.sm,
  },
  conductDate: { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.semibold },
  conductNote: { fontSize: fontSize.sm, color: colors.gray[700], marginTop: 4, lineHeight: 20 },
})
