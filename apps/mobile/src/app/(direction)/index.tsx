/**
 * Tableau de bord direction.
 * Repris de la maquette `design/maquettes/direction---dashboard.html`.
 *
 * Cahier des charges §8.1, §8.3, §19.3.
 *
 * Un directeur ouvre cet écran entre deux rendez-vous, pour savoir
 * s'il doit intervenir. L'écran répond à trois questions dans cet
 * ordre : est-ce que tout va bien ? quels sont mes chiffres ? qu'est-ce
 * qui attend ma décision ?
 *
 * Aucun chiffre n'est inventé : une donnée manquante s'affiche « — »,
 * jamais zéro. Un taux d'assiduité à 0 % parce que l'appel n'a pas
 * encore eu lieu ferait croire à une désertion générale.
 */
import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { colors, spacing, radius, fontSize, fontWeight, fontFamily, shadow } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import {
  useDirectionDashboard, formatCompact, formatRate,
} from '@/hooks/useDirectionDashboard'
import { EmptyState } from '@/components/ui/DesignSystem'

// ── Tons ──────────────────────────────────────────────────────────────────────

const TONE_BG = {
  primary:   'rgba(20,93,160,0.10)',
  secondary: 'rgba(15,118,110,0.10)',
  accent:    'rgba(244,166,42,0.16)',
  danger:    'rgba(194,65,59,0.10)',
} as const

const TONE_FG = {
  primary:   colors.primary,
  secondary: colors.secondary,
  accent:    '#A96A0C',
  danger:    colors.danger,
} as const

type Tone = keyof typeof TONE_BG

// ── Actions rapides ───────────────────────────────────────────────────────────

