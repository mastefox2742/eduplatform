/**
 * Composants du design system — mobile.
 *
 * Repris des maquettes `eleve---dashboard`, `enseignant---appel-et-notes`,
 * `parent---dashboard`, `direction---dashboard`.
 *
 * Le web dispose des mêmes briques sous forme de classes Tailwind
 * (`apps/web/src/styles/globals.css`). Les valeurs sont identiques des
 * deux côtés : une carte mobile et une carte web doivent être
 * indiscernables sur une capture.
 */
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, fontFamily, shadow } from '@/theme'

// ── Typographie ───────────────────────────────────────────────────────────────

/** Titre de section : Manrope gras, comme dans toutes les maquettes. */
export function SectionTitle({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.sectionTitle, style]}>{children}</Text>
}

export function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionSubtitle}>{children}</Text>
}

/**
 * En-tête de section avec action facultative à droite.
 * Motif répété dans chaque écran : titre + compteur ou lien.
 */
export function SectionHeader({
  title, subtitle, right,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={{ flex: 1 }}>
        <SectionTitle>{title}</SectionTitle>
        {subtitle ? <SectionSubtitle>{subtitle}</SectionSubtitle> : null}
      </View>
      {right}
    </View>
  )
}

// ── Carte ─────────────────────────────────────────────────────────────────────

export function Card({
  children, style, onPress, padded = true,
}: {
  children: React.ReactNode
  style?: ViewStyle
  onPress?: () => void
  padded?: boolean
}) {
  const content = (
    <View style={[s.card, padded && s.cardPadded, style]}>{children}</View>
  )
  return onPress
    ? <TouchableOpacity activeOpacity={0.75} onPress={onPress}>{content}</TouchableOpacity>
    : content
}

// ── Pastille ──────────────────────────────────────────────────────────────────

export type Tone = 'primary' | 'secondary' | 'accent' | 'danger' | 'muted'

const TONE_BG: Record<Tone, string> = {
  primary:   'rgba(20, 93, 160, 0.10)',
  secondary: 'rgba(15, 118, 110, 0.10)',
  accent:    'rgba(244, 166, 42, 0.15)',
  danger:    'rgba(194, 65, 59, 0.10)',
  muted:     colors.muted,
}

const TONE_FG: Record<Tone, string> = {
  primary:   colors.primary,
  secondary: colors.secondary,
  accent:    '#A96A0C',
  danger:    colors.danger,
  muted:     colors.mutedText,
}

export function Chip({
  label, tone = 'muted', icon,
}: {
  label: string
  tone?: Tone
  icon?: keyof typeof Ionicons.glyphMap
}) {
  return (
    <View style={[s.chip, { backgroundColor: TONE_BG[tone] }]}>
      {icon ? <Ionicons name={icon} size={12} color={TONE_FG[tone]} /> : null}
      <Text style={[s.chipText, { color: TONE_FG[tone] }]}>{label}</Text>
    </View>
  )
}

// ── Tuile d'indicateur ────────────────────────────────────────────────────────

