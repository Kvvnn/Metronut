/**
 * 지하철 경로 검색 알고리즘
 * 다익스트라 기반 최단시간/최소환승/도보적은 경로 탐색
 */

import metroData from './data/metroData.json';
import { getOfficialTransferInfo } from './officialTransferTimes';
import {
  hasServiceSchedule,
  getBoardOptions,
  getPatternById,
  patternCoversStep,
  getLineMinPerStation,
  getPatternDirection,
  toServiceMinute,
  getScheduleDayType,
} from './serviceSchedule';
import type { DayType } from './firstLastTrain';

export interface Station {
  id: string;
  name: string;
  code: string;
  lineId: string;
  transfers: string[];
  index: number;
  /** 노선 내 분기 (예: '본선', '경인선', '경부장항선', '성수지선', '신정지선', '마천지선') */
  branch?: string;
}

/**
 * 노선별 운행 패턴 (어느 행 열차가 어디까지 가는지).
 * 1호선처럼 같은 노선이 본선/경인선/경부선으로 분기되거나, 5호선의 마천지선처럼
 * 분기점에서 종착이 갈리는 경우 사용자에게 "○○행 열차 탑승"으로 안내.
 */
export interface OperatingPattern {
  id: string;
  /** 이 운행이 지나는 분기 (예: ['본선','경인선']) — 모두 포함되어야 매칭 */
  branches: string[];
  /** 종착역 이름 */
  terminus: string;
  /** UI 표시용 라벨 */
  label: string;
}

export interface Edge {
  from: string;
  to: string;
  lineId: string;
  time: number;
}

export interface Transfer {
  from: string;
  to: string;
  stationName: string;
  fromLine: string;
  toLine: string;
  time: number;
}

export interface Line {
  id: string;
  name: string;
  color: string;
  shortName: string;
}

export interface RouteSegment {
  fromStation: Station;
  toStation: Station;
  lineId: string;
  lineName: string;
  lineColor: string;
  stations: Station[];
  time: number;
  isTransfer: boolean;
  /** 앱에서 쓰는 보정 환승 시간(초). 없으면 기본 분 단위 추정값을 사용. */
  transferSeconds?: number;
  transferDistanceMeters?: number;
  /** 이 ride 구간에 적합한 운행 패턴 (예: '인천행'). transfer면 undefined */
  pattern?: OperatingPattern;
  /** 시간인지 탐색에서 이 열차를 타기까지 기다리는 시간(초). */
  boardWaitSeconds?: number;
  /** 같은 노선에서 다른 행선지 열차로 갈아타는(승강장 대기) 구간. 노선 환승과 구분. */
  isTrainChange?: boolean;
}

export interface Route {
  segments: RouteSegment[];
  totalTime: number;
  transferCount: number;
  stationCount: number;
  fare: number;
  walkTime: number;
  departureTime?: string;
  arrivalTime?: string;
  /** 시간인지 탐색이 막차 등으로 도달 불가라고 판단한 사유. */
  infeasibleReason?: "after-last";
}

export interface FindRoutesOptions {
  /** 출발(탐색 기준) 시각. 주면 운행계통/막차를 반영한 시간인지 탐색을 한다. */
  departAt?: Date;
  /** 평일/주말. 생략 시 departAt 기준 자동 판정. */
  dayType?: DayType;
}

// 데이터 인덱싱
const stationMap = new Map<string, Station>();
const stationsByName = new Map<string, Station[]>();
const lineMap = new Map<string, Line>();
const adjacencyList = new Map<string, AdjacentEdge[]>();
const patternsByLine = new Map<string, OperatingPattern[]>();

const TRANSFER_TIME = 3;
const MIN_PRACTICAL_TRANSFER_MINUTES = 2;
const TRANSFER_WAYFINDING_BUFFER_SECONDS = 60;
export const LONG_TRANSFER_THRESHOLD_SECONDS = 240;
const STATE_SEPARATOR = "::";
const LONG_ACCESS_LINE_PENALTY: Record<string, number> = {
  airport: 8,
  gtxa: 12,
};
/**
 * 급행/특급/직통처럼 같은 노선 안에서 일부 역만 정차하는 별도 운행.
 * 본 노선(base) 위에 "가상 노선"으로 얹어, 통과역을 건너뛴 더 빠른 경로를 제시한다.
 */
interface ExpressService {
  id: string;
  /** 본 노선 ID (요금/환승은 본 노선 기준) */
  base: string;
  name: string;
  shortName: string;
  color: string;
  /** 정차역 간 평균 소요시간(분). 탐색·표시에 함께 사용 */
  hopMinutes: number;
  /** 행선지 라벨 접두어 */
  kind: "급행" | "특급" | "직통";
  terminusA: string;
  terminusB: string;
  /** 정차역 ID (운행 순서) */
  stationIds: string[];
}

// 국토교통부 '수도권 도시철도 급행노선'(2025-06-25) 기준 급행/특급/직통 정차 패턴.
// 통과역이 실제로 있는 노선만 포함(전 구간 나열형 제외). 경의선 서울역지선은 본 데이터에 미모델링되어 보류.
const EXPRESS_SERVICES: ExpressService[] = [
  {
    id: "1-gyeongin-express",
    base: "1",
    name: "경인선 급행",
    shortName: "경인급행",
    color: "#003688",
    hopMinutes: 2.5,
    kind: "급행",
    terminusA: "용산",
    terminusB: "동인천",
    stationIds: ["1_135", "1_136", "1_137", "1_138", "1_139", "1_140", "1_141", "1_143", "1_146", "1_148", "1_150", "1_152", "1_154", "1_156", "1_158", "1_160"],
  },
  {
    id: "1-gyeongin-rapid",
    base: "1",
    name: "경인선 특급",
    shortName: "경인특급",
    color: "#ED1C24",
    hopMinutes: 2.5,
    kind: "특급",
    terminusA: "용산",
    terminusB: "동인천",
    stationIds: ["1_135", "1_136", "1_140", "1_141", "1_148", "1_150", "1_152", "1_156", "1_160"],
  },
  {
    id: "1-janghang-express",
    base: "1",
    name: "경부·장항선 급행",
    shortName: "장항급행",
    color: "#003688",
    hopMinutes: 3.5,
    kind: "급행",
    terminusA: "용산",
    terminusB: "신창",
    stationIds: ["1_135", "1_136", "1_137", "1_138", "1_139", "1_140", "1_141", "1_162", "1_167", "1_175", "1_177", "1_180", "1_183", "1_185", "1_186", "1_188", "1_189", "1_190", "1_191", "1_192", "1_193", "1_194", "1_195"],
  },
  {
    id: "1-gyeongbu-express",
    base: "1",
    name: "경부선 급행",
    shortName: "경부급행",
    color: "#0052A4",
    hopMinutes: 3.5,
    kind: "급행",
    terminusA: "서울역",
    terminusB: "신창",
    stationIds: ["1_133", "1_139", "1_164", "1_167", "1_170", "1_172", "1_173", "1_175", "1_177", "1_180", "1_183", "1_185", "1_186", "1_188", "1_189", "1_190", "1_191", "1_192", "1_193", "1_194", "1_195"],
  },
  {
    id: "9-express",
    base: "9",
    name: "9호선 급행",
    shortName: "9급행",
    color: "#8C7B5A",
    hopMinutes: 3,
    kind: "급행",
    terminusA: "종합운동장",
    terminusB: "김포공항",
    stationIds: ["9_929", "9_928", "9_926", "9_924", "9_922", "9_919", "9_916", "9_914", "9_912", "9_909", "9_906", "9_901"],
  },
  // NOTE: 공항철도 직통은 정차역이 3개뿐이고 역간 거리가 극단적으로 불균등하며(서울역→T1 ~43분,
  // T1→T2 ~6분) 별도 프리미엄 운임이 적용된다. 균일 hop·동일운임 모델로는 정확히 표현되지 않아
  // 별도 처리가 필요하므로 이번 라운드에서는 제외한다.
  {
    id: "suinbundang-express",
    base: "suinbundang",
    name: "수인분당선 급행",
    shortName: "분당급행",
    color: "#E0A900",
    hopMinutes: 3,
    kind: "급행",
    terminusA: "왕십리",
    terminusB: "수원",
    stationIds: ["suinbundang_K210", "suinbundang_K211", "suinbundang_K212", "suinbundang_K213", "suinbundang_K214", "suinbundang_K215", "suinbundang_K216", "suinbundang_K217", "suinbundang_K218", "suinbundang_K219", "suinbundang_K220", "suinbundang_K221", "suinbundang_K222", "suinbundang_K223", "suinbundang_K224", "suinbundang_K225", "suinbundang_K226", "suinbundang_K227", "suinbundang_K228", "suinbundang_K229", "suinbundang_K230", "suinbundang_K231", "suinbundang_K232", "suinbundang_K233", "suinbundang_K237", "suinbundang_K241", "suinbundang_K243", "suinbundang_K245"],
  },
  {
    id: "gyeongchun-express",
    base: "gyeongchun",
    name: "경춘선 급행",
    shortName: "경춘급행",
    color: "#0C8E72",
    hopMinutes: 4,
    kind: "급행",
    terminusA: "청량리",
    terminusB: "춘천",
    stationIds: ["gyeongchun_P01", "gyeongchun_P02", "gyeongchun_P04", "gyeongchun_P09", "gyeongchun_P10", "gyeongchun_P12", "gyeongchun_P14", "gyeongchun_P16", "gyeongchun_P18", "gyeongchun_P21", "gyeongchun_P23", "gyeongchun_P24"],
  },
];

