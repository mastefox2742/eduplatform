import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

interface MenuItem {
  icon:    React.ComponentProps<typeof Ionicons>['name']
  label:   string
  value?:  string
  color?:  string
  onPress: () => void
}

export default function ProfileScreen() {
  const { profile, logout } = useAuth()

  const initials = profile?.displayName
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter', style: 'destructive', onPress: logout },
      ]
    )
  }

  const INFO_ITEMS: MenuItem[] = [
    {
      icon: 'mail-outline', label: 'Email',
      value: profile?.email ?? '—',
      onPress: () => {},
    },
    {
      icon: 'school-outline', label: 'École',
      value: 'École de Démonstration',
      onPress: () => {},
    },
    {
      icon: 'people-outline', label: 'Classe',
      value: '3ème A',
      onPress: () => {},
    },
    {
      icon: 'card-outline', label: 'Numéro étudiant',
      value: 'STU-2025-001',
      onPress: () => {},
    },
  ]

  const SETTINGS_ITEMS: MenuItem[] = [
    {
      icon: 'notifications-outline', label: 'Notifications',
      onPress: () => Alert.alert('Bientôt disponible', 'Paramètres de notifications à venir.'),
    },
    {
      icon: 'lock-closed-outline', label: 'Changer le mot de passe',
      onPress: () => Alert.alert('Bientôt disponible', 'Réinitialisation du mot de passe à venir.'),
    },
    {
      icon: 'language-outline', label: 'Langue',
      value: 'Français',
      onPress: () => {},
    },
    {
      icon: 'moon-outline', label: 'Thème sombre',
      onPress: () => Alert.alert('Bientôt disponible', 'Mode sombre à venir.'),
    },
  ]

  const SUPPORT_ITEMS: MenuItem[] = [
    {
      icon: 'help-circle-outline', label: 'Aide & Support',
      onPress: () => {},
    },
    {
      icon: 'document-text-outline', label: 'Conditions d\'utilisation',
      onPress: () => {},
    },
    {
      icon: 'shield-outline', label: 'Politique de confidentialité',
      onPress: () => {},
    },
  ]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar & nom */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile?.displayName ?? 'Élève'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>🎓 Élève</Text>
          </View>
        </View>

        {/* Infos du compte */}
        <MenuSection title="Mon compte" items={INFO_ITEMS} />

        {/* Paramètres */}
        <MenuSection title="Paramètres" items={SETTINGS_ITEMS} />

        {/* Support */}
        <MenuSection title="Support" items={SUPPORT_ITEMS} />

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={styles.version}>EduPlatform v1.0.0</Text>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function MenuSection({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.menuCard}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.menuItem, i < items.length - 1 && styles.menuItemBorder]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconBox}>
              <Ionicons name={item.icon} size={18} color={item.color ?? colors.primary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <View style={styles.menuRight}>
              {item.value && (
                <Text style={styles.menuValue} numberOfLines={1}>{item.value}</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.gray[300]} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  hero: {
    alignItems:      'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  avatar: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.md,
    ...shadow.md,
  },
  avatarText: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.white },
  name:       { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.gray[900] },
  roleBadge: {
    marginTop:         spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical:   4,
    backgroundColor:   colors.primary + '15',
    borderRadius:      radius.full,
  },
  roleText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },

  section: {
    paddingHorizontal: spacing.lg,
    marginTop:         spacing.lg,
  },
  sectionTitle: {
    fontSize:     fontSize.xs,
    fontWeight:   fontWeight.semibold,
    color:        colors.gray[500],
    textTransform:'uppercase',
    letterSpacing: 0.8,
    marginBottom:  spacing.sm,
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    ...shadow.sm,
  },
  menuItem: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[50],
  },
  menuIconBox: {
    width:           34,
    height:          34,
    borderRadius:    radius.sm,
    backgroundColor: colors.primary + '12',
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     spacing.md,
  },
  menuLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.gray[800] },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: 120 },
  menuValue: { fontSize: fontSize.sm, color: colors.gray[400] },

  logoutBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.sm,
    margin:          spacing.lg,
    padding:         spacing.md,
    backgroundColor: colors.danger + '10',
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.danger + '30',
  },
  logoutText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.danger },
  version:    { textAlign: 'center', fontSize: fontSize.xs, color: colors.gray[400] },
})
