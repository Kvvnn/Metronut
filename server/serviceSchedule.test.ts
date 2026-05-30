import { describe, it, expect } from "vitest";
import { findRoutes } from "@/lib/pathfinder";
import type { Route } from "@/lib/pathfinder";

// 특정 "시계 시각"의 Date (날짜는 무관, 분/시만 사용). dayType은 옵션으로 명시.
function at(hour: number, minute: number): Date {
  return new Date(2026, 4, 29, hour, minute, 0);
}

function lastRide(route: Route) {
  return [...route.segments].reverse().find(s => !s.isTransfer);
}

function reaches(route: Route, name: string) {
  return route.segments.some(s => s.toStation.name === name || s.fromStation.name === name);
}

describe("4호선 운행계통/막차 시간인지 경로", () => {
  it("① 평일 24:10 사당→당고개: 당고개행(24:07) 지나 한성대입구행만 남음 → 도달 불가", () => {
    // 00:10 + dayType weekday = 서비스데이 24:10
    const routes = findRoutes("사당", "당고개", { departAt: at(0, 10), dayType: "weekday" });
    expect(routes.length).toBe(0);
  });

  it("② 평일 23:50 사당→당고개: 당고개행 탑승 가능 → 정상 경로", () => {
    const routes = findRoutes("사당", "당고개", { departAt: at(23, 50), dayType: "weekday" });
    expect(routes.length).toBeGreaterThan(0);
    expect(reaches(routes[0], "당고개")).toBe(true);
    expect(lastRide(routes[0])?.pattern?.label).toBe("당고개행");
  });

  it("③ 평일 24:20 사당→한성대입구: 한성대입구행으로 도달 가능", () => {
    const routes = findRoutes("사당", "한성대입구", { departAt: at(0, 20), dayType: "weekday" });
    expect(routes.length).toBeGreaterThan(0);
    expect(reaches(routes[0], "한성대입구")).toBe(true);
    expect(lastRide(routes[0])?.pattern?.label).toBe("한성대입구행");
  });

  it("④ 평일 낮 오이도→안산: 막차 오탐 없이 정상, 운행패턴 라벨 존재", () => {
    const routes = findRoutes("오이도", "안산", { departAt: at(12, 0), dayType: "weekday" });
    expect(routes.length).toBeGreaterThan(0);
    expect(reaches(routes[0], "안산")).toBe(true);
    expect(lastRide(routes[0])?.pattern?.label).toBeTruthy();
  });

  it("⑤ 옵션 없이 호출하면 기존(시간무관) 엔진 그대로 동작", () => {
    const routes = findRoutes("사당", "당고개");
    expect(routes.length).toBeGreaterThan(0);
    expect(reaches(routes[0], "당고개")).toBe(true);
  });
});
