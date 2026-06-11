/**
 * Seoul Metro Realtime API Proxy
 * 
 * 서울교통공사 실시간 도착 정보 API를 서버 측에서 프록시합니다.
 * API 키를 서버 환경변수에 저장하여 클라이언트에 노출되지 않도록 합니다.
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";

const SEOUL_API_BASE = "http://swopenAPI.seoul.go.kr/api/subway";

// 지하철 ID → 노선 ID 매핑
function mapSubwayId(subwayId: string): string {
  const map: Record<string, string> = {
    "1001": "1",
    "1002": "2",
    "1003": "3",
    "1004": "4",
    "1005": "5",
    "1006": "6",
    "1007": "7",
    "1008": "8",
    "1009": "9",
    "1063": "gyeongui",
    "1065": "airport",
    "1077": "shinbundang",
    "1067": "gyeongchun",
    "1075": "suinbundang",
    "1092": "ui",
  };
  return map[subwayId] || subwayId;
}

// 시뮬레이션 도착 정보 생성 (API 키 없을 때)
function generateSimulatedArrivals(stationName: string) {
  const directions = [
    { direction: "상행", destinations: ["소요산", "대화", "당고개", "방화"] },
    { direction: "하행", destinations: ["인천", "오금", "오이도", "상일동"] },
  ];

  const arrivals: any[] = [];

  directions.forEach(dir => {
    const count = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < count; i++) {
      const minutes = Math.floor(Math.random() * 8) + 1;
      const dest = dir.destinations[Math.floor(Math.random() * dir.destinations.length)];
      arrivals.push({
        stationName,
        lineId: "2",
        direction: `${dest} 방면`,
        destination: dest,
        terminusId: "",
        terminusName: dest,
        isLastTrain: false,
        arrivalMessage: minutes <= 1 ? "곧 도착" : `${minutes}분 후`,
        arrivalTime: minutes * 60,
        trainType: Math.random() > 0.8 ? "급행" : "일반",
        currentStation: `${Math.floor(Math.random() * 3) + 1}정거장 전`,
      });
    }
  });

  return arrivals.sort((a: any, b: any) => a.arrivalTime - b.arrivalTime);
}

function parseApiError(data: any, fallbackMessage: string) {
  return {
    errorCode: String(data?.code ?? data?.status ?? "UNKNOWN"),
    errorMessage: String(data?.message ?? data?.errorMessage?.message ?? fallbackMessage).trim(),
  };
}

const REALTIME_STATION_NAME_ALIASES: Record<string, string> = {
  "4.19 민주묘지": "4.19민주묘지",
};

function normalizeRealtimeStationName(name: string) {
  return REALTIME_STATION_NAME_ALIASES[name] ?? name;
}

type MetroTrainPosition = {
  trainNo: string;
  stationName: string;
  updnLine: string;
  trainStatus: string;
  destination: string;
  receivedAt: string;
  receivedAtEpochMs?: number;
  receivedAtAgeSeconds?: number;
  isStale?: boolean;
  /** 급행여부 (directAt): 일반/급행/특급 */
  trainType: string;
};

const TRAIN_POSITION_STALE_AFTER_SECONDS = 180;
const TRAIN_POSITION_STALE_AFTER_MS = TRAIN_POSITION_STALE_AFTER_SECONDS * 1000;

// 서울교통공사 realtimePosition directAt: 0=일반, 1=급행, 7=특급
function mapTrainType(directAt: string): string {
  if (directAt === "1") return "급행";
  if (directAt === "7") return "특급";
  return "일반";
}

function getReceivedAtTime(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/,
  );
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    // Seoul Metro recptnDt is KST without a timezone suffix. Parse it as UTC+9
    // so staleness checks stay correct on UTC production hosts.
    return Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 9,
      Number(minute),
      Number(second),
    );
  }

  const timestamp = Date.parse(value.replace(" ", "T"));
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function preferNewerTrainPosition(current: MetroTrainPosition, next: MetroTrainPosition) {
  const currentTime = getReceivedAtTime(current.receivedAt);
  const nextTime = getReceivedAtTime(next.receivedAt);
  if (nextTime !== currentTime) return nextTime > currentTime ? next : current;
  if (!current.stationName && next.stationName) return next;
  if (!current.destination && next.destination) return next;
  return current;
}

function dedupeTrainPositions(positions: MetroTrainPosition[]) {
  const byTrainNo = new Map<string, MetroTrainPosition>();
  const withoutTrainNo: MetroTrainPosition[] = [];

  positions.forEach(position => {
    if (!position.trainNo) {
      withoutTrainNo.push(position);
      return;
    }

    const current = byTrainNo.get(position.trainNo);
    byTrainNo.set(
      position.trainNo,
      current ? preferNewerTrainPosition(current, position) : position,
    );
  });

  return Array.from(byTrainNo.values()).concat(withoutTrainNo);
}

function withPositionFreshness(positions: MetroTrainPosition[], now = Date.now()) {
  return positions.map(position => {
    const receivedAtEpochMs = getReceivedAtTime(position.receivedAt);
    const receivedAtAgeSeconds =
      receivedAtEpochMs > 0 ? Math.max(0, Math.floor((now - receivedAtEpochMs) / 1000)) : undefined;

    return {
      ...position,
      receivedAtEpochMs: receivedAtEpochMs || undefined,
      receivedAtAgeSeconds,
      isStale:
        receivedAtAgeSeconds !== undefined
          ? now - receivedAtEpochMs > TRAIN_POSITION_STALE_AFTER_MS
          : false,
    };
  });
}

