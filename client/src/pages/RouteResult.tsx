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
import { findRoutes, calculateArrivalTime, getLineInfo } from "@/lib/pathfinder";
import type { Route } from "@/lib/pathfinder";

const routeLabels = [
  { icon: Zap, label: "빠른 경로", color: "#4A90D9" },
  { icon: Heart, label: "편한 경로", color: "#27AE60" },
  { icon: Footprints, label: "도보 적은 경로", color: "#E67E22" },
];

export default function RouteResult() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (from && to) {
      setLoading(true);
      // 약간의 딜레이로 로딩 UX
      setTimeout(() => {
        const found = findRoutes(from, to);
        setRoutes(found);
        setLoading(false);
      }, 300);
    }
  }, [from, to]);

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="safe-top nav-bar sticky top-0 z-40">
        <div className="flex items-center px-4 py-3 gap-3">
          <button onClick={() => setLocation("/search")} className="btn-press p-1">
            <ArrowLeft size={22} className="text-[#1B2838]" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-[15px] font-semibold text-[#1B2838]">
              {from} → {to}
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
        ) : routes.length > 0 ? (
          routes.map((route, idx) => {
            const label = routeLabels[idx] || routeLabels[0];
            const Icon = label.icon;
            const arrivalTime = calculateArrivalTime(route.totalTime);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <button
                  className="w-full ios-card p-4 text-left btn-press"
                  onClick={() => setLocation(`/route-detail/${idx}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)}
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

                  {/* Line indicators */}
                  <div className="flex items-center gap-1 mb-3">
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

                  {/* Info row */}
                  <div className="flex items-center gap-4 text-[13px] text-[#8E8E93]">
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
                      도보 {route.walkTime}분
                    </span>
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
