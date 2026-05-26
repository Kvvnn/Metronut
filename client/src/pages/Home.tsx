/**
 * 홈 화면 - 재설계
 * UX 흐름: 앱 실행 → 노선도 보기 → 역 선택 → 경로 검색
 * 
 * 핵심 원칙:
 * - 노선도가 화면의 주인공 (전체 화면의 60% 이상)
 * - 경로 검색은 노선도 위에 플로팅 카드로 배치
 * - 실시간 도착 정보는 여기서 제거 (경로 선택 후에 표시)
 * - 최근 검색은 하단에 컴팩트하게
 */
import { useLocation, useSearch } from "wouter";
import {
  Search,
  ArrowRightLeft,
  Clock,
  Star,
  ChevronRight,
  Plus,
  X,
  Trash2,
  House,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import MetroMap from "@/components/MetroMap";
import type { StationRole } from "@/components/MetroMap";
import RouteConfirmDialog from "@/components/RouteConfirmDialog";
import StationSearchDropdown from "@/components/StationSearchDropdown";
import {
  getFavoriteRoutes,
  removeFavoriteRoute,
  type FavoriteRoute,
} from "@/lib/routeFavorites";
import {
  getStationFavoriteMap,
  STATION_FAVORITE_KINDS,
  type StationFavoriteKind,
  type StationFavoriteMap,
} from "@/lib/stationFavorites";

const stationFavoriteIconMap = {
  home: House,
  work: Briefcase,
  school: GraduationCap,
} satisfies Record<StationFavoriteKind, typeof House>;

const stationFavoriteColorMap = {
  home: "#4A90D9",
  work: "#7C5CFF",
  school: "#27AE60",
} satisfies Record<StationFavoriteKind, string>;

const recentRoutes = [
  { from: "강남", to: "홍대입구", time: "32분" },
  { from: "서울역", to: "잠실", time: "28분" },
  { from: "신도림", to: "왕십리", time: "25분" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const [via, setVia] = useState(searchParams.get("via") || "");
  const [isViaExpanded, setIsViaExpanded] = useState(Boolean(searchParams.get("via")));
  const [showRecent, setShowRecent] = useState(false);
  const [favoriteRoutes, setFavoriteRoutes] = useState<FavoriteRoute[]>(() => getFavoriteRoutes());
  const [stationFavoriteMap, setStationFavoriteMap] = useState<StationFavoriteMap>(() =>
    getStationFavoriteMap(),
  );
  const prefersReducedMotion = useReducedMotion();
  const showViaField = isViaExpanded || Boolean(via);
  const viaFieldTransition = {
    duration: prefersReducedMotion ? 0.01 : 0.24,
    ease: [0.22, 1, 0.36, 1] as const,
  };
  // confirm 팝업이 dismiss됐는지 (취소 누르면 true, 새 선택 시 false로 리셋)
  const [confirmDismissed, setConfirmDismissed] = useState(false);
  // 검색 dropdown 상태
  const [searchField, setSearchField] = useState<"from" | "via" | "to" | null>(null);

  useEffect(() => {
    const nextVia = searchParams.get("via") || "";
    setFrom(searchParams.get("from") || "");
    setTo(searchParams.get("to") || "");
    setVia(nextVia);
    setIsViaExpanded(Boolean(nextVia));
  }, [search]);

  useEffect(() => {
    const refreshFavorites = () => {
      setFavoriteRoutes(getFavoriteRoutes());
      setStationFavoriteMap(getStationFavoriteMap());
    };
    refreshFavorites();
    window.addEventListener("storage", refreshFavorites);
    window.addEventListener("metro:favorites-changed", refreshFavorites);
    window.addEventListener("metro:station-favorites-changed", refreshFavorites);
    window.addEventListener("focus", refreshFavorites);
    return () => {
      window.removeEventListener("storage", refreshFavorites);
      window.removeEventListener("metro:favorites-changed", refreshFavorites);
      window.removeEventListener("metro:station-favorites-changed", refreshFavorites);
      window.removeEventListener("focus", refreshFavorites);
    };
  }, []);

  const handleStationRoleSelect = useCallback((name: string, role: StationRole) => {
    setConfirmDismissed(false);
    if (role === "from") {
      setFrom(name);
      if (to === name) setTo("");
      if (via === name) setVia("");
    } else if (role === "to") {
      setTo(name);
      if (from === name) setFrom("");
      if (via === name) setVia("");
    } else {
      setVia(name);
      setIsViaExpanded(true);
      if (from === name) setFrom("");
      if (to === name) setTo("");
    }
  }, [from, to, via]);

  const handleRevealVia = useCallback(() => {
    setIsViaExpanded(true);
    setConfirmDismissed(true);
  }, []);

  const handleClearVia = useCallback(() => {
    setVia("");
    setIsViaExpanded(false);
  }, []);

  const buildRouteResultPath = useCallback((
    routeFrom = from,
    routeTo = to,
    routeVia = via,
  ) => {
    const params = new URLSearchParams({ from: routeFrom, to: routeTo, origin: "home" });
    if (routeVia) params.set("via", routeVia);
    return `/route-result?${params.toString()}`;
  }, [from, to, via]);

  const handleSearch = () => {
    if (from && to) {
      setLocation(buildRouteResultPath());
    } else if (!from) {
      setSearchField("from");
    } else {
      setSearchField("to");
    }
  };

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  const quickRoutes = showRecent ? recentRoutes : favoriteRoutes;
  const stationFavoriteCount = STATION_FAVORITE_KINDS.filter(
    ({ kind }) => stationFavoriteMap[kind],
  ).length;
  const favoriteItemCount = favoriteRoutes.length + stationFavoriteCount;
  const quickAccessCount = showRecent ? recentRoutes.length : favoriteItemCount;

  const handleFavoriteStationSelect = (stationName: string) => {
    const targetField = searchField ?? (!from ? "from" : !to ? "to" : "to");
    handleStationRoleSelect(stationName, targetField);
    if (targetField === "via") setIsViaExpanded(true);
    setSearchField(null);
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ paddingBottom: "calc(52px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Floating Search Card - 상단 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="px-4 pb-2 bg-white/95 backdrop-blur-lg z-30 border-b border-[#F0F0F2]/50"
        style={{ paddingTop: "calc(max(28px, env(safe-area-inset-top, 0px) + 12px))" }}
      >
        {/* Compact search bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[#F5F5F7] rounded-2xl px-3 py-2.5">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setSearchField("from")}
              >
                <div className="w-2 h-2 rounded-full bg-[#4A90D9] shrink-0" />
                <span className={`text-[14px] truncate ${from ? "text-[#1B2838] font-medium" : "text-[#8E8E93]"}`}>
                  {from || "출발역"}
                </span>
                {from && (
                  <button onClick={(e) => { e.stopPropagation(); setFrom(""); }} className="ml-auto shrink-0">
                    <X size={14} className="text-[#C7C7CC]" />
                  </button>
                )}
              </div>
              <div className="relative flex min-h-6 items-center">
                <div className="ml-[3px] h-5 w-px rounded-full bg-[#D9D9DE]" />
                <div className="ml-5 flex-1 border-t border-[#E5E5EA]" />
                {!showViaField && (
                  <button
                    type="button"
                    onClick={handleRevealVia}
                    className="btn-press absolute left-[-7px] top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[#CFE9D9] bg-white text-[#27AE60] shadow-sm transition-colors hover:bg-[#EAF7EF]"
                    aria-label="경유역 영역 펼치기"
                    aria-expanded={showViaField}
                  >
                    <Plus size={14} strokeWidth={2.4} />
                  </button>
                )}
              </div>
              <AnimatePresence initial={false}>
                {showViaField && (
                  <motion.div
                    key="via-field"
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    transition={viaFieldTransition}
                    className="overflow-hidden"
                  >
                    <div
                      className="flex min-h-9 cursor-pointer items-center gap-2 rounded-xl bg-[#EAF7EF] px-2.5 py-2"
                      onClick={() => setSearchField("via")}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSearchField("via");
                        }
                      }}
                    >
                      <div className="h-2 w-2 shrink-0 rounded-full bg-[#27AE60]" />
                      <span className={`truncate text-[14px] ${via ? "font-medium text-[#1B2838]" : "text-[#4F8A63]"}`}>
                        {via || "경유역"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearVia();
                        }}
                        className="btn-press ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#6D9B7A]"
                        aria-label="경유역 영역 닫기"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {showViaField && (
                <div className="mx-2 border-t border-[#E5E5EA]" />
              )}
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setSearchField("to")}
              >
                <div className="w-2 h-2 rounded-full bg-[#E74C3C] shrink-0" />
                <span className={`text-[14px] truncate ${to ? "text-[#1B2838] font-medium" : "text-[#8E8E93]"}`}>
                  {to || "도착역"}
                </span>
                {to && (
                  <button onClick={(e) => { e.stopPropagation(); setTo(""); }} className="ml-auto shrink-0">
                    <X size={14} className="text-[#C7C7CC]" />
                  </button>
                )}
              </div>
            </div>
            {/* Swap */}
            <button
              onClick={handleSwap}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm btn-press shrink-0"
            >
              <ArrowRightLeft size={14} className="text-[#1B2838]" />
            </button>
          </div>
          {/* Search button */}
          <button
            onClick={handleSearch}
            className="w-11 h-11 bg-[#1B2838] rounded-2xl flex items-center justify-center btn-press shadow-sm shrink-0"
          >
            <Search size={18} className="text-white" />
          </button>
        </div>

        {/* Station selection hint */}
        <AnimatePresence>
          {(!from || !to) && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[11px] text-[#8E8E93] text-center mt-1.5"
            >
              {!from ? "노선도에서 출발역을 선택하세요" : "노선도에서 도착역을 선택하세요"}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Metro Map - 메인 영역 */}
      <div className="flex-1 relative">
        <MetroMap
          onStationRoleSelect={handleStationRoleSelect}
          highlightedStation={from || to || via || undefined}
          selections={{ from, via, to }}
        />
      </div>

      {/* Route confirmation overlay */}
      <RouteConfirmDialog
        open={!!from && !!to && !confirmDismissed}
        from={from}
        via={via}
        to={to}
        onConfirm={() => setLocation(buildRouteResultPath())}
        onCancel={() => setConfirmDismissed(true)}
      />

      {/* 역 검색 dropdown (inline, navigation 없음) */}
      <StationSearchDropdown
        open={searchField !== null}
        field={searchField}
        onSelect={name => {
          if (!searchField) return;
          handleStationRoleSelect(name, searchField);
          if (searchField === "via") setIsViaExpanded(true);
          setSearchField(null);
        }}
        onClose={() => setSearchField(null)}
      />

      {/* Bottom Quick Access - 최근/즐겨찾기 */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="z-20 rounded-t-2xl border-t border-[#F0F0F2] bg-white/95 shadow-[0_-8px_24px_rgba(27,40,56,0.08)] backdrop-blur-md safe-bottom"
      >
        <div className="sheet-handle" />
        <div className="px-4 pb-3 pt-1">
          {/* Toggle recent/favorites */}
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex rounded-2xl bg-[#F5F5F7] p-1">
              <button
                type="button"
                onClick={() => setShowRecent(false)}
                className={`btn-press flex min-h-8 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold transition-all ${
                  !showRecent
                    ? "bg-white text-[#1B2838] shadow-sm"
                    : "text-[#8E8E93]"
                }`}
              >
                <Star
                  size={13}
                  className={!showRecent ? "text-[#C8A218]" : "text-[#A7A7AD]"}
                  fill={!showRecent ? "#C8A218" : "transparent"}
                />
                즐겨찾기
              </button>
              <button
                type="button"
                onClick={() => setShowRecent(true)}
                className={`btn-press flex min-h-8 items-center gap-1.5 rounded-xl px-3 text-[12px] font-bold transition-all ${
                  showRecent
                    ? "bg-white text-[#1B2838] shadow-sm"
                    : "text-[#8E8E93]"
                }`}
              >
                <Clock
                  size={13}
                  className={showRecent ? "text-[#4A90D9]" : "text-[#A7A7AD]"}
                />
                최근 검색
              </button>
            </div>
            <span className="shrink-0 rounded-full bg-[#EEF3F8] px-2 py-1 text-[11px] font-semibold text-[#607083]">
              {quickAccessCount}개
            </span>
          </div>

          {!showRecent && (
            <div className="mb-2 grid grid-cols-3 gap-2">
              {STATION_FAVORITE_KINDS.map(({ kind, label }) => {
                const favorite = stationFavoriteMap[kind];
                const Icon = stationFavoriteIconMap[kind];
                const color = stationFavoriteColorMap[kind];

                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={!favorite}
                    onClick={() => favorite && handleFavoriteStationSelect(favorite.stationName)}
                    className={`btn-press min-w-0 rounded-2xl border px-2.5 py-2 text-left transition-all disabled:cursor-default ${
                      favorite
                        ? "border-[#ECECF1] bg-white text-[#1B2838]"
                        : "border-[#ECECF1] bg-[#F8F8FA] text-[#A0A0A7]"
                    }`}
                  >
                    <span className="mb-1 flex items-center gap-1.5">
                      <Icon
                        size={14}
                        style={{ color: favorite ? color : "#A0A0A7" }}
                      />
                      <span className="text-[11px] font-bold">{label}</span>
                    </span>
                    <span className="block truncate text-[12px] font-bold">
                      {favorite?.stationName ?? "미설정"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Route list */}
          <div className="max-h-[128px] overflow-y-auto divide-y divide-[#F0F0F2]">
            {favoriteItemCount === 0 && !showRecent ? (
              <div className="flex min-h-[72px] items-center gap-3 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF7D9]">
                  <Star size={15} className="text-[#C8A218]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-[#1B2838]">
                    저장된 즐겨찾기가 없습니다
                  </span>
                  <span className="mt-0.5 block text-[11px] font-medium text-[#8E8E93]">
                    역 상세에서 자주 가는 역을 설정하거나 경로 상세에서 별을 누르세요
                  </span>
                </span>
              </div>
            ) : quickRoutes.length === 0 && !showRecent ? null : (
              quickRoutes.map((route, idx) => {
                const isFavoriteItem = "id" in route;
                const routeVia = isFavoriteItem ? route.via : "";
                const routeKey = isFavoriteItem ? route.id : String(idx);
                const routeMeta =
                  !showRecent && isFavoriteItem && typeof route.transferCount === "number"
                    ? `즐겨찾기 경로 · 환승 ${route.transferCount}회`
                    : showRecent
                    ? "최근 검색 경로"
                    : "즐겨찾기 경로";

                return (
                  <div key={routeKey} className="flex min-h-[54px] w-full items-center gap-1 py-2">
                    <button
                      type="button"
                      className="btn-press flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => setLocation(buildRouteResultPath(route.from, route.to, routeVia))}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          showRecent ? "bg-[#EBF4FF]" : "bg-[#FFF7D9]"
                        }`}
                      >
                        {showRecent ? (
                          <Clock size={15} className="text-[#4A90D9]" />
                        ) : (
                          <Star size={15} className="text-[#C8A218]" fill="#C8A218" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-[14px] font-bold text-[#1B2838]">
                            {route.from}
                          </span>
                          <span className="text-[12px] font-medium text-[#A0A0A7]">→</span>
                          {routeVia && (
                            <>
                              <span className="truncate text-[14px] font-bold text-[#1B2838]">
                                {routeVia}
                              </span>
                              <span className="text-[12px] font-medium text-[#A0A0A7]">→</span>
                            </>
                          )}
                          <span className="truncate text-[14px] font-bold text-[#1B2838]">
                            {route.to}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-medium text-[#8E8E93]">
                          {routeMeta}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="rounded-full bg-[#F5F5F7] px-2.5 py-1 text-[12px] font-bold text-[#607083]">
                          {route.time || "보기"}
                        </span>
                        <ChevronRight size={14} className="text-[#C7C7CC]" />
                      </span>
                    </button>
                    {isFavoriteItem && (
                      <button
                        type="button"
                        aria-label={`${route.from}에서 ${route.to} 즐겨찾기 삭제`}
                        onClick={() => {
                          removeFavoriteRoute(route.id);
                          setFavoriteRoutes(getFavoriteRoutes());
                        }}
                        className="btn-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5F5F7]"
                      >
                        <Trash2 size={13} className="text-[#A0A0A7]" />
                      </button>
                    )}
                  </div>
                );
              }))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
