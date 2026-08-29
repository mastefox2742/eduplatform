/**
 * Saisie flash des notes — écran enseignant.
 *
 * Cahier des charges §12.2, §13.1, §5.2, §19, §26.
 *
 * Le professeur corrige 42 copies puis saisit les notes d'une traite,
 * souvent debout, souvent sans réseau. L'écran est construit autour de
 * ce geste répété :
 *
 *  - **Un pavé numérique fixe.** Pas de clavier système qui masque la
 *    liste, pas de champ à viser : le nom de l'élève est en haut, on
 *    tape, on valide, l'élève suivant arrive.
 *  - **Le lot part en une fois.** Chaque note reste en mémoire ;
 *    l'envoi se fait par la file hors ligne, et l'écran distingue
 *    « saisi » de « envoyé » (§19.3).
 *  - **Une période fermée bloque à l'entrée**, pas à l'enregistrement :
 *    découvrir le refus après 42 notes serait cruel.
 */
import { useCallback, useRef, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Vibration, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { colors, spacing, radius, fontSize, fontWeight, fontFamily, shadow } from '@/theme'
import { useGradeEntry, type GradeRow, type GradeState } from '@/hooks/useGradeEntry'
import { SectionHeader, EmptyState, Rail } from '@/components/ui/DesignSystem'

// ── Pavé ──────────────────────────────────────────────────────────────────────

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫']

const STATE_CHIPS: { state: GradeState; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { state: 'absent',     label: 'Absent',     icon: 'close-circle-outline' },
  { state: 'exempte',    label: 'Dispensé',   icon: 'remove-circle-outline' },
  { state: 'rattrapage', label: 'Rattrapage', icon: 'refresh-outline' },
]

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

// ── Écran ─────────────────────────────────────────────────────────────────────

export default function GradesFlashScreen() {
  const {
    assessment, candidates, rows, stats, periodOpen,
    isLoading, isSaving, error, pendingCount,
    setScore, setRowState, selectAssessment, save, reload,
  } = useGradeEntry()

  const [index, setIndex] = useState(0)
  const [buffer, setBuffer] = useState('')
  const listRef = useRef<ScrollView>(null)

  const current = rows[index] ?? null
  const max = assessment?.maxScore ?? 20

  // ── Saisie au pavé ─────────────────────────────────────────────────────────

  const press = useCallback((key: string) => {
    if (!periodOpen) return

    if (key === '⌫') {
      setBuffer((b) => b.slice(0, -1))
      return
    }
    // La virgule est le séparateur décimal français ; une seule permise.
    if (key === ',' && buffer.includes(',')) return

    const next = buffer + key
    const value = parseFloat(next.replace(',', '.'))

    // On refuse la frappe qui dépasserait le barème plutôt que de
    // laisser saisir « 145 » avant de le rejeter à la validation.
    if (!Number.isNaN(value) && value > max) {
      if (Platform.OS !== 'web') Vibration.vibrate(40)
      return
    }
    setBuffer(next)
  }, [buffer, max, periodOpen])

  /** Valide la note courante et passe à l'élève suivant. */
  const commit = useCallback(() => {
    if (!current) return

    if (buffer.length > 0) {
      const value = parseFloat(buffer.replace(',', '.'))
      if (Number.isNaN(value)) return
      setScore(current.studentId, value)
    }

    setBuffer('')
    if (index < rows.length - 1) {
      setIndex((i) => i + 1)
      listRef.current?.scrollTo({ y: Math.max(0, (index - 1) * 56), animated: true })
    }
  }, [current, buffer, index, rows.length, setScore])

  const jumpTo = useCallback((i: number) => {
    setBuffer('')
    setIndex(i)
  }, [])

  const markState = useCallback((gradeState: GradeState) => {
    if (!current || !periodOpen) return
    setRowState(current.studentId, gradeState)
    setBuffer('')
    if (index < rows.length - 1) setIndex((i) => i + 1)
  }, [current, index, rows.length, setRowState, periodOpen])

  async function handleSave() {
    const res = await save()
    if (!res.ok) {
      Alert.alert('Enregistrement impossible', res.error)
      return
    }
    Alert.alert(
      'Notes enregistrées',
      pendingCount > 0
        ? `${res.count} note(s) en attente d’envoi — elles partiront au retour du réseau.`
        : `${res.count} note(s) enregistrée(s).`
    )
  }

  // ── États ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.centerText}>Chargement des évaluations…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!assessment) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <Header title="Saisie flash" subtitle="" onBack={() => router.back()} />
        <EmptyState
          icon="clipboard-outline"
          title="Aucune évaluation à saisir"
          detail="Créez une évaluation depuis « Mes évaluations » pour saisir ses notes ici."
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Header
        title="Saisie flash"
        subtitle={`${assessment.title} · ${assessment.className}`}
        onBack={() => router.back()}
        right={
          stats.pendingSave > 0 ? (
            <View style={s.pendingTag}>
              <Text style={s.pendingTagText}>{stats.pendingSave} à envoyer</Text>
            </View>
          ) : null
        }
      />

      {/* ── Choix de l'évaluation ────────────────────────────────── */}
      {candidates.length > 1 && (
        <View style={s.railWrap}>
          <Rail>
            {candidates.map((c) => {
              const active = c.id === assessment.id
              return (
                <TouchableOpacity
                  key={c.id}
                  activeOpacity={0.85}
                  onPress={() => selectAssessment(c.id)}
                  style={[s.assessCard, active && s.assessCardActive]}
                >
                  <Text style={[s.assessTitle, active && { color: colors.white }]} numberOfLines={1}>
                    {c.title}
                  </Text>
                  <Text
                    style={[s.assessMeta, active && { color: 'rgba(255,255,255,0.85)' }]}
                    numberOfLines={1}
                  >
                    {c.className} · /{c.maxScore} · coeff. {c.coefficient}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </Rail>
        </View>
      )}

      {/* ── Période fermée ───────────────────────────────────────── */}
      {!periodOpen && (
        <View style={s.lockBanner}>
          <Ionicons name="lock-closed" size={16} color={colors.danger} />
          <Text style={s.lockText}>
            Période verrouillée par le Directeur des Études · consultation seule
          </Text>
        </View>
      )}

      {error && (
        <View style={s.lockBanner}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={s.lockText}>{error}</Text>
        </View>
      )}

      {/* ── Progression et moyenne en direct ─────────────────────── */}
      <View style={s.statsBar}>
        <View style={s.statsLeft}>
          <Text style={s.statsProgress}>
            <Text style={s.statsStrong}>{stats.entered}</Text> / {stats.total} saisies
          </Text>
          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                { width: `${stats.total ? (stats.entered / stats.total) * 100 : 0}%` },
              ]}
            />
          </View>
        </View>

        {stats.averageOn20 != null && (
          <View style={s.avgBox}>
            <Text style={s.avgValue}>{stats.averageOn20.toFixed(2)}</Text>
            <Text style={s.avgLabel}>moy. /20</Text>
          </View>
        )}

        {stats.passRate != null && (
          <View style={s.avgBox}>
            <Text
              style={[
                s.avgValue,
                { color: stats.passRate >= 50 ? colors.secondary : colors.danger },
              ]}
            >
              {stats.passRate} %
            </Text>
            <Text style={s.avgLabel}>réussite</Text>
          </View>
        )}
      </View>

      {/* ── Liste des élèves ─────────────────────────────────────── */}
      <ScrollView
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row, i) => (
          <StudentLine
            key={row.studentId}
            row={row}
            max={max}
            active={i === index}
            buffer={i === index ? buffer : ''}
            onPress={() => jumpTo(i)}
          />
        ))}
      </ScrollView>

      {/* ── Pavé numérique ───────────────────────────────────────── */}
      {periodOpen && current && (
        <View style={s.pad}>
          <View style={s.padHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.padName} numberOfLines={1}>{current.fullName}</Text>
              <Text style={s.padMeta}>
                {current.rollNumber ? `N° ${current.rollNumber} · ` : ''}
                Élève {index + 1} sur {rows.length}
              </Text>
            </View>
            <View style={s.padValue}>
              <Text style={s.padValueText}>{buffer || (current.score ?? '—')}</Text>
              <Text style={s.padValueMax}>/{max}</Text>
            </View>
          </View>

          {/* Absent, dispensé, rattrapage : pas de note chiffrée. */}
          <View style={s.chipRow}>
            {STATE_CHIPS.map((c) => (
              <TouchableOpacity
                key={c.state}
                activeOpacity={0.8}
                onPress={() => markState(c.state)}
                style={[s.chip, current.state === c.state && s.chipActive]}
              >
                <Ionicons
                  name={c.icon}
                  size={13}
                  color={current.state === c.state ? colors.white : colors.mutedText}
                />
                <Text
                  style={[s.chipText, current.state === c.state && { color: colors.white }]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.keys}>
            {KEYS.map((k) => (
              <TouchableOpacity
                key={k}
                activeOpacity={0.7}
                onPress={() => press(k)}
                style={[s.key, k === '⌫' && s.keyErase]}
              >
                <Text style={[s.keyText, k === '⌫' && { color: colors.danger }]}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.padActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={commit}
              style={s.nextBtn}
            >
              <Text style={s.nextBtnText}>
                {index < rows.length - 1 ? 'Valider et suivant' : 'Valider'}
              </Text>
              <Ionicons name="arrow-forward" size={17} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSaving || stats.pendingSave === 0}
              onPress={handleSave}
              style={[
                s.saveBtn,
                (isSaving || stats.pendingSave === 0) && { opacity: 0.45 },
              ]}
            >
              {isSaving
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Ionicons name="cloud-upload-outline" size={17} color={colors.white} />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Période fermée : on garde la liste consultable, sans pavé. */}
      {!periodOpen && (
        <View style={s.readOnlyBar}>
          <TouchableOpacity onPress={() => void reload()} style={s.reloadBtn}>
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={s.reloadText}>Actualiser</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

// ── Ligne élève ───────────────────────────────────────────────────────────────

function StudentLine({
  row, max, active, buffer, onPress,
}: {
  row: GradeRow
  max: number
  active: boolean
  buffer: string
  onPress: () => void
}) {
  const hasScore = row.score != null
  const ratio = hasScore ? (row.score ?? 0) / max : null

  const tone = row.state !== 'saisie' ? colors.mutedText
    : ratio == null ? colors.gray[400]
    : ratio >= 0.7 ? colors.secondary
    : ratio >= 0.5 ? colors.text
    : colors.danger

  const label = row.state === 'absent' ? 'ABS'
    : row.state === 'exempte' ? 'DISP'
    : row.state === 'rattrapage' ? 'RATT'
    : buffer || (hasScore ? String(row.score) : '—')

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[s.line, active && s.lineActive]}
    >
      <View style={[s.lineAvatar, active && { backgroundColor: colors.primary }]}>
        <Text style={[s.lineInitials, active && { color: colors.white }]}>
          {initials(row.fullName)}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[s.lineName, active && { fontFamily: fontFamily.heading }]} numberOfLines={1}>
          {row.fullName}
        </Text>
        {row.rollNumber && <Text style={s.lineRoll}>N° {row.rollNumber}</Text>}
      </View>

      {/* Une note saisie mais pas encore envoyée porte un point : c'est
          la distinction §19.3 entre « saisi » et « enregistré ». */}
      {!row.persisted && (row.score != null || row.state !== 'saisie') && (
        <View style={s.unsentDot} />
      )}

      <Text style={[s.lineScore, { color: tone }]}>{label}</Text>
    </TouchableOpacity>
  )
}

// ── En-tête ───────────────────────────────────────────────────────────────────

function Header({
  title, subtitle, onBack, right,
}: {
  title: string
  subtitle: string
  onBack: () => void
  right?: React.ReactNode
}) {
  return (
    <View style={s.header}>
      <TouchableOpacity accessibilityLabel="Retour" onPress={onBack} style={s.backBtn}>
        <Ionicons name="arrow-back" size={19} color={colors.text} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  centerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.mutedText },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm, paddingBottom: spacing.sm + 4,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  headerSub: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText, marginTop: 1 },
  pendingTag: {
    backgroundColor: 'rgba(244,166,42,0.15)',
    borderWidth: 1, borderColor: 'rgba(244,166,42,0.35)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.full,
  },
  pendingTagText: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    fontWeight: fontWeight.bold, color: '#A96A0C',
  },

  railWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingVertical: spacing.sm, paddingLeft: spacing.md + 4,
  },
  assessCard: {
    minWidth: 165,
    backgroundColor: colors.gray[100],
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm,
  },
  assessCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  assessTitle: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  assessMeta: { fontFamily: fontFamily.body, fontSize: 10, color: colors.mutedText, marginTop: 2 },

  lockBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(194,65,59,0.08)',
    borderWidth: 1, borderColor: 'rgba(194,65,59,0.25)',
    borderRadius: radius.lg,
    marginHorizontal: spacing.md + 4, marginTop: spacing.sm,
    padding: spacing.sm + 4,
  },
  lockText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger },

  statsBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md + 4, paddingVertical: spacing.sm + 4,
  },
  statsLeft: { flex: 1, gap: 5 },
  statsProgress: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.mutedText },
  statsStrong: {
    fontFamily: fontFamily.heading, fontWeight: fontWeight.bold, color: colors.text,
  },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.muted, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.secondary },
  avgBox: { alignItems: 'center' },
  avgValue: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.primary,
  },
  avgLabel: { fontFamily: fontFamily.body, fontSize: 10, color: colors.mutedText },

  list: { paddingHorizontal: spacing.md + 4, paddingBottom: spacing.md, gap: 6 },
  line: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm,
  },
  lineActive: { borderColor: colors.primary, borderWidth: 2 },
  lineAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  lineInitials: {
    fontFamily: fontFamily.heading, fontSize: 11,
    fontWeight: fontWeight.bold, color: colors.primary,
  },
  lineName: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.text,
  },
  lineRoll: { fontFamily: fontFamily.body, fontSize: 10, color: colors.mutedText },
  unsentDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: colors.accent,
  },
  lineScore: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, minWidth: 44, textAlign: 'right',
  },

  // Pavé
  pad: {
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm + 4, paddingBottom: spacing.md,
    gap: spacing.sm + 2,
    ...shadow.md,
  },
  padHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  padName: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  padMeta: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText, marginTop: 1 },
  padValue: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  padValueText: {
    fontFamily: fontFamily.heading, fontSize: fontSize['3xl'],
    fontWeight: fontWeight.extrabold, color: colors.primary,
  },
  padValueMax: {
    fontFamily: fontFamily.body, fontSize: fontSize.sm,
    color: colors.mutedText, marginBottom: 5,
  },

  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.muted,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
  },
  chipActive: { backgroundColor: colors.mutedText },
  chipText: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    fontWeight: fontWeight.semibold, color: colors.mutedText,
  },

  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  key: {
    width: '30.5%', flexGrow: 1,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.gray[100],
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 4,
  },
  keyErase: { backgroundColor: 'rgba(194,65,59,0.06)', borderColor: 'rgba(194,65,59,0.20)' },
  keyText: {
    fontFamily: fontFamily.heading, fontSize: fontSize.xl,
    fontWeight: fontWeight.bold, color: colors.text,
  },

  padActions: { flexDirection: 'row', gap: spacing.sm },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4, borderRadius: radius.lg,
  },
  nextBtnText: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.white,
  },
  saveBtn: {
    width: 52, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.secondary, borderRadius: radius.lg,
  },

  readOnlyBar: {
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md, alignItems: 'center',
  },
  reloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reloadText: {
    fontFamily: fontFamily.bodySemi, fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold, color: colors.primary,
  },
})
