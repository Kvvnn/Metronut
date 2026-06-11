/**
 * 탑승 안내(Riding) 화면의 실시간 열차 위치 해석 로직.
 * 웹(client/src/pages/Riding.tsx)과 모바일(apps/mobile/src/app/riding.tsx)이 함께 사용한다.
 */
import { getBaseLineId, getStationsByLine, type Station } from "./pathfinder";
import {
  getLastDepartureReaching,
  getScheduleDayType,
  hasServiceSchedule,
  toServiceMinute,
} from "./serviceSchedule";

/** 서버 metroRouter.getTrainPositions 응답의 열차 한 대 분량과 호환되는 최소 형태 */
export interface RidingTrainPosition {
  trainNo: string;
  stationName: string;
  updnLine: string;
  trainStatus: string;
  destination: string;
  receivedAt: string;
  receivedAtEpochMs?: number;
  receivedAtAgeSeconds?: number;
  isStale?: boolean;
  trainType: string;
}

export interface TrainEnrichment {
  /** 진행 방향으로 정렬된 노선 내 위치 인덱스 (-1 = 노선 밖) */
  posIdxOriented: number;
  /** 종착역 기준으로 우리와 같은 방향인지 (null = 판단 불가) */
  sameDirection: boolean | null;
}

export type EnrichedTrain = RidingTrainPosition & TrainEnrichment;

export type TrainInactiveLevel = "none" | "soft" | "deep";

export interface OrientedStations {
  stations: Station[];
  fromIdx: number;
  toIdx: number;
  expectedUpdnLine: string | null;
}

// 가짜 열차 식별 prefix. 실데이터 API trainNo는 보통 4자리 숫자라 충돌 X.
export const SIM_TRAIN_PREFIX = "S";

export function isSimTrainNo(trainNo: string | null | undefined): boolean {
  return !!trainNo && trainNo.startsWith(SIM_TRAIN_PREFIX);
}

export function isCircularLineId(lineId: string | null | undefined) {
  return lineId === "2";
}

export function getForwardDistance(startIdx: number, endIdx: number, total: number) {
  if (startIdx < 0 || endIdx < 0 || total <= 0) return Number.POSITIVE_INFINITY;
  return (endIdx - startIdx + total) % total;
}

export function getExpectedUpdnLine(lineId: string, isReversed: boolean) {
  // 우이신설선 API는 북한산우이 -> 신설동 방향을 0으로 내려준다.
  if (lineId === "ui") return isReversed ? "1" : "0";
  return isReversed ? "0" : "1";
}