const EXPRESS_LINE_IDS = new Set(EXPRESS_SERVICES.map(service => service.id));
const EXPRESS_HOP_MINUTES: Record<string, number> = Object.fromEntries(
  EXPRESS_SERVICES.map(service => [service.id, service.hopMinutes]),
);

function isExpressLineId(lineId: string) {
  return EXPRESS_LINE_IDS.has(lineId);
}

const VIRTUAL_LINE_TO_BASE: Record<string, string> = {
  "2-seongsu": "2",
  "2-sinjeong": "2",
  ...Object.fromEntries(EXPRESS_SERVICES.map(service => [service.id, service.base])),
};

const VIRTUAL_LINES: Line[] = [
  {
    id: "2-seongsu",
    name: "2호선 성수지선",
    color: "#00A84D",
    shortName: "성수지선",
  },
  {
    id: "2-sinjeong",
    name: "2호선 신정지선",
    color: "#00A84D",
    shortName: "신정지선",
  },
  ...EXPRESS_SERVICES.map(service => ({
    id: service.id,
    name: service.name,
    color: service.color,
    shortName: service.shortName,
  })),
];

const VIRTUAL_LINE_STATION_IDS: Record<string, string[]> = {
  "2-seongsu": ["2_210", "2_243", "2_244", "2_245", "2_246"],
  "2-sinjeong": ["2_233", "2_247", "2_248", "2_249", "2_250"],
  ...Object.fromEntries(EXPRESS_SERVICES.map(service => [service.id, service.stationIds])),
};

interface TransferDetails {
  time: number;
  transferSeconds?: number;
  transferDistanceMeters?: number;
}

interface AdjacentEdge extends TransferDetails {
  to: string;
  lineId: string;
  isTransfer: boolean;
}

function getBaseLineId(lineId: string) {
  return VIRTUAL_LINE_TO_BASE[lineId] ?? lineId;
}

function getStationEffectiveLineId(station: Station, fallbackLineId = station.lineId) {
  if (fallbackLineId === "2") {
    if (station.branch === "성수지선") return "2-seongsu";
    if (station.branch === "신정지선") return "2-sinjeong";
  }
  return fallbackLineId;
}

function getEffectiveEdgeLineId(lineId: string, fromStation: Station, toStation: Station) {
  if (lineId === "2") {
    if (fromStation.branch === "성수지선" || toStation.branch === "성수지선") {
      return "2-seongsu";
    }
    if (fromStation.branch === "신정지선" || toStation.branch === "신정지선") {
      return "2-sinjeong";
    }
  }
  return lineId;
}

function makeStateKey(stationId: string, lineId: string) {
  return `${stationId}${STATE_SEPARATOR}${lineId}`;
}

function parseStateKey(key: string) {
  const separatorIndex = key.indexOf(STATE_SEPARATOR);
  if (separatorIndex < 0) return { stationId: key, lineId: "" };
  return {
    stationId: key.slice(0, separatorIndex),
    lineId: key.slice(separatorIndex + STATE_SEPARATOR.length),
  };
}

function getLineChangePenalty(fromLineId: string, toLineId: string) {
  if (!fromLineId || fromLineId === toLineId) return 0;
  const fromPenalty = LONG_ACCESS_LINE_PENALTY[getBaseLineId(fromLineId)] ?? 0;
  const toPenalty = LONG_ACCESS_LINE_PENALTY[getBaseLineId(toLineId)] ?? 0;
  return Math.max(fromPenalty, toPenalty);
}

function getTransferDetails(
  stationName: string,
  fromLineId: string,
  toLineId: string,
  fallbackTime = TRANSFER_TIME,
): TransferDetails {
  const official = getOfficialTransferInfo(
    stationName,
    getBaseLineId(fromLineId),
    getBaseLineId(toLineId),
  );
  if (!official) return { time: fallbackTime };

  const practicalMinutes = Math.max(
    MIN_PRACTICAL_TRANSFER_MINUTES,
    Math.ceil((official.seconds + TRANSFER_WAYFINDING_BUFFER_SECONDS) / 60),
  );

  return {
    time: practicalMinutes,
    transferSeconds: practicalMinutes * 60,
    transferDistanceMeters: official.distanceMeters,
  };
}

function getTransferTimeTotal(segments: RouteSegment[]) {
  return segments
    // 같은 역에서 열차만 바꿔 타는 경우(일반↔급행)는 도보 환승 시간에 넣지 않는다.
    .filter(segment => segment.isTransfer && !segment.isTrainChange)
    .reduce((sum, segment) => sum + segment.time, 0);
}

export function isLongTransferSegment(segment: Pick<RouteSegment, "time" | "transferSeconds">) {
  return getPracticalTransferSeconds(segment) >= LONG_TRANSFER_THRESHOLD_SECONDS;
}

export function getPracticalTransferSeconds(segment: Pick<RouteSegment, "time" | "transferSeconds">) {
  const practicalMinutes = Math.max(
    MIN_PRACTICAL_TRANSFER_MINUTES,
    Math.ceil((segment.transferSeconds ?? segment.time * 60) / 60),
  );
  return practicalMinutes * 60;
}

export function formatTransferDuration(segment: Pick<RouteSegment, "time" | "transferSeconds">) {
  const durationSeconds = getPracticalTransferSeconds(segment);
  const minutes = Math.ceil(durationSeconds / 60);
  return `${minutes}분`;
}

function getPatternTerminusStation(terminus: string, baseLineId: string): Station | undefined {
  return stationsByName.get(terminus)?.find(s => getBaseLineId(s.lineId) === baseLineId);
}

