/**
 * AppTabBar — 웹 client/components/TabBar 의 모바일 이식.
 * 검색 / 탑승중(가운데 강조) / 설정 3탭을 항상 하단에 고정 노출한다.
 *
 * 웹과 동일하게 라우트와 무관하게 전역으로 떠 있어야 하므로, 탭 네비게이터의
 * 기본 바를 끄고 루트 레이아웃에서 이 컴포넌트를 한 번만 렌더한다.
 */
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { impactHaptic, selectionHaptic } from '@/lib/haptics';
import { radii, type Palette } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

/** 바 본체 높이(safe-area 제외). 화면 콘텐츠 하단 여백 계산에 재사용. */
export const TAB_BAR_BASE_HEIGHT = 56;

/** 바가 화면에서 가리는 총 높이(safe-area 포함). 스크롤 콘텐츠 paddingBottom 에 사용. */
export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE_HEIGHT + insets.bottom;
}

type TabKey = 'search' | 'riding' | 'settings';

interface TabDef {
  key: TabKey;
  label: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  primary?: boolean;
}

const TABS: TabDef[] = [
  { key: 'search', label: '검색', href: '/', icon: 'search' },
  { key: 'riding', label: '탑승중', href: '/riding', icon: 'train', primary: true },
  { key: 'settings', label: '설정', href: '/settings', icon: 'settings' },
];

function activeKey(pathname: string): TabKey {
  if (pathname.startsWith('/riding')) return 'riding';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'search';
}

export function AppTabBar() {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const current = activeKey(pathname);

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: TAB_BAR_BASE_HEIGHT + insets.bottom }]}>
      {TABS.map((tab) => {
        const isActive = current === tab.key;

        if (tab.primary) {
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                impactHaptic();
                router.navigate(tab.href as never);
              }}
              style={styles.item}>
              <View style={[styles.primaryBubble, isActive && styles.primaryBubbleActive]}>
                <Ionicons name={tab.icon} size={20} color={palette.surface} />
              </View>
              <Text style={[styles.primaryLabel, { color: isActive ? palette.accent : palette.subtleText }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              selectionHaptic();
              router.navigate(tab.href as never);
            }}
            style={styles.item}>
            <Ionicons
              name={isActive ? tab.icon : (`${tab.icon}-outline` as keyof typeof Ionicons.glyphMap)}
              size={22}
              color={isActive ? palette.text : palette.subtleText}
            />
            <Text style={[styles.label, { color: isActive ? palette.text : palette.subtleText }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    bar: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderTopColor: palette.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      bottom: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      left: 0,
      paddingHorizontal: 8,
      paddingTop: 6,
      position: 'absolute',
      right: 0,
      shadowColor: '#1B2838',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 12,
    },
    item: {
      alignItems: 'center',
      flex: 1,
      gap: 2,
      justifyContent: 'center',
    },
    label: {
      fontSize: 10,
      fontWeight: '700',
    },
    primaryBubble: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: radii.md,
      height: 38,
      justifyContent: 'center',
      shadowColor: palette.accent,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.32,
      shadowRadius: 10,
      elevation: 6,
      width: 38,
    },
    primaryBubbleActive: {
      transform: [{ scale: 1.05 }],
    },
    primaryLabel: {
      fontSize: 9.5,
      fontWeight: '800',
      marginTop: 1,
    },
  });
