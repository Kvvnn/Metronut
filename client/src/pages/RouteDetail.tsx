/**
 * 경로 상세 화면
 * Design: 타임라인 기반 경로 시각화
 * - 노선별 이동 구간
 * - 환승역 안내
 * - 빠른 환승 칸 번호
 * - 도착 예상시간
 */
import { useState, useEffect } from "react";
import { useLocation, useSearch, useParams } from "wouter";
import { ArrowLeft, Play, Clock, Train, Footprints, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { findRoutes, calculateArrivalTime, getLineInfo } from "@/lib/pathfinder";
import type { Route, RouteSegment } from "@/lib/pathfinder";
import { toast } from "sonner";

export default function RouteDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const searchParams = new URLSearchParams(useSearch());
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const routeIdx = parseInt(params.id || "0");
  
  const [route, setRoute] = useState<Route | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (from && to) {
      const routes = findRoutes(from, to);
      if (routes[routeIdx]) {
        setRoute(routes[routeIdx]);
      }
    }
  }, [from, to, routeIdx]);

  const toggleSegment = (idx: number) => {
    const next = new Set(expandedSegments);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpandedSegments(next);
  };

  if (!route) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[#8E8E93]">로딩 중...</div>
      </div>
    );
  }

  const arrivalTime = calculateArrivalTime(route.totalTime);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="safe-top nav-bar sticky top-0 z-40">
        <div className="flex items-center px-4 py-3 gap-3">
          <button onClick={() => window.history.back()} className="btn-press p-1">
            <ArrowLeft size={22} className="text-[#1B2838]" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-[15px] font-semibold text-[#1B2838]">경로 상세</span>
          </div>
          <div className="w-8" />
        </div>
      </div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="mx-4 mt-4"
      >
        <div className="ios-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[32px] font-bold text-[#1B2838] tracking-tight">
                {route.totalTime}분
              </span>
              <span className="text-[14px] text-[#8E8E93]">소요</span>
            </div>
            <div className="text-right">
              <p className="text-[13px] text-[#8E8E93]">도착 예정</p>
              <p className="text-[17px] font-bold text-[#1B2838]">{arrivalTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[13px] text-[#8E8E93]">
            <span>환승 {route.transferCount}회</span>
            <span>{route.stationCount}개 역</span>
            <span>₩{route.fare.toLocaleString()}</span>
          </div>
        </div>
      </motion.div>

      {/* Timeline */}
      <div className="mx-4 mt-4">
        {route.segments.map((segment, idx) => {
          if (segment.isTransfer) {
            return (
              <TransferSegment key={idx} segment={segment} />
            );
          }
          return (
            <RideSegment
              key={idx}
              segment={segment}
              isFirst={idx === 0}
              isLast={idx === route.segments.length - 1}
              expanded={expandedSegments.has(idx)}
              onToggle={() => toggleSegment(idx)}
            />
          );
        })}
      </div>

      {/* Start Riding Button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-4 bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={() => {
            const firstRideIdx = route.segments.findIndex(s => !s.isTransfer);
            const firstRide = route.segments[firstRideIdx];
            if (firstRide) {
              const hasMoreRides = route.segments
                .slice(firstRideIdx + 1)
                .some(s => !s.isTransfer);
              const ridingPayload = {
                lineId: firstRide.lineId,
                lineName: getLineInfo(firstRide.lineId)?.name || firstRide.lineName,
                direction: `${firstRide.toStation.name} 방면`,
                fromStationName: firstRide.fromStation.name,
                toStationName: firstRide.toStation.name,
                stationNames: firstRide.stations.map(s => s.name),
                isTransferAtEnd: hasMoreRides,
              };
              sessionStorage.setItem("riding_data", JSON.stringify(ridingPayload));
            }
            toast("탑승 안내를 시작합니다");
            setLocation("/riding");
          }}
          className="w-full bg-[#1B2838] text-white rounded-2xl py-4 text-[16px] font-semibold btn-press flex items-center justify-center gap-2 shadow-lg"
        >
          <Play size={18} fill="white" />
          탑승 안내 시작
        </button>
      </div>
    </div>
  );
}

function RideSegment({
  segment,
  isFirst,
  isLast,
  expanded,
  onToggle,
}: {
  segment: RouteSegment;
  isFirst: boolean;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const line = getLineInfo(segment.lineId);
  const stationCount = segment.stations.length - 1;
  const middleStations = segment.stations.slice(1, -1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      {/* Line bar */}
      <div
        className="absolute left-[19px] top-6 bottom-0 w-[3px] rounded-full"
        style={{ backgroundColor: line?.color || segment.lineColor }}
      />

      {/* Start station */}
      <div className="flex items-start gap-3 relative">
        <div
          className="w-[10px] h-[10px] rounded-full border-[3px] mt-1.5 shrink-0 z-10 bg-white"
          style={{ borderColor: line?.color || segment.lineColor }}
        />
        <div className="flex-1 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-[#1B2838]">
              {segment.fromStation.name}
            </span>
            <span
              className="line-badge text-[10px]"
              style={{ backgroundColor: line?.color || segment.lineColor }}
            >
              {line?.shortName || segment.lineId}
            </span>
          </div>
          {isFirst && (
            <p className="text-[12px] text-[#8E8E93] mt-0.5">승차</p>
          )}
        </div>
      </div>

      {/* Middle stations (collapsible) */}
      {stationCount > 1 && (
        <button
          onClick={onToggle}
          className="flex items-center gap-3 ml-[7px] py-2 btn-press"
        >
          <div className="w-[26px] flex justify-center">
            <Train size={12} style={{ color: line?.color || segment.lineColor }} />
          </div>
          <span className="text-[13px] text-[#8E8E93]">
            {stationCount}개 역 이동 ({segment.time}분)
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-[#8E8E93]" />
          ) : (
            <ChevronDown size={14} className="text-[#8E8E93]" />
          )}
        </button>
      )}

      {expanded && middleStations.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="ml-[19px] pl-4 border-l-0"
        >
          {middleStations.map((station, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <div className="w-[6px] h-[6px] rounded-full bg-[#E0E0E0]" />
              <span className="text-[13px] text-[#8E8E93]">{station.name}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* End station */}
      <div className="flex items-start gap-3 relative pb-2">
        <div
          className="w-[10px] h-[10px] rounded-full border-[3px] mt-1.5 shrink-0 z-10 bg-white"
          style={{ borderColor: line?.color || segment.lineColor }}
        />
        <div className="flex-1">
          <span className="text-[15px] font-semibold text-[#1B2838]">
            {segment.toStation.name}
          </span>
          {isLast && (
            <p className="text-[12px] text-[#8E8E93] mt-0.5">하차</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TransferSegment({ segment }: { segment: RouteSegment }) {
  const toLine = getLineInfo(segment.lineId);
  // 빠른 환승 칸 번호 (역 이름 기반 결정적 생성)
  const hash = (segment.fromStation?.name || "x").charCodeAt(0) + (segment.toStation?.name || "y").charCodeAt(0);
  const fastCar = (hash % 8) + 1;
  const fastDoor = (hash % 4) + 1;

  return (
    <div className="flex items-center gap-3 py-3 ml-[7px]">
      <div className="w-[26px] flex justify-center">
        <Footprints size={14} className="text-[#E67E22]" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[#E67E22]">환승</span>
          <span
            className="line-badge text-[10px]"
            style={{ backgroundColor: toLine?.color || '#888' }}
          >
            {toLine?.shortName || segment.lineId}
          </span>
        </div>
        <p className="text-[12px] text-[#8E8E93] mt-0.5">
          도보 약 {segment.time}분 · 빠른 환승 {fastCar}-{fastDoor}번 칸
        </p>
      </div>
    </div>
  );
}
