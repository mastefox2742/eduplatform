/**
 * Accueil Professeur
 * Dashboard + emploi du temps du jour + accès profil
 */
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

// ─── Demo : emploi du temps d'aujourd'hui ────────────────────────────────────

const TODAY_SLOTS = [
  { time: '07:30', end: '09:00', subject: 'Mathématiques', class: '3ème B', room: 'S.12', done: true  },
  { time: '09:15', end: '10:45', subject: 'Mathématiques', class: '4ème A', room: 'S.08', done: false },
  { time: '11:00', end: '12:30', subject: 'Mathématiques', class: '5ème C', room: 'S.15', done: false },
]

const STATS = [
  { label: 'Élèves',      value: '90',  icon: 'people'       as const, color: colors.primary },
  { label: 'Cours publiés',value: '12', icon: 'book'         as const, color: '#8b5cf6'      },
  { label: 'Soumissions', value: '24',  icon: 'cloud-upload' as const, color: '#10b981'      },
  { label: 'À corriger',  value: '3',   icon: 'alert-circle' as const, color: colors.error   },
]

const RECENT_SUBMISSIONS = [
  { student: 'Aminata Bah',      exercise: 'Dérivées — Ex.1', time: '14h32', score: 72, reviewed: false },
  { student: 'Fatoumata Camara', exercise: 'Dérivées — Ex.1', time: '09h47', score: 58, reviewed: false },
  { student: 'Mamadou Diallo',   exercise: 'Dérivées — Ex.1', time: 'Hier',  score: 95, reviewed: true  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function currentSlotIndex() {
  const now = nowMinutes()
  for (let i = 0; i < TODAY_SLOTS.length; i++) {
    const s = TODAY_SLOTS[i]
    if (now >= timeToMin(s.time) && now < timeToMin(s.end)) return i
  }
  return -1
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TeacherHomeScreen() {
  const { profile } = useAuth()
  const router      = useRouter()
  const firstName   = profile?.displayName?.split(' ').pop() ?? 'Professeur'
  const hour        = new Date().getHours()
  const greeting    = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  const now         = nowMinutes()
  const activeIdx   = currentSlotIndex()

  // Prochain cours
  const nextSlot = TODAY_SLOTS.find(s => timeToMin(s.time) > now)

  const DAY_NAMES = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
  const today = new Date()
  const dayLabel = `${DAY_NAMES[today.getDay()]} ${today.getDate()} mai`

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{firstName} 👨‍🏫</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="notifications-outline" size={20} color={colors.white} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/(teacher)/profile' as any)}
            >
              <Ionicons name="person-circle-outline" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsGrid}>
          {STATS.map(s => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '15' }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Emploi du temps du jour ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Aujourd'hui</Text>
              <Text style={styles.sectionSub}>{dayLabel}</Text>
            </View>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => router.push('/(teacher)/schedule' as any)}
            >
              <Text style={styles.seeAllText}>Semaine →</Text>
            </TouchableOpacity>
          </View>

          {/* Prochain cours highlight */}
          {nextSlot && (
            <View style={styles.nextSlotBanner}>
              <View style={styles.nextSlotLeft}>
                <Text style={styles.nextSlotLabel}>Prochain cours</Text>
                <Text style={styles.nextSlotSubject}>{nextSlot.subject}</Text>
                <Text style={styles.nextSlotMeta}>{nextSlot.class} · Salle {nextSlot.room}</Text>
              </View>
              <View style={styles.nextSlotTime}>
                <Text style={styles.nextSlotHour}>{nextSlot.time}</Text>
                <Text style={styles.nextSlotEnd}>→ {nextSlot.end}</Text>
              </View>
            </View>
          )}

          {/* Timeline */}
          {TODAY_SLOTS.map((slot, i) => {
            const isActive = i === activeIdx
            const isPast   = timeToMin(slot.end) < now
            return (
              <View key={i} style={[styles.slotRow, isActive && styles.slotRowActive]}>
                {/* Time */}
                <View style={styles.slotTimeCol}>
                  <Text style={[styles.slotTime, isPast && styles.slotTimePast, isActive && styles.slotTimeActive]}>
                    {slot.time}
                  </Text>
                  {i < TODAY_SLOTS.length - 1 && <View style={styles.slotConnector} />}
                </View>

                {/* Dot */}
                <View style={[
                  styles.slotDot,
                  isPast   && styles.slotDotPast,
                  isActive && styles.slotDotActive,
                ]} />

                {/* Card */}
                <View style={[
                  styles.slotCard,
                  isPast   && styles.slotCardPast,
                  isActive && styles.slotCardActive,
                ]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.slotSubject, isActive && styles.slotSubjectActive]}>
                      {slot.subject}
                    </Text>
                    <Text style={[styles.slotMeta, isActive && { color: 'rgba(255,255,255,0.8)' }]}>
                      {slot.class} · Salle {slot.room} · {slot.time}–{slot.end}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={styles.liveTag}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>EN COURS</Text>
                    </View>
                  )}
                  {isPast && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.gray[300]} />
                  )}
                </View>
              </View>
            )
          })}

          {TODAY_SLOTS.length === 0 && (
            <View style={styles.freeDay}>
              <Text style={styles.freeDayEmoji}>🎉</Text>
              <Text style={styles.freeDayText}>Journée libre !</Text>
            </View>
          )}
        </View>

        {/* ── Soumissions récentes ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Soumissions récentes</Text>
            <TouchableOpacity onPress={() => router.push('/(teacher)/exercises' as any)}>
              <Text style={styles.seeAllText}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          {RECENT_SUBMISSIONS.map((s, i) => {
            const scoreColor = s.score >= 80 ? colors.success : s.score >= 60 ? '#F59E0B' : colors.error
            return (
              <TouchableOpacity
                key={i}
                style={styles.submissionItem}
                onPress={() => router.push('/(teacher)/exercises' as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.avatarSmall, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={{ fontWeight: fontWeight.bold, color: colors.primary, fontSize: fontSize.sm }}>
                    {s.student.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.submissionStudent}>{s.student}</Text>
                  <Text style={styles.submissionExercise}>{s.exercise} · {s.time}</Text>
                </View>
                <View style={[styles.aiScorePill, { backgroundColor: scoreColor + '15' }]}>
                  <Text style={[styles.aiScoreText, { color: scoreColor }]}>IA {s.score}%</Text>
                </View>
                {!s.reviewed && <View style={styles.unreviewedDot} />}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* ── Actions rapides ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickGrid}>
            {[
              { label: 'Nouveau cours',   icon: 'add-circle-outline'  as const, color: '#3b82f6', route: '/(teacher)/courses'    },
              { label: 'Exercices',       icon: 'pencil-outline'      as const, color: '#8b5cf6', route: '/(teacher)/exercises'  },
              { label: 'Messages',        icon: 'chatbubbles-outline' as const, color: '#10b981', route: '/(teacher)/messages'   },
              { label: 'Bulletins',       icon: 'ribbon-outline'      as const, color: '#f59e0b', route: '/(teacher)/bulletin'   },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.quickCard}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIcon, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl + spacing.lg,
  },
  greeting:    { fontSize: fontSize.base, color: 'rgba(255,255,255,.75)' },
  name:        { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.white },
  headerRight: { flexDirection: 'row', gap: spacing.xs },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.error, borderWidth: 1.5, borderColor: colors.primary,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    paddingHorizontal: spacing.lg, marginTop: -spacing.lg, marginBottom: spacing.md,
  },
  statCard:  { flex: 1, minWidth: '44%', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, ...shadow.md },
  statIcon:  { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statVal:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  statLabel: { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium, marginTop: 2 },

  // Section
  section:       { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  sectionTitle:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.gray[900] },
  sectionSub:    { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 1 },
  seeAllBtn:     { paddingTop: 2 },
  seeAllText:    { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },

  // Next slot banner
  nextSlotBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#eff6ff', borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: '#bfdbfe', marginBottom: spacing.md,
  },
  nextSlotLeft:    { flex: 1 },
  nextSlotLabel:   { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  nextSlotSubject: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900], marginTop: 2 },
  nextSlotMeta:    { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  nextSlotTime:    { alignItems: 'flex-end' },
  nextSlotHour:    { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
  nextSlotEnd:     { fontSize: fontSize.xs, color: colors.gray[400] },

  // Timeline slots
  slotRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 4, minHeight: 56,
  },
  slotRowActive: {},
  slotTimeCol: { width: 44, alignItems: 'center', paddingTop: 4 },
  slotTime: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray[400] },
  slotTimePast: { color: colors.gray[300] },
  slotTimeActive: { color: colors.primary },
  slotConnector: {
    width: 1, flex: 1, backgroundColor: colors.gray[200],
    marginTop: 4, marginBottom: 0, alignSelf: 'center',
    minHeight: 16,
  },
  slotDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.gray[300],
    marginTop: 8, marginHorizontal: spacing.xs,
    borderWidth: 2, borderColor: colors.gray[200],
  },
  slotDotPast:   { backgroundColor: colors.gray[200], borderColor: colors.gray[100] },
  slotDotActive: { backgroundColor: colors.primary, borderColor: '#bfdbfe', width: 12, height: 12, borderRadius: 6, marginTop: 7 },
  slotCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    marginBottom: spacing.xs, ...shadow.sm,
  },
  slotCardPast:    { backgroundColor: colors.gray[50], ...shadow.sm },
  slotCardActive:  { backgroundColor: colors.primary },
  slotSubject:     { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[800] },
  slotSubjectActive: { color: colors.white },
  slotMeta:        { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  liveTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,.25)', borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#86efac' },
  liveText: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.white, letterSpacing: 0.5 },

  // Free day
  freeDay: {
    alignItems: 'center', paddingVertical: spacing.lg,
    backgroundColor: colors.white, borderRadius: radius.lg, ...shadow.sm,
  },
  freeDayEmoji: { fontSize: 32, marginBottom: spacing.xs },
  freeDayText:  { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.gray[500] },

  // Submissions
  submissionItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm,
    gap: spacing.sm, ...shadow.sm,
  },
  avatarSmall:         { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  submissionStudent:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800] },
  submissionExercise:  { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  aiScorePill:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  aiScoreText:         { fontSize: 10, fontWeight: fontWeight.bold },
  unreviewedDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },

  // Quick actions
  quickGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickCard:  { flex: 1, minWidth: '44%', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: spacing.sm, ...shadow.sm },
  quickIcon:  { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.gray[800], textAlign: 'center' },
})
