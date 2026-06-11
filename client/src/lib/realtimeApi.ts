/**
 * 서울교통공사 실시간 도착 정보 API 연동
 * 
 * 서버 측 프록시를 통해 API 키를 안전하게 관리합니다.
 * tRPC를 통해 서버에 요청하고, 서버가 Seoul Metro API를 호출합니다.
 * 
 * tRPC를 사용할 수 없는 컨텍스트에서는 직접 /api/trpc 엔드포인트를 호출합니다.
 */
import { getUseSimulatedTrainData } from "@/lib/simulationSettings";

export interface ArrivalInfo {
  stationName: string;
  lineId: string;
  direction: string;
  destination: string;
  arrivalMessage: string; // "3분 후", "전역 출발" 등
  arrivalTime: number; // 초 단위
  trainType: string; // "일반", "급행"
  currentStation: string;
}

/**
 * 실시간 도착 정보 가져오기 (서버 프록시 경유)
 */
export async function getRealtimeArrivals(stationName: string): Promise<ArrivalInfo[]> {
  if (getUseSimulatedTrainData()) {
    return generateSimulatedArrivals(stationName);
  }

  try {
    // tRPC batch endpoint를 직접 호출 (React 외부에서 사용 가능)
    const url = `/api/trpc/metro.getArrivals?batch=1&input=${encodeURIComponent(
      JSON.stringify({ "0": { json: { stationName } } })
    )}`;
    
    const response = await fetch(url, { credentials: "include" });
    
    if (!response.ok) {
      return generateSimulatedArrivals(stationName);
    }

    const data = await response.json();
    const result = data[0]?.result?.data?.json;
    
    if (result?.arrivals) {
      return result.arrivals;
    }
    
    return generateSimulatedArrivals(stationName);
  } catch (error) {
    console.warn("서버 프록시 연결 실패, 시뮬레이션 데이터 사용:", error);
    return generateSimulatedArrivals(stationName);
  }
}

/**
 * API 키 상태 확인 (서버에 SEOUL_METRO_API_KEY가 설정되어 있는지)
 */
export async function checkApiKeyStatus(): Promise<boolean> {
  try {
    const url = `/api/trpc/metro.getApiStatus?batch=1&input=${encodeURIComponent(
      JSON.stringify({ "0": { json: null } })
    )}`;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) return false;
    const data = await response.json();
    return !!data[0]?.result?.data?.json?.hasApiKey;
  } catch {
    return false;
  }
}

/**
 * 시뮬레이션 도착 정보 생성 (폴백)
 */
function generateSimulatedArrivals(stationName: string): ArrivalInfo[] {
  const directions = [
    { direction: "상행", destinations: ["소요산", "대화", "당고개", "방화"] },
    { direction: "하행", destinations: ["인천", "오금", "오이도", "상일동"] },
  ];

  const arrivals: ArrivalInfo[] = [];

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
        arrivalMessage: minutes <= 1 ? "곧 도착" : `${minutes}분 후`,
        arrivalTime: minutes * 60,
        trainType: Math.random() > 0.8 ? "급행" : "일반",
        currentStation: `${Math.floor(Math.random() * 3) + 1}정거장 전`,
      });
    }
  });

  return arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime);
}

/**
 * 실시간 열차 위치 조회 (서버 프록시 경유)
 */
export interface TrainPosition {
  trainNo: string;
  stationName: string;
  updnLine: string;
  trainStatus: string;
  destination: string;
  receivedAt: string;
  receivedAtEpochMs?: number;
  receivedAtAgeSeconds?: number;
  isStale?: boolean;
  /** 급행여부 (directAt): "일반" | "급행" | "특급" */
  trainType: string;
}

export async function getTrainPositions(
  lineName: string,
): Promise<{
  positions: TrainPosition[];
  isSimulated: boolean;
  errorCode?: string;
  errorMessage?: string;
  stalePositionCount?: number;
  freshestReceivedAt?: string;
  freshestReceivedAtAgeSeconds?: number;
  staleAfterSeconds?: number;
}> {
  if (getUseSimulatedTrainData()) {
    return {
      positions: [],
      isSimulated: true,
      errorCode: "SIMULATION_ENABLED",
    };
  }

  try {
    const apiLineName = lineName.startsWith("2호선") ? "2호선" : lineName;
    const url = `/api/trpc/metro.getTrainPositions?batch=1&input=${encodeURIComponent(
      JSON.stringify({ "0": { json: { lineName: apiLineName } } }),
    )}`;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      return {
        positions: [],
        isSimulated: true,
        errorCode: String(response.status),
        errorMessage: "열차 위치 요청에 실패했습니다.",
      };
    }
    const data = await response.json();
    const result = data[0]?.result?.data?.json;
    return result ?? {
      positions: [],
      isSimulated: true,
      errorCode: "EMPTY_RESPONSE",
      errorMessage: "열차 위치 응답이 비어 있습니다.",
    };
  } catch {
    return {
      positions: [],
      isSimulated: true,
      errorCode: "REQUEST_FAILED",
      errorMessage: "열차 위치 요청에 실패했습니다.",
    };
  }
}
