/**
 * Starfield (RN 이식) — 웹 캔버스 별 필드의 모바일 버전.
 *
 * 캔버스 대신 reanimated 로 별 레이어를 가로로 무한 스크롤(translate-loop)해 "별 흐름"을 만든다.
 * 레이어를 2벌 잇대어 끝에서 끊김 없이 반복한다. prefers-reduced-motion 이면 정지(정적 별).
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const DRIFT_PX_PER_SEC = 26;

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

function seedStars(width: number, height: number, density: number): Star[] {
  const count = Math.max(1, Math.round(((width * height) / 1000) * density));
  const stars: Star[] = [];
  for (let i = 0; i < count; i += 1) {
    const depth = 0.25 + Math.random() * 0.75;
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: (0.4 + Math.random() * 1.0) * (0.5 + depth * 0.7),
      alpha: Math.min(1, 0.25 + depth * 0.55 * Math.random() + 0.2),
    });
  }
  return stars;
}

export function Starfield({
  speed = 0.4,
  density = 0.18,
  style,
}: {
  /** 별 흐름 속도 배율. 기본 0.4. */
  speed?: number;
  /** 1000px²당 별 개수. 기본 0.18. */
  density?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const reduced = useReducedMotion();
  const tx = useSharedValue(0);

  const stars = useMemo(
    () => (size.w > 0 ? seedStars(size.w, size.h, density) : []),
    [size.w, size.h, density],
  );

  useEffect(() => {
    if (reduced || size.w === 0) {
      tx.value = 0;
      return;
    }
    const duration = Math.max(2000, (size.w / (DRIFT_PX_PER_SEC * Math.max(0.05, speed))) * 1000);
    tx.value = 0;
    tx.value = withRepeat(withTiming(-size.w, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(tx);
  }, [reduced, size.w, size.h, speed, tx]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip, style]} onLayout={onLayout} pointerEvents="none">
      {size.w > 0 ? (
        <Animated.View style={[styles.layerRow, { width: size.w * 2 }, animatedStyle]}>
          {[0, 1].map((copy) => (
            <View key={copy} style={{ width: size.w, height: size.h }}>
              {stars.map((star, index) => (
                <View
                  key={index}
                  style={{
                    position: 'absolute',
                    left: star.x,
                    top: star.y,
                    width: star.r * 2,
                    height: star.r * 2,
                    borderRadius: star.r,
                    backgroundColor: '#FFFFFF',
                    opacity: star.alpha,
                  }}
                />
              ))}
            </View>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  layerRow: {
    flexDirection: 'row',
    height: '100%',
  },
});
