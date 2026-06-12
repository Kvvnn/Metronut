/**
 * 메트로넛 모바일 디자인 토큰.
 * 웹(client) iOS 스타일 룩과 시각적으로 일치시킨다:
 *   - near-white 배경 + 흰색 카드
 *   - 네이비 텍스트(#1B2838), iOS 그레이(#8E8E93)
 *   - 파랑 액센트(#4A90D9), 네이비 primary 버튼
 */
/**
 * 라이트 팔레트 — 기존 값 그대로(웹 iOS 쿨톤). 라이트 모드는 변화 없음.
 */
export const lightPalette = {
  /** 페이지 배경 (웹 bg-background, 쿨 라이트그레이로 카드 대비) */
  background: '#F4F5F7',
  /** 카드/시트 표면 */
  surface: '#FFFFFF',
  /** 인셋 채움/세그먼트 트랙 (웹 #F5F5F7) */
  surfaceAlt: '#F0F1F4',
  /** 본문 네이비 (웹 #1B2838) */
  text: '#1B2838',
  /** 보조 텍스트 iOS 그레이 (웹 #8E8E93) */
  subtleText: '#8E8E93',
  /** 더 옅은 그레이 — chevron 등 (웹 #C7C7CC) */
  muted: '#C2C5CC',
  /** 카드 보더/구분선 (웹 #F0F0F2) */
  border: '#E9EAEE',
  /** 주요 액센트 — 파랑 (웹 #4A90D9) */
  accent: '#4A90D9',
  /** primary 버튼/강조 — 네이비 (웹 #1B2838) */
  primary: '#1B2838',
  /** 성공/출발역 그린 (웹 #27AE60) */
  green: '#27AE60',
  /** 파랑 (accent 별칭, 기존 코드 호환) */
  blue: '#4A90D9',
  /** 경고/도착역 레드 (웹 #E74C3C) */
  red: '#E74C3C',
  /** 환승/도보 오렌지 (웹 #E67E22) */
  orange: '#E67E22',
  /** 보조 퍼플 (웹 #7C5CFF) */
  purple: '#7C5CFF',
} as const;

export type Palette = { [K in keyof typeof lightPalette]: string };

/**
 * 다크 팔레트 — 웹 `.dark` 톤을 참고한 딥네이비 계열.
 * 중립색(배경/표면/텍스트/보더)은 어둡게, 의미색(파랑/그린/레드/오렌지/퍼플)은
 * 다크 배경 대비를 위해 살짝 밝게. primary 는 네이비 대신 액센트 블루(버튼 대비 확보).
 */
export const darkPalette: Palette = {
  background: '#0F1318',
  surface: '#1A1F26',
  surfaceAlt: '#232A33',
  text: '#F2F4F7',
  subtleText: '#9CA3AD',
  muted: '#5C636D',
  border: '#2B323C',
  accent: '#5B9BE0',
  primary: '#4A90D9',
  green: '#2ECC71',
  blue: '#5B9BE0',
  red: '#FF6B5E',
  orange: '#E8924A',
  purple: '#9B82FF',
};

/** 기존 코드 호환용 정적 라이트 팔레트(모듈 레벨 상수 등에서 사용). */
export const colors = lightPalette;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

/** iOS 카드 그림자 (웹 .ios-card box-shadow 근사) */
export const cardShadow = {
  shadowColor: '#1B2838',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

// 웹(client) 폰트 스케일에 맞춰 전반적으로 한 단계 낮춤.
export const typography = {
  display: {
    fontSize: 26,
    fontWeight: '800' as const,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800' as const,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
  },
} as const;
