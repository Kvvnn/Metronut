import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/lib/theme-context';

type TabIconName = keyof typeof Ionicons.glyphMap;

const tabIconMap: Record<string, { active: TabIconName; inactive: TabIconName }> = {
  index: { active: 'search', inactive: 'search-outline' },
  lines: { active: 'map', inactive: 'map-outline' },
  settings: { active: 'settings', inactive: 'settings-outline' },
};

export default function TabLayout() {
  const { palette } = useTheme();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: palette.background },
        headerShadowVisible: false,
        headerTintColor: palette.text,
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '800',
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
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
