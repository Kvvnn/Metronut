import AsyncStorage from '@react-native-async-storage/async-storage';

export const USE_SIMULATED_TRAIN_DATA_KEY = 'metro_use_simulated_train_data';

export async function getUseSimulatedTrainData() {
  try {
    return (await AsyncStorage.getItem(USE_SIMULATED_TRAIN_DATA_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function setUseSimulatedTrainData(enabled: boolean) {
  await AsyncStorage.setItem(USE_SIMULATED_TRAIN_DATA_KEY, enabled ? 'true' : 'false');
}
