import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAllLines, getStationsByLine } from '@shared/metro/pathfinder';

import { Starfield } from '@/components/space';
import {
  DEFAULT_APP_PREFERENCES,
  getAppPreferences,
  updateAppPreferences,
  type AppPreferences,
  type PreferredRouteKind,
} from '@/lib/appPreferences';
import { API_BASE_URL } from '@/lib/config';
import { selectionHaptic, successHaptic } from '@/lib/haptics';
import {
  ensureNotificationPermission,
  getNotificationPermissionStatus,
  type NotificationPermissionStatus,
} from '@/lib/notifications';
import { clearRidingRoute } from '@/lib/ridingSession';
import { FAVORITE_ROUTES_KEY } from '@/lib/routeFavorites';
import { getUseSimulatedTrainData, setUseSimulatedTrainData } from '@/lib/simulationSettings';
import { STATION_FAVORITES_KEY } from '@/lib/stationFavorites';
import { slideUp, stagger } from '@/lib/animations';
import { cardShadow, radii, spacing, type Palette } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

const appIcon = require('@/assets/images/icon.png');

const PRIVACY_POLICY_URL = 'https://metronut.vercel.app/privacy.html';

/** iOS 설정 색상 아이콘 칩 틴트(웹 파스텔 배경 대응). */
const TINT = {
  blue: '#EBF4FF',
  orange: '#FFF3EB',
  green: '#F0FFF4',
  purple: '#F5F0FF',
  red: '#FFF0F0',
  gray: '#F0F1F4',
} as const;

const ALARM_BEFORE_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: '1정거장 전' },
  { value: 2, label: '2정거장 전' },
  { value: 3, label: '3정거장 전' },
];

const PREFERRED_ROUTE_OPTIONS: { value: PreferredRouteKind; label: string }[] = [
  { value: 'fastest', label: '빠른 경로' },
  { value: 'fewest', label: '최소 환승' },
  { value: 'least-walk', label: '도보 적은' },
];

