/**
 * Divider — iOS 스타일 헤어라인 구분선. inset 으로 좌측 들여쓰기(리스트 행 구분).
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { type Palette } from '@/lib/theme';
import { useThemedStyles } from '@/lib/theme-context';

export function Divider({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.line, inset > 0 && { marginLeft: inset }, style]} />;
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    line: {
      backgroundColor: palette.border,
      height: StyleSheet.hairlineWidth,
    },
  });
