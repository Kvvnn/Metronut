/**
 * VoyageTrack (RN 이식) — 탑승 진행률을 "캡슐이 목적지 행성으로 다가가는 항해"로 그린다.
 *
 * 웹 SVG/framer-motion 버전을 View + reanimated 로 옮겼다.
 * - 궤도선(점선) + 지나온/남은 역 점
 * - 목적지 행성(고리 + 글로우, 도착 임박 시 맥동)
 * - 캡슐(노선색 엔진 글로우/스트라이프, 무중력 부유, 진행률 위치로 스프링 이동)
 * prefers-reduced-motion 이면 부유/맥동 정지.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const TRACK_HEIGHT = 72;
const CAPSULE_W = 44;
const CAPSULE_H = 26;

export function VoyageTrack({
  progress,
  stationCount,
  currentIndex,
  remaining,
  lineColor,
  moving = true,
}: {
  progress: number;
  stationCount: number;
  currentIndex: number;
  remaining: number;
  lineColor: string;
  moving?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, progress));
  const capsulePct = 6 + clamped * 82; // 6%~88% 유효 범위
  const arrivingSoon = remaining <= 1;
  const planetSize = 18 + (1 - Math.min(1, remaining / Math.max(1, stationCount - 1))) * 10;

  const capsuleX = useSharedValue(0);
  const bob = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (width === 0) return;
    capsuleX.value = withSpring((capsulePct / 100) * width, { stiffness: 50, damping: 16, mass: 1 });
  }, [capsulePct, width, capsuleX]);

  useEffect(() => {
    if (reduced) {
      bob.value = 0;
      pulse.value = 0;
      return;
    }
    bob.value = withRepeat(
      withTiming(1, { duration: moving ? 1700 : 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: arrivingSoon ? 700 : 2600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [reduced, moving, arrivingSoon, bob, pulse]);

  const capsuleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: capsuleX.value - CAPSULE_W / 2 },
      { translateY: (moving ? -8 : -4) * bob.value },
      { rotate: `${(moving ? 2.5 : 1) * (bob.value * 2 - 1)}deg` },
    ],
  }));

  const planetStyle = useAnimatedStyle(() =>
    arrivingSoon
      ? { transform: [{ scale: 1 + 0.12 * pulse.value }] }
      : { transform: [{ translateY: -4 * (pulse.value * 2 - 1) }] },
  );

  const dots = Array.from({ length: stationCount }, (_, i) => i).filter((i) => i !== stationCount - 1);

  return (
    <View style={styles.track} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} pointerEvents="none">
      <View style={styles.orbit} />

      {dots.map((i) => {
        const left = 6 + (i / Math.max(1, stationCount - 1)) * 82;
        const passed = i <= currentIndex;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              { left: `${left}%`, backgroundColor: passed ? lineColor : '#FFFFFF', opacity: passed ? 0.28 : 0.55 },
            ]}
          />
        );
      })}

      {/* 목적지 행성 */}
      <Animated.View
        style={[
          styles.planetWrap,
          planetStyle,
          { width: planetSize, height: planetSize, marginLeft: -planetSize / 2, marginTop: -planetSize / 2 },
        ]}
      >
        <View
          style={{
            width: planetSize,
            height: planetSize,
            borderRadius: planetSize / 2,
            backgroundColor: lineColor,
            shadowColor: lineColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.66,
            shadowRadius: arrivingSoon ? 12 : 7,
            elevation: 6,
          }}
        />
        <View
          style={[
            styles.ring,
            {
              width: planetSize * 1.9,
              height: planetSize * 0.6,
              borderRadius: planetSize,
              marginLeft: -(planetSize * 1.9) / 2,
              marginTop: -(planetSize * 0.6) / 2,
            },
          ]}
        />
      </Animated.View>

      {/* 캡슐 */}
      {width > 0 ? (
        <Animated.View style={[styles.capsule, capsuleStyle]}>
          <View style={[styles.engineGlow, { backgroundColor: lineColor }]} />
          <View style={styles.capsuleBody}>
            <View style={[styles.capsuleStripe, { backgroundColor: lineColor }]} />
            <View style={styles.capsuleWindow} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    width: '100%',
  },
  orbit: {
    borderColor: 'rgba(255,255,255,0.18)',
    borderStyle: 'dashed',
    borderTopWidth: 1,
    left: '4%',
    marginTop: -0.5,
    position: 'absolute',
    right: '4%',
    top: '50%',
  },
  dot: {
    borderRadius: 3,
    height: 5,
    marginLeft: -2.5,
    marginTop: -2.5,
    position: 'absolute',
    top: '50%',
    width: 5,
  },
  planetWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    left: '94%',
    position: 'absolute',
    top: '50%',
  },
  ring: {
    borderColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    left: '50%',
    position: 'absolute',
    top: '50%',
    transform: [{ rotate: '-18deg' }],
  },
  capsule: {
    alignItems: 'center',
    flexDirection: 'row',
    height: CAPSULE_H,
    left: 0,
    marginTop: -CAPSULE_H / 2,
    position: 'absolute',
    top: '50%',
    width: CAPSULE_W,
  },
  engineGlow: {
    borderRadius: 6,
    height: 8,
    marginRight: -2,
    opacity: 0.45,
    width: 12,
  },
  capsuleBody: {
    alignItems: 'center',
    backgroundColor: '#E9EEF8',
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 16,
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    width: 33,
  },
  capsuleStripe: {
    borderRadius: 4,
    height: 8,
    width: 10,
  },
  capsuleWindow: {
    backgroundColor: '#0B1026',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
});