// 종착역이 현재 진행 방향에 있는지 보고 적합한 운행 패턴("○○행")을 선택.
// 도착역이 노선 종점이 아닐 때 반대 방향 종점을 고르는 것을 방지한다.
function chooseOperatingPattern(
  lineId: string,
  segmentStations: Station[],
): OperatingPattern | undefined {
  if (segmentStations.length < 2) return undefined;
  const baseLineId = getBaseLineId(lineId);
  // 급행 등 가상 노선은 자체 운행패턴("급행 ○○행")을 우선 사용하고, 없으면 본 노선 패턴으로 폴백.
  const patterns = patternsByLine.get(lineId) ?? patternsByLine.get(baseLineId);
  if (!patterns || patterns.length === 0) return undefined;

  const first = segmentStations[0];
  const last = segmentStations[segmentStations.length - 1];
  // 이 ride 구간이 거치는 모든 분기 (보통 1~2개)
  const usedBranches = new Set<string>();
  segmentStations.forEach(s => {
    if (s.branch) usedBranches.add(s.branch);
  });
  const branchMatches = (p: OperatingPattern) =>
    Array.from(usedBranches).every(b => p.branches.includes(b));

  // 1순위: 종착역이 패턴의 terminus와 정확히 일치 (방향 모호성 없음)
  const exactTerminus = patterns.filter(p => p.terminus === last.name);
  if (exactTerminus.length > 0) {
    return exactTerminus.find(branchMatches) ?? exactTerminus[0];
  }

  // 2순위: 진행 방향(역 index 증감)으로 앞쪽에 있는 종점만 후보로 삼는다.
  //         경인선↔본선처럼 분기를 넘나드는 운행은 패턴 branches가 구간 분기를
  //         모두 포함하지 못하므로, 여기서는 branches 엄격 매칭 대신 진행 방향과
  //         "도착역 분기 → 본선" 우선순위로 종점을 고른다.
  // 2호선은 순환선이라 역 index 증감으로 방향을 판단할 수 없으므로 방향 로직을 건너뛴다.
  const direction = baseLineId === "2" ? 0 : Math.sign(last.index - first.index);
  if (direction !== 0) {
    const isAhead = (index: number) => (direction > 0 ? index >= last.index : index <= last.index);
    const aheadTermini: { pattern: OperatingPattern; index: number; branch?: string }[] = [];
    for (const p of patterns) {
      const term = getPatternTerminusStation(p.terminus, baseLineId);
      if (term && isAhead(term.index)) {
        aheadTermini.push({ pattern: p, index: term.index, branch: term.branch });
      }
    }

    if (aheadTermini.length > 0) {
      // 분기 우선순위: 도착역과 같은 분기 → 본선 → 그 외
      const byLastBranch = last.branch
        ? aheadTermini.filter(t => t.branch === last.branch)
        : [];
      const byMainLine = aheadTermini.filter(t => t.branch === "본선");
      const pool =
        byLastBranch.length > 0 ? byLastBranch : byMainLine.length > 0 ? byMainLine : aheadTermini;
      // 진행 방향으로 가장 가까운 종점(=현실적인 종착)을 행선지로 표시
      pool.sort((a, b) => (direction > 0 ? a.index - b.index : b.index - a.index));
      return pool[0].pattern;
    }
  }

  // 3순위(폴백): 분기 매칭 후보 중 도착역 분기와 같은 종점, 없으면 첫 후보
  const candidates = patterns.filter(branchMatches);
  const pool = candidates.length > 0 ? candidates : patterns;
  if (last.branch) {
    const sameBranchTerminus = pool.find(
      p => getPatternTerminusStation(p.terminus, baseLineId)?.branch === last.branch,
    );
    if (sameBranchTerminus) return sameBranchTerminus;
  }
  return pool[0];
}

// 초기화
function initializeGraph() {
  // 노선 맵
  metroData.lines.forEach((line: Line) => {
    lineMap.set(line.id, line);
  });
  VIRTUAL_LINES.forEach(line => {
    lineMap.set(line.id, line);
  });

  // 역 맵
  metroData.stations.forEach((station: Station) => {
    stationMap.set(station.id, station);
    if (!stationsByName.has(station.name)) {
      stationsByName.set(station.name, []);
    }
    stationsByName.get(station.name)!.push(station);
  });

  // 인접 리스트 구축
  metroData.edges.forEach((edge: Edge) => {
    const fromStation = stationMap.get(edge.from);
    const toStation = stationMap.get(edge.to);
    const lineId = fromStation && toStation
      ? getEffectiveEdgeLineId(edge.lineId, fromStation, toStation)
      : edge.lineId;

    if (!adjacencyList.has(edge.from)) {
      adjacencyList.set(edge.from, []);
    }
    adjacencyList.get(edge.from)!.push({
      to: edge.to,
      lineId,
      time: edge.time,
      isTransfer: false,
    });
  });

  // 급행/특급/직통 가상 노선 엣지 추가 (정차역만 직접 연결)
  EXPRESS_SERVICES.forEach(service => {
    const { stationIds, id: lineId, hopMinutes } = service;
    for (let i = 0; i < stationIds.length - 1; i++) {
      const a = stationIds[i];
      const b = stationIds[i + 1];
      ([[a, b], [b, a]] as const).forEach(([from, to]) => {
        if (!adjacencyList.has(from)) adjacencyList.set(from, []);
        adjacencyList.get(from)!.push({ to, lineId, time: hopMinutes, isTransfer: false });
      });
    }
  });

  // 환승 엣지 추가
  metroData.transfers.forEach((transfer: Transfer) => {
    const toStation = stationMap.get(transfer.to);
    const lineId = toStation
      ? getStationEffectiveLineId(toStation, transfer.toLine)
      : transfer.toLine;
    const transferDetails = getTransferDetails(
      transfer.stationName,
      transfer.fromLine,
      transfer.toLine,
      transfer.time,
    );

    if (!adjacencyList.has(transfer.from)) {
      adjacencyList.set(transfer.from, []);
    }
    adjacencyList.get(transfer.from)!.push({
      to: transfer.to,
      lineId,
      isTransfer: true,
      ...transferDetails,
    });
  });

  // 운행 패턴 인덱싱 (라인별)
  const patternsRaw = (metroData as { operatingPatterns?: Record<string, OperatingPattern[]> })
    .operatingPatterns;
  if (patternsRaw) {
    Object.entries(patternsRaw).forEach(([lineId, list]) => {
      patternsByLine.set(lineId, list);
    });
  }

  // 급행 가상 노선의 운행 패턴(양방향 행선지) 생성
  EXPRESS_SERVICES.forEach(service => {
    patternsByLine.set(service.id, [
      {
        id: `${service.id}-A`,
        branches: ["본선"],
        terminus: service.terminusA,
        label: `${service.kind} (${service.terminusA}행)`,
      },
      {
        id: `${service.id}-B`,
        branches: ["본선"],
        terminus: service.terminusB,
        label: `${service.kind} (${service.terminusB}행)`,
      },
    ]);
  });
}

initializeGraph();

// 우선순위 큐 (간단한 구현)
class PriorityQueue<T> {
  private items: { element: T; priority: number }[] = [];

