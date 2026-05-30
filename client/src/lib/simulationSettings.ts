export const USE_SIMULATED_TRAIN_DATA_KEY = "metro_use_simulated_train_data";
export const SIMULATION_SETTING_CHANGED_EVENT = "metro:simulation-setting-changed";

export function getUseSimulatedTrainData() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(USE_SIMULATED_TRAIN_DATA_KEY) === "true";
}

export function setUseSimulatedTrainData(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USE_SIMULATED_TRAIN_DATA_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new Event(SIMULATION_SETTING_CHANGED_EVENT));
}
