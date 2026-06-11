/**
 * FloatingView — 웹 `.space-float` 무중력 부유. 천천히 translateY(-5px)+0.6° 회전 yoyo 반복.
 * prefers-reduced-motion 이면 정지. `cycle` 은 0→-5→0 전체 한 주기(ms).
 */
import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export function FloatingView({
  cycle = 5500,
  delay = 0,
  style,
  children,
}: {
  cycle?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const t = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      t.value = 0;
      return;
    }
    // withRepeat(reverse=true) 는 0→1→0 으로 왕복하므로 half-cycle 만 지정.
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: cycle / 2, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, [cycle, delay, reduced, t]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -5 * t.value }, { rotate: `${0.6 * t.value}deg` }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
