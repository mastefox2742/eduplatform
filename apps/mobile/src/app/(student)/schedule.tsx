/**
 * Mon emploi du temps — élève.
 *
 * Cahier des charges §15.5 : « alertes de changement de salle, cours
 * annulé ou remplacement ». La grille et sa logique sont partagées avec
 * l'enseignant (`WeekScheduleView`) pour que les deux lisent le même
 * état du jour.
 */
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing, fontSize, fontWeight, fontFamily } from '@/theme'
import { useAuth } from '@/hooks/useAuth'
import { WeekScheduleView } from '@/components/ui/WeekScheduleView'
import { BottomNav, STUDENT_TABS } from '@/components/ui/BottomNav'

export default function StudentScheduleScreen() {
  const { profile } = useAuth()

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Mon emploi du temps</Text>
        <Text style={s.subtitle} numberOfLines={1}>
          {profile?.className ?? 'Ma classe'}
        </Text>
      </View>

      <WeekScheduleView mode="student" />

      <BottomNav tabs={STUDENT_TABS} />
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
