/**
 * Accueil parent.
 * Repris de la maquette `design/maquettes/parent---dashboard.html`.
 *
 * Cahier des charges §16.1, §16.2, §16.3, §26.
 *
 * Le parent veut savoir trois choses : mon enfant travaille-t-il bien,
 * est-il assidu, et est-ce que je dois de l'argent. L'écran répond
 * dans cet ordre, et met le solde en tête quand il y en a un — c'est
 * ce qui déclenche l'action.
 *
 * Le sélecteur d'enfant n'est pas cosmétique : il matérialise
 * `is_my_child()`. Un parent ne bascule qu'entre les enfants auxquels
 * il est explicitement rattaché (§26).
 */
import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { colors, spacing, radius, fontSize, fontWeight, fontFamily, shadow } from '@/theme'
import { useParentDashboard } from '@/hooks/useParentDashboard'
import { formatAmount } from '@/hooks/useInvoicePayment'
import { subjectTag, dueLabel } from '@/hooks/useStudentDashboard'
import { EmptyState } from '@/components/ui/DesignSystem'
import { BottomNav, PARENT_TABS } from '@/components/ui/BottomNav'

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function ParentHomeScreen() {
  const {
    children, activeChild, hasMultiple, setActive,
    average, averageTrend, rank, classSize, periodLabel,
    attendanceRate, unjustifiedAbsences, lateCount,
    dues, totalDue, upcoming, grades,
    bulletinAvailable, isLoading, error, reload,
  } = useParentDashboard()

  const [refreshing, setRefreshing] = useState(false)

  const nextDue = dues[0] ?? null

  if (isLoading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.centerText}>Chargement du suivi…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!activeChild) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <EmptyState
          icon="school-outline"
          title="Aucun enfant rattaché"
          detail="Votre compte n’est rattaché à aucun élève. Contactez le secrétariat de l’établissement."
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* ── Sélecteur d'enfant ──────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.headerLabel}>
          {hasMultiple ? 'Sélectionnez votre enfant' : 'Espace Parent'}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.childRail}
        >
          {children.map((c) => {
            const active = c.studentId === activeChild.studentId
            return (
              <TouchableOpacity
                key={c.studentId}
                activeOpacity={0.85}
                onPress={() => void setActive(c.studentId)}
                style={[s.childCard, active && s.childCardActive]}
              >
                {c.photoUrl ? (
                  <Image source={{ uri: c.photoUrl }} style={s.childAvatar} />
                ) : (
                  <View style={[s.childAvatar, s.childAvatarFallback]}>
                    <Text style={[s.childInitials, active && { color: colors.white }]}>
                      {initials(c.name)}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[s.childName, active && { color: colors.white }]}
                    numberOfLines={1}
                  >
                    {c.name}
                  </Text>
                  <Text
                    style={[s.childClass, active && { color: 'rgba(255,255,255,0.85)' }]}
                    numberOfLines={1}
                  >
                    {c.className || c.levelName || '—'}
                    {periodLabel && active ? ` · ${periodLabel}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
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
        {error && (
          <View style={s.errorBanner}>
            <Ionicons name="close-circle" size={16} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Solde à régler ──────────────────────────────────────── */}
        {/* En tête quand il y en a un : c'est ce qui déclenche l'action. */}
        {nextDue && (
          <View style={[s.dueCard, nextDue.isOverdue && s.dueCardOverdue]}>
            <View style={s.dueTop}>
              <View style={s.dueTag}>
                <Text style={s.dueTagText}>
                  {nextDue.isOverdue
                    ? `En retard de ${Math.abs(nextDue.daysLeft)}j`
                    : `Échéance ${shortDate(nextDue.dueDate)}`}
                </Text>
              </View>
              <Ionicons name="wallet-outline" size={20} color="rgba(255,255,255,0.6)" />
            </View>

            <Text style={s.dueTitle}>Frais de scolarité en attente</Text>
            <Text style={s.dueSub} numberOfLines={1}>
              {activeChild.name} · {nextDue.label ?? 'Scolarité'}
            </Text>

            <View style={s.dueBottom}>
              <View>
                <Text style={s.dueAmountLabel}>Reste à payer</Text>
                <Text style={s.dueAmount}>
                  {formatAmount(totalDue, nextDue.currency)}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  router.push(`/(parent)/paiement?installmentId=${nextDue.id}` as never)
                }
                style={s.dueBtn}
              >
                <Text style={s.dueBtnText}>Payer</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.dueMethods}>MTN MoMo, Airtel Money, CinetPay</Text>
          </View>
        )}

        {/* ── Situation académique ────────────────────────────────── */}
        <View>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Situation académique & assiduité</Text>
            {periodLabel && <Text style={s.periodTag}>{periodLabel}</Text>}
          </View>

          {average == null ? (
            <View style={s.pendingCard}>
              <Ionicons name="hourglass-outline" size={18} color={colors.mutedText} />
              <Text style={s.pendingText}>
                Les résultats seront visibles dès la publication du bulletin
                par la direction.
              </Text>
            </View>
          ) : (
            <View style={s.statRow}>
              <View style={s.statCard}>
                <View style={s.statTop}>
                  <Text style={s.statValue}>{average.toFixed(2)}</Text>
                  <Text style={s.statMax}>/20</Text>
                  {averageTrend != null && averageTrend !== 0 && (
                    <Text
                      style={[
                        s.trend,
                        { color: averageTrend > 0 ? colors.secondary : colors.danger },
                      ]}
                    >
                      {averageTrend > 0 ? '+' : ''}{averageTrend.toFixed(1)}
                    </Text>
                  )}
                </View>
                <Text style={s.statLabel}>Moyenne générale</Text>
              </View>

              {rank != null && classSize != null && (
                <View style={s.statCard}>
                  <View style={s.statTop}>
                    <Text style={s.statValue}>{rank}</Text>
                    <Text style={s.statMax}>e</Text>
                  </View>
                  <Text style={s.statLabel}>Rang · sur {classSize}</Text>
                </View>
              )}
            </View>
          )}

          <View style={s.attendanceCard}>
            <View style={s.attendanceLeft}>
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color={attendanceRate != null && attendanceRate >= 90
                  ? colors.secondary : '#A96A0C'}
              />
              <Text style={s.attendanceMain}>
                {attendanceRate != null ? `Assiduité ${attendanceRate} %` : 'Assiduité à venir'}
              </Text>
            </View>
            <Text style={s.attendanceDetail}>
              {unjustifiedAbsences} non just. · {lateCount} retard{lateCount > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* ── Devoirs à venir ─────────────────────────────────────── */}
        <View>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Devoirs & évaluations à venir</Text>
            {upcoming.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(parent)/child')}>
                <Text style={s.sectionAction}>Voir tout ({upcoming.length})</Text>
              </TouchableOpacity>
            )}
          </View>

          {upcoming.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="Rien de prévu"
              detail="Aucun devoir annoncé pour les prochains jours."
            />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {upcoming.map((w) => (
                <View key={w.id} style={s.workRow}>
                  <View style={s.dateBox}>
                    <Text style={s.dateMonth}>
                      {new Date(w.dueDate).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={s.dateDay}>{new Date(w.dueDate).getDate()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.workTitle} numberOfLines={1}>{w.title}</Text>
                    <Text style={s.workMeta} numberOfLines={1}>
                      {w.subjectName ?? '—'}
                      {w.teacherName ? ` · ${w.teacherName}` : ''}
                    </Text>
                  </View>
                  {w.isSubmitted ? (
                    <View style={s.doneTag}>
                      <Ionicons name="checkmark" size={12} color={colors.secondary} />
                      <Text style={s.doneTagText}>Rendu</Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        s.workDue,
                        w.daysLeft <= 1 && { color: colors.danger },
                      ]}
                    >
                      {dueLabel(w.daysLeft, null)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Dernières notes ─────────────────────────────────────── */}
        {grades.length > 0 && (
          <View>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Dernières notes enregistrées</Text>
              {bulletinAvailable && (
                <TouchableOpacity onPress={() => router.push('/(parent)/child')}>
                  <Text style={s.sectionAction}>Télécharger bulletin</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ gap: spacing.sm }}>
              {grades.map((g) => {
                const on20 = (g.score / g.maxScore) * 20
                const tone = on20 >= 14 ? colors.secondary
                  : on20 >= 10 ? colors.text : colors.danger

                return (
                  <View key={g.id} style={s.gradeRow}>
                    <View style={s.subjectTag}>
                      <Text style={s.subjectTagText}>{subjectTag(g.subjectName)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.gradeTitle} numberOfLines={1}>{g.title}</Text>
                      <Text style={s.gradeMeta} numberOfLines={1}>
                        {shortDate(g.date)} · Coeff. {g.coefficient}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.gradeScore, { color: tone }]}>
                        {g.score}/{g.maxScore}
                      </Text>
                      {g.classAverage != null && (
                        <Text style={s.gradeClass}>
                          Moyenne classe : {g.classAverage}
                        </Text>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* ── Communication ───────────────────────────────────────── */}
        <View style={s.commCard}>
          <View style={s.commHead}>
            <View style={s.commIcon}>
              <Ionicons name="chatbubbles-outline" size={19} color={colors.white} />
            </View>
            <Text style={s.commTitle}>Communication avec l’école</Text>
          </View>
          <Text style={s.commBody}>
            Justifiez une absence, demandez un rendez-vous avec le professeur
            principal, ou contactez la comptabilité.
          </Text>
          <View style={s.commActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(parent)/messages')}
              style={s.commPrimary}
            >
              <Ionicons name="chatbubble-outline" size={15} color={colors.white} />
              <Text style={s.commPrimaryText}>Réponse rapide</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(parent)/child')}
              style={s.commGhost}
            >
              <Ionicons name="document-attach-outline" size={15} color={colors.primary} />
              <Text style={s.commGhostText}>Justifier absence</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <BottomNav
        tabs={PARENT_TABS.map((t) =>
          t.label === 'Paiements' ? { ...t, dot: totalDue > 0 } : t
        )}
      />
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  centerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.mutedText },

  // En-tête
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingTop: spacing.sm, paddingBottom: spacing.sm + 4,
  },
  headerLabel: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.mutedText,
    paddingHorizontal: spacing.md + 4, marginBottom: spacing.sm,
  },
  childRail: { paddingHorizontal: spacing.md + 4, gap: spacing.sm + 2 },
  childCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    minWidth: 190,
    backgroundColor: colors.gray[100],
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm,
  },
  childCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  childAvatar: { width: 36, height: 36, borderRadius: 18 },
  childAvatarFallback: {
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  childInitials: {
    fontFamily: fontFamily.heading, fontSize: 12,
    fontWeight: fontWeight.bold, color: colors.primary,
  },
  childName: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  childClass: { fontFamily: fontFamily.body, fontSize: 10, color: colors.mutedText, marginTop: 1 },

  content: {
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.md,
    paddingBottom: 110,
    gap: spacing.md + 2,
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(194,65,59,0.08)',
    borderWidth: 1, borderColor: 'rgba(194,65,59,0.25)',
    borderRadius: radius.lg, padding: spacing.sm + 4,
  },
  errorText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger },

  // Solde
  dueCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl, padding: spacing.md,
    ...shadow.md,
  },
  dueCardOverdue: { backgroundColor: colors.danger },
  dueTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: spacing.sm,
  },
  dueTag: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
  },
  dueTagText: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    fontWeight: fontWeight.bold, color: colors.white,
  },
  dueTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.white, marginTop: spacing.sm + 2,
  },
  dueSub: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.80)', marginTop: 2,
  },
  dueBottom: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    marginTop: spacing.md, gap: spacing.sm,
  },
  dueAmountLabel: { fontFamily: fontFamily.body, fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  dueAmount: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xl,
    fontWeight: fontWeight.extrabold, color: colors.white, marginTop: 2,
  },
  dueBtn: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  },
  dueBtnText: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.primary,
  },
  dueMethods: {
    fontFamily: fontFamily.body, fontSize: 10,
    color: 'rgba(255,255,255,0.65)', marginTop: spacing.sm,
  },

  // Sections
  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm + 2, gap: spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  sectionAction: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.primary,
  },
  periodTag: {
    fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText,
  },

  pendingCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.md,
  },
  pendingText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, lineHeight: 17 },

  statRow: { flexDirection: 'row', gap: spacing.sm + 2 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.md,
    ...shadow.sm,
  },
  statTop: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  statValue: {
    fontFamily: fontFamily.heading, fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extrabold, color: colors.primary,
  },
  statMax: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.mutedText, marginBottom: 4,
  },
  trend: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    fontWeight: fontWeight.bold, marginBottom: 5, marginLeft: 4,
  },
  statLabel: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, marginTop: 2 },

  attendanceCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.sm + 4,
    marginTop: spacing.sm + 2, gap: spacing.sm,
  },
  attendanceLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  attendanceMain: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.text,
  },
  attendanceDetail: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText },

  // Devoirs
  workRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.sm + 4,
  },
  dateBox: {
    width: 42, alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: radius.md, paddingVertical: 5,
  },
  dateMonth: {
    fontFamily: fontFamily.bodySemi, fontSize: 9,
    fontWeight: fontWeight.bold, color: colors.mutedText,
  },
  dateDay: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  workTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  workMeta: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText, marginTop: 1 },
  workDue: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    fontWeight: fontWeight.semibold, color: colors.mutedText,
  },
  doneTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(15,118,110,0.10)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
  },
  doneTagText: {
    fontFamily: fontFamily.bodySemi, fontSize: 10,
    fontWeight: fontWeight.bold, color: colors.secondary,
  },

  // Notes
  gradeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.sm + 4,
  },
  subjectTag: {
    width: 34, height: 34, borderRadius: radius.md,
    backgroundColor: 'rgba(20,93,160,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  subjectTagText: {
    fontFamily: fontFamily.heading, fontSize: 10,
    fontWeight: fontWeight.bold, color: colors.primary,
  },
  gradeTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  gradeMeta: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText, marginTop: 1 },
  gradeScore: { fontFamily: fontFamily.heading, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  gradeClass: { fontFamily: fontFamily.body, fontSize: 10, color: colors.mutedText, marginTop: 1 },

  // Communication
  commCard: {
    backgroundColor: 'rgba(20,93,160,0.05)',
    borderWidth: 1, borderColor: 'rgba(20,93,160,0.20)',
    borderRadius: radius.xl, padding: spacing.md,
  },
  commHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  commIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  commTitle: {
    flex: 1,
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  commBody: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.mutedText, marginTop: spacing.sm, lineHeight: 17,
  },
  commActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  commPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2, borderRadius: radius.lg,
  },
  commPrimaryText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.white,
  },
  commGhost: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: 'rgba(20,93,160,0.30)',
    paddingVertical: spacing.sm + 2, borderRadius: radius.lg,
  },
  commGhostText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.primary,
  },
})