export const metroRouter = router({
  /**
   * 실시간 도착 정보 조회
   * 서버 환경변수 SEOUL_METRO_API_KEY를 사용하여 API 호출
   */
  getArrivals: publicProcedure
    .input(z.object({ stationName: z.string() }))
    .query(async ({ input }) => {
      const apiKey = process.env.SEOUL_METRO_API_KEY;

      if (!apiKey) {
        // API 키가 없으면 시뮬레이션 데이터 반환
        return {
          arrivals: generateSimulatedArrivals(input.stationName),
          isSimulated: true,
        };
      }

      try {
        const url = `${SEOUL_API_BASE}/${apiKey}/json/realtimeStationArrival/0/10/${encodeURIComponent(input.stationName)}`;
        const response = await fetch(url);

        if (!response.ok) {
          return {
            arrivals: generateSimulatedArrivals(input.stationName),
            isSimulated: true,
          };
        }

        const data = await response.json();

        if (data.errorMessage?.status !== 200 && !data.realtimeArrivalList) {
          return {
            arrivals: generateSimulatedArrivals(input.stationName),
            isSimulated: true,
          };
        }

        const arrivals = (data.realtimeArrivalList || []).map((item: any) => ({
          stationName: item.statnNm,
          lineId: mapSubwayId(item.subwayId),
          direction: item.trainLineNm,
          destination: item.bstatnNm,
          // 종착역(행선지) — 운행계통 판별용. statnTnm이 비면 bstatnNm으로 폴백.
          terminusId: item.statnTid || "",
          terminusName: item.statnTnm || item.bstatnNm || "",
          // 막차 여부 (lstcarAt: "1"=막차)
          isLastTrain: item.lstcarAt === "1",
          arrivalMessage: item.arvlMsg2 || item.arvlMsg3,
          arrivalTime: parseInt(item.barvlDt) || 0,
          trainType: item.btrainSttus === "1" ? "급행" : "일반",
          currentStation: item.arvlMsg3 || "",
        }));

        return { arrivals, isSimulated: false };
      } catch (error) {
        console.warn("Seoul Metro API error:", error);
        return {
          arrivals: generateSimulatedArrivals(input.stationName),
          isSimulated: true,
        };
      }
    }),

  /**
   * API 키 상태 확인 (키 값 자체는 노출하지 않음)
   */
  getApiStatus: publicProcedure.query(() => {
    return {
      hasApiKey: !!process.env.SEOUL_METRO_API_KEY,
    };
  }),

  /**
   * 실시간 열차 위치 조회
   * Seoul Metro realtimePosition: 노선 단위 모든 열차의 현재 위치 반환
   * lineName: "1호선", "2호선" 등 한글 노선명
   */
  getTrainPositions: publicProcedure
    .input(z.object({ lineName: z.string() }))
    .query(async ({ input }) => {
      const apiKey = process.env.SEOUL_METRO_API_KEY;
      if (!apiKey) {
        return {
          positions: [],
          isSimulated: true,
          errorCode: "NO_API_KEY",
          errorMessage: "서울시 지하철 API 키가 설정되어 있지 않습니다.",
        };
      }

      try {
        const url = `${SEOUL_API_BASE}/${apiKey}/json/realtimePosition/0/100/${encodeURIComponent(input.lineName)}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) {
          return {
            positions: [],
            isSimulated: true,
            errorCode: String(response.status),
            errorMessage: "서울시 열차 위치 API 요청에 실패했습니다.",
          };
        }
        const data = await response.json();
        const list = data.realtimePositionList;
        if (!Array.isArray(list)) {
          return {
            positions: [],
            isSimulated: true,
            ...parseApiError(data, "서울시 열차 위치 데이터를 사용할 수 없습니다."),
          };
        }

        const positions = withPositionFreshness(
          dedupeTrainPositions(
            list.map((item: any) => ({
              trainNo: String(item.trainNo ?? ""),
              stationName: normalizeRealtimeStationName(String(item.statnNm ?? "")),
              updnLine: String(item.updnLine ?? ""), // 0=상행/내선, 1=하행/외선
              trainStatus: String(item.trainSttus ?? ""), // 0=진입, 1=도착, 2=출발
              destination: normalizeRealtimeStationName(String(item.statnTnm ?? "")),
              receivedAt: String(item.recptnDt ?? ""),
              trainType: mapTrainType(String(item.directAt ?? "0")), // 급행여부
            })),
          ),
        );
        const stalePositionCount = positions.filter(position => position.isStale).length;
        const freshestPosition = positions.reduce<MetroTrainPosition | null>((freshest, position) => {
          if (!freshest) return position;
          return (position.receivedAtEpochMs ?? 0) > (freshest.receivedAtEpochMs ?? 0)
            ? position
            : freshest;
        }, null);

        return {
          positions,
          isSimulated: false,
          stalePositionCount,
          freshestReceivedAt: freshestPosition?.receivedAt,
          freshestReceivedAtAgeSeconds: freshestPosition?.receivedAtAgeSeconds,
          staleAfterSeconds: TRAIN_POSITION_STALE_AFTER_SECONDS,
        };
      } catch {
        return {
          positions: [],
          isSimulated: true,
          errorCode: "REQUEST_FAILED",
          errorMessage: "서울시 열차 위치 API 연결에 실패했습니다.",
        };
      }
    }),
});
