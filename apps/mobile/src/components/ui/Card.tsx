/**
 * Card — 웹 `.ios-card` 대응. 흰 표면 + 1px 보더 + iOS 카드 그림자 + 둥근 모서리.
 */
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { cardShadow, radii, spacing, type Palette } from '@/lib/theme';
import { useThemedStyles } from '@/lib/theme-context';

export type CardProps = ViewProps & {
  style?: StyleProp<ViewStyle>;
  /** 내부 패딩 적용 (기본 true). */
  padded?: boolean;
  /** 그림자 제거(평면 카드). */
  flat?: boolean;
};

export function Card({ style, padded = true, flat = false, children, ...rest }: CardProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      {...rest}
      style={[styles.card, padded && styles.padded, !flat && cardShadow, style]}>
      {children}
    </View>
  );
}

const makeStyles = (palette: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radii.lg,
      borderWidth: 1,
    },
    padded: {
      padding: spacing.md,
    },
  });
