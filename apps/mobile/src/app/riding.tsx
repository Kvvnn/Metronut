import { Ionicons } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatFastTransferInfo } from '@shared/fastTransfer';
import { getExpressStopNames, getLineInfo } from '@shared/metro/pathfinder';
import {
  dedupeTrainsByNo,
  enrichTrains,
  filterSameDirectionTrains,
  formatPositionAge,
  getForwardDistance,
  isBeforeBoardingStation,
  isCircularLineId,
  isDeepInactiveTrain,
  isPastLastTrain,
  orientRideStations,
} from '@shared/metro/ridingTrains';

import { useTabBarHeight } from '@/components/AppTabBar';
import { Starfield, VoyageTrack } from '@/components/space';
import { BottomSheet } from '@/components/ui';
import { getAppPreferences } from '@/lib/appPreferences';
import { ensureNotificationPermission, sendRidingAlert } from '@/lib/notifications';
import { getTrainPositions, type TrainPosition } from '@/lib/realtimeApi';
import { impactHaptic, selectionHaptic, successHaptic, warningHaptic } from '@/lib/haptics';
import {
  getRidingRoute,
  getRidingSessionState,
  saveRidingSessionState,
  type RidingRideSegment,
  type RidingRoutePayload,
  type RidingRouteSegment,
  type RidingTransferSegment,
} from '@/lib/ridingSession';
import { cardShadow, radii, spacing, type Palette } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

interface TrainCandidate extends TrainPosition {
  routeStationIndex: number;
  isSimulatedCandidate: boolean;
}

const TRAIN_POSITION_POLL_MS = 15000;
/** 열차 선택 드로어: 펼친/접힌 노출 높이(safe-area 제외). 웹처럼 콘텐츠에 맞춰 낮게. */
const DRAWER_EXPANDED_HEIGHT = 256;
const DRAWER_COLLAPSED_HEIGHT = 64;
/** 가로 역 레일(웹식 열차 선택) 한 역 칸 너비 / 좌우 패딩. */
const RAIL_STATION_WIDTH = 84;
const RAIL_PADDING = 16;
/** 열차 레인(46) + 점 래퍼 절반(10) = 점 중앙. 라인을 위에서부터 잡아 플랫폼 무관하게 점을 통과. */
const RAIL_TRAIN_LANE_HEIGHT = 46;
const RAIL_DOT_WRAP_HEIGHT = 20;
const RAIL_LINE_TOP = RAIL_TRAIN_LANE_HEIGHT + RAIL_DOT_WRAP_HEIGHT / 2 - 1.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function findFirstRideIndex(segments: RidingRouteSegment[]) {
  return Math.max(
    0,
    segments.findIndex((segment) => segment.type === 'ride'),
  );
}

function findNextRideSegment(route: RidingRoutePayload | null, startIndex: number) {
  if (!route) return null;
  return route.segments.slice(startIndex).find((segment): segment is RidingRideSegment => segment.type === 'ride') ?? null;
}

function getRideNumber(route: RidingRoutePayload | null, segmentIndex: number) {
  if (!route) return { current: 0, total: 0 };
  const rideIndexes = route.segments
    .map((segment, index) => ({ segment, index }))
    .filter((item) => item.segment.type === 'ride')
    .map((item) => item.index);
  const current = rideIndexes.findIndex((index) => index >= segmentIndex);
  return { current: current >= 0 ? current + 1 : rideIndexes.length, total: rideIndexes.length };
}

function stationProgress(segment: RidingRideSegment | null, currentStationIndex: number) {
  if (!segment || segment.stationNames.length <= 1) return 1;
  return clamp(currentStationIndex, 0, segment.stationNames.length - 1) / (segment.stationNames.length - 1);
}

function createSimulatedCandidates(segment: RidingRideSegment): TrainCandidate[] {
  const stationNames = segment.stationNames.length > 0 ? segment.stationNames : [segment.fromStationName];
  const lastIndex = stationNames.length - 1;
  const rawIndexes = [0, Math.floor(lastIndex / 2), Math.max(0, lastIndex - 1)];
  const indexes = Array.from(new Set(rawIndexes)).slice(0, 3);

  return indexes.map((stationIndex, index) => ({
    trainNo: `S${2001 + index}`,
    stationName: stationNames[stationIndex] ?? segment.fromStationName,
    updnLine: '',
    trainStatus: String(index % 3),
    destination: segment.toStationName,
    receivedAt: new Date().toISOString(),
    trainType: index === 2 ? '급행' : '일반',
    routeStationIndex: stationIndex,
    isSimulatedCandidate: true,
  }));
}

