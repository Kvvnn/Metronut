import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FastTransferInfo } from '@shared/fastTransfer';

export interface RidingRideSegment {
  type: 'ride';
  lineId: string;
  lineName: string;
  direction: string;
  patternLabel?: string;
  patternTerminus?: string;
  fromStationName: string;
  toStationName: string;
  stationNames: string[];
}

export interface RidingTransferSegment {
  type: 'transfer';
  stationName: string;
  fromLineId: string;
  toLineId: string;
  toLineName: string;
  toDirection: string;
  walkMinutes: number;
  walkSeconds?: number;
  walkDistanceMeters?: number;
  fastTransfer?: FastTransferInfo | null;
}

export type RidingRouteSegment = RidingRideSegment | RidingTransferSegment;

export interface RidingRoutePayload {
  segments: RidingRouteSegment[];
  overallFromStation: string;
  overallToStation: string;
  savedAt: number;
}

export interface RidingSessionState {
  routeSavedAt: number;
  currentSegmentIndex: number;
  currentStationIndex: number;
  selectedTrainNo: string | null;
  alarmEnabled: boolean;
  alarmBefore: number;
}

const RIDING_ROUTE_KEY = 'riding_route';
const RIDING_SESSION_STATE_KEY = 'riding_session_state';

function isRideSegment(value: unknown): value is RidingRideSegment {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as RidingRideSegment).type === 'ride' &&
    typeof (value as RidingRideSegment).lineId === 'string' &&
    typeof (value as RidingRideSegment).lineName === 'string' &&
    typeof (value as RidingRideSegment).fromStationName === 'string' &&
    typeof (value as RidingRideSegment).toStationName === 'string' &&
    Array.isArray((value as RidingRideSegment).stationNames)
  );
}

function isTransferSegment(value: unknown): value is RidingTransferSegment {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as RidingTransferSegment).type === 'transfer' &&
    typeof (value as RidingTransferSegment).stationName === 'string' &&
    typeof (value as RidingTransferSegment).toLineId === 'string'
  );
}

function isRidingRoutePayload(value: unknown): value is RidingRoutePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as RidingRoutePayload).segments) &&
    (value as RidingRoutePayload).segments.every((segment) => isRideSegment(segment) || isTransferSegment(segment)) &&
    typeof (value as RidingRoutePayload).overallFromStation === 'string' &&
    typeof (value as RidingRoutePayload).overallToStation === 'string' &&
    typeof (value as RidingRoutePayload).savedAt === 'number'
  );
}

function isRidingSessionState(value: unknown): value is RidingSessionState {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RidingSessionState).routeSavedAt === 'number' &&
    typeof (value as RidingSessionState).currentSegmentIndex === 'number' &&
    typeof (value as RidingSessionState).currentStationIndex === 'number' &&
    typeof (value as RidingSessionState).alarmEnabled === 'boolean' &&
    typeof (value as RidingSessionState).alarmBefore === 'number'
  );
}

export async function saveRidingRoute(payload: RidingRoutePayload) {
  await AsyncStorage.setItem(RIDING_ROUTE_KEY, JSON.stringify(payload));
  await AsyncStorage.removeItem(RIDING_SESSION_STATE_KEY);
}

export async function getRidingRoute() {
  try {
    const raw = await AsyncStorage.getItem(RIDING_ROUTE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return isRidingRoutePayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearRidingRoute() {
  await AsyncStorage.multiRemove([RIDING_ROUTE_KEY, RIDING_SESSION_STATE_KEY]);
}

export async function saveRidingSessionState(state: RidingSessionState) {
  await AsyncStorage.setItem(RIDING_SESSION_STATE_KEY, JSON.stringify(state));
}

export async function getRidingSessionState(routeSavedAt: number) {
  try {
    const raw = await AsyncStorage.getItem(RIDING_SESSION_STATE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRidingSessionState(parsed)) return null;
    return parsed.routeSavedAt === routeSavedAt ? parsed : null;
  } catch {
    return null;
  }
}
