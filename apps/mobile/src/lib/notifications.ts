import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getAppPreferences } from '@/lib/appPreferences';

export const RIDING_CHANNEL_ID = 'riding-alerts';

let initialized = false;

/**
 * 앱 전역 알림 초기화. 루트 레이아웃에서 한 번 호출한다.
 * - 포그라운드에서도 배너로 표시 (탑승 중 화면을 보고 있어도 알림 확인 가능)
 * - 소리 여부는 사용자 설정(알림 소리)을 따른다.
 */
export function initializeNotifications() {
  if (initialized) return;
  initialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const preferences = await getAppPreferences();
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: preferences.alarmSound,
        shouldSetBadge: false,
      };
    },
  });

  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(RIDING_CHANNEL_ID, {
      name: '탑승 안내 알림',
      description: '하차 임박, 환승 임박 등 탑승 중 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2B77D9',
    });
  }
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

/** 현재 알림 권한 상태 (요청하지 않고 조회만). */
export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  return current.canAskAgain ? 'undetermined' : 'denied';
}

/** 알림 권한을 확보한다. 거부 상태면 false. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * 탑승 안내 즉시 알림. 사용자 설정의 소리/진동을 반영한다.
 * 권한이 없으면 조용히 무시한다 (화면 내 표시가 폴백).
 */
export async function sendRidingAlert(title: string, body: string) {
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;

    const preferences = await getAppPreferences();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: preferences.alarmSound ? 'default' : undefined,
        vibrate: preferences.alarmVibrate ? [0, 250, 250, 250] : undefined,
      },
      // Android는 채널을 trigger로 지정해야 한다 (즉시 발송 유지).
      trigger: Platform.OS === 'android' ? { channelId: RIDING_CHANNEL_ID } : null,
    });
  } catch {
    // 알림 실패는 탑승 안내 자체를 막지 않는다.
  }
}
