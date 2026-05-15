/**
 * Accueil — Dashboard étudiant
 * Vue globale avec accès rapide aux sections principales
 */
import {
  ScrollView, View, Text, StyleSheet,
  TouchableOpacity, Modal, Dimensions, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_SIZE = (SCREEN_W - spacing.lg * 2 - spacing.sm) / 2

const QUICK_STATS = [
  { label: 'Moyenne',   value: '14.2', unit: '/20',    color: colors.primary,  icon: 'trending-up' as const },
  { label: 'Absences',  value: '2',    unit: 'jours',  color: '#F59E0B',       icon: 'time'        as const },
  { label: 'Cours',     value: '6',    unit: '/sem',   color: '#8b5cf6',       icon: 'book'        as const },
  { label: 'Exercices', value: '3',    unit: 'à faire',color: colors.error,    icon: 'pencil'      as const },
]

const TODAY_SCHEDULE = [
  { time: '08h00', subject: 'Mathématiques', room: 'Salle 12', teacher: 'M. Leblanc',  color: '#3b82f6' },
  { time: '10h00', subject: 'Français',      room: 'Salle 05', teacher: 'Mme Diallo',  color: '#8b5cf6' },
  { time: '14h00', subject: 'SVT',           room: 'Labo 2',   teacher: 'M. Traoré',   color: '#10b981' },
  { time: '16h00', subject: 'Anglais',       room: 'Salle 09', teacher: 'Mme Martin',  color: '#f59e0b' },
]

const QUICK_ACCESS = [
  { label: 'Mes Cours',       sub: '6 cours disponibles',    icon: 'book'    as const, color: '#3b82f6', route: '/(student)/courses',   alert: false },
  { label: 'Exercices',       sub: '3 exercices à faire',    icon: 'pencil'  as const, color: '#8b5cf6', route: '/(student)/exercises',  alert: true  },
  { label: 'Frais scolaires', sub: '2 paiements en attente', icon: 'wallet'  as const, color: '#ef4444', route: '/(student)/finances',   alert: true  },
  { label: 'Fournitures',     sub: '7/17 articles acquis',   icon: 'bag'     as const, color: '#10b981', route: '/(student)/finances',   alert: false },
]

const RECENT_COURSES = [
  { subject: 'Mathématiques', title: 'Les Dérivées',      emoji: '📐', progress: 75 },
  { subject: 'Physique',      title: 'Lois de Newton',    emoji: '⚡', progress: 40 },
  { subject: 'Français',      title: 'L\'Argumentation',  emoji: '✍️', progress: 90 },
]

const MENU_ITEMS = [
  { label: 'Accueil',          icon: 'home'           as const, route: '/(student)/'          },
  { label: 'Cours',            icon: 'book'           as const, route: '/(student)/courses'   },
  { label: 'Exercices',        icon: 'pencil'         as const, route: '/(student)/exercises' },
  { label: 'Finances',         icon: 'wallet'         as const, route: '/(student)/finances'  },
  { label: 'Profil',           icon: 'person'         as const, route: '/(student)/profile'   },
  { label: 'Notes',            icon: 'star'           as const, route: '/(student)/grades'    },
  { label: 'Absences',         icon: 'time'           as const, route: '/(student)/absences'  },
  { label: 'Emploi du temps',  icon: 'calendar'       as const, route: '/(student)/schedule'  },
]

export default function HomeScreen() {
  const { profile } = useAuth()
  const router      = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const firstName = profile?.displayName?.split(' ')[0] ?? 'Élève'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Burger Menu Modal ─────────────────────────── */}
      <Modal visible={menuOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.drawer} onPress={() => {}}>
            {/* Drawer header */}
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerTitle}>Menu</Text>
                <Text style={styles.drawerSub}>{firstName}</Text>
              </View>
              <TouchableOpacity style={styles.drawerClose} onPress={() => setMenuOpen(false)}>
                <Ionicons name="close" size={22} color={colors.gray[600]} />
              </TouchableOpacity>
            </View>

            {/* Nav items */}
            {MENU_ITEMS.map(item => (
              <TouchableOpacity
                key={item.route}
                style={styles.drawerItem}
                onPress={() => { setMenuOpen(false); router.push(item.route as any) }}
                activeOpacity={0.7}
              >
                <View style={styles.drawerItemIcon}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <Text style={styles.drawerItemLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.gray[300]} />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ───────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{firstName} 👋</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.aiBtn}>
              <Text style={{ fontSize: 18 }}>🤖</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={22} color={colors.white} />
              <View style={styles.notifBadge} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
              <Ionicons name="menu" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stats rapides (carré 2×2) ──────────────── */}
        <View style={styles.statsGrid}>
          {QUICK_STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                <Ionicons name={stat.icon} size={22} color={stat.color} />
              </View>
              <Text style={styles.statValue}>
                {stat.value}
                <Text style={styles.statUnit}> {stat.unit}</Text>
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Accès rapide ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accès rapide</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACCESS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.quickCard}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIconBg, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                  {item.alert && <View style={styles.quickAlert} />}
                </View>
                <Text style={styles.quickLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={styles.quickSub} numberOfLines={2}>{item.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Alerte frais ──────────────────────────── */}
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => router.push('/(student)/finances' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.alertBannerIcon}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertBannerTitle}>Frais scolaires en attente</Text>
            <Text style={styles.alertBannerSub}>La mensualité de janvier 2026 n'a pas été reçue. Contactez la direction.</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.error} />
        </TouchableOpacity>

        {/* ── Cours récents ────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Derniers cours</Text>
            <TouchableOpacity onPress={() => router.push('/(student)/courses' as any)}>
              <Text style={styles.seeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          {RECENT_COURSES.map((course, i) => (
            <TouchableOpacity
              key={i}
              style={styles.courseCard}
              onPress={() => router.push('/(student)/courses' as any)}
              activeOpacity={0.75}
            >
              <View style={styles.courseEmoji}>
                <Text style={{ fontSize: 22 }}>{course.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseSubject}>{course.subject}</Text>
                <Text style={styles.courseTitle}>{course.title}</Text>
                <View style={styles.courseProgressBg}>
                  <View style={[styles.courseProgressFill, { width: `${course.progress}%` as any }]} />
                </View>
              </View>
              <Text style={styles.coursePct}>{course.progress}%</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Emploi du temps du jour ──────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aujourd'hui</Text>
          </View>
          {TODAY_SCHEDULE.map((slot, i) => (
            <View key={i} style={styles.scheduleItem}>
              <View style={styles.scheduleTime}>
                <Text style={styles.scheduleTimeText}>{slot.time}</Text>
              </View>
              <View style={styles.scheduleLine}>
                <View style={[styles.scheduleDot, { backgroundColor: slot.color }]} />
                {i < TODAY_SCHEDULE.length - 1 && <View style={styles.scheduleConnector} />}
              </View>
              <View style={[styles.scheduleContent, { borderLeftColor: slot.color }]}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingBottom: 40 },

  // Header
  header: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'flex-start',
    backgroundColor:  colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop:       spacing.md,
    paddingBottom:    spacing.xl + spacing.lg,
  },
  greeting: { fontSize: fontSize.base, color: 'rgba(255,255,255,0.75)' },
  name:     { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.white },
  headerRight: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  aiBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5, borderColor: colors.primary,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Burger drawer
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end', flexDirection: 'row',
  },
  drawer: {
    width: '75%', height: '100%',
    backgroundColor: colors.white,
    paddingTop: 56, paddingBottom: 40,
    paddingHorizontal: spacing.lg,
    ...shadow.md,
  },
  drawerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.xl, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  drawerTitle:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  drawerSub:    { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 2 },
  drawerClose:  { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray[100], alignItems: 'center', justifyContent: 'center' },
  drawerItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.gray[50],
  },
  drawerItemIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primary + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  drawerItemLabel: { flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.gray[800] },

  // Stats carré 2×2
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.lg, marginBottom: spacing.md,
  },
  statCard: {
    width: CARD_SIZE, height: CARD_SIZE,
    backgroundColor: colors.white,
    borderRadius: radius.xl, padding: spacing.md,
    justifyContent: 'space-between',
    ...shadow.md,
  },
  statIcon: {
    width: 42, height: 42, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.gray[900], marginTop: 4 },
  statUnit:  { fontSize: fontSize.xs, fontWeight: fontWeight.normal, color: colors.gray[500] },
  statLabel: { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium },

  // Section
  section:       { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.gray[900], marginBottom: spacing.md },
  seeAll:        { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },

  // Quick Access Grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickCard: {
    flex: 1, minWidth: '44%', backgroundColor: colors.white,
    borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'flex-start', gap: 4, ...shadow.sm,
  },
  quickIconBg: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  quickAlert: {
    position: 'absolute', top: 2, right: 2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.error, borderWidth: 1.5, borderColor: colors.white,
  },
  quickLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900] },
  quickSub:   { fontSize: fontSize.xs, color: colors.gray[500], lineHeight: 15 },

  // Alert banner
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    backgroundColor: '#FEF2F2', borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: '#FECACA',
  },
  alertBannerIcon:  { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  alertBannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.error },
  alertBannerSub:   { fontSize: fontSize.xs, color: '#DC2626', marginTop: 2, lineHeight: 16 },

  // Recent courses
  courseCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm,
  },
  courseEmoji: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.gray[50],
    alignItems: 'center', justifyContent: 'center',
  },
  courseSubject: { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium },
  courseTitle:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800], marginVertical: 2 },
  courseProgressBg:   { height: 4, backgroundColor: colors.gray[100], borderRadius: radius.full, overflow: 'hidden' },
  courseProgressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  coursePct: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary },

  // Schedule
  scheduleItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs },
  scheduleTime: { width: 52, paddingTop: 2 },
  scheduleTimeText: { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium },
  scheduleLine: { width: 20, alignItems: 'center', marginRight: spacing.sm },
  scheduleDot:  { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  scheduleConnector: {
    flex: 1, width: 2, backgroundColor: colors.gray[200],
    marginTop: 4, minHeight: 28,
  },
  scheduleContent: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.sm, marginBottom: spacing.sm,
    borderLeftWidth: 3, ...shadow.sm,
  },
  scheduleSubject: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800] },
  scheduleMeta:    { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
})
