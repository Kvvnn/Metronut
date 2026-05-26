/**
 * 첫차/막차 시간 계산
 *
 * baseline JSON은 각 노선의 종착역(상행/하행)에서 출발하는 시각을 정의한다.
 * 특정 역의 도착 시각은 종착역까지의 거리 × 역간 평균 분을 더해 추정한다.
 *
 * 분기/지선/급행 등 세부 운행 패턴은 평균화. 참고용 값으로만 사용.
 */
import firstLastData from "@/data/firstLastTrain.json";
import { getStationsByLine } from "@/lib/pathfinder";

export type DayType = "weekday" | "weekend";

interface LineSchedule {
  name: string;
  minPerStation: number;
  weekday: { downFirst: string; downLast: string; upFirst: string; upLast: string };
  weekend: { downFirst: string; downLast: string; upFirst: string; upLast: string };
}

const linesData = (firstLastData as { lines: Record<string, LineSchedule> }).lines;

export interface FirstLastForStation {
  /** 하행 (인덱스 증가 방향, 보통 종착역명) 첫차 */
  downFirst: string;
  /** 하행 막차 */
  downLast: string;
  /** 상행 (인덱스 감소 방향) 첫차 */
  upFirst: string;
  /** 상행 막차 */
  upLast: string;
  /** 하행 종착역 이름 */
  downTerminus: string;
  /** 상행 종착역 이름 */
  upTerminus: string;
}

function parseHm(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function formatHm(totalMin: number): string {
  // 다음날 새벽 표시: 24:30 등 24시 표기 유지
  const t = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const display = totalMin >= 24 * 60 && totalMin < 25 * 60 ? totalMin : t;
  const h = Math.floor(display / 60);
  const m = display % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * 노선 + 역(이름) → 첫차/막차 (상행/하행) 시간.
 * dayType: 평일/주말 구분.
 * 분기/지선이 있는 노선(1·2·5)은 본선 기준으로 단순 추정.
 */
export function getFirstLastTrain(
  lineId: string,
  stationName: string,
  dayType: DayType = "weekday",
): FirstLastForStation | null {
  const schedule = linesData[lineId];
  if (!schedule) return null;

  const lineStations = getStationsByLine(lineId);
  if (lineStations.length === 0) return null;

  const idx = lineStations.findIndex(s => s.name === stationName);
  if (idx < 0) return null;

  const lastIdx = lineStations.length - 1;
  const minPerStation = schedule.minPerStation;
  const sched = schedule[dayType];

  // 하행 = 인덱스 0(또는 상행 종착)에서 출발 → 우리 역까지 idx개 정거장
  // 상행 = 인덱스 lastIdx에서 출발 → 우리 역까지 (lastIdx - idx)개 정거장
  const downOffset = idx * minPerStation;
  const upOffset = (lastIdx - idx) * minPerStation;

  return {
    downFirst: formatHm(parseHm(sched.downFirst) + downOffset),
    downLast: formatHm(parseHm(sched.downLast) + downOffset),
    upFirst: formatHm(parseHm(sched.upFirst) + upOffset),
    upLast: formatHm(parseHm(sched.upLast) + upOffset),
    downTerminus: lineStations[lastIdx]?.name ?? "",
    upTerminus: lineStations[0]?.name ?? "",
  };
}

export function getLineScheduleName(lineId: string): string | null {
  return linesData[lineId]?.name ?? null;
}
