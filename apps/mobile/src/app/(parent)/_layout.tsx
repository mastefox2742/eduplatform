import { Tabs } from 'expo-router'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/theme'
import { ChildSwitcher } from '@/components/ui/ChildSwitcher'
import { useActiveChild } from '@/hooks/useActiveChild'

type IconName = React.ComponentProps<typeof Ionicons>['name']

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index',    title: 'Accueil',   icon: 'home-outline',        iconActive: 'home'        },
  { name: 'child',    title: 'Mon enfant',icon: 'school-outline',      iconActive: 'school'      },
  { name: 'payments', title: 'Scolarité', icon: 'card-outline',        iconActive: 'card'        },
  { name: 'messages', title: 'Messages',  icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
]

export default function ParentLayout() {
  const { children, activeChild, setActive } = useActiveChild()

  return (
    <Tabs
      screenOptions={{
        // Header global avec sélecteur d'enfant
        headerShown: true,
        headerTitle: () => (
          <View style={{ flex: 1, paddingHorizontal: 4 }}>
            <ChildSwitcher
              children={children}
              activeChild={activeChild}
              onSelect={setActive}
            />
          </View>
        ),
        headerStyle:           { backgroundColor: colors.white },
        headerShadowVisible:   true,
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
