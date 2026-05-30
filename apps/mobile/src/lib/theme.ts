export const colors = {
  background: '#F7F4ED',
  surface: '#FFFFFF',
  text: '#181A1F',
  subtleText: '#59625C',
  muted: '#8A928C',
  border: '#E5DED0',
  green: '#0B6B56',
  blue: '#2B77D9',
  red: '#CF3D3D',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 8,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 34,
    fontWeight: '900' as const,
    lineHeight: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '900' as const,
    lineHeight: 32,
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
