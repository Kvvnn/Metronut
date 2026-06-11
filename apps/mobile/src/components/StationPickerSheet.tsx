import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { searchStations, type Line } from '@shared/metro/pathfinder';

import { selectionHaptic } from '@/lib/haptics';
import { colors, radii, spacing, typography } from '@/lib/theme';

type StationField = 'from' | 'via' | 'to';

const popularStations = ['강남', '홍대입구', '서울역', '잠실', '신도림', '왕십리', '여의도', '사당'];

const fieldCopy: Record<StationField, { title: string; placeholder: string; color: string }> = {
  from: { title: '출발역', placeholder: '출발역 검색', color: colors.blue },
  via: { title: '경유역', placeholder: '경유역 검색', color: colors.green },
  to: { title: '도착역', placeholder: '도착역 검색', color: colors.red },
};

function LineBadge({ line }: { line: Line }) {
  return (
    <View style={[styles.lineBadge, { backgroundColor: line.color }]}>
      <Text style={styles.lineBadgeText}>{line.shortName}</Text>
    </View>
  );
}

export function StationPickerSheet({
  field,
  visible,
  onClose,
  onSelect,
}: {
  field: StationField | null;
  visible: boolean;
  onClose: () => void;
  onSelect: (stationName: string) => void;
}) {
  const [query, setQuery] = useState('');
  const copy = field ? fieldCopy[field] : fieldCopy.from;
  const results = useMemo(() => searchStations(query.trim()), [query]);

  const handleSelect = (stationName: string) => {
    selectionHaptic();
    onSelect(stationName);
    setQuery('');
  };

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.sheet}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardArea}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>Station search</Text>
              <Text style={styles.title}>{copy.title}</Text>
            </View>
            <Pressable
              accessibilityLabel="역 검색 닫기"
              onPress={handleClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={[styles.searchBox, { borderColor: copy.color }]}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder={copy.placeholder}
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <Pressable
                accessibilityLabel="검색어 지우기"
                onPress={() => setQuery('')}
                style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.resultList}>
            {results.length > 0 ? (
              results.map((station) => (
                <Pressable
                  key={station.name}
                  onPress={() => handleSelect(station.name)}
                  style={({ pressed }) => [styles.resultRow, pressed && styles.resultPressed]}>
                  <Text style={styles.stationName}>{station.name}</Text>
                  <View style={styles.lineBadgeGroup}>
                    {station.lines.map((line) => (
                      <LineBadge key={line.id} line={line} />
                    ))}
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.popularSection}>
                {query.trim() ? (
                  <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
                ) : (
                  <>
                    <Text style={styles.popularTitle}>자주 검색하는 역</Text>
                    <View style={styles.popularGrid}>
                      {popularStations.map((stationName) => (
                        <Pressable
                          key={stationName}
                          onPress={() => handleSelect(stationName)}
                          style={({ pressed }) => [styles.popularChip, pressed && styles.pressed]}>
                          <Text style={styles.popularChipText}>{stationName}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
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
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: {
    opacity: 0.72,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 2,
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    minHeight: 50,
  },
  clearButton: {
    padding: spacing.xs,
  },
  resultList: {
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: 44,
  },
  resultRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  resultPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  stationName: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
  },
  lineBadgeGroup: {
    flexDirection: 'row',
    flexShrink: 1,
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'flex-end',
  },
  lineBadge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  lineBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '900',
  },
  popularSection: {
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.subtleText,
    textAlign: 'center',
  },
  popularTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  popularChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  popularChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
});
