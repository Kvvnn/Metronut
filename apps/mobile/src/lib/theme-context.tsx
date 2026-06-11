/**
 * 테마 컨텍스트 — 라이트/다크 팔레트 + 시스템 연동 + 설정 저장.
 *
 * - preference: 'system' | 'light' | 'dark' (사용자 선택, AsyncStorage 저장)
 * - scheme: 실제 적용 스킴(시스템 선택 시 OS 설정 추종)
 * - palette: 화면에서 쓸 색 팔레트
 * - useThemedStyles(makeStyles): 팔레트 기반 StyleSheet 를 메모해 반환
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, StyleSheet } from 'react-native';

import { darkPalette, lightPalette, type Palette } from './theme';

export type ThemeScheme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'metronut.theme.preference';

interface ThemeValue {
  preference: ThemePreference;
  scheme: ThemeScheme;
  palette: Palette;
  setPreference: (preference: ThemePreference) => void;
  /** 다크 토글 편의용. */
  toggleDark: () => void;
}

const FALLBACK: ThemeValue = {
  preference: 'system',
  scheme: 'light',
  palette: lightPalette,
  setPreference: () => {},
  toggleDark: () => {},
};

const ThemeContext = createContext<ThemeValue | null>(null);

function normalizeScheme(value: string | null | undefined): ThemeScheme {
  return value === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<ThemeScheme>(
    normalizeScheme(Appearance.getColorScheme()),
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(normalizeScheme(colorScheme));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'light' || value === 'dark' || value === 'system') {
        setPreferenceState(value);
      }
    });
  }, []);

  const scheme: ThemeScheme = preference === 'system' ? systemScheme : preference;
  const palette = scheme === 'dark' ? darkPalette : lightPalette;

  const value = useMemo<ThemeValue>(() => {
    const setPreference = (next: ThemePreference) => {
      setPreferenceState(next);
      void AsyncStorage.setItem(STORAGE_KEY, next);
    };
    return {
      preference,
      scheme,
      palette,
      setPreference,
      toggleDark: () => setPreference(scheme === 'dark' ? 'light' : 'dark'),
    };
  }, [preference, scheme, palette]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext) ?? FALLBACK;
}

/** 팔레트가 바뀔 때만 StyleSheet 를 재생성하는 헬퍼. */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (palette: Palette) => T,
): T {
  const { palette } = useTheme();
  return useMemo(() => StyleSheet.create(factory(palette)), [factory, palette]);
}
