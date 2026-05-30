/**
 * 경로 상세 화면
 * Design: 타임라인 기반 경로 시각화
 * - 노선별 이동 구간
 * - 환승역 안내
 * - 빠른 환승 칸 번호
 * - 도착 예상시간
 */
import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch, useParams } from "wouter";
import { ArrowLeft, Play, Clock, Train, Footprints, ChevronDown, ChevronUp, Star } from "lucide-react";
import { motion } from "framer-motion";
import {
  findRoutes,
  findRoutesVia,
  calculateArrivalTime,
  getLineInfo,
  formatTransferDuration,
  isLongTransferSegment,
  involvesScheduledLine,
} from "@/lib/pathfinder";
import type { Route, RouteSegment } from "@/lib/pathfinder";
import { OFFICIAL_FAST_TRANSFERS } from "@shared/metro/officialFastTransfers";
import {
  findFastTransferInfo,
  formatFastTransferInfo,
  type FastTransferInfo,
  type FastTransferLookupInput,
} from "@shared/fastTransfer";
import { toast } from "sonner";
import { isFavoriteRoute, toggleFavoriteRoute } from "@/lib/routeFavorites";

function getRideDirection(segment: RouteSegment | undefined) {
  if (!segment || segment.isTransfer) return undefined;
  return segment.pattern?.label ?? `${segment.toStation.name} 방면`;
}

function uniqueNames(names: Array<string | undefined>) {
  return Array.from(new Set(names.filter((name): name is string => Boolean(name))));
}

function getRideDirectionNames(segment: RouteSegment | undefined) {
  if (!segment || segment.isTransfer) return [];

  return uniqueNames([
    segment.pattern?.terminus,
    segment.pattern?.label,
    segment.toStation.name,
    ...segment.stations.map(station => station.name),
  ]);
}

function getTransferLookupInput(
  route: Route,
  transferIndex: number,
): FastTransferLookupInput | null {
  const segment = route.segments[transferIndex];
  if (!segment?.isTransfer) return null;

  const prevRide = route.segments
    .slice(0, transferIndex)
    .reverse()
    .find(s => !s.isTransfer);
  const nextRide = route.segments
    .slice(transferIndex + 1)
    .find(s => !s.isTransfer);

  if (!prevRide || !nextRide) return null;

  return {
    stationName: segment.fromStation.name,
    fromLineId: prevRide.lineId,
    toLineId: nextRide.lineId,
    fromDirection: getRideDirection(prevRide),
    toDirection: getRideDirection(nextRide),
    fromDirectionNames: getRideDirectionNames(prevRide),
    toDirectionNames: getRideDirectionNames(nextRide),
    nextStationName: nextRide.stations[1]?.name,
  };
}

