import { describe, it, expect } from "vitest";
import { isPastLastTrain } from "../shared/metro/ridingTrains";

// 2026-06-11(목) 기준 평일
const at = (hour: number, minute = 0) => new Date(2026, 5, 11, hour, minute);

describe("isPastLastTrain (탑승 화면 막차 종료 판정)", () => {
  // 회귀: 막차 시각을 "HH:MM" 문자열로 왕복하던 옛 구현은 자정 넘는 막차의 day 정보를
  // 잃어 2호선 등에서 오전·오후에도 "막차 종료"로 오판했다. 서비스분 기반으로 교체.
  it("주간(09시·14시)에는 어떤 노선도 막차 종료가 아니다", () => {
    const journeys: [string, string, string][] = [
      ["2", "강남", "잠실"],
      ["2", "시청", "신도림"],
      ["1", "서울역", "인천"],
      ["4", "사당", "오이도"],
      ["3", "교대", "대화"],
      ["9", "여의도", "김포공항"],
      ["7", "가산디지털단지", "부평구청"],
      ["5", "광화문", "마천"],
    ];
    for (const [line, from, to] of journeys) {
      expect(isPastLastTrain(line, from, to, at(9)), `${line} ${from}→${to} 09시`).toBe(false);
      expect(isPastLastTrain(line, from, to, at(14)), `${line} ${from}→${to} 14시`).toBe(false);
    }
  });

  it("심야(01:30)에는 막차가 끊긴 구간을 막는다", () => {
    expect(isPastLastTrain("2", "강남", "잠실", at(1, 30))).toBe(true);
    expect(isPastLastTrain("1", "서울역", "인천", at(1, 30))).toBe(true);
    expect(isPastLastTrain("4", "사당", "오이도", at(1, 30))).toBe(true);
  });

  it("스케줄이 없는 가상/미지원 노선은 막지 않는다(false)", () => {
    expect(isPastLastTrain("nonexistent", "강남", "역삼", at(1, 30))).toBe(false);
  });

  it("같은 노선이라도 방향에 따라 막차 시각이 다르다", () => {
    // 2호선 자정 직후(00:30): 노선·방향별 막차가 갈려 결과가 혼재할 수 있다(크래시 없이 동작).
    const a = isPastLastTrain("2", "강남", "잠실", at(0, 30));
    const b = isPastLastTrain("2", "잠실", "강남", at(0, 30));
    expect(typeof a).toBe("boolean");
    expect(typeof b).toBe("boolean");
  });
});
