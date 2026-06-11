/**
 * 운행계통(행선지) 스케줄 — 시간/패턴 인지 경로계산용.
 *
 * 각 패턴은 기점(origin)→종점(terminus) 운행과 기점 출발 시각표(첫차/막차/배차 또는
 * 단발 trips)를 가진다. 특정 역의 출발 시각은 기점에서 "실제 역간격 수 × minPerStation"을
 * 더해 추정한다.
 *
 * 역간격 수는 역 index 차이가 아니라 노선 엣지를 BFS한 실제 거리를 쓴다.
 * 1호선처럼 분기(본선/경인선/경부장항선)가 index 블록 단위로 나뉘어 index가 불연속인
 * 노선(구로41→가산디지털단지62가 실제 한 정거장)과, 2호선 순환선(circular)을 모두
 * 같은 프레임으로 다루기 위함이다. 패턴의 운행구간(coverage)도 BFS 경로 위의 역으로
 * 판정하므로, 경부행 열차가 경인선 구간을 덮는 식의 오판이 없다.
 *
 * 데이터 정확도는 shared/metro/data/serviceSchedule.json 의 disclaimer 참고(참고용).
 */
import scheduleData from "./data/serviceSchedule.json";
import metroData from "./data/metroData.json";
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
  /** 이 패턴이 순환선 본선 전체를 한 방향으로 도는 운행인지. 지선·단축회차는 false. */
  circular?: boolean;
  /** (구버전 호환용 메타데이터 — 커버리지 판정은 BFS 경로 기준이라 사용하지 않음) */
  branches?: string[];
  weekday: DaySchedule;
  weekend: DaySchedule;
}

interface LineSchedule {
  name: string;
  minPerStation: number;
  /** 순환선(2호선): 본선 루프를 도는 패턴이 있는 노선. 패턴별 circular로 세분한다. */
  circular?: boolean;
  /** 순환선 본선 역 수 (index 0..loopLength-1) */
  loopLength?: number;
  patterns: PatternDef[];
}

const lines = (scheduleData as unknown as { lines: Record<string, LineSchedule> }).lines;

/** 스케줄 키 → 그래프(역/엣지) 기준 노선 ID. 2호선 지선은 본선 그래프를 공유한다. */
const SCHEDULE_LINE_TO_GRAPH_LINE: Record<string, string> = {
  "2-seongsu": "2",
  "2-sinjeong": "2",
};

export function hasServiceSchedule(lineId: string): boolean {
  return Boolean(lines[lineId]);
}

// ──────────────────────────────────────────────────────────────────────────
// 패턴 런타임: 기점으로부터의 실제 역간격 거리 맵 (BFS)
// ──────────────────────────────────────────────────────────────────────────

interface PatternRuntime {
  def: PatternDef;
  /** 역 index → 기점으로부터 실제 역간격 수 (패턴 운행경로 위의 역만 존재) */
  distFromOrigin: Map<number, number>;
  /** 순환선이면 본선 역 수 (wrap 스텝 판정용) */
  loopLength?: number;
}

interface GraphLineIndex {
  /** 역 index → 역 id */
  idByIndex: Map<number, string>;
  /** 역 id → 역 index */
  indexById: Map<string, number>;
  /** 역 id → 인접 역 id 목록 (해당 노선 엣지만) */
  adjacency: Map<string, string[]>;
}

const graphLineCache = new Map<string, GraphLineIndex>();

function getGraphLine(graphLineId: string): GraphLineIndex {
  let cached = graphLineCache.get(graphLineId);
  if (cached) return cached;

  const idByIndex = new Map<number, string>();
  const indexById = new Map<string, number>();
  (metroData as { stations: { id: string; lineId: string; index: number }[] }).stations
    .filter(station => station.lineId === graphLineId)
    .forEach(station => {
      idByIndex.set(station.index, station.id);
      indexById.set(station.id, station.index);
    });

  const adjacency = new Map<string, string[]>();
  (metroData as { edges: { from: string; to: string; lineId: string }[] }).edges
    .filter(edge => edge.lineId === graphLineId)
    .forEach(edge => {
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
      adjacency.get(edge.from)!.push(edge.to);
    });

  cached = { idByIndex, indexById, adjacency };
  graphLineCache.set(graphLineId, cached);
  return cached;
}

