import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { initializeNotifications } from '@/lib/notifications';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  useEffect(() => {
    initializeNotifications();
  }, []);

  return (
    <>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontSize: 16,
            fontWeight: '800',
          },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="route-result" options={{ title: '경로 선택' }} />
        <Stack.Screen name="route-detail/[id]" options={{ title: '경로 상세' }} />
        <Stack.Screen name="riding" options={{ title: '탑승 안내' }} />
        <Stack.Screen name="station/[name]" options={{ title: '역 정보' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