// "HH:MM"/"24:MM"(자정 이후) → 분. "24:30" = 1470.
export function parseClockToServiceMinute(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

// 현재 시각 기준, 이 노선·탑승역·진행방향의 막차가 이미 끊겼는지.
// 운행계통 스케줄(getLastDepartureReaching)로 "탑승역에서 도착역까지 실제로 가는 막차의
// 출발 시각(서비스분)"을 구해 비교한다. 시각을 문자열로 왕복하지 않아 자정 넘는 막차도
// 정확하다. 스케줄이 없거나 막차 정보가 없으면 막지 않는다(false).
export function isPastLastTrain(
  lineId: string,
  fromStationName: string,
  toStationName: string,
  now: Date,
): boolean {
  const baseLineId = getBaseLineId(lineId);
  if (!hasServiceSchedule(baseLineId)) return false;

  const lineStations = getStationsByLine(baseLineId);
  const fromStation = lineStations.find(s => s.name === fromStationName);
  const toStation = lineStations.find(s => s.name === toStationName);
  if (!fromStation || !toStation) return false;

  const lastDeparture = getLastDepartureReaching(
    baseLineId,
    fromStation.index,
    toStation.index,
    getScheduleDayType(now),
  );
  if (lastDeparture == null) return false;

  return toServiceMinute(now) > lastDeparture;
}

export function formatPositionAge(seconds: number | undefined): string {
  if (seconds === undefined || seconds < 0) return "몇 분";
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
}

// 노선 역들을 진행 방향 순서로 정렬하는 순수 함수.
// 현재 ride(orientedLineStations)와 "다음 환승 노선" 위치 계산에 함께 쓴다.
export function orientRideStations(
  lineId: string,
  fromStationName: string,
  toStationName: string,
  stationNames: string[],
): OrientedStations {
  const lineStations = getStationsByLine(lineId);
  const fromIdx = lineStations.findIndex(s => s.name === fromStationName);
  const toIdx = lineStations.findIndex(s => s.name === toStationName);
  if (fromIdx < 0) return { stations: lineStations, fromIdx, toIdx, expectedUpdnLine: null };

  // 인접 두 역으로 방향 결정 (실패 시 from→to 폴백)
  let isReversed: boolean | null = null;
  if (stationNames.length >= 2) {
    const a = lineStations.findIndex(s => s.name === stationNames[0]);
    const b = lineStations.findIndex(s => s.name === stationNames[1]);
    if (a >= 0 && b >= 0) isReversed = b < a;
  }
  if (isReversed === null && toIdx >= 0) isReversed = toIdx < fromIdx;
  if (isReversed === null) return { stations: lineStations, fromIdx, toIdx, expectedUpdnLine: null };

  const expectedUpdnLine = getExpectedUpdnLine(lineId, isReversed);
  if (!isReversed) return { stations: lineStations, fromIdx, toIdx, expectedUpdnLine };
  const reversed = [...lineStations].reverse();
  return {
    stations: reversed,
    fromIdx: reversed.findIndex(s => s.name === fromStationName),
    toIdx: toIdx >= 0 ? reversed.findIndex(s => s.name === toStationName) : -1,
    expectedUpdnLine,
  };
}

// API 위치 → 진행방향 인덱스가 붙은 EnrichedTrain.
export function enrichTrains<T extends RidingTrainPosition>(
  positions: T[],
  oriented: OrientedStations,
): (T & TrainEnrichment)[] {
  const stationIndex = new Map(oriented.stations.map((s, i) => [s.name, i]));
  return positions.map(p => {
    const posIdx = stationIndex.get(p.stationName) ?? -1;
    const destIdx = stationIndex.get(p.destination) ?? -1;
    const sameDirection = posIdx >= 0 && destIdx >= 0 ? destIdx > posIdx : null;
    return { ...p, posIdxOriented: posIdx, sameDirection };
  });
}

// 우리 진행 방향 열차만 남긴다 (선택된 열차는 무조건 통과).
export function filterSameDirectionTrains<T extends RidingTrainPosition & TrainEnrichment>(
  enriched: T[],
  oriented: OrientedStations,
  selectedNo: string | null,
): T[] {
  const { fromIdx, expectedUpdnLine } = oriented;
  if (fromIdx < 0) return enriched;
  return enriched.filter(t => {
    if (selectedNo && t.trainNo === selectedNo) return true;
    if (expectedUpdnLine && t.updnLine && t.updnLine !== expectedUpdnLine) return false;
    if (expectedUpdnLine && t.updnLine === expectedUpdnLine) return true;
    if (t.sameDirection === true) return true;
    return false;
  });
}

// 선택 식별자가 trainNo뿐이라, 번호가 없거나 중복된 열차가 목록에 들어오면
// 미리선택/선택 UI에서 "중복 표시 + 동시 선택" 버그가 난다.
// (서버 dedupeTrainPositions는 번호 없는 열차를 합치지 않고 전부 통과시킨다.)
// 번호 없는(추적 불가) 열차는 제외하고, 같은 번호는 하나로 합친다.
export function dedupeTrainsByNo<T extends RidingTrainPosition>(trains: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const t of trains) {
    if (!t.trainNo || seen.has(t.trainNo)) continue;
    seen.add(t.trainNo);
    result.push(t);
  }
  return result;
}

