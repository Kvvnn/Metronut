/**
 * 지하철 경로 검색 알고리즘
 * 다익스트라 기반 최단시간/최소환승/도보적은 경로 탐색
 */

import metroData from '@/data/metroData.json';

export interface Station {
  id: string;
  name: string;
  code: string;
  lineId: string;
  transfers: string[];
  index: number;
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
const adjacencyList = new Map<string, { to: string; lineId: string; time: number; isTransfer: boolean }[]>();

// 초기화
function initializeGraph() {
  // 노선 맵
  metroData.lines.forEach((line: Line) => {
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
    if (!adjacencyList.has(edge.from)) {
      adjacencyList.set(edge.from, []);
    }
    adjacencyList.get(edge.from)!.push({
      to: edge.to,
      lineId: edge.lineId,
      time: edge.time,
      isTransfer: false,
    });
  });

  // 환승 엣지 추가
  metroData.transfers.forEach((transfer: Transfer) => {
    if (!adjacencyList.has(transfer.from)) {
      adjacencyList.set(transfer.from, []);
    }
    adjacencyList.get(transfer.from)!.push({
      to: transfer.to,
      lineId: transfer.toLine,
      time: transfer.time,
      isTransfer: true,
    });
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

function isDuplicateRoute(routes: Route[], newRoute: Route): boolean {
  return routes.some(r => 
    r.totalTime === newRoute.totalTime && 
    r.transferCount === newRoute.transferCount &&
    r.stationCount === newRoute.stationCount
  );
}

function dijkstra(fromStations: Station[], toStations: Station[], mode: SearchMode): Route | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, { stationId: string; lineId: string; isTransfer: boolean } | null>();
  const transferCount = new Map<string, number>();
  const pq = new PriorityQueue<string>();
  const toIds = new Set(toStations.map(s => s.id));

  // 출발역들 초기화
  fromStations.forEach(station => {
    dist.set(station.id, 0);
    prev.set(station.id, null);
    transferCount.set(station.id, 0);
    pq.enqueue(station.id, 0);
  });

  while (!pq.isEmpty()) {
    const current = pq.dequeue()!;
    const currentDist = dist.get(current) ?? Infinity;

    // 도착역 도달
    if (toIds.has(current)) {
      return reconstructRoute(current, prev, dist);
    }

    const neighbors = adjacencyList.get(current) || [];
    for (const neighbor of neighbors) {
      let weight = neighbor.time;
      const currentTransfers = transferCount.get(current) ?? 0;
      const newTransfers = currentTransfers + (neighbor.isTransfer ? 1 : 0);

      // 모드별 가중치 조정
      if (mode === 'fewest-transfers' && neighbor.isTransfer) {
        weight += 15; // 환승에 높은 페널티
      } else if (mode === 'least-walking' && neighbor.isTransfer) {
        weight += 8; // 도보(환승)에 중간 페널티
      }

      const newDist = currentDist + weight;
      const existingDist = dist.get(neighbor.to) ?? Infinity;

      if (newDist < existingDist) {
        dist.set(neighbor.to, newDist);
        prev.set(neighbor.to, { stationId: current, lineId: neighbor.lineId, isTransfer: neighbor.isTransfer });
        transferCount.set(neighbor.to, newTransfers);
        pq.enqueue(neighbor.to, newDist);
      }
    }
  }

  return null;
}

function reconstructRoute(
  endId: string,
  prev: Map<string, { stationId: string; lineId: string; isTransfer: boolean } | null>,
  dist: Map<string, number>
): Route {
  const path: { stationId: string; lineId: string; isTransfer: boolean }[] = [];
  let current: string | null = endId;

  while (current) {
    const prevNode = prev.get(current);
    if (!prevNode) break;
    path.unshift({ stationId: current, lineId: prevNode.lineId, isTransfer: prevNode.isTransfer });
    current = prevNode.stationId;
  }

  // 첫 번째 역 추가
  if (current) {
    const firstStation = stationMap.get(current);
    if (firstStation) {
      path.unshift({ stationId: current, lineId: firstStation.lineId, isTransfer: false });
    }
  }

  // 세그먼트 구축
  const segments: RouteSegment[] = [];
  let currentSegmentStations: Station[] = [];
  let currentLine = '';
  let segmentStartIdx = 0;

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
      if (currentSegmentStations.length > 0) {
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
        });
      }

      // 환승 세그먼트
      const prevStation = currentSegmentStations[currentSegmentStations.length - 1] || station;
      segments.push({
        fromStation: prevStation,
        toStation: station,
        lineId: node.lineId,
        lineName: '환승',
        lineColor: '#888',
        stations: [prevStation, station],
        time: 3,
        isTransfer: true,
      });

      currentLine = node.lineId;
      currentSegmentStations = [station];
    } else {
      if (node.lineId !== currentLine && currentSegmentStations.length > 0) {
        // 노선 변경 (환승 아닌 경우)
        currentLine = node.lineId;
      }
      currentSegmentStations.push(station);
    }
  }

  // 마지막 세그먼트
  if (currentSegmentStations.length > 1) {
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
    });
  }

  const nonTransferSegments = segments.filter(s => !s.isTransfer);
  const totalTime = Math.round(segments.reduce((sum, s) => sum + s.time, 0));
  const transferCountVal = segments.filter(s => s.isTransfer).length;
  const stationCount = nonTransferSegments.reduce((sum, s) => sum + s.stations.length - 1, 0);
  const fare = calculateFare(stationCount);
  const walkTime = transferCountVal * 3;

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
    "1": 2.5, "2": 2, "3": 2.5, "4": 2.5, "5": 2.5,
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
  return (metroData.stations as Station[])
    .filter(s => s.lineId === lineId)
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
