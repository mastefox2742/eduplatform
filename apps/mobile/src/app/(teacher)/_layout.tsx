import { Tabs } from 'expo-router'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/theme'
import { SyncBadge } from '@/components/ui/SyncBadge'
import { useSyncQueue } from '@/hooks/useSyncQueue'

type IconName = React.ComponentProps<typeof Ionicons>['name']

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index',      title: 'Accueil',   icon: 'home-outline',        iconActive: 'home'          },
  { name: 'courses',    title: 'Cours',     icon: 'book-outline',        iconActive: 'book'          },
  { name: 'grades',     title: 'Notes',     icon: 'stats-chart-outline', iconActive: 'stats-chart'   },
  { name: 'messages',   title: 'Messages',  icon: 'chatbubbles-outline', iconActive: 'chatbubbles'   },
  { name: 'attendance', title: 'Présences', icon: 'checkbox-outline',    iconActive: 'checkbox'      },
]

export default function TeacherLayout() {
  const { pendingCount, isSyncing, isOnline, sync } = useSyncQueue()

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: route.name === 'index' || route.name === 'bulletin' ? true : false,
        headerRight: () => (
          <View style={{ marginRight: 12 }}>
            <SyncBadge
              pendingCount={pendingCount}
              isSyncing={isSyncing}
              isOnline={isOnline}
              onPress={sync}
            />
          </View>
        ),
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
      })}
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
            // Badge rouge si ops en attente sur l'onglet Présences ou Notes
            tabBarBadge:
              (tab.name === 'attendance' || tab.name === 'grades') && pendingCount > 0
                ? pendingCount
                : undefined,
          }}
        />
      ))}
    </Tabs>
  )
}
