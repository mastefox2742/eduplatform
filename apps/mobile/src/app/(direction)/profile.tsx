/**
 * Profil Direction
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight } from '@/theme'

export default function DirectionProfileScreen() {
  const { profile, logout } = useAuth()
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.displayName?.charAt(0) ?? 'D'}</Text>
        </View>
        <Text style={styles.name}>{profile?.displayName ?? 'Direction'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="business" size={14} color='#1e3a5f' />
          <Text style={styles.roleText}>Direction · Collège Demo</Text>
        </View>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={16} color={colors.gray[500]} />
            <Text style={styles.infoText}>324 élèves inscrits</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="school-outline" size={16} color={colors.gray[500]} />
            <Text style={styles.infoText}>18 enseignants</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.gray[500]} />
            <Text style={styles.infoText}>Année scolaire 2025–2026</Text>
          </View>
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
  avatar:    { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1e3a5f' + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText:{ fontSize: 32, fontWeight: fontWeight.bold, color: '#1e3a5f' },
  name:      { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  email:     { fontSize: fontSize.sm, color: colors.gray[500] },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: '#1e3a5f' + '12', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  roleText:  { fontSize: fontSize.sm, color: '#1e3a5f', fontWeight: fontWeight.medium },
  infoBox:   { width: '100%', backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText:  { fontSize: fontSize.sm, color: colors.gray[700] },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.error + '10', borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginTop: spacing.lg },
  logoutText:{ fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.semibold },
})
