import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

async function runHaptic(effect: () => Promise<void>) {
  if (Platform.OS === 'web') return;

  try {
    await effect();
  } catch {
    // Haptics can be unavailable on some simulators/devices.
  }
}

export function selectionHaptic() {
  void runHaptic(() => Haptics.selectionAsync());
}

export function impactHaptic(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  void runHaptic(() => Haptics.impactAsync(style));
}

export function successHaptic() {
  void runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warningHaptic() {
  void runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
