import { API_BASE_URL } from '@/lib/config';
import { getUseSimulatedTrainData } from '@/lib/simulationSettings';

export interface ArrivalInfo {
  stationName: string;
  lineId: string;
  direction: string;
  destination: string;
  arrivalMessage: string;
  arrivalTime: number;
  trainType: string;
  currentStation: string;
}

export interface ArrivalResult {
  arrivals: ArrivalInfo[];
  isSimulated: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface TrainPosition {
  trainNo: string;
  stationName: string;
  updnLine: string;
  trainStatus: string;
  destination: string;
  receivedAt: string;
  trainType: string;
}

export interface TrainPositionsResult {
  positions: TrainPosition[];
  isSimulated: boolean;
  errorCode?: string;
  errorMessage?: string;
}

function isConfiguredApiBaseUrl() {
  return Boolean(API_BASE_URL) && !API_BASE_URL.includes('your-vercel-domain');
}

function buildTrpcUrl(procedure: string, input: unknown) {
  const encodedInput = encodeURIComponent(JSON.stringify({ '0': { json: input } }));
  return `${API_BASE_URL.replace(/\/$/, '')}/api/trpc/${procedure}?batch=1&input=${encodedInput}`;
}

function generateSimulatedArrivals(stationName: string, lineId = '2'): ArrivalInfo[] {
  const nowSeed = Math.floor(Date.now() / 60000);
  const directions = [
    { direction: '상행', destinations: ['소요산', '대화', '당고개', '방화'] },
    { direction: '하행', destinations: ['인천', '오금', '오이도', '상일동'] },
  ];

  return directions
    .flatMap((direction, directionIndex) =>
      [0, 1].map((offset) => {
        const minutes = ((nowSeed + directionIndex * 3 + offset * 5) % 8) + 1;
        const destination = direction.destinations[(nowSeed + offset + directionIndex) % direction.destinations.length];
        return {
          stationName,
          lineId,
          direction: `${destination} 방면`,
          destination,
          arrivalMessage: minutes <= 1 ? '곧 도착' : `${minutes}분 후`,
          arrivalTime: minutes * 60,
          trainType: (nowSeed + offset) % 6 === 0 ? '급행' : '일반',
          currentStation: minutes <= 1 ? '진입 중' : `${Math.min(minutes, 4)}정거장 전`,
        };
      }),
    )
    .sort((a, b) => a.arrivalTime - b.arrivalTime);
}

function parseArrivalResult(data: unknown): ArrivalResult | null {
  const result = Array.isArray(data)
    ? (data[0] as { result?: { data?: { json?: ArrivalResult } } } | undefined)?.result?.data?.json
    : null;

  if (!result || !Array.isArray(result.arrivals)) return null;
  return result;
}

function parseTrainPositionsResult(data: unknown): TrainPositionsResult | null {
  const result = Array.isArray(data)
    ? (data[0] as { result?: { data?: { json?: TrainPositionsResult } } } | undefined)?.result?.data?.json
    : null;

  if (!result || !Array.isArray(result.positions)) return null;
  return result;
}

export async function getRealtimeArrivals(stationName: string, lineId?: string): Promise<ArrivalResult> {
  if (await getUseSimulatedTrainData()) {
    return {
      arrivals: generateSimulatedArrivals(stationName, lineId),
      isSimulated: true,
      errorCode: 'SIMULATION_ENABLED',
    };
  }

  if (!isConfiguredApiBaseUrl()) {
    return {
      arrivals: generateSimulatedArrivals(stationName, lineId),
      isSimulated: true,
      errorCode: 'API_BASE_URL_MISSING',
      errorMessage: 'EXPO_PUBLIC_API_BASE_URL이 설정되지 않았습니다.',
    };
  }

  try {
    const response = await fetch(buildTrpcUrl('metro.getArrivals', { stationName }));
    if (!response.ok) {
      return {
        arrivals: generateSimulatedArrivals(stationName, lineId),
        isSimulated: true,
        errorCode: String(response.status),
        errorMessage: '실시간 도착 정보 요청에 실패했습니다.',
      };
    }

    const parsed = parseArrivalResult(await response.json());
    if (!parsed) {
      return {
        arrivals: generateSimulatedArrivals(stationName, lineId),
        isSimulated: true,
        errorCode: 'EMPTY_RESPONSE',
        errorMessage: '실시간 도착 정보 응답이 비어 있습니다.',
      };
    }

    return parsed;
  } catch {
    return {
      arrivals: generateSimulatedArrivals(stationName, lineId),
      isSimulated: true,
      errorCode: 'REQUEST_FAILED',
      errorMessage: '실시간 도착 정보 연결에 실패했습니다.',
    };
  }
}

export async function checkApiKeyStatus() {
  if (!isConfiguredApiBaseUrl()) return false;

  try {
    const response = await fetch(buildTrpcUrl('metro.getApiStatus', null));
    if (!response.ok) return false;
    const data = await response.json();
    return !!data[0]?.result?.data?.json?.hasApiKey;
  } catch {
    return false;
  }
}

export async function getTrainPositions(lineName: string): Promise<TrainPositionsResult> {
  if (await getUseSimulatedTrainData()) {
    return {
      positions: [],
      isSimulated: true,
      errorCode: 'SIMULATION_ENABLED',
    };
  }

  if (!isConfiguredApiBaseUrl()) {
    return {
      positions: [],
      isSimulated: true,
      errorCode: 'API_BASE_URL_MISSING',
      errorMessage: 'EXPO_PUBLIC_API_BASE_URL이 설정되지 않았습니다.',
    };
  }

  try {
    const response = await fetch(buildTrpcUrl('metro.getTrainPositions', { lineName }));
    if (!response.ok) {
      return {
        positions: [],
        isSimulated: true,
        errorCode: String(response.status),
        errorMessage: '열차 위치 요청에 실패했습니다.',
      };
    }

    const parsed = parseTrainPositionsResult(await response.json());
    if (!parsed) {
      return {
        positions: [],
        isSimulated: true,
        errorCode: 'EMPTY_RESPONSE',
        errorMessage: '열차 위치 응답이 비어 있습니다.',
      };
    }

    return parsed;
  } catch {
    return {
      positions: [],
      isSimulated: true,
      errorCode: 'REQUEST_FAILED',
      errorMessage: '열차 위치 연결에 실패했습니다.',
    };
  }
}
