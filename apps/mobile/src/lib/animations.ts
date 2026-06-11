/**
 * 등장 애니메이션 헬퍼 — 웹 framer-motion ease `[0.23, 1, 0.32, 1]`(ease-out-expo) 대응.
 *
 * 웹에서 카드/시트가 fade + slide-up 으로 등장하는 모션을 reanimated layout 애니메이션으로 옮긴다.
 *   <Animated.View entering={slideUp(stagger(i))} />
 */
import { Easing, FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

/** 웹 --ease-out-expo. */
export const easeOutExpo = Easing.bezier(0.23, 1, 0.32, 1);
/** 웹 --ease-in-out-smooth. */
export const easeInOutSmooth = Easing.bezier(0.77, 0, 0.175, 1);

/** 페이드 인. */
export function fadeIn(delay = 0, duration = 320) {
  return FadeIn.delay(delay).duration(duration).easing(easeOutExpo);
}

/** 아래에서 위로 슬라이드 + 페이드 (웹 slide-up 카드 등장). */
export function slideUp(delay = 0, duration = 420) {
  return FadeInDown.delay(delay).duration(duration).easing(easeOutExpo);
}

/** 위에서 아래로 슬라이드 + 페이드 (웹 상단 검색카드 y:-20→0 등장). */
export function slideDown(delay = 0, duration = 400) {
  return FadeInUp.delay(delay).duration(duration).easing(easeOutExpo);
}

/** 스태거 지연 계산 — 리스트 i 번째 항목의 delay(ms). */
export function stagger(index: number, step = 60, start = 0) {
  return start + index * step;
}
