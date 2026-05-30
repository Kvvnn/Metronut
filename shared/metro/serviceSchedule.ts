/**
 * 운행계통(행선지) 스케줄 — 시간/패턴 인지 경로계산용.
 *
 * 각 노선의 패턴은 방향(up=index 감소/당고개 방면, down=index 증가/오이도 방면),
 * 운행구간(origin~terminus index), origin 종착역 기준 출발 시각표를 가진다.
 * 특정 역의 출발 시각은 origin에서 minPerStation × 역수만큼 더해 추정한다.
 *
 * 데이터 정확도는 shared/metro/data/serviceSchedule.json 의 disclaimer 참고(참고용).
 */
import scheduleData from "./data/serviceSchedule.json";
import type { DayType } from "./firstLastTrain";

/** 02시 이전은 전날 운행(서비스데이)으로 본다. */
const SERVICE_DAY_BOUNDARY_MINUTES = 2 * 60;

export type TrainDirection = "up" | "down";

interface DaySchedule {
  first?: string;
  last?: string;
  headwayMin?: number;
  /** 단발성(막차 단축회차 등) 운행: origin 출발 시각 목록 */
  trips?: string[];
}

interface PatternDef {
  id: string;
  label: string;
  direction: TrainDirection;
  originIndex: number;
  terminusIndex: number;
  branches: string[];
  weekday: DaySchedule;
  weekend: DaySchedule;
}

interface LineSchedule {
  name: string;
  minPerStation: number;
  patterns: PatternDef[];
}

const lines = (scheduleData as { lines: Record<string, LineSchedule> }).lines;

export function hasServiceSchedule(lineId: string): boolean {
  return Boolean(lines[lineId]);
}

