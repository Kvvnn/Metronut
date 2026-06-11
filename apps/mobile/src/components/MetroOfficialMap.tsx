import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import officialMapCoords from '@shared/metro/data/officialMapCoords.json';
import metroData from '@shared/metro/data/metroData.json';
import { getAllLines, getLineInfo, type Line, type Station } from '@shared/metro/pathfinder';

import { impactHaptic, selectionHaptic, successHaptic, warningHaptic } from '@/lib/haptics';
import { cardShadow, colors, radii, spacing, typography, type Palette } from '@/lib/theme';
import { useTheme, useThemedStyles } from '@/lib/theme-context';

const mapImage = require('../../assets/images/metro-official-map.png');

type StationRole = 'from' | 'via' | 'to';

interface OfficialMapCoords {
  metadata: {
    width: number;
    height: number;
  };
  stations: Record<string, { x: number; y: number }>;
}

interface MapStation {
  id: string;
  name: string;
  lineId: string;
  x: number;
  y: number;
  transfers: string[];
}

interface MapTransform {
  scale: number;
  x: number;
  y: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

const officialMap = officialMapCoords as OfficialMapCoords;
const MAP_WIDTH = officialMap.metadata.width;
const MAP_HEIGHT = officialMap.metadata.height;
const MIN_SCALE = 0.12;
const MAX_SCALE = 1.2;
const DEFAULT_VIEWPORT_HEIGHT = 430;
/** 초기 줌 — 웹과 동일하게 코어를 3배 확대한 상태로 시작(이전 0.24의 3배). */
const DEFAULT_SCALE = 0.72;

const roleMeta: Record<StationRole, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  from: { label: '출발', color: colors.blue, icon: 'radio-button-on-outline' },
  via: { label: '경유', color: colors.green, icon: 'add-circle-outline' },
  to: { label: '도착', color: colors.red, icon: 'flag-outline' },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function distanceBetweenTouches(touches: readonly { pageX: number; pageY: number }[]) {
  if (touches.length < 2) return 0;
  const [first, second] = touches;
  return Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
}

function buildRouteResultPath(from: string, to: string, via: string) {
  const params = [
    ['from', from],
    ['to', to],
    ['origin', 'mobile-map'],
    ...(via ? [['via', via]] : []),
  ];
  const query = params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `/route-result?${query}` as Href;
}

function stationDetailPath(station: MapStation) {
  return `/station/${encodeURIComponent(station.name)}?line=${encodeURIComponent(station.lineId)}` as Href;
}

function clampTransform(transform: MapTransform, viewport: ViewportSize): MapTransform {
  if (viewport.width <= 0 || viewport.height <= 0) return transform;

  const contentWidth = MAP_WIDTH * transform.scale;
  const contentHeight = MAP_HEIGHT * transform.scale;
  const minX = Math.min(0, viewport.width - contentWidth);
  const minY = Math.min(0, viewport.height - contentHeight);
  const maxX = contentWidth < viewport.width ? (viewport.width - contentWidth) / 2 : 0;
  const maxY = contentHeight < viewport.height ? (viewport.height - contentHeight) / 2 : 0;

  return {
    scale: transform.scale,
    x: contentWidth < viewport.width ? maxX : clamp(transform.x, minX, maxX),
    y: contentHeight < viewport.height ? maxY : clamp(transform.y, minY, maxY),
  };
}

/** 뷰포트 중앙에 지도 중심을 두는 초기 transform(웹 3배 확대 시작 대응). */
function getInitialTransform(viewport: ViewportSize): MapTransform {
  const scale = DEFAULT_SCALE;
  const x = viewport.width / 2 - (MAP_WIDTH * scale) / 2;
  const y = viewport.height / 2 - (MAP_HEIGHT * scale) / 2;
  return clampTransform({ scale, x, y }, viewport);
}

function getUniqueMapStations(selectedLineId: string) {
  const coordsById = officialMap.stations;
  const seen = new Map<string, MapStation>();

  (metroData.stations as Station[])
    .filter((station) => !selectedLineId || station.lineId === selectedLineId)
    .forEach((station) => {
      const coords = coordsById[station.id];
      if (!coords) return;

      const candidate: MapStation = {
        id: station.id,
        name: station.name,
        lineId: station.lineId,
        x: coords.x,
        y: coords.y,
        transfers: station.transfers,
      };
      const existing = seen.get(station.name);
      if (!existing || candidate.transfers.length > existing.transfers.length) {
        seen.set(station.name, candidate);
      }
    });

  return Array.from(seen.values());
}

function SelectedPill({
  role,
  value,
  onClear,
}: {
  role: StationRole;
  value: string;
  onClear: () => void;
}) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const meta = roleMeta[role];

