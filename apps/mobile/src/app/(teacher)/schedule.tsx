/**
 * Emploi du temps — Professeur
 * Vue semaine avec créneaux par jour, navigation entre semaines
 */
import { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

// ── Types ──────────────────────────────────────────────────────────────────────
interface TimeSlot {
  id:       string
  subject:  string
  class:    string
  room:     string
  start:    string   // "08:00"
  end:      string   // "10:00"
  color:    string
  type:     'course' | 'exam' | 'meeting'
}

interface DaySchedule {
  dayKey:  string   // "lun" | "mar" …
  label:   string   // "Lundi"
  date:    string   // "19 mai"
  slots:   TimeSlot[]
}

// ── Données démo ───────────────────────────────────────────────────────────────
const WEEK_DAYS: Omit<DaySchedule, 'slots'>[] = [
  { dayKey: 'lun', label: 'Lundi',    date: '19 mai' },
  { dayKey: 'mar', label: 'Mardi',    date: '20 mai' },
  { dayKey: 'mer', label: 'Mercredi', date: '21 mai' },
  { dayKey: 'jeu', label: 'Jeudi',    date: '22 mai' },
  { dayKey: 'ven', label: 'Vendredi', date: '23 mai' },
  { dayKey: 'sam', label: 'Samedi',   date: '24 mai' },
]

const SLOTS: Record<string, TimeSlot[]> = {
  lun: [
    { id: 'l1', subject: 'Mathématiques', class: '3ème B', room: 'Salle 12', start: '08:00', end: '10:00', color: '#3b82f6', type: 'course'  },
    { id: 'l2', subject: 'Mathématiques', class: '4ème A', room: 'Salle 08', start: '10:30', end: '12:30', color: '#3b82f6', type: 'course'  },
    { id: 'l3', subject: 'Mathématiques', class: '5ème C', room: 'Salle 05', start: '15:00', end: '17:00', color: '#3b82f6', type: 'course'  },
  ],
  mar: [
    { id: 't1', subject: 'Mathématiques', class: '3ème B', room: 'Salle 12', start: '08:00', end: '10:00', color: '#3b82f6', type: 'course'  },
    { id: 't2', subject: 'Conseil pédagogique', class: 'Staff',  room: 'Salle Direction', start: '13:00', end: '14:00', color: '#7c3aed', type: 'meeting' },
    { id: 't3', subject: 'Mathématiques', class: '4ème A', room: 'Salle 08', start: '15:00', end: '17:00', color: '#3b82f6', type: 'course'  },
  ],
  mer: [
    { id: 'w1', subject: 'Mathématiques', class: '5ème C', room: 'Salle 05', start: '08:00', end: '10:00', color: '#3b82f6', type: 'course'  },
    { id: 'w2', subject: 'Examen — Dérivées', class: '3ème B', room: 'Grande salle', start: '10:30', end: '12:30', color: '#dc2626', type: 'exam' },
  ],
  jeu: [
    { id: 'j1', subject: 'Mathématiques', class: '4ème A', room: 'Salle 08', start: '08:00', end: '10:00', color: '#3b82f6', type: 'course'  },
    { id: 'j2', subject: 'Mathématiques', class: '3ème B', room: 'Salle 12', start: '14:00', end: '16:00', color: '#3b82f6', type: 'course'  },
  ],
  ven: [
    { id: 'v1', subject: 'Mathématiques', class: '5ème C', room: 'Salle 05', start: '09:00', end: '11:00', color: '#3b82f6', type: 'course'  },
    { id: 'v2', subject: 'Permanence élèves', class: 'Tous', room: 'Salle Profs', start: '14:00', end: '15:00', color: '#10b981', type: 'meeting' },
  ],
  sam: [],
}

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  course:  'book-outline',
  exam:    'document-text-outline',
  meeting: 'people-outline',
}

const TYPE_LABEL: Record<string, string> = {
  course:  'Cours',
  exam:    'Examen',
  meeting: 'Réunion',
}

