/**
 * Appel & Notes — écran enseignant.
 * Repris de la maquette `design/maquettes/enseignant---appel-et-notes.html`.
 *
 * Cahier des charges §11.1, §12.1, §12.2, §19, §26.
 *
 * C'est l'écran le plus utilisé de l'ERP : un professeur l'ouvre
 * plusieurs fois par jour, souvent debout, parfois sans réseau. Trois
 * décisions en découlent :
 *
 *  - **Un geste par élève.** Appuyer sur la ligne fait défiler
 *    présent → absent → retard. Pas de menu, pas de confirmation.
 *  - **L'appel entier en un bouton.** « Faire l'appel (1-Tap) » met
 *    tout le monde présent ; le professeur ne corrige que les absents.
 *  - **Jamais mentir sur l'état.** Tant que le serveur n'a pas
 *    confirmé, le bandeau dit « en attente d'envoi », pas
 *    « enregistré » (§19.3).
 */
import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert, Linking, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { colors, spacing, radius, fontSize, fontWeight, fontFamily, shadow } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import { useTeacherSession, type PresenceStatus } from '@/hooks/useTeacherSession'
import { SectionHeader, EmptyState, Rail } from '@/components/ui/DesignSystem'
import { BottomNav, TEACHER_TABS } from '@/components/ui/BottomNav'

// ── Statuts ───────────────────────────────────────────────────────────────────

const STATUS: Record<
  Exclude<PresenceStatus, 'justified' | 'pending'>,
  { label: string; bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap; border?: string }