  enqueue(element: T, priority: number) {
    const item = { element, priority };
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (item.priority < this.items[i].priority) {
        this.items.splice(i, 0, item);
        added = true;
        break;
      }
    }
    if (!added) this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.element;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

interface DijkstraNode {
  stationId: string;
  time: number;
  transfers: number;
  prevNode: string | null;
  prevLine: string;
  isTransfer: boolean;
}

type SearchMode = 'fastest' | 'fewest-transfers' | 'least-walking';
const MAX_ROUTE_CANDIDATES = 5;
const MAX_ALTERNATIVE_EXTRA_MINUTES = 25;
const MAX_ALTERNATIVE_TRANSFER_EXTRA = 1;
const VIA_LEG_CANDIDATE_LIMIT = 2;

interface PreviousStep {
  prevKey: string;
  lineId: string;
  isTransfer: boolean;
  lineChanged: boolean;
  transferTime: number;
  transferSeconds?: number;
  transferDistanceMeters?: number;
}

interface PathNode {
  stationId: string;
  lineId: string;
  isTransfer: boolean;
  lineChanged: boolean;
  transferTime: number;
  transferSeconds?: number;
  transferDistanceMeters?: number;
}

/**
 * 경로 검색 메인 함수
 */
export function findRoutes(fromName: string, toName: string, options?: FindRoutesOptions): Route[] {
  // 출발 시각이 주어지고, 출발/도착이 운행계통 스케줄이 있는 노선(현재 4호선)과 관련될 때만
  // 시간인지 탐색을 쓴다. 그 외에는 기존(시간무관) 엔진을 그대로 사용해 회귀를 막는다.
  if (options?.departAt && involvesScheduledLine(fromName, toName)) {
    const fromStations = stationsByName.get(fromName);
    const toStations = stationsByName.get(toName);
    if (!fromStations || !toStations || fromName === toName) return [];
    return findRoutesTimed(fromStations, toStations, options.departAt, options.dayType);
  }

  const baseRoutes = findBaseRoutes(fromName, toName);
  if (baseRoutes.length === 0) return [];

  const alternativeRoutes = findTransferStationAlternatives(
    fromName,
    toName,
    baseRoutes[0],
  );

  return sortRoutesByUsefulness(
    dedupeRoutes([...baseRoutes, ...alternativeRoutes]),
  )
    .filter(isPresentableRoute)
    .slice(0, MAX_ROUTE_CANDIDATES);
}

function findBaseRoutes(fromName: string, toName: string): Route[] {
  const fromStations = stationsByName.get(fromName);
  const toStations = stationsByName.get(toName);

  if (!fromStations || !toStations) return [];
  // 출발역과 도착역이 같으면 경로가 없다 (빈 세그먼트 경로 반환 방지)
  if (fromName === toName) return [];

  const routes: Route[] = [];

  // 최단시간 경로
  const fastestRoute = dijkstra(fromStations, toStations, 'fastest');
  if (fastestRoute) routes.push(fastestRoute);

  // 최소환승 경로
  const fewestTransfers = dijkstra(fromStations, toStations, 'fewest-transfers');
  if (fewestTransfers && !isDuplicateRoute(routes, fewestTransfers)) {
    routes.push(fewestTransfers);
  }

  // 도보 적은 경로
  const leastWalking = dijkstra(fromStations, toStations, 'least-walking');
  if (leastWalking && !isDuplicateRoute(routes, leastWalking)) {
    routes.push(leastWalking);
  }

  return routes.filter(route => route.segments.length > 0);
}

function findTransferStationAlternatives(
  fromName: string,
  toName: string,
  fastestRoute: Route,
): Route[] {
  const alternativeRoutes: Route[] = [];
  const candidateNames = getTransferStationCandidateNames(fromName, toName);

  for (const viaName of candidateNames) {
    const firstLegRoutes = findBaseRoutes(fromName, viaName).slice(0, VIA_LEG_CANDIDATE_LIMIT);
    const secondLegRoutes = findBaseRoutes(viaName, toName).slice(0, VIA_LEG_CANDIDATE_LIMIT);
    if (firstLegRoutes.length === 0 || secondLegRoutes.length === 0) continue;

    for (const firstLeg of firstLegRoutes) {
      for (const secondLeg of secondLegRoutes) {
        const combined = combineRoutesAtVia(firstLeg, secondLeg);
        if (!isUsefulAlternativeRoute(combined, fastestRoute)) continue;
        if (hasRepeatedRideLine(combined) || hasDegenerateRide(combined)) continue;
        if (!isDuplicateRoute(alternativeRoutes, combined)) {
          alternativeRoutes.push(combined);
        }
      }
    }
  }

  return sortRoutesByUsefulness(alternativeRoutes).slice(0, MAX_ROUTE_CANDIDATES * 2);
}

function getTransferStationCandidateNames(fromName: string, toName: string): string[] {
  const names: string[] = [];

  stationsByName.forEach((stations, name) => {
    if (name === fromName || name === toName) return;

    const lineIds = new Set(stations.map(station => station.lineId));
    if (lineIds.size > 1) {
      names.push(name);
    }
  });

  return names;
}

function isUsefulAlternativeRoute(route: Route, fastestRoute: Route) {
  if (route.segments.length === 0) return false;
  if (route.totalTime > fastestRoute.totalTime + MAX_ALTERNATIVE_EXTRA_MINUTES) return false;
  if (route.transferCount > fastestRoute.transferCount + MAX_ALTERNATIVE_TRANSFER_EXTRA) return false;
  return true;
}

function hasRepeatedRideLine(route: Route) {
  const seenLineIds = new Set<string>();
  let prevBaseLineId: string | null = null;

  for (const segment of route.segments) {
    if (segment.isTransfer) continue;

    const lineId = getBaseLineId(segment.lineId);
    // 같은 노선을 연이어 타는 경우(일반↔급행 갈아타기, 지선 전환 등)는 중복 탑승이 아니다.
    // 다른 노선을 거쳤다가 같은 노선으로 되돌아오는 "헛도는" 경로만 걸러낸다.
    if (lineId === prevBaseLineId) continue;
    if (seenLineIds.has(lineId)) return true;
    seenLineIds.add(lineId);
    prevBaseLineId = lineId;
  }

  return false;
}

// 경유 합성 과정에서 가끔 같은 역에서 시작·종료하는 0거리 탑승 구간이 생긴다(예: 종점 도달 후
// 같은 역으로 되돌아오는 합성 구간). 이런 퇴행 경로는 무효 처리한다.
function hasDegenerateRide(route: Route) {
  return route.segments.some(
    segment => !segment.isTransfer && segment.fromStation.id === segment.toStation.id,
  );
}

function isPresentableRoute(route: Route) {
  return route.segments.length > 0 && !hasRepeatedRideLine(route) && !hasDegenerateRide(route);
}

function sortRoutesByUsefulness(routes: Route[]) {
  return [...routes].sort((a, b) => {
    if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
    if (a.transferCount !== b.transferCount) return a.transferCount - b.transferCount;
    if (a.walkTime !== b.walkTime) return a.walkTime - b.walkTime;
    return a.stationCount - b.stationCount;
  });
}

function dedupeRoutes(routes: Route[]) {
  return routes.reduce<Route[]>((acc, route) => {
    if (!isDuplicateRoute(acc, route)) {
      acc.push(route);
    }
    return acc;
  }, []);
}

export function findRoutesVia(fromName: string, viaName: string, toName: string): Route[] {
  if (!viaName || viaName === fromName || viaName === toName) {
    return findRoutes(fromName, toName);
  }

  const firstLegRoutes = findBaseRoutes(fromName, viaName);
  const secondLegRoutes = findBaseRoutes(viaName, toName);
  if (firstLegRoutes.length === 0 || secondLegRoutes.length === 0) return [];

  const combinedRoutes: Route[] = [];

  for (const firstLeg of firstLegRoutes.slice(0, 3)) {
    for (const secondLeg of secondLegRoutes.slice(0, 3)) {
      const combined = combineRoutesAtVia(firstLeg, secondLeg);
      if (!isDuplicateRoute(combinedRoutes, combined)) {
        combinedRoutes.push(combined);
      }
    }
  }

  return combinedRoutes
    .filter(isPresentableRoute)
    .sort((a, b) => {
      if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
      if (a.transferCount !== b.transferCount) return a.transferCount - b.transferCount;
      return a.stationCount - b.stationCount;
    })
    .slice(0, MAX_ROUTE_CANDIDATES);
}

function combineRoutesAtVia(firstLeg: Route, secondLeg: Route): Route {
  const firstRide = [...firstLeg.segments].reverse().find(segment => !segment.isTransfer);
  const secondRide = secondLeg.segments.find(segment => !segment.isTransfer);
  const bridgeSegments: RouteSegment[] = [];

  if (
    firstRide &&
    secondRide &&
    (
      firstRide.toStation.id !== secondRide.fromStation.id ||
      firstRide.lineId !== secondRide.lineId
    )
  ) {
    const transferDetails = getTransferDetails(
      firstRide.toStation.name,
      firstRide.lineId,
      secondRide.lineId,
    );
    bridgeSegments.push({
      fromStation: firstRide.toStation,
      toStation: secondRide.fromStation,
      lineId: secondRide.lineId,
      lineName: '경유 환승',
      lineColor: '#888',
      stations: [firstRide.toStation, secondRide.fromStation],
      isTransfer: true,
      ...transferDetails,
    });
  }

  return buildRouteFromSegments([
    ...firstLeg.segments,
    ...bridgeSegments,
    ...secondLeg.segments,
  ]);
}

function buildRouteFromSegments(rawSegments: RouteSegment[]): Route {
  const segments = normalizeRouteSegments(rawSegments);
  const transferCount = segments.filter(segment => segment.isTransfer && !segment.isTrainChange).length;
  const stationCount = segments
    .filter(segment => !segment.isTransfer)
    .reduce((sum, segment) => sum + segment.stations.length - 1, 0);
  const transferTime = getTransferTimeTotal(segments);

  return {
    segments,
    totalTime: Math.round(segments.reduce((sum, segment) => sum + segment.time, 0)),
    transferCount,
    stationCount,
    fare: calculateFare(getFareStationCount(segments)) + getSurchargeTotal(segments),
    walkTime: transferTime,
  };
}

function normalizeRouteSegments(segments: RouteSegment[]) {
  const normalized: RouteSegment[] = [];

  for (const segment of segments) {
    const previous = normalized[normalized.length - 1];
    if (
      previous &&
      !previous.isTransfer &&
      !segment.isTransfer &&
      previous.lineId === segment.lineId &&
      previous.toStation.id === segment.fromStation.id
    ) {
      const mergedStations = [...previous.stations, ...segment.stations.slice(1)];
      normalized[normalized.length - 1] = {
        ...previous,
        toStation: segment.toStation,
        stations: mergedStations,
        time: previous.time + segment.time,
        pattern: chooseOperatingPattern(previous.lineId, mergedStations),
      };
      continue;
    }

    normalized.push(segment);
  }

  return normalized;
}

function isDuplicateRoute(routes: Route[], newRoute: Route): boolean {
  const newSignature = getRouteSignature(newRoute);
  return routes.some(route => getRouteSignature(route) === newSignature);
}

function getRouteSignature(route: Route) {
  const normalizedParts: string[] = [];
  let pendingRide:
    | {
        lineId: string;
        from: string;
        to: string;
        terminus: string;
      }
    | null = null;

  const flushRide = () => {
    if (!pendingRide) return;
    normalizedParts.push([
      "ride",
      pendingRide.lineId,
      pendingRide.from,
      pendingRide.to,
      pendingRide.terminus,
    ].join(":"));
    pendingRide = null;
  };

  route.segments.forEach(segment => {
    if (segment.isTransfer) {
      flushRide();
      normalizedParts.push(`transfer:${segment.fromStation.name}:${segment.lineId}`);
      return;
    }

    if (
      pendingRide &&
      pendingRide.lineId === segment.lineId &&
      pendingRide.to === segment.fromStation.name
    ) {
      pendingRide.to = segment.toStation.name;
      pendingRide.terminus = segment.pattern?.terminus ?? pendingRide.terminus;
      return;
    }

    flushRide();
    pendingRide = {
      lineId: segment.lineId,
      from: segment.fromStation.name,
      to: segment.toStation.name,
      terminus: segment.pattern?.terminus ?? "",
    };
  });

  flushRide();

  return normalizedParts.join("|");
}

function dijkstra(fromStations: Station[], toStations: Station[], mode: SearchMode): Route | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, PreviousStep | null>();
  const transferCount = new Map<string, number>();
  const pq = new PriorityQueue<string>();
  const toIds = new Set(toStations.map(s => s.id));

