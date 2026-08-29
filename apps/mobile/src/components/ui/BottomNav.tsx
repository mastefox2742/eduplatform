/**
 * Barre de navigation basse — reprise des maquettes.
 *
 * Cinq onglets maximum (§23 : « navigation à 4 ou 5 onglets
 * principaux »). L'onglet actif passe en `primary` avec une icône
 * pleine et un libellé en gras ; les autres restent en gris.
 *
 * Une pastille rouge signale ce qui demande une action : devoirs en
 * retard, bulletins à valider, impayés. Elle ne compte pas, elle
 * alerte — le nombre exact appartient à l'écran.
 */
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { usePathname, router } from 'expo-router'
import { colors, spacing, fontSize, fontFamily } from '@/theme'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

export interface NavTab {
  /** Route absolue, ex. `/(student)/courses`. */
  href: string
  label: string
  icon: IoniconName
  iconActive: IoniconName
  /** Point d'alerte : quelque chose attend l'utilisateur ici. */
  dot?: boolean
}

export function BottomNav({ tabs }: { tabs: NavTab[] }) {
  const pathname = usePathname()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        s.bar,
        // Sur iPhone, la barre système mange le bas de l'écran :
        // sans ce retrait, le libellé « Profil » passe dessous.
        { paddingBottom: Math.max(insets.bottom, spacing.sm + 4) },
      ]}
    >
      {tabs.map((tab) => {
        // `/(student)/index` correspond aussi à `/(student)`.
        const isActive =
          pathname === tab.href ||
          pathname === tab.href.replace(/\/index$/, '') ||
          (tab.href.endsWith('/') && pathname === tab.href.slice(0, -1))

        const tint = isActive ? colors.primary : colors.mutedText

        return (
          <TouchableOpacity
            key={tab.href}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            activeOpacity={0.7}
            onPress={() => router.replace(tab.href as never)}
            style={s.item}
          >
            <View>
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={20}
                color={tint}
              />
              {tab.dot ? <View style={s.dot} /> : null}
            </View>
            <Text
              numberOfLines={1}
              style={[
                s.label,
                { color: tint },
                isActive && { fontFamily: fontFamily.bodySemi, fontWeight: '700' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ── Onglets par rôle, repris des maquettes ────────────────────────────────────

export const STUDENT_TABS: NavTab[] = [
  { href: '/(student)/',          label: 'Accueil',   icon: 'home-outline',     iconActive: 'home' },
  { href: '/(student)/courses',   label: 'Mes Cours', icon: 'book-outline',     iconActive: 'book' },
  { href: '/(student)/devoirs',   label: 'Devoirs',   icon: 'document-text-outline', iconActive: 'document-text' },
  { href: '/(student)/grades',    label: 'Notes',     icon: 'stats-chart-outline',   iconActive: 'stats-chart' },
  { href: '/(student)/profile',   label: 'Profil',    icon: 'person-circle-outline', iconActive: 'person-circle' },
]

export const TEACHER_TABS: NavTab[] = [
  { href: '/(teacher)/attendance', label: 'Appel',       icon: 'checkbox-outline',      iconActive: 'checkbox' },
  { href: '/(teacher)/courses',    label: 'Cahier texte', icon: 'book-outline',         iconActive: 'book' },
  { href: '/(teacher)/grades',     label: 'Notes',       icon: 'stats-chart-outline',   iconActive: 'stats-chart' },
  { href: '/(teacher)/schedule',   label: 'Planning',    icon: 'calendar-outline',      iconActive: 'calendar' },
  { href: '/(teacher)/profile',    label: 'Compte',      icon: 'person-circle-outline', iconActive: 'person-circle' },
]

export const DIRECTION_TABS: NavTab[] = [
  { href: '/(direction)/',           label: 'Dashboard',  icon: 'grid-outline',          iconActive: 'grid' },
  { href: '/(direction)/bulletins',  label: 'Validation', icon: 'ribbon-outline',        iconActive: 'ribbon' },
  { href: '/(direction)/caisse',     label: 'Caisse',     icon: 'wallet-outline',        iconActive: 'wallet' },
  { href: '/(direction)/students',   label: 'Élèves',     icon: 'people-outline',        iconActive: 'people' },
  { href: '/(direction)/profile',    label: 'Compte',     icon: 'person-circle-outline', iconActive: 'person-circle' },
]

export const PARENT_TABS: NavTab[] = [
  { href: '/(parent)/',         label: 'Accueil',  icon: 'home-outline',          iconActive: 'home' },
  { href: '/(parent)/child',    label: 'Mon enfant', icon: 'school-outline',      iconActive: 'school' },
  { href: '/(parent)/payments', label: 'Paiements', icon: 'card-outline',         iconActive: 'card' },
  { href: '/(parent)/messages', label: 'Messages', icon: 'chatbubbles-outline',   iconActive: 'chatbubbles' },
]

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm + 4,
    paddingHorizontal: spacing.sm + 4,
    // Ombre vers le haut : la barre doit se détacher du contenu qui
    // défile dessous.
    ...Platform.select({
      ios: {
        shadowColor: '#14213D',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 12 },
    }),
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
})
