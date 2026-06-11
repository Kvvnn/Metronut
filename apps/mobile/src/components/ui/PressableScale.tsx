/**
 * PressableScale — 웹 `.btn-press` 대응.
 * 누르면 scale 0.97 로 줄었다가(ease-out-expo) 떼면 원복. 햅틱은 옵션.
 */
import { forwardRef } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { selectionHaptic } from '@/lib/haptics';
import { easeOutExpo } from '@/lib/animations';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** 눌렀을 때 목표 스케일 (기본 0.97, 웹과 동일). */
  scaleTo?: number;
  /** 누름 시작에 선택 햅틱. */
  haptic?: boolean;
};

export const PressableScale = forwardRef<typeof AnimatedPressable, PressableScaleProps>(
  function PressableScale(
    { style, scaleTo = 0.97, haptic = false, onPressIn, onPressOut, ...rest },
    _ref,
  ) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <AnimatedPressable
        {...rest}
        onPressIn={(e) => {
          scale.value = withTiming(scaleTo, { duration: 100, easing: easeOutExpo });
          if (haptic) selectionHaptic();
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withTiming(1, { duration: 180, easing: easeOutExpo });
          onPressOut?.(e);
        }}
        style={[animatedStyle, style]}
      />
    );
  },
);
