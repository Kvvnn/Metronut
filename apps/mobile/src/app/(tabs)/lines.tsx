import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAllLines, getStationsByLine, type Line, type Station } from '@shared/metro/pathfinder';

import { MetroOfficialMap } from '@/components/MetroOfficialMap';
import { cardShadow, colors, radii, spacing, typography } from '@/lib/theme';

function stationPath(station: Station) {
  return `/station/${encodeURIComponent(station.name)}?line=${encodeURIComponent(station.lineId)}` as Href;
}

function LineSection({
  line,
  expanded,
  onToggle,
}: {
  line: Line;
  expanded: boolean;
  onToggle: () => void;
}) {
  const stations = useMemo(() => getStationsByLine(line.id), [line.id]);
  const visibleStations = expanded ? stations : stations.slice(0, 6);

  return (
    <View style={styles.lineSection}>
      <Pressable style={({ pressed }) => [styles.lineHeader, pressed && styles.pressed]} onPress={onToggle}>
        <View style={[styles.badge, { backgroundColor: line.color }]}>
          <Text style={styles.badgeText}>{line.shortName}</Text>
        </View>
        <View style={styles.lineCopy}>
          <Text style={styles.lineName}>{line.name}</Text>
          <Text style={styles.lineMeta}>{stations.length}개 역</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>

      <View style={styles.stationList}>
        {visibleStations.map((station) => (
          <Link key={station.id} href={stationPath(station)} asChild>
            <Pressable style={({ pressed }) => [styles.stationRow, pressed && styles.pressed]}>
              <Text style={styles.stationName}>{station.name}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          </Link>
        ))}
      </View>

      {!expanded && stations.length > visibleStations.length ? (
        <Pressable style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]} onPress={onToggle}>
          <Text style={styles.moreButtonText}>{stations.length - visibleStations.length}개 역 더 보기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function LinesTab() {
  const lines = useMemo(() => getAllLines(), []);
  const [expandedLineIds, setExpandedLineIds] = useState<Set<string>>(() => new Set(['2']));
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const toggleLine = (lineId: string) => {
    setExpandedLineIds((current) => {
      const next = new Set(current);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Lines</Text>
          <Text style={styles.title}>노선과 역</Text>
          <Text style={styles.subtitle}>공식 노선도와 역 목록을 함께 확인합니다.</Text>
        </View>

        <View style={styles.segmented}>
          <Pressable
            onPress={() => setViewMode('map')}
            style={[styles.segmentedButton, viewMode === 'map' && styles.segmentedButtonActive]}
          >
            <Ionicons name="map-outline" size={15} color={viewMode === 'map' ? colors.surface : colors.subtleText} />
            <Text style={[styles.segmentedText, viewMode === 'map' && styles.segmentedTextActive]}>지도</Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('list')}
            style={[styles.segmentedButton, viewMode === 'list' && styles.segmentedButtonActive]}
          >
            <Ionicons name="list-outline" size={15} color={viewMode === 'list' ? colors.surface : colors.subtleText} />
            <Text style={[styles.segmentedText, viewMode === 'list' && styles.segmentedTextActive]}>목록</Text>
          </Pressable>
        </View>

        {viewMode === 'map' ? (
          <MetroOfficialMap />
        ) : (
          lines.map((line) => (
            <LineSection
              key={line.id}
              line={line}
              expanded={expandedLineIds.has(line.id)}
              onToggle={() => toggleLine(line.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 120,
  },
  header: {
    gap: spacing.xs,
    paddingTop: spacing.md,
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
  subtitle: {
    ...typography.body,
    color: colors.subtleText,
  },
  segmented: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  segmentedButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 42,
  },
  segmentedButtonActive: {
    backgroundColor: colors.text,
  },
  segmentedText: {
    color: colors.subtleText,
    fontSize: 14,
    fontWeight: '900',
  },
  segmentedTextActive: {
    color: colors.surface,
  },
  lineSection: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    ...cardShadow,
  },
  lineHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.md,
  },
  badge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    minWidth: 34,
    paddingHorizontal: 7,
  },
  badgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  lineCopy: {
    flex: 1,
    gap: 2,
  },
  lineName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  lineMeta: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: '800',
  },
  stationList: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  stationRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  stationName: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  moreButton: {
    alignItems: 'center',
    minHeight: 46,
    justifyContent: 'center',
  },
  moreButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
