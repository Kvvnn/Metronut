/**
 * Divider — iOS 스타일 헤어라인 구분선. inset 으로 좌측 들여쓰기(리스트 행 구분).
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/lib/theme';

export function Divider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.line, inset > 0 && { marginLeft: inset }, style]} />;
}

const styles = StyleSheet.create({
  line: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
  },
});