function SettingSwitchRow({
  icon,
  iconColor,
  iconTint,
  label,
  hint,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconTint?: string;
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIconWrap, { backgroundColor: iconTint ?? palette.surfaceAlt }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        {hint ? <Text style={styles.settingHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E5EA', true: '#34C759' }}
        thumbColor={palette.surface}
      />
    </View>
  );
}

function SegmentedOptionRow<T extends string | number>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option.value)}
            style={[styles.segmentedButton, active && styles.segmentedButtonActive]}>
            <Text style={[styles.segmentedText, active && styles.segmentedTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const NOTIFICATION_STATUS_LABEL: Record<NotificationPermissionStatus, string> = {
  granted: '허용됨',
  denied: '거부됨',
  undetermined: '미설정',
};

export default function SettingsTab() {
  const { scheme, palette, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isDark = scheme === 'dark';
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_APP_PREFERENCES);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermissionStatus>('undetermined');

  const refreshNotificationStatus = useCallback(async () => {
    setNotificationStatus(await getNotificationPermissionStatus());
  }, []);

  const handleNotificationPermissionPress = async () => {
    selectionHaptic();
    if (notificationStatus === 'denied') {
      // 다시 묻기가 불가능한 상태 → 시스템 설정으로 보낸다.
      await Linking.openSettings();
      return;
    }
    await ensureNotificationPermission();
    await refreshNotificationStatus();
  };

  const dataStats = useMemo(() => {
    const lines = getAllLines();
    const stationNames = new Set<string>();
    for (const line of lines) {
      for (const station of getStationsByLine(line.id)) {
        stationNames.add(station.name);
      }
    }
    return { lineCount: lines.length, stationCount: stationNames.size };
  }, []);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    getUseSimulatedTrainData().then(setSimulationEnabled);
    getAppPreferences().then(setPreferences);
    void refreshNotificationStatus();
  }, [refreshNotificationStatus]);

  const handleSimulationChange = async (enabled: boolean) => {
    selectionHaptic();
    setSimulationEnabled(enabled);
    await setUseSimulatedTrainData(enabled);
  };

  const handlePreferenceChange = async (patch: Partial<AppPreferences>) => {
    selectionHaptic();
    setPreferences((current) => ({ ...current, ...patch }));
    const next = await updateAppPreferences(patch);
    setPreferences(next);
  };

  const handleClearSavedData = () => {
    Alert.alert(
      '저장 데이터 초기화',
      '즐겨찾기 경로, 집/회사/학교 역, 진행 중인 탑승 안내가 모두 삭제됩니다. 설정 값은 유지됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([FAVORITE_ROUTES_KEY, STATION_FAVORITES_KEY]);
            await clearRidingRoute();
            successHaptic();
            Alert.alert('완료', '저장 데이터가 초기화되었습니다.');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={slideUp(stagger(0))} style={styles.headerCard}>
          <Starfield speed={0.3} density={0.26} shootingStars />
          <Image source={appIcon} style={styles.appIcon} contentFit="cover" />
          <View style={styles.headerCopy}>
            <Text style={styles.appName}>메트로넛</Text>
            <Text style={styles.appDescription}>지하철로 떠나는 우주 항해</Text>
          </View>
        </Animated.View>

        <Animated.View entering={slideUp(stagger(1))} style={styles.section}>
          <Text style={styles.sectionTitle}>알림</Text>
          <View style={styles.sectionCard}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleNotificationPermissionPress()}
              style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
              <View style={[styles.settingIconWrap, { backgroundColor: TINT.blue }]}>
                <Ionicons name="notifications-outline" size={17} color={palette.accent} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>기기 알림 권한</Text>
                <Text style={styles.settingHint}>
                  {notificationStatus === 'granted'
                    ? '하차·환승 임박 알림을 받을 수 있습니다.'
                    : '허용하면 백그라운드에서도 하차 알림을 받습니다.'}
                </Text>
              </View>
              <Text style={styles.settingValue}>{NOTIFICATION_STATUS_LABEL[notificationStatus]}</Text>
            </Pressable>
            <View style={styles.rowDivider} />
            <SettingSwitchRow
              icon="volume-high-outline"
              iconColor={palette.blue}
              iconTint={TINT.blue}
              label="알림 소리"
              value={preferences.alarmSound}
              onValueChange={(next) => void handlePreferenceChange({ alarmSound: next })}
            />
            <View style={styles.rowDivider} />
            <SettingSwitchRow
              icon="phone-portrait-outline"
              iconColor={palette.orange}
              iconTint={TINT.orange}
              label="진동"
              value={preferences.alarmVibrate}
              onValueChange={(next) => void handlePreferenceChange({ alarmVibrate: next })}
            />
            <View style={styles.rowDivider} />
            <View style={styles.settingColumn}>
              <View style={styles.settingColumnHeader}>
                <View style={[styles.settingIconWrap, { backgroundColor: TINT.green }]}>
                  <Ionicons name="notifications-outline" size={17} color={palette.green} />
                </View>
                <Text style={styles.settingLabel}>하차 알림 시점</Text>
              </View>
              <SegmentedOptionRow
                options={ALARM_BEFORE_OPTIONS}
                selected={preferences.defaultAlarmBefore}
                onSelect={(value) => void handlePreferenceChange({ defaultAlarmBefore: value })}
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={slideUp(stagger(2))} style={styles.section}>
          <Text style={styles.sectionTitle}>경로 설정</Text>
          <View style={styles.sectionCard}>
            <View style={styles.settingColumn}>
              <View style={styles.settingColumnHeader}>
                <View style={[styles.settingIconWrap, { backgroundColor: TINT.purple }]}>
                  <Ionicons name="git-branch-outline" size={17} color={palette.purple} />
                </View>
                <Text style={styles.settingLabel}>선호 경로</Text>
              </View>
              <SegmentedOptionRow
                options={PREFERRED_ROUTE_OPTIONS}
                selected={preferences.preferredRoute}
                onSelect={(value) => void handlePreferenceChange({ preferredRoute: value })}
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={slideUp(stagger(3))} style={styles.section}>
          <Text style={styles.sectionTitle}>데이터 소스</Text>
          <View style={styles.sectionCard}>
            <SettingSwitchRow
              icon="train-outline"
              iconColor={palette.blue}
              iconTint={TINT.blue}
              label="시뮬레이션 열차 데이터"
              hint="켜면 실시간 API 대신 앱 안의 예시 도착 정보를 표시합니다."
              value={simulationEnabled}
              onValueChange={(next) => void handleSimulationChange(next)}
            />
          </View>
        </Animated.View>

        <Animated.View entering={slideUp(stagger(4))} style={styles.section}>
          <Text style={styles.sectionTitle}>일반</Text>
          <View style={styles.sectionCard}>
            <SettingSwitchRow
              icon="moon"
              iconColor={palette.surface}
              iconTint={palette.primary}
              label="다크 모드"
              hint={isDark ? '다크 테마 사용 중' : '라이트 테마 사용 중'}
              value={isDark}
              onValueChange={(next) => setPreference(next ? 'dark' : 'light')}
            />
            <View style={styles.rowDivider} />
            <Pressable
              accessibilityRole="button"
              onPress={() => Alert.alert('준비 중', '언어 설정 기능이 곧 제공됩니다.')}
              style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
              <View style={[styles.settingIconWrap, { backgroundColor: TINT.blue }]}>
                <Ionicons name="globe-outline" size={17} color={palette.blue} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>언어</Text>
                <Text style={styles.settingHint}>한국어</Text>
              </View>
              <Text style={styles.soonBadge}>준비중</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={slideUp(stagger(5))} style={styles.section}>
          <Text style={styles.sectionTitle}>데이터 관리</Text>
          <View style={styles.sectionCard}>
            <Pressable
              accessibilityRole="button"
              onPress={() => Alert.alert('준비 중', '오프라인 데이터 기능이 곧 제공됩니다.')}
              style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
              <View style={[styles.settingIconWrap, { backgroundColor: TINT.green }]}>
                <Ionicons name="cloud-download-outline" size={17} color={palette.green} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>오프라인 데이터</Text>
                <Text style={styles.settingHint}>노선 데이터 다운로드</Text>
              </View>
              <Text style={styles.soonBadge}>준비중</Text>
            </Pressable>
            <View style={styles.rowDivider} />
            <Pressable
              accessibilityRole="button"
              onPress={handleClearSavedData}
              style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
              <View style={[styles.settingIconWrap, styles.settingIconWrapDanger]}>
                <Ionicons name="trash-outline" size={17} color={palette.red} />
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingLabel}>저장 데이터 초기화</Text>
                <Text style={styles.settingHint}>즐겨찾기와 탑승 안내 기록을 삭제합니다.</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={palette.muted} />
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={slideUp(stagger(6))} style={styles.section}>
          <Text style={styles.sectionTitle}>정보</Text>
          <View style={styles.sectionCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="information-circle-outline" size={17} color={palette.muted} />
              </View>
              <Text style={[styles.settingLabel, styles.settingLabelGrow]}>앱 버전</Text>
              <Text style={styles.settingValue}>{appVersion}</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.settingRow}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="server-outline" size={17} color={palette.muted} />
              </View>
              <Text style={[styles.settingLabel, styles.settingLabelGrow]}>노선 데이터</Text>
              <Text style={styles.settingValue}>
                {dataStats.lineCount}개 노선 · {dataStats.stationCount}개 역
              </Text>
            </View>
            <View style={styles.rowDivider} />
            <Pressable
              accessibilityRole="button"
              onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
              style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={17} color={palette.muted} />
              </View>
              <Text style={[styles.settingLabel, styles.settingLabelGrow]}>개인정보 처리방침</Text>
              <Ionicons name="open-outline" size={16} color={palette.muted} />
            </Pressable>
          </View>
        </Animated.View>

        {__DEV__ ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>개발</Text>
            <View style={[styles.sectionCard, styles.devCard]}>
              <Text style={styles.settingLabel}>API Base URL</Text>
              <Text style={styles.apiText} numberOfLines={3}>
                {API_BASE_URL}
              </Text>
              <Text style={styles.settingHint}>
                실제 배포 API를 쓰려면 `EXPO_PUBLIC_API_BASE_URL`을 Vercel 주소로 설정하세요.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 120,
  },
  headerCard: {
    alignItems: 'center',
    // 그라데이션 미지원 환경(web)에서도 흰 글씨가 보이도록 단색 다크 폴백.
    backgroundColor: '#0e132e',
    experimental_backgroundImage: 'linear-gradient(160deg, #0b1026 0%, #141b3d 55%, #0e132e 100%)',
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    overflow: 'hidden',
    padding: spacing.lg,
    shadowColor: '#0D1238',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  appIcon: {
    borderColor: 'rgba(170, 190, 255, 0.25)',
    borderRadius: 16,
    borderWidth: 1,
    height: 60,
    width: 60,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  appName: {
    color: '#F2F4FF',
    fontSize: 18,
    fontWeight: '900',
  },
  appDescription: {
    color: '#A9B4D9',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...cardShadow,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  settingColumn: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  settingColumnHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  settingIconWrap: {
    alignItems: 'center',
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.sm,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  settingIconWrapDanger: {
    backgroundColor: '#FFF0F0',
  },
  settingCopy: {
    flex: 1,
    gap: 3,
  },
  settingLabel: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  settingLabelGrow: {
    flex: 1,
  },
  settingValue: {
    color: palette.subtleText,
    fontSize: 14,
    fontWeight: '800',
  },
  settingHint: {
    color: palette.subtleText,
    fontSize: 13,
    lineHeight: 18,
  },
  rowDivider: {
    backgroundColor: palette.border,
    height: 1,
  },
  segmented: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  segmentedButton: {
    alignItems: 'center',
    borderRadius: radii.sm - 2,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  segmentedButtonActive: {
    backgroundColor: palette.text,
  },
  segmentedText: {
    color: palette.subtleText,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentedTextActive: {
    color: palette.surface,
  },
  soonBadge: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.sm - 4,
    color: palette.subtleText,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  pressed: {
    opacity: 0.72,
  },
  devCard: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  apiText: {
    color: palette.green,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
});
