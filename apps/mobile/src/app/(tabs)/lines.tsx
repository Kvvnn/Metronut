import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAllLines, getLineInfo, getStationsByLine, type Line, type Station } from '@shared/metro/pathfinder';

import { MetroOfficialMap } from '@/components/MetroOfficialMap';
import { fadeIn, slideUp, stagger } from '@/lib/animations';
import { cardShadow, colors, radii, spacing, typography } from '@/lib/theme';

function stationPath(station: Station) {
  return `/station/${encodeURIComponent(station.name)}?line=${encodeURIComponent(station.lineId)}` as Href;
}

/** 전체 노선 목록(웹 AllLines): 배지 + 이름 + chevron 행으로 구성된 단일 카드. */
function AllLines({ lines, onSelect }: { lines: Line[]; onSelect: (id: string) => void }) {
  return (
    <Animated.View entering={fadeIn()} style={styles.listCard}>
      {lines.map((line, idx) => (
        <Animated.View key={line.id} entering={slideUp(stagger(idx, 18))}>
          <Pressable
            onPress={() => onSelect(line.id)}
            style={({ pressed }) => [
              styles.lineRow,
              idx < lines.length - 1 && styles.rowDivider,
              pressed && styles.pressed,
            ]}>
            <View style={[styles.badge, { backgroundColor: line.color }]}>
              <Text style={styles.badgeText}>{line.shortName}</Text>
            </View>
            <Text style={styles.lineRowName}>{line.name}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

/** 선택 노선의 역 목록(웹 LineStations): 노선 헤더 + 타임라인 점 + 환승 배지. */
function LineStations({ lineId }: { lineId: string }) {
  const stations = useMemo(() => getStationsByLine(lineId), [lineId]);
  const line = getLineInfo(lineId);
  const color = line?.color ?? colors.accent;

  return (
    <Animated.View entering={fadeIn()} style={styles.listCard}>
      <View style={[styles.lineHeaderTinted, { backgroundColor: `${color}1A` }]}>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{line?.shortName}</Text>
        </View>
        <Text style={styles.lineHeaderText}>
          {line?.name} ({stations.length}개 역)
        </Text>
      </View>

      {stations.map((station, idx) => {
        const isLast = idx === stations.length - 1;
        return (
          <Link key={station.id} href={stationPath(station)} asChild>
            <Pressable style={({ pressed }) => [styles.timelineRow, pressed && styles.pressed]}>
              <View style={styles.timelineCol}>
                {idx > 0 ? <View style={[styles.timelineConnector, styles.connectorTop, { backgroundColor: `${color}66` }]} /> : null}
                {!isLast ? <View style={[styles.timelineConnector, styles.connectorBottom, { backgroundColor: `${color}66` }]} /> : null}
                <View style={[styles.timelineDot, { borderColor: color }]} />
              </View>
              <Text style={styles.timelineStationName}>{station.name}</Text>
              {station.transfers.length > 0 ? (
                <View style={styles.transferBadges}>
                  {station.transfers.slice(0, 3).map((tId) => {
                    const tLine = getLineInfo(tId);
                    return tLine ? (
                      <View key={tId} style={[styles.miniBadge, { backgroundColor: tLine.color }]}>
                        <Text style={styles.miniBadgeText}>{tLine.shortName}</Text>
                      </View>
                    ) : null;
                  })}
                </View>
              ) : null}
            </Pressable>
          </Link>
        );
      })}
    </Animated.View>
  );
}

export default function LinesTab() {
  const lines = useMemo(() => getAllLines(), []);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedLine, setSelectedLine] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>노선도</Text>
        <Text style={styles.subtitle}>수도권 전체 {lines.length}개 노선</Text>

        {/* Segment control */}
        <View style={styles.segmented}>
          <Pressable
            onPress={() => setViewMode('map')}
            style={[styles.segmentedButton, viewMode === 'map' && styles.segmentedButtonActive]}>
            <Ionicons name="map-outline" size={14} color={viewMode === 'map' ? colors.text : colors.subtleText} />
            <Text style={[styles.segmentedText, viewMode === 'map' && styles.segmentedTextActive]}>지도</Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('list')}
            style={[styles.segmentedButton, viewMode === 'list' && styles.segmentedButtonActive]}>
            <Ionicons name="list-outline" size={14} color={viewMode === 'list' ? colors.text : colors.subtleText} />
            <Text style={[styles.segmentedText, viewMode === 'list' && styles.segmentedTextActive]}>목록</Text>
          </Pressable>
        </View>
      </View>

      {viewMode === 'map' ? (
        <ScrollView contentContainerStyle={styles.mapScroll}>
          <MetroOfficialMap />
        </ScrollView>
      ) : (
        <View style={styles.listWrap}>
          {/* 가로 스크롤 노선 선택칩 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}>
            <Pressable
              onPress={() => setSelectedLine(null)}
              style={[styles.chip, !selectedLine && styles.chipActiveDark]}>
              <Text style={[styles.chipText, !selectedLine && styles.chipTextActive]}>전체</Text>
            </Pressable>
            {lines.map((line) => {
              const active = selectedLine === line.id;
              return (
                <Pressable
                  key={line.id}
                  onPress={() => setSelectedLine(line.id)}
                  style={[styles.chip, active && { backgroundColor: line.color }]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{line.shortName}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.listContent}>
            {selectedLine ? <LineStations lineId={selectedLine} /> : <AllLines lines={lines} onSelect={setSelectedLine} />}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    gap: 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtleText,
  },
  segmented: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.sm,
    padding: 4,
  },
  segmentedButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 38,
  },
  segmentedButtonActive: {
    backgroundColor: colors.surface,
    ...cardShadow,
    shadowOpacity: 0.08,
  },
  segmentedText: {
    color: colors.subtleText,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentedTextActive: {
    color: colors.text,
  },
  mapScroll: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 120,
  },
  listWrap: {
    flex: 1,
  },
  chipRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
  },
  chipActiveDark: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.surface,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...cardShadow,
  },
  lineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  rowDivider: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lineRowName: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 28,
    justifyContent: 'center',
    minWidth: 28,
    paddingHorizontal: 7,
  },
  badgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  lineHeaderTinted: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  lineHeaderText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  timelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  timelineCol: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    position: 'relative',
    width: 24,
  },
  timelineConnector: {
    position: 'absolute',
    width: 2,
  },
  connectorTop: {
    top: 0,
    height: 24,
  },
  connectorBottom: {
    bottom: 0,
    height: 24,
  },
  timelineDot: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  timelineStationName: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  transferBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  miniBadge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 5,
  },
  miniBadgeText: {
    color: colors.surface,
    fontSize: 9,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
