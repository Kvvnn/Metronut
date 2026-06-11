/**
 * 메트로넛 모바일 디자인 토큰.
 * 웹(client) iOS 스타일 룩과 시각적으로 일치시킨다:
 *   - near-white 배경 + 흰색 카드
 *   - 네이비 텍스트(#1B2838), iOS 그레이(#8E8E93)
 *   - 파랑 액센트(#4A90D9), 네이비 primary 버튼
 */
export const colors = {
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

export const typography = {
  display: {
    fontSize: 30,
    fontWeight: '800' as const,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    lineHeight: 19,
  },
} as const;
