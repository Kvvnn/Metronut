import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StationPickerSheet } from '@/components/StationPickerSheet';
import { API_BASE_URL } from '@/lib/config';
import { impactHaptic, selectionHaptic, successHaptic, warningHaptic } from '@/lib/haptics';
import { colors, radii, spacing, typography } from '@/lib/theme';

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

function StationSelector({
  label,
  value,
  placeholder,
  color,
  onPress,
  onClear,
}: {
  label: string;
  value: string;
  placeholder: string;
  color: string;
  onPress: () => void;
  onClear?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.selector, pressed && styles.selectorPressed]}>
      <View style={[styles.selectorRail, { backgroundColor: color }]} />
      <View style={styles.selectorCopy}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Text style={[styles.selectorValue, !value && styles.selectorPlaceholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
      </View>
      {value && onClear ? (
        <Pressable
          accessibilityLabel={`${label} 지우기`}
          onPress={onClear}
          style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
          <Ionicons name="close-circle" size={20} color={colors.muted} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      )}
    </Pressable>
  );
}

export default function HomeTab() {
  const router = useRouter();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [via, setVia] = useState('');
  const [showVia, setShowVia] = useState(false);
  const [pickerField, setPickerField] = useState<StationField | null>(null);
  const [error, setError] = useState('');

  const handleSelectStation = (stationName: string) => {
    selectionHaptic();
    if (pickerField === 'from') {
      setFrom(stationName);
      if (to === stationName) setTo('');
      if (via === stationName) setVia('');
    }
    if (pickerField === 'to') {
      setTo(stationName);
      if (from === stationName) setFrom('');
      if (via === stationName) setVia('');
    }
    if (pickerField === 'via') {
      setVia(stationName);
      setShowVia(true);
      if (from === stationName) setFrom('');
      if (to === stationName) setTo('');
    }
    setError('');
    setPickerField(null);
  };

  const handleSwap = () => {
    impactHaptic();
    setFrom(to);
    setTo(from);
    setError('');
  };

  const handleSearch = () => {
    if (!from || !to) {
      warningHaptic();
      setError(!from ? '출발역을 선택하세요.' : '도착역을 선택하세요.');
      setPickerField(!from ? 'from' : 'to');
      return;
    }

    successHaptic();
    router.push(buildRouteResultPath(from, to, via) as Href);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.kicker}>Metronut</Text>
          <Text style={styles.title}>어디로 갈까요?</Text>
          <Text style={styles.subtitle}>출발역과 도착역을 고르면 바로 경로 후보를 비교합니다.</Text>
        </View>

        <View style={styles.searchPanel}>
          <StationSelector
            label="출발"
            value={from}
            placeholder="출발역 검색"
            color={colors.blue}
            onPress={() => setPickerField('from')}
            onClear={() => setFrom('')}
          />

          <View style={styles.swapRow}>
            <View style={styles.separator} />
            <Pressable
              accessibilityLabel="출발역과 도착역 바꾸기"
              onPress={handleSwap}
              style={({ pressed }) => [styles.swapButton, pressed && styles.pressed]}>
              <Ionicons name="swap-vertical" size={20} color={colors.green} />
            </Pressable>
            <View style={styles.separator} />
          </View>

          {showVia && (
            <StationSelector
              label="경유"
              value={via}
              placeholder="경유역 검색"
              color={colors.green}
              onPress={() => setPickerField('via')}
              onClear={() => {
                setVia('');
                setShowVia(false);
              }}
            />
          )}

          <StationSelector
            label="도착"
            value={to}
            placeholder="도착역 검색"
            color={colors.red}
            onPress={() => setPickerField('to')}
            onClear={() => setTo('')}
          />

          {!showVia && (
            <Pressable
              onPress={() => {
                setShowVia(true);
                setPickerField('via');
              }}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <Ionicons name="add" size={18} color={colors.green} />
              <Text style={styles.secondaryButtonText}>경유역 추가</Text>
            </Pressable>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={handleSearch}>
            <Text style={styles.primaryButtonText}>경로 검색</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>API 연결</Text>
          <Text style={styles.cardBody} numberOfLines={2}>
            {API_BASE_URL}
          </Text>
        </View>
      </ScrollView>

      <StationPickerSheet
        field={pickerField}
        visible={Boolean(pickerField)}
        onClose={() => setPickerField(null)}
        onSelect={handleSelectStation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 120,
  },
  hero: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  kicker: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtleText,
  },
  searchPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  selector: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md,
  },
  selectorPressed: {
    backgroundColor: '#F0E9DB',
  },
  selectorRail: {
    borderRadius: radii.pill,
    height: 34,
    width: 4,
  },
  selectorCopy: {
    flex: 1,
    gap: 3,
  },
  inputLabel: {
    color: colors.subtleText,
    fontSize: 12,
    fontWeight: '800',
  },
  selectorValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  selectorPlaceholder: {
    color: colors.muted,
    fontWeight: '700',
  },
  clearButton: {
    padding: 4,
  },
  swapRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  separator: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  swapButton: {
    alignItems: 'center',
    backgroundColor: '#E7F0EA',
    borderRadius: radii.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: spacing.xs,
  },
  secondaryButtonText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: '900',
  },
  errorText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radii.sm,
    minHeight: 52,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  cardBody: {
    ...typography.caption,
    color: colors.subtleText,
  },
});
