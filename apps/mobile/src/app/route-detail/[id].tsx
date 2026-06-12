import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  calculateArrivalTime,
  findRoutes,
  findRoutesVia,
  formatTransferDuration,
  getLineInfo,
  involvesScheduledLine,
  isLongTransferSegment,
  type Route,
  type RouteSegment,
} from '@shared/metro/pathfinder';
import { OFFICIAL_FAST_TRANSFERS } from '@shared/metro/officialFastTransfers';
import { getRouteServiceError } from '@shared/metro/routeServiceWindow';
import {
  findFastTransferInfo,
  formatFastTransferInfo,
  type FastTransferInfo,
  type FastTransferLookupInput,
} from '@shared/fastTransfer';

import { useTabBarHeight } from '@/components/AppTabBar';
import { Starfield } from '@/components/space';
import { PressableScale } from '@/components/ui';
import { impactHaptic, selectionHaptic, successHaptic } from '@/lib/haptics';
import { isFavoriteRoute, toggleFavoriteRoute } from '@/lib/routeFavorites';
import { saveRidingRoute, type RidingRoutePayload } from '@/lib/ridingSession';
import { radii, spacing, typography, type Palette } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function getRideDirection(segment: RouteSegment | undefined) {
  if (!segment || segment.isTransfer) return undefined;
  return segment.pattern?.label ?? `${segment.toStation.name} 방면`;
}

function uniqueNames(names: (string | undefined)[]) {
  return Array.from(new Set(names.filter((name): name is string => Boolean(name))));
}

function getRideDirectionNames(segment: RouteSegment | undefined) {
  if (!segment || segment.isTransfer) return [];

  return uniqueNames([
    segment.pattern?.terminus,
    segment.pattern?.label,
    segment.toStation.name,
    ...segment.stations.map((station) => station.name),
  ]);
}

function getTransferLookupInput(route: Route, transferIndex: number): FastTransferLookupInput | null {
  const segment = route.segments[transferIndex];
  if (!segment?.isTransfer) return null;

  const prevRide = route.segments
    .slice(0, transferIndex)
    .reverse()
    .find((candidate) => !candidate.isTransfer);
  const nextRide = route.segments.slice(transferIndex + 1).find((candidate) => !candidate.isTransfer);

  if (!prevRide || !nextRide) return null;

  return {
    stationName: segment.fromStation.name,
    fromLineId: prevRide.lineId,
    toLineId: nextRide.lineId,
    fromDirection: getRideDirection(prevRide),
    toDirection: getRideDirection(nextRide),
    fromDirectionNames: getRideDirectionNames(prevRide),
    toDirectionNames: getRideDirectionNames(nextRide),
    nextStationName: nextRide.stations[1]?.name,
  };
}

function buildRidingRoutePayload(route: Route, fastTransfers: Record<number, FastTransferInfo | null>): RidingRoutePayload {
  return {
    segments: route.segments.map((segment, index) => {
      if (segment.isTransfer) {
        const prevRide = route.segments
          .slice(0, index)
          .reverse()
          .find((candidate) => !candidate.isTransfer);
        const nextRide = route.segments.slice(index + 1).find((candidate) => !candidate.isTransfer);
        const toLine = getLineInfo(segment.lineId);

        return {
          type: 'transfer',
          stationName: segment.fromStation.name,
          fromLineId: prevRide?.lineId ?? '',
          toLineId: segment.lineId,
          toLineName: toLine?.name ?? segment.lineName,
          toDirection: nextRide ? getRideDirection(nextRide) ?? `${nextRide.toStation.name} 방면` : '',
          walkMinutes: segment.time,
          walkSeconds: segment.transferSeconds,
          walkDistanceMeters: segment.transferDistanceMeters,
          fastTransfer: fastTransfers[index] ?? null,
        };
      }

      const line = getLineInfo(segment.lineId);
      return {
        type: 'ride',
        lineId: segment.lineId,
        lineName: line?.name ?? segment.lineName,
        direction: getRideDirection(segment) ?? `${segment.toStation.name} 방면`,
        patternLabel: segment.pattern?.label,
        patternTerminus: segment.pattern?.terminus,
        fromStationName: segment.fromStation.name,
        toStationName: segment.toStation.name,
        stationNames: segment.stations.map((station) => station.name),
      };
    }),
    overallFromStation: route.segments[0]?.fromStation.name ?? '',
    overallToStation: route.segments[route.segments.length - 1]?.toStation.name ?? '',
    savedAt: Date.now(),
  };
}

