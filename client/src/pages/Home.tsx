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
import { useLocation } from "wouter";
import { Search, ArrowRightLeft, Clock, Star, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import MetroMap from "@/components/MetroMap";

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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showRecent, setShowRecent] = useState(false);

  // 노선도에서 역을 선택했을 때
  const handleStationSelect = useCallback((name: string) => {
    if (!from) {
      setFrom(name);
    } else if (!to) {
      setTo(name);
      // 둘 다 선택되면 자동으로 경로 검색
      setTimeout(() => {
        setLocation(`/route-result?from=${encodeURIComponent(from)}&to=${encodeURIComponent(name)}`);
      }, 300);
    } else {
      // 이미 둘 다 있으면 출발역을 교체
      setFrom(name);
      setTo("");
    }
  }, [from, to, setLocation]);

  const handleSearch = () => {
    if (from && to) {
      setLocation(`/route-result?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    } else {
      setLocation(`/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    }
  };

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
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
                onClick={() => setLocation(`/search?type=from&to=${encodeURIComponent(to)}`)}
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
              <div className="border-t border-[#E5E5EA] mx-2" />
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setLocation(`/search?type=to&from=${encodeURIComponent(from)}`)}
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
          onStationSelect={handleStationSelect}
          highlightedStation={from || to || undefined}
        />
      </div>

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
