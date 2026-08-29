/**
 * Accueil élève.
 * Repris de la maquette `design/maquettes/eleve---dashboard.html`.
 *
 * Cahier des charges §15.1, §15.3, §15.5, §15.7, §19.
 *
 * L'écran s'adresse à des élèves de 10 à 18 ans : il doit être
 * motivant sans être infantilisant, et honnête sur ce qui attend.
 *
 * §15.7 impose « sans classement humiliant ni exposition publique
 * non consentie ». Le rang n'apparaît donc que si l'établissement
 * l'a explicitement autorisé (`grading_rules.rank_visible_student`),
 * et jamais celui des autres élèves.
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
import { useAuth } from '@/hooks/useAuth'
import {
  useStudentDashboard, dueLabel, subjectTag,
  type TodayCourse, type HomeworkItem,
} from '@/hooks/useStudentDashboard'
import { EmptyState, Rail } from '@/components/ui/DesignSystem'
import { BottomNav, STUDENT_TABS } from '@/components/ui/BottomNav'

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function StudentHomeScreen() {
  const { profile } = useAuth()
  const {
    studentName, className, periodLabel,
    courses, homework, grades, progress,
    average, rank, classSize, absencesUnjustified, lateCount,
    isLoading, error, pendingCount, isOnline, reload,
  } = useStudentDashboard()

  const [refreshing, setRefreshing] = useState(false)

  const firstName = (studentName ?? '').split(' ')[0] || 'toi'
  const remaining = courses.filter((c) => c.phase !== 'done').length
  const urgent = homework.filter((h) => h.isUrgent).length
  const currentCourse = courses.find((c) => c.phase === 'now')

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  if (isLoading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.centerText}>Chargement de ta journée…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.headerLeft}>
            <View style={s.avatarWrap}>
              {profile?.photoUrl ? (
                <Image source={{ uri: profile.photoUrl }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}>
                  <Text style={s.avatarInitials}>{initials(studentName ?? 'E')}</Text>
                </View>
              )}
              <View style={s.levelBadge}>
                <Text style={s.levelText}>Niv. {progress.level}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.greeting} numberOfLines={1}>Salut, {firstName} !</Text>
              <Text style={s.subtitle} numberOfLines={1}>
                {className ?? 'Classe'}{periodLabel ? ` · ${periodLabel}` : ''}
              </Text>
            </View>
          </View>

          <View style={s.headerRight}>
            <View style={s.xpPill}>
              <Ionicons name="flame" size={13} color="#DB8F14" />
              <Text style={s.xpText}>{progress.xp} XP</Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Notifications"
              style={s.bellBtn}
              onPress={() => router.push('/(student)/profile')}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* État hors ligne + série : ce qui rassure et ce qui motive. */}
        <View style={s.statusBar}>
          <View style={s.statusLeft}>
            <View style={[s.statusDot, { backgroundColor: isOnline ? colors.secondary : colors.gray[400] }]} />
            <Text style={s.statusText}>
              {pendingCount > 0
                ? `${pendingCount} envoi${pendingCount > 1 ? 's' : ''} en attente`
                : isOnline ? 'Tout est à jour' : 'Hors ligne · cours enregistrés'}
            </Text>
          </View>
          {progress.streak > 0 && (
            <Text style={s.streakText}>Série de {progress.streak} jour{progress.streak > 1 ? 's' : ''} 🔥</Text>
          )}
        </View>
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

        {/* ── Planning du jour ────────────────────────────────────── */}
        <View>
          <View style={s.sectionHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>Planning du jour</Text>
              <Text style={s.sectionSub}>
                {today.charAt(0).toUpperCase() + today.slice(1)}
                {courses.length > 0 ? ` · ${remaining} cours restant${remaining > 1 ? 's' : ''}` : ''}
              </Text>
            </View>
            {currentCourse?.room && (
              <View style={s.roomTag}>
                <Text style={s.roomTagText}>{currentCourse.room}</Text>
              </View>
            )}
          </View>

          {courses.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="Aucun cours aujourd’hui"
              detail="Profites-en pour prendre de l’avance sur tes devoirs."
            />
          ) : (
            <Rail>
              {courses.map((c) => <CourseCard key={c.id} course={c} />)}
            </Rail>
          )}
        </View>

        {/* ── Devoirs ─────────────────────────────────────────────── */}
        <View>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Devoirs à rendre</Text>
            {urgent > 0 && (
              <Text style={s.urgentText}>{urgent} urgent{urgent > 1 ? 's' : ''}</Text>
            )}
          </View>

          {homework.length === 0 ? (
            <EmptyState
              icon="checkmark-done-circle-outline"
              title="Rien à rendre"
              detail="Aucun devoir en attente pour le moment."
            />
          ) : (
            <View style={{ gap: spacing.sm + 2 }}>
              {homework.slice(0, 4).map((h) => (
                <HomeworkCard
                  key={h.id}
                  item={h}
                  onPress={() => router.push('/(student)/devoirs')}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Résultats ───────────────────────────────────────────── */}
        {/* La moyenne n'apparaît qu'une fois le bulletin publié (§13.3).
            Le rang, lui, dépend du choix de l'établissement (§15.7). */}
        {(average != null || grades.length > 0) && (
          <View>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Mes résultats</Text>
              <TouchableOpacity onPress={() => router.push('/(student)/grades')}>
                <Text style={s.sectionAction}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {average != null && (
              <View style={s.averageCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.averageLabel}>Moyenne générale</Text>
                  <View style={s.averageRow}>
                    <Text style={s.averageValue}>{average.toFixed(2)}</Text>
                    <Text style={s.averageMax}>/20</Text>
                  </View>
                </View>

                {rank != null && classSize != null && (
                  <View style={s.rankBox}>
                    <Text style={s.rankValue}>{rank}<Text style={s.rankSup}>e</Text></Text>
                    <Text style={s.rankLabel}>sur {classSize}</Text>
                  </View>
                )}
              </View>
            )}

            {grades.length > 0 && (
              <View style={{ gap: spacing.sm, marginTop: average != null ? spacing.sm + 2 : 0 }}>
                {grades.map((g) => {
                  const on20 = (g.score / g.maxScore) * 20
                  const tone = on20 >= 14 ? colors.secondary : on20 >= 10 ? colors.text : colors.danger
                  return (
                    <View key={g.id} style={s.gradeRow}>
                      <View style={s.subjectTag}>
                        <Text style={s.subjectTagText}>{subjectTag(g.subjectName)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.gradeTitle} numberOfLines={1}>{g.assessmentTitle}</Text>
                        <Text style={s.gradeMeta} numberOfLines={1}>
                          {g.subjectName ?? '—'} · Coeff. {g.coefficient}
                        </Text>
                      </View>
                      <Text style={[s.gradeScore, { color: tone }]}>
                        {g.score}/{g.maxScore}
                      </Text>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        )}

        {/* ── Assiduité ───────────────────────────────────────────── */}
        {(absencesUnjustified > 0 || lateCount > 0) && (
          <View style={s.attendanceCard}>
            <Ionicons name="calendar-outline" size={19} color={colors.mutedText} />
            <Text style={s.attendanceText}>
              {absencesUnjustified > 0 && `${absencesUnjustified} absence${absencesUnjustified > 1 ? 's' : ''}`}
              {absencesUnjustified > 0 && lateCount > 0 && ' · '}
              {lateCount > 0 && `${lateCount} retard${lateCount > 1 ? 's' : ''}`}
              {' ce trimestre'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(student)/absences')}>
              <Ionicons name="chevron-forward" size={17} color={colors.gray[400]} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Tuteur IA ───────────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(student)/courses')}
          style={s.aiCard}
        >
          <View style={s.aiIcon}>
            <Ionicons name="sparkles" size={19} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.aiTitle}>Tuteur IA Projetto1</Text>
            <Text style={s.aiBody}>
              Une notion qui résiste ? Demande une explication, pas la réponse.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      </ScrollView>

      <BottomNav
        tabs={STUDENT_TABS.map((t) =>
          t.label === 'Devoirs' ? { ...t, dot: urgent > 0 } : t
        )}
      />
    </SafeAreaView>
  )
}

// ── Carte de cours ────────────────────────────────────────────────────────────

function CourseCard({ course }: { course: TodayCourse }) {
  const isNow = course.phase === 'now'
  const isDone = course.phase === 'done'

  return (
    <View style={[s.courseCard, isNow && s.courseCardNow, isDone && { opacity: 0.55 }]}>
      <View style={s.courseTop}>
        <Text style={[s.courseTime, isNow && { color: 'rgba(255,255,255,0.9)' }]}>
          {course.startTime} - {course.endTime}
        </Text>
        <View style={[s.coursePhase, isNow && { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
          <Text style={[s.coursePhaseText, isNow && { color: colors.white }]}>
            {isNow ? 'EN COURS' : isDone ? 'Terminé' : course.phase === 'soon' ? 'Bientôt' : 'Après-midi'}
          </Text>
        </View>
      </View>

      <Text style={[s.courseSubject, isNow && { color: colors.white }]} numberOfLines={1}>
        {course.subjectName}
      </Text>
      <Text style={[s.courseTeacher, isNow && { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={1}>
        {course.teacherName ?? 'Professeur'}
        {course.room ? ` · ${course.room}` : ''}
      </Text>
    </View>
  )
}

// ── Carte de devoir ───────────────────────────────────────────────────────────

function HomeworkCard({ item, onPress }: { item: HomeworkItem; onPress: () => void }) {
  const tone = item.isSubmitted ? colors.secondary
    : item.daysLeft < 0 ? colors.danger
    : item.isUrgent ? '#A96A0C'
    : colors.mutedText

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={s.hwCard}>
      <View style={s.subjectTag}>
        <Text style={s.subjectTagText}>{subjectTag(item.subjectName)}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={s.hwTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={s.hwMeta} numberOfLines={1}>
          {item.teacherName ?? 'Professeur'} · {dueLabel(item.daysLeft, item.dueTime)}
        </Text>
      </View>

      {item.isSubmitted ? (
        <View style={s.hwDone}>
          <Ionicons name="checkmark" size={13} color={colors.secondary} />
          <Text style={s.hwDoneText}>Rendu</Text>
        </View>
      ) : (
        <Text style={[s.hwDue, { color: tone }]}>{dueLabel(item.daysLeft, item.dueTime)}</Text>
      )}
    </TouchableOpacity>
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
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm, paddingBottom: spacing.sm + 4,
  },
  headerTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, flex: 1 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primary },
  avatarFallback: { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.primary,
  },
  levelBadge: {
    position: 'absolute', bottom: -5, right: -8,
    backgroundColor: colors.accent,
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.surface,
  },
  levelText: {
    fontFamily: fontFamily.heading, fontSize: 9,
    fontWeight: fontWeight.extrabold, color: '#3B2605',
  },
  greeting: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, marginTop: 1 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  xpPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(244,166,42,0.12)',
    borderWidth: 1, borderColor: 'rgba(244,166,42,0.30)',
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.full,
  },
  xpText: {
    fontFamily: fontFamily.heading, fontSize: 11,
    fontWeight: fontWeight.bold, color: '#A96A0C',
  },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },

  statusBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(20,93,160,0.05)',
    borderWidth: 1, borderColor: 'rgba(20,93,160,0.15)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm,
    marginTop: spacing.sm + 4, gap: spacing.sm,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: {
    flex: 1, fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.xs, color: colors.text,
  },
  streakText: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    fontWeight: fontWeight.semibold, color: colors.primary,
  },

  content: {
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.md + 2,
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(194,65,59,0.08)',
    borderWidth: 1, borderColor: 'rgba(194,65,59,0.25)',
    borderRadius: radius.lg, padding: spacing.sm + 4,
  },
  errorText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger },

  // Sections
  sectionHead: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginBottom: spacing.sm + 2, gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  sectionSub: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText, marginTop: 1 },
  sectionAction: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.primary,
  },
  urgentText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.danger,
  },
  roomTag: {
    backgroundColor: 'rgba(20,93,160,0.10)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
  },
  roomTagText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.primary,
  },

  // Cours
  courseCard: {
    minWidth: 165,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.sm + 4,
    ...shadow.sm,
  },
  courseCardNow: { backgroundColor: colors.primary, borderColor: colors.primary },
  courseTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: spacing.sm,
  },
  courseTime: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText },
  coursePhase: {
    backgroundColor: colors.muted,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  coursePhaseText: {
    fontFamily: fontFamily.bodySemi, fontSize: 9,
    fontWeight: fontWeight.bold, color: colors.mutedText,
  },
  courseSubject: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.sm,
  },
  courseTeacher: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.mutedText, marginTop: 2,
  },

  // Devoirs
  hwCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.sm + 4,
    ...shadow.sm,
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
  hwTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  hwMeta: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, marginTop: 1 },
  hwDue: { fontFamily: fontFamily.bodySemi, fontSize: 11, fontWeight: fontWeight.bold },
  hwDone: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(15,118,110,0.10)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
  },
  hwDoneText: {
    fontFamily: fontFamily.bodySemi, fontSize: 10,
    fontWeight: fontWeight.bold, color: colors.secondary,
  },

  // Résultats
  averageCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.md,
    gap: spacing.md, ...shadow.sm,
  },
  averageLabel: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText },
  averageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 2 },
  averageValue: {
    fontFamily: fontFamily.heading, fontSize: fontSize['2xl'],
    fontWeight: fontWeight.extrabold, color: colors.primary,
  },
  averageMax: {
    fontFamily: fontFamily.body, fontSize: fontSize.sm,
    color: colors.mutedText, marginBottom: 3,
  },
  rankBox: {
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  rankValue: {
    fontFamily: fontFamily.heading, fontSize: fontSize.lg,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  rankSup: { fontSize: 10 },
  rankLabel: { fontFamily: fontFamily.body, fontSize: 10, color: colors.mutedText },

  gradeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.sm + 2,
  },
  gradeTitle: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.text,
  },
  gradeMeta: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText, marginTop: 1 },
  gradeScore: { fontFamily: fontFamily.heading, fontSize: fontSize.sm, fontWeight: fontWeight.bold },

  // Assiduité
  attendanceCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.sm + 4,
  },
  attendanceText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.text },

  // IA
  aiCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
    backgroundColor: 'rgba(20,93,160,0.05)',
    borderWidth: 1, borderColor: 'rgba(20,93,160,0.20)',
    borderRadius: radius.xl, padding: spacing.md,
  },
  aiIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  aiTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  aiBody: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.mutedText, marginTop: 2, lineHeight: 16,
  },
})
