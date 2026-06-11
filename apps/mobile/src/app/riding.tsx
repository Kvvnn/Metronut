import { Ionicons } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

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
import { cardShadow, colors, radii, spacing, typography } from '@/lib/theme';

interface TrainCandidate extends TrainPosition {
  routeStationIndex: number;
  isSimulatedCandidate: boolean;
}

const TRAIN_POSITION_POLL_MS = 15000;

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

function trainStatusLabel(status: string) {
  if (status === '0') return '진입';
  if (status === '1') return '도착';
  if (status === '2') return '출발';
  return '이동 중';
}

function trainTypeLabel(candidate: TrainCandidate) {
  return candidate.trainType && candidate.trainType !== '일반' ? candidate.trainType : trainStatusLabel(candidate.trainStatus);
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
  const line = getLineInfo(lineId);

  return (
    <View style={[styles.lineBadge, { backgroundColor: line?.color ?? colors.muted }]}>
      <Text style={styles.lineBadgeText}>{line?.shortName ?? lineId}</Text>
    </View>
  );
}

function TransferNotice({ transfer }: { transfer: RidingTransferSegment }) {
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

function TrainCandidateRow({
  candidate,
  selected,
  onPress,
}: {
  candidate: TrainCandidate;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.trainRow,
        selected && styles.trainRowSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.trainNoBadge}>
        <Ionicons name="train-outline" size={15} color={selected ? colors.surface : colors.accent} />
      </View>
      <View style={styles.trainCopy}>
        <Text style={styles.trainTitle}>
          {candidate.trainNo} · {trainTypeLabel(candidate)}
        </Text>
        <Text style={styles.trainMeta} numberOfLines={1}>
          {candidate.stationName || '위치 확인 중'} → {candidate.destination || '종착 정보 없음'}
        </Text>
      </View>
      {candidate.isSimulatedCandidate ? <Text style={styles.simBadge}>SIM</Text> : null}
      {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.accent} /> : null}
    </Pressable>
  );
}

