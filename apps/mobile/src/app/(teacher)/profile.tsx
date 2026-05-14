/**
 * Profil Professeur
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

export default function TeacherProfileScreen() {
  const { profile, logout } = useAuth()
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.displayName?.charAt(0) ?? 'P'}</Text>
        </View>
        <Text style={styles.name}>{profile?.displayName ?? 'Professeur'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="school" size={14} color={colors.primary} />
          <Text style={styles.roleText}>Professeur · Collège Demo</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  avatar:    { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText:{ fontSize: 32, fontWeight: fontWeight.bold, color: colors.primary },
  name:      { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  email:     { fontSize: fontSize.sm, color: colors.gray[500] },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary + '12', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  roleText:  { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.error + '10', borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginTop: spacing.lg },
  logoutText:{ fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.semibold },
})