export default function RouteDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const searchParams = new URLSearchParams(useSearch());
  const from = searchParams.get("from") || "";
  const via = searchParams.get("via") || "";
  const to = searchParams.get("to") || "";
  const routeIdx = parseInt(params.id || "0");
  
  const [route, setRoute] = useState<Route | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (from && to) {
      // RouteResult와 동일한 탐색을 써야 인덱스가 일치한다.
      const routes =
        !via && involvesScheduledLine(from, to)
          ? findRoutes(from, to, { departAt: new Date() })
          : via
            ? findRoutesVia(from, via, to)
            : findRoutes(from, to);
      if (routes[routeIdx]) {
        setRoute(routes[routeIdx]);
      }
    }
  }, [from, via, to, routeIdx]);

  useEffect(() => {
    setIsFavorite(isFavoriteRoute(from, to, via));
  }, [from, to, via]);

  const fastTransfers = useMemo<Record<number, FastTransferInfo | null>>(() => {
    if (!route) return {};

    return Object.fromEntries(
      route.segments
        .map((segment, index) => {
          const input = segment.isTransfer ? getTransferLookupInput(route, index) : null;
          if (!input) return null;
          return [index, findFastTransferInfo(OFFICIAL_FAST_TRANSFERS, input)] as const;
        })
        .filter((entry): entry is readonly [number, FastTransferInfo | null] =>
          Boolean(entry),
        ),
    );
  }, [route]);

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
  const handleToggleFavorite = () => {
    const nextFavorite = toggleFavoriteRoute({
      from,
      to,
      via: via || undefined,
      time: `${route.totalTime}분`,
      transferCount: route.transferCount,
    });
    setIsFavorite(nextFavorite);
    toast(nextFavorite ? "즐겨찾기에 추가했습니다" : "즐겨찾기에서 삭제했습니다");
  };

  return (
    <div className="min-h-screen bg-background pb-[calc(224px+env(safe-area-inset-bottom,0px))]">
      {/* Header */}
      <div className="safe-top nav-bar sticky top-0 z-40">
        <div className="flex items-center px-4 py-3 gap-3">
          <button onClick={() => window.history.back()} className="btn-press p-1">
            <ArrowLeft size={22} className="text-[#1B2838]" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-[15px] font-semibold text-[#1B2838]">경로 상세</span>
          </div>
          <button
            type="button"
            onClick={handleToggleFavorite}
            className="btn-press flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F5F7]"
            aria-label={isFavorite ? "즐겨찾기 삭제" : "즐겨찾기 추가"}
          >
            <Star
              size={18}
              className={isFavorite ? "text-[#C8A218]" : "text-[#8E8E93]"}
              fill={isFavorite ? "#C8A218" : "transparent"}
            />
          </button>
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
              <TransferSegment
                key={idx}
                segment={segment}
                fastTransfer={fastTransfers[idx]}
              />
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

      {/* Start Riding Button — TabBar 위에 떠 있음 */}
      <div
        className="pointer-events-none fixed inset-x-0 z-40"
        style={{ bottom: `calc(76px + env(safe-area-inset-bottom, 0px))` }}
      >
        <div className="mx-auto w-full max-w-[480px]">
          <div className="h-8 bg-gradient-to-t from-background to-transparent" />
          <div className="bg-background px-4 pb-3 pt-2">
            <button
              onClick={() => {
                // 전체 여정(모든 segments)을 직렬화해서 저장. ride/transfer 모두 포함.
                const serialized = route.segments.map((seg, i) => {
                  if (seg.isTransfer) {
                    const prevRide = route.segments
                      .slice(0, i)
                      .reverse()
                      .find(s => !s.isTransfer);
                    const nextRide = route.segments
                      .slice(i + 1)
                      .find(s => !s.isTransfer);
                    const toLine = getLineInfo(seg.lineId);
                    return {
                      type: "transfer" as const,
                      stationName: seg.fromStation.name,
                      fromLineId: prevRide?.lineId || "",
                      toLineId: seg.lineId,
                      toLineName: toLine?.name || seg.lineName,
                      toDirection: nextRide ? `${nextRide.toStation.name} 방면` : "",
                      walkMinutes: seg.time,
                      walkSeconds: seg.transferSeconds,
                      walkDistanceMeters: seg.transferDistanceMeters,
                      fastTransfer: fastTransfers[i],
                    };
                  }
                  return {
                    type: "ride" as const,
                    lineId: seg.lineId,
                    lineName: getLineInfo(seg.lineId)?.name || seg.lineName,
                    direction: seg.pattern?.label ?? `${seg.toStation.name} 방면`,
                    patternLabel: seg.pattern?.label,
                    patternTerminus: seg.pattern?.terminus,
                    fromStationName: seg.fromStation.name,
                    toStationName: seg.toStation.name,
                    stationNames: seg.stations.map(s => s.name),
                  };
                });
                const payload = {
                  segments: serialized,
                  overallFromStation: route.segments[0]?.fromStation.name || "",
                  overallToStation:
                    route.segments[route.segments.length - 1]?.toStation.name || "",
                };
                sessionStorage.setItem("riding_route", JSON.stringify(payload));
                setLocation("/riding");
              }}
              className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1B2838] py-4 text-[16px] font-semibold text-white shadow-lg btn-press"
            >
              <Play size={18} fill="white" />
              탑승 안내 시작
            </button>
          </div>
        </div>
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
  const segmentColor = line?.color || segment.lineColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative pb-1"
    >
      <div
        className="absolute left-[21px] top-6 w-[3px] rounded-full"
        style={{
          backgroundColor: segmentColor,
          bottom: isLast ? "66px" : "16px",
        }}
      />

      {/* Start station */}
      <div
        className="relative grid items-start gap-4"
        style={{ gridTemplateColumns: "44px minmax(0, 1fr)" }}
      >
        <div className="relative z-10 flex h-10 items-center justify-center">
          <div
            className="h-4 w-4 rounded-full border-[3px] bg-white"
            style={{ borderColor: segmentColor }}
          />
        </div>
        <div className="min-w-0 pb-6">
          {isFirst && (
            <p className="mb-0.5 text-[13px] leading-5 text-[#8E8E93]">승차</p>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[22px] font-bold leading-8 text-[#1B2838]">
              {segment.fromStation.name}
            </span>
            <span
              className="line-badge shrink-0 text-[10px]"
              style={{ backgroundColor: segmentColor }}
            >
              {line?.shortName || segment.lineId}
            </span>
          </div>
          {segment.pattern && (
            <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-[#1B2838]">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: segmentColor }}
              />
              {segment.pattern.label} 열차 탑승
              {segment.boardWaitSeconds != null && segment.boardWaitSeconds > 0 && (
                <span className="text-[12px] font-medium text-[#8E8E93]">
                  · 약 {Math.max(1, Math.round(segment.boardWaitSeconds / 60))}분 대기
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Middle stations (collapsible) */}
      {stationCount > 1 && (
        <button
          onClick={onToggle}
          className="btn-press grid w-full items-center gap-4 py-2 text-left"
          style={{ gridTemplateColumns: "44px minmax(0, 1fr)" }}
        >
          <div className="relative z-10 flex h-7 items-center justify-center bg-background">
            <Train size={14} style={{ color: segmentColor }} />
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-xl bg-[#F8F8FA] px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#8E8E93]">
              {stationCount}개 역 이동 ({segment.time}분)
            </span>
            {expanded ? (
              <ChevronUp size={14} className="shrink-0 text-[#8E8E93]" />
            ) : (
              <ChevronDown size={14} className="shrink-0 text-[#8E8E93]" />
            )}
          </div>
        </button>
      )}

      {expanded && middleStations.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="py-1"
        >
          {middleStations.map((station, i) => (
            <div
              key={i}
              className="grid items-center gap-4 py-1.5"
              style={{ gridTemplateColumns: "44px minmax(0, 1fr)" }}
            >
              <div className="relative z-10 flex h-5 items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-[#DADAE0]" />
              </div>
              <span className="truncate text-[16px] font-medium leading-6 text-[#8E8E93]">
                {station.name}
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {/* End station */}
      <div
        className="relative grid items-start gap-4"
        style={{ gridTemplateColumns: "44px minmax(0, 1fr)" }}
      >
        <div className="relative z-10 flex h-10 items-center justify-center">
          <div
            className="h-4 w-4 rounded-full border-[3px] bg-white"
            style={{ borderColor: segmentColor }}
          />
        </div>
        <div className="min-w-0 pb-6">
          {isLast && (
            <p className="mb-0.5 text-[13px] leading-5 text-[#8E8E93]">하차</p>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[22px] font-bold leading-8 text-[#1B2838]">
              {segment.toStation.name}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TransferSegment({
  segment,
  fastTransfer,
}: {
  segment: RouteSegment;
  fastTransfer?: FastTransferInfo | null;
}) {
  const toLine = getLineInfo(segment.lineId);
  const isLongTransfer = isLongTransferSegment(segment);
  const distanceLabel = segment.transferDistanceMeters
    ? ` · ${segment.transferDistanceMeters}m`
    : "";
  const fastTransferLabel = fastTransfer
    ? `빠른 환승 ${formatFastTransferInfo(fastTransfer)}`
    : "빠른 환승 정보 없음";

  return (
    <div
      className="grid items-start gap-4 py-4"
      style={{ gridTemplateColumns: "44px minmax(0, 1fr)" }}
    >
      <div className="flex h-8 items-center justify-center">
        <Footprints size={15} className="text-[#E67E22]" />
      </div>
      <div className="min-w-0 rounded-2xl bg-[#FFF7EF] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[13px] font-medium text-[#E67E22]">환승</span>
          <span
            className="line-badge shrink-0 text-[10px]"
            style={{ backgroundColor: toLine?.color || '#888' }}
          >
            {toLine?.shortName || segment.lineId}
          </span>
          {isLongTransfer && (
            <span className="rounded-full bg-[#FFE7D7] px-2 py-0.5 text-[10px] font-semibold text-[#C15B1B]">
              긴 환승
            </span>
          )}
        </div>
        <p className="mt-1 text-[12px] leading-5 text-[#8E8E93]">
          환승 동선 {formatTransferDuration(segment)}{distanceLabel} · {fastTransferLabel}
        </p>
      </div>
    </div>
  );
}
