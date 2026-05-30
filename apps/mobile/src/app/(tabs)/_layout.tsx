import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '@/lib/theme';

type TabIconName = keyof typeof Ionicons.glyphMap;

const tabIconMap: Record<string, { active: TabIconName; inactive: TabIconName }> = {
  index: { active: 'search', inactive: 'search-outline' },
  lines: { active: 'map', inactive: 'map-outline' },
  settings: { active: 'settings', inactive: 'settings-outline' },
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '800',
        },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 84,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ color, focused, size }) => {
          const icon = tabIconMap[route.name];
          return (
            <Ionicons
              name={focused ? icon.active : icon.inactive}
              size={size}
              color={color}
            />
          );
        },
      })}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarLabel: '홈' }} />
      <Tabs.Screen name="lines" options={{ title: '노선', tabBarLabel: '노선' }} />
      <Tabs.Screen name="settings" options={{ title: '설정', tabBarLabel: '설정' }} />
    </Tabs>
  );
}