const QUICK_ACTIONS: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  route: string
  tone: Tone
}[] = [
  { label: 'Valider',    icon: 'checkmark-done-outline', route: '/(direction)/validation',    tone: 'primary' },
  { label: 'Caisse',     icon: 'cash-outline',           route: '/(direction)/caisse',        tone: 'secondary' },
  { label: 'Annonce',    icon: 'megaphone-outline',      route: '/(direction)/announcements', tone: 'accent' },
  { label: 'Paramètres', icon: 'settings-outline',       route: '/(direction)/config',        tone: 'primary' },
]

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function DirectionDashboardScreen() {
  const { profile } = useAuth()
  const {
    kpis, alerts, schoolName, academicYear, periodLabel,
    isLoading, error, pendingCount, isOnline, syncHealth, reload,
  } = useDirectionDashboard()

  const [refreshing, setRefreshing] = useState(false)

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  if (isLoading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.centerText}>Chargement de l’établissement…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.date}>{today.charAt(0).toUpperCase() + today.slice(1)}</Text>
          <Text style={s.greeting} numberOfLines={1}>
            Bonjour, {profile?.displayName ?? 'Direction'}
          </Text>
          <Text style={s.subtitle} numberOfLines={1}>
            {schoolName ?? 'Établissement'}
            {academicYear ? ` · Année ${academicYear}` : ''}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityLabel="Notifications"
          onPress={() => router.push('/(direction)/announcements')}
          style={s.bellBtn}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {kpis.alerts > 0 && <View style={s.bellDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await reload()
              setRefreshing(false)
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Vue d'ensemble ──────────────────────────────────────── */}
        {/* §19.3 : l'état de synchronisation se lit avant les chiffres.
            Un tableau de bord alimenté par des données non synchronisées
            induirait en erreur. */}
        <View style={s.overviewCard}>
          <View style={s.overviewTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.overviewLabel}>Vue d’ensemble</Text>
              <Text style={s.overviewTitle}>
                {pendingCount === 0
                  ? 'Votre établissement est à jour'
                  : `${pendingCount} opération${pendingCount > 1 ? 's' : ''} en attente d’envoi`}
              </Text>
            </View>
            <View style={[s.onlineTag, !isOnline && s.offlineTag]}>
              <Text style={[s.onlineText, !isOnline && { color: colors.mutedText }]}>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </Text>
            </View>
          </View>

          <View style={s.overviewBottom}>
            <View>
              <Text style={s.overviewPct}>{syncHealth} %</Text>
              <Text style={s.overviewSub}>données synchronisées</Text>
            </View>
            <Ionicons
              name={pendingCount === 0 ? 'trending-up-outline' : 'cloud-upload-outline'}
              size={38}
              color="rgba(255,255,255,0.35)"
            />
          </View>
        </View>

        {error && (
          <View style={s.errorBanner}>
            <Ionicons name="close-circle" size={16} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Indicateurs clés ────────────────────────────────────── */}
        <View>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Indicateurs clés</Text>
            <TouchableOpacity onPress={() => router.push('/(direction)/reports')}>
              <Text style={s.sectionAction}>Détails</Text>
            </TouchableOpacity>
          </View>

          <View style={s.kpiGrid}>
            <KpiTile
              icon="people-outline"
              tone="primary"
              value={kpis.students != null ? String(kpis.students) : '—'}
              label="Élèves inscrits"
              onPress={() => router.push('/(direction)/students')}
            />
            <KpiTile
              icon="checkbox-outline"
              tone="secondary"
              value={formatRate(kpis.attendanceRate)}
              label="Assiduité aujourd’hui"
              // Le seul cas où « — » mérite une explication : sans elle,
              // le directeur croit à une panne.
              hint={kpis.attendanceRate == null ? 'Appel non commencé' : undefined}
            />
            <KpiTile
              icon="wallet-outline"
              tone="secondary"
              value={formatCompact(kpis.collectedThisMonth)}
              label="FCFA encaissés ce mois"
              onPress={() => router.push('/(direction)/caisse')}
            />
            <KpiTile
              icon="warning-outline"
              tone={kpis.alerts > 0 ? 'accent' : 'primary'}
              value={String(kpis.alerts)}
              label="Décisions en attente"
              badge={kpis.alerts > 0 ? 'À traiter' : undefined}
              onPress={() => router.push('/(direction)/validation')}
            />
          </View>
        </View>

        {/* ── Actions rapides ─────────────────────────────────────── */}
        <View>
          <Text style={[s.sectionTitle, { marginBottom: spacing.sm + 2 }]}>Actions rapides</Text>
          <View style={s.quickRow}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.label}
                activeOpacity={0.8}
                onPress={() => router.push(a.route as never)}
                style={s.quickBtn}
              >
                <View style={[s.quickIcon, { backgroundColor: TONE_BG[a.tone] }]}>
                  <Ionicons name={a.icon} size={22} color={TONE_FG[a.tone]} />
                </View>
                <Text style={s.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── À ne pas manquer ────────────────────────────────────── */}
        <View>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>À ne pas manquer</Text>
            {alerts.length > 0 && (
              <View style={s.newTag}>
                <Text style={s.newTagText}>
                  {alerts.length} point{alerts.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {alerts.length === 0 ? (
            <EmptyState
              icon="checkmark-done-circle-outline"
              title="Rien ne vous attend"
              detail="Aucune signature, aucun signal en cours. L’établissement tourne."
            />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {alerts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  activeOpacity={0.8}
                  onPress={() => router.push(a.route as never)}
                  style={s.alertRow}
                >
                  <View style={[s.alertIcon, { backgroundColor: TONE_BG[a.tone] }]}>
                    <Ionicons
                      name={a.icon as keyof typeof Ionicons.glyphMap}
                      size={19}
                      color={TONE_FG[a.tone]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.alertTitle} numberOfLines={1}>{a.title}</Text>
                    <Text style={s.alertDetail} numberOfLines={1}>{a.detail}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {periodLabel && (
          <Text style={s.footNote}>
            Période en cours : {periodLabel}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Tuile d'indicateur ────────────────────────────────────────────────────────

function KpiTile({
  icon, tone, value, label, badge, hint, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  tone: Tone
  value: string
  label: string
  badge?: string
  hint?: string
  onPress?: () => void
}) {
  const Wrapper: React.ElementType = onPress ? TouchableOpacity : View
  return (
    <Wrapper activeOpacity={0.8} onPress={onPress} style={s.kpiTile}>
      <View style={s.kpiTop}>
        <View style={[s.kpiIcon, { backgroundColor: TONE_BG[tone] }]}>
          <Ionicons name={icon} size={19} color={TONE_FG[tone]} />
        </View>
        {badge && (
          <View style={s.kpiBadge}>
            <Text style={s.kpiBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={s.kpiValue} numberOfLines={1}>{value}</Text>
      <Text style={s.kpiLabel} numberOfLines={2}>{label}</Text>
      {hint && <Text style={s.kpiHint}>{hint}</Text>}
    </Wrapper>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  centerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.mutedText },

  // En-tête
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm, paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  date: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText },
  greeting: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xl,
    fontWeight: fontWeight.bold, color: colors.text, marginTop: 2,
  },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, marginTop: 2 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute', top: 9, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5, borderColor: colors.surface,
  },

  content: {
    paddingHorizontal: spacing.md + 4,
    paddingBottom: spacing.xl + spacing.lg,
    gap: spacing.md + 2,
  },

  // Vue d'ensemble
  overviewCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadow.md,
  },
  overviewTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: spacing.sm,
  },
  overviewLabel: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  overviewTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.white, marginTop: 2,
  },
  onlineTag: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
  },
  offlineTag: { backgroundColor: 'rgba(255,255,255,0.10)' },
  onlineText: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    fontWeight: fontWeight.bold, color: colors.white,
  },
  overviewBottom: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  overviewPct: {
    fontFamily: fontFamily.heading, fontSize: fontSize['3xl'],
    fontWeight: fontWeight.extrabold, color: colors.white,
  },
  overviewSub: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: 'rgba(255,255,255,0.75)' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(194,65,59,0.08)',
    borderWidth: 1, borderColor: 'rgba(194,65,59,0.25)',
    borderRadius: radius.lg, padding: spacing.sm + 4,
  },
  errorText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger },

  // Sections
  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm + 2,
  },
  sectionTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  sectionAction: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.primary,
  },
  newTag: {
    backgroundColor: 'rgba(194,65,59,0.10)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full,
  },
  newTagText: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    fontWeight: fontWeight.bold, color: colors.danger,
  },

  // KPI
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  kpiTile: {
    width: '47.5%', flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.sm + 6,
    ...shadow.sm,
  },
  kpiTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: spacing.sm,
  },
  kpiIcon: {
    width: 34, height: 34, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  kpiBadge: {
    backgroundColor: 'rgba(244,166,42,0.18)',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.sm,
  },
  kpiBadgeText: {
    fontFamily: fontFamily.bodySemi, fontSize: 10,
    fontWeight: fontWeight.bold, color: '#A96A0C',
  },
  kpiValue: {
    fontFamily: fontFamily.heading, fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extrabold, color: colors.text,
    marginTop: spacing.sm + 2,
  },
  kpiLabel: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, marginTop: 1 },
  kpiHint: {
    fontFamily: fontFamily.body, fontSize: 10,
    color: colors.gray[400], marginTop: 3, fontStyle: 'italic',
  },

  // Actions rapides
  quickRow: { flexDirection: 'row', gap: spacing.sm + 2 },
  quickBtn: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm + 4,
  },
  quickIcon: {
    width: 42, height: 42, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    fontWeight: fontWeight.semibold, color: colors.text,
  },

  // Alertes
  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.sm + 4,
  },
  alertIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  alertTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  alertDetail: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, marginTop: 1 },

  footNote: {
    fontFamily: fontFamily.body, fontSize: 11,
    color: colors.gray[400], textAlign: 'center', marginTop: spacing.sm,
  },
})