> = {
  present: {
    label: 'Présent',
    bg: colors.secondary,
    fg: colors.white,
    icon: 'checkmark-circle',
  },
  absent: {
    label: 'Absent',
    bg: colors.danger,
    fg: colors.white,
    icon: 'close-circle',
    border: 'rgba(194, 65, 59, 0.30)',
  },
  late: {
    label: 'Retard',
    bg: colors.accent,
    fg: colors.white,
    icon: 'time',
    border: 'rgba(244, 166, 42, 0.45)',
  },
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function TeacherAttendanceScreen() {
  const { profile } = useAuth()
  const {
    slots, activeSlot, students, records, counts, grading,
    isLoading, error, periodOpen, pendingCount, isOnline,
    selectSlot, cycleStatus, markAllPresent, submit, reload,
  } = useTeacherSession()

  // Progression réelle de la saisie des notes (0 si aucune évaluation).
  const pct = grading.expected > 0
    ? Math.round((grading.entered / grading.expected) * 100)
    : 0

  const [saving, setSaving] = useState(false)
  const [justQueued, setJustQueued] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function handleSubmit() {
    if (!periodOpen) {
      Alert.alert(
        'Période fermée',
        "La saisie est verrouillée pour cette période. Contactez le Directeur des Études.",
      )
      return
    }
    setSaving(true)
    const { queued } = await submit()
    setSaving(false)
    setJustQueued(queued)
  }

  /**
   * Alerte parent d'une absence (§11.1).
   * WhatsApp est le canal prioritaire du cahier des charges ; le SMS
   * prend le relais si le numéro n'est pas sur WhatsApp.
   */
  function alertGuardian(studentName: string, phone: string | null) {
    if (!phone) {
      Alert.alert('Aucun contact', `Aucun numéro enregistré pour le responsable de ${studentName}.`)
      return
    }
    const cls = activeSlot?.className ?? 'sa classe'
    const message = encodeURIComponent(
      `Bonjour, votre enfant ${studentName} est absent(e) au cours de ${activeSlot?.subjectName ?? ''} (${cls}) aujourd'hui. Merci de justifier via l'application.`
    )
    const clean = phone.replace(/[^\d+]/g, '')
    Linking.openURL(`whatsapp://send?phone=${clean}&text=${message}`).catch(() =>
      Linking.openURL(`sms:${clean}?body=${message}`)
    )
  }

  // ── États explicites (§23) ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.centerText}>Chargement de vos cours…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* ── En-tête : identité + état de synchronisation ─────────────── */}
      <View style={s.header}>
        <View style={s.rowBetween}>
          <View style={s.row}>
            <View style={s.avatarWrap}>
              {profile?.photoUrl ? (
                <Image source={{ uri: profile.photoUrl }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}>
                  <Text style={s.avatarInitials}>
                    {initials(profile?.displayName ?? 'Prof')}
                  </Text>
                </View>
              )}
              <View style={[s.presenceDot, { backgroundColor: isOnline ? colors.secondary : colors.gray[400] }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.teacherName} numberOfLines={1}>
                {profile?.displayName ?? 'Enseignant'}
              </Text>
              <Text style={s.teacherRole} numberOfLines={1}>
                {activeSlot ? `Professeur de ${activeSlot.subjectName}` : 'Aucun cours aujourd’hui'}
              </Text>
            </View>
          </View>

          {/* §19.3 : l'état dit ce qui attend, jamais ce qui est promis. */}
          <View
            style={[
              s.syncPill,
              pendingCount > 0
                ? { backgroundColor: 'rgba(244,166,42,0.12)', borderColor: 'rgba(244,166,42,0.40)' }
                : { backgroundColor: 'rgba(15,118,110,0.10)', borderColor: 'rgba(15,118,110,0.30)' },
            ]}
          >
            <Ionicons
              name={pendingCount > 0 ? 'cloud-upload-outline' : 'cloud-done'}
              size={14}
              color={pendingCount > 0 ? '#A96A0C' : colors.secondary}
            />
            <Text
              style={[
                s.syncText,
                { color: pendingCount > 0 ? '#A96A0C' : colors.secondary },
              ]}
            >
              {pendingCount > 0 ? `${pendingCount} en attente` : 'Synchronisé'}
            </Text>
          </View>
        </View>

        {/* ── Classe active + changement de créneau ──────────────────── */}
        {activeSlot && (
          <View style={s.classBar}>
            <View style={s.row}>
              <View style={s.classBadge}>
                <Text style={s.classBadgeText}>
                  {activeSlot.className.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={s.classTitle}>Classe de {activeSlot.className}</Text>
                <Text style={s.classMeta}>
                  {students.length} élèves
                  {activeSlot.room ? ` · ${activeSlot.room}` : ''}
                  {activeSlot.startTime ? ` · ${activeSlot.startTime} - ${activeSlot.endTime}` : ''}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              reload()
              setTimeout(() => setRefreshing(false), 600)
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Rail des créneaux du jour ────────────────────────────── */}
        {slots.length > 1 && (
          <View>
            <SectionHeader title="Mes cours du jour" subtitle={`${slots.length} créneaux`} />
            <Rail>
              {slots.map((slot) => {
                const active = slot.classId === activeSlot?.classId
                return (
                  <TouchableOpacity
                    key={`${slot.slotId}`}
                    activeOpacity={0.8}
                    onPress={() => selectSlot(slot)}
                    style={[s.slotCard, active && s.slotCardActive]}
                  >
                    <Text style={[s.slotTime, active && { color: colors.white, opacity: 0.9 }]}>
                      {slot.startTime} - {slot.endTime}
                    </Text>
                    <Text style={[s.slotClass, active && { color: colors.white }]} numberOfLines={1}>
                      {slot.className}
                    </Text>
                    <Text style={[s.slotSubject, active && { color: colors.white, opacity: 0.85 }]} numberOfLines={1}>
                      {slot.subjectName}
                    </Text>
                    {slot.isNow && (
                      <View style={[s.nowTag, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                        <Text style={[s.nowTagText, active && { color: colors.white }]}>EN COURS</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </Rail>
          </View>
        )}

        {/* ── Bandeau d'appel ──────────────────────────────────────── */}
        {activeSlot && (
          <View style={s.heroCard}>
            <View style={s.rowBetween}>
              <View style={{ flex: 1 }}>
                {activeSlot.isNow && (
                  <View style={s.liveTag}>
                    <View style={s.liveDot} />
                    <Text style={s.liveText}>
                      Cours en cours ({activeSlot.startTime} - {activeSlot.endTime})
                    </Text>
                  </View>
                )}
                <Text style={s.heroTitle}>Appel de présence flash</Text>
                <Text style={s.heroSub}>
                  {counts.present} présents · {counts.absent} absents · {counts.late} retards
                </Text>
              </View>
              <View style={s.heroIcon}>
                <Ionicons name="people" size={24} color={colors.white} />
              </View>
            </View>

            <View style={s.heroActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={markAllPresent}
                style={s.heroPrimaryBtn}
              >
                <Ionicons name="checkbox" size={16} color={colors.secondary} />
                <Text style={s.heroPrimaryText}>Faire l’appel (1-Tap)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(teacher)/courses')}
                style={s.heroGhostBtn}
              >
                <Ionicons name="create-outline" size={14} color={colors.white} />
                <Text style={s.heroGhostText}>Cahier de texte</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Période verrouillée ──────────────────────────────────── */}
        {!periodOpen && (
          <View style={s.lockBanner}>
            <Ionicons name="lock-closed" size={16} color={colors.danger} />
            <Text style={s.lockText}>
              Période verrouillée par le Directeur des Études · saisie en lecture seule
            </Text>
          </View>
        )}

        {error && (
          <View style={s.lockBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={s.lockText}>{error}</Text>
          </View>
        )}

        {/* ── Pointage rapide ──────────────────────────────────────── */}
        <View>
          <SectionHeader
            title={`Pointage rapide${activeSlot ? ` · ${activeSlot.className}` : ''}`}
            right={<Text style={s.hint}>Appuyez pour basculer</Text>}
          />

          {students.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="Aucun élève dans cette classe"
              detail="Vérifiez les inscriptions auprès du secrétariat."
            />
          ) : (
            <View style={{ gap: spacing.sm }}>
              {students.map((student) => {
                const status = (records[student.id]?.status ?? 'present') as keyof typeof STATUS
                const cfg = STATUS[status] ?? STATUS.present

                return (
                  <TouchableOpacity
                    key={student.id}
                    activeOpacity={0.75}
                    disabled={!periodOpen}
                    onPress={() => cycleStatus(student.id)}
                    style={[s.studentRow, cfg.border ? { borderColor: cfg.border } : null]}
                  >
                    <View style={s.row}>
                      {student.photoUrl ? (
                        <Image source={{ uri: student.photoUrl }} style={s.studentAvatar} />
                      ) : (
                        <View style={[s.studentAvatar, s.avatarFallback]}>
                          <Text style={s.avatarInitials}>{initials(student.fullName)}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={s.studentName} numberOfLines={1}>{student.fullName}</Text>
                        <Text
                          style={[
                            s.studentMeta,
                            status === 'absent' && { color: colors.danger, fontWeight: fontWeight.medium },
                            status === 'late' && { color: '#A96A0C', fontWeight: fontWeight.medium },
                          ]}
                          numberOfLines={1}
                        >
                          {status === 'absent'
                            ? 'Absent non justifié'
                            : status === 'late'
                              ? 'En retard'
                              : `${student.rollNumber ? `N° ${student.rollNumber}` : ''}${
                                  student.average != null ? ` · Moy: ${student.average}/20` : ''
                                }` || 'Présent'}
                        </Text>
                      </View>
                    </View>

                    <View style={s.rowTight}>
                      <View style={[s.statusPill, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon} size={13} color={cfg.fg} />
                        <Text style={[s.statusPillText, { color: cfg.fg }]}>{cfg.label}</Text>
                      </View>

                      {/* Alerte parent : n'apparaît que pour un absent (§11.1) */}
                      {status === 'absent' && (
                        <TouchableOpacity
                          accessibilityLabel={`Alerter le responsable de ${student.fullName}`}
                          onPress={() => alertGuardian(student.fullName, student.guardianWhatsapp)}
                          style={s.whatsappBtn}
                        >
                          <Ionicons name="logo-whatsapp" size={16} color={colors.secondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>

        {/* ── Saisie flash des notes ───────────────────────────────── */}
        {activeSlot && (
          <View>
            <SectionHeader
              title="Saisie flash des notes"
              subtitle={
                grading.title
                  ? `${grading.title} · Coeff. ${grading.coefficient ?? 1} · Sur ${grading.maxScore ?? 20}`
                  : `${activeSlot.subjectName} · ${activeSlot.className}`
              }
              right={
                <TouchableOpacity style={s.rowTight}>
                  <Ionicons name="cloud-upload-outline" size={14} color={colors.primary} />
                  <Text style={s.linkText}>Import Excel</Text>
                </TouchableOpacity>
              }
            />
            <View style={s.notesCard}>
              {grading.assessmentId ? (
                <>
                  <View style={s.rowBetween}>
                    <Text style={s.notesProgress}>
                      Progression saisie :{' '}
                      <Text style={s.bold}>
                        {grading.entered} / {grading.expected} élèves
                      </Text>
                    </Text>
                    <Text style={s.notesPercent}>{pct} %</Text>
                  </View>
                  <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${pct}%` }]} />
                  </View>
                </>
              ) : (
                <Text style={s.notesProgress}>
                  Aucune évaluation en cours de saisie pour cette classe.
                </Text>
              )}
              <View style={[s.rowTight, { marginTop: spacing.sm }]}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/(teacher)/grades-flash')}
                  style={s.notesPrimaryBtn}
                >
                  <Ionicons name="keypad-outline" size={16} color={colors.white} />
                  <Text style={s.notesPrimaryText}>Continuer la saisie rapide</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/(teacher)/grades')}
                  style={s.notesGhostBtn}
                >
                  <Ionicons name="eye-outline" size={15} color={colors.text} />
                  <Text style={s.notesGhostText}>Moyennes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Assistant IA ─────────────────────────────────────────── */}
        <View style={s.aiCard}>
          <View style={[s.row, { alignItems: 'flex-start' }]}>
            <View style={s.aiIcon}>
              <Ionicons name="sparkles" size={19} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.rowBetween}>
                <Text style={s.aiTitle}>Assistant cours & exercices IA</Text>
                <View style={s.aiTag}><Text style={s.aiTagText}>Nouveau</Text></View>
              </View>
              <Text style={s.aiBody}>
                Générez une fiche pédagogique conforme au programme national, ou
                cinq exercices types avec corrigés. Vous relisez et validez avant publication.
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(teacher)/fiche-cours')}
                style={s.aiBtn}
              >
                <Ionicons name="star-outline" size={15} color={colors.primary} />
                <Text style={s.aiBtnText}>Générer une séquence pédagogique</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Barre d'enregistrement ─────────────────────────────────── */}
      {activeSlot && students.length > 0 && (
        <View style={s.submitBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.submitCount}>
              {counts.present} présents · {counts.absent} absents · {counts.late} retards
            </Text>
            {justQueued && (
              <Text style={s.submitHint}>
                {pendingCount > 0
                  ? 'En attente d’envoi — sera synchronisé au retour du réseau'
                  : 'Appel enregistré'}
              </Text>
            )}
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={saving || !periodOpen}
            onPress={handleSubmit}
            style={[s.submitBtn, (saving || !periodOpen) && { opacity: 0.5 }]}
          >
            {saving
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Ionicons name="checkmark-done" size={17} color={colors.white} />}
            <Text style={s.submitBtnText}>Enregistrer l’appel</Text>
          </TouchableOpacity>
        </View>
      )}

      <BottomNav tabs={TEACHER_TABS} />
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  centerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.mutedText },

  row:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, flex: 1 },
  rowTight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm - 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },

  // En-tête
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.secondary },
  avatarFallback: { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  presenceDot: {
    position: 'absolute', bottom: -1, right: -1,
    width: 13, height: 13, borderRadius: 7,
    borderWidth: 2, borderColor: colors.surface,
  },
  teacherName: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  teacherRole: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText },

  syncPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1,
  },
  syncText: { fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

  classBar: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(232,238,245,0.55)',
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  classBadge: {
    width: 30, height: 30, borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  classBadgeText: {
    fontFamily: fontFamily.heading, fontSize: 10,
    fontWeight: fontWeight.bold, color: colors.white,
  },
  classTitle: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  classMeta: { fontFamily: fontFamily.body, fontSize: 10, color: colors.mutedText, marginTop: 1 },

  content: {
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.md,
    paddingBottom: 190,
    gap: spacing.md + 2,
  },

  // Rail des créneaux
  slotCard: {
    minWidth: 150,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm + 4,
    ...shadow.sm,
  },
  slotCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotTime: { fontFamily: fontFamily.body, fontSize: 10, color: colors.mutedText },
  slotClass: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.text, marginTop: 4,
  },
  slotSubject: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, marginTop: 1 },
  nowTag: {
    marginTop: spacing.sm, alignSelf: 'flex-start',
    backgroundColor: 'rgba(15,118,110,0.12)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  nowTagText: {
    fontFamily: fontFamily.bodySemi, fontSize: 9,
    fontWeight: fontWeight.bold, color: colors.secondary, letterSpacing: 0.4,
  },

  // Bandeau d'appel
  heroCard: {
    backgroundColor: colors.secondary,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadow.md,
  },
  liveTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6EE7B7' },
  liveText: {
    fontFamily: fontFamily.bodySemi, fontSize: 10,
    fontWeight: fontWeight.bold, color: colors.white,
  },
  heroTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.lg,
    fontWeight: fontWeight.bold, color: colors.white, marginTop: spacing.sm,
  },
  heroSub: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.85)', marginTop: 2,
  },
  heroIcon: {
    width: 48, height: 48, borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroActions: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.md, paddingTop: spacing.sm + 4,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.20)',
  },
  heroPrimaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.white, paddingVertical: spacing.sm + 2, borderRadius: radius.lg,
    ...shadow.sm,
  },
  heroPrimaryText: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.secondary,
  },
  heroGhostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
  },
  heroGhostText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.white,
  },

  lockBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(194,65,59,0.08)',
    borderWidth: 1, borderColor: 'rgba(194,65,59,0.25)',
    borderRadius: radius.lg, padding: spacing.sm + 4,
  },
  lockText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger },

  hint: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText },
  linkText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.primary,
  },
  bold: { fontFamily: fontFamily.bodySemi, fontWeight: fontWeight.bold, color: colors.text },

  // Ligne élève
  studentRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.sm + 4,
    gap: spacing.sm,
  },
  studentAvatar: { width: 40, height: 40, borderRadius: 20 },
  studentName: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  studentMeta: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText, marginTop: 1 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md,
    ...shadow.sm,
  },
  statusPillText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
  },
  whatsappBtn: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: 'rgba(15,118,110,0.08)',
    borderWidth: 1, borderColor: 'rgba(15,118,110,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Notes
  notesCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.md,
    gap: spacing.sm + 2,
  },
  notesProgress: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText },
  notesPercent: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.secondary,
  },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.muted, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  notesPrimaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary, paddingVertical: spacing.sm + 2, borderRadius: radius.lg,
    ...shadow.sm,
  },
  notesPrimaryText: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.white,
  },
  notesGhostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg, backgroundColor: colors.muted,
  },
  notesGhostText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.text,
  },

  // IA
  aiCard: {
    backgroundColor: 'rgba(20,93,160,0.05)',
    borderWidth: 1, borderColor: 'rgba(20,93,160,0.20)',
    borderRadius: radius.xl, padding: spacing.md,
  },
  aiIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.sm,
  },
  aiTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.text, flex: 1,
  },
  aiTag: {
    backgroundColor: 'rgba(244,166,42,0.20)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  aiTagText: {
    fontFamily: fontFamily.bodySemi, fontSize: 9,
    fontWeight: fontWeight.bold, color: '#3B2605',
  },
  aiBody: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.mutedText, marginTop: 4, lineHeight: 17,
  },
  aiBtn: {
    marginTop: spacing.sm + 4,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: 'rgba(20,93,160,0.40)',
    paddingVertical: spacing.sm + 2, borderRadius: radius.lg,
    ...shadow.sm,
  },
  aiBtnText: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.primary,
  },

  // Barre d'enregistrement
  submitBar: {
    position: 'absolute', left: 0, right: 0, bottom: 84,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm + 4,
  },
  submitCount: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText },
  submitHint: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    color: colors.secondary, marginTop: 2,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4,
    borderRadius: radius.lg, ...shadow.sm,
  },
  submitBtnText: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.white,
  },
})
