import { Tabs } from 'expo-router';

import { useTheme } from '@/lib/theme-context';

/**
 * 탭 그룹은 홈/설정 라우트를 묶기만 한다. 실제 하단 바는 루트 레이아웃의
 * 전역 <AppTabBar/> 가 그려주므로 네이티브 탭 바는 끈다(이중 바 방지).
 */
export default function TabLayout() {
  const { palette } = useTheme();
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerStyle: { backgroundColor: palette.background },
        headerShadowVisible: false,
        headerTintColor: palette.text,
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '800',
        },
      }}>
      <Tabs.Screen name="index" options={{ headerShown: false }} />
      <Tabs.Screen name="settings" options={{ title: '설정' }} />
    </Tabs>
  );
}