  return (
    <View style={[styles.selectionPill, { borderColor: meta.color }]}>
      <Text style={[styles.selectionPillLabel, { color: meta.color }]}>{meta.label}</Text>
      <Text style={styles.selectionPillValue} numberOfLines={1}>
        {value}
      </Text>
      <Pressable accessibilityLabel={`${meta.label} 지우기`} onPress={onClear} hitSlop={8}>
        <Ionicons name="close" size={14} color={palette.muted} />
      </Pressable>
    </View>
  );
}

export interface MetroOfficialMapProps {
  /** 제어 모드: 부모가 from/via/to를 보유. 주어지면 내부 상태 대신 사용한다. */
  selections?: { from: string; via: string; to: string };
  /** 제어 모드에서 역 역할이 선택될 때 호출. 주어지면 내부 navigation/검색 strip을 쓰지 않는다. */
  onStationRoleSelect?: (name: string, role: StationRole, lineId: string) => void;
  /** 지도 영역을 부모 높이에 꽉 채운다(홈 히어로). 기본은 고정 높이(노선 탭). */
  fillHeight?: boolean;
  /** 검색 strip·노선 필터·메타 행을 숨긴다(홈이 자체 검색카드를 제공). */
  hideChrome?: boolean;
}

export function MetroOfficialMap({
  selections,
  onStationRoleSelect,
  fillHeight = false,
  hideChrome = false,
}: MetroOfficialMapProps = {}) {
  const { palette } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const lines = useMemo(() => getAllLines(), []);
  const controlled = Boolean(selections && onStationRoleSelect);
  const [selectedLineId, setSelectedLineId] = useState('');
  const [selectedStation, setSelectedStation] = useState<MapStation | null>(null);
  const [internalFrom, setInternalFrom] = useState('');
  const [internalVia, setInternalVia] = useState('');
  const [internalTo, setInternalTo] = useState('');
  const from = controlled ? selections!.from : internalFrom;
  const via = controlled ? selections!.via : internalVia;
  const to = controlled ? selections!.to : internalTo;
  const setFrom = controlled ? () => {} : setInternalFrom;
  const setVia = controlled ? () => {} : setInternalVia;
  const setTo = controlled ? () => {} : setInternalTo;
  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: DEFAULT_VIEWPORT_HEIGHT });
  const [transform, setTransform] = useState<MapTransform>({ scale: DEFAULT_SCALE, x: 0, y: 0 });
  const didInitTransform = useRef(false);
  const gestureRef = useRef({
    x: 0,
    y: 0,
    scale: DEFAULT_SCALE,
    pinchDistance: 0,
  });

  const mapStations = useMemo(() => getUniqueMapStations(selectedLineId), [selectedLineId]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          gestureRef.current = {
            x: transform.x,
            y: transform.y,
            scale: transform.scale,
            pinchDistance: distanceBetweenTouches(event.nativeEvent.touches),
          };
        },
        onPanResponderMove: (event, gestureState) => {
          const touches = event.nativeEvent.touches;
          if (touches.length >= 2) {
            const nextDistance = distanceBetweenTouches(touches);
            const baseDistance = gestureRef.current.pinchDistance || nextDistance || 1;
            const nextScale = clamp(gestureRef.current.scale * (nextDistance / baseDistance), MIN_SCALE, MAX_SCALE);
            setTransform((current) => clampTransform({ ...current, scale: nextScale }, viewport));
            return;
          }

          setTransform(
            clampTransform(
              {
                scale: gestureRef.current.scale,
                x: gestureRef.current.x + gestureState.dx,
                y: gestureRef.current.y + gestureState.dy,
              },
              viewport,
            ),
          );
        },
      }),
    [transform, viewport],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    const height = event.nativeEvent.layout.height;
    setViewport({ width, height });
    // 첫 레이아웃에서만 코어를 중앙에 두고 3배 확대로 시작. 이후엔 사용자 팬을 유지.
    if (!didInitTransform.current && width > 0 && height > 0) {
      didInitTransform.current = true;
      setTransform(getInitialTransform({ width, height }));
    } else {
      setTransform((current) => clampTransform(current, { width, height }));
    }
  };

  const handleZoom = (factor: number) => {
    setTransform((current) =>
      clampTransform(
        {
          ...current,
          scale: clamp(current.scale * factor, MIN_SCALE, MAX_SCALE),
        },
        viewport,
      ),
    );
  };

  const handleReset = () => {
    setTransform(getInitialTransform(viewport));
  };

  const handleStationRole = (role: StationRole) => {
    if (!selectedStation) return;

    selectionHaptic();
    if (controlled) {
      onStationRoleSelect!(selectedStation.name, role, selectedStation.lineId);
      setSelectedStation(null);
      return;
    }
    if (role === 'from') {
      setFrom(selectedStation.name);
      if (to === selectedStation.name) setTo('');
      if (via === selectedStation.name) setVia('');
    }
    if (role === 'via') {
      setVia(selectedStation.name);
      if (from === selectedStation.name) setFrom('');
      if (to === selectedStation.name) setTo('');
    }
    if (role === 'to') {
      setTo(selectedStation.name);
      if (from === selectedStation.name) setFrom('');
      if (via === selectedStation.name) setVia('');
    }
  };

  const handleSearch = () => {
    if (!from || !to) {
      warningHaptic();
      return;
    }
    successHaptic();
    router.push(buildRouteResultPath(from, to, via));
  };

  const contentWidth = MAP_WIDTH * transform.scale;
  const contentHeight = MAP_HEIGHT * transform.scale;
  const selectedLine = selectedLineId ? getLineInfo(selectedLineId) : null;

  // 선택된 역 마커 위치에 앵커되는 팝오버 좌표(웹 MetroMap 팝오버 대응, 가장자리 클램핑).
  const popoverLayout = useMemo(() => {
    if (!selectedStation || viewport.width === 0) return null;
    const POP_W = 224;
    const POP_H = 236;
    const edge = 10;
    const markerX = selectedStation.x * transform.scale + transform.x;
    const markerY = selectedStation.y * transform.scale + transform.y;
    const left = clamp(markerX - POP_W / 2, edge, Math.max(edge, viewport.width - POP_W - edge));
    const placeAbove = markerY > viewport.height / 2;
    const rawTop = placeAbove ? markerY - 16 - POP_H : markerY + 16;
    const top = clamp(rawTop, edge, Math.max(edge, viewport.height - POP_H - edge));
    return { left, top, width: POP_W };
  }, [selectedStation, transform, viewport]);

  return (
    <View style={[styles.container, fillHeight && styles.containerFill]}>
      {hideChrome ? null : (
      <View style={styles.searchStrip}>
        <View style={styles.selectionRow}>
          {from ? <SelectedPill role="from" value={from} onClear={() => setFrom('')} /> : null}
          {via ? <SelectedPill role="via" value={via} onClear={() => setVia('')} /> : null}
          {to ? <SelectedPill role="to" value={to} onClear={() => setTo('')} /> : null}
          {!from && !to ? <Text style={styles.selectionHint}>출발·도착 미지정</Text> : null}
        </View>
        <Pressable
          disabled={!from || !to}
          onPress={handleSearch}
          style={({ pressed }) => [
            styles.searchButton,
            (!from || !to) && styles.searchButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.searchButtonText}>경로 검색</Text>
        </Pressable>
      </View>
      )}

      {hideChrome ? null : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lineFilters}>
        <Pressable
          onPress={() => {
            selectionHaptic();
            setSelectedLineId('');
          }}
          style={[styles.lineFilterChip, !selectedLineId && styles.lineFilterChipActive]}
        >
          <Text style={[styles.lineFilterText, !selectedLineId && styles.lineFilterTextActive]}>전체</Text>
        </Pressable>
        {lines.map((line: Line) => {
          const selected = selectedLineId === line.id;
          return (
            <Pressable
              key={line.id}
              onPress={() => {
                selectionHaptic();
                setSelectedLineId(selected ? '' : line.id);
              }}
              style={[
                styles.lineFilterChip,
                selected && { backgroundColor: line.color, borderColor: line.color },
              ]}
            >
              <Text style={[styles.lineFilterText, selected && styles.lineFilterTextActive]}>{line.shortName}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      )}

      <View style={[styles.mapShell, fillHeight && styles.mapShellFill]}>
        <View style={styles.mapViewport} onLayout={handleLayout} {...panResponder.panHandlers}>
          <View
            style={[
              styles.mapContent,
              {
                width: contentWidth,
                height: contentHeight,
                transform: [{ translateX: transform.x }, { translateY: transform.y }],
              },
            ]}
          >
            <Image source={mapImage} style={{ width: contentWidth, height: contentHeight }} resizeMode="stretch" />
            {mapStations.map((station) => {
              const line = getLineInfo(station.lineId);
              const isSelected = selectedStation?.name === station.name;
              const role: StationRole | null =
                from === station.name ? 'from' : via === station.name ? 'via' : to === station.name ? 'to' : null;
              const markerColor = role ? roleMeta[role].color : line?.color ?? palette.green;
              const markerSize = isSelected ? 30 : role ? 26 : 18;

              return (
                <Pressable
                  key={station.id}
                  accessibilityLabel={`${station.name}역 선택`}
                  onPress={() => {
                    impactHaptic();
                    setSelectedStation(station);
                  }}
                  style={[
                    styles.stationMarker,
                    {
                      backgroundColor: markerColor,
                      height: markerSize,
                      left: station.x * transform.scale - markerSize / 2,
                      top: station.y * transform.scale - markerSize / 2,
                      width: markerSize,
                    },
                    isSelected && styles.stationMarkerSelected,
                  ]}
                >
                  {role ? <Text style={styles.stationRoleText}>{roleMeta[role].label[0]}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.mapControls}>
          <Pressable
            onPress={() => {
              selectionHaptic();
              handleZoom(1.28);
            }}
            style={({ pressed }) => [styles.mapControlButton, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={() => {
              selectionHaptic();
              handleZoom(0.78);
            }}
            style={({ pressed }) => [styles.mapControlButton, pressed && styles.pressed]}
          >
            <Ionicons name="remove" size={18} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={() => {
              selectionHaptic();
              handleReset();
            }}
            style={({ pressed }) => [styles.mapControlButton, pressed && styles.pressed]}
          >
            <Ionicons name="expand-outline" size={17} color={palette.text} />
          </Pressable>
        </View>

        {selectedStation && popoverLayout ? (
          <View
            style={[
              styles.popover,
              { left: popoverLayout.left, top: popoverLayout.top, width: popoverLayout.width },
            ]}
          >
            <View style={styles.popoverHeader}>
              <View style={styles.stationTitleWrap}>
                <Text style={styles.popoverTitle} numberOfLines={1}>
                  {selectedStation.name}역
                </Text>
                <Text style={styles.popoverSub} numberOfLines={1}>
                  {getLineInfo(selectedStation.lineId)?.name ?? selectedStation.lineId}
                  {selectedStation.transfers.length > 0 ? ` · 환승 ${selectedStation.transfers.length}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedStation(null)} hitSlop={8}>
                <Ionicons name="close" size={18} color={palette.muted} />
              </Pressable>
            </View>

            <View style={styles.popoverRoles}>
              {(['from', 'via', 'to'] as StationRole[]).map((role) => {
                const meta = roleMeta[role];
                return (
                  <Pressable
                    key={role}
                    onPress={() => handleStationRole(role)}
                    style={({ pressed }) => [styles.popoverRoleBtn, pressed && styles.pressed]}
                  >
                    <View style={[styles.popoverRoleDot, { backgroundColor: meta.color }]}>
                      <Ionicons name={meta.icon} size={13} color={palette.surface} />
                    </View>
                    <Text style={styles.popoverRoleText}>{meta.label}지로</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => {
                successHaptic();
                router.push(stationDetailPath(selectedStation));
              }}
              style={({ pressed }) => [styles.popoverDetailBtn, pressed && styles.pressed]}
            >
              <Text style={styles.popoverDetailText}>역 상세 보기</Text>
              <Ionicons name="chevron-forward" size={15} color={palette.surface} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {hideChrome ? null : (
      <View style={styles.mapMetaRow}>
        <Text style={styles.mapMetaText}>
          {selectedLine ? `${selectedLine.name} ${mapStations.length}개 역 표시` : `전체 ${mapStations.length}개 역 표시`}
        </Text>
        <Text style={styles.mapMetaText}>공식 지도</Text>
      </View>
      )}

    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  containerFill: {
    flex: 1,
    gap: 0,
  },
  searchStrip: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  selectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    minHeight: 34,
  },
  selectionHint: {
    ...typography.caption,
    color: palette.subtleText,
    fontWeight: '800',
  },
  selectionPill: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    maxWidth: '100%',
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  selectionPillLabel: {
    fontSize: 11,
    fontWeight: '900',
  },
  selectionPillValue: {
    color: palette.text,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '900',
    maxWidth: 104,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: palette.text,
    borderRadius: radii.sm,
    justifyContent: 'center',
    minHeight: 44,
  },
  searchButtonDisabled: {
    backgroundColor: '#A9A49B',
  },
  searchButtonText: {
    color: palette.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  lineFilters: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  lineFilterChip: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
  },
  lineFilterChipActive: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  lineFilterText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '900',
  },
  lineFilterTextActive: {
    color: palette.surface,
  },
  mapShell: {
    backgroundColor: '#EAEDF1',
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: DEFAULT_VIEWPORT_HEIGHT,
    overflow: 'hidden',
  },
  mapShellFill: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
  },
  mapViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  mapContent: {
    position: 'absolute',
  },
  stationMarker: {
    alignItems: 'center',
    borderColor: palette.surface,
    borderRadius: radii.pill,
    borderWidth: 2,
    justifyContent: 'center',
    position: 'absolute',
  },
  stationMarkerSelected: {
    borderColor: palette.text,
    borderWidth: 3,
  },
  stationRoleText: {
    color: palette.surface,
    fontSize: 9,
    fontWeight: '900',
  },
  mapControls: {
    gap: spacing.xs,
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
  },
  mapControlButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  mapMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  mapMetaText: {
    color: palette.muted,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
  },
  popover: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
    position: 'absolute',
    ...cardShadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  popoverHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  stationTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  popoverTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '900',
  },
  popoverSub: {
    color: palette.subtleText,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  popoverRoles: {
    gap: 4,
  },
  popoverRoleBtn: {
    alignItems: 'center',
    backgroundColor: palette.surfaceAlt,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  popoverRoleDot: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  popoverRoleText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '800',
  },
  popoverDetailBtn: {
    alignItems: 'center',
    backgroundColor: palette.text,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 42,
  },
  popoverDetailText: {
    color: palette.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
