import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'
import { BurgerMenu } from '@/components/ui/BurgerMenu'

const FILTERS = ['Tout', 'Absences', 'Retards', 'Justifiées']

const RECORDS = [
  {
    date: '2026-04-28', day: 'Lundi',
    type: 'absence', status: 'justified',
    subject: 'Mathématiques', duration: '2h',
    reason: 'Rendez-vous médical', teacher: 'M. Leblanc',
  },
  {
    date: '2026-04-15', day: 'Mercredi',
    type: 'late', status: 'unjustified',
    subject: 'Français', duration: '20min',
    reason: null, teacher: 'Mme Diallo',
  },
  {
    date: '2026-04-10', day: 'Vendredi',
    type: 'absence', status: 'unjustified',
    subject: 'Physique-Chimie', duration: '4h',
    reason: null, teacher: 'M. Traoré',
  },
  {
    date: '2026-03-22', day: 'Lundi',
    type: 'late', status: 'justified',
    subject: 'SVT', duration: '15min',
    reason: 'Problème de transport', teacher: 'M. Koné',
  },
  {
    date: '2026-03-15', day: 'Jeudi',
    type: 'absence', status: 'justified',
    subject: 'Journée', duration: 'Journée',
    reason: 'Maladie (certificat fourni)', teacher: null,
  },
]

const STATS = [
  { label: 'Absences',  value: 3, color: colors.danger,  icon: 'close-circle' as const },
  { label: 'Retards',   value: 2, color: colors.warning, icon: 'time' as const },
  { label: 'Justifiées',value: 3, color: colors.success, icon: 'checkmark-circle' as const },
  { label: 'En attente',value: 2, color: colors.gray[400],icon: 'hourglass' as const },
]

export default function AbsencesScreen() {
  const [filter, setFilter] = useState('Tout')

  const filtered = RECORDS.filter(r => {
    if (filter === 'Tout') return true
    if (filter === 'Absences')   return r.type === 'absence'
    if (filter === 'Retards')    return r.type === 'late'
    if (filter === 'Justifiées') return r.status === 'justified'
    return true
  })

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Absences & Retards</Text>
          <Text style={styles.subtitle}>Année 2025-2026</Text>
        </View>
        <BurgerMenu iconColor={colors.gray[700]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={20} color={s.color} />
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Liste */}
        <View style={styles.list}>
          {filtered.map((r, i) => (
            <View key={i} style={styles.recordCard}>
              {/* Indicateur gauche */}
              <View style={[
                styles.indicator,
                { backgroundColor: r.type === 'absence' ? colors.danger : colors.warning }
              ]} />

              <View style={styles.recordContent}>
                <View style={styles.recordTop}>
                  <View>
                    <Text style={styles.recordDate}>{r.day} {r.date.split('-').reverse().join('/')}</Text>
                    <Text style={styles.recordSubject}>{r.subject}</Text>
                  </View>
                  <View style={styles.recordBadges}>
                    <View style={[
                      styles.typeBadge,
                      { backgroundColor: r.type === 'absence' ? colors.danger + '15' : colors.warning + '15' }
                    ]}>
                      <Text style={[
                        styles.typeBadgeText,
                        { color: r.type === 'absence' ? colors.danger : colors.warning }
                      ]}>
                        {r.type === 'absence' ? 'Absence' : 'Retard'}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: r.status === 'justified' ? colors.success + '15' : colors.gray[100] }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: r.status === 'justified' ? colors.success : colors.gray[500] }
                      ]}>
                        {r.status === 'justified' ? '✓ Justifiée' : '⏳ En attente'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.recordMeta}>
                  <Ionicons name="time-outline" size={13} color={colors.gray[400]} />
                  <Text style={styles.recordMetaText}>{r.duration}</Text>
                  {r.teacher && (
                    <>
                      <Text style={styles.metaDot}>·</Text>
                      <Ionicons name="person-outline" size={13} color={colors.gray[400]} />
                      <Text style={styles.recordMetaText}>{r.teacher}</Text>
                    </>
                  )}
                </View>

                {r.reason && (
                  <View style={styles.reasonRow}>
                    <Ionicons name="document-text-outline" size={13} color={colors.success} />
                    <Text style={styles.reasonText}>{r.reason}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            Pour justifier une absence, présentez un document officiel à l'administration.
          </Text>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  title:    { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  subtitle: { fontSize: fontSize.sm, color: colors.gray[500], marginTop: 2 },

  statsRow: {
    flexDirection:    'row',
    padding:          spacing.lg,
    gap:              spacing.sm,
  },
  statCard: {
    flex:            1,
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    padding:         spacing.sm,
    alignItems:      'center',
    gap:             4,
    ...shadow.sm,
  },
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  statLabel: { fontSize: 10, color: colors.gray[500], textAlign: 'center' },

  filterScroll: { paddingLeft: spacing.lg, marginBottom: spacing.md },
  filterRow:    { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.lg },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    borderRadius:      radius.full,
    backgroundColor:   colors.gray[100],
  },
  filterBtnActive:  { backgroundColor: colors.primary },
  filterText:       { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[600] },
  filterTextActive: { color: colors.white },

  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },

  recordCard: {
    flexDirection:   'row',
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    ...shadow.sm,
  },
  indicator: { width: 4 },
  recordContent: { flex: 1, padding: spacing.md },
  recordTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   spacing.sm,
  },
  recordDate:    { fontSize: fontSize.xs, color: colors.gray[500] },
  recordSubject: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gray[900], marginTop: 2 },
  recordBadges:  { gap: 4, alignItems: 'flex-end' },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   2,
    borderRadius:      radius.full,
  },
  typeBadgeText: { fontSize: 10, fontWeight: fontWeight.semibold },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   2,
    borderRadius:      radius.full,
  },
  statusBadgeText: { fontSize: 10, fontWeight: fontWeight.medium },

  recordMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    marginBottom:  spacing.xs,
  },
  recordMetaText: { fontSize: fontSize.xs, color: colors.gray[500] },
  metaDot:        { color: colors.gray[300], marginHorizontal: 2 },

  reasonRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    backgroundColor: colors.success + '10',
    borderRadius:   radius.sm,
    padding:        spacing.xs,
  },
  reasonText: { fontSize: fontSize.xs, color: colors.success, flex: 1 },

  infoBox: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    gap:            spacing.sm,
    margin:         spacing.lg,
    padding:        spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius:   radius.lg,
  },
  infoText: { flex: 1, fontSize: fontSize.xs, color: colors.primary, lineHeight: 18 },
})