/** graphLine에서 시작 역으로부터 모든 역까지의 역간격 수 (BFS). 역 id → 거리. */
function bfsDistances(graph: GraphLineIndex, startId: string): Map<string, number> {
  const dist = new Map<string, number>([[startId, 0]]);
  let frontier = [startId];
  let depth = 0;
  while (frontier.length > 0) {
    depth++;
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighborId of graph.adjacency.get(id) ?? []) {
        if (!dist.has(neighborId)) {
          dist.set(neighborId, depth);
          next.push(neighborId);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

const patternRuntimeCache = new Map<string, PatternRuntime[]>();

function buildPatternRuntime(
  lineId: string,
  line: LineSchedule,
  def: PatternDef,
): PatternRuntime | null {
  const graphLineId = SCHEDULE_LINE_TO_GRAPH_LINE[lineId] ?? lineId;
  const graph = getGraphLine(graphLineId);

  // 패턴별 circular 우선, 없으면 노선 기본값. 지선·단축회차는 circular=false로 BFS 경로 사용.
  const isCircular = (def.circular ?? line.circular) === true;
  if (isCircular && line.loopLength) {
    // 순환선: 본선(0..loopLength-1) 전 역을 회전 방향 오프셋으로 커버
    const loopLength = line.loopLength;
    const distFromOrigin = new Map<number, number>();
    for (let index = 0; index < loopLength; index++) {
      if (!graph.idByIndex.has(index)) continue;
      const offset =
        def.direction === "down"
          ? (index - def.originIndex + loopLength) % loopLength
          : (def.originIndex - index + loopLength) % loopLength;
      distFromOrigin.set(index, offset);
    }
    return { def, distFromOrigin, loopLength };
  }

  const originId = graph.idByIndex.get(def.originIndex);
  const terminusId = graph.idByIndex.get(def.terminusIndex);
  if (!originId || !terminusId) return null;

  const fromOrigin = bfsDistances(graph, originId);
  const fromTerminus = bfsDistances(graph, terminusId);
  const pathLength = fromOrigin.get(terminusId);
  if (pathLength == null) return null;

  // 기점→종점 경로 위의 역만 커버 (분기 노선에서 다른 가지로 새지 않도록)
  const distFromOrigin = new Map<number, number>();
  fromOrigin.forEach((dOrigin, stationId) => {
    const dTerminus = fromTerminus.get(stationId);
    if (dTerminus == null || dOrigin + dTerminus !== pathLength) return;
    const index = graph.indexById.get(stationId);
    if (index != null) distFromOrigin.set(index, dOrigin);
  });

  return { def, distFromOrigin };
}

function getPatternRuntimes(lineId: string): PatternRuntime[] {
  let cached = patternRuntimeCache.get(lineId);
  if (cached) return cached;

  const line = lines[lineId];
  cached = line
    ? line.patterns
        .map(def => buildPatternRuntime(lineId, line, def))
        .filter((rt): rt is PatternRuntime => rt !== null)
    : [];
  patternRuntimeCache.set(lineId, cached);
  return cached;
}

/**
 * 패턴이 fromIndex→toIndex(인접 한 정거장)를 운행 방향으로 지나는지.
 * 지나면 fromIndex의 기점 기준 거리(시각 오프셋용), 아니면 null.
 */
function matchAdjacentStep(rt: PatternRuntime, fromIndex: number, toIndex: number): number | null {
  const dFrom = rt.distFromOrigin.get(fromIndex);
  const dTo = rt.distFromOrigin.get(toIndex);
  if (dFrom == null || dTo == null) return null;
  if (dTo === dFrom + 1) return dFrom;
  // 순환선: 기점을 다시 지나치는 wrap 스텝
  if (rt.loopLength != null && dFrom === rt.loopLength - 1 && dTo === 0) return dFrom;
  return null;
}

/**
 * 패턴이 fromIndex에서 toIndex(여러 정거장 가능)까지 운행 방향으로 도달하는지.
 * 도달하면 fromIndex의 기점 기준 거리, 아니면 null.
 */
function matchReachableSpan(rt: PatternRuntime, fromIndex: number, toIndex: number): number | null {
  const dFrom = rt.distFromOrigin.get(fromIndex);
  const dTo = rt.distFromOrigin.get(toIndex);
  if (dFrom == null || dTo == null) return null;
  if (rt.loopLength != null) return fromIndex === toIndex ? null : dFrom; // 순환선은 계속 돌아 도달
  return dTo > dFrom ? dFrom : null;
}

// ──────────────────────────────────────────────────────────────────────────
// 시각 계산
// ──────────────────────────────────────────────────────────────────────────

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
 * 패턴을 기점 기준 거리 stationOffset인 역에서 nowMin에 탑승하려 할 때
 * 가장 이른 출발 시각(서비스분). 막차가 지났으면 null.
 */
function nextDepartureAtStation(
  pattern: PatternDef,
  stationOffset: number,
  minPerStation: number,
  nowMin: number,
  dayType: DayType,
): number | null {
  const day = getDaySchedule(pattern, dayType);
  const offset = stationOffset * minPerStation;
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
  const down = toIndex > fromIndex;
  const all: BoardOption[] = [];

  for (const rt of getPatternRuntimes(lineId)) {
    const stationOffset = matchAdjacentStep(rt, fromIndex, toIndex);
    if (stationOffset == null) continue;

    const dep = nextDepartureAtStation(rt.def, stationOffset, line.minPerStation, nowMin, dayType);
    if (dep == null) continue;
    all.push({
      patternId: rt.def.id,
      label: rt.def.label,
      terminusIndex: rt.def.terminusIndex,
      // 시각표 산술의 부동소수점 잔차가 표시에 새지 않도록 0.01분 단위로 반올림
      waitMin: Math.max(0, Math.round((dep - nowMin) * 100) / 100),
    });
  }

  // Pareto 가지치기: 한 노선에 운행계통이 많으면(예: 1호선 단축회차 다수) 같은 구간에
  // 수십 개 옵션이 생겨 탐색 상태공간이 폭발한다. "대기 적고 종착이 더 먼" 비지배 옵션만
  // 남긴다. (대기 오름차순으로 보며, 이미 본 것보다 더 멀리 가는 열차만 유지 — 정확성 보존)
  all.sort((a, b) => a.waitMin - b.waitMin || (down ? b.terminusIndex - a.terminusIndex : a.terminusIndex - b.terminusIndex));
  const result: BoardOption[] = [];
  let bestReach = down ? -Infinity : Infinity;
  for (const opt of all) {
    if (down ? opt.terminusIndex > bestReach : opt.terminusIndex < bestReach) {
      result.push(opt);
      bestReach = opt.terminusIndex;
    }
  }
  return result;
}

/**
 * 이미 탑승 중인 패턴 P가 fromIndex → toIndex(인접 한 정거장) 구간을 계속 운행하는지.
 * (탑승 가능 여부와 무관하게 운행경로·방향만 본다 — 이미 탄 열차의 계속 주행 판정용)
 */
export function patternCoversStep(
  lineId: string,
  patternId: string,
  fromIndex: number,
  toIndex: number,
): boolean {
  const rt = getPatternRuntimes(lineId).find(r => r.def.id === patternId);
  if (!rt) return false;
  return matchAdjacentStep(rt, fromIndex, toIndex) != null;
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
  let best: number | null = null;

  for (const rt of getPatternRuntimes(lineId)) {
    const stationOffset = matchReachableSpan(rt, fromIndex, toIndex);
    if (stationOffset == null) continue;

    const day = getDaySchedule(rt.def, dayType);
    const lastOrigin = day.trips && day.trips.length > 0
      ? Math.max(...day.trips.map(parseScheduleHm))
      : day.last != null
        ? parseScheduleHm(day.last)
        : null;
    if (lastOrigin == null) continue;

    const atStation = lastOrigin + stationOffset * line.minPerStation;
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
