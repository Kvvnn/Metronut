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

import { Starfield } from '@/components/space';
import { PressableScale } from '@/components/ui';
import { impactHaptic, selectionHaptic, successHaptic } from '@/lib/haptics';
import { isFavoriteRoute, toggleFavoriteRoute } from '@/lib/routeFavorites';
import { saveRidingRoute, type RidingRoutePayload } from '@/lib/ridingSession';
import { cardShadow, colors, radii, spacing, typography } from '@/lib/theme';

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
  const line = getLineInfo(lineId);

  return (
    <View style={[styles.lineBadge, { backgroundColor: line?.color ?? colors.muted }]}>
      <Text style={styles.lineBadgeText}>{label ?? line?.shortName ?? lineId}</Text>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function RideSegment({
  segment,
  expanded,
  onToggle,
}: {
  segment: RouteSegment;
  expanded: boolean;
  onToggle: () => void;
}) {
  const line = getLineInfo(segment.lineId);
  const stationCount = Math.max(segment.stations.length - 1, 0);
  const middleStations = segment.stations.slice(1, -1);
  const direction = segment.pattern?.label ?? `${segment.toStation.name} 방면`;

  return (
    <View style={styles.rideCard}>
      <View style={styles.segmentHeader}>
        <LineBadge lineId={segment.lineId} label={line?.shortName} />
        <View style={styles.segmentTitleWrap}>
          <Text style={styles.segmentTitle}>{line?.name ?? segment.lineName}</Text>
          <Text style={styles.directionText}>{direction} 열차 탑승</Text>
        </View>
      </View>

      <View style={styles.stationBlock}>
        <View style={styles.stationRow}>
          <View style={[styles.stationDot, { borderColor: line?.color ?? segment.lineColor }]} />
          <Text style={styles.stationName}>{segment.fromStation.name}</Text>
        </View>
        <View style={styles.stationConnector} />
        <View style={styles.stationRow}>
          <View style={[styles.stationDot, { borderColor: line?.color ?? segment.lineColor }]} />
          <Text style={styles.stationName}>{segment.toStation.name}</Text>
        </View>
      </View>

      {stationCount > 1 ? (
        <Pressable style={({ pressed }) => [styles.middleButton, pressed && styles.pressed]} onPress={onToggle}>
          <Ionicons name="train-outline" size={16} color={line?.color ?? colors.green} />
          <Text style={styles.middleButtonText}>
            {stationCount}개 역 이동 · {segment.time}분
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
        </Pressable>
      ) : (
        <Text style={styles.segmentMeta}>{segment.time}분 이동</Text>
      )}

      {expanded && middleStations.length > 0 ? (
        <View style={styles.middleList}>
          {middleStations.map((station, index) => (
            <View key={`${station.id}-${index}`} style={styles.middleStationRow}>
              <View style={styles.middleDot} />
              <Text style={styles.middleStationText}>{station.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
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
  const toLine = getLineInfo(segment.lineId);
  const isLongTransfer = isLongTransferSegment(segment);
  const distanceLabel = segment.transferDistanceMeters ? ` · ${segment.transferDistanceMeters}m` : '';
  const fastTransferLabel = fastTransfer ? formatFastTransferInfo(fastTransfer) : '정보 없음';

  return (
    <View style={styles.transferCard}>
      <View style={styles.transferHeader}>
        <View style={styles.transferIcon}>
          <Ionicons name="walk-outline" size={18} color="#C15B1B" />
        </View>
        <View style={styles.segmentTitleWrap}>
          <View style={styles.transferTitleRow}>
            <Text style={styles.transferTitle}>환승</Text>
            <LineBadge lineId={segment.lineId} label={toLine?.shortName} />
            {isLongTransfer ? <Text style={styles.longTransferPill}>긴 환승</Text> : null}
          </View>
          <Text style={styles.transferBody}>
            환승 동선 {formatTransferDuration(segment)}
            {distanceLabel}
          </Text>
        </View>
      </View>

      <View style={styles.fastTransferRow}>
        <Ionicons name="flash-outline" size={15} color="#C15B1B" />
        <Text style={styles.fastTransferText}>빠른 환승 {fastTransferLabel}</Text>
      </View>
    </View>
  );
}

export default function RouteDetailScreen() {
  const router = useRouter();
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
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: '경로 상세' }} />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>경로를 불러오지 못했습니다</Text>
          <Text style={styles.emptyBody}>경로 선택 화면에서 다시 이동할 경로를 고르세요.</Text>
          <Link href="/" asChild>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>홈으로 돌아가기</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '경로 상세' }} />

      <View style={styles.header}>
        <Text style={styles.kicker}>선택한 경로</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryTop}>
          <View>
            <View style={styles.timeRow}>
              <Text style={styles.summaryTime}>{route.totalTime}분</Text>
              <Text style={styles.summaryUnit}>소요</Text>
            </View>
            <Text style={styles.arrivalText}>도착 예정 {calculateArrivalTime(route.totalTime)}</Text>
          </View>

          <Pressable
            accessibilityLabel={isFavorite ? '즐겨찾기 삭제' : '즐겨찾기 추가'}
            style={({ pressed }) => [styles.favoriteButton, isFavorite && styles.favoriteButtonActive, pressed && styles.pressed]}
            onPress={handleToggleFavorite}
          >
            <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={21} color={isFavorite ? '#C8A218' : colors.muted} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <StatPill label="환승" value={`${route.transferCount}회`} />
          <StatPill label="역" value={`${route.stationCount}개`} />
          <StatPill label="요금" value={`₩${route.fare.toLocaleString()}`} />
          <StatPill label="환승 이동" value={`${route.walkTime}분`} />
        </View>
      </View>

      <View style={styles.timelineHeader}>
        <Text style={styles.sectionTitle}>이동 타임라인</Text>
      </View>

      {route.segments.map((segment, index) =>
        segment.isTransfer ? (
          <TransferSegment key={`${segment.lineId}-${index}`} segment={segment} fastTransfer={fastTransfers[index]} />
        ) : (
          <RideSegment
            key={`${segment.lineId}-${segment.fromStation.id}-${segment.toStation.id}-${index}`}
            segment={segment}
            expanded={expandedSegments.has(index)}
            onToggle={() => toggleSegment(index)}
          />
        ),
      )}

      <PressableScale style={styles.ridingButton} haptic onPress={handleStartRiding}>
        <Starfield speed={0.5} density={0.22} />
        <Ionicons name="play" size={17} color={colors.surface} />
        <Text style={styles.ridingButtonText}>탑승 안내 시작</Text>
      </PressableScale>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 48,
  },
  header: {
    gap: spacing.xs,
  },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  summaryTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  timeRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  summaryTime: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
  },
  summaryUnit: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  arrivalText: {
    color: colors.subtleText,
    fontSize: 14,
    fontWeight: '800',
  },
  favoriteButton: {
    alignItems: 'center',
    backgroundColor: '#F0F1F4',
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  favoriteButtonActive: {
    backgroundColor: '#FFF7D9',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statPill: {
    backgroundColor: '#F0F1F4',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minWidth: 88,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  statValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  timelineHeader: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  rideCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...cardShadow,
  },
  segmentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segmentTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  segmentTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  directionText: {
    color: colors.subtleText,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  lineBadge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    minWidth: 34,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  lineBadgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  stationBlock: {
    paddingLeft: 3,
  },
  stationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 30,
  },
  stationDot: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 3,
    height: 16,
    width: 16,
  },
  stationName: {
    color: colors.text,
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
  },
  stationConnector: {
    backgroundColor: colors.border,
    height: 18,
    marginLeft: 7,
    width: 2,
  },
  middleButton: {
    alignItems: 'center',
    backgroundColor: '#F0F1F4',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  middleButtonText: {
    color: colors.subtleText,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  segmentMeta: {
    color: colors.subtleText,
    fontSize: 13,
    fontWeight: '800',
  },
  middleList: {
    gap: spacing.xs,
    paddingLeft: spacing.sm,
  },
  middleStationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 28,
  },
  middleDot: {
    backgroundColor: '#C2C5CC',
    borderRadius: radii.pill,
    height: 6,
    width: 6,
  },
  middleStationText: {
    color: colors.subtleText,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  transferCard: {
    backgroundColor: '#FFF8EF',
    borderColor: '#F0E4D0',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  transferHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  transferIcon: {
    alignItems: 'center',
    backgroundColor: '#FBEAD9',
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  transferTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  transferTitle: {
    color: '#C15B1B',
    fontSize: 15,
    fontWeight: '900',
  },
  transferBody: {
    color: colors.subtleText,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  longTransferPill: {
    backgroundColor: '#FBEAD9',
    borderRadius: radii.pill,
    color: '#C15B1B',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fastTransferRow: {
    alignItems: 'center',
    backgroundColor: '#FFF3E6',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
  },
  fastTransferText: {
    color: '#C15B1B',
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '900',
  },
  // 웹 '탑승 안내 시작' 딥스페이스 버튼(그라데이션 우선, Starfield 는 Phase 8).
  ridingButton: {
    alignItems: 'center',
    borderRadius: 16,
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
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  emptyBody: {
    ...typography.body,
    color: colors.subtleText,
  },
  pressed: {
    opacity: 0.72,
  },
});