export default function RidingScreen() {
  const [route, setRoute] = useState<RidingRoutePayload | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [selectedTrainNo, setSelectedTrainNo] = useState<string | null>(null);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
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
  const line = currentRideSegment ? getLineInfo(currentRideSegment.lineId) : null;
  const maxStationIndex = currentRideSegment ? Math.max(0, currentRideSegment.stationNames.length - 1) : 0;
  const safeStationIndex = clamp(currentStationIndex, 0, maxStationIndex);
  const currentStationName = currentRideSegment?.stationNames[safeStationIndex] ?? currentRideSegment?.fromStationName ?? '';
  const remainingStations = Math.max(0, maxStationIndex - safeStationIndex);
  const progress = stationProgress(currentRideSegment, safeStationIndex);
  const selectedTrain = trainCandidates.find((candidate) => candidate.trainNo === selectedTrainNo) ?? null;
  const isFinalArrival = Boolean(route && currentSegmentIndex >= route.segments.length - 1 && remainingStations === 0);
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

  const handleNext = () => {
    if (!route || !currentSegment) return;

    selectionHaptic();
    if (currentSegment.type === 'transfer') {
      goToSegment(currentSegmentIndex + 1);
      return;
    }

    if (safeStationIndex < maxStationIndex) {
      setCurrentStationIndex(safeStationIndex + 1);
      return;
    }

    if (currentSegmentIndex < route.segments.length - 1) {
      goToSegment(currentSegmentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (!route || !currentSegment) return;

    selectionHaptic();
    if (currentSegment.type === 'transfer') {
      goToSegment(currentSegmentIndex - 1);
      return;
    }

    if (safeStationIndex > 0) {
      setCurrentStationIndex(safeStationIndex - 1);
      return;
    }

    if (currentSegmentIndex > 0) {
      goToSegment(currentSegmentIndex - 1);
    }
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
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: '탑승 안내' }} />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>진행 중인 탑승 안내가 없습니다</Text>
          <Text style={styles.emptyBody}>경로 상세 화면에서 탑승 안내를 시작하세요.</Text>
          <Link href="/" asChild>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>경로 검색으로 이동</Text>
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
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loadingTrains} onRefresh={() => void refreshTrainPositions()} tintColor={colors.accent} />}
      >

      {currentSegment?.type === 'transfer' ? (
        <View style={styles.activeCard}>
          <Text style={styles.cardKicker}>환승 중</Text>
          <Text style={styles.currentStation}>{currentSegment.stationName}</Text>
          <Text style={styles.cardBody}>
            {currentSegment.toLineName} {currentSegment.toDirection}으로 이동하세요.
          </Text>
          <TransferNotice transfer={currentSegment} />
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>환승 완료</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.activeCard}>
          <View style={styles.activeTopRow}>
            {currentRideSegment ? <LineBadge lineId={currentRideSegment.lineId} /> : null}
            <View style={styles.activeTitleWrap}>
              <Text style={styles.cardKicker}>{line?.name ?? currentRideSegment?.lineName ?? '탑승 구간'}</Text>
              <Text style={styles.directionText}>{currentRideSegment?.direction ?? '방면 정보 확인 중'}</Text>
            </View>
            {isSimulated ? <Text style={styles.simBadgeLarge}>SIM</Text> : null}
          </View>

          <Text style={styles.currentStation}>{currentStationName}</Text>
          <Text style={styles.cardBody}>
            {remainingStations > 0 ? `${currentRideSegment?.toStationName}까지 ${remainingStations}개 역 남음` : '도착역입니다'}
          </Text>

          <View style={styles.railWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: line?.color ?? colors.accent }]} />
            </View>
            <View style={[styles.trainMarker, { left: `${progress * 100}%`, borderColor: line?.color ?? colors.accent }]}>
              <Ionicons name="train" size={10} color={line?.color ?? colors.accent} />
            </View>
          </View>

          <View style={styles.controlRow}>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={handlePrevious}>
              <Ionicons name="chevron-back" size={17} color={colors.accent} />
              <Text style={styles.secondaryButtonText}>이전</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={handleNext}>
              <Text style={styles.secondaryButtonText}>{isFinalArrival ? '도착 완료' : '다음'}</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.accent} />
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={styles.alertTitleRow}>
            <Ionicons name={alarmEnabled ? 'notifications-outline' : 'notifications-off-outline'} size={18} color={colors.accent} />
            <Text style={styles.sectionTitle}>하차 알림</Text>
          </View>
          <Switch
            value={alarmEnabled}
            onValueChange={(enabled) => {
              impactHaptic();
              setAlarmEnabled(enabled);
            }}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor={colors.surface}
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
        <View style={styles.alarmBeforeRow}>
          {[1, 2, 3].map((value) => (
            <Pressable
              key={value}
              onPress={() => {
                selectionHaptic();
                setAlarmBefore(value);
              }}
              style={[styles.alarmBeforeButton, alarmBefore === value && styles.alarmBeforeButtonActive]}
            >
              <Text style={[styles.alarmBeforeText, alarmBefore === value && styles.alarmBeforeTextActive]}>
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

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="train-outline" size={17} color={line?.color ?? colors.accent} />
          <Text style={styles.sectionTitle}>열차 후보</Text>
          {selectedTrain ? <Text style={styles.selectedPill}>{selectedTrain.trainNo} 선택됨</Text> : null}
        </View>
        <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} onPress={() => void refreshTrainPositions()}>
          <Ionicons name="refresh" size={16} color={colors.subtleText} />
        </Pressable>
      </View>

      {isPastLastTrainForRide ? (
        <View style={styles.lastTrainCard}>
          <View style={styles.lastTrainTitleRow}>
            <Ionicons name="moon-outline" size={15} color={colors.red} />
            <Text style={styles.lastTrainTitle}>막차 종료</Text>
          </View>
          <Text style={styles.lastTrainBody}>이 방향 막차가 이미 끊겨 열차를 고를 수 없습니다.</Text>
        </View>
      ) : null}

      <View style={styles.listCard}>
        {trainCandidates.length > 0 ? (
          trainCandidates.map((candidate) => (
            <TrainCandidateRow
              key={candidate.trainNo}
              candidate={candidate}
              selected={candidate.trainNo === selectedTrainNo}
              onPress={() => handleSelectTrain(candidate)}
            />
          ))
        ) : (
          <View style={styles.loadingRow}>
            <Text style={styles.loadingText}>열차 후보를 불러오는 중입니다</Text>
          </View>
        )}
      </View>

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
                    isCurrent && { borderColor: line?.color ?? colors.accent, backgroundColor: colors.surface },
                    isPassed && { backgroundColor: line?.color ?? colors.accent },
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollBody: {
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 48,
  },
  miniNav: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
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
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  miniNavMeta: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: '700',
  },
  activeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...cardShadow,
  },
  activeTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  activeTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardKicker: {
    color: colors.subtleText,
    fontSize: 13,
    fontWeight: '900',
  },
  directionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  currentStation: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  cardBody: {
    ...typography.body,
    color: colors.subtleText,
  },
  railWrap: {
    height: 20,
    justifyContent: 'center',
  },
  progressTrack: {
    backgroundColor: '#F0F1F4',
    borderRadius: radii.pill,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: radii.pill,
    height: 8,
  },
  trainMarker: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginLeft: -10,
    position: 'absolute',
    width: 20,
    shadowColor: '#1B2838',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  controlRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    borderRadius: radii.sm,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 46,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radii.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '900',
  },
  alertCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
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
    color: colors.subtleText,
    fontSize: 14,
    fontWeight: '800',
  },
  alertStatusHot: {
    color: '#C15B1B',
  },
  alertPermissionHint: {
    color: colors.subtleText,
    fontSize: 12,
    lineHeight: 17,
  },
  alarmBeforeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  alarmBeforeButton: {
    alignItems: 'center',
    backgroundColor: '#F0F1F4',
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  alarmBeforeButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  alarmBeforeText: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: '900',
  },
  alarmBeforeTextActive: {
    color: colors.surface,
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
    color: colors.subtleText,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  transferNoticeFast: {
    color: '#C15B1B',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  selectedPill: {
    backgroundColor: '#EBF4FF',
    borderRadius: radii.pill,
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    ...cardShadow,
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
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  preTransferWarning: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '800',
  },
  preTransferEmpty: {
    color: colors.subtleText,
    fontSize: 13,
  },
  preTransferChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  preTransferChip: {
    backgroundColor: colors.surface,
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
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  preTransferChipTextActive: {
    color: colors.surface,
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
    color: colors.red,
    fontSize: 13,
    fontWeight: '900',
  },
  lastTrainBody: {
    color: colors.subtleText,
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
    color: colors.subtleText,
    fontSize: 13,
    lineHeight: 18,
  },
  trainRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  trainRowSelected: {
    backgroundColor: '#F0F1F4',
  },
  trainNoBadge: {
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    borderRadius: radii.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  trainCopy: {
    flex: 1,
    minWidth: 0,
  },
  trainTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  trainMeta: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  simBadge: {
    backgroundColor: '#FFF1E7',
    borderRadius: radii.pill,
    color: '#C15B1B',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  simBadgeLarge: {
    backgroundColor: '#FFF1E7',
    borderRadius: radii.pill,
    color: '#C15B1B',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  loadingRow: {
    alignItems: 'center',
    minHeight: 68,
    justifyContent: 'center',
    padding: spacing.md,
  },
  loadingText: {
    color: colors.subtleText,
    fontSize: 14,
    fontWeight: '800',
  },
  updatedText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
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
    color: colors.subtleText,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  timelineStationCurrent: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  timelineStationPassed: {
    color: colors.muted,
  },
  nowPill: {
    backgroundColor: '#EBF4FF',
    borderRadius: radii.pill,
    color: colors.accent,
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
    color: colors.surface,
    fontSize: 11,
    fontWeight: '900',
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
