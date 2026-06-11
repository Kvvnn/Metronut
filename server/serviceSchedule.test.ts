import { describe, it, expect } from "vitest";
import { findRoutes, getStationsByLine } from "@/lib/pathfinder";
import { getLastDepartureReaching } from "@/lib/serviceSchedule";
import type { Route } from "@/lib/pathfinder";

// 특정 "시계 시각"의 Date. dayType은 옵션으로 명시.
function at(hour: number, minute: number): Date {
  return new Date(2026, 4, 29, hour, minute, 0);
}

function lastRide(route: Route) {
  return [...route.segments].reverse().find(s => !s.isTransfer);
}

function reaches(route: Route, name: string) {
  return route.segments.some(s => s.toStation.name === name || s.fromStation.name === name);
}

const idx = (lineId: string, name: string) =>
  getStationsByLine(lineId).find(s => s.name === name)!.index;

// 서비스분(24:xx) → 같은 서비스데이의 Date (00:xx 다음날 새벽). dayType weekday 가정.
function dateAtServiceMin(serviceMin: number): Date {
  const h = Math.floor(serviceMin / 60);
  const m = Math.round(serviceMin % 60);
  return at(h % 24, m); // 24시 이상은 0시대로 (departAt + dayType weekday로 서비스데이 처리)
}

describe("4호선 운행계통/막차 시간인지 경로 (실측 시간표)", () => {
  it("① 막차 직후 사당→당고개: 도달 불가(빈 결과)", () => {
    const last = getLastDepartureReaching("4", idx("4", "사당"), idx("4", "당고개"), "weekday")!;
    expect(last).toBeGreaterThan(0);
    const after = dateAtServiceMin(last + 5);
    const routes = findRoutes("사당", "당고개", { departAt: after, dayType: "weekday" });
    expect(routes.length).toBe(0);
  });

  it("② 막차 직전 사당→당고개: 당고개행 탑승 가능", () => {
    const last = getLastDepartureReaching("4", idx("4", "사당"), idx("4", "당고개"), "weekday")!;
    const before = dateAtServiceMin(last - 10);
    const routes = findRoutes("사당", "당고개", { departAt: before, dayType: "weekday" });
    expect(routes.length).toBeGreaterThan(0);
    expect(reaches(routes[0], "당고개")).toBe(true);
    expect(lastRide(routes[0])?.pattern?.label).toContain("당고개");
  });

  it("③ 당고개행 끊긴 뒤에도 한성대입구행으로 한성대입구 도달 가능", () => {
    const danggogae = getLastDepartureReaching("4", idx("4", "사당"), idx("4", "당고개"), "weekday")!;
    const hanseong = getLastDepartureReaching("4", idx("4", "사당"), idx("4", "한성대입구"), "weekday")!;
    // 한성대입구행이 당고개행보다 늦게까지 운행해야 이 시나리오가 성립
    expect(hanseong).toBeGreaterThan(danggogae);
    const between = dateAtServiceMin((danggogae + hanseong) / 2);
    const routes = findRoutes("사당", "한성대입구", { departAt: between, dayType: "weekday" });
    expect(routes.length).toBeGreaterThan(0);
    expect(reaches(routes[0], "한성대입구")).toBe(true);
  });

  it("④ 평일 낮 오이도→안산: 막차 오탐 없이 정상", () => {
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