// ── Composant créneau ──────────────────────────────────────────────────────────
function SlotCard({ slot, onPress }: { slot: TimeSlot; onPress: () => void }) {
  const durationMin = (() => {
    const [sh, sm] = slot.start.split(':').map(Number)
    const [eh, em] = slot.end.split(':').map(Number)
    return (eh * 60 + em) - (sh * 60 + sm)
  })()

  return (
    <TouchableOpacity
      style={[styles.slot, { borderLeftColor: slot.color }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.slotLeft}>
        <Text style={styles.slotTime}>{slot.start}</Text>
        <View style={[styles.slotTimeDot, { backgroundColor: slot.color }]} />
        <Text style={[styles.slotTime, { color: colors.gray[400] }]}>{slot.end}</Text>
      </View>

      <View style={styles.slotBody}>
        <View style={styles.slotTopRow}>
          <View style={[styles.slotTypeBadge, { backgroundColor: slot.color + '18' }]}>
            <Ionicons name={TYPE_ICON[slot.type]} size={10} color={slot.color} />
            <Text style={[styles.slotTypeText, { color: slot.color }]}>{TYPE_LABEL[slot.type]}</Text>
          </View>
          <Text style={styles.slotDuration}>{durationMin} min</Text>
        </View>
        <Text style={styles.slotSubject} numberOfLines={1}>{slot.subject}</Text>
        <View style={styles.slotMeta}>
          <Ionicons name="people-outline" size={11} color={colors.gray[400]} />
          <Text style={styles.slotMetaText}>{slot.class}</Text>
          <Text style={styles.slotMetaDot}>·</Text>
          <Ionicons name="location-outline" size={11} color={colors.gray[400]} />
          <Text style={styles.slotMetaText}>{slot.room}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ── Écran principal ────────────────────────────────────────────────────────────
export default function TeacherScheduleScreen() {
  const todayIdx = new Date().getDay() // 0=dim, 1=lun…
  const initDay  = todayIdx >= 1 && todayIdx <= 6 ? todayIdx - 1 : 0
  const [selDay,    setSelDay]    = useState(initDay)
  const [weekOffset, setWeekOffset] = useState(0)

  const schedule = useMemo<DaySchedule[]>(() => (
    WEEK_DAYS.map(d => ({ ...d, slots: SLOTS[d.dayKey] ?? [] }))
  ), [])

  const currentDay   = schedule[selDay]
  const totalWeek    = schedule.reduce((s, d) => s + d.slots.length, 0)
  const examCount    = schedule.reduce((s, d) => s + d.slots.filter(sl => sl.type === 'exam').length, 0)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#312e81" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📅 Emploi du Temps</Text>
          <Text style={styles.headerSub}>Semaine {weekOffset === 0 ? 'en cours' : weekOffset > 0 ? `+${weekOffset}` : weekOffset}</Text>
        </View>
        <View style={styles.weekNav}>
          <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekOffset(w => w - 1)}>
            <Ionicons name="chevron-back" size={18} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekOffset(0)}>
            <Text style={styles.weekNavToday}>Auj.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.weekNavBtn} onPress={() => setWeekOffset(w => w + 1)}>
            <Ionicons name="chevron-forward" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Résumé semaine */}
      <View style={styles.weekSummary}>
        <View style={styles.weekStat}>
          <Text style={styles.weekStatVal}>{totalWeek}</Text>
          <Text style={styles.weekStatLabel}>Créneaux</Text>
        </View>
        <View style={styles.weekStatDivider} />
        <View style={styles.weekStat}>
          <Text style={[styles.weekStatVal, { color: colors.primary }]}>3</Text>
          <Text style={styles.weekStatLabel}>Classes</Text>
        </View>
        <View style={styles.weekStatDivider} />
        <View style={styles.weekStat}>
          <Text style={[styles.weekStatVal, { color: colors.error }]}>{examCount}</Text>
          <Text style={styles.weekStatLabel}>Examens</Text>
        </View>
        <View style={styles.weekStatDivider} />
        <View style={styles.weekStat}>
          <Text style={[styles.weekStatVal, { color: '#7c3aed' }]}>2</Text>
          <Text style={styles.weekStatLabel}>Réunions</Text>
        </View>
      </View>

      {/* Sélecteur de jour */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayPicker}
        contentContainerStyle={styles.dayPickerContent}
      >
        {schedule.map((day, i) => {
          const isSelected = i === selDay
          const hasSlots   = day.slots.length > 0
          const hasExam    = day.slots.some(s => s.type === 'exam')
          return (
            <TouchableOpacity
              key={day.dayKey}
              style={[styles.dayBtn, isSelected && styles.dayBtnActive]}
              onPress={() => setSelDay(i)}
              activeOpacity={0.75}
            >
              <Text style={[styles.dayBtnLabel, isSelected && styles.dayBtnLabelActive]}>
                {day.label.slice(0, 3)}
              </Text>
              <Text style={[styles.dayBtnDate, isSelected && styles.dayBtnDateActive]}>
                {day.date.split(' ')[0]}
              </Text>
              {hasSlots && (
                <View style={[
                  styles.dayBtnDot,
                  { backgroundColor: hasExam ? colors.error : isSelected ? colors.white : colors.primary },
                ]} />
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Créneaux du jour sélectionné */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.slotsContainer}
      >
        <View style={styles.dayTitle}>
          <Text style={styles.dayTitleText}>{currentDay.label} {currentDay.date}</Text>
          <Text style={styles.dayTitleCount}>
            {currentDay.slots.length === 0
              ? 'Pas de cours'
              : `${currentDay.slots.length} créneau${currentDay.slots.length > 1 ? 'x' : ''}`}
          </Text>
        </View>

        {currentDay.slots.length === 0 ? (
          <View style={styles.emptyDay}>
            <Text style={{ fontSize: 44 }}>🎉</Text>
            <Text style={styles.emptyDayTitle}>Journée libre</Text>
            <Text style={styles.emptyDaySub}>Aucun cours prévu ce jour.</Text>
          </View>
        ) : (
          currentDay.slots.map(slot => (
            <SlotCard
              key={slot.id}
              slot={slot}
              onPress={() => {}}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#312e81', paddingHorizontal: spacing.lg,
    paddingTop: spacing.md, paddingBottom: spacing.lg,
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.white },
  headerSub:   { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  weekNav:     { flexDirection: 'row', gap: 4 },
  weekNavBtn:  { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  weekNavToday:{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.white },

  weekSummary: {
    flexDirection: 'row', backgroundColor: colors.white,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  weekStat:        { flex: 1, alignItems: 'center' },
  weekStatVal:     { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  weekStatLabel:   { fontSize: fontSize.xs, color: colors.gray[500], marginTop: 2 },
  weekStatDivider: { width: 1, backgroundColor: colors.gray[100] },

  dayPicker:        { maxHeight: 80, borderBottomWidth: 1, borderBottomColor: colors.gray[100], backgroundColor: colors.white },
  dayPickerContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  dayBtn: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.lg, minWidth: 58,
    backgroundColor: colors.gray[50],
  },
  dayBtnActive:       { backgroundColor: '#312e81' },
  dayBtnLabel:        { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.gray[500] },
  dayBtnLabelActive:  { color: colors.white },
  dayBtnDate:         { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[700], marginTop: 2 },
  dayBtnDateActive:   { color: colors.white },
  dayBtnDot:          { width: 5, height: 5, borderRadius: 3, marginTop: 4 },

  slotsContainer: { padding: spacing.md, paddingBottom: 40, gap: spacing.sm },

  dayTitle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs,
  },
  dayTitleText:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.gray[900] },
  dayTitleCount: { fontSize: fontSize.xs, color: colors.gray[400] },

  emptyDay:      { alignItems: 'center', paddingVertical: 52, gap: spacing.sm },
  emptyDayTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.gray[700] },
  emptyDaySub:   { fontSize: fontSize.sm, color: colors.gray[400] },

  slot: {
    flexDirection: 'row', gap: spacing.sm,
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.md, borderLeftWidth: 4, ...shadow.sm,
  },
  slotLeft: { alignItems: 'center', width: 40, gap: 4 },
  slotTime: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.gray[500] },
  slotTimeDot: { width: 6, height: 6, borderRadius: 3, flex: 0 },

  slotBody:     { flex: 1, gap: 5 },
  slotTopRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotTypeBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full },
  slotTypeText: { fontSize: 10, fontWeight: fontWeight.bold },
  slotDuration: { fontSize: 10, color: colors.gray[400] },
  slotSubject:  { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.gray[900] },
  slotMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slotMetaText: { fontSize: fontSize.xs, color: colors.gray[400] },
  slotMetaDot:  { fontSize: fontSize.xs, color: colors.gray[300] },
})
