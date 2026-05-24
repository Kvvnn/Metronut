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
        arrivalMessage: minutes <= 1 ? "곧 도착" : `${minutes}분 후`,
        arrivalTime: minutes * 60,
        trainType: Math.random() > 0.8 ? "급행" : "일반",
        currentStation: `${Math.floor(Math.random() * 3) + 1}정거장 전`,
      });
    }
  });

  return arrivals.sort((a: any, b: any) => a.arrivalTime - b.arrivalTime);
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
    const hasKey = !!process.env.SEOUL_METRO_API_KEY;
    return { hasApiKey: hasKey };
  }),
});
