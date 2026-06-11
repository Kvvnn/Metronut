import AsyncStorage from '@react-native-async-storage/async-storage';

export type PreferredRouteKind = 'fastest' | 'fewest' | 'least-walk';

export interface AppPreferences {
  alarmSound: boolean;
  alarmVibrate: boolean;
  /** 하차 알림 기본 시점(정거장 수) */
  defaultAlarmBefore: 1 | 2 | 3;
  preferredRoute: PreferredRouteKind;
}

export const APP_PREFERENCES_KEY = 'metro_app_preferences';

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  alarmSound: true,
  alarmVibrate: true,
  defaultAlarmBefore: 1,
  preferredRoute: 'fastest',
};

function sanitizePreferences(value: unknown): AppPreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_APP_PREFERENCES };

  const raw = value as Partial<AppPreferences>;
  return {
    alarmSound:
      typeof raw.alarmSound === 'boolean' ? raw.alarmSound : DEFAULT_APP_PREFERENCES.alarmSound,
    alarmVibrate:
      typeof raw.alarmVibrate === 'boolean'
        ? raw.alarmVibrate
        : DEFAULT_APP_PREFERENCES.alarmVibrate,
    defaultAlarmBefore:
      raw.defaultAlarmBefore === 1 || raw.defaultAlarmBefore === 2 || raw.defaultAlarmBefore === 3
        ? raw.defaultAlarmBefore
        : DEFAULT_APP_PREFERENCES.defaultAlarmBefore,
    preferredRoute:
      raw.preferredRoute === 'fastest' ||
      raw.preferredRoute === 'fewest' ||
      raw.preferredRoute === 'least-walk'
        ? raw.preferredRoute
        : DEFAULT_APP_PREFERENCES.preferredRoute,
  };
}

export async function getAppPreferences(): Promise<AppPreferences> {
  try {
    const raw = await AsyncStorage.getItem(APP_PREFERENCES_KEY);
    if (!raw) return { ...DEFAULT_APP_PREFERENCES };
    return sanitizePreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_APP_PREFERENCES };
  }
}

export async function updateAppPreferences(patch: Partial<AppPreferences>) {
  const current = await getAppPreferences();
  const next = sanitizePreferences({ ...current, ...patch });
  await AsyncStorage.setItem(APP_PREFERENCES_KEY, JSON.stringify(next));
  return next;
}