function LineBadge({ lineId, label }: { lineId: string; label?: string }) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const line = getLineInfo(lineId);

  return (
    <View style={[styles.lineBadge, { backgroundColor: line?.color ?? palette.muted }]}>
      <Text style={styles.lineBadgeText}>{label ?? line?.shortName ?? lineId}</Text>
    </View>
  );
}

function RideSegment({
  segment,
  isFirst,
  isLast,
  expanded,
  onToggle,
}: {
  segment: RouteSegment;
  isFirst: boolean;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const line = getLineInfo(segment.lineId);
  const segmentColor = line?.color ?? segment.lineColor;
  const stationCount = Math.max(segment.stations.length - 1, 0);
  const middleStations = segment.stations.slice(1, -1);

  return (
    <View style={styles.timelineSegment}>
      {/* 세로 러닝 라인 — 점들이 위에 덮여 정거장처럼 보인다. */}
      <View
        style={[
          styles.railLine,
          { backgroundColor: segmentColor, bottom: isLast ? 44 : 16 },
        ]}
      />

      {/* 승차역 */}
      <View style={styles.timelineRow}>
        <View style={styles.railCol}>
          <View style={[styles.endpointDot, { borderColor: segmentColor }]} />
        </View>
        <View style={styles.timelineContent}>
          {isFirst ? <Text style={styles.boardLabel}>승차</Text> : null}
          <View style={styles.stationNameRow}>
            <Text style={styles.stationName} numberOfLines={1}>
              {segment.fromStation.name}
            </Text>
            <LineBadge lineId={segment.lineId} label={line?.shortName} />
          </View>
          {segment.pattern ? (
            <View style={styles.patternRow}>
              <View style={[styles.patternDot, { backgroundColor: segmentColor }]} />
              <Text style={styles.patternText}>
                {segment.pattern.label} 열차 탑승
                {segment.boardWaitSeconds != null && segment.boardWaitSeconds > 0
                  ? `  ·  약 ${Math.max(1, Math.round(segment.boardWaitSeconds / 60))}분 대기`
                  : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* 중간역 (접이식) */}
      {stationCount > 1 ? (
        <Pressable style={({ pressed }) => [styles.middleRow, pressed && styles.pressed]} onPress={onToggle}>
          <View style={styles.railCol}>
            <View style={styles.middleIconMask}>
              <Ionicons name="train-outline" size={14} color={segmentColor} />
            </View>
          </View>
          <View style={styles.middlePill}>
            <Text style={styles.middleButtonText} numberOfLines={1}>
              {stationCount}개 역 이동 ({segment.time}분)
            </Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={palette.subtleText} />
          </View>
        </Pressable>
      ) : null}

      {expanded && middleStations.length > 0 ? (
        <View>
          {middleStations.map((station, index) => (
            <View key={`${station.id}-${index}`} style={styles.middleStationRow}>
              <View style={styles.railCol}>
                <View style={styles.middleDot} />
              </View>
              <Text style={styles.middleStationText} numberOfLines={1}>
                {station.name}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* 하차역 */}
      <View style={styles.timelineRow}>
        <View style={styles.railCol}>
          <View style={[styles.endpointDot, { borderColor: segmentColor }]} />
        </View>
        <View style={styles.timelineContent}>
          {isLast ? <Text style={styles.boardLabel}>하차</Text> : null}
          <View style={styles.stationNameRow}>
            <Text style={styles.stationName} numberOfLines={1}>
              {segment.toStation.name}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function TransferSegment({
  segment,
  fastTransfer,
}: {
  segment: RouteSegment;
  fastTransfer?: FastTransferInfo | null;
}) {
  const styles = useThemedStyles(makeStyles);
  const toLine = getLineInfo(segment.lineId);
  const isLongTransfer = isLongTransferSegment(segment);
  const distanceLabel = segment.transferDistanceMeters ? ` · ${segment.transferDistanceMeters}m` : '';
  const fastTransferLabel = fastTransfer ? `빠른 환승 ${formatFastTransferInfo(fastTransfer)}` : '빠른 환승 정보 없음';

  return (
    <View style={styles.transferRow}>
      <View style={styles.railCol}>
        <Ionicons name="walk-outline" size={16} color="#E67E22" />
      </View>
      <View style={styles.transferBox}>
        <View style={styles.transferTitleRow}>
          <Text style={styles.transferTitle}>환승</Text>
          <LineBadge lineId={segment.lineId} label={toLine?.shortName} />
          {isLongTransfer ? <Text style={styles.longTransferPill}>긴 환승</Text> : null}
        </View>
        <Text style={styles.transferBody}>
          환승 동선 {formatTransferDuration(segment)}
          {distanceLabel} · {fastTransferLabel}
        </Text>
      </View>
    </View>
  );
}

export default function RouteDetailScreen() {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const params = useLocalSearchParams<{ id?: string; from?: string; via?: string; to?: string }>();
  const id = firstParam(params.id);
  const from = firstParam(params.from);
  const via = firstParam(params.via);
  const to = firstParam(params.to);
  const parsedRouteIndex = Number.parseInt(id || '0', 10);
  const routeIndex = Number.isFinite(parsedRouteIndex) ? parsedRouteIndex : 0;

  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(() => new Set());
  const [isFavorite, setIsFavorite] = useState(false);

  const routes = useMemo(() => {
    if (!from || !to) return [] as Route[];

    const now = new Date();
    // route-result와 동일한 탐색을 써야 routeIndex가 일치한다.
    if (involvesScheduledLine(from, via || undefined, to)) {
      return via
        ? findRoutesVia(from, via, to, { departAt: now })
        : findRoutes(from, to, { departAt: now });
    }

    const found = via ? findRoutesVia(from, via, to) : findRoutes(from, to);
    return found.filter((route) => !getRouteServiceError(route, now));
  }, [from, to, via]);

  const route = routes[routeIndex] ?? null;

  const fastTransfers = useMemo<Record<number, FastTransferInfo | null>>(() => {
    if (!route) return {};

    return Object.fromEntries(
      route.segments
        .map((segment, index) => {
          const input = segment.isTransfer ? getTransferLookupInput(route, index) : null;
          if (!input) return null;
          return [index, findFastTransferInfo(OFFICIAL_FAST_TRANSFERS, input)] as const;
        })
        .filter((entry): entry is readonly [number, FastTransferInfo | null] => Boolean(entry)),
    );
  }, [route]);

  useEffect(() => {
    let mounted = true;

    if (!from || !to) {
      setIsFavorite(false);
      return () => {
        mounted = false;
      };
    }

    isFavoriteRoute(from, to, via).then((next) => {
      if (mounted) setIsFavorite(next);
    });

    return () => {
      mounted = false;
    };
  }, [from, to, via]);

  const toggleSegment = (index: number) => {
    selectionHaptic();
    setExpandedSegments((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleToggleFavorite = async () => {
    if (!route || !from || !to) return;

    impactHaptic();
    const nextFavorite = await toggleFavoriteRoute({
      from,
      to,
      via: via || undefined,
      time: `${route.totalTime}분`,
      transferCount: route.transferCount,
    });
    setIsFavorite(nextFavorite);
  };

  const handleStartRiding = async () => {
    if (!route) return;

    successHaptic();
    await saveRidingRoute(buildRidingRoutePayload(route, fastTransfers));
    router.push('/riding');
  };

  const title = from && to ? `${from} → ${via ? `${via} → ` : ''}${to}` : '경로 상세';

  if (!route) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + spacing.lg }]}>
        <Stack.Screen options={{ title: '경로 상세' }} />
        {/* 경로 없음 — 딥스페이스 연출(막차/오류 카드와 일관) */}
        <View style={styles.nightCard}>
          <Starfield speed={0.2} density={0.32} shootingStars />
          <View style={styles.nightMoon}>
            <Ionicons name="planet-outline" size={22} color="#DDE6FF" />
          </View>
          <Text style={styles.nightTitle}>경로를 불러오지 못했습니다</Text>
          <Text style={styles.nightBody}>경로 선택 화면에서 다시 이동할 경로를 고르세요.</Text>
          <Link href="/" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <View style={styles.nightButton}>
                <Text style={styles.nightButtonText}>홈으로 돌아가기</Text>
              </View>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scrollFlex} contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 100 }]}>
        <Stack.Screen options={{ title: '경로 상세' }} />

      <View style={styles.header}>
        <Text style={styles.kicker}>선택한 경로</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryTop}>
          <View style={styles.timeRow}>
            <Text style={styles.summaryTime}>{route.totalTime}분</Text>
            <Text style={styles.summaryUnit}>소요</Text>
          </View>

          <View style={styles.summaryRight}>
            <Text style={styles.arrivalLabel}>도착 예정</Text>
            <Text style={styles.arrivalText}>{calculateArrivalTime(route.totalTime)}</Text>
          </View>

          <Pressable
            accessibilityLabel={isFavorite ? '즐겨찾기 삭제' : '즐겨찾기 추가'}
            style={({ pressed }) => [styles.favoriteButton, isFavorite && styles.favoriteButtonActive, pressed && styles.pressed]}
            onPress={handleToggleFavorite}
          >
            <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={21} color={isFavorite ? '#C8A218' : palette.muted} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statText}>환승 {route.transferCount}회</Text>
          <Text style={styles.statDivider}>·</Text>
          <Text style={styles.statText}>{route.stationCount}개 역</Text>
          <Text style={styles.statDivider}>·</Text>
          <Text style={styles.statText}>₩{route.fare.toLocaleString()}</Text>
          {route.walkTime > 0 ? (
            <>
              <Text style={styles.statDivider}>·</Text>
              <Text style={styles.statText}>환승 이동 {route.walkTime}분</Text>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.timelineHeader}>
        <Text style={styles.sectionTitle}>이동 타임라인</Text>
      </View>

      <View style={styles.timeline}>
        {route.segments.map((segment, index) =>
          segment.isTransfer ? (
            <TransferSegment key={`${segment.lineId}-${index}`} segment={segment} fastTransfer={fastTransfers[index]} />
          ) : (
            <RideSegment
              key={`${segment.lineId}-${segment.fromStation.id}-${segment.toStation.id}-${index}`}
              segment={segment}
              isFirst={index === 0}
              isLast={index === route.segments.length - 1}
              expanded={expandedSegments.has(index)}
              onToggle={() => toggleSegment(index)}
            />
          ),
        )}
      </View>

      </ScrollView>

      {/* 하단 고정 CTA — 웹과 동일하게 탭바 위에 떠 있고 위쪽 페이드로 콘텐츠와 자연스럽게 이어짐 */}
      <View style={[styles.ctaDock, { bottom: tabBarHeight }]} pointerEvents="box-none">
        <View style={styles.ctaFade} pointerEvents="none" />
        <PressableScale style={styles.ridingButton} haptic onPress={handleStartRiding}>
          <Starfield speed={0.5} density={0.22} />
          <Ionicons name="play" size={17} color="#FFFFFF" />
          <Text style={styles.ridingButtonText}>탑승 안내 시작</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollFlex: {
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 48,
  },
  ctaDock: {
    backgroundColor: palette.background,
    left: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
    position: 'absolute',
    right: 0,
  },
  ctaFade: {
    // RNW 그라데이션 파서가 rgba(...)의 내부 콤마에서 깨져 route-detail 전체가 크래시했음
    // → transparent 키워드(콤마 없음)로 교체.
    experimental_backgroundImage: `linear-gradient(180deg, transparent 0%, ${palette.background} 100%)`,
    height: 28,
    left: 0,
    position: 'absolute',
    right: 0,
    top: -28,
  },
  header: {
    gap: spacing.xs,
  },
  kicker: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.title,
    color: palette.text,
  },
  summary: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  summaryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  summaryTime: {
    color: palette.text,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  summaryUnit: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  arrivalLabel: {
    color: palette.subtleText,
    fontSize: 12,
    fontWeight: '700',
  },
  arrivalText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 1,
  },
  favoriteButton: {
    alignItems: 'center',
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  favoriteButtonActive: {
    backgroundColor: '#FFF7D9',
  },
  statsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statText: {
    color: palette.subtleText,
    fontSize: 13,
    fontWeight: '700',
  },
  statDivider: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  timelineHeader: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '900',
  },
  timeline: {
    gap: 0,
  },
  lineBadge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    minWidth: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lineBadgeText: {
    color: palette.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  // ── 연속 세로 타임라인(웹 RouteDetail 이식) ──
  timelineSegment: {
    position: 'relative',
  },
  railLine: {
    borderRadius: 2,
    left: 20,
    position: 'absolute',
    top: 20,
    width: 3,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  railCol: {
    alignItems: 'center',
    paddingTop: 12,
    width: 44,
  },
  endpointDot: {
    backgroundColor: palette.surface,
    borderRadius: radii.pill,
    borderWidth: 3,
    height: 16,
    width: 16,
  },
  timelineContent: {
    flex: 1,
    minWidth: 0,
    paddingBottom: spacing.lg,
    paddingTop: 6,
  },
  boardLabel: {
    color: palette.subtleText,
    fontSize: 13,
    marginBottom: 2,
  },
  stationNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stationName: {
    color: palette.text,
    flexShrink: 1,
    fontSize: 22,
    fontWeight: '800',
  },
  patternRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  patternDot: {
    borderRadius: radii.pill,
    height: 6,
    width: 6,
  },
  patternText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  middleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: 4,
  },
  middleIconMask: {
    alignItems: 'center',
    backgroundColor: palette.background,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  middlePill: {
    alignItems: 'center',
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.md,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  middleButtonText: {
    color: palette.subtleText,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  middleStationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: 3,
  },
  middleDot: {
    backgroundColor: palette.muted,
    borderRadius: radii.pill,
    height: 6,
    width: 6,
  },
  middleStationText: {
    color: palette.subtleText,
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  transferRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  transferBox: {
    backgroundColor: '#FFF7EF',
    borderRadius: radii.md,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  transferTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  transferTitle: {
    color: '#E67E22',
    fontSize: 13,
    fontWeight: '700',
  },
  transferBody: {
    color: palette.subtleText,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 4,
  },
  longTransferPill: {
    backgroundColor: '#FFE7D7',
    borderRadius: radii.pill,
    color: '#C15B1B',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  // 웹 '탑승 안내 시작' 딥스페이스 버튼(그라데이션 우선, Starfield 는 Phase 8).
  ridingButton: {
    alignItems: 'center',
    borderRadius: 16,
    // 그라데이션 미지원 환경(web) 폴백 — 단색 딥스페이스.
    backgroundColor: '#0b1026',
    experimental_backgroundImage: 'linear-gradient(160deg, #141b3d 0%, #0b1026 100%)',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 56,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    shadowColor: '#0D1238',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  ridingButtonText: {
    color: palette.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  nightCard: {
    alignItems: 'flex-start',
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
    fontSize: 18,
    fontWeight: '900',
  },
  nightBody: {
    color: '#C2CCEC',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  nightButton: {
    alignItems: 'center',
    backgroundColor: '#EAF0FF',
    borderRadius: radii.sm,
    justifyContent: 'center',
    marginTop: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  nightButtonText: {
    color: '#0B1026',
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
