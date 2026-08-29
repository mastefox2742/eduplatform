import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/theme'

type IconName = React.ComponentProps<typeof Ionicons>['name']

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index',    title: 'Accueil',   icon: 'home-outline',        iconActive: 'home'        },
  { name: 'child',    title: 'Mon enfant',icon: 'school-outline',      iconActive: 'school'      },
  { name: 'payments', title: 'Scolarité', icon: 'card-outline',        iconActive: 'card'        },
  { name: 'messages', title: 'Messages',  icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
]

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={{
        // Le sélecteur d'enfant vit dans l'écran d'accueil (rail de
        // cartes, cf. maquette `parent---dashboard`). Le remettre ici
        // ferait deux sélecteurs pour un même choix.
        headerShown: false,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor:  colors.gray[100],
          borderTopWidth:  1,
          paddingTop:      6,
          paddingBottom:   8,
          height:          70,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={22} color={color} />
            ),
          }}
        />
      ))}
      {/* Page pleine hors barre d'onglets : ouverte depuis « Scolarité ». */}
      <Tabs.Screen name="paiement" options={{ href: null, headerShown: false }} />
    </Tabs>
  )
}
