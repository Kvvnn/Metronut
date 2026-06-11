import { getFirstLastTrain } from "./firstLastTrain";
import type { DayType } from "./firstLastTrain";
import { getStationInfo } from "./pathfinder";
import type { Route, RouteSegment } from "./pathfinder";
import { getLastDepartureReaching, getScheduleDayType } from "./serviceSchedule";

const SERVICE_DAY_BOUNDARY_MINUTES = 2 * 60;

export type ServiceErrorKind = "after-last" | "before-first";

export interface RouteServiceError {
  kind: ServiceErrorKind;
  lineName: string;
  stationName: string;
  directionName: string;
  firstTime: string;
  lastTime: string;
}

export interface RouteServiceErrorCopy {
  title: string;
  description: string;
  hint: string;
}

function toServiceMinuteFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const total = hours * 60 + minutes;
  return total < SERVICE_DAY_BOUNDARY_MINUTES ? total + 24 * 60 : total;
}

function toServiceMinuteFromDate(date: Date) {
  const total = date.getHours() * 60 + date.getMinutes();
  return total < SERVICE_DAY_BOUNDARY_MINUTES ? total + 24 * 60 : total;
}

function getServiceDayType(date: Date): DayType {
  const serviceDate = new Date(date);
  const total = date.getHours() * 60 + date.getMinutes();
  if (total < SERVICE_DAY_BOUNDARY_MINUTES) {
    serviceDate.setDate(serviceDate.getDate() - 1);
  }

  const day = serviceDate.getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

function addMinutes(date: Date, minutes: number) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

function getSegmentServiceError(
  segment: RouteSegment,
  boardTime: Date,
): RouteServiceError | null {
  if (segment.isTransfer || segment.stations.length < 2) return null;

  const isDownDirection = segment.toStation.index >= segment.fromStation.index;
  const schedule = getFirstLastTrain(
    segment.lineId,
    segment.fromStation.name,
    getServiceDayType(boardTime),
  );
  if (!schedule) return null;

  const firstTime = isDownDirection ? schedule.downFirst : schedule.upFirst;
  const lastTime = isDownDirection ? schedule.downLast : schedule.upLast;
  const nowMinutes = toServiceMinuteFromDate(boardTime);
  const firstMinutes = toServiceMinuteFromTime(firstTime);
  const lastMinutes = toServiceMinuteFromTime(lastTime);

  if (nowMinutes < firstMinutes) {
    return {
      kind: "before-first",
      lineName: segment.lineName,
      stationName: segment.fromStation.name,
      directionName: isDownDirection ? schedule.downTerminus : schedule.upTerminus,
      firstTime,
      lastTime,
    };
  }

  if (nowMinutes > lastMinutes) {
    return {
      kind: "after-last",
      lineName: segment.lineName,
      stationName: segment.fromStation.name,
      directionName: isDownDirection ? schedule.downTerminus : schedule.upTerminus,
      firstTime,
      lastTime,
    };
  }

  return null;
}

export function getRouteServiceError(route: Route, baseTime: Date): RouteServiceError | null {
  let elapsedMinutes = 0;

  for (const segment of route.segments) {
    const boardTime = addMinutes(baseTime, elapsedMinutes);
    const error = getSegmentServiceError(segment, boardTime);
    if (error) return error;
    elapsedMinutes += segment.time;
  }

  return null;
}

/**
 * 두 역을 직통으로 잇는 노선들 중 도착역까지 실제로 가는 가장 늦은 막차의
 * 출발역 기준 출발 시각(서비스분). 직통 노선이 없거나 스케줄이 없으면 null.
 * 시간인지 탐색이 막차로 빈 결과를 줄 때 안내 문구에 정확한 시각을 넣는 용도.
 */
export function getLastDepartureForJourney(
  fromName: string,
  toName: string,
  at: Date = new Date(),
): number | null {
  const fromStations = getStationInfo(fromName);
  const toStations = getStationInfo(toName);
  const dayType = getScheduleDayType(at);
  let best: number | null = null;

  for (const fromStation of fromStations) {
    const toStation = toStations.find(station => station.lineId === fromStation.lineId);
    if (!toStation) continue;
    const last = getLastDepartureReaching(
      fromStation.lineId,
      fromStation.index,
      toStation.index,
      dayType,
    );
    if (last != null && (best == null || last > best)) best = last;
  }

  return best;
}

export function buildServiceErrorCopy(error: RouteServiceError): RouteServiceErrorCopy {
  if (error.kind === "after-last") {
    return {
      title: "오늘 막차가 끝났습니다",
      description: `${error.stationName}역 ${error.lineName} ${error.directionName} 방면 막차는 ${error.lastTime}입니다.`,
      hint: "새벽 2시 전까지는 전날 막차 기준으로 안내합니다.",
    };
  }

  return {
    title: "아직 첫차 전입니다",
    description: `${error.stationName}역 ${error.lineName} ${error.directionName} 방면 첫차는 ${error.firstTime}입니다.`,
    hint: "새벽 2시 이후에는 당일 첫차 기준으로 안내합니다.",
  };
}
