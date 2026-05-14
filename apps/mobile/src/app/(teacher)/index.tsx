/**
 * Accueil Professeur
 */
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

const STATS = [
  { label: 'Élèves',       value: '32',  icon: 'people'        as const, color: colors.primary },
  { label: 'Exercices',    value: '8',   icon: 'pencil'        as const, color: '#8b5cf6' },
  { label: 'Soumissions',  value: '24',  icon: 'cloud-upload'  as const, color: '#10b981' },
  { label: 'À corriger',   value: '3',   icon: 'alert-circle'  as const, color: colors.error },
]

const RECENT_SUBMISSIONS = [
  { student: 'Aminata Bah',      exercise: 'Dérivées — Ex.1', time: '14h32', score: 72, reviewed: false },
  { student: 'Fatoumata Camara', exercise: 'Dérivées — Ex.1', time: '09h47', score: 58, reviewed: false },
  { student: 'Mamadou Diallo',   exercise: 'Dérivées — Ex.1', time: 'Hier',  score: 95, reviewed: true  },
]

export default function TeacherHomeScreen() {
  const { profile } = useAuth()
  const router      = useRouter()
  const firstName   = profile?.displayName?.split(' ').pop() ?? 'Professeur'
  const hour        = new Date().getHours()
  const greeting    = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{firstName} 👨‍🏫</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
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

        {/* Alertes soumissions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Soumissions récentes</Text>
            <TouchableOpacity onPress={() => router.push('/(teacher)/exercises' as any)}>
              <Text style={styles.seeAll}>Voir tout →</Text>
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
                  <Text style={{ fontWeight: fontWeight.bold, color: colors.primary }}>{s.student.charAt(0)}</Text>
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

        {/* Accès rapide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.quickGrid}>
            {[
              { label: 'Nouveau cours',      icon: 'book-outline'   as const, color: '#3b82f6', onPress: () => router.push('/(teacher)/courses' as any) },
              { label: 'Nouvel exercice',    icon: 'pencil-outline' as const, color: '#8b5cf6', onPress: () => router.push('/(teacher)/exercises' as any) },
              { label: 'Corriger copies',    icon: 'checkmark-circle-outline' as const, color: '#10b981', onPress: () => router.push('/(teacher)/exercises' as any) },
              { label: 'Voir mes élèves',    icon: 'people-outline' as const, color: '#f59e0b', onPress: () => {} },
            ].map(item => (
              <TouchableOpacity key={item.label} style={styles.quickCard} onPress={item.onPress}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg,
    paddingTop: spacing.md, paddingBottom: spacing.xl + spacing.lg,
  },
  greeting: { fontSize: fontSize.base, color: 'rgba(255,255,255,.75)' },
  name:     { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.white },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error, borderWidth: 1.5, borderColor: colors.primary },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: -spacing.lg, marginBottom: spacing.md },
  statCard:  { flex: 1, minWidth: '44%', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, ...shadow.md },
  statIcon:  { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statVal:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  statLabel: { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium, marginTop: 2 },

  section:       { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.gray[900], marginBottom: spacing.md },
  seeAll:        { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },

  submissionItem:{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm, ...shadow.sm },
  avatarSmall:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  submissionStudent:{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[800] },
  submissionExercise:{ fontSize: fontSize.xs, color: colors.gray[500], marginTop: 1 },
  aiScorePill:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  aiScoreText:   { fontSize: 10, fontWeight: fontWeight.bold },
  unreviewedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickCard: { flex: 1, minWidth: '44%', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: spacing.sm, ...shadow.sm },
  quickIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  quickLabel:{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.gray[800], textAlign: 'center' },
})
