/**
 * Accueil — Dashboard étudiant
 */
import {
  ScrollView, View, Text, StyleSheet,
  TouchableOpacity, Dimensions, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { BurgerMenu } from '@/components/ui/BurgerMenu'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_SIZE = (SCREEN_W - spacing.lg * 2 - spacing.sm) / 2

// ── Données ───────────────────────────────────────────────────────────────────

const QUICK_STATS = [
  { label: 'Moyenne',   value: '14.2', unit: '/20',     color: colors.primary,  icon: 'trending-up' as const },
  { label: 'Absences',  value: '2',    unit: 'jours',   color: '#F59E0B',       icon: 'time'        as const },
  { label: 'Cours',     value: '6',    unit: '/semaine', color: '#8b5cf6',      icon: 'book'        as const },
  { label: 'Exercices', value: '3',    unit: 'à faire', color: colors.error,    icon: 'pencil'      as const },
]

const QUICK_ACCESS = [
  { label: 'Mes Cours',       sub: '6 cours disponibles',    icon: 'book'   as const, color: '#3b82f6', route: '/(student)/courses'   },
  { label: 'Exercices',       sub: '3 exercices à faire',    icon: 'pencil' as const, color: '#8b5cf6', route: '/(student)/exercises', alert: true },
  { label: 'Frais scolaires', sub: '2 paiements en attente', icon: 'wallet' as const, color: '#ef4444', route: '/(student)/finances',  alert: true },
  { label: 'Mon Bulletin',    sub: 'Moyenne : 14.2/20',      icon: 'star'   as const, color: '#10b981', route: '/(student)/grades'    },
]

const RECENT_COURSES = [
  { subject: 'Mathématiques', title: 'Les Dérivées',     emoji: '📐', progress: 75 },
  { subject: 'Physique',      title: 'Lois de Newton',   emoji: '⚡', progress: 40 },
  { subject: 'Français',      title: 'L\'Argumentation', emoji: '✍️', progress: 90 },
]

const TODAY_SCHEDULE = [
  { time: '08h00', subject: 'Mathématiques', room: 'Salle 12', teacher: 'M. Leblanc',  color: '#3b82f6' },
  { time: '10h00', subject: 'Français',      room: 'Salle 05', teacher: 'Mme Diallo',  color: '#8b5cf6' },
  { time: '14h00', subject: 'SVT',           room: 'Labo 2',   teacher: 'M. Traoré',   color: '#10b981' },
  { time: '16h00', subject: 'Anglais',       room: 'Salle 09', teacher: 'Mme Martin',  color: '#f59e0b' },
]

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { profile } = useAuth()
  const router      = useRouter()

  const fullName  = profile?.displayName ?? 'Élève'
  const initials  = fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const classe    = (profile as any)?.classe ?? '3ème B'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* ── Barre de navigation ──────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <View style={styles.schoolLogo}>
            <Ionicons name="school" size={20} color={colors.white} />
          </View>
          <View>
            <Text style={styles.schoolName}>EduPlatform</Text>
            <Text style={styles.schoolSub}>République du Congo</Text>
          </View>
        </View>
        <View style={styles.topRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.gray[700]} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <BurgerMenu iconColor={colors.gray[700]} />
        </View>
      </View>

      {/* Séparateur */}
      <View style={styles.divider} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Bienvenue ────────────────────────────────── */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.greetingText}>{greeting},</Text>
            <Text style={styles.welcomeName}>{fullName}</Text>
            <View style={styles.classBadge}>
              <Ionicons name="school-outline" size={12} color={colors.primary} />
              <Text style={styles.classBadgeText}>{classe}</Text>
            </View>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        </View>

        {/* ── Alerte frais ─────────────────────────────── */}
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => router.push('/(student)/finances' as any)}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 18 }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Frais scolaires en attente</Text>
            <Text style={styles.alertSub}>Mensualité janvier 2026 non reçue</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.error} />
        </TouchableOpacity>

        {/* ── Stats 2×2 carrés ─────────────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Aperçu</Text>
          <View style={styles.statsGrid}>
            {QUICK_STATS.map((stat) => (
              <View key={stat.label} style={[styles.statCard, { borderTopColor: stat.color }]}>
                <View style={[styles.statIcon, { backgroundColor: stat.color + '18' }]}>
                  <Ionicons name={stat.icon} size={22} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statUnit}>{stat.unit}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Accès rapide ─────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Accès rapide</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACCESS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.quickCard}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIcon, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                  {item.alert && <View style={styles.quickDot} />}
                </View>
                <Text style={styles.quickLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={styles.quickSub} numberOfLines={2}>{item.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Cours récents ────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Derniers cours</Text>
            <TouchableOpacity onPress={() => router.push('/(student)/courses' as any)}>
              <Text style={styles.seeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          {RECENT_COURSES.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={styles.courseCard}
              onPress={() => router.push('/(student)/courses' as any)}
              activeOpacity={0.75}
            >
              <View style={styles.courseEmoji}>
                <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseSubject}>{c.subject}</Text>
                <Text style={styles.courseTitle}>{c.title}</Text>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${c.progress}%` as any }]} />
                </View>
              </View>
              <Text style={styles.coursePct}>{c.progress}%</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Emploi du temps du jour ──────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Aujourd'hui</Text>
          {TODAY_SCHEDULE.map((slot, i) => (
            <View key={i} style={styles.scheduleItem}>
              <Text style={styles.scheduleTime}>{slot.time}</Text>
              <View style={styles.scheduleLine}>
                <View style={[styles.scheduleDot, { backgroundColor: slot.color }]} />
                {i < TODAY_SCHEDULE.length - 1 && <View style={styles.scheduleConnector} />}
              </View>
              <View style={[styles.scheduleCard, { borderLeftColor: slot.color }]}>
                <Text style={styles.scheduleSubject}>{slot.subject}</Text>
                <Text style={styles.scheduleMeta}>{slot.room} · {slot.teacher}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll:    { paddingBottom: 40 },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    backgroundColor: colors.white,
  },
  topLeft:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  schoolLogo: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  schoolName: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  schoolSub:  { fontSize: 10, color: colors.gray[500] },
  topRight:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 8, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 1.5, borderColor: colors.white,
  },
  divider: { height: 1, backgroundColor: colors.gray[100] },

  // Welcome
  welcomeSection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
    borderBottomWidth: 3, borderBottomColor: colors.primary + '20',
  },
  welcomeLeft:   { flex: 1 },
  greetingText:  { fontSize: fontSize.sm, color: colors.gray[500] },
  welcomeName:   { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.gray[900], marginVertical: 4, lineHeight: 30 },
  classBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.full, alignSelf: 'flex-start', marginTop: 4,
  },
  classBadgeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: spacing.md,
    ...shadow.sm,
  },
  avatarInitials: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.white },

  // Alert
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: '#FEF2F2', borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: '#FECACA',
  },
  alertTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.error },
  alertSub:   { fontSize: fontSize.xs, color: '#DC2626', marginTop: 1 },

  // Section
  sectionWrap:  { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.gray[900], marginBottom: spacing.md },
  seeAll:       { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },

  // Stats 2×2
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    width: CARD_SIZE, height: CARD_SIZE,
    backgroundColor: colors.white, borderRadius: radius.xl,
    padding: spacing.md, justifyContent: 'space-between',
    borderTopWidth: 3, ...shadow.sm,
  },
  statIcon:  { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, marginTop: 4 },
  statUnit:  { fontSize: 10, color: colors.gray[400], marginTop: -2 },
  statLabel: { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium },

  // Quick access
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickCard: {
    flex: 1, minWidth: '44%', backgroundColor: colors.white,
    borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'flex-start', gap: 4, ...shadow.sm,
  },
  quickIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  quickDot: {
    position: 'absolute', top: 2, right: 2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.error, borderWidth: 1.5, borderColor: colors.white,
  },
  quickLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900] },
  quickSub:   { fontSize: fontSize.xs, color: colors.gray[500], lineHeight: 15 },

  // Courses
  courseCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm,
  },
  courseEmoji:   { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.gray[50], alignItems: 'center', justifyContent: 'center' },
  courseSubject: { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium },
  courseTitle:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800], marginVertical: 2 },
  progressBg:    { height: 4, backgroundColor: colors.gray[100], borderRadius: radius.full, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  coursePct:     { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary },

  // Schedule
  scheduleItem:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs },
  scheduleTime:     { width: 52, paddingTop: 3, fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium },
  scheduleLine:     { width: 20, alignItems: 'center', marginRight: spacing.sm },
  scheduleDot:      { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  scheduleConnector:{ flex: 1, width: 2, backgroundColor: colors.gray[200], marginTop: 4, minHeight: 28 },
  scheduleCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.sm, marginBottom: spacing.sm,
    borderLeftWidth: 3, ...shadow.sm,
  },
  scheduleSubject: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800] },
  scheduleMeta:    { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
})
