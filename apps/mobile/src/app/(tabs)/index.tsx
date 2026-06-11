import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MetroOfficialMap } from '@/components/MetroOfficialMap';
import { StationPickerSheet } from '@/components/StationPickerSheet';
import { impactHaptic, selectionHaptic, successHaptic, warningHaptic } from '@/lib/haptics';
import {
  getFavoriteRoutes,
  removeFavoriteRoute,
  type FavoriteRoute,
} from '@/lib/routeFavorites';
import {
  getStationFavoriteMap,
  STATION_FAVORITE_KINDS,
  type StationFavoriteMap,
} from '@/lib/stationFavorites';
import { cardShadow, colors, radii, spacing } from '@/lib/theme';

type StationField = 'from' | 'via' | 'to';

function buildRouteResultPath(from: string, to: string, via: string) {
  const params = [
    ['from', from],
    ['to', to],
    ['origin', 'mobile-home'],
    ...(via ? [['via', via]] : []),
  ];
  const query = params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `/route-result?${query}`;
}

/** 검색카드의 한 줄(출발/경유/도착). 웹 Home의 스택형 입력과 동일한 구조. */
function SearchField({
  dotColor,
  value,
  placeholder,
  onPress,
  onClear,
}: {
  dotColor: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  onClear?: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.searchField}>
      <View style={[styles.searchDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.searchFieldValue, !value && styles.searchFieldPlaceholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      {value && onClear ? (
        <Pressable accessibilityLabel="지우기" onPress={onClear} hitSlop={8} style={styles.searchFieldClear}>
          <Ionicons name="close" size={15} color={colors.muted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export default function HomeTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [via, setVia] = useState('');
  const [showVia, setShowVia] = useState(false);
  const [pickerField, setPickerField] = useState<StationField | null>(null);
  const [confirmDismissed, setConfirmDismissed] = useState(false);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [favoriteRoutes, setFavoriteRoutes] = useState<FavoriteRoute[]>([]);
  const [stationFavoriteMap, setStationFavoriteMap] = useState<StationFavoriteMap>({});

  const refreshFavorites = useCallback(async () => {
    const [routes, stations] = await Promise.all([getFavoriteRoutes(), getStationFavoriteMap()]);
    setFavoriteRoutes(routes);
    setStationFavoriteMap(stations);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshFavorites();
    }, [refreshFavorites]),
  );

  const assignStation = (name: string, field: StationField) => {
    setConfirmDismissed(false);
    if (field === 'from') {
      setFrom(name);
      if (to === name) setTo('');
      if (via === name) setVia('');
    } else if (field === 'to') {
      setTo(name);
      if (from === name) setFrom('');
      if (via === name) setVia('');
    } else {
      setVia(name);
      setShowVia(true);
      if (from === name) setFrom('');
      if (to === name) setTo('');
    }
  };

  const handlePickerSelect = (stationName: string) => {
    selectionHaptic();
    if (pickerField) assignStation(stationName, pickerField);
    setPickerField(null);
  };

  const handleMapStationRole = useCallback((name: string, role: StationField) => {
    assignStation(name, role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, via]);

  const handleSwap = () => {
    impactHaptic();
    setFrom(to);
    setTo(from);
    setConfirmDismissed(false);
  };

  const goToResult = () => {
    if (!from || !to) {
      warningHaptic();
      setPickerField(!from ? 'from' : 'to');
      return;
    }
    successHaptic();
    router.push(buildRouteResultPath(from, to, via) as Href);
  };

  const handleFavoriteStationPress = (stationName: string) => {
    selectionHaptic();
    assignStation(stationName, !from || from === stationName ? 'from' : 'to');
  };

  const handleFavoriteRoutePress = (route: FavoriteRoute) => {
    successHaptic();
    router.push(buildRouteResultPath(route.from, route.to, route.via ?? '') as Href);
  };

  const handleRemoveFavoriteRoute = async (id: string) => {
    impactHaptic();
    await removeFavoriteRoute(id);
    await refreshFavorites();
  };

  const showConfirm = Boolean(from && to && !confirmDismissed);
  const hasStationFavorites = STATION_FAVORITE_KINDS.some(({ kind }) => stationFavoriteMap[kind]);

  return (
    <View style={styles.root}>
      {/* 지도 히어로 — 화면 전체 (웹 Home과 동일) */}
      <View style={styles.mapLayer}>
        <MetroOfficialMap
          fillHeight
          hideChrome
          selections={{ from, via, to }}
          onStationRoleSelect={handleMapStationRole}
        />
      </View>

      {/* 상단 떠있는 검색 카드 */}
      <View style={[styles.searchCardWrap, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.searchCard}>
          <View style={styles.searchFields}>
            <SearchField
              dotColor={colors.accent}
              value={from}
              placeholder="출발역"
              onPress={() => setPickerField('from')}
              onClear={() => setFrom('')}
            />
            <View style={styles.searchDivider} />
            {showVia || via ? (
              <>
                <SearchField
                  dotColor={colors.green}
                  value={via}
                  placeholder="경유역"
                  onPress={() => setPickerField('via')}
                  onClear={() => {
                    setVia('');
                    setShowVia(false);
                  }}
                />
                <View style={styles.searchDivider} />
              </>
            ) : (
              <Pressable
                onPress={() => {
                  setShowVia(true);
                  setPickerField('via');
                }}
                style={styles.addViaRow}>
                <Ionicons name="add-circle-outline" size={15} color={colors.green} />
                <Text style={styles.addViaText}>경유역 추가</Text>
              </Pressable>
            )}
            <SearchField
              dotColor={colors.red}
              value={to}
              placeholder="도착역"
              onPress={() => setPickerField('to')}
              onClear={() => setTo('')}
            />
          </View>
          <View style={styles.searchActions}>
            <Pressable
              accessibilityLabel="출발·도착 바꾸기"
              onPress={handleSwap}
              style={({ pressed }) => [styles.swapButton, pressed && styles.pressed]}>
              <Ionicons name="swap-vertical" size={16} color={colors.text} />
            </Pressable>
            <Pressable
              accessibilityLabel="경로 검색"
              onPress={goToResult}
              style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}>
              <Ionicons name="search" size={18} color={colors.surface} />
            </Pressable>
          </View>
        </View>
        {showConfirm ? (
          <View style={styles.confirmCard}>
            <View style={styles.confirmCopy}>
              <Text style={styles.confirmRoute} numberOfLines={1}>
                {from}
                {via ? ` → ${via}` : ''} → {to}
              </Text>
              <Text style={styles.confirmSub}>경로를 검색할까요?</Text>
            </View>
            <Pressable onPress={() => setConfirmDismissed(true)} hitSlop={8} style={styles.confirmClose}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
            <Pressable onPress={goToResult} style={({ pressed }) => [styles.confirmGo, pressed && styles.pressed]}>
              <Text style={styles.confirmGoText}>경로 보기</Text>
            </Pressable>
          </View>
        ) : !from || !to ? (
          <Text style={styles.mapHint}>
            지도에서 {!from ? '출발역' : '도착역'}을 탭하거나 위 칸을 눌러 검색하세요
          </Text>
        ) : null}
      </View>

      {/* 하단 즐겨찾기 시트 */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={sheetCollapsed ? '즐겨찾기 펼치기' : '즐겨찾기 접기'}
          onPress={() => {
            selectionHaptic();
            setSheetCollapsed((v) => !v);
          }}
          style={styles.sheetHandleRow}>
          <View style={styles.sheetHandle} />
        </Pressable>

        {!sheetCollapsed ? (
          <View style={styles.sheetBody}>
            <View style={styles.toggleRow}>
              <Pressable
                onPress={() => setShowRecent(false)}
                style={[styles.toggleChip, !showRecent && styles.toggleChipActive]}>
                <Ionicons name="star" size={13} color={!showRecent ? '#C8A218' : colors.muted} />
                <Text style={[styles.toggleText, !showRecent && styles.toggleTextActive]}>즐겨찾기</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowRecent(true)}
                style={[styles.toggleChip, showRecent && styles.toggleChipActive]}>
                <Ionicons name="time-outline" size={13} color={showRecent ? colors.accent : colors.muted} />
                <Text style={[styles.toggleText, showRecent && styles.toggleTextActive]}>최근 검색</Text>
              </Pressable>
            </View>

            {showRecent ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>최근 검색</Text>
                <Text style={styles.emptySub}>추후 구현 예정입니다</Text>
              </View>
            ) : (
              <>
                <View style={styles.favStationRow}>
                  {STATION_FAVORITE_KINDS.map(({ kind, label, icon, color }) => {
                    const favorite = stationFavoriteMap[kind];
                    return (
                      <Pressable
                        key={kind}
                        disabled={!favorite}
                        onPress={() => favorite && handleFavoriteStationPress(favorite.stationName)}
                        style={({ pressed }) => [
                          styles.favStationChip,
                          !favorite && styles.favStationChipEmpty,
                          pressed && styles.pressed,
                        ]}>
                        <View style={styles.favStationLabelRow}>
                          <Ionicons name={icon} size={14} color={favorite ? color : colors.muted} />
                          <Text style={styles.favStationLabel}>{label}</Text>
                        </View>
                        <Text style={styles.favStationName} numberOfLines={1}>
                          {favorite?.stationName ?? '미설정'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {favoriteRoutes.length === 0 && !hasStationFavorites ? (
                  <Text style={styles.favEmptyText}>
                    역 상세에서 자주 가는 역을 설정하거나 경로 상세에서 별을 누르세요.
                  </Text>
                ) : null}

                <ScrollView style={styles.favRoutesScroll} contentContainerStyle={styles.favRoutesContent}>
                  {favoriteRoutes.map((route) => (
                    <View key={route.id} style={styles.favRouteRow}>
                      <Pressable
                        onPress={() => handleFavoriteRoutePress(route)}
                        style={({ pressed }) => [styles.favRouteBody, pressed && styles.pressed]}>
                        <View style={styles.favRouteStar}>
                          <Ionicons name="star" size={14} color="#C8A218" />
                        </View>
                        <View style={styles.favRouteCopy}>
                          <Text style={styles.favRouteTitle} numberOfLines={1}>
                            {route.from}
                            <Text style={styles.favRouteArrow}> → </Text>
                            {route.via ? (
                              <>
                                {route.via}
                                <Text style={styles.favRouteArrow}> → </Text>
                              </>
                            ) : null}
                            {route.to}
                          </Text>
                          <Text style={styles.favRouteMeta}>
                            {typeof route.transferCount === 'number'
                              ? `환승 ${route.transferCount}회`
                              : '즐겨찾기 경로'}
                            {route.time ? ` · ${route.time}` : ''}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        accessibilityLabel="즐겨찾기 삭제"
                        onPress={() => void handleRemoveFavoriteRoute(route.id)}
                        style={({ pressed }) => [styles.favRouteRemoveBtn, pressed && styles.pressed]}>
                        <Ionicons name="trash-outline" size={15} color={colors.muted} />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        ) : null}
      </View>

      <StationPickerSheet
        field={pickerField}
        visible={Boolean(pickerField)}
        onClose={() => setPickerField(null)}
        onSelect={handlePickerSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  searchCardWrap: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    paddingHorizontal: spacing.md,
  },
  searchCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    ...cardShadow,
    shadowOpacity: 0.12,
  },
  searchFields: {
    flex: 1,
    gap: 2,
  },
  searchField: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 34,
    paddingHorizontal: spacing.xs,
  },
  searchDot: {
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  searchFieldValue: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  searchFieldPlaceholder: {
    color: colors.subtleText,
    fontWeight: '600',
  },
  searchFieldClear: {
    padding: 2,
  },
  searchDivider: {
    backgroundColor: colors.border,
    height: 1,
    marginLeft: 18,
  },
  addViaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    minHeight: 28,
    paddingHorizontal: spacing.xs,
  },
  addViaText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '700',
  },
  searchActions: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  swapButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  mapHint: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  confirmCard: {
    marginTop: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    ...cardShadow,
    shadowOpacity: 0.14,
  },
  confirmCopy: {
    flex: 1,
    gap: 2,
  },
  confirmRoute: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  confirmSub: {
    color: colors.subtleText,
    fontSize: 12,
  },
  confirmClose: {
    padding: 2,
  },
  confirmGo: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  confirmGoText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    shadowColor: '#1B2838',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetHandleRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sheetHandle: {
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    height: 5,
    width: 36,
  },
  sheetBody: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  toggleRow: {
    alignSelf: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  toggleChip: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  toggleChipActive: {
    backgroundColor: colors.surface,
    ...cardShadow,
    shadowOpacity: 0.08,
  },
  toggleText: {
    color: colors.subtleText,
    fontSize: 13,
    fontWeight: '800',
  },
  toggleTextActive: {
    color: colors.text,
  },
  emptyBox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 4,
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  emptySub: {
    color: colors.subtleText,
    fontSize: 13,
    fontWeight: '600',
  },
  favStationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  favStationChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  favStationChipEmpty: {
    opacity: 0.55,
  },
  favStationLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  favStationLabel: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: '800',
  },
  favStationName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  favEmptyText: {
    color: colors.subtleText,
    fontSize: 13,
    lineHeight: 18,
  },
  favRoutesScroll: {
    maxHeight: 132,
  },
  favRoutesContent: {
    gap: spacing.xs,
  },
  favRouteRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  favRouteBody: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  favRouteStar: {
    alignItems: 'center',
    backgroundColor: '#FFF7D9',
    borderRadius: radii.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  favRouteCopy: {
    flex: 1,
    gap: 2,
  },
  favRouteTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  favRouteArrow: {
    color: colors.muted,
    fontWeight: '700',
  },
  favRouteMeta: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: '700',
  },
  favRouteRemoveBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pressed: {
    opacity: 0.74,
  },
});
