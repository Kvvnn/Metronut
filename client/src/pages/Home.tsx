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
import { Search, ArrowRightLeft, Clock, Star, ChevronRight, Plus, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import MetroMap from "@/components/MetroMap";
import type { StationRole } from "@/components/MetroMap";
import RouteConfirmDialog from "@/components/RouteConfirmDialog";
import StationSearchDropdown from "@/components/StationSearchDropdown";

const recentRoutes = [
  { from: "강남", to: "홍대입구", time: "32분" },
  { from: "서울역", to: "잠실", time: "28분" },
  { from: "신도림", to: "왕십리", time: "25분" },
];

const favoriteRoutes = [
  { from: "강남", to: "여의도", time: "35분" },
  { from: "사당", to: "교대", time: "8분" },
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

  const buildRouteResultPath = useCallback(() => {
    const params = new URLSearchParams({ from, to });
    if (via) params.set("via", via);
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
        className="safe-top pt-3 px-4 pb-2 bg-white/95 backdrop-blur-lg z-30 border-b border-[#F0F0F2]/50"
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
        className="bg-white border-t border-[#F0F0F2] safe-bottom z-20"
      >
        {/* Toggle recent/favorites */}
        <div className="flex items-center px-4 pt-2 pb-1">
          <button
            onClick={() => setShowRecent(false)}
            className={`text-[12px] font-semibold mr-4 pb-1 border-b-2 transition-colors ${
              !showRecent ? "text-[#1B2838] border-[#1B2838]" : "text-[#8E8E93] border-transparent"
            }`}
          >
            즐겨찾기
          </button>
          <button
            onClick={() => setShowRecent(true)}
            className={`text-[12px] font-semibold pb-1 border-b-2 transition-colors ${
              showRecent ? "text-[#1B2838] border-[#1B2838]" : "text-[#8E8E93] border-transparent"
            }`}
          >
            최근 검색
          </button>
        </div>

        {/* Route list */}
        <div className="px-4 pb-2 max-h-[120px] overflow-y-auto">
          {(showRecent ? recentRoutes : favoriteRoutes).map((route, idx) => (
            <button
              key={idx}
              className="w-full flex items-center py-2 btn-press"
              onClick={() => setLocation(`/route-result?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`)}
            >
              {showRecent ? (
                <Clock size={14} className="text-[#C7C7CC] mr-2.5 shrink-0" />
              ) : (
                <Star size={14} className="text-[#F1C40F] mr-2.5 shrink-0" fill="#F1C40F" />
              )}
              <span className="text-[13px] font-medium text-[#1B2838]">{route.from}</span>
              <span className="text-[11px] text-[#8E8E93] mx-1.5">→</span>
              <span className="text-[13px] font-medium text-[#1B2838]">{route.to}</span>
              <span className="text-[12px] text-[#8E8E93] ml-auto">{route.time}</span>
              <ChevronRight size={12} className="text-[#C7C7CC] ml-1" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
