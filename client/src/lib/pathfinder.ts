/**
 * 지하철 경로 검색 알고리즘
 * 다익스트라 기반 최단시간/최소환승/도보적은 경로 탐색
 */

import metroData from '@/data/metroData.json';
import { getOfficialTransferInfo } from '@/data/officialTransferTimes';

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
  /** 공식 환승 동선 초 단위 원자료. 없으면 기본 분 단위 추정값을 사용. */
  transferSeconds?: number;
  transferDistanceMeters?: number;
  /** 이 ride 구간에 적합한 운행 패턴 (예: '인천행'). transfer면 undefined */
  pattern?: OperatingPattern;
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
}

// 데이터 인덱싱
const stationMap = new Map<string, Station>();
const stationsByName = new Map<string, Station[]>();
const lineMap = new Map<string, Line>();
const adjacencyList = new Map<string, AdjacentEdge[]>();
const patternsByLine = new Map<string, OperatingPattern[]>();

const TRANSFER_TIME = 3;
export const LONG_TRANSFER_THRESHOLD_SECONDS = 240;
const STATE_SEPARATOR = "::";
const LONG_ACCESS_LINE_PENALTY: Record<string, number> = {
  airport: 8,
  gtxa: 12,
};
const VIRTUAL_LINE_TO_BASE: Record<string, string> = {
  "2-seongsu": "2",
  "2-sinjeong": "2",
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
];

const VIRTUAL_LINE_STATION_IDS: Record<string, string[]> = {
  "2-seongsu": ["2_210", "2_243", "2_244", "2_245", "2_246"],
  "2-sinjeong": ["2_233", "2_247", "2_248", "2_249", "2_250"],
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

  return {
    time: Math.max(1, Math.ceil(official.seconds / 60)),
    transferSeconds: official.seconds,
    transferDistanceMeters: official.distanceMeters,
  };
}

function getTransferTimeTotal(segments: RouteSegment[]) {
  return segments
    .filter(segment => segment.isTransfer)
    .reduce((sum, segment) => sum + segment.time, 0);
}

export function isLongTransferSegment(segment: Pick<RouteSegment, "time" | "transferSeconds">) {
  return (segment.transferSeconds ?? segment.time * 60) >= LONG_TRANSFER_THRESHOLD_SECONDS;
}

export function formatTransferDuration(segment: Pick<RouteSegment, "time" | "transferSeconds">) {
  if (!segment.transferSeconds) return `약 ${segment.time}분`;

  const minutes = Math.floor(segment.transferSeconds / 60);
  const seconds = segment.transferSeconds % 60;
  if (minutes === 0) return `${seconds}초`;
  if (seconds === 0) return `${minutes}분`;
  return `${minutes}분 ${seconds}초`;
}

// 한국어 자모 정렬용: 종착역이 현재 진행 방향에 있는지 보고 적합한 패턴 선택
function chooseOperatingPattern(
  lineId: string,
  segmentStations: Station[],
): OperatingPattern | undefined {
  if (segmentStations.length < 2) return undefined;
  const baseLineId = getBaseLineId(lineId);
  const patterns = patternsByLine.get(baseLineId);
  if (!patterns || patterns.length === 0) return undefined;

  const last = segmentStations[segmentStations.length - 1];
  // 이 ride 구간이 거치는 모든 분기 (보통 1~2개)
  const usedBranches = new Set<string>();
  segmentStations.forEach(s => {
    if (s.branch) usedBranches.add(s.branch);
  });

  // 1순위: 종착역이 패턴의 terminus와 일치
  const exactTerminus = patterns.filter(p => p.terminus === last.name);
  if (exactTerminus.length > 0) {
    const branchMatch = exactTerminus.find(p =>
      Array.from(usedBranches).every(b => p.branches.includes(b)),
    );
    if (branchMatch) return branchMatch;
    return exactTerminus[0];
  }

  // 2순위: 우리 사용 분기를 모두 포함하면서, 종착이 우리 마지막 역의 분기와 같은 패턴
  const lastBranch = last.branch;
  const candidates = patterns.filter(p =>
    Array.from(usedBranches).every(b => p.branches.includes(b)),
  );
  if (candidates.length === 0) return patterns[0];

  // 마지막 역의 분기와 같은 종착이 있는 패턴 우선
  if (lastBranch) {
    const sameBranchTerminus = candidates.find(p => {
      const termStation = stationsByName
        .get(p.terminus)
        ?.find(s => s.lineId === baseLineId);
      return termStation?.branch === lastBranch;
    });
    if (sameBranchTerminus) return sameBranchTerminus;
  }

  return candidates[0];
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
export function findRoutes(fromName: string, toName: string): Route[] {
  const fromStations = stationsByName.get(fromName);
  const toStations = stationsByName.get(toName);

  if (!fromStations || !toStations) return [];

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

  return routes;
}

export function findRoutesVia(fromName: string, viaName: string, toName: string): Route[] {
  if (!viaName || viaName === fromName || viaName === toName) {
    return findRoutes(fromName, toName);
  }

  const firstLegRoutes = findRoutes(fromName, viaName);
  const secondLegRoutes = findRoutes(viaName, toName);
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
    .sort((a, b) => {
      if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
      if (a.transferCount !== b.transferCount) return a.transferCount - b.transferCount;
      return a.stationCount - b.stationCount;
    })
    .slice(0, 3);
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

  const segments = [
    ...firstLeg.segments,
    ...bridgeSegments,
    ...secondLeg.segments,
  ];
  const transferCount = segments.filter(segment => segment.isTransfer).length;
  const stationCount = segments
    .filter(segment => !segment.isTransfer)
    .reduce((sum, segment) => sum + segment.stations.length - 1, 0);
  const transferTime = getTransferTimeTotal(segments);

  return {
    segments,
    totalTime: Math.round(segments.reduce((sum, segment) => sum + segment.time, 0)),
    transferCount,
    stationCount,
    fare: calculateFare(stationCount),
    walkTime: transferTime,
  };
}

function isDuplicateRoute(routes: Route[], newRoute: Route): boolean {
  return routes.some(r => 
    r.totalTime === newRoute.totalTime && 
    r.transferCount === newRoute.transferCount &&
    r.stationCount === newRoute.stationCount
  );
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
      segments.push({
        fromStation: prevStation,
        toStation: prevStation,
        lineId: node.lineId,
        lineName: '환승',
        lineColor: '#888',
        stations: [prevStation, prevStation],
        time: node.transferTime || TRANSFER_TIME,
        isTransfer: true,
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

  const nonTransferSegments = segments.filter(s => !s.isTransfer);
  const totalTime = Math.round(segments.reduce((sum, s) => sum + s.time, 0));
  const transferCountVal = segments.filter(s => s.isTransfer).length;
  const stationCount = nonTransferSegments.reduce((sum, s) => sum + s.stations.length - 1, 0);
  const fare = calculateFare(stationCount);
  const walkTime = getTransferTimeTotal(segments);

  return {
    segments,
    totalTime,
    transferCount: transferCountVal,
    stationCount,
    fare,
    walkTime,
  };
}

function getLineDefaultTime(lineId: string): number {
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
 * 현재 시간 기준 도착 예정 시간 계산
 */
export function calculateArrivalTime(totalMinutes: number): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + totalMinutes);
  return now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
}
