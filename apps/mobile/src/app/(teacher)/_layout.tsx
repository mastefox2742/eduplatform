import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/theme'

type IconName = React.ComponentProps<typeof Ionicons>['name']

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index',     title: 'Accueil',    icon: 'home-outline',   iconActive: 'home'   },
  { name: 'exercises', title: 'Exercices',  icon: 'pencil-outline', iconActive: 'pencil' },
  { name: 'courses',   title: 'Cours',      icon: 'book-outline',   iconActive: 'book'   },
  { name: 'profile',   title: 'Profil',     icon: 'person-outline', iconActive: 'person' },
]

export default function TeacherLayout() {
  return (
    <Tabs
      screenOptions={{
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
    </Tabs>
  )
}
