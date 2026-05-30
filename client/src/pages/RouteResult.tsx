/**
 * 경로 결과 화면
 * Design: 카드 기반 경로 옵션 표시
 * - 최단시간 / 최소환승 / 도보적은 경로
 * - 소요시간, 환승 횟수, 요금, 도보 시간 표시
 */
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, Clock, Repeat, Footprints, ChevronRight, Zap, Heart, Minus } from "lucide-react";
import { motion } from "framer-motion";
import {
  findRoutes,
  findRoutesVia,
  calculateArrivalTime,
  getLineInfo,
  isLongTransferSegment,
  involvesScheduledLine,
  getStationInfo,
} from "@/lib/pathfinder";
import { buildServiceErrorCopy, getRouteServiceError } from "@/lib/routeServiceWindow";
import {
  getLastDepartureReaching,
  formatServiceMinute,
  getScheduleDayType,
} from "@/lib/serviceSchedule";
import type { Route } from "@/lib/pathfinder";
import type { RouteServiceError, RouteServiceErrorCopy } from "@/lib/routeServiceWindow";

/** 시간인지 탐색이 막차로 도달 불가라고 판단했을 때의 안내 문구. */
function buildLastTrainNotice(from: string, to: string): RouteServiceErrorCopy {
  const fromIdx = getStationInfo(from).find(s => s.lineId === "4")?.index;
  const toIdx = getStationInfo(to).find(s => s.lineId === "4")?.index;
  const dayType = getScheduleDayType(new Date());
  const lastMin =
    fromIdx != null && toIdx != null
      ? getLastDepartureReaching("4", fromIdx, toIdx, dayType)
      : null;
  return {
    title: "막차가 끊겼습니다",
    description:
      lastMin != null
        ? `${from}에서 ${to} 방면으로 가는 막차는 ${formatServiceMinute(lastMin)}에 출발했습니다.`
        : `${from}에서 ${to} 방면으로 가는 막차가 이미 종료되었습니다.`,
    hint: "이 시간대에는 운행계통(행선지)이 달라 해당 구간에 도달할 수 없습니다.",
  };
}

const routeLabels = [
  { icon: Zap, label: "빠른 경로", color: "#4A90D9" },
  { icon: Heart, label: "편한 경로", color: "#27AE60" },
  { icon: Footprints, label: "도보 적은 경로", color: "#E67E22" },
  { icon: Repeat, label: "환승 대안", color: "#7C5CFF" },
  { icon: Clock, label: "우회 경로", color: "#6B7280" },
];