  // 출발역들 초기화
  fromStations.forEach(station => {
    const stateKey = makeStateKey(station.id, "");
    dist.set(stateKey, 0);
    prev.set(stateKey, null);
    transferCount.set(stateKey, 0);
    pq.enqueue(stateKey, 0);
  });

  while (!pq.isEmpty()) {
    const currentKey = pq.dequeue()!;
    const { stationId: currentStationId, lineId: currentLineId } = parseStateKey(currentKey);
    const currentDist = dist.get(currentKey) ?? Infinity;

    // 도착역 도달
    if (toIds.has(currentStationId)) {
      return reconstructRoute(currentKey, prev, dist);
    }

    const neighbors = adjacencyList.get(currentStationId) || [];
    for (const neighbor of neighbors) {
      const lineChanged = Boolean(currentLineId && neighbor.lineId !== currentLineId);
      const countsAsTransfer = neighbor.isTransfer || lineChanged;
      const currentStation = stationMap.get(currentStationId);
      const implicitTransferDetails = countsAsTransfer && !neighbor.isTransfer && currentStation
        ? getTransferDetails(currentStation.name, currentLineId, neighbor.lineId)
        : { time: TRANSFER_TIME };
      const transferTime = countsAsTransfer
        ? neighbor.isTransfer ? neighbor.time : implicitTransferDetails.time
        : 0;
      const transferSeconds = countsAsTransfer
        ? neighbor.isTransfer ? neighbor.transferSeconds : implicitTransferDetails.transferSeconds
        : undefined;
      const transferDistanceMeters = countsAsTransfer
        ? neighbor.isTransfer ? neighbor.transferDistanceMeters : implicitTransferDetails.transferDistanceMeters
        : undefined;
      const searchTransferPenalty = countsAsTransfer
        ? getLineChangePenalty(currentLineId, neighbor.lineId)
        : 0;
      let weight = neighbor.isTransfer
        ? transferTime + searchTransferPenalty
        : neighbor.time + transferTime + searchTransferPenalty;
      const currentTransfers = transferCount.get(currentKey) ?? 0;
      const newTransfers = currentTransfers + (countsAsTransfer ? 1 : 0);

      // 모드별 가중치 조정
      if (mode === 'fewest-transfers' && countsAsTransfer) {
        weight += 15; // 환승에 높은 페널티
      } else if (mode === 'least-walking' && countsAsTransfer) {
        weight += 8; // 도보(환승)에 중간 페널티
      }

      const newDist = currentDist + weight;
      const nextKey = makeStateKey(neighbor.to, neighbor.lineId);
      const existingDist = dist.get(nextKey) ?? Infinity;

      if (newDist < existingDist) {
        dist.set(nextKey, newDist);
        prev.set(nextKey, {
          prevKey: currentKey,
          lineId: neighbor.lineId,
          isTransfer: neighbor.isTransfer,
          lineChanged: lineChanged && !neighbor.isTransfer,
          transferTime,
          transferSeconds,
          transferDistanceMeters,
        });
        transferCount.set(nextKey, newTransfers);
        pq.enqueue(nextKey, newDist);
      }
    }
  }

  return null;
}

function reconstructRoute(
  endKey: string,
  prev: Map<string, PreviousStep | null>,
  dist: Map<string, number>
): Route {
  const path: PathNode[] = [];
  let current: string | null = endKey;

  while (current) {
    const prevNode = prev.get(current);
    if (!prevNode) break;
    const { stationId } = parseStateKey(current);
    path.unshift({
      stationId,
      lineId: prevNode.lineId,
      isTransfer: prevNode.isTransfer,
      lineChanged: prevNode.lineChanged,
      transferTime: prevNode.transferTime,
      transferSeconds: prevNode.transferSeconds,
      transferDistanceMeters: prevNode.transferDistanceMeters,
    });
    current = prevNode.prevKey;
  }

  // 첫 번째 역 추가
  if (current) {
    const { stationId } = parseStateKey(current);
    const firstStation = stationMap.get(stationId);
    if (firstStation) {
      path.unshift({
        stationId,
        lineId: path[0]?.lineId ?? getStationEffectiveLineId(firstStation),
        isTransfer: false,
        lineChanged: false,
        transferTime: 0,
      });
    }
  }

  // 세그먼트 구축
  const segments: RouteSegment[] = [];
  let currentSegmentStations: Station[] = [];
  let currentLine = '';
  const pushRideSegment = () => {
    if (currentSegmentStations.length <= 1) return;
    const line = lineMap.get(currentLine)!;
    segments.push({
      fromStation: currentSegmentStations[0],
      toStation: currentSegmentStations[currentSegmentStations.length - 1],
      lineId: currentLine,
      lineName: line?.name || currentLine,
      lineColor: line?.color || '#888',
      stations: [...currentSegmentStations],
      time: (currentSegmentStations.length - 1) * (getLineDefaultTime(currentLine)),
      isTransfer: false,
      pattern: chooseOperatingPattern(currentLine, currentSegmentStations),
    });
  };

  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    const station = stationMap.get(node.stationId)!;

    if (i === 0) {
      currentLine = node.lineId;
      currentSegmentStations.push(station);
      continue;
    }

    if (node.isTransfer) {
      // 현재 세그먼트 마무리
      pushRideSegment();

      // 환승 세그먼트
      const prevStation = currentSegmentStations[currentSegmentStations.length - 1] || station;
      segments.push({
        fromStation: prevStation,
        toStation: station,
        lineId: node.lineId,
        lineName: '환승',
        lineColor: '#888',
        stations: [prevStation, station],
        time: node.transferTime || TRANSFER_TIME,
        isTransfer: true,
        transferSeconds: node.transferSeconds,
        transferDistanceMeters: node.transferDistanceMeters,
      });

      currentLine = node.lineId;
      currentSegmentStations = [station];
    } else if (node.lineChanged || node.lineId !== currentLine) {
      pushRideSegment();

      const prevStation = currentSegmentStations[currentSegmentStations.length - 1] || station;
      // 같은 노선의 일반↔급행 전환은 "환승"이 아니라 열차 갈아타기(같은 역에서 다른 종류 탑승)다.
      const sameBaseLineSwitch =
        getBaseLineId(node.lineId) === getBaseLineId(currentLine) && node.lineId !== currentLine;
      const switchLabel = sameBaseLineSwitch
        ? isExpressLineId(node.lineId)
          ? '급행 탑승'
          : '일반 탑승'
        : '환승';
      const switchColor = sameBaseLineSwitch
        ? lineMap.get(node.lineId)?.color || '#888'
        : '#888';
      segments.push({
        fromStation: prevStation,
        toStation: prevStation,
        lineId: node.lineId,
        lineName: switchLabel,
        lineColor: switchColor,
        stations: [prevStation, prevStation],
        time: node.transferTime || TRANSFER_TIME,
        isTransfer: true,
        // 같은 노선 일반↔급행은 같은 역에서 열차만 바꿔 타는 것이라 환승 횟수에 넣지 않는다.
        isTrainChange: sameBaseLineSwitch,
        transferSeconds: node.transferSeconds,
        transferDistanceMeters: node.transferDistanceMeters,
      });

      currentLine = node.lineId;
      currentSegmentStations = [prevStation, station];
    } else {
      currentSegmentStations.push(station);
    }
  }

  // 마지막 세그먼트
  pushRideSegment();

  return buildRouteFromSegments(segments);
}

