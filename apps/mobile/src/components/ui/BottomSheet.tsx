/**
 * BottomSheet — 실제 드래그 제스처로 collapse/expand 되는 공통 하단 시트.
 *
 * react-native-gesture-handler 의 Pan + reanimated spring 으로 구현.
 * - 핸들바를 잡거나 시트 본문을 끌어 높이를 조절
 * - 손을 떼면 속도/위치 기준으로 가까운 스냅으로 흡착
 * - `expanded` 로 외부 제어, `onChange` 로 상태 통지 (controlled / uncontrolled 모두 지원)
 *
 * 시트 자체 높이는 항상 expandedHeight 이고, collapsed 상태에서는 translateY 로 아래로 밀어
 * collapsedHeight 만큼만 노출한다.
 */
import { useCallback, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { cardShadow, colors, radii, spacing } from '@/lib/theme';

const SPRING = { damping: 20, stiffness: 220, mass: 0.7 } as const;

export type BottomSheetProps = {
  /** 펼친 상태에서 노출할 높이(px). */
  expandedHeight: number;
  /** 접힌 상태에서 노출할 높이(px). 0 이면 완전히 숨김. */
  collapsedHeight?: number;
  /** 외부 제어값 (controlled). */
  expanded?: boolean;
  /** 초기 상태 (uncontrolled). */
  defaultExpanded?: boolean;
  /** 상태 변경 통지. */
  onChange?: (expanded: boolean) => void;
  /** 핸들바 표시 여부. */
  showHandle?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function BottomSheet({
  expandedHeight,
  collapsedHeight = 0,
  expanded,
  defaultExpanded = false,
  onChange,
  showHandle = true,
  style,
  children,
}: BottomSheetProps) {
  /** collapsed 일 때 아래로 내려야 하는 거리. */
  const collapsedOffset = Math.max(0, expandedHeight - collapsedHeight);

  const isExpanded = expanded ?? defaultExpanded;
  const translateY = useSharedValue(isExpanded ? 0 : collapsedOffset);
  const startY = useSharedValue(0);

  const snapTo = useCallback(
    (next: boolean) => {
      translateY.value = withSpring(next ? 0 : collapsedOffset, SPRING);
      onChange?.(next);
    },
    [collapsedOffset, onChange, translateY],
  );

  // 외부 expanded 변경에 반응 (controlled).
  useEffect(() => {
    if (expanded === undefined) return;
    translateY.value = withSpring(expanded ? 0 : collapsedOffset, SPRING);
  }, [expanded, collapsedOffset, translateY]);

  const pan = Gesture.Pan()
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = startY.value + e.translationY;
      translateY.value = Math.min(Math.max(next, 0), collapsedOffset);
    })
    .onEnd((e) => {
      // 속도가 충분하면 방향대로, 아니면 위치 기준 가까운 스냅으로.
      const goingDown = e.velocityY > 400;
      const goingUp = e.velocityY < -400;
      const past = translateY.value > collapsedOffset / 2;
      const next = goingUp ? true : goingDown ? false : !past;
      translateY.value = withSpring(next ? 0 : collapsedOffset, SPRING);
      runOnJS(snapTo)(next);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.sheet, { height: expandedHeight }, animatedStyle, style]}>
        {showHandle && (
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
        )}
        <View style={styles.body}>{children}</View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg + 4,
    borderTopRightRadius: radii.lg + 4,
    ...cardShadow,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
  },
  handleArea: {
    alignItems: 'center',
    paddingBottom: spacing.xs,
    paddingTop: spacing.sm,
  },
  handle: {
    backgroundColor: colors.muted,
    borderRadius: radii.pill,
    height: 5,
    width: 40,
  },
  body: {
    flex: 1,
  },
});