export function isDeepInactiveTrain(
  train: Pick<EnrichedTrain, "posIdxOriented" | "stationName">,
  routeStationSet: Set<string>,
  fromIdx: number,
  toIdx: number,
  totalStationCount: number,
  isCircular: boolean,
) {
  if (train.posIdxOriented < 0) return false;
  if (isCircular && fromIdx >= 0 && toIdx >= 0 && totalStationCount > 0) {
    if (routeStationSet.has(train.stationName)) return false;
    const routeDistance = getForwardDistance(fromIdx, toIdx, totalStationCount);
    const distanceFromStart = getForwardDistance(fromIdx, train.posIdxOriented, totalStationCount);
    const distanceToBoard = getForwardDistance(train.posIdxOriented, fromIdx, totalStationCount);
    // 순환선에서는 선형 인덱스 뒤쪽 역이 "출발역 직전"일 수 있다.
    // 출발역까지 남은 거리가 더 짧으면 탑승 후보(soft), 아니면 이미 도착역을 지난 후보(deep)로 본다.
    if (distanceFromStart <= routeDistance) return false;
    return distanceToBoard >= distanceFromStart;
  }
  const isPastDestination = toIdx >= 0 && train.posIdxOriented > toIdx;
  const isOffRouteBranchStop =
    fromIdx >= 0 && train.posIdxOriented >= fromIdx && !routeStationSet.has(train.stationName);
  return isPastDestination || isOffRouteBranchStop;
}

export function isBeforeBoardingStation(
  train: Pick<EnrichedTrain, "posIdxOriented" | "stationName">,
  routeStationSet: Set<string>,
  fromIdx: number,
  toIdx: number,
  totalStationCount: number,
  isCircular: boolean,
) {
  if (train.posIdxOriented < 0 || fromIdx < 0) return false;
  if (!isCircular) return train.posIdxOriented < fromIdx;
  if (routeStationSet.has(train.stationName)) return false;
  const distanceFromStart = getForwardDistance(fromIdx, train.posIdxOriented, totalStationCount);
  const distanceToBoard = getForwardDistance(train.posIdxOriented, fromIdx, totalStationCount);
  const routeDistance = getForwardDistance(fromIdx, toIdx, totalStationCount);
  return distanceFromStart > routeDistance && distanceToBoard < distanceFromStart;
}

/**
 * 시뮬레이션 모드용 가짜 열차 생성.
 * 노선 전체에 6대 분산 배치. 모두 우리 방향 (sameDirection: true).
 */
export function generateFakeTrains(
  lineStations: { name: string }[],
  updnLine: string,
): EnrichedTrain[] {
  if (lineStations.length === 0) return [];
  const lastIdx = lineStations.length - 1;
  const destination = lineStations[lastIdx]?.name ?? "";
  const COUNT = 6;
  const trains: EnrichedTrain[] = [];
  for (let i = 0; i < COUNT; i++) {
    const posIdx = Math.floor((lastIdx * (i + 1)) / (COUNT + 1));
    const station = lineStations[posIdx];
    if (!station) continue;
    trains.push({
      trainNo: `${SIM_TRAIN_PREFIX}${2001 + i}`,
      stationName: station.name,
      updnLine,
      trainStatus: ["0", "1", "2"][i % 3], // 진입/정차/출발 섞임
      destination,
      receivedAt: new Date().toISOString(),
      trainType: "일반",
      posIdxOriented: posIdx,
      sameDirection: true,
    });
  }
  return trains;
}

/**
 * 가짜 열차 한 정거장씩 전진. 종착 도달하면 그대로 정지.
 * status 0→1→2 사이클 (진입→정차→출발).
 */
export function advanceFakeTrains<T extends EnrichedTrain>(
  trains: T[],
  lineStations: { name: string }[],
): T[] {
  const lastIdx = lineStations.length - 1;
  return trains.map(t => {
    if (t.posIdxOriented >= lastIdx) return t;
    const nextIdx = t.posIdxOriented + 1;
    const nextStation = lineStations[nextIdx];
    if (!nextStation) return t;
    return {
      ...t,
      posIdxOriented: nextIdx,
      stationName: nextStation.name,
      trainStatus: t.trainStatus === "1" ? "2" : t.trainStatus === "2" ? "0" : "1",
      receivedAt: new Date().toISOString(),
    };
  });
}
