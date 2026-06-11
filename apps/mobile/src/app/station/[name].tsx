import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getFirstLastTrain, type DayType } from '@shared/metro/firstLastTrain';
import { getLineInfo, getStationInfo, type Station } from '@shared/metro/pathfinder';

import { getRealtimeArrivals, type ArrivalInfo } from '@/lib/realtimeApi';
import { impactHaptic, selectionHaptic } from '@/lib/haptics';
import {
  getStationFavoriteKindsForStationFromMap,
  getStationFavoriteMap,
  removeStationFavorite,
  setStationFavorite,
  STATION_FAVORITE_KINDS,
  type StationFavoriteKind,
  type StationFavoriteMap,
} from '@/lib/stationFavorites';
import { cardShadow, colors, radii, spacing, typography } from '@/lib/theme';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function todayDayType(): DayType {
  const day = new Date().getDay();
  return day === 0 || day === 6 ? 'weekend' : 'weekday';
}

function LineBadge({ lineId }: { lineId: string }) {
  const line = getLineInfo(lineId);

  return (
    <View style={[styles.lineBadge, { backgroundColor: line?.color ?? colors.muted }]}>
      <Text style={styles.lineBadgeText}>{line?.shortName ?? lineId}</Text>
    </View>
  );
}

function LineSelector({
  stations,
  selectedLine,
  onSelect,
}: {
  stations: Station[];
  selectedLine: string;
  onSelect: (lineId: string) => void;
}) {
  if (stations.length <= 1) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lineSelector}>
      {stations.map((station) => {
        const line = getLineInfo(station.lineId);
        const isSelected = selectedLine === station.lineId;

        return (
          <Pressable
            key={station.id}
            onPress={() => onSelect(station.lineId)}
            style={({ pressed }) => [
              styles.lineChip,
              isSelected && { backgroundColor: line?.color ?? colors.text, borderColor: line?.color ?? colors.text },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.lineChipText, isSelected && styles.lineChipTextActive]}>
              {line?.name ?? station.lineId}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ArrivalRow({ arrival, selectedLine }: { arrival: ArrivalInfo; selectedLine: string }) {
  const lineId = arrival.lineId || selectedLine;

  return (
    <View style={styles.arrivalRow}>
      <View style={styles.arrivalMain}>
        <View style={styles.arrivalDirectionRow}>
          <LineBadge lineId={lineId} />
          <Text style={styles.arrivalDirection} numberOfLines={1}>
            {arrival.direction || `${arrival.destination} 방면`}
          </Text>
        </View>
        <View style={styles.arrivalMessageRow}>
          <Text style={styles.arrivalMessage}>{arrival.arrivalMessage || '도착 정보 확인 중'}</Text>
          {arrival.trainType === '급행' || arrival.trainType === '특급' ? (
            <Text style={styles.expressPill}>{arrival.trainType}</Text>
          ) : null}
        </View>
      </View>
      <Text style={styles.currentStation} numberOfLines={1}>
        {arrival.currentStation || arrival.destination}
      </Text>
    </View>
  );
}

function FavoriteButton({
  kind,
  label,
  icon,
  color,
  selected,
  stationName,
  onPress,
}: {
  kind: StationFavoriteKind;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  selected: boolean;
  stationName?: string;
  onPress: (kind: StationFavoriteKind) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(kind)}
      style={({ pressed }) => [
        styles.favoriteOption,
        selected && { backgroundColor: color, borderColor: color },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.favoriteIconRow}>
        <Ionicons name={icon} size={17} color={selected ? colors.surface : color} />
        {selected ? <Ionicons name="checkmark" size={15} color={colors.surface} /> : null}
      </View>
      <Text style={[styles.favoriteLabel, selected && styles.favoriteLabelActive]}>{label}</Text>
      <Text style={[styles.favoriteStation, selected && styles.favoriteStationActive]} numberOfLines={1}>
        {stationName ?? '미설정'}
      </Text>
    </Pressable>
  );
}

export default function StationScreen() {
  const params = useLocalSearchParams<{ name?: string; line?: string }>();
  const stationName = decodeURIComponent(firstParam(params.name) || '');
  const requestedLine = firstParam(params.line);
  const stations = useMemo(() => getStationInfo(stationName), [stationName]);
  const [selectedLine, setSelectedLine] = useState('');
  const [arrivals, setArrivals] = useState<ArrivalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [stationFavoriteMap, setStationFavoriteMap] = useState<StationFavoriteMap>({});
  const [scheduleDayType, setScheduleDayType] = useState<DayType>(() => todayDayType());

  useEffect(() => {
    const availableLineIds = stations.map((station) => station.lineId);
    const nextLine = availableLineIds.includes(requestedLine) ? requestedLine : stations[0]?.lineId ?? '';
    setSelectedLine(nextLine);
  }, [requestedLine, stations]);

  const selectedLineInfo = getLineInfo(selectedLine);
  const firstLast = useMemo(
    () => (selectedLine ? getFirstLastTrain(selectedLine, stationName, scheduleDayType) : null),
    [selectedLine, stationName, scheduleDayType],
  );
  const assignedFavoriteKinds = getStationFavoriteKindsForStationFromMap(stationFavoriteMap, stationName);
  const isFavoriteStation = assignedFavoriteKinds.length > 0;

  const refreshFavorites = useCallback(async () => {
    setStationFavoriteMap(await getStationFavoriteMap());
  }, []);

  const loadArrivals = useCallback(async () => {
    if (!stationName || !selectedLine) return;

    setLoading(true);
    const result = await getRealtimeArrivals(stationName, selectedLine);
    const lineArrivals = result.arrivals.filter((arrival) => !arrival.lineId || arrival.lineId === selectedLine);
    setArrivals(lineArrivals.length > 0 ? lineArrivals : result.arrivals);
    setIsSimulated(result.isSimulated);
    setStatusMessage(result.errorMessage ?? '');
    setLastUpdated(new Date());
    setLoading(false);
  }, [selectedLine, stationName]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  useEffect(() => {
    loadArrivals();
  }, [loadArrivals]);

  const handleToggleStationFavorite = async (kind: StationFavoriteKind) => {
    const current = stationFavoriteMap[kind];

    impactHaptic();
    if (current?.stationName === stationName) {
      await removeStationFavorite(kind);
    } else {
      await setStationFavorite(kind, stationName, selectedLine);
    }

    await refreshFavorites();
  };

  if (!stations.length) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: '역 정보' }} />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>역 정보를 찾지 못했습니다</Text>
          <Text style={styles.emptyBody}>검색 화면에서 역 이름을 다시 선택하세요.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadArrivals} tintColor={colors.accent} />}
    >
      <Stack.Screen options={{ title: `${stationName}역` }} />

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Station</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{stationName}역</Text>
            {isFavoriteStation ? <Ionicons name="star" size={20} color="#C8A218" /> : null}
          </View>
          <Text style={styles.subtitle}>
            {selectedLineInfo?.name ?? selectedLine} 실시간 도착 정보와 첫차·막차를 확인합니다.
          </Text>
        </View>
      </View>

      <LineSelector stations={stations} selectedLine={selectedLine} onSelect={setSelectedLine} />

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="train-outline" size={17} color={selectedLineInfo?.color ?? colors.green} />
          <Text style={styles.sectionTitle}>실시간 도착</Text>
          {isSimulated ? <Text style={styles.simulationPill}>시뮬레이션</Text> : null}
        </View>
        <Pressable
          accessibilityLabel="도착 정보 새로고침"
          onPress={loadArrivals}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="refresh" size={16} color={colors.subtleText} />
        </Pressable>
      </View>

      <View style={styles.listCard}>
        {loading && arrivals.length === 0 ? (
          <View style={styles.loadingRow}>
            <Text style={styles.loadingText}>도착 정보를 불러오는 중입니다</Text>
          </View>
        ) : arrivals.length > 0 ? (
          arrivals.map((arrival, index) => (
            <ArrivalRow
              key={`${arrival.lineId}-${arrival.direction}-${arrival.arrivalTime}-${index}`}
              arrival={arrival}
              selectedLine={selectedLine}
            />
          ))
        ) : (
          <View style={styles.loadingRow}>
            <Text style={styles.loadingText}>표시할 도착 정보가 없습니다</Text>
          </View>
        )}
      </View>

      {lastUpdated ? (
        <Text style={styles.updatedText}>
          마지막 업데이트 {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          {statusMessage ? ` · ${statusMessage}` : ''}
        </Text>
      ) : null}

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="time-outline" size={17} color={selectedLineInfo?.color ?? colors.green} />
          <Text style={styles.sectionTitle}>첫차 · 막차</Text>
          <Text style={styles.referencePill}>참고용</Text>
        </View>
        <View style={styles.segmented}>
          {(['weekday', 'weekend'] as DayType[]).map((dayType) => (
            <Pressable
              key={dayType}
              onPress={() => {
                selectionHaptic();
                setScheduleDayType(dayType);
              }}
              style={[styles.segmentedButton, scheduleDayType === dayType && styles.segmentedButtonActive]}
            >
              <Text style={[styles.segmentedText, scheduleDayType === dayType && styles.segmentedTextActive]}>
                {dayType === 'weekday' ? '평일' : '주말'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {firstLast ? (
        <View style={styles.scheduleGrid}>
          <View style={styles.scheduleCard}>
            <Text style={styles.scheduleDirection}>{firstLast.downTerminus} 방면</Text>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>첫차</Text>
              <Text style={styles.scheduleTime}>{firstLast.downFirst}</Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>막차</Text>
              <Text style={styles.scheduleTime}>{firstLast.downLast}</Text>
            </View>
          </View>
          <View style={styles.scheduleCard}>
            <Text style={styles.scheduleDirection}>{firstLast.upTerminus} 방면</Text>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>첫차</Text>
              <Text style={styles.scheduleTime}>{firstLast.upFirst}</Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>막차</Text>
              <Text style={styles.scheduleTime}>{firstLast.upLast}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>첫차·막차 데이터가 없습니다</Text>
          <Text style={styles.emptyBody}>이 노선은 아직 참고 시간표가 준비되지 않았습니다.</Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="star-outline" size={17} color="#C8A218" />
          <Text style={styles.sectionTitle}>자주 가는 역</Text>
        </View>
      </View>

      <View style={styles.favoriteGrid}>
        {STATION_FAVORITE_KINDS.map((item) => (
          <FavoriteButton
            key={item.kind}
            {...item}
            selected={stationFavoriteMap[item.kind]?.stationName === stationName}
            stationName={stationFavoriteMap[item.kind]?.stationName}
            onPress={handleToggleStationFavorite}
          />
        ))}
      </View>

      {stations.length > 1 ? (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="swap-horizontal-outline" size={17} color="#C15B1B" />
              <Text style={styles.sectionTitle}>환승 정보</Text>
            </View>
          </View>

          <View style={styles.listCard}>
            {stations
              .filter((station) => station.lineId !== selectedLine)
              .map((station) => {
                const line = getLineInfo(station.lineId);

                return (
                  <View key={station.id} style={styles.transferRow}>
                    <View style={styles.transferLine}>
                      <LineBadge lineId={station.lineId} />
                      <Text style={styles.transferLineName}>{line?.name ?? station.lineId}</Text>
                    </View>
                    <Text style={styles.transferHint}>도보 약 3분</Text>
                  </View>
                );
              })}
          </View>
        </>
      ) : null}

      <View style={styles.noticeCard}>
        <Ionicons name="flash-outline" size={17} color="#C15B1B" />
        <Text style={styles.noticeText}>
          빠른 환승 칸은 타고 온 노선과 갈아탈 노선의 방면에 따라 달라져서 경로 상세에서 조합 기준으로 보여줍니다.
        </Text>
      </View>
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
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtleText,
  },
  lineSelector: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  lineChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  lineChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  lineChipTextActive: {
    color: colors.surface,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  simulationPill: {
    backgroundColor: '#FFF1E7',
    borderRadius: radii.pill,
    color: '#C15B1B',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  referencePill: {
    backgroundColor: '#F0F1F4',
    borderRadius: radii.pill,
    color: colors.subtleText,
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
  arrivalRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  arrivalMain: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  arrivalDirectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  arrivalDirection: {
    color: colors.subtleText,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  arrivalMessageRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  arrivalMessage: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  expressPill: {
    backgroundColor: '#FDECEC',
    borderRadius: radii.pill,
    color: colors.red,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  currentStation: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    maxWidth: 96,
    textAlign: 'right',
  },
  lineBadge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  lineBadgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  loadingRow: {
    alignItems: 'center',
    minHeight: 76,
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
  segmented: {
    backgroundColor: '#F0F1F4',
    borderRadius: radii.pill,
    flexDirection: 'row',
    padding: 3,
  },
  segmentedButton: {
    borderRadius: radii.pill,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  segmentedButtonActive: {
    backgroundColor: colors.surface,
  },
  segmentedText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  segmentedTextActive: {
    color: colors.text,
  },
  scheduleGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scheduleCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...cardShadow,
  },
  scheduleDirection: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: '800',
  },
  scheduleRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  scheduleLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  scheduleTime: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  favoriteGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  favoriteOption: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minHeight: 92,
    minWidth: 0,
    padding: spacing.sm,
  },
  favoriteIconRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  favoriteLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  favoriteLabelActive: {
    color: colors.surface,
  },
  favoriteStation: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  favoriteStationActive: {
    color: 'rgba(255,255,255,0.82)',
  },
  transferRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  transferLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  transferLineName: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  transferHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  noticeCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF8EF',
    borderColor: '#F0E4D0',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  noticeText: {
    color: colors.green,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
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
