import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppTabBar } from '@/components/AppTabBar';
import { applyGlobalFont } from '@/lib/apply-global-font';
import { fontAssets } from '@/lib/fonts';
import { initializeNotifications } from '@/lib/notifications';
import { ThemeProvider, useTheme } from '@/lib/theme-context';

// 첫 렌더 전에 전역 Pretendard 패치를 설치한다.
applyGlobalFont();
SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const { palette, scheme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: palette.background },
          headerStyle: { backgroundColor: palette.background },
          headerShadowVisible: false,
          headerTintColor: palette.text,
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
      <AppTabBar />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const onReady = useCallback(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onReady}>
        <ThemedStack />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