export default function RouteResult() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const from = searchParams.get("from") || "";
  const via = searchParams.get("via") || "";
  const to = searchParams.get("to") || "";
  const origin = searchParams.get("origin") || "";
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeIndexes, setRouteIndexes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState<RouteServiceError | null>(null);
  const [timedNotice, setTimedNotice] = useState<RouteServiceErrorCopy | null>(null);

  const buildMapPath = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (via) params.set("via", via);
    if (to) params.set("to", to);
    const query = params.toString();
    return query ? `/?${query}` : "/";
  };

  const handleBack = () => {
    setLocation(buildMapPath());
  };

  useEffect(() => {
    if (from && to) {
      setLoading(true);
      // 약간의 딜레이로 로딩 UX
      setTimeout(() => {
        const now = new Date();
        // 운행계통 스케줄이 있는 노선(4호선)이 걸린 직통 경로는 시간인지 탐색을 사용한다.
        const useTimed = !via && involvesScheduledLine(from, to);

        if (useTimed) {
          const found = findRoutes(from, to, { departAt: now });
          setRoutes(found);
          setRouteIndexes(found.map((_, i) => i));
          setServiceError(null);
          // 막차로 도달 불가(빈 결과)면 안내 문구 표시
          setTimedNotice(found.length === 0 ? buildLastTrainNotice(from, to) : null);
          setLoading(false);
          return;
        }

        const found = via ? findRoutesVia(from, via, to) : findRoutes(from, to);
        const evaluatedRoutes = found.map((route, routeIndex) => ({
          route,
          routeIndex,
          error: getRouteServiceError(route, now),
        }));
        const availableRoutes = evaluatedRoutes
          .filter(({ error }) => !error)
          .map(({ route, routeIndex }) => ({ route, routeIndex }));

        setRoutes(availableRoutes.map(({ route }) => route));
        setRouteIndexes(availableRoutes.map(({ routeIndex }) => routeIndex));
        setTimedNotice(null);
        setServiceError(
          found.length > 0 && availableRoutes.length === 0
            ? evaluatedRoutes[0]?.error ?? null
            : null,
        );
        setLoading(false);
      }, 300);
    }
  }, [from, via, to]);

  const serviceErrorCopy = timedNotice ?? (serviceError ? buildServiceErrorCopy(serviceError) : null);

  return (
    <div className="min-h-screen bg-background pb-[calc(72px+env(safe-area-inset-bottom,0px))]">
      {/* Header */}
      <div className="safe-top nav-bar sticky top-0 z-40">
        <div className="flex items-center px-4 py-3 gap-3">
          <button
            onClick={handleBack}
            className="btn-press p-1"
            aria-label="노선도로 돌아가기"
          >
            <ArrowLeft size={22} className="text-[#1B2838]" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-[15px] font-semibold text-[#1B2838]">
              {from} → {via ? `${via} → ` : ""}{to}
            </span>
          </div>
          <div className="w-8" />
        </div>
      </div>

      {/* Route Cards */}
      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ios-card p-4 animate-pulse">
              <div className="h-4 bg-[#F0F0F2] rounded w-24 mb-3" />
              <div className="h-8 bg-[#F0F0F2] rounded w-32 mb-2" />
              <div className="h-3 bg-[#F0F0F2] rounded w-48" />
            </div>
          ))
        ) : serviceErrorCopy ? (
          <div className="ios-card p-5 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF1E7]">
              <Clock size={21} className="text-[#C15B1B]" />
            </div>
            <p className="text-[16px] font-bold text-[#1B2838]">{serviceErrorCopy.title}</p>
            <p className="mt-2 text-[13px] font-medium leading-5 text-[#6B7280]">
              {serviceErrorCopy.description}
            </p>
            <p className="mt-1 text-[12px] font-medium leading-5 text-[#A0A0A7]">
              {serviceErrorCopy.hint}
            </p>
            <button
              type="button"
              onClick={handleBack}
              className="btn-press mt-5 h-11 w-full rounded-2xl bg-[#1B2838] text-[14px] font-semibold text-white"
            >
              노선도에서 다시 선택
            </button>
          </div>
        ) : routes.length > 0 ? (
          routes.map((route, idx) => {
            const label = routeLabels[idx] || routeLabels[0];
            const Icon = label.icon;
            const arrivalTime = calculateArrivalTime(route.totalTime);
            const longTransferCount = route.segments
              .filter(segment => segment.isTransfer && isLongTransferSegment(segment))
              .length;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <button
                  className="relative w-full ios-card p-4 text-left btn-press"
                  onClick={() => {
                    const routeIndex = routeIndexes[idx] ?? idx;
                    const params = new URLSearchParams({ from, to });
                    if (via) params.set("via", via);
                    if (origin) params.set("origin", origin);
                    setLocation(`/route-detail/${routeIndex}?${params.toString()}`);
                  }}
                >
                  {/* Label */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon size={14} style={{ color: label.color }} />
                    <span className="text-[12px] font-semibold" style={{ color: label.color }}>
                      {label.label}
                    </span>
                  </div>

                  {/* Time */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-[28px] font-bold text-[#1B2838] tracking-tight">
                      {route.totalTime}분
                    </span>
                    <span className="text-[14px] text-[#8E8E93]">
                      도착 {arrivalTime}
                    </span>
                  </div>

                  {/* Line indicators + 행선지 */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-1">
                      {route.segments
                        .filter(s => !s.isTransfer)
                        .map((seg, segIdx) => {
                          const line = getLineInfo(seg.lineId);
                          return (
                            <div key={segIdx} className="flex items-center gap-1">
                              {segIdx > 0 && (
                                <div className="w-4 h-[2px] bg-[#E0E0E0] rounded" />
                              )}
                              <span
                                className="line-badge text-[11px]"
                                style={{ backgroundColor: line?.color || seg.lineColor }}
                              >
                                {line?.shortName || seg.lineId}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#1B2838]">
                      {route.segments
                        .filter(s => !s.isTransfer && s.pattern)
                        .map((seg, segIdx, arr) => {
                          const line = getLineInfo(seg.lineId);
                          return (
                            <span key={segIdx} className="flex items-center gap-1">
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: line?.color || seg.lineColor }}
                              />
                              <span className="font-semibold">{seg.pattern!.label}</span>
                              {segIdx < arr.length - 1 && (
                                <span className="text-[#C7C7CC]">·</span>
                              )}
                            </span>
                          );
                        })}
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#8E8E93]">
                    <span className="flex items-center gap-1">
                      <Repeat size={12} />
                      환승 {route.transferCount}회
                    </span>
                    <span className="flex items-center gap-1">
                      <Minus size={12} />
                      {route.stationCount}개 역
                    </span>
                    <span className="flex items-center gap-1">
                      <Footprints size={12} />
                      환승 이동 {route.walkTime}분
                    </span>
                    {longTransferCount > 0 && (
                      <span className="rounded-full bg-[#FFF1E7] px-2 py-0.5 text-[12px] font-semibold text-[#C15B1B]">
                        긴 환승 {longTransferCount}개
                      </span>
                    )}
                    <span className="ml-auto font-medium text-[#1B2838]">
                      ₩{route.fare.toLocaleString()}
                    </span>
                  </div>

                  {/* Chevron */}
                  <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C7C7CC]" />
                </button>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663470511899/FTmUprGrP96stfia225Yig/metro-empty-state-6yUacEmSuEzFSwWDFJ6r2G.webp"
              alt="No routes"
              className="w-32 h-32 mx-auto mb-4 opacity-60"
            />
            <p className="text-[15px] text-[#8E8E93]">경로를 찾을 수 없습니다</p>
            <p className="text-[13px] text-[#C7C7CC] mt-1">역 이름을 확인해주세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
