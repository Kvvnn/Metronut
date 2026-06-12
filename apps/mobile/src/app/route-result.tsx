import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  calculateArrivalTime,
  findRoutes,
  findRoutesVia,
  getLineInfo,
  involvesScheduledLine,
  isLongTransferSegment,
  type Route,
} from '@shared/metro/pathfinder';
import {
  buildServiceErrorCopy,
  getLastDepartureForJourney,
  getRouteServiceError,
  type RouteServiceErrorCopy,
} from '@shared/metro/routeServiceWindow';
import { formatServiceMinute } from '@shared/metro/serviceSchedule';

import { useTabBarHeight } from '@/components/AppTabBar';
import { Starfield } from '@/components/space';
import { FloatingView } from '@/components/ui';
import { slideUp, stagger } from '@/lib/animations';
import { cardShadow, colors, radii, spacing, typography, type Palette } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

/** 시간인지 탐색이 막차로 도달 불가라고 판단했을 때의 안내 문구. */
function buildLastTrainNotice(from: string, to: string): RouteServiceErrorCopy {
  const lastMin = getLastDepartureForJourney(from, to, new Date());
  return {
    title: '막차가 끊겼습니다',
    description:
      lastMin != null
        ? `${from}에서 ${to} 방면으로 가는 막차는 ${formatServiceMinute(lastMin)}에 출발했습니다.`
        : `${from}에서 ${to} 방면으로 가는 막차가 이미 종료되었습니다.`,
    hint: '이 시간대에는 운행계통(행선지)이 달라 해당 구간에 도달할 수 없습니다.',
  };
}

const routeLabels: { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: '빠른 경로', color: colors.blue, icon: 'flash' },
  { label: '편한 경로', color: colors.green, icon: 'heart' },
  { label: '도보 적은 경로', color: '#E67E22', icon: 'walk' },
  { label: '환승 대안', color: '#7C5CFF', icon: 'repeat' },
  { label: '우회 경로', color: '#6B7280', icon: 'time-outline' },
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function routeDetailPath(routeIndex: number, from: string, to: string, via: string) {
  const params = [
    ['from', from],
    ['to', to],
    ...(via ? [['via', via]] : []),
  ];
  const query = params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `/route-detail/${routeIndex}?${query}`;
}

function LineBadge({ lineId }: { lineId: string }) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const line = getLineInfo(lineId);
  return (
    <View style={[styles.lineBadge, { backgroundColor: line?.color ?? palette.muted }]}>
      <Text style={styles.lineBadgeText}>{line?.shortName ?? lineId}</Text>
    </View>
  );
}

