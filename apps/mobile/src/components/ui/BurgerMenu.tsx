/**
 * BurgerMenu — Composant partagé
 * Bouton ☰ + tiroir latéral accessible depuis toutes les pages
 */
import { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Pressable, Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '@/theme'

const MENU_ITEMS = [
  { label: 'Accueil',          icon: 'home'          as const, route: '/(student)/'          },
  { label: 'Cours',            icon: 'book'          as const, route: '/(student)/courses'   },
  { label: 'Exercices',        icon: 'pencil'        as const, route: '/(student)/exercises' },
  { label: 'Finances',         icon: 'wallet'        as const, route: '/(student)/finances'  },
  { label: 'Notes',            icon: 'star'          as const, route: '/(student)/grades'    },
  { label: 'Absences',         icon: 'time'          as const, route: '/(student)/absences'  },
  { label: 'Emploi du temps',  icon: 'calendar'      as const, route: '/(student)/schedule'  },
  { label: 'Profil',           icon: 'person'        as const, route: '/(student)/profile'   },
]

interface Props {
  iconColor?: string
}

export function BurgerMenu({ iconColor = colors.white }: Props) {
  const [visible, setVisible] = useState(false)
  const { profile, logout }   = useAuth()
  const router                = useRouter()

  const initials = profile?.displayName
    ?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  const name  = profile?.displayName ?? 'Élève'
  const role  = (profile as any)?.classe ?? 'Élève'

  function go(route: string) {
    setVisible(false)
    router.push(route as any)
  }

  return (
    <>
      {/* Bouton ☰ */}
      <TouchableOpacity style={styles.btn} onPress={() => setVisible(true)} activeOpacity={0.7}>
        <Ionicons name="menu" size={26} color={iconColor} />
      </TouchableOpacity>

      {/* Tiroir */}
      <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.drawer} onPress={() => {}}>

            {/* ── En-tête élève ───────────────────────── */}
            <View style={styles.drawerTop}>
              <View style={styles.avatarWrap}>
                {(profile as any)?.photoURL
                  ? <Image source={{ uri: (profile as any).photoURL }} style={styles.avatarImg} />
                  : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                  )
                }
              </View>
              <Text style={styles.studentName} numberOfLines={2}>{name}</Text>
              <View style={styles.roleBadge}>
                <Ionicons name="school-outline" size={11} color={colors.white} />
                <Text style={styles.roleText}>{role}</Text>
              </View>
            </View>

            {/* ── Navigation ─────────────────────────── */}
            <View style={styles.navList}>
              {MENU_ITEMS.map(item => (
                <TouchableOpacity
                  key={item.route}
                  style={styles.navItem}
                  onPress={() => go(item.route)}
                  activeOpacity={0.7}
                >
                  <View style={styles.navIcon}>
                    <Ionicons name={item.icon} size={19} color={colors.primary} />
                  </View>
                  <Text style={styles.navLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={15} color={colors.gray[300]} />
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Déconnexion ─────────────────────────── */}
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
              <Text style={styles.logoutText}>Se déconnecter</Text>
            </TouchableOpacity>

          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawer: {
    width: '78%',
    height: '100%',
    backgroundColor: colors.white,
    ...shadow.md,
  },

  // En-tête
  drawerTop: {
    backgroundColor: colors.primary,
    paddingTop: 56,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'flex-start',
  },
  avatarWrap:    { marginBottom: spacing.md },
  avatarImg:     { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarFallback:{
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:   { fontSize: 24, fontWeight: fontWeight.bold, color: colors.white },
  studentName:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.white, marginBottom: spacing.xs },
  roleBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  roleText:     { fontSize: fontSize.xs, color: colors.white, fontWeight: fontWeight.medium },

  // Navigation
  navList: { flex: 1, paddingVertical: spacing.sm },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: colors.gray[50],
  },
  navIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.primary + '10',
    alignItems: 'center', justifyContent: 'center',
  },
  navLabel: { flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.gray[800] },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.gray[100],
    marginBottom: spacing.xl,
  },
  logoutText: { fontSize: fontSize.base, color: colors.error, fontWeight: fontWeight.medium },
})