// ──────────────────────────────────────────────────────────────────────────
// 시간/패턴 인지 경로 탐색 (운행계통·막차 반영)
// 상태 = (역, 노선, 운행패턴). 비용은 도착 "시각(서비스분)" 기반으로,
// 막차가 지난 구간은 아예 이동 불가가 되어 결과에 반영된다.
// ──────────────────────────────────────────────────────────────────────────

const TIMED_SEPARATOR = "|";

function makeTimedKey(stationId: string, lineId: string, patternId: string) {
  return `${stationId}${TIMED_SEPARATOR}${lineId}${TIMED_SEPARATOR}${patternId}`;
}

function parseTimedKey(key: string) {
  const [stationId, lineId, patternId] = key.split(TIMED_SEPARATOR);
  return { stationId, lineId: lineId ?? "", patternId: patternId ?? "" };
}

interface TimedPrev {
  prevKey: string;
  lineId: string;
  patternId: string;
  isTransfer: boolean;
  isTrainChange: boolean;
  lineChanged: boolean;
  transferTime: number;
  transferSeconds?: number;
  transferDistanceMeters?: number;
  boardWaitMin: number;
}

interface TimedPathNode {
  stationId: string;
  lineId: string;
  patternId: string;
  isTransfer: boolean;
  isTrainChange: boolean;
  lineChanged: boolean;
  transferTime: number;
  transferSeconds?: number;
  transferDistanceMeters?: number;
  boardWaitMin: number;
}

/** 출발/도착(또는 경유)역이 운행계통 스케줄이 있는 노선(현재 4호선)에 속하는지. */
export function involvesScheduledLine(...stationNames: (string | undefined | null)[]): boolean {
  return stationNames.some(name => {
    if (!name) return false;
    return (stationsByName.get(name) ?? []).some(station =>
      hasServiceSchedule(getBaseLineId(station.lineId)),
    );
  });
}

export function findRoutesTimed(
  fromStations: Station[],
  toStations: Station[],
  departAt: Date,
  dayTypeOverride?: DayType,
): Route[] {
  const departMin = toServiceMinute(departAt);
  const dayType = dayTypeOverride ?? getScheduleDayType(departAt);

  const candidates: Route[] = [];
  const fastest = dijkstraTimed(fromStations, toStations, departMin, dayType, "fastest");
  if (fastest) candidates.push(fastest);

  const fewest = dijkstraTimed(fromStations, toStations, departMin, dayType, "fewest-transfers");
  if (fewest) candidates.push(fewest);

  const sorted = sortRoutesByUsefulness(
    dedupeRoutes(candidates.filter(route => route.segments.length > 0)),
  );
  if (sorted.length === 0) return [];

  // 비-스케줄 노선은 대기 모델링이 없어 우회 경로가 부당하게 빨라 보일 수 있다.
  // 기존 엔진과 동일한 유용성 기준으로 best 대비 도움 안 되는 우회는 버린다.
  const [best, ...rest] = sorted;
  return [best, ...rest.filter(route => isUsefulAlternativeRoute(route, best))].slice(
    0,
    MAX_ROUTE_CANDIDATES,
  );
}

function dijkstraTimed(
  fromStations: Station[],
  toStations: Station[],
  departMin: number,
  dayType: DayType,
  mode: SearchMode,
): Route | null {
  const dist = new Map<string, number>();
  const arrive = new Map<string, number>();
  const prev = new Map<string, TimedPrev | null>();
  const pq = new PriorityQueue<string>();
  const visited = new Set<string>();
  const toIds = new Set(toStations.map(s => s.id));

  fromStations.forEach(station => {
    const key = makeTimedKey(station.id, "", "");
    dist.set(key, 0);
    arrive.set(key, departMin);
    prev.set(key, null);
    pq.enqueue(key, 0);
  });

  const relax = (
    nextKey: string,
    newDist: number,
    newArrive: number,
    step: TimedPrev,
  ) => {
    if (newDist < (dist.get(nextKey) ?? Infinity)) {
      dist.set(nextKey, newDist);
      arrive.set(nextKey, newArrive);
      prev.set(nextKey, step);
      pq.enqueue(nextKey, newDist);
    }
  };

  while (!pq.isEmpty()) {
    const currentKey = pq.dequeue()!;
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    const { stationId, lineId: curLine, patternId: curPat } = parseTimedKey(currentKey);
    const curDist = dist.get(currentKey) ?? Infinity;
    const curArrive = arrive.get(currentKey) ?? departMin;

    if (toIds.has(stationId)) {
      return reconstructTimedRoute(currentKey, prev, departMin, arrive);
    }

    const curStation = stationMap.get(stationId);
    const neighbors = adjacencyList.get(stationId) || [];

    for (const neighbor of neighbors) {
      // 노선 환승 엣지
      if (neighbor.isTransfer) {
        const transferTime = neighbor.time;
        let weight = transferTime + getLineChangePenalty(curLine, neighbor.lineId);
        if (mode === "fewest-transfers") weight += 15;
        else if (mode === "least-walking") weight += 8;
        const nextKey = makeTimedKey(neighbor.to, neighbor.lineId, "");
        relax(nextKey, curDist + weight, curArrive + transferTime, {
          prevKey: currentKey,
          lineId: neighbor.lineId,
          patternId: "",
          isTransfer: true,
          isTrainChange: false,
          lineChanged: false,
          transferTime,
          transferSeconds: neighbor.transferSeconds,
          transferDistanceMeters: neighbor.transferDistanceMeters,
          boardWaitMin: 0,
        });
        continue;
      }

      const toStation = stationMap.get(neighbor.to);
      if (!curStation || !toStation) continue;
      // 스케줄 노선은 역간 주행시간을 스케줄과 동일한 minPerStation으로 맞춘다.
      // (엣지시간 2.5 vs 스케줄 2.65 불일치로 "한 정거장 거슬러 올라가 먼저 타기"가
      //  공짜처럼 계산돼 역주행 우회가 생기는 것을 방지)
      const rideMin = hasServiceSchedule(neighbor.lineId)
        ? getLineMinPerStation(neighbor.lineId)
        : neighbor.time;

      if (hasServiceSchedule(neighbor.lineId)) {
        // 1) 이미 탄 열차로 계속 주행 (운행구간 안이면 대기 없음)
        if (
          curPat &&
          curLine === neighbor.lineId &&
          patternCoversStep(neighbor.lineId, curPat, curStation.index, toStation.index)
        ) {
          const nextKey = makeTimedKey(neighbor.to, neighbor.lineId, curPat);
          relax(nextKey, curDist + rideMin, curArrive + rideMin, {
            prevKey: currentKey,
            lineId: neighbor.lineId,
            patternId: curPat,
            isTransfer: false,
            isTrainChange: false,
            lineChanged: false,
            transferTime: 0,
            boardWaitMin: 0,
          });
        }

        // 2) 새로 탑승(또는 다른 행선지 열차로 갈아타기). 막차 지난 패턴은 제외됨.
        const options = getBoardOptions(
          neighbor.lineId,
          curStation.index,
          toStation.index,
          curArrive,
          dayType,
        );
        for (const opt of options) {
          // 같은 열차 계속 주행은 위(1)에서 이미 처리
          if (opt.patternId === curPat && curLine === neighbor.lineId) continue;
          const isTrainChange = curPat !== "" && curLine === neighbor.lineId;
          // 같은 노선에서 진행 방향을 반대로 뒤집는 열차 갈아타기는 금지한다.
          // (선형 노선에서 거슬러 갔다 돌아오는 비현실적 우회를 막음)
          if (
            isTrainChange &&
            getPatternDirection(neighbor.lineId, opt.patternId) !==
              getPatternDirection(neighbor.lineId, curPat)
          ) {
            continue;
          }
          let weight = opt.waitMin + rideMin;
          if (mode === "fewest-transfers" && isTrainChange) weight += 8;
          const nextKey = makeTimedKey(neighbor.to, neighbor.lineId, opt.patternId);
          relax(nextKey, curDist + weight, curArrive + opt.waitMin + rideMin, {
            prevKey: currentKey,
            lineId: neighbor.lineId,
            patternId: opt.patternId,
            isTransfer: false,
            isTrainChange,
            lineChanged: false,
            transferTime: isTrainChange ? opt.waitMin : 0,
            boardWaitMin: opt.waitMin,
          });
        }
        continue;
      }

      // 스케줄 없는 노선: 기존 동작과 동일(대기 모델링 없음)
      const lineChanged = Boolean(curLine && neighbor.lineId !== curLine);
      const implicit = lineChanged && curStation
        ? getTransferDetails(curStation.name, curLine, neighbor.lineId)
        : { time: 0 as number, transferSeconds: undefined as number | undefined, transferDistanceMeters: undefined as number | undefined };
      const transferTime = lineChanged ? implicit.time : 0;
      let weight = rideMin + transferTime + (lineChanged ? getLineChangePenalty(curLine, neighbor.lineId) : 0);
      if (mode === "fewest-transfers" && lineChanged) weight += 15;
      else if (mode === "least-walking" && lineChanged) weight += 8;
      const nextKey = makeTimedKey(neighbor.to, neighbor.lineId, "");
      relax(nextKey, curDist + weight, curArrive + transferTime + rideMin, {
        prevKey: currentKey,
        lineId: neighbor.lineId,
        patternId: "",
        isTransfer: false,
        isTrainChange: false,
        lineChanged,
        transferTime,
        transferSeconds: implicit.transferSeconds,
        transferDistanceMeters: implicit.transferDistanceMeters,
        boardWaitMin: 0,
      });
    }
  }

  return null;
}