/** 시각표 문자열(예: "24:24") → 서비스데이 기준 분. 자정 이후는 24:xx로 인코딩되어 있다. */
function parseScheduleHm(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/** 현재 Date → 서비스데이 기준 분(02시 이전은 +24h). */
export function toServiceMinute(date: Date): number {
  const total = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  return total < SERVICE_DAY_BOUNDARY_MINUTES ? total + 24 * 60 : total;
}

/** 현재 Date → 운행 요일(02시 이전은 전날 기준). */
export function getScheduleDayType(date: Date): DayType {
  const serviceDate = new Date(date);
  const total = date.getHours() * 60 + date.getMinutes();
  if (total < SERVICE_DAY_BOUNDARY_MINUTES) {
    serviceDate.setDate(serviceDate.getDate() - 1);
  }
  const day = serviceDate.getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

function getDaySchedule(pattern: PatternDef, dayType: DayType): DaySchedule {
  return dayType === "weekend" ? pattern.weekend : pattern.weekday;
}

/**
 * 패턴 P를, 어떤 역(stationIndex)에서 nowMin에 탑승하려 할 때
 * 가장 이른 출발 시각(서비스분). 막차가 지났으면 null.
 */
function nextDepartureAtStation(
  pattern: PatternDef,
  stationIndex: number,
  minPerStation: number,
  nowMin: number,
  dayType: DayType,
): number | null {
  const day = getDaySchedule(pattern, dayType);
  const offset = Math.abs(pattern.originIndex - stationIndex) * minPerStation;
  const EPS = 1e-6;

  if (day.trips && day.trips.length > 0) {
    const candidates = day.trips
      .map(t => parseScheduleHm(t) + offset)
      .filter(d => d >= nowMin - EPS)
      .sort((a, b) => a - b);
    return candidates.length > 0 ? candidates[0] : null;
  }

  if (day.first != null && day.last != null && day.headwayMin) {
    const first = parseScheduleHm(day.first) + offset;
    const last = parseScheduleHm(day.last) + offset;
    if (nowMin > last + EPS) return null; // 막차 지남
    if (nowMin <= first) return first; // 첫차 전 → 첫차 탑승
    const k = Math.ceil((nowMin - first) / day.headwayMin);
    const dep = first + k * day.headwayMin;
    return dep <= last + EPS ? dep : last; // 그리드가 막차를 넘으면 막차로 보정
  }

  return null;
}

export interface BoardOption {
  patternId: string;
  label: string;
  /** 종착역 index */
  terminusIndex: number;
  /** 탑승까지 대기(분) */
  waitMin: number;
}

/**
 * lineId 노선에서 fromIndex → toIndex(인접 한 정거장) 방향으로,
 * nowMin에 탑승 가능한 패턴들과 각 대기시간을 돌려준다.
 * 막차가 지나 어떤 패턴으로도 이 구간을 갈 수 없으면 빈 배열.
 */
export function getBoardOptions(
  lineId: string,
  fromIndex: number,
  toIndex: number,
  nowMin: number,
  dayType: DayType,
): BoardOption[] {
  const line = lines[lineId];
  if (!line) return [];
  const direction: TrainDirection = toIndex < fromIndex ? "up" : "down";
  const result: BoardOption[] = [];

  for (const pattern of line.patterns) {
    if (pattern.direction !== direction) continue;
    const lo = Math.min(pattern.originIndex, pattern.terminusIndex);
    const hi = Math.max(pattern.originIndex, pattern.terminusIndex);
    // 이 한 정거장 구간이 패턴 운행구간 안에 있어야 함
    if (fromIndex < lo || fromIndex > hi || toIndex < lo || toIndex > hi) continue;

    const dep = nextDepartureAtStation(pattern, fromIndex, line.minPerStation, nowMin, dayType);
    if (dep == null) continue;
    result.push({
      patternId: pattern.id,
      label: pattern.label,
      terminusIndex: pattern.terminusIndex,
      waitMin: Math.max(0, dep - nowMin),
    });
  }

  return result;
}

/**
 * 이미 탑승 중인 패턴 P가 fromIndex → toIndex(인접 한 정거장) 구간을 계속 운행하는지.
 * (탑승 가능 여부와 무관하게 운행구간·방향만 본다 — 이미 탄 열차의 계속 주행 판정용)
 */
export function patternCoversStep(
  lineId: string,
  patternId: string,
  fromIndex: number,
  toIndex: number,
): boolean {
  const line = lines[lineId];
  if (!line) return false;
  const pattern = line.patterns.find(p => p.id === patternId);
  if (!pattern) return false;
  const direction: TrainDirection = toIndex < fromIndex ? "up" : "down";
  if (pattern.direction !== direction) return false;
  const lo = Math.min(pattern.originIndex, pattern.terminusIndex);
  const hi = Math.max(pattern.originIndex, pattern.terminusIndex);
  return fromIndex >= lo && fromIndex <= hi && toIndex >= lo && toIndex <= hi;
}

/** 패턴 id로 라벨/종착 index 조회 (재구성 단계용). */
export function getPatternById(lineId: string, patternId: string): { label: string; terminusIndex: number } | null {
  const line = lines[lineId];
  if (!line) return null;
  const p = line.patterns.find(x => x.id === patternId);
  return p ? { label: p.label, terminusIndex: p.terminusIndex } : null;
}

export function getLineMinPerStation(lineId: string): number {
  return lines[lineId]?.minPerStation ?? 2.5;
}

/** 패턴의 운행 방향(up/down). 없으면 null. */
export function getPatternDirection(lineId: string, patternId: string): TrainDirection | null {
  const line = lines[lineId];
  if (!line) return null;
  return line.patterns.find(p => p.id === patternId)?.direction ?? null;
}

/**
 * fromIndex → toIndex 방향으로 toIndex까지 실제로 도달하는 막차가
 * fromIndex를 출발하는 시각(서비스분). 그런 패턴이 없으면 null.
 * (막차 끊김 안내 메시지에 "정확한 막차 시각"을 표시하는 용도)
 */
export function getLastDepartureReaching(
  lineId: string,
  fromIndex: number,
  toIndex: number,
  dayType: DayType,
): number | null {
  const line = lines[lineId];
  if (!line) return null;
  const direction: TrainDirection = toIndex < fromIndex ? "up" : "down";
  let best: number | null = null;

  for (const pattern of line.patterns) {
    if (pattern.direction !== direction) continue;
    const lo = Math.min(pattern.originIndex, pattern.terminusIndex);
    const hi = Math.max(pattern.originIndex, pattern.terminusIndex);
    if (fromIndex < lo || fromIndex > hi || toIndex < lo || toIndex > hi) continue;

    const day = getDaySchedule(pattern, dayType);
    const lastOrigin = day.trips && day.trips.length > 0
      ? Math.max(...day.trips.map(parseScheduleHm))
      : day.last != null
        ? parseScheduleHm(day.last)
        : null;
    if (lastOrigin == null) continue;

    const offset = Math.abs(pattern.originIndex - fromIndex) * line.minPerStation;
    const atStation = lastOrigin + offset;
    if (best == null || atStation > best) best = atStation;
  }

  return best;
}

/** 서비스분(자정 이후는 24:xx) → "HH:MM" 문자열. */
export function formatServiceMinute(serviceMin: number): string {
  const total = Math.round(serviceMin);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
