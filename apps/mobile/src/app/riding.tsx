import { Ionicons } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { formatFastTransferInfo } from '@shared/fastTransfer';
import { getLineInfo } from '@shared/metro/pathfinder';

import { getTrainPositions, type TrainPosition } from '@/lib/realtimeApi';
import { impactHaptic, selectionHaptic, successHaptic } from '@/lib/haptics';
import {
  getRidingRoute,
  getRidingSessionState,
  saveRidingSessionState,
  type RidingRideSegment,
  type RidingRoutePayload,
  type RidingRouteSegment,
  type RidingTransferSegment,
} from '@/lib/ridingSession';
import { colors, radii, spacing, typography } from '@/lib/theme';

interface TrainCandidate extends TrainPosition {
  routeStationIndex: number;
  isSimulatedCandidate: boolean;
}

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

function toTrainCandidates(positions: TrainPosition[], segment: RidingRideSegment): TrainCandidate[] {
  const stationIndex = new Map(segment.stationNames.map((stationName, index) => [stationName, index]));

  return positions
    .map((position) => ({
      ...position,
      routeStationIndex: stationIndex.get(position.stationName) ?? -1,
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
        <Ionicons name="walk-outline" size={18} color="#B85C18" />
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
        <Ionicons name="train-outline" size={15} color={selected ? colors.surface : colors.green} />
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
      {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.green} /> : null}
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
  const alarmStatus = !alarmEnabled
    ? '하차 알림 꺼짐'
    : remainingStations <= alarmBefore && remainingStations > 0
      ? '곧 하차할 준비'
      : `${alarmBefore}정거장 전 알림`;

  const refreshTrainPositions = useCallback(async () => {
    if (!currentRideSegment) return;

    setLoadingTrains(true);
    const result = await getTrainPositions(currentRideSegment.lineName);
    const candidates = toTrainCandidates(result.positions, currentRideSegment);
    const nextCandidates = result.isSimulated || candidates.length === 0
      ? createSimulatedCandidates(currentRideSegment)
      : candidates;

    setTrainCandidates(nextCandidates);
    setIsSimulated(result.isSimulated || candidates.length === 0);
    setPositionMessage(result.errorMessage ?? (candidates.length === 0 ? '열차 후보를 시뮬레이션으로 표시합니다.' : ''));
    setLastUpdated(new Date());
    setLoadingTrains(false);

    setSelectedTrainNo((current) => {
      if (current && nextCandidates.some((candidate) => candidate.trainNo === current)) return current;
      return nextCandidates[0]?.trainNo ?? null;
    });
  }, [currentRideSegment]);

  useEffect(() => {
    void refreshTrainPositions();
  }, [refreshTrainPositions]);

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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loadingTrains} onRefresh={refreshTrainPositions} tintColor={colors.green} />}
    >
      <Stack.Screen options={{ title: '탑승 안내' }} />

      <View style={styles.header}>
        <Text style={styles.kicker}>Riding</Text>
        <Text style={styles.title}>
          {route.overallFromStation} → {route.overallToStation}
        </Text>
        <Text style={styles.subtitle}>
          {rideCount.total > 0 ? `${rideCount.current}/${rideCount.total}번째 탑승 구간` : '탑승 구간 확인 중'}
        </Text>
      </View>

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

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: line?.color ?? colors.green }]} />
          </View>

          <View style={styles.controlRow}>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={handlePrevious}>
              <Ionicons name="chevron-back" size={17} color={colors.green} />
              <Text style={styles.secondaryButtonText}>이전</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={handleNext}>
              <Text style={styles.secondaryButtonText}>{isFinalArrival ? '도착 완료' : '다음'}</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.green} />
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={styles.alertTitleRow}>
            <Ionicons name={alarmEnabled ? 'notifications-outline' : 'notifications-off-outline'} size={18} color={colors.green} />
            <Text style={styles.sectionTitle}>하차 알림</Text>
          </View>
          <Switch
            value={alarmEnabled}
            onValueChange={(enabled) => {
              impactHaptic();
              setAlarmEnabled(enabled);
            }}
            trackColor={{ false: '#D8D1C4', true: '#A7D1C3' }}
            thumbColor={alarmEnabled ? colors.green : colors.surface}
          />
        </View>
        <Text style={[styles.alertStatus, alarmEnabled && remainingStations <= alarmBefore && remainingStations > 0 && styles.alertStatusHot]}>
          {alarmStatus}
        </Text>
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

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="train-outline" size={17} color={line?.color ?? colors.green} />
          <Text style={styles.sectionTitle}>열차 후보</Text>
          {selectedTrain ? <Text style={styles.selectedPill}>{selectedTrain.trainNo} 선택됨</Text> : null}
        </View>
        <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} onPress={refreshTrainPositions}>
          <Ionicons name="refresh" size={16} color={colors.subtleText} />
        </Pressable>
      </View>

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
                    isCurrent && { borderColor: line?.color ?? colors.green, backgroundColor: colors.surface },
                    isPassed && { backgroundColor: line?.color ?? colors.green },
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
    color: colors.green,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtleText,
  },
  activeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
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
  progressTrack: {
    backgroundColor: '#ECE6DA',
    borderRadius: radii.pill,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: radii.pill,
    height: 8,
  },
  controlRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#E7F0EA',
    borderRadius: radii.sm,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 46,
  },
  secondaryButtonText: {
    color: colors.green,
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
    color: '#B85C18',
  },
  alarmBeforeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  alarmBeforeButton: {
    alignItems: 'center',
    backgroundColor: '#F8F7F4',
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  alarmBeforeButtonActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
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
    backgroundColor: '#FFF7EF',
    borderColor: '#F0D4B6',
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
    color: '#B85C18',
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
    color: '#8F4611',
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
    backgroundColor: '#E7F0EA',
    borderRadius: radii.pill,
    color: colors.green,
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
    backgroundColor: '#F1F7F3',
  },
  trainNoBadge: {
    alignItems: 'center',
    backgroundColor: '#E7F0EA',
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
    color: '#A64E16',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  simBadgeLarge: {
    backgroundColor: '#FFF1E7',
    borderRadius: radii.pill,
    color: '#A64E16',
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
  },
  stationTimelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 34,
  },
  timelineDot: {
    backgroundColor: '#D7D0C4',
    borderColor: '#D7D0C4',
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
    backgroundColor: '#E7F0EA',
    borderRadius: radii.pill,
    color: colors.green,
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