function RouteCard({
  route,
  index,
  from,
  to,
  via,
}: {
  route: Route;
  index: number;
  from: string;
  to: string;
  via: string;
}) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const label = routeLabels[index] ?? routeLabels[routeLabels.length - 1];
  const rideSegments = route.segments.filter((segment) => !segment.isTransfer);
  const patternSegments = rideSegments.filter((segment) => segment.pattern);
  const longTransferCount = route.segments.filter((segment) => segment.isTransfer && isLongTransferSegment(segment)).length;

  return (
    <Animated.View entering={slideUp(stagger(index, 100))}>
      <FloatingView cycle={8000} delay={index * 420}>
        <Link href={routeDetailPath(index, from, to, via) as Href} asChild>
          <Pressable style={({ pressed }) => pressed && styles.pressed}>
            <View style={styles.card}>
            <View style={styles.cardMain}>
              <View style={styles.labelRow}>
                <Ionicons name={label.icon} size={14} color={label.color} />
                <Text style={[styles.cardLabel, { color: label.color }]}>{label.label}</Text>
              </View>

              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{route.totalTime}분</Text>
                <Text style={styles.arrivalText}>도착 {calculateArrivalTime(route.totalTime)}</Text>
              </View>

              <View style={styles.badgeRow}>
                {rideSegments.map((segment, segmentIndex) => (
                  <View key={`${segment.lineId}-${segmentIndex}`} style={styles.badgeItem}>
                    {segmentIndex > 0 ? <View style={styles.badgeConnector} /> : null}
                    <LineBadge lineId={segment.lineId} />
                  </View>
                ))}
              </View>

              {patternSegments.length > 0 ? (
                <View style={styles.patternRow}>
                  {patternSegments.map((segment, segmentIndex) => {
                    const line = getLineInfo(segment.lineId);
                    return (
                      <View key={`${segment.lineId}-pattern-${segmentIndex}`} style={styles.patternItem}>
                        <View style={[styles.patternDot, { backgroundColor: line?.color ?? palette.muted }]} />
                        <Text style={styles.patternText}>{segment.pattern!.label}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="repeat" size={12} color={palette.subtleText} />
                  <Text style={styles.metaText}>환승 {route.transferCount}회</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="remove" size={12} color={palette.subtleText} />
                  <Text style={styles.metaText}>{route.stationCount}개 역</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="walk" size={12} color={palette.subtleText} />
                  <Text style={styles.metaText}>환승 이동 {route.walkTime}분</Text>
                </View>
                {longTransferCount > 0 ? (
                  <Text style={styles.warningPill}>긴 환승 {longTransferCount}개</Text>
                ) : null}
                <Text style={styles.fareText}>₩{route.fare.toLocaleString()}</Text>
              </View>
            </View>
            </View>
          </Pressable>
        </Link>
      </FloatingView>
    </Animated.View>
  );
}

export default function RouteResultScreen() {
  const styles = useThemedStyles(makeStyles);
  const tabBarHeight = useTabBarHeight();
  const params = useLocalSearchParams<{ from?: string; via?: string; to?: string }>();
  const from = firstParam(params.from);
  const via = firstParam(params.via);
  const to = firstParam(params.to);

  const { routes, serviceError, timedNotice } = useMemo(() => {
    if (!from || !to) return { routes: [] as Route[], serviceError: null, timedNotice: null };

    const now = new Date();
    // 전 노선에 운행계통 스케줄이 있어 막차·배차를 반영한 시간인지 탐색을 기본으로 쓴다.
    if (involvesScheduledLine(from, via || undefined, to)) {
      const found = via
        ? findRoutesVia(from, via, to, { departAt: now })
        : findRoutes(from, to, { departAt: now });
      return {
        routes: found,
        serviceError: null,
        timedNotice: found.length === 0 ? buildLastTrainNotice(from, to) : null,
      };
    }

    const found = via ? findRoutesVia(from, via, to) : findRoutes(from, to);
    const available = found.filter((route) => !getRouteServiceError(route, now));
    return {
      routes: available,
      serviceError: found.length > 0 && available.length === 0 ? getRouteServiceError(found[0], now) : null,
      timedNotice: null,
    };
  }, [from, to, via]);

  const serviceErrorCopy = timedNotice ?? (serviceError ? buildServiceErrorCopy(serviceError) : null);
  const title = from && to ? `${from} → ${via ? `${via} → ` : ''}${to}` : '경로 후보';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + spacing.lg }]}>
      <Stack.Screen options={{ title: '경로 선택' }} />
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>소요시간과 환승 부담을 비교해 이동할 경로를 고르세요.</Text>
      </View>

      {!from || !to ? (
        <View style={styles.emptyCard}>
          <View style={[styles.emptyIcon, { backgroundColor: '#EBF4FF' }]}>
            <Ionicons name="navigate-circle-outline" size={24} color={colors.blue} />
          </View>
          <Text style={styles.emptyTitle}>출발역과 도착역이 필요합니다</Text>
          <Text style={styles.emptyBody}>홈에서 역을 선택한 뒤 다시 검색하세요.</Text>
        </View>
      ) : serviceErrorCopy ? (
        /* 막차/운행종료 — 별이 뜬 밤하늘 연출 */
        <View style={styles.nightCard}>
          <Starfield speed={0.2} density={0.34} shootingStars />
          <View style={styles.nightMoon}>
            <Ionicons name="moon" size={22} color="#DDE6FF" />
          </View>
          <Text style={styles.nightTitle}>{serviceErrorCopy.title}</Text>
          <Text style={styles.nightBody}>{serviceErrorCopy.description}</Text>
          <Text style={styles.nightHint}>{serviceErrorCopy.hint}</Text>
        </View>
      ) : routes.length > 0 ? (
        routes.map((route, index) => (
          <RouteCard
            key={`${route.totalTime}-${route.transferCount}-${index}`}
            route={route}
            index={index}
            from={from}
            to={to}
            via={via}
          />
        ))
      ) : (
        <View style={styles.emptyCard}>
          <View style={[styles.emptyIcon, { backgroundColor: '#FFF1E7' }]}>
            <Ionicons name="search-outline" size={24} color="#C15B1B" />
          </View>
          <Text style={styles.emptyTitle}>경로를 찾지 못했습니다</Text>
          <Text style={styles.emptyBody}>역 이름을 다시 확인하거나 경유역을 제거해보세요.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    color: palette.text,
  },
  body: {
    ...typography.body,
    color: palette.subtleText,
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
    ...cardShadow,
  },
  pressed: {
    opacity: 0.74,
  },
  cardMain: {
    flex: 1,
    gap: spacing.sm,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  timeRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeText: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '900',
  },
  arrivalText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  badgeItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  badgeConnector: {
    backgroundColor: '#E0E0E0',
    borderRadius: 1,
    height: 2,
    width: 16,
  },
  lineBadge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  lineBadgeText: {
    color: palette.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  patternRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  patternItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  patternDot: {
    borderRadius: radii.pill,
    height: 6,
    width: 6,
  },
  patternText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '800',
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  metaText: {
    color: palette.subtleText,
    fontSize: 13,
    fontWeight: '700',
  },
  warningPill: {
    backgroundColor: '#FFF1E7',
    borderRadius: radii.pill,
    color: '#C15B1B',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  fareText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.xl,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 48,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.body,
    color: palette.subtleText,
    textAlign: 'center',
  },
  nightCard: {
    // 그라데이션 미지원 환경(web) 폴백.
    backgroundColor: '#0e132e',
    experimental_backgroundImage: 'linear-gradient(165deg, #0b1026 0%, #141b3d 60%, #0e132e 100%)',
    borderRadius: radii.md,
    gap: spacing.sm,
    overflow: 'hidden',
    padding: spacing.lg,
    shadowColor: '#0D1238',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  nightMoon: {
    alignItems: 'center',
    backgroundColor: 'rgba(150, 170, 245, 0.18)',
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 44,
  },
  nightTitle: {
    color: '#F2F4FF',
    fontSize: 17,
    fontWeight: '900',
  },
  nightBody: {
    color: '#C2CCEC',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  nightHint: {
    color: '#8C97C4',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
});
