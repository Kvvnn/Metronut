/**
 * Pretendard 폰트 — 웹(client)과 동일 서체.
 *
 * 웹은 `--font-sans: "Pretendard Variable"` 를 쓴다. RN 은 fontFamily 와 fontWeight 를
 * 웹처럼 합성하지 못하므로, 각 굵기를 별도 패밀리로 등록하고 weight → family 로 매핑한다.
 * 전역 적용은 `apply-global-font.ts` 가 Text/TextInput 의 fontWeight 를 읽어 자동 치환한다.
 */
import type { TextStyle } from 'react-native';

/** expo-font `useFonts` 에 넘길 자산 맵. 키가 fontFamily 이름이 된다. */
export const fontAssets = {
  'Pretendard-Regular': require('@/assets/fonts/Pretendard-Regular.otf'),
  'Pretendard-Medium': require('@/assets/fonts/Pretendard-Medium.otf'),
  'Pretendard-SemiBold': require('@/assets/fonts/Pretendard-SemiBold.otf'),
  'Pretendard-Bold': require('@/assets/fonts/Pretendard-Bold.otf'),
  'Pretendard-ExtraBold': require('@/assets/fonts/Pretendard-ExtraBold.otf'),
  'Pretendard-Black': require('@/assets/fonts/Pretendard-Black.otf'),
} as const;

export type PretendardFamily = keyof typeof fontAssets;

/** RN fontWeight → 등록된 Pretendard 패밀리 이름. */
export function weightToFamily(weight: TextStyle['fontWeight'] | undefined): PretendardFamily {
  switch (weight) {
    case 900:
    case '900':
      return 'Pretendard-Black';
    case 800:
    case '800':
      return 'Pretendard-ExtraBold';
    case 700:
    case '700':
    case 'bold':
      return 'Pretendard-Bold';
    case 600:
    case '600':
      return 'Pretendard-SemiBold';
    case 500:
    case '500':
      return 'Pretendard-Medium';
    default:
      return 'Pretendard-Regular';
  }
}

/** 명시적으로 패밀리를 지정하고 싶은 컴포넌트용 헬퍼. */
export function font(weight: TextStyle['fontWeight'] = 'normal'): { fontFamily: PretendardFamily } {
  return { fontFamily: weightToFamily(weight) };
}
