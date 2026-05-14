import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const FULL_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

const SUBJECT_COLORS: Record<string, string> = {
  'Mathématiques': '#3b82f6',
  'Français':      '#8b5cf6',
  'Histoire':      '#f59e0b',
  'SVT':           '#10b981',
  'Anglais':       '#06b6d4',
  'Physique':      '#f43f5e',
  'Sport':         '#84cc16',
  'Philosophie':   '#6366f1',
}

const SCHEDULE: Record<number, { time: string; subject: string; room: string; teacher: string; duration: number }[]> = {
  0: [
    { time: '08:00', subject: 'Mathématiques', room: 'S.12', teacher: 'M. Leblanc',   duration: 2 },
    { time: '10:00', subject: 'Physique',       room: 'Lab.1',teacher: 'M. Traoré',   duration: 2 },
    { time: '14:00', subject: 'Histoire',       room: 'S.05', teacher: 'Mme Camara',  duration: 1 },
    { time: '15:00', subject: 'Anglais',        room: 'S.09', teacher: 'Mme Martin',  duration: 2 },
  ],
  1: [
    { time: '08:00', subject: 'Français',       room: 'S.04', teacher: 'Mme Diallo',  duration: 2 },
    { time: '10:00', subject: 'SVT',            room: 'Lab.2',teacher: 'M. Koné',     duration: 2 },
    { time: '14:00', subject: 'Sport',          room: 'Gym',  teacher: 'M. Barry',    duration: 2 },
  ],
  2: [
    { time: '08:00', subject: 'Mathématiques', room: 'S.12', teacher: 'M. Leblanc',   duration: 1 },
    { time: '10:00', subject: 'Philosophie',   room: 'S.03', teacher: 'Mme Sylla',    duration: 2 },
    { time: '14:00', subject: 'Anglais',       room: 'S.09', teacher: 'Mme Martin',   duration: 1 },
  ],
  3: [
    { time: '08:00', subject: 'Physique',      room: 'Lab.1',teacher: 'M. Traoré',    duration: 2 },
    { time: '10:00', subject: 'Histoire',      room: 'S.05', teacher: 'Mme Camara',   duration: 2 },
    { time: '14:00', subject: 'Français',      room: 'S.04', teacher: 'Mme Diallo',   duration: 2 },
  ],
  4: [
    { time: '08:00', subject: 'SVT',           room: 'Lab.2',teacher: 'M. Koné',      duration: 2 },
    { time: '10:00', subject: 'Mathématiques', room: 'S.12', teacher: 'M. Leblanc',   duration: 2 },
    { time: '14:00', subject: 'Sport',         room: 'Gym',  teacher: 'M. Barry',     duration: 2 },
  ],
}

export default function ScheduleScreen() {
  const today = new Date().getDay() === 0 ? 1 : Math.min(new Date().getDay() - 1, 5)
  const [selectedDay, setSelectedDay] = useState(today)

  const slots = SCHEDULE[selectedDay] ?? []

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Emploi du temps</Text>
        <Text style={styles.subtitle}>Semaine en cours</Text>
      </View>

      {/* Sélecteur de jour */}
      <View style={styles.daySelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayList}>
          {DAYS.map((day, i) => {
            const isToday   = i === today
            const isSelected = i === selectedDay
            const hasClass  = (SCHEDULE[i] ?? []).length > 0

            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayBtn, isSelected && styles.dayBtnActive]}
                onPress={() => setSelectedDay(i)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>{day}</Text>
                {isToday && <View style={[styles.todayDot, isSelected && styles.todayDotActive]} />}
                {!isToday && hasClass && <View style={styles.hasClassDot} />}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Cours du jour */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.dayTitle}>{FULL_DAYS[selectedDay]}</Text>

        {slots.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>Pas de cours !</Text>
            <Text style={styles.emptyText}>Tu as cette journée de libre.</Text>
          </View>
        ) : (
          slots.map((slot, i) => {
            const color = SUBJECT_COLORS[slot.subject] ?? colors.primary
            return (
              <View key={i} style={styles.slotCard}>
                <View style={[styles.colorBar, { backgroundColor: color }]} />
                <View style={styles.slotLeft}>
                  <Text style={styles.slotTime}>{slot.time}</Text>
                  <Text style={styles.slotDuration}>{slot.duration}h</Text>
                </View>
                <View style={styles.slotInfo}>
                  <Text style={styles.slotSubject}>{slot.subject}</Text>
                  <Text style={styles.slotTeacher}>{slot.teacher}</Text>
                  <View style={styles.roomBadge}>
                    <Text style={styles.roomBadgeText}>📍 {slot.room}</Text>
                  </View>
                </View>
              </View>
            )
          })
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.sm,
    backgroundColor:   colors.white,
  },
  title:    { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  subtitle: { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 2 },

  daySelector: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  dayList: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    gap: spacing.xs,
  },
  dayBtn: {
    width:           52,
    height:          52,
    borderRadius:    radius.md,
    alignItems:      'center',
    justifyContent:  'center',
    marginHorizontal: 3,
  },
  dayBtnActive: {
    backgroundColor: colors.primary,
  },
  dayLabel:       { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[600] },
  dayLabelActive: { color: colors.white },
  todayDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 3 },
  todayDotActive:{ backgroundColor: colors.white },
  hasClassDot:   { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.gray[300], marginTop: 3 },

  content:  { flex: 1, padding: spacing.lg },
  dayTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.gray[700], marginBottom: spacing.md },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon:  { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.gray[700] },
  emptyText:  { fontSize: fontSize.sm, color: colors.gray[500], marginTop: spacing.xs },

  slotCard: {
    flexDirection:   'row',
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    marginBottom:    spacing.sm,
    overflow:        'hidden',
    ...shadow.sm,
  },
  colorBar: { width: 5 },
  slotLeft: {
    width:          70,
    padding:        spacing.md,
    alignItems:     'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.gray[100],
  },
  slotTime:     { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray[800] },
  slotDuration: { fontSize: fontSize.xs, color: colors.gray[400], marginTop: 2 },
  slotInfo:     { flex: 1, padding: spacing.md },
  slotSubject:  { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.gray[900] },
  slotTeacher:  { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 2 },
  roomBadge: {
    alignSelf:       'flex-start',
    marginTop:       spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius:    radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical:  2,
  },
  roomBadgeText: { fontSize: fontSize.xs, color: colors.gray[600], fontWeight: fontWeight.medium },
})
