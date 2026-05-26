/**
 * 검색 페이지
 * Design: iOS 스타일 검색 인터페이스
 * - 실시간 자동완성
 * - 노선별 뱃지 표시
 * - 최근 검색 히스토리
 */
import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, X, ArrowRightLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchStations, getAllLines } from "@/lib/pathfinder";
import type { Line } from "@/lib/pathfinder";

type ActiveField = "from" | "via" | "to";

export default function Search() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const type = searchParams.get("type") || "from";
  const initialField: ActiveField =
    type === "via" ? "via" : type === "to" ? "to" : "from";
  
  const [fromQuery, setFromQuery] = useState(searchParams.get("from") || "");
  const [viaQuery, setViaQuery] = useState(searchParams.get("via") || "");
  const [toQuery, setToQuery] = useState(searchParams.get("to") || "");
  const [activeField, setActiveField] = useState<ActiveField>(initialField);
  const [results, setResults] = useState<{ name: string; lines: Line[] }[]>([]);
  
  const fromRef = useRef<HTMLInputElement>(null);
  const viaRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeField === "from") {
      fromRef.current?.focus();
    } else if (activeField === "via") {
      viaRef.current?.focus();
    } else {
      toRef.current?.focus();
    }
  }, [activeField]);

  useEffect(() => {
    const query = getActiveQuery();
    if (query.trim()) {
      const found = searchStations(query);
      setResults(found);
    } else {
      setResults([]);
    }
  }, [fromQuery, viaQuery, toQuery, activeField]);

  const getActiveQuery = () => {
    if (activeField === "from") return fromQuery;
    if (activeField === "via") return viaQuery;
    return toQuery;
  };

  const handleSelect = (name: string) => {
    if (activeField === "via") {
      setViaQuery(name);
      setLocation(buildHomePath(name));
    } else if (activeField === "from") {
      setFromQuery(name);
      if (!toQuery) {
        setActiveField("to");
        setTimeout(() => toRef.current?.focus(), 100);
      } else {
        // 둘 다 있으면 경로 검색
        setLocation(buildRouteResultPath(name, toQuery));
      }
    } else {
      setToQuery(name);
      if (!fromQuery) {
        setActiveField("from");
        setTimeout(() => fromRef.current?.focus(), 100);
      } else {
        setLocation(buildRouteResultPath(fromQuery, name));
      }
    }
  };

  const buildRouteResultPath = (from: string, to: string) => {
    const params = new URLSearchParams({ from, to });
    if (viaQuery) params.set("via", viaQuery);
    return `/route-result?${params.toString()}`;
  };

  const buildHomePath = (via: string) => {
    const params = new URLSearchParams();
    if (fromQuery) params.set("from", fromQuery);
    if (toQuery) params.set("to", toQuery);
    if (via) params.set("via", via);
    const query = params.toString();
    return query ? `/?${query}` : "/";
  };

  const handleSwap = () => {
    const temp = fromQuery;
    setFromQuery(toQuery);
    setToQuery(temp);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="safe-top nav-bar sticky top-0 z-40">
        <div className="flex items-center px-4 py-3 gap-3">
          <button onClick={() => setLocation(buildHomePath(viaQuery))} className="btn-press p-1">
            <ArrowLeft size={22} className="text-[#1B2838]" />
          </button>
          
          <div className="flex-1 flex flex-col gap-2">
            {/* From input */}
            <div className={`flex items-center gap-2 bg-[#F5F5F7] rounded-lg px-3 py-2.5 transition-all ${activeField === "from" ? "ring-2 ring-[#4A90D9]/30" : ""}`}>
              <div className="w-2 h-2 rounded-full bg-[#4A90D9] shrink-0" />
              <input
                ref={fromRef}
                type="text"
                value={fromQuery}
                onChange={(e) => setFromQuery(e.target.value)}
                onFocus={() => setActiveField("from")}
                placeholder="출발역"
                className="flex-1 bg-transparent text-[14px] text-[#1B2838] placeholder:text-[#8E8E93] outline-none"
              />
              {fromQuery && (
                <button onClick={() => setFromQuery("")} className="p-0.5">
                  <X size={14} className="text-[#8E8E93]" />
                </button>
              )}
            </div>
            {(activeField === "via" || viaQuery) && (
              <div className={`flex items-center gap-2 bg-[#F5F5F7] rounded-lg px-3 py-2.5 transition-all ${activeField === "via" ? "ring-2 ring-[#27AE60]/30" : ""}`}>
                <div className="w-2 h-2 rounded-full bg-[#27AE60] shrink-0" />
                <input
                  ref={viaRef}
                  type="text"
                  value={viaQuery}
                  onChange={(e) => setViaQuery(e.target.value)}
                  onFocus={() => setActiveField("via")}
                  placeholder="경유역"
                  className="flex-1 bg-transparent text-[14px] text-[#1B2838] placeholder:text-[#8E8E93] outline-none"
                />
                {viaQuery && (
                  <button onClick={() => setViaQuery("")} className="p-0.5">
                    <X size={14} className="text-[#8E8E93]" />
                  </button>
                )}
              </div>
            )}
            {/* To input */}
            <div className={`flex items-center gap-2 bg-[#F5F5F7] rounded-lg px-3 py-2.5 transition-all ${activeField === "to" ? "ring-2 ring-[#4A90D9]/30" : ""}`}>
              <div className="w-2 h-2 rounded-full bg-[#E74C3C] shrink-0" />
              <input
                ref={toRef}
                type="text"
                value={toQuery}
                onChange={(e) => setToQuery(e.target.value)}
                onFocus={() => setActiveField("to")}
                placeholder="도착역"
                className="flex-1 bg-transparent text-[14px] text-[#1B2838] placeholder:text-[#8E8E93] outline-none"
              />
              {toQuery && (
                <button onClick={() => setToQuery("")} className="p-0.5">
                  <X size={14} className="text-[#8E8E93]" />
                </button>
              )}
            </div>
          </div>

          <button onClick={handleSwap} className="btn-press p-2">
            <ArrowRightLeft size={18} className="text-[#8E8E93]" />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 pt-2">
        <AnimatePresence mode="wait">
          {results.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="ios-card divide-y divide-[#F0F0F2]">
                {results.map((station, idx) => (
                  <motion.button
                    key={station.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                    className="w-full flex items-center px-4 py-3.5 btn-press"
                    onClick={() => handleSelect(station.name)}
                  >
                    <div className="flex-1 text-left">
                      <span className="text-[15px] font-medium text-[#1B2838]">
                        {station.name}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {station.lines.map((line) => (
                        <span
                          key={line.id}
                          className="line-badge"
                          style={{ backgroundColor: line.color }}
                        >
                          {line.shortName}
                        </span>
                      ))}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-8 text-center"
            >
              <p className="text-[14px] text-[#8E8E93]">
                {getActiveQuery()
                  ? "검색 결과가 없습니다"
                  : "역 이름을 입력하세요"}
              </p>
              {/* Popular stations */}
              <div className="mt-6">
                <p className="text-[13px] text-[#8E8E93] mb-3">자주 검색하는 역</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["강남", "홍대입구", "서울역", "잠실", "신도림", "왕십리", "여의도", "사당"].map(name => (
                    <button
                      key={name}
                      onClick={() => handleSelect(name)}
                      className="px-3.5 py-2 bg-[#F5F5F7] rounded-full text-[13px] font-medium text-[#1B2838] btn-press"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
