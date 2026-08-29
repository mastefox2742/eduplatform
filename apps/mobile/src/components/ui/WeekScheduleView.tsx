/**
 * Vue d'emploi du temps de la semaine.
 *
 * Cahier des charges §10.1, §12.1, §15.5.
 *
 * Un seul composant sert au professeur et à l'élève : la grille est la
 * même, seul le sous-titre change (la classe pour l'un, l'enseignant
 * pour l'autre).
 *
 * Le parti pris : **une journée à la fois**, pas une grille hebdomadaire
 * compressée. Sur un écran de téléphone, six colonnes rendent les
 * libellés illisibles ; on choisit son jour dans un rail, et la journée
 * s'affiche en pleine largeur.
 */
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, fontFamily, shadow } from '@/theme'
import { useWeekSchedule, type ScheduleEntry } from '@/hooks/useWeekSchedule'
import { EmptyState } from '@/components/ui/DesignSystem'
import { useState } from 'react'

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function WeekScheduleView({ mode }: { mode: 'teacher' | 'student' }) {
  const { days, weekOffset, weekLabel, totalHours, isLoading, error, goToWeek } =
    useWeekSchedule(mode)

  const todayIndex = days.findIndex((d) => d.isToday)
  const [selected, setSelected] = useState<number>(todayIndex >= 0 ? todayIndex : 0)

  // Si la semaine change, on revient sur le premier jour qui a cours.
  const day = days[selected] ?? days[0] ?? null
  const now = nowHHMM()

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={s.centerText}>Chargement de l’emploi du temps…</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ── Navigation de semaine ────────────────────────────────── */}
      <View style={s.weekBar}>
        <TouchableOpacity
          accessibilityLabel="Semaine précédente"
          onPress={() => goToWeek(weekOffset - 1)}
          style={s.weekBtn}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.weekLabel} numberOfLines={1}>{weekLabel}</Text>
          <Text style={s.weekHours}>
            {totalHours} h de cours
            {weekOffset !== 0 ? '' : ' cette semaine'}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityLabel="Semaine suivante"
          onPress={() => goToWeek(weekOffset + 1)}
          style={s.weekBtn}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* ── Rail des jours ───────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.dayRail}
      >
        {days.map((d, i) => {
          const active = i === selected
          const count = d.entries.filter((e) => e.status !== 'annule').length
          return (
            <TouchableOpacity
              key={d.dayOfWeek}
              activeOpacity={0.85}
              onPress={() => setSelected(i)}
              style={[s.dayChip, active && s.dayChipActive, d.isToday && !active && s.dayChipToday]}
            >
              <Text style={[s.dayShort, active && { color: colors.white }]}>{d.shortLabel}</Text>
              <Text style={[s.dayNum, active && { color: colors.white }]}>{d.date.getDate()}</Text>
              {count > 0 && (
                <View style={[s.dayDot, active && { backgroundColor: colors.white }]} />
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {error && (
        <View style={s.errorBanner}>
          <Ionicons name="close-circle" size={16} color={colors.danger} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {/* ── Journée sélectionnée ─────────────────────────────────── */}
      {!day || day.entries.length === 0 ? (
        <EmptyState
          icon="calendar-clear-outline"
          title="Aucun cours ce jour"
          detail={
            day?.isToday
              ? 'Rien n’est programmé aujourd’hui.'
              : `Rien n’est programmé le ${day?.label.toLowerCase() ?? 'ce jour'}.`
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.dayTitle}>
            {day.label} {day.date.getDate()}
            {day.isToday ? ' · aujourd’hui' : ''}
          </Text>

          {day.entries.map((entry) => (
            <SlotCard
              key={entry.id}
              entry={entry}
              mode={mode}
              isNow={day.isToday && now >= entry.startTime && now <= entry.endTime}
              isPast={day.isToday && now > entry.endTime}
            />
          ))}
        </ScrollView>
      )}
    </View>
  )
}

// ── Créneau ───────────────────────────────────────────────────────────────────

function SlotCard({
  entry, mode, isNow, isPast,
}: {
  entry: ScheduleEntry
  mode: 'teacher' | 'student'
  isNow: boolean
  isPast: boolean
}) {
  const cancelled = entry.status === 'annule'
  const replaced = entry.status === 'remplace'

  // Le professeur veut savoir quelle classe ; l'élève, quel professeur.
  const subtitle = mode === 'teacher'
    ? entry.className ?? 'Classe non affectée'
    : replaced
      ? `Remplacé par ${entry.replacementName}`
      : entry.teacherName ?? 'Enseignant non affecté'

  return (
    <View style={s.slotRow}>
      {/* Colonne horaire : elle aligne toute la journée. */}
      <View style={s.timeCol}>
        <Text style={[s.timeStart, isNow && { color: colors.primary }]}>{entry.startTime}</Text>
        <View style={[s.timeLine, isNow && { backgroundColor: colors.primary }]} />
        <Text style={s.timeEnd}>{entry.endTime}</Text>
      </View>

      <View
        style={[
          s.slotCard,
          isNow && s.slotCardNow,
          cancelled && s.slotCardCancelled,
          isPast && !isNow && !cancelled && { opacity: 0.55 },
        ]}
      >
        <View style={s.slotHead}>
          <Text
            style={[
              s.slotSubject,
              isNow && { color: colors.white },
              cancelled && s.strikethrough,
            ]}
            numberOfLines={1}
          >
            {entry.subjectName}
          </Text>

          {cancelled ? (
            <View style={s.cancelTag}>
              <Text style={s.cancelTagText}>Annulé</Text>
            </View>
          ) : replaced ? (
            <View style={s.replaceTag}>
              <Text style={s.replaceTagText}>Remplacé</Text>
            </View>
          ) : isNow ? (
            <View style={s.nowTag}>
              <Text style={s.nowTagText}>EN COURS</Text>
            </View>
          ) : null}
        </View>

        <Text
          style={[s.slotSub, isNow && { color: 'rgba(255,255,255,0.85)' }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>

        <View style={s.slotFoot}>
          <View style={s.slotMeta}>
            <Ionicons
              name="location-outline"
              size={12}
              color={isNow ? 'rgba(255,255,255,0.8)' : colors.mutedText}
            />
            {/* Une salle inconnue se dit, elle ne s'invente pas. */}
            <Text style={[s.slotMetaText, isNow && { color: 'rgba(255,255,255,0.8)' }]}>
              {entry.room ?? 'Salle à confirmer'}
            </Text>
          </View>
          <Text style={[s.slotDuration, isNow && { color: 'rgba(255,255,255,0.8)' }]}>
            {Math.round(entry.durationMin / 60 * 10) / 10} h
          </Text>
        </View>
      </View>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  centerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.mutedText },

  weekBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md + 4, paddingVertical: spacing.sm + 2,
  },
  weekBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  weekLabel: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  weekHours: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText, marginTop: 1 },

  dayRail: { paddingHorizontal: spacing.md + 4, gap: spacing.sm, paddingBottom: spacing.sm },
  dayChip: {
    width: 54, alignItems: 'center', gap: 2,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingVertical: spacing.sm,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipToday: { borderColor: colors.primary, borderWidth: 2 },
  dayShort: {
    fontFamily: fontFamily.body, fontSize: 10,
    color: colors.mutedText, textTransform: 'uppercase',
  },
  dayNum: {
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 1 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(194,65,59,0.08)',
    borderWidth: 1, borderColor: 'rgba(194,65,59,0.25)',
    borderRadius: radius.lg,
    marginHorizontal: spacing.md + 4, padding: spacing.sm + 4,
  },
  errorText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger },

  list: {
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm,
    paddingBottom: 120,
  },
  dayTitle: {
    fontFamily: fontFamily.heading, fontSize: fontSize.sm,
    fontWeight: fontWeight.bold, color: colors.text,
    marginBottom: spacing.sm + 2,
  },

  slotRow: { flexDirection: 'row', gap: spacing.sm + 2, marginBottom: spacing.sm + 2 },
  timeCol: { width: 44, alignItems: 'center', paddingTop: 2 },
  timeStart: {
    fontFamily: fontFamily.bodySemi, fontSize: 11,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  timeLine: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 4, borderRadius: 1 },
  timeEnd: { fontFamily: fontFamily.body, fontSize: 10, color: colors.mutedText },

  slotCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.sm + 4,
    ...shadow.sm,
  },
  slotCardNow: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotCardCancelled: {
    backgroundColor: colors.gray[100],
    borderColor: 'rgba(194,65,59,0.25)',
  },
  slotHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: spacing.sm,
  },
  slotSubject: {
    flex: 1,
    fontFamily: fontFamily.heading, fontSize: fontSize.base,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  strikethrough: { textDecorationLine: 'line-through', color: colors.mutedText },
  slotSub: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.mutedText, marginTop: 2,
  },
  slotFoot: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: spacing.sm,
  },
  slotMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slotMetaText: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText },
  slotDuration: { fontFamily: fontFamily.body, fontSize: 11, color: colors.mutedText },

  nowTag: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4,
  },
  nowTagText: {
    fontFamily: fontFamily.bodySemi, fontSize: 9,
    fontWeight: fontWeight.bold, color: colors.white, letterSpacing: 0.4,
  },
  cancelTag: {
    backgroundColor: 'rgba(194,65,59,0.12)',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4,
  },
  cancelTagText: {
    fontFamily: fontFamily.bodySemi, fontSize: 10,
    fontWeight: fontWeight.bold, color: colors.danger,
  },
  replaceTag: {
    backgroundColor: 'rgba(244,166,42,0.18)',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4,
  },
  replaceTagText: {
    fontFamily: fontFamily.bodySemi, fontSize: 10,
    fontWeight: fontWeight.bold, color: '#A96A0C',
  },
})
