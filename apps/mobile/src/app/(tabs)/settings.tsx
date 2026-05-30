import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL } from '@/lib/config';
import { getUseSimulatedTrainData, setUseSimulatedTrainData } from '@/lib/simulationSettings';
import { colors, radii, spacing, typography } from '@/lib/theme';

export default function SettingsTab() {
  const [simulationEnabled, setSimulationEnabled] = useState(false);

  useEffect(() => {
    getUseSimulatedTrainData().then(setSimulationEnabled);
  }, []);

  const handleSimulationChange = async (enabled: boolean) => {
    setSimulationEnabled(enabled);
    await setUseSimulatedTrainData(enabled);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.appName}>메트로넛</Text>
          <Text style={styles.appDescription}>서울 지하철 경로와 탑승 안내</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>데이터</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>시뮬레이션 열차 데이터</Text>
              <Text style={styles.settingHint}>켜면 실시간 API 대신 앱 안의 예시 도착 정보를 표시합니다.</Text>
            </View>
            <Switch
              value={simulationEnabled}
              onValueChange={handleSimulationChange}
              trackColor={{ false: '#D8D1C4', true: '#A7D1C3' }}
              thumbColor={simulationEnabled ? colors.green : colors.surface}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API</Text>
          <View style={styles.infoCard}>
            <Text style={styles.settingLabel}>Vercel API Base URL</Text>
            <Text style={styles.apiText} numberOfLines={3}>
              {API_BASE_URL}
            </Text>
            <Text style={styles.settingHint}>
              실제 배포 API를 쓰려면 `EXPO_PUBLIC_API_BASE_URL`을 Vercel 주소로 설정하세요.
            </Text>
          </View>
        </View>
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
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 120,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  appName: {
    ...typography.title,
    color: colors.text,
  },
  appDescription: {
    ...typography.body,
    color: colors.subtleText,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  settingRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  settingCopy: {
    flex: 1,
    gap: 3,
  },
  settingLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  settingHint: {
    color: colors.subtleText,
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  apiText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
});
