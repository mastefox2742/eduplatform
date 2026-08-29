/**
 * Mon emploi du temps — enseignant.
 *
 * Cahier des charges §10.1, §12.1.
 *
 * La grille et sa logique vivent dans `WeekScheduleView`, partagé avec
 * l'élève : les remplacements et annulations doivent s'afficher de la
 * même façon des deux côtés, sinon professeur et classe ne lisent pas
 * le même emploi du temps.
 */
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing, fontSize, fontWeight, fontFamily } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import { WeekScheduleView } from '@/components/ui/WeekScheduleView'
import { BottomNav, TEACHER_TABS } from '@/components/ui/BottomNav'

export default function TeacherScheduleScreen() {
  const { profile } = useAuth()

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Mon emploi du temps</Text>
        <Text style={s.subtitle} numberOfLines={1}>
          {profile?.displayName ?? 'Enseignant'}
        </Text>
      </View>

      <WeekScheduleView mode="teacher" />

      <BottomNav tabs={TEACHER_TABS} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm + 4,
  },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.mutedText,
    marginTop: 1,
  },
})
