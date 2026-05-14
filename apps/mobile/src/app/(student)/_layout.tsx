import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

interface Tab {
  name:       string
  title:      string
  icon:       IoniconsName
  iconActive: IoniconsName
}

const TABS: Tab[] = [
  { name: 'index',     title: 'Accueil',   icon: 'home-outline',        iconActive: 'home' },
  { name: 'courses',   title: 'Cours',     icon: 'book-outline',        iconActive: 'book' },
  { name: 'exercises', title: 'Exercices', icon: 'pencil-outline',      iconActive: 'pencil' },
  { name: 'finances',  title: 'Finances',  icon: 'wallet-outline',      iconActive: 'wallet' },
  { name: 'profile',   title: 'Profil',    icon: 'person-outline',      iconActive: 'person' },
]

export default function StudentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          backgroundColor:  colors.white,
          borderTopColor:   colors.gray[100],
          borderTopWidth:   1,
          paddingTop:       6,
          paddingBottom:    8,
          height:           70,
        },
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '600',
          marginTop:  2,
        },
      }}
    >
      {TABS.map((tab) => (
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
    </Tabs>
  )
}
