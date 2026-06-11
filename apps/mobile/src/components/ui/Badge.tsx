/**
 * Badge — pill 형태의 작은 라벨(환승/소요/패턴 등). 색 변형과 임의 색상 지원.
 */
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii } from '@/lib/theme';

type BadgeTone = 'neutral' | 'accent' | 'green' | 'orange' | 'red' | 'purple';

const toneColor: Record<BadgeTone, string> = {
  neutral: colors.subtleText,
  accent: colors.accent,
  green: colors.green,
  orange: colors.orange,
  red: colors.red,
  purple: colors.purple,
};

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  /** tone 대신 직접 색 지정(노선 색 등). */
  color?: string;
  /** 채움(solid) vs 옅은 배경(soft). 기본 soft. */
  solid?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Badge({ label, tone = 'neutral', color, solid = false, style }: BadgeProps) {
  const base = color ?? toneColor[tone];
  return (
    <View
      style={[
        styles.badge,
        solid ? { backgroundColor: base } : { backgroundColor: `${base}1A` },
        style,
      ]}>
      <Text style={[styles.text, { color: solid ? colors.surface : base }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
  },
});
