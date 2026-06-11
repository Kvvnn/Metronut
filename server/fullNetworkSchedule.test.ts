import { describe, it, expect } from "vitest";
import { findRoutes, involvesScheduledLine, getStationsByLine } from "../shared/metro/pathfinder";
import {
  hasServiceSchedule,
  getBoardOptions,
  getLastDepartureReaching,
} from "../shared/metro/serviceSchedule";

// 2026-06-11(목) 기준 평일
const at = (hour: number, minute = 0) => new Date(2026, 5, 11, hour, minute);
const idx = (lineId: string, name: string) =>
  getStationsByLine(lineId).find(s => s.name === name)!.index;

describe("전 노선 운행계통 스케줄", () => {
  it("① 모든 주요 노선에 스케줄이 있다", () => {
    const lineIds = [
      "1", "2", "3", "4", "5", "6", "7", "8", "9",
      "2-seongsu", "2-sinjeong",
      "gyeongui", "airport", "shinbundang", "gyeongchun", "suinbundang",
      "ui", "incheon1", "incheon2", "gimpo", "seohaeline", "sinlim", "gtxa",
    ];
    lineIds.forEach(lineId => {
      expect(hasServiceSchedule(lineId), `${lineId} 스케줄 누락`).toBe(true);
    });
    expect(involvesScheduledLine("강남", "홍대입구")).toBe(true);
  });

  it("② 1호선 분기: 인천행은 경인선·경부선 구간을 올바르게 덮는다 (index 블록 불연속 보정)", () => {
    const i = (n: string) => idx("1", n);
    // 경인선 구간(부평→백운, 인접)은 인천행 등으로 도달 가능
    expect(getLastDepartureReaching("1", i("부평"), i("인천"), "weekday")).not.toBeNull();
    // 경부선 구간(가산디지털단지→독산)은 신창/천안행으로 도달 가능
    expect(getLastDepartureReaching("1", i("가산디지털단지"), i("천안"), "weekday")).not.toBeNull();
    // 구로→가산디지털단지: index가 크게 벌어진 분기 경계지만 한 정거장으로 운행
    const opts = getBoardOptions("1", i("구로"), i("가산디지털단지"), 600, "weekday");
    expect(opts.length).toBeGreaterThan(0);
    // 경부행이 경인선 종점(인천)으로 가지는 않는다: 인천행과 경부 종착이 구분됨
    const toIncheon = getLastDepartureReaching("1", i("구로"), i("인천"), "weekday");
    const toCheonan = getLastDepartureReaching("1", i("구로"), i("천안"), "weekday");
    expect(toIncheon).not.toBeNull();
    expect(toCheonan).not.toBeNull();
  });

  it("③ 2호선 순환: 충정로↔시청 wrap 스텝을 내·외선 방향으로 도달 가능", () => {
    const i = (n: string) => idx("2", n);
    // 순환선은 어느 역에서 어느 역으로든(자기 자신 제외) 도달 가능해야 한다
    expect(getLastDepartureReaching("2", i("충정로"), i("시청"), "weekday")).not.toBeNull();
    expect(getLastDepartureReaching("2", i("시청"), i("충정로"), "weekday")).not.toBeNull();
    expect(getLastDepartureReaching("2", i("강남"), i("잠실"), "weekday")).not.toBeNull();
  });

  it("④ 5호선 분기: 마천행/하남검단산행이 각 분기 구간을 운행한다", () => {
    const i = (n: string) => idx("5", n);
    // 마천지선(둔촌동→마천)은 마천행으로 도달
    expect(getLastDepartureReaching("5", i("둔촌동"), i("마천"), "weekday")).not.toBeNull();
    // 본선(강동→하남검단산)은 하남검단산행으로 도달
    expect(getLastDepartureReaching("5", i("강동"), i("하남검단산"), "weekday")).not.toBeNull();
    // 본선 첫 구간(방화→개화산 인접)에서 탑승 옵션이 존재
    const opts = getBoardOptions("5", i("방화"), i("개화산"), 600, "weekday");
    expect(opts.length).toBeGreaterThan(0);
  });

  it("⑤ 일반 시간대: 시간인지 탐색이 합리적인 경로를 준다", () => {
    const routes = findRoutes("강남", "인천", { departAt: at(8) });
    expect(routes.length).toBeGreaterThan(0);
    const best = routes[0];
    // 현실 소요시간(60~80분) 범위
    expect(best.totalTime).toBeGreaterThan(50);
    expect(best.totalTime).toBeLessThan(95);
    expect(best.segments.length).toBeGreaterThan(0);
  });

  it("⑥ 심야(01:30): 막차가 끊겨 경로가 없다", () => {
    expect(findRoutes("강남", "인천", { departAt: at(1, 30) })).toHaveLength(0);
    expect(findRoutes("강남", "역삼", { departAt: at(1, 30) })).toHaveLength(0);
  });

  it("⑦ 첫차 전(04:30): 첫차 대기가 소요시간에 반영된다", () => {
    const routes = findRoutes("강남", "역삼", { departAt: at(4, 30) });
    expect(routes.length).toBeGreaterThan(0);
    // 2호선 강남 첫차는 06시 전후 → 대기 포함 1시간 이상
    expect(routes[0].totalTime).toBeGreaterThan(60);
    const firstRide = routes[0].segments.find(s => !s.isTransfer);
    expect(firstRide?.boardWaitSeconds ?? 0).toBeGreaterThan(30 * 60);
  });

  it("⑧ 막차 시각 안내: 임의 노선·방향에 값이 나온다", () => {
    // 강남(19)→시청(0) 2호선
    expect(getLastDepartureReaching("2", 19, 0, "weekday")).not.toBeNull();
    // 부평(52)→인천(61) 1호선 경인 구간
    expect(getLastDepartureReaching("1", 52, 61, "weekday")).not.toBeNull();
    // 경인 구간 막차는 경부 패턴이 아닌 인천행에서 나와야 함 (null 아님이 핵심)
  });

  it("⑨ 같은 base 노선 급행↔일반 전환은 환승 횟수에 들어가지 않는다", () => {
    const routes = findRoutes("동인천", "소요산", { departAt: at(8) });
    expect(routes.length).toBeGreaterThan(0);
    // 경인급행→1호선 일반 갈아타기는 0환승
    expect(routes[0].transferCount).toBe(0);
    const trainChanges = routes[0].segments.filter(s => s.isTrainChange);
    expect(trainChanges.length).toBeGreaterThan(0);
  });

  it("⑩ 성능: 시간인지 탐색이 병목 없이 동작한다", () => {
    findRoutes("강남", "인천", { departAt: at(8) }); // warmup
    // 전 노선 실측 스케줄(운행계통 다수)로 상태공간이 늘어 4호선만일 때보다 비싸다.
    // 병목 회귀(수 초)를 잡되 현실적 여유를 둔다. (CI 변동 고려)
    const cases: [string, string][] = [
      ["강남", "인천"], ["서울역", "잠실"], ["홍대입구", "판교"], ["동인천", "소요산"],
    ];
    const start = performance.now();
    cases.forEach(([from, to]) => findRoutes(from, to, { departAt: at(8) }));
    const avgMs = (performance.now() - start) / cases.length;
    expect(avgMs).toBeLessThan(600);
  });
});
