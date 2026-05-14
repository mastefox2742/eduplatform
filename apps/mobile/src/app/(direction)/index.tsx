/**
 * Tableau de bord Direction
 */
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

const STATS = [
  { label: 'Élèves total',    value: '324',  icon: 'people'         as const, color: colors.primary },
  { label: 'Enseignants',     value: '18',   icon: 'school'         as const, color: '#8b5cf6' },
  { label: 'Frais collectés', value: '87%',  icon: 'trending-up'    as const, color: '#10b981' },
  { label: 'Impayés',         value: '42',   icon: 'alert-circle'   as const, color: '#ef4444' },
]

const ALERTS = [
  { type: 'warning', icon: 'warning-outline' as const, color: '#f59e0b', text: '12 élèves ont des frais impayés depuis +30 jours' },
  { type: 'info',    icon: 'information-circle-outline' as const, color: colors.primary, text: 'Réunion des professeurs prévue le 20 mai 2026' },
  { type: 'success', icon: 'checkmark-circle-outline' as const, color: '#10b981', text: 'Bulletins T2 prêts — 198/324 distribués' },
]

const QUICK_ACTIONS = [
  { label: 'Gestion des frais',   icon: 'card-outline'           as const, color: '#3b82f6', route: '/(direction)/fees'     },
  { label: 'Liste des élèves',    icon: 'people-outline'         as const, color: '#8b5cf6', route: '/(direction)/students' },
  { label: 'Envoyer notification',icon: 'notifications-outline'  as const, color: '#f59e0b', route: null },
  { label: 'Rapports',            icon: 'bar-chart-outline'      as const, color: '#10b981', route: null },
]

export default function DirectionHomeScreen() {
  const { profile } = useAuth()
  const router      = useRouter()
  const firstName   = profile?.displayName?.split(' ').pop() ?? 'Directeur'
  const hour        = new Date().getHours()
  const greeting    = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{firstName} 🏫</Text>
          </View>
          <View style={styles.schoolBadge}>
            <Text style={styles.schoolText}>Collège Demo</Text>
          </View>
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

        {/* Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Alertes importantes</Text>
          {ALERTS.map((a, i) => (
            <View key={i} style={[styles.alertCard, { borderLeftColor: a.color }]}>
              <Ionicons name={a.icon} size={18} color={a.color} />
              <Text style={styles.alertText}>{a.text}</Text>
            </View>
          ))}
        </View>

        {/* Financial summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Situation financière</Text>
          <View style={styles.financeCard}>
            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Total attendu</Text>
              <Text style={styles.financeValue}>337 500 000 GNF</Text>
            </View>
            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Reçu</Text>
              <Text style={[styles.financeValue, { color: '#10b981' }]}>293 625 000 GNF</Text>
            </View>
            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Reste à percevoir</Text>
              <Text style={[styles.financeValue, { color: '#ef4444' }]}>43 875 000 GNF</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '87%' }]} />
            </View>
            <Text style={styles.progressText}>87% collectés</Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Actions rapides</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.quickCard}
                onPress={() => item.route ? router.push(item.route as any) : null}
                activeOpacity={0.8}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: '#1e3a5f', paddingHorizontal: spacing.lg,
    paddingTop: spacing.md, paddingBottom: spacing.xl + spacing.lg,
  },
  greeting:    { fontSize: fontSize.base, color: 'rgba(255,255,255,.75)' },
  name:        { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.white },
  schoolBadge: { backgroundColor: 'rgba(255,255,255,.2)', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  schoolText:  { fontSize: fontSize.xs, color: colors.white, fontWeight: fontWeight.medium },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: -spacing.lg, marginBottom: spacing.md },
  statCard:  { flex: 1, minWidth: '44%', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, ...shadow.md },
  statIcon:  { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statVal:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  statLabel: { fontSize: fontSize.xs, color: colors.gray[500], fontWeight: fontWeight.medium, marginTop: 2 },

  section:      { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.gray[900], marginBottom: spacing.md },

  alertCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4, ...shadow.sm },
  alertText: { flex: 1, fontSize: fontSize.sm, color: colors.gray[700], lineHeight: 20 },

  financeCard:  { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, ...shadow.sm },
  financeRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  financeLabel: { fontSize: fontSize.sm, color: colors.gray[600] },
  financeValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[900] },
  progressBar:  { height: 8, backgroundColor: colors.gray[100], borderRadius: 4, marginTop: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 4 },
  progressText: { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 4, textAlign: 'right' },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickCard: { flex: 1, minWidth: '44%', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: spacing.sm, ...shadow.sm },
  quickIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  quickLabel:{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.gray[800], textAlign: 'center' },
})
