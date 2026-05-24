/**
 * 노선도 화면 - SVG 인터랙티브 노선도 + 리스트 뷰 토글
 * Design: iOS 스타일 세그먼트 컨트롤로 뷰 전환
 * - 지도 뷰: SVG 기반 인터랙티브 노선도
 * - 리스트 뷰: 기존 노선별 역 목록
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight, Map as MapIcon, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAllLines, getStationsByLine, getLineInfo } from "@/lib/pathfinder";
import type { Line, Station } from "@/lib/pathfinder";
import MetroMap from "@/components/MetroMap";

type ViewMode = "map" | "list";

export default function MapView() {
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const lines = getAllLines();

  const handleLineFilter = (lineId: string) => {
    setSelectedLines(prev => {
      if (prev.includes(lineId)) {
        return prev.filter(id => id !== lineId);
      }
      return [...prev, lineId];
    });
  };

  const clearFilter = () => {
    setSelectedLines([]);
  };

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      {/* Header */}
      <header className="safe-top pt-4 px-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#1B2838]">
              노선도
            </h1>
            <p className="text-[14px] text-[#8E8E93] mt-0.5">
              수도권 전체 {lines.length}개 노선
            </p>
          </div>
        </div>

        {/* Segment Control */}
        <div className="mt-3 bg-[#F5F5F7] rounded-xl p-1 flex">
          <button
            onClick={() => setViewMode("map")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
              viewMode === "map"
                ? "bg-white text-[#1B2838] shadow-sm"
                : "text-[#8E8E93]"
            }`}
          >
            <MapIcon size={14} />
            지도
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
              viewMode === "list"
                ? "bg-white text-[#1B2838] shadow-sm"
                : "text-[#8E8E93]"
            }`}
          >
            <List size={14} />
            목록
          </button>
        </div>
      </header>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === "map" ? (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            {/* Line filter chips */}
            <div className="px-4 mb-2">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
                <button
                  onClick={clearFilter}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                    selectedLines.length === 0
                      ? "bg-[#1B2838] text-white"
                      : "bg-[#F5F5F7] text-[#1B2838]"
                  }`}
                >
                  전체
                </button>
                {lines.map(line => (
                  <button
                    key={line.id}
                    onClick={() => handleLineFilter(line.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                      selectedLines.includes(line.id)
                        ? "text-white shadow-sm"
                        : "bg-[#F5F5F7] text-[#1B2838]"
                    }`}
                    style={
                      selectedLines.includes(line.id)
                        ? { backgroundColor: line.color }
                        : {}
                    }
                  >
                    {line.shortName}
                  </button>
                ))}
              </div>
            </div>

            {/* Map container */}
            <div className="flex-1 min-h-[60vh] mx-2 rounded-2xl overflow-hidden border border-[#F0F0F2]">
              <MetroMap selectedLines={selectedLines} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1"
          >
            {/* Line selector - horizontal scroll */}
            <div className="px-4 mb-4">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                <button
                  onClick={() => setSelectedLine(null)}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-[13px] font-medium btn-press transition-all ${
                    !selectedLine
                      ? "bg-[#1B2838] text-white"
                      : "bg-[#F5F5F7] text-[#1B2838]"
                  }`}
                >
                  전체
                </button>
                {lines.map(line => (
                  <button
                    key={line.id}
                    onClick={() => setSelectedLine(line.id)}
                    className={`shrink-0 px-3.5 py-2 rounded-full text-[13px] font-medium btn-press transition-all ${
                      selectedLine === line.id
                        ? "text-white shadow-sm"
                        : "bg-[#F5F5F7] text-[#1B2838]"
                    }`}
                    style={
                      selectedLine === line.id
                        ? { backgroundColor: line.color }
                        : {}
                    }
                  >
                    {line.shortName}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selectedLine ? (
                <LineStations
                  key={selectedLine}
                  lineId={selectedLine}
                  setLocation={setLocation}
                />
              ) : (
                <AllLines
                  key="all"
                  lines={lines}
                  onSelect={setSelectedLine}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AllLines({
  lines,
  onSelect,
}: {
  lines: Line[];
  onSelect: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4"
    >
      <div className="ios-card divide-y divide-[#F0F0F2]">
        {lines.map((line, idx) => (
          <motion.button
            key={line.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.02, duration: 0.2 }}
            className="w-full flex items-center px-4 py-3.5 btn-press"
            onClick={() => onSelect(line.id)}
          >
            <span
              className="line-badge mr-3"
              style={{ backgroundColor: line.color }}
            >
              {line.shortName}
            </span>
            <span className="flex-1 text-left text-[15px] font-medium text-[#1B2838]">
              {line.name}
            </span>
            <ChevronRight size={16} className="text-[#C7C7CC]" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function LineStations({
  lineId,
  setLocation,
}: {
  lineId: string;
  setLocation: (path: string) => void;
}) {
  const stations = getStationsByLine(lineId);
  const line = getLineInfo(lineId);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="px-4"
    >
      <div className="ios-card overflow-hidden">
        {/* Line header */}
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ backgroundColor: `${line?.color}10` }}
        >
          <span
            className="line-badge"
            style={{ backgroundColor: line?.color }}
          >
            {line?.shortName}
          </span>
          <span className="text-[14px] font-semibold text-[#1B2838]">
            {line?.name} ({stations.length}개 역)
          </span>
        </div>

        {/* Station list */}
        <div className="divide-y divide-[#F0F0F2] max-h-[60vh] overflow-y-auto">
          {stations.map((station, idx) => (
            <button
              key={station.id}
              className="w-full flex items-center px-4 py-3 btn-press"
              onClick={() =>
                setLocation(
                  `/station/${encodeURIComponent(station.name)}`
                )
              }
            >
              {/* Timeline */}
              <div className="relative mr-3 flex flex-col items-center">
                <div
                  className="w-2.5 h-2.5 rounded-full border-2 bg-white"
                  style={{ borderColor: line?.color }}
                />
                {idx < stations.length - 1 && (
                  <div
                    className="absolute top-3 w-[2px] h-5"
                    style={{ backgroundColor: `${line?.color}40` }}
                  />
                )}
              </div>

              <div className="flex-1 text-left">
                <span className="text-[14px] text-[#1B2838]">
                  {station.name}
                </span>
              </div>

              {/* Transfer badges */}
              {station.transfers.length > 0 && (
                <div className="flex gap-1">
                  {station.transfers.slice(0, 3).map(tId => {
                    const tLine = getLineInfo(tId);
                    return tLine ? (
                      <span
                        key={tId}
                        className="line-badge text-[9px]"
                        style={{
                          backgroundColor: tLine.color,
                          minWidth: "1.2rem",
                          height: "1.2rem",
                        }}
                      >
                        {tLine.shortName}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