export function StatTile({
  label, value, sublabel, icon, tone = 'primary', onPress,
}: {
  label: string
  value: string | number
  sublabel?: string
  icon?: keyof typeof Ionicons.glyphMap
  tone?: Tone
  onPress?: () => void
}) {
  return (
    <Card onPress={onPress} style={{ flex: 1 }}>
      <View style={s.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
          <Text style={s.statValue}>{value}</Text>
          {sublabel ? <Text style={s.statSub}>{sublabel}</Text> : null}
        </View>
        {icon ? (
          <View style={[s.iconPill, { backgroundColor: TONE_BG[tone] }]}>
            <Ionicons name={icon} size={18} color={TONE_FG[tone]} />
          </View>
        ) : null}
      </View>
    </Card>
  )
}

// ── Ligne d'alerte ────────────────────────────────────────────────────────────

/** Motif « À ne pas manquer » des maquettes direction et parent. */
export function AlertRow({
  icon, title, detail, tone = 'accent', right, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  detail?: string
  tone?: Tone
  right?: React.ReactNode
  onPress?: () => void
}) {
  const Wrapper: React.ElementType = onPress ? TouchableOpacity : View
  return (
    <Wrapper activeOpacity={0.75} onPress={onPress} style={s.alertRow}>
      <View style={[s.iconPill, { backgroundColor: TONE_BG[tone] }]}>
        <Ionicons name={icon} size={17} color={TONE_FG[tone]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.alertTitle} numberOfLines={1}>{title}</Text>
        {detail ? <Text style={s.alertDetail} numberOfLines={1}>{detail}</Text> : null}
      </View>
      {right}
    </Wrapper>
  )
}

// ── Bandeau de synchronisation ────────────────────────────────────────────────

/**
 * Bandeau d'état hors ligne — repris de la maquette élève.
 *
 * §19.3 : « aucune affirmation de succès final tant que le serveur
 * n'a pas confirmé l'opération ». Le libellé doit donc dire ce qui
 * attend, pas prétendre que c'est fait.
 */
export function SyncBanner({
  pending, lastSync, online,
}: {
  pending: number
  lastSync?: string
  online: boolean
}) {
  const tone: Tone = pending > 0 ? 'accent' : online ? 'secondary' : 'muted'
  const label = pending > 0
    ? `${pending} opération${pending > 1 ? 's' : ''} en attente d'envoi`
    : online
      ? `Synchronisé${lastSync ? ` · ${lastSync}` : ''}`
      : 'Hors ligne · saisie possible'

  return (
    <View style={[s.syncBanner, { backgroundColor: TONE_BG[tone] }]}>
      <View style={s.row}>
        <View style={[s.dot, { backgroundColor: TONE_FG[tone] }]} />
        <Text style={[s.syncText, { color: colors.text }]}>{label}</Text>
      </View>
      <Ionicons
        name={pending > 0 ? 'cloud-upload-outline' : online ? 'cloud-done-outline' : 'cloud-offline-outline'}
        size={15}
        color={TONE_FG[tone]}
      />
    </View>
  )
}

// ── Rail horizontal ───────────────────────────────────────────────────────────

/** Bandeau défilant du planning du jour (maquette élève). */
export function Rail({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm + 2, paddingRight: spacing.md }}
    >
      {children}
    </ScrollView>
  )
}

// ── Bouton ────────────────────────────────────────────────────────────────────

export function Button({
  label, onPress, tone = 'primary', icon, disabled, full,
}: {
  label: string
  onPress: () => void
  tone?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
  icon?: keyof typeof Ionicons.glyphMap
  disabled?: boolean
  full?: boolean
}) {
  const bg = {
    primary:   colors.primary,
    secondary: colors.secondary,
    danger:    colors.danger,
    outline:   'transparent',
    ghost:     'transparent',
  }[tone]

  const fg = tone === 'outline' ? colors.primary
    : tone === 'ghost' ? colors.mutedText
    : colors.white

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        s.button,
        { backgroundColor: bg },
        tone === 'outline' && { borderWidth: 1, borderColor: 'rgba(20, 93, 160, 0.30)' },
        full && { alignSelf: 'stretch' },
        disabled && { opacity: 0.5 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
      <Text style={[s.buttonText, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  )
}

// ── État vide ─────────────────────────────────────────────────────────────────

export function EmptyState({
  icon = 'document-text-outline', title, detail,
}: {
  icon?: keyof typeof Ionicons.glyphMap
  title: string
  detail?: string
}) {
  return (
    <View style={s.empty}>
      <View style={[s.iconPill, { width: 52, height: 52, backgroundColor: colors.muted }]}>
        <Ionicons name={icon} size={24} color={colors.mutedText} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      {detail ? <Text style={s.emptyDetail}>{detail}</Text> : null}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },

  sectionTitle: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.mutedText,
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
    gap: spacing.sm,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  cardPadded: { padding: spacing.md },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },

  iconPill: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.xs,
    color: colors.mutedText,
  },
  statValue: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: 2,
  },
  statSub: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.mutedText,
    marginTop: 1,
  },

  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertTitle: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  alertDetail: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.mutedText,
    marginTop: 1,
  },

  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  syncText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.xs,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.lg,
  },
  buttonText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm + 4,
  },
  emptyDetail: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: 4,
  },
})