function getStationNameByIndex(lineId: string, index: number): string {
  const stations = getStationsByLine(getBaseLineId(lineId));
  const exact = stations.find(s => s.index === index);
  return exact?.name ?? "";
}

function buildTimedPattern(lineId: string, patternId: string): OperatingPattern | undefined {
  if (!patternId) return undefined;
  const info = getPatternById(lineId, patternId);
  if (!info) return undefined;
  return {
    id: patternId,
    branches: [],
    terminus: getStationNameByIndex(lineId, info.terminusIndex),
    label: info.label,
  };
}

function reconstructTimedRoute(
  endKey: string,
  prev: Map<string, TimedPrev | null>,
  departMin: number,
  arrive: Map<string, number>,
): Route {
  const path: TimedPathNode[] = [];
  let current: string | null = endKey;

  while (current) {
    const step = prev.get(current);
    if (!step) break;
    const { stationId } = parseTimedKey(current);
    path.unshift({
      stationId,
      lineId: step.lineId,
      patternId: step.patternId,
      isTransfer: step.isTransfer,
      isTrainChange: step.isTrainChange,
      lineChanged: step.lineChanged,
      transferTime: step.transferTime,
      transferSeconds: step.transferSeconds,
      transferDistanceMeters: step.transferDistanceMeters,
      boardWaitMin: step.boardWaitMin,
    });
    current = step.prevKey;
  }

  // 첫 역
  if (current) {
    const { stationId } = parseTimedKey(current);
    const firstStation = stationMap.get(stationId);
    if (firstStation) {
      path.unshift({
        stationId,
        lineId: path[0]?.lineId ?? getStationEffectiveLineId(firstStation),
        patternId: path[0]?.patternId ?? "",
        isTransfer: false,
        isTrainChange: false,
        lineChanged: false,
        transferTime: 0,
        boardWaitMin: 0,
      });
    }
  }

  const segments: RouteSegment[] = [];
  let segStations: Station[] = [];
  let curLine = "";
  let curPat = "";
  let curBoardWait = 0;

  const pushRide = () => {
    if (segStations.length <= 1) return;
    const line = lineMap.get(curLine);
    segments.push({
      fromStation: segStations[0],
      toStation: segStations[segStations.length - 1],
      lineId: curLine,
      lineName: line?.name || curLine,
      lineColor: line?.color || "#888",
      stations: [...segStations],
      time: (segStations.length - 1) * getLineDefaultTime(curLine),
      isTransfer: false,
      pattern: buildTimedPattern(curLine, curPat) ?? chooseOperatingPattern(curLine, segStations),
      boardWaitSeconds: curBoardWait > 0 ? Math.round(curBoardWait * 60) : undefined,
    });
  };

  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    const station = stationMap.get(node.stationId)!;

    if (i === 0) {
      curLine = node.lineId;
      curPat = node.patternId;
      segStations.push(station);
      continue;
    }

    if (node.isTransfer) {
      pushRide();
      const prevStation = segStations[segStations.length - 1] || station;
      segments.push({
        fromStation: prevStation,
        toStation: station,
        lineId: node.lineId,
        lineName: "환승",
        lineColor: "#888",
        stations: [prevStation, station],
        time: node.transferTime || TRANSFER_TIME,
        isTransfer: true,
        transferSeconds: node.transferSeconds,
        transferDistanceMeters: node.transferDistanceMeters,
      });
      curLine = node.lineId;
      curPat = node.patternId;
      curBoardWait = 0;
      segStations = [station];
    } else if (node.isTrainChange) {
      // 같은 노선에서 다른 행선지 열차로 갈아타기 (같은 역, 승강장 대기)
      pushRide();
      const prevStation = segStations[segStations.length - 1] || station;
      const nextPattern = buildTimedPattern(node.lineId, node.patternId);
      segments.push({
        fromStation: prevStation,
        toStation: prevStation,
        lineId: node.lineId,
        lineName: nextPattern ? `${nextPattern.label} 갈아타기` : "열차 갈아타기",
        lineColor: lineMap.get(node.lineId)?.color || "#888",
        stations: [prevStation, prevStation],
        time: node.transferTime || 0,
        isTransfer: true,
        isTrainChange: true,
        transferSeconds: Math.round((node.boardWaitMin || 0) * 60),
      });
      curLine = node.lineId;
      curPat = node.patternId;
      curBoardWait = 0;
      segStations = [prevStation, station];
    } else if (node.lineChanged || node.lineId !== curLine) {
      pushRide();
      const prevStation = segStations[segStations.length - 1] || station;
      segments.push({
        fromStation: prevStation,
        toStation: prevStation,
        lineId: node.lineId,
        lineName: "환승",
        lineColor: "#888",
        stations: [prevStation, prevStation],
        time: node.transferTime || TRANSFER_TIME,
        isTransfer: true,
        transferSeconds: node.transferSeconds,
        transferDistanceMeters: node.transferDistanceMeters,
      });
      curLine = node.lineId;
      curPat = node.patternId;
      curBoardWait = 0;
      segStations = [prevStation, station];
    } else {
      if (segStations.length === 1) curBoardWait = node.boardWaitMin;
      curPat = node.patternId || curPat;
      segStations.push(station);
    }
  }

  pushRide();

  const rideSegments = segments.filter(s => !s.isTransfer);
  const stationCount = rideSegments.reduce((sum, s) => sum + s.stations.length - 1, 0);
  // 노선 환승(열차 갈아타기 제외)만 환승 횟수로 집계
  const transferCount = segments.filter(s => s.isTransfer && !s.isTrainChange).length;
  const walkTime = segments
    .filter(s => s.isTransfer && !s.isTrainChange)
    .reduce((sum, s) => sum + s.time, 0);
  const endArrive = arrive.get(endKey) ?? departMin;

  return {
    segments,
    totalTime: Math.max(0, Math.round(endArrive - departMin)),
    transferCount,
    stationCount,
    fare: calculateFare(getFareStationCount(segments)) + getSurchargeTotal(segments),
    walkTime,
  };
}