function toTrainCandidates(
  positions: TrainPosition[],
  segment: RidingRideSegment,
  selectedTrainNo: string | null,
): TrainCandidate[] {
  const oriented = orientRideStations(
    segment.lineId,
    segment.fromStationName,
    segment.toStationName,
    segment.stationNames,
  );
  const routeStationSet = new Set(segment.stationNames);
  const isCircular = isCircularLineId(segment.lineId);
  const stationIndex = new Map(segment.stationNames.map((stationName, index) => [stationName, index]));

  // 같은 방향 열차만 남기고(updnLine/종착역 기준), 이미 도착역을 지난 열차는 제외한다.
  const sameDirection = filterSameDirectionTrains(
    enrichTrains(positions, oriented),
    oriented,
    selectedTrainNo,
  );
  const active = dedupeTrainsByNo(sameDirection).filter(
    (train) =>
      !isDeepInactiveTrain(
        train,
        routeStationSet,
        oriented.fromIdx,
        oriented.toIdx,
        oriented.stations.length,
        isCircular,
      ),
  );

  return active
    .map((train) => ({
      ...train,
      routeStationIndex: stationIndex.get(train.stationName) ?? -1,
      isSimulatedCandidate: false,
    }))
    .sort((a, b) => {
      if (a.routeStationIndex < 0 && b.routeStationIndex >= 0) return 1;
      if (a.routeStationIndex >= 0 && b.routeStationIndex < 0) return -1;
      return a.routeStationIndex - b.routeStationIndex;
    })
    .slice(0, 8);
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

function TransferNotice({ transfer }: { transfer: RidingTransferSegment }) {
  const styles = useThemedStyles(makeStyles);
  const distanceLabel = transfer.walkDistanceMeters ? ` · ${transfer.walkDistanceMeters}m` : '';
  const fastTransferLabel = transfer.fastTransfer ? formatFastTransferInfo(transfer.fastTransfer) : '정보 없음';

  return (
    <View style={styles.transferNotice}>
      <View style={styles.transferNoticeHeader}>
        <Ionicons name="walk-outline" size={18} color="#C15B1B" />
        <Text style={styles.transferNoticeTitle}>{transfer.stationName} 환승</Text>
        <LineBadge lineId={transfer.toLineId} />
      </View>
      <Text style={styles.transferNoticeBody}>
        {transfer.toLineName} {transfer.toDirection} · 도보 약 {transfer.walkMinutes}분{distanceLabel}
      </Text>
      <Text style={styles.transferNoticeFast}>빠른 환승 {fastTransferLabel}</Text>
    </View>
  );
}

export default function RidingScreen() {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [route, setRoute] = useState<RidingRoutePayload | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [selectedTrainNo, setSelectedTrainNo] = useState<string | null>(null);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [drawerExpanded, setDrawerExpanded] = useState(true);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const [alarmBefore, setAlarmBefore] = useState(1);
  const [trainCandidates, setTrainCandidates] = useState<TrainCandidate[]>([]);
  const [loadingTrains, setLoadingTrains] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [positionMessage, setPositionMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // 환승 전역(직전 역 도달)에서 다음 노선 열차를 미리 골라두는 상태.
  const [nextLineTrains, setNextLineTrains] = useState<TrainPosition[]>([]);
  const [pendingNextTrainNo, setPendingNextTrainNo] = useState<string | null>(null);
  // 환승 후 첫 후보 갱신에서 carryover가 소비한다.
  const pendingNextTrainNoRef = useRef<string | null>(null);
  // 하차/환승 알림이 같은 구간에서 중복 발송되지 않도록 한 번만 발사.
  const alarmFiredRef = useRef(false);
  const [notificationBlocked, setNotificationBlocked] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadRoute() {
      const nextRoute = await getRidingRoute();
      if (!mounted) return;

      setRoute(nextRoute);
      if (!nextRoute) return;

      const restored = await getRidingSessionState(nextRoute.savedAt);
      if (!mounted) return;

      if (restored) {
        setCurrentSegmentIndex(clamp(restored.currentSegmentIndex, 0, nextRoute.segments.length - 1));
        setCurrentStationIndex(Math.max(0, restored.currentStationIndex));
        setSelectedTrainNo(restored.selectedTrainNo);
        setAlarmEnabled(restored.alarmEnabled);
        setAlarmBefore(restored.alarmBefore);
      } else {
        setCurrentSegmentIndex(findFirstRideIndex(nextRoute.segments));
        const preferences = await getAppPreferences();
        if (!mounted) return;
        setAlarmBefore(preferences.defaultAlarmBefore);
      }
    }

    void loadRoute();

    return () => {
      mounted = false;
    };
  }, []);

  const currentSegment = route?.segments[currentSegmentIndex] ?? null;
  const currentRideSegment = useMemo(
    () =>
      currentSegment?.type === 'ride'
        ? currentSegment
        : findNextRideSegment(route, currentSegmentIndex + 1),
    [currentSegment, currentSegmentIndex, route],
  );
  const upcomingTransfer = useMemo(() => {
    if (!route || currentSegment?.type !== 'ride') return null;
    return route.segments
      .slice(currentSegmentIndex + 1)
      .find((segment): segment is RidingTransferSegment => segment.type === 'transfer') ?? null;
  }, [currentSegment, currentSegmentIndex, route]);
  const rideCount = getRideNumber(route, currentSegmentIndex);
  // 전체 탑승 구간 목록과 현재 구간 인덱스(웹식 세그먼트 진행 바용).
  const rideSegments = useMemo(
    () =>
      route
        ? route.segments
            .map((segment, idx) => ({ segment, idx }))
            .filter((entry): entry is { segment: RidingRideSegment; idx: number } => entry.segment.type === 'ride')
        : [],
    [route],
  );
  const currentRideIdx = rideSegments.findIndex((entry) => entry.segment === currentRideSegment);
  const line = currentRideSegment ? getLineInfo(currentRideSegment.lineId) : null;
  const maxStationIndex = currentRideSegment ? Math.max(0, currentRideSegment.stationNames.length - 1) : 0;
  const safeStationIndex = clamp(currentStationIndex, 0, maxStationIndex);
  const currentStationName = currentRideSegment?.stationNames[safeStationIndex] ?? currentRideSegment?.fromStationName ?? '';
  const remainingStations = Math.max(0, maxStationIndex - safeStationIndex);
  const progress = stationProgress(currentRideSegment, safeStationIndex);
  const selectedTrain = trainCandidates.find((candidate) => candidate.trainNo === selectedTrainNo) ?? null;
  // 가로 역 레일(웹식 열차 선택)용: 정렬된 전체 노선 + 후보 열차를 역 인덱스에 매핑.
  const oriented = useMemo(
    () =>
      currentRideSegment
        ? orientRideStations(
            currentRideSegment.lineId,
            currentRideSegment.fromStationName,
            currentRideSegment.toStationName,
            currentRideSegment.stationNames,
          )
        : null,
    [currentRideSegment],
  );
  const routeStationSet = useMemo(
    () => new Set(currentRideSegment?.stationNames ?? []),
    [currentRideSegment],
  );
  const candidatesByOrientedIdx = useMemo(() => {
    const indexByName = new Map<string, number>();
    oriented?.stations.forEach((station, idx) => indexByName.set(station.name, idx));
    const map = new Map<number, TrainCandidate[]>();
    trainCandidates.forEach((candidate) => {
      const idx = indexByName.get(candidate.stationName);
      if (idx === undefined) return;
      const list = map.get(idx) ?? [];
      list.push(candidate);
      map.set(idx, list);
    });
    return map;
  }, [oriented, trainCandidates]);
  const railRef = useRef<ScrollView>(null);
  // 구간별로 한 번만 승차역으로 자동 스크롤(레일 콘텐츠가 측정된 뒤 실행해야 정확하다).
  const railScrolledKeyRef = useRef<string | null>(null);
  const railSegmentKey = currentRideSegment
    ? `${currentRideSegment.lineId}:${currentRideSegment.fromStationName}:${currentRideSegment.toStationName}`
    : '';
  const scrollRailToBoarding = useCallback(() => {
    if (!oriented || oriented.fromIdx < 0) return;
    if (railScrolledKeyRef.current === railSegmentKey) return;
    railScrolledKeyRef.current = railSegmentKey;
    const x = Math.max(0, oriented.fromIdx * RAIL_STATION_WIDTH - 80);
    railRef.current?.scrollTo({ x, animated: false });
  }, [oriented, railSegmentKey]);
  const isFinalArrival = Boolean(route && currentSegmentIndex >= route.segments.length - 1 && remainingStations === 0);
  // 선택한 열차가 아직 승차역에 못 온 "승차 대기" 상태 — 도달 정거장 수·ETA(웹 대응, 역간 2분 가정).
  const selectedTrainOrientedIdx =
    selectedTrain && oriented ? oriented.stations.findIndex((station) => station.name === selectedTrain.stationName) : -1;
  const isWaitingForBoard = Boolean(
    selectedTrain &&
      oriented &&
      oriented.fromIdx >= 0 &&
      selectedTrainOrientedIdx >= 0 &&
      selectedTrainOrientedIdx < oriented.fromIdx &&
      safeStationIndex === 0,
  );
  const stationsUntilBoard = isWaitingForBoard && oriented ? oriented.fromIdx - selectedTrainOrientedIdx : 0;
  const boardEtaMinutes = !isWaitingForBoard
    ? 0
    : selectedTrain?.trainStatus === '2'
      ? Math.max(1, stationsUntilBoard * 2 - 1)
      : stationsUntilBoard * 2;
  // 폴링(lastUpdated)마다 리렌더되므로 매 렌더 계산으로 충분하다.
  const isPastLastTrainForRide = currentRideSegment
    ? isPastLastTrain(
        currentRideSegment.lineId,
        currentRideSegment.fromStationName,
        currentRideSegment.toStationName,
        new Date(),
      )
    : false;
  // 선택한 열차가 급행/특급이면 현재 경로에서 통과(무정차)하는 역을 안내한다.
  // skipped === null: 정차패턴이 여럿이라 통과역을 단정할 수 없는 경우.
  const expressSkipInfo = useMemo(() => {
    const type = selectedTrain?.trainType;
    if (!currentRideSegment || (type !== '급행' && type !== '특급')) return null;
    const stopNames = getExpressStopNames(currentRideSegment.lineId, type);
    if (!stopNames) return { type, skipped: null as string[] | null };
    const names = currentRideSegment.stationNames;
    const stopIdxs = names.map((name, index) => (stopNames.has(name) ? index : -1)).filter((index) => index >= 0);
    if (stopIdxs.length < 2) return { type, skipped: null };
    const skipped = names
      .slice(stopIdxs[0], stopIdxs[stopIdxs.length - 1] + 1)
      .filter((name) => !stopNames.has(name));
    return { type, skipped };
  }, [currentRideSegment, selectedTrain?.trainType]);

  // 현재 탑승 구간 이후의 다음 탑승 구간 (환승 후 노선).
  const nextRideSegment = useMemo(
    () => findNextRideSegment(route, currentSegmentIndex + 1),
    [route, currentSegmentIndex],
  );
  // 환승 전역 윈도: 환승이 남아 있고, 열차 추적 중이며, 환승역 직전 역에 도달.
  const inPreTransferWindow = Boolean(
    currentSegment?.type === 'ride' &&
      upcomingTransfer &&
      nextRideSegment &&
      selectedTrainNo &&
      remainingStations === 1,
  );
  const isPastLastTrainForNext = nextRideSegment
    ? isPastLastTrain(
        nextRideSegment.lineId,
        nextRideSegment.fromStationName,
        nextRideSegment.toStationName,
        new Date(),
      )
    : false;

  // 다음 노선에서 환승역(보딩역)에 아직 탈 수 있는 열차 (미리선택 후보, 최대 6대).
  const nextBoardable = useMemo(() => {
    if (!nextRideSegment || nextLineTrains.length === 0) return [];
    const oriented = orientRideStations(
      nextRideSegment.lineId,
      nextRideSegment.fromStationName,
      nextRideSegment.toStationName,
      nextRideSegment.stationNames,
    );
    if (oriented.fromIdx < 0) return [];
    const boardIdx = oriented.fromIdx;
    const total = oriented.stations.length;
    const routeSet = new Set(nextRideSegment.stationNames);
    const circ = isCircularLineId(nextRideSegment.lineId);
    const enriched = dedupeTrainsByNo(
      filterSameDirectionTrains(enrichTrains(nextLineTrains, oriented), oriented, null),
    );
    const candidates = enriched.filter((train) => {
      if (isDeepInactiveTrain(train, routeSet, boardIdx, oriented.toIdx, total, circ)) return false;
      if (train.posIdxOriented < 0) return false;
      if (circ) {
        if (train.posIdxOriented === boardIdx) return train.trainStatus !== '2';
        return isBeforeBoardingStation(train, routeSet, boardIdx, oriented.toIdx, total, true);
      }
      if (train.posIdxOriented < boardIdx) return true;
      if (train.posIdxOriented === boardIdx) return train.trainStatus !== '2';
      return false;
    });
    const distance = (train: (typeof candidates)[number]) =>
      circ ? getForwardDistance(train.posIdxOriented, boardIdx, total) : boardIdx - train.posIdxOriented;
    return candidates.sort((a, b) => distance(a) - distance(b)).slice(0, 6);
  }, [nextLineTrains, nextRideSegment]);
  const alarmStatus = !alarmEnabled
    ? '하차 알림 꺼짐'
    : remainingStations <= alarmBefore && remainingStations > 0
      ? '곧 하차할 준비'
      : `${alarmBefore}정거장 전 알림`;

  const refreshTrainPositions = useCallback(async (showLoading = true) => {
    if (!currentRideSegment) return;

    if (showLoading) setLoadingTrains(true);
    const result = await getTrainPositions(currentRideSegment.lineName);
    const candidates = toTrainCandidates(result.positions, currentRideSegment, selectedTrainNo);
    const freshCandidates = candidates.filter((candidate) => !candidate.isStale);
    const allCandidatesStale = candidates.length > 0 && freshCandidates.length === 0;
    const staleCandidateCount = candidates.length - freshCandidates.length;
    const nextCandidates = result.isSimulated || candidates.length === 0 || allCandidatesStale
      ? createSimulatedCandidates(currentRideSegment)
      : freshCandidates;
    const latestStaleAge = candidates
      .map((candidate) => candidate.receivedAtAgeSeconds)
      .filter((age): age is number => age !== undefined)
      .sort((a, b) => a - b)[0];

    setTrainCandidates(nextCandidates);
    setIsSimulated(result.isSimulated || candidates.length === 0 || allCandidatesStale);
    setPositionMessage(
      result.errorMessage ??
        (allCandidatesStale
          ? `서울시 위치 데이터가 ${formatPositionAge(latestStaleAge)} 전 값이라 시뮬레이션으로 표시합니다.`
          : candidates.length === 0
            ? '열차 후보를 시뮬레이션으로 표시합니다.'
            : staleCandidateCount > 0
              ? `오래된 위치 ${staleCandidateCount}대 제외됨`
              : ''),
    );
    setLastUpdated(new Date());
    if (showLoading) setLoadingTrains(false);

    setSelectedTrainNo((current) => {
      if (current && nextCandidates.some((candidate) => candidate.trainNo === current)) return current;
      // 환승 전역에서 미리 골라둔 열차가 이 노선 후보에 있으면 그대로 적용.
      const pending = pendingNextTrainNoRef.current;
      if (pending && nextCandidates.some((candidate) => candidate.trainNo === pending)) {
        pendingNextTrainNoRef.current = null;
        return pending;
      }
      return nextCandidates[0]?.trainNo ?? null;
    });
  }, [currentRideSegment, selectedTrainNo]);

  useEffect(() => {
    void refreshTrainPositions();
    const timer = setInterval(() => {
      void refreshTrainPositions(false);
    }, TRAIN_POSITION_POLL_MS);

    return () => clearInterval(timer);
  }, [refreshTrainPositions]);

  // 환승 전역 윈도에서만 다음 노선 열차 위치를 폴링한다.
  useEffect(() => {
    if (!inPreTransferWindow || !nextRideSegment) {
      setNextLineTrains([]);
      return;
    }

    let mounted = true;
    const fetchNextLine = async () => {
      const result = await getTrainPositions(nextRideSegment.lineName);
      if (!mounted) return;
      setNextLineTrains(
        result.isSimulated ? [] : result.positions.filter((position) => !position.isStale),
      );
    };

    void fetchNextLine();
    const timer = setInterval(() => void fetchNextLine(), TRAIN_POSITION_POLL_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [inPreTransferWindow, nextRideSegment]);

  // 탑승 안내 중 하차 알림을 받으려면 시스템 알림 권한이 필요하다.
  useEffect(() => {
    if (!route || !alarmEnabled) return;
    void ensureNotificationPermission().then((granted) => setNotificationBlocked(!granted));
  }, [route, alarmEnabled]);

  // 하차 임박 시 로컬 알림 발송. 환승이 남아 있으면 환승 안내로 보낸다.
  useEffect(() => {
    if (!alarmEnabled || !selectedTrainNo || !currentRideSegment) return;
    if (remainingStations <= 0) return;
    if (remainingStations > alarmBefore) {
      // 알림 시점 이전으로 되돌아가면 재무장한다.
      alarmFiredRef.current = false;
      return;
    }
    if (alarmFiredRef.current) return;
    alarmFiredRef.current = true;

    warningHaptic();
    const stationsLabel = remainingStations === 1 ? '다음 역' : `${remainingStations}정거장 후`;
    if (upcomingTransfer && nextRideSegment) {
      void sendRidingAlert(
        `곧 ${upcomingTransfer.stationName} 환승`,
        `${stationsLabel} 도착 · ${nextRideSegment.lineName} ${nextRideSegment.direction}으로 갈아탈 준비를 하세요.`,
      );
    } else {
      void sendRidingAlert(
        `곧 ${currentRideSegment.toStationName} 하차`,
        `${stationsLabel} 도착합니다. 내릴 준비를 하세요.`,
      );
    }
  }, [
    alarmBefore,
    alarmEnabled,
    currentRideSegment,
    nextRideSegment,
    remainingStations,
    selectedTrainNo,
    upcomingTransfer,
  ]);

  useEffect(() => {
    if (!route) return;
    void saveRidingSessionState({
      routeSavedAt: route.savedAt,
      currentSegmentIndex,
      currentStationIndex: safeStationIndex,
      selectedTrainNo,
      alarmEnabled,
      alarmBefore,
    });
  }, [alarmBefore, alarmEnabled, currentSegmentIndex, route, safeStationIndex, selectedTrainNo]);

  useEffect(() => {
    if (!selectedTrain || selectedTrain.routeStationIndex < 0) return;
    setCurrentStationIndex(selectedTrain.routeStationIndex);
  }, [selectedTrain]);

  // 탑승 구간 도착 시 자동으로 다음 구간(환승/다음 탑승)으로 진행한다.
  // 웹과 동일하게 선택한 열차 위치로만 진행하며, 수동 이전/다음 조작은 없다.
  useEffect(() => {
    if (!route || currentSegment?.type !== 'ride' || !selectedTrainNo) return;
    if (remainingStations > 0 || currentSegmentIndex >= route.segments.length - 1) return;
    const timer = setTimeout(() => goToSegment(currentSegmentIndex + 1), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, currentSegment, selectedTrainNo, remainingStations, currentSegmentIndex]);

  useEffect(() => {
    if (!isSimulated || !selectedTrainNo || !currentRideSegment) return;

    const timer = setInterval(() => {
      setTrainCandidates((current) =>
        current.map((candidate) => {
          if (!candidate.isSimulatedCandidate) return candidate;
          const nextIndex = clamp(candidate.routeStationIndex + 1, 0, currentRideSegment.stationNames.length - 1);
          return {
            ...candidate,
            routeStationIndex: nextIndex,
            stationName: currentRideSegment.stationNames[nextIndex] ?? candidate.stationName,
            trainStatus: candidate.trainStatus === '1' ? '2' : candidate.trainStatus === '2' ? '0' : '1',
            receivedAt: new Date().toISOString(),
          };
        }),
      );
    }, 8000);

    return () => clearInterval(timer);
  }, [currentRideSegment, isSimulated, selectedTrainNo]);

  const goToSegment = (segmentIndex: number) => {
    if (!route) return;
    const nextIndex = clamp(segmentIndex, 0, route.segments.length - 1);
    setCurrentSegmentIndex(nextIndex);
    setCurrentStationIndex(0);
    setSelectedTrainNo(null);
    setTrainCandidates([]);
    // pendingNextTrainNoRef는 carryover가 소비하므로 여기서 지우지 않는다.
    setPendingNextTrainNo(null);
    setNextLineTrains([]);
    alarmFiredRef.current = false;
  };

  const handlePreSelectNextTrain = (trainNo: string) => {
    if (isPastLastTrainForNext) {
      warningHaptic();
      return;
    }
    selectionHaptic();
    const next = pendingNextTrainNo === trainNo ? null : trainNo;
    setPendingNextTrainNo(next);
    pendingNextTrainNoRef.current = next;
  };

  // 환승 구간에서 "환승 완료"를 눌러 다음 탑승 구간으로 진행한다.
  const handleTransferComplete = () => {
    if (!route) return;
    selectionHaptic();
    goToSegment(currentSegmentIndex + 1);
  };

  const handleSelectTrain = (candidate: TrainCandidate) => {
    if (isPastLastTrainForRide) {
      warningHaptic();
      return;
    }
    successHaptic();
    setSelectedTrainNo(candidate.trainNo);
    if (candidate.routeStationIndex >= 0) setCurrentStationIndex(candidate.routeStationIndex);
  };

  if (!route) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 24 }]}>
        <Stack.Screen options={{ title: '탑승 안내' }} />
        {/* 출발 대기 우주 정거장 — 여정이 없을 때의 딥스페이스 연출 */}
        <View style={styles.launchCard}>
          <Starfield speed={0.35} density={0.3} shootingStars />
          <View style={styles.launchOrbit}>
            <View style={styles.launchPlanet}>
              <Ionicons name="planet-outline" size={30} color="#DDE6FF" />
            </View>
          </View>
          <Text style={styles.launchTitle}>대기 중인 여정이 없습니다</Text>
          <Text style={styles.launchBody}>
            경로를 골라 탑승 안내를 시작하면{'\n'}우주를 가로지르는 항해가 시작됩니다.
          </Text>
          <Link href="/" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <View style={styles.launchButton}>
                <Ionicons name="search" size={16} color="#0B1026" />
                <Text style={styles.launchButtonText}>경로 검색으로 이동</Text>
              </View>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: '탑승 안내' }} />

      {/* 상단 sticky 미니 네비 — 스크롤해도 현재 여정/구간이 고정 노출 */}
      <View style={styles.miniNav}>
        <View style={styles.miniNavCopy}>
          <Text style={styles.miniNavRoute} numberOfLines={1}>
            {route.overallFromStation} → {route.overallToStation}
          </Text>
          <Text style={styles.miniNavMeta}>
            {rideCount.total > 0 ? `${rideCount.current}/${rideCount.total}번째 탑승 구간` : '탑승 구간 확인 중'}
          </Text>
        </View>
        {currentRideSegment ? <LineBadge lineId={currentRideSegment.lineId} /> : null}
      </View>

      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 24 + (currentSegment?.type === 'ride' ? DRAWER_COLLAPSED_HEIGHT : 0) },
        ]}
        refreshControl={<RefreshControl refreshing={loadingTrains} onRefresh={() => void refreshTrainPositions()} tintColor={palette.accent} />}
      >

      {currentSegment?.type === 'transfer' ? (
        /* 환승 — ride 카드와 일관된 딥스페이스 "도킹" 연출 */
        <View style={styles.spaceCard}>
          <Starfield speed={0.3} density={0.22} shootingStars />
          <View style={styles.spaceInner}>
            <View style={styles.spaceTopRow}>
              <View style={styles.spaceLineRow}>
                <View style={styles.transferWalkBadge}>
                  <Ionicons name="walk" size={14} color="#FFD9A8" />
                </View>
                <Text style={styles.spaceDirection} numberOfLines={1}>
                  환승 · 다음 노선으로
                </Text>
              </View>
              <LineBadge lineId={currentSegment.toLineId} />
            </View>

            <Text style={styles.spaceKicker}>환승역</Text>
            <Text
              style={[styles.spaceStation, { textShadowColor: getLineInfo(currentSegment.toLineId)?.color ?? palette.accent }]}
              numberOfLines={1}>
              {currentSegment.stationName}
            </Text>
            <Text style={styles.spaceSub} numberOfLines={1}>
              {currentSegment.toLineName} {currentSegment.toDirection}으로 갈아타세요
            </Text>

            <View style={styles.transferPanel}>
              <Text style={styles.transferPanelLine}>
                도보 약 {currentSegment.walkMinutes}분
                {currentSegment.walkDistanceMeters ? ` · ${currentSegment.walkDistanceMeters}m` : ''}
              </Text>
              <View style={styles.transferFastRow}>
                <Ionicons name="flash" size={13} color="#FFD9A8" />
                <Text style={styles.transferFastText}>
                  빠른 환승 {currentSegment.fastTransfer ? formatFastTransferInfo(currentSegment.fastTransfer) : '정보 없음'}
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.transferDoneBtn, pressed && styles.pressed]}
              onPress={handleTransferComplete}>
              <Ionicons name="checkmark" size={16} color="#0B1026" />
              <Text style={styles.transferDoneText}>환승 완료</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        /* 우주 항해 카드 — 현재 위치 정보 + VoyageTrack 을 하나의 딥스페이스 카드로 통합(웹 대응) */
        <View style={styles.spaceCard}>
          <Starfield speed={remainingStations > 0 ? 0.55 : 0.12} density={0.22} shootingStars />
          <View style={styles.spaceInner}>
            <View style={styles.spaceTopRow}>
              <View style={styles.spaceLineRow}>
                {currentRideSegment ? <LineBadge lineId={currentRideSegment.lineId} /> : null}
                <Text style={styles.spaceDirection} numberOfLines={1}>
                  {currentRideSegment?.direction ?? line?.name ?? '탑승 구간'}
                </Text>
              </View>
              <View style={styles.spaceBadges}>
                {selectedTrain ? (
                  <Text style={styles.spaceTrainBadge}>
                    {selectedTrain.trainNo}
                    {isSimulated ? '' : '호'}
                  </Text>
                ) : null}
                {isSimulated ? <Text style={styles.spaceSimBadge}>시뮬</Text> : null}
              </View>
            </View>

            <Text style={styles.spaceKicker}>{isWaitingForBoard ? '승차 대기' : '현재 위치'}</Text>
            <Text
              style={[styles.spaceStation, { textShadowColor: line?.color ?? palette.accent }]}
              numberOfLines={1}>
              {currentStationName}
            </Text>
            <Text style={styles.spaceSub} numberOfLines={1}>
              {isWaitingForBoard
                ? `선택 열차 ${stationsUntilBoard}정거장 전 · ${boardEtaMinutes <= 0 ? '곧 승차' : `약 ${boardEtaMinutes}분 후 승차`}`
                : remainingStations > 0
                  ? `${currentRideSegment?.toStationName}까지 ${remainingStations}개 역 · 약 ${remainingStations * 2}분 후 도착`
                  : '도착역입니다'}
            </Text>

            {currentRideSegment ? (
              <VoyageTrack
                progress={progress}
                stationCount={currentRideSegment.stationNames.length}
                currentIndex={safeStationIndex}
                remaining={remainingStations}
                lineColor={line?.color ?? palette.accent}
                moving={remainingStations > 0}
              />
            ) : null}

            {isFinalArrival ? (
              <View style={styles.arrivedBanner}>
                <View style={styles.arrivedPlanet}>
                  <Ionicons name="planet" size={16} color="#DDE6FF" />
                </View>
                <View style={styles.arrivedCopy}>
                  <Text style={styles.arrivedText}>목적지 도착 · 항해 완료</Text>
                  <Text style={styles.arrivedSub}>{route.overallToStation}에 무사히 도착했어요</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      )}

      <View style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={styles.alertTitleRow}>
            <Ionicons name={alarmEnabled ? 'notifications-outline' : 'notifications-off-outline'} size={18} color={palette.accent} />
            <Text style={styles.sectionTitle}>하차 알림</Text>
          </View>
          <Switch
            value={alarmEnabled}
            onValueChange={(enabled) => {
              impactHaptic();
              setAlarmEnabled(enabled);
            }}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor={palette.surface}
          />
        </View>
        <Text style={[styles.alertStatus, alarmEnabled && remainingStations <= alarmBefore && remainingStations > 0 && styles.alertStatusHot]}>
          {alarmStatus}
        </Text>
        {notificationBlocked && alarmEnabled ? (
          <Text style={styles.alertPermissionHint}>
            기기 알림 권한이 꺼져 있어 화면 안에서만 표시됩니다. 시스템 설정에서 메트로넛 알림을 허용해 주세요.
          </Text>
        ) : null}
        <View style={[styles.alarmBeforeRow, !alarmEnabled && styles.alarmBeforeRowDisabled]}>
          {[1, 2, 3].map((value) => (
            <Pressable
              key={value}
              disabled={!alarmEnabled}
              onPress={() => {
                selectionHaptic();
                setAlarmBefore(value);
              }}
              style={[styles.alarmBeforeButton, alarmEnabled && alarmBefore === value && styles.alarmBeforeButtonActive]}
            >
              <Text
                style={[styles.alarmBeforeText, alarmEnabled && alarmBefore === value && styles.alarmBeforeTextActive]}>
                {value}역 전
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {upcomingTransfer && currentSegment?.type === 'ride' ? <TransferNotice transfer={upcomingTransfer} /> : null}

      {inPreTransferWindow && nextRideSegment ? (
        <View style={styles.preTransferCard}>
          <View style={styles.preTransferHeader}>
            <LineBadge lineId={nextRideSegment.lineId} />
            <Text style={styles.preTransferTitle} numberOfLines={2}>
              곧 {nextRideSegment.fromStationName} 환승 · 탈 열차 미리 선택
            </Text>
          </View>
          {isPastLastTrainForNext ? (
            <Text style={styles.preTransferWarning}>막차가 끊겨 열차를 고를 수 없습니다.</Text>
          ) : nextBoardable.length === 0 ? (
            <Text style={styles.preTransferEmpty}>다음 노선 열차 위치를 확인하는 중…</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.preTransferChips}>
              {nextBoardable.map((train) => {
                const chipSelected = pendingNextTrainNo === train.trainNo;
                return (
                  <Pressable
                    key={train.trainNo}
                    accessibilityRole="button"
                    accessibilityState={{ selected: chipSelected }}
                    onPress={() => handlePreSelectNextTrain(train.trainNo)}
                    style={[styles.preTransferChip, chipSelected && styles.preTransferChipActive]}>
                    <Text style={[styles.preTransferChipText, chipSelected && styles.preTransferChipTextActive]}>
                      {train.trainNo} · {train.stationName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          {pendingNextTrainNo ? (
            <Text style={styles.preTransferPending}>
              {pendingNextTrainNo} 미리 선택됨 · 환승하면 자동 적용됩니다
            </Text>
          ) : null}
        </View>
      ) : null}

      {expressSkipInfo ? (
        <View style={styles.expressNotice}>
          <View style={styles.lastTrainTitleRow}>
            <Ionicons name="flash-outline" size={15} color="#C15B1B" />
            <Text style={styles.expressNoticeTitle}>{expressSkipInfo.type} 열차 선택됨</Text>
          </View>
          <Text style={styles.expressNoticeBody}>
            {expressSkipInfo.skipped && expressSkipInfo.skipped.length > 0
              ? `이 ${expressSkipInfo.type}은 ${expressSkipInfo.skipped.join(' · ')} 역을 통과합니다.`
              : '일부 역은 정차하지 않을 수 있습니다. 정차역을 확인하세요.'}
          </Text>
        </View>
      ) : null}

      {lastUpdated ? (
        <Text style={styles.updatedText}>
          마지막 업데이트 {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          {positionMessage ? ` · ${positionMessage}` : ''}
        </Text>
      ) : null}

      {currentRideSegment ? (
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>남은 역</Text>
          {currentRideSegment.stationNames.map((stationName, index) => {
            const isCurrent = index === safeStationIndex;
            const isPassed = index < safeStationIndex;
            return (
              <View key={`${stationName}-${index}`} style={styles.stationTimelineRow}>
                <View
                  style={[
                    styles.timelineDot,
                    isCurrent && { borderColor: line?.color ?? palette.accent, backgroundColor: palette.surface },
                    isPassed && { backgroundColor: line?.color ?? palette.accent },
                  ]}
                />
                <Text style={[styles.timelineStation, isCurrent && styles.timelineStationCurrent, isPassed && styles.timelineStationPassed]}>
                  {stationName}
                </Text>
                {isCurrent ? <Text style={styles.nowPill}>현재</Text> : null}
              </View>
            );
          })}
        </View>
      ) : null}
      </ScrollView>

      {currentSegment?.type === 'ride' ? (
        <View style={[styles.drawerAnchor, { bottom: tabBarHeight }]} pointerEvents="box-none">
          <BottomSheet
            expanded={drawerExpanded}
            onChange={setDrawerExpanded}
            expandedHeight={DRAWER_EXPANDED_HEIGHT + insets.bottom}
            collapsedHeight={DRAWER_COLLAPSED_HEIGHT}>
            <View style={[styles.drawerBody, { paddingBottom: insets.bottom + 8 }]}>
              {/* 세그먼트 진행 바 — 시트 상단(웹 topSlot 위치). 모든 탑승 구간 알약 + 슬라이딩 열차 마커. */}
              {rideSegments.length > 0 ? (
                <View style={styles.segmentBar}>
                  {rideSegments.map((item, i) => {
                    const segColor = getLineInfo(item.segment.lineId)?.color ?? palette.accent;
                    const isCurrent = i === currentRideIdx;
                    return (
                      <View key={item.idx} style={[styles.segmentBarItem, { flexGrow: isCurrent ? 1.8 : 1 }]}>
                        <View style={[styles.segmentBarPill, { backgroundColor: isCurrent ? segColor : `${segColor}66` }]}>
                          {isCurrent ? (
                            <View style={styles.segmentBarMarker}>
                              <View style={[styles.segmentBarMarkerDot, { left: `${progress * 100}%` }]}>
                                <Ionicons name="train" size={10} color={segColor} />
                              </View>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.drawerHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="train-outline" size={17} color={line?.color ?? palette.accent} />
                  <Text style={styles.sectionTitle}>열차 선택</Text>
                  {selectedTrain ? <Text style={styles.selectedPill}>{selectedTrain.trainNo} 선택됨</Text> : null}
                </View>
                <Pressable
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                  onPress={() => void refreshTrainPositions()}>
                  <Ionicons name="refresh" size={16} color={palette.subtleText} />
                </Pressable>
              </View>

              {isPastLastTrainForRide ? (
                <View style={styles.lastTrainCard}>
                  <View style={styles.lastTrainTitleRow}>
                    <Ionicons name="moon-outline" size={15} color={palette.red} />
                    <Text style={styles.lastTrainTitle}>막차 종료</Text>
                  </View>
                  <Text style={styles.lastTrainBody}>이 방향 막차가 이미 끊겨 열차를 고를 수 없습니다.</Text>
                </View>
              ) : null}

              {trainCandidates.length === 0 || !oriented ? (
                <View style={styles.loadingRow}>
                  <Text style={styles.loadingText}>열차 후보를 불러오는 중입니다</Text>
                </View>
              ) : (
                <View style={isPastLastTrainForRide ? styles.railDisabled : undefined}>
                  {isPastLastTrainForRide ? null : (
                    <Text style={styles.railHint}>역 위의 열차를 눌러 선택하세요</Text>
                  )}
                  <ScrollView
                    ref={railRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    onContentSizeChange={scrollRailToBoarding}
                    contentContainerStyle={styles.railContent}>
                    <View style={styles.railInner}>
                      <View style={[styles.railBaseLine, { backgroundColor: line?.color ?? palette.accent }]} />
                      {oriented.fromIdx >= 0 && oriented.toIdx >= 0 ? (
                        <View
                          style={[
                            styles.railRouteLine,
                            {
                              backgroundColor: line?.color ?? palette.accent,
                              left:
                                RAIL_PADDING +
                                Math.min(oriented.fromIdx, oriented.toIdx) * RAIL_STATION_WIDTH +
                                RAIL_STATION_WIDTH / 2,
                              width: Math.abs(oriented.toIdx - oriented.fromIdx) * RAIL_STATION_WIDTH,
                            },
                          ]}
                        />
                      ) : null}
                      {oriented.stations.map((station, idx) => {
                        const isFrom = idx === oriented.fromIdx;
                        const isTo = idx === oriented.toIdx;
                        const onRoute = routeStationSet.has(station.name);
                        const trainsHere = candidatesByOrientedIdx.get(idx) ?? [];
                        return (
                          <View key={`${station.id}-${idx}`} style={styles.railStation}>
                            <View style={styles.railTrainLane}>
                              {trainsHere.slice(0, 2).map((train) => {
                                const isSelected = train.trainNo === selectedTrainNo;
                                const isExpress = train.trainType === '급행' || train.trainType === '특급';
                                return (
                                  <Pressable
                                    key={train.trainNo}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: isSelected }}
                                    onPress={() => handleSelectTrain(train)}
                                    style={[
                                      styles.pin,
                                      { backgroundColor: line?.color ?? palette.accent },
                                      isSelected && styles.pinSelected,
                                    ]}>
                                    <Ionicons name="train" size={11} color={palette.surface} />
                                    {isExpress ? (
                                      <Text style={[styles.pinExpress, { color: line?.color ?? palette.accent }]}>
                                        {train.trainType}
                                      </Text>
                                    ) : null}
                                    {isSelected ? <Text style={styles.pinNo}>{train.trainNo}</Text> : null}
                                  </Pressable>
                                );
                              })}
                              {trainsHere.length > 2 ? (
                                <Text style={styles.pinMore}>+{trainsHere.length - 2}</Text>
                              ) : null}
                            </View>
                            <View style={styles.railDotWrap}>
                              {isFrom || isTo ? (
                                <View style={[styles.railEndDot, { borderColor: isFrom ? palette.accent : palette.red }]} />
                              ) : (
                                <View
                                  style={[
                                    styles.railDot,
                                    onRoute ? { backgroundColor: line?.color ?? palette.accent } : styles.railDotOff,
                                  ]}
                                />
                              )}
                            </View>
                            <Text
                              style={[styles.railStationName, (isFrom || isTo) && styles.railStationNameStrong]}
                              numberOfLines={1}>
                              {station.name}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          </BottomSheet>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollBody: {
    flex: 1,
  },
  drawerAnchor: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  drawerBody: {
    flex: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  drawerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 48,
  },
  miniNav: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderBottomColor: palette.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    shadowColor: '#1B2838',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  miniNavCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  miniNavRoute: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  miniNavMeta: {
    color: palette.subtleText,
    fontSize: 12,
    fontWeight: '700',
  },
  spaceCard: {
    borderRadius: radii.lg,
    // 그라데이션 미지원 환경(web) 폴백.
    backgroundColor: '#0e132e',
    experimental_backgroundImage:
      'linear-gradient(160deg, #0b1026 0%, #141b3d 55%, #0e132e 100%)',
    overflow: 'hidden',
    shadowColor: '#0D1238',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  spaceInner: {
    gap: spacing.xs,
    padding: spacing.lg,
  },
  spaceTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  spaceLineRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  spaceDirection: {
    color: '#C2CCEC',
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  spaceBadges: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  spaceTrainBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.sm,
    color: '#9FC2FF',
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  spaceSimBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.sm,
    color: '#FFD9A8',
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  spaceKicker: {
    color: '#9AA3C0',
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  spaceStation: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  spaceSub: {
    color: '#9AA3C0',
    fontSize: 13,
    fontWeight: '600',
  },
  transferWalkBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 217, 168, 0.16)',
    borderRadius: radii.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  transferPanel: {
    backgroundColor: 'rgba(120,140,230,0.14)',
    borderColor: 'rgba(170,190,255,0.2)',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  transferPanelLine: {
    color: '#C2CCEC',
    fontSize: 13,
    fontWeight: '700',
  },
  transferFastRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  transferFastText: {
    color: '#FFD9A8',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  transferDoneBtn: {
    alignItems: 'center',
    backgroundColor: '#EAF0FF',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 50,
  },
  transferDoneText: {
    color: '#0B1026',
    fontSize: 15,
    fontWeight: '900',
  },
  segmentBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    height: 22,
  },
  segmentBarItem: {
    flexBasis: 0,
    justifyContent: 'center',
  },
  segmentBarPill: {
    borderRadius: radii.pill,
    height: 16,
    justifyContent: 'center',
    position: 'relative',
  },
  segmentBarMarker: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  segmentBarMarkerDot: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.surface,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginLeft: -10,
    position: 'absolute',
    top: -2,
    width: 20,
    shadowColor: '#1B2838',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  arrivedBanner: {
    // 우주 카드 내부 인셋 패널 — 반투명으로 다크 배경 위에서 떠 보이게.
    alignItems: 'center',
    backgroundColor: 'rgba(120,140,230,0.16)',
    borderColor: 'rgba(170,190,255,0.22)',
    borderWidth: 1,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  arrivedPlanet: {
    alignItems: 'center',
    backgroundColor: 'rgba(120, 140, 230, 0.2)',
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  arrivedCopy: {
    flex: 1,
    gap: 2,
  },
  arrivedText: {
    color: '#F2F4FF',
    fontSize: 14,
    fontWeight: '900',
  },
  arrivedSub: {
    color: '#A9B4D9',
    fontSize: 12,
    fontWeight: '600',
  },
  alertCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...cardShadow,
  },
  alertHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  alertTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  alertStatus: {
    color: palette.subtleText,
    fontSize: 14,
    fontWeight: '800',
  },
  alertStatusHot: {
    color: '#C15B1B',
  },
  alertPermissionHint: {
    color: palette.subtleText,
    fontSize: 12,
    lineHeight: 17,
  },
  alarmBeforeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  alarmBeforeRowDisabled: {
    opacity: 0.45,
  },
  alarmBeforeButton: {
    alignItems: 'center',
    backgroundColor: '#F0F1F4',
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  alarmBeforeButtonActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  alarmBeforeText: {
    color: palette.subtleText,
    fontSize: 12,
    fontWeight: '900',
  },
  alarmBeforeTextActive: {
    color: palette.surface,
  },
  transferNotice: {
    backgroundColor: '#FFF8EF',
    borderColor: '#F0E4D0',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  transferNoticeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  transferNoticeTitle: {
    color: '#C15B1B',
    fontSize: 15,
    fontWeight: '900',
  },
  transferNoticeBody: {
    color: palette.subtleText,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  transferNoticeFast: {
    color: '#C15B1B',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '900',
  },
  selectedPill: {
    backgroundColor: '#EBF4FF',
    borderRadius: radii.pill,
    color: palette.accent,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  preTransferCard: {
    backgroundColor: '#FFF8EF',
    borderColor: '#F0E4D0',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  preTransferHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  preTransferTitle: {
    color: palette.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  preTransferWarning: {
    color: palette.red,
    fontSize: 13,
    fontWeight: '800',
  },
  preTransferEmpty: {
    color: palette.subtleText,
    fontSize: 13,
  },
  preTransferChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  preTransferChip: {
    backgroundColor: palette.surface,
    borderColor: '#C15B1B',
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  preTransferChipActive: {
    backgroundColor: '#C15B1B',
  },
  preTransferChipText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '900',
  },
  preTransferChipTextActive: {
    color: palette.surface,
  },
  preTransferPending: {
    color: '#C15B1B',
    fontSize: 12,
    fontWeight: '800',
  },
  lastTrainCard: {
    backgroundColor: '#FDECEC',
    borderColor: '#F4D6D6',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  lastTrainTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  lastTrainTitle: {
    color: palette.red,
    fontSize: 13,
    fontWeight: '900',
  },
  lastTrainBody: {
    color: palette.subtleText,
    fontSize: 13,
    lineHeight: 18,
  },
  expressNotice: {
    backgroundColor: '#FFF8EF',
    borderColor: '#F0E4D0',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  expressNoticeTitle: {
    color: '#C15B1B',
    fontSize: 13,
    fontWeight: '900',
  },
  expressNoticeBody: {
    color: palette.subtleText,
    fontSize: 13,
    lineHeight: 18,
  },
  railHint: {
    color: palette.subtleText,
    fontSize: 12,
    fontWeight: '700',
  },
  railDisabled: {
    opacity: 0.4,
  },
  railContent: {
    paddingVertical: 4,
  },
  railInner: {
    flexDirection: 'row',
    paddingHorizontal: RAIL_PADDING,
    position: 'relative',
  },
  railBaseLine: {
    borderRadius: 2,
    height: 3,
    left: RAIL_PADDING + RAIL_STATION_WIDTH / 2,
    opacity: 0.22,
    position: 'absolute',
    right: RAIL_PADDING + RAIL_STATION_WIDTH / 2,
    top: RAIL_LINE_TOP,
  },
  railRouteLine: {
    borderRadius: 2,
    height: 3,
    position: 'absolute',
    top: RAIL_LINE_TOP,
  },
  railStation: {
    alignItems: 'center',
    width: RAIL_STATION_WIDTH,
  },
  railTrainLane: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 46,
  },
  railDotWrap: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
  },
  railEndDot: {
    backgroundColor: palette.surface,
    borderRadius: radii.pill,
    borderWidth: 3,
    height: 16,
    width: 16,
  },
  railDot: {
    borderRadius: radii.pill,
    height: 11,
    width: 11,
  },
  railDotOff: {
    backgroundColor: palette.surface,
    borderColor: palette.muted,
    borderWidth: 1,
  },
  railStationName: {
    color: palette.subtleText,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    maxWidth: RAIL_STATION_WIDTH - 6,
    textAlign: 'center',
  },
  railStationNameStrong: {
    color: palette.text,
    fontWeight: '900',
  },
  pin: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  pinSelected: {
    borderColor: palette.surface,
    borderWidth: 2,
    elevation: 4,
    shadowColor: '#1B2838',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  pinExpress: {
    backgroundColor: palette.surface,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 3,
  },
  pinNo: {
    color: palette.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  pinMore: {
    color: palette.subtleText,
    fontSize: 11,
    fontWeight: '800',
  },
  loadingRow: {
    alignItems: 'center',
    minHeight: 68,
    justifyContent: 'center',
    padding: spacing.md,
  },
  loadingText: {
    color: palette.subtleText,
    fontSize: 14,
    fontWeight: '800',
  },
  updatedText: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  timelineCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...cardShadow,
  },
  stationTimelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 34,
  },
  timelineDot: {
    backgroundColor: '#C2C5CC',
    borderColor: '#C2C5CC',
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 13,
    width: 13,
  },
  timelineStation: {
    color: palette.subtleText,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  timelineStationCurrent: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '900',
  },
  timelineStationPassed: {
    color: palette.muted,
  },
  nowPill: {
    backgroundColor: '#EBF4FF',
    borderRadius: radii.pill,
    color: palette.accent,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lineBadge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    minWidth: 34,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  lineBadgeText: {
    color: palette.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  launchCard: {
    alignItems: 'center',
    borderRadius: radii.lg,
    // 그라데이션 미지원 환경(web 등)에서도 흰 글씨가 보이도록 단색 다크 폴백.
    backgroundColor: '#0e132e',
    experimental_backgroundImage: 'linear-gradient(160deg, #0b1026 0%, #141b3d 55%, #0e132e 100%)',
    gap: spacing.md,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl + spacing.md,
    shadowColor: '#0D1238',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 10,
  },
  launchOrbit: {
    alignItems: 'center',
    borderColor: 'rgba(160, 180, 255, 0.28)',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 92,
    justifyContent: 'center',
    width: 92,
  },
  launchPlanet: {
    alignItems: 'center',
    backgroundColor: 'rgba(120, 140, 230, 0.18)',
    borderRadius: radii.pill,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  launchTitle: {
    color: '#F2F4FF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  launchBody: {
    color: '#A9B4D9',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    textAlign: 'center',
  },
  launchButton: {
    alignItems: 'center',
    backgroundColor: '#EAF0FF',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing.xs,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  launchButtonText: {
    color: '#0B1026',
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