function getLineDefaultTime(lineId: string): number {
  // 급행/특급/직통은 정차역 간 평균 소요시간을 사용
  if (lineId in EXPRESS_HOP_MINUTES) return EXPRESS_HOP_MINUTES[lineId];
  const times: Record<string, number> = {
    "1": 2.5, "2": 2, "2-seongsu": 2, "2-sinjeong": 2, "3": 2.5, "4": 2.5, "5": 2.5,
    "6": 2, "7": 2.5, "8": 2.5, "9": 2,
    "gyeongui": 3, "airport": 4, "shinbundang": 2.5,
    "gyeongchun": 3.5, "suinbundang": 2.5, "ui": 2,
    "incheon1": 2.5, "incheon2": 2.5, "gimpo": 2,
    "seohaeline": 3, "sinlim": 2, "gtxa": 5,
  };
  return times[lineId] || 2.5;
}

function calculateFare(stationCount: number): number {
  if (stationCount <= 10) return 1400;
  if (stationCount <= 40) return 1400 + Math.ceil((stationCount - 10) / 5) * 100;
  return 1400 + 600 + Math.ceil((stationCount - 40) / 8) * 100;
}

/**
 * 요금 산정용 역 간격 수.
 * 요금은 정차역 수가 아니라 이동 거리(역 간격) 기준이므로, 급행처럼 일부 역을 통과해
 * 정차역만 담긴 구간은 stations 길이로 거리를 과소평가한다. 이 경우 실제 통과한
 * 역 간격(노선 내 인덱스 차)으로 환산해 일반열차와 동일한 거리 요금을 적용한다.
 */
function getFareStationCount(segments: RouteSegment[]): number {
  return segments
    .filter(segment => !segment.isTransfer)
    .reduce((sum, segment) => {
      if (isExpressLineId(segment.lineId)) {
        return sum + Math.abs(segment.toStation.index - segment.fromStation.index);
      }
      return sum + segment.stations.length - 1;
    }, 0);
}

/**
 * 별도운임 노선의 평균 역간거리(km).
 * metroData에 실거리 정보가 없어 "탑승 정거장 수 → 거리"를 환산하기 위한 근사치이다.
 * (해당 노선 전 구간 영업거리 ÷ 역 간격 수로 산출)
 */
const AVG_KM_PER_STATION: Record<string, number> = {
  shinbundang: 2.2, // 신사~광교 약 33km / 15구간
  gtxa: 9.0, // 운정~동탄 약 80km / 9구간
};

/**
 * 별도운임 노선의 탑승 거리(km 근사)에 따른 추가운임(원).
 * 실거리 데이터가 없어 정거장 수 기반 거리 환산으로 거리비례를 근사한다.
 * 값은 실제 운임표 근사치이며 상수로 분리해 두어 조정하기 쉽도록 했다.
 */
function getLineSurcharge(baseLineId: string, stopsOnLine: number): number {
  if (stopsOnLine <= 0) return 0;
  const km = (AVG_KM_PER_STATION[baseLineId] ?? 0) * stopsOnLine;
  switch (baseLineId) {
    case "shinbundang":
      // 신분당선 별도운임: 10km 이내 1,000원, 초과 시 1,400원 (근사)
      return km <= 10 ? 1000 : 1400;
    case "gtxa":
      // GTX-A 별도운임(거리비례 근사): 기본 1,600원(10km) + 5km마다 250원
      return 1600 + Math.max(0, Math.ceil((km - 10) / 5)) * 250;
    default:
      return 0;
  }
}

/**
 * 경로에 포함된 별도운임 노선들의 추가운임 합계.
 * 노선별로 실제 탑승 정거장 수를 합산해 거리비례 추가운임을 1회씩 더한다.
 */
function getSurchargeTotal(segments: RouteSegment[]): number {
  const stopsByLine = new Map<string, number>();
  segments
    .filter(segment => !segment.isTransfer)
    .forEach(segment => {
      const baseLineId = getBaseLineId(segment.lineId);
      if (!(baseLineId in AVG_KM_PER_STATION)) return;
      const stops = segment.stations.length - 1;
      stopsByLine.set(baseLineId, (stopsByLine.get(baseLineId) ?? 0) + stops);
    });

  let total = 0;
  stopsByLine.forEach((stops, baseLineId) => {
    total += getLineSurcharge(baseLineId, stops);
  });
  return total;
}

/**
 * 역 이름 검색 (자동완성용)
 */
export function searchStations(query: string): { name: string; lines: Line[] }[] {
  if (!query.trim()) return [];
  
  const results: { name: string; lines: Line[] }[] = [];
  const seen = new Set<string>();

  stationsByName.forEach((stations, name) => {
    if (name.includes(query) && !seen.has(name)) {
      seen.add(name);
      const lines = stations
        .map(s => lineMap.get(s.lineId))
        .filter((l): l is Line => !!l);
      results.push({ name, lines });
    }
  });

  // 정확히 일치하는 것을 먼저
  results.sort((a, b) => {
    if (a.name === query) return -1;
    if (b.name === query) return 1;
    if (a.name.startsWith(query) && !b.name.startsWith(query)) return -1;
    if (!a.name.startsWith(query) && b.name.startsWith(query)) return 1;
    return a.name.length - b.name.length;
  });

  return results.slice(0, 15);
}

/**
 * 역 정보 조회
 */
export function getStationInfo(name: string): Station[] {
  return stationsByName.get(name) || [];
}

/**
 * 노선 정보 조회
 */
export function getLineInfo(lineId: string): Line | undefined {
  return lineMap.get(lineId);
}

/**
 * 모든 노선 목록
 */
export function getAllLines(): Line[] {
  return metroData.lines as Line[];
}

/**
 * 특정 노선의 모든 역
 */
export function getStationsByLine(lineId: string): Station[] {
  const virtualStationIds = VIRTUAL_LINE_STATION_IDS[lineId];
  if (virtualStationIds) {
    return virtualStationIds
      .map(id => stationMap.get(id))
      .filter((station): station is Station => Boolean(station));
  }

  return (metroData.stations as Station[])
    .filter(s => s.lineId === lineId)
    .filter(s => lineId !== "2" || s.branch === "본선")
    .sort((a, b) => a.index - b.index);
}

/**
 * 노선의 급행/특급 정차역 이름 집합.
 * 실시간 열차의 directAt(급행여부)로 "이 급행이 어느 역을 통과하는지" 안내할 때 사용.
 * @param lineId 본 노선 또는 급행 가상 노선 ID
 * @param kind   "급행" | "특급" (실시간 trainType)
 * @returns 정차역 이름 Set. 해당 종류 급행이 없거나, 한 노선에 서로 다른 정차패턴이 여럿이라
 *          어느 패턴인지 단정할 수 없으면 null(=통과역을 특정하지 않음).
 */
export function getExpressStopNames(lineId: string, kind: string): Set<string> | null {
  const baseLineId = getBaseLineId(lineId);
  const matches = EXPRESS_SERVICES.filter(
    service => service.base === baseLineId && service.kind === kind,
  );
  if (matches.length === 0) return null;

  // 같은 노선에 서로 다른 정차패턴이 여럿이면(예: 1호선 경인/경부 급행) 모호하므로 특정하지 않는다.
  const signatures = new Set(matches.map(service => [...service.stationIds].sort().join("|")));
  if (signatures.size > 1) return null;

  const names = new Set<string>();
  matches[0].stationIds.forEach(id => {
    const station = stationMap.get(id);
    if (station) names.add(station.name);
  });
  return names;
}

/**
 * 현재 시간 기준 도착 예정 시간 계산
 */
export function calculateArrivalTime(totalMinutes: number): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + totalMinutes);
  return now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
}
