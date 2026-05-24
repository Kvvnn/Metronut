/**
 * 역 상세 화면
 * Design: iOS 스타일 정보 카드 - Seoul Flow 디자인
 * - 실시간 열차 도착시간 (API 연동)
 * - 출구 정보
 * - 환승 정보
 * - 혼잡도 (2차 기능 더미)
 */
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { ArrowLeft, Train, Clock, DoorOpen, ArrowUpDown, Star, Users, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { getStationInfo, getLineInfo } from "@/lib/pathfinder";
import { getRealtimeArrivals, getSimulatedCongestion, checkApiKeyStatus } from "@/lib/realtimeApi";
import type { ArrivalInfo, CongestionInfo } from "@/lib/realtimeApi";
import { toast } from "sonner";

export default function StationInfo() {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name || "");
  const stations = getStationInfo(decodedName);
  const [selectedLine, setSelectedLine] = useState(stations[0]?.lineId || "");
  const [arrivals, setArrivals] = useState<ArrivalInfo[]>([]);
  const [congestion, setCongestion] = useState<CongestionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isSimulated, setIsSimulated] = useState(true);

  const line = getLineInfo(selectedLine);

  useEffect(() => {
    loadArrivals();
    setCongestion(getSimulatedCongestion());
    checkApiKeyStatus().then(hasKey => setIsSimulated(!hasKey));
  }, [decodedName, selectedLine]);

  const loadArrivals = async () => {
    setLoading(true);
    try {
      const data = await getRealtimeArrivals(decodedName);
      setArrivals(data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!stations.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#8E8E93]">역 정보를 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="safe-top nav-bar sticky top-0 z-40">
        <div className="flex items-center px-4 py-3 gap-3">
          <button onClick={() => window.history.back()} className="btn-press p-1">
            <ArrowLeft size={22} className="text-[#1B2838]" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-[15px] font-semibold text-[#1B2838]">{decodedName}역</span>
          </div>
          <button
            onClick={() => toast("즐겨찾기에 추가되었습니다")}
            className="btn-press p-1"
          >
            <Star size={20} className="text-[#C7C7CC]" />
          </button>
        </div>
      </div>

      {/* Line selector */}
      {stations.length > 1 && (
        <div className="px-4 pt-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {stations.map(station => {
              const stationLine = getLineInfo(station.lineId);
              const isSelected = station.lineId === selectedLine;
              return (
                <button
                  key={station.id}
                  onClick={() => setSelectedLine(station.lineId)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full shrink-0 btn-press transition-all ${
                    isSelected
                      ? "text-white shadow-sm"
                      : "bg-[#F5F5F7] text-[#1B2838]"
                  }`}
                  style={isSelected ? { backgroundColor: stationLine?.color } : {}}
                >
                  <span className="text-[13px] font-medium">
                    {stationLine?.name || station.lineId}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Realtime Arrival info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="px-4 mt-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-[#1B2838] flex items-center gap-2">
            <Train size={16} style={{ color: line?.color }} />
            실시간 도착 정보
            {isSimulated && (
              <span className="text-[10px] bg-[#FFF3EB] text-[#E67E22] px-1.5 py-0.5 rounded">
                시뮬레이션
              </span>
            )}
          </h3>
          <button onClick={loadArrivals} className="btn-press p-1.5 rounded-full bg-[#F5F5F7]">
            <RefreshCw size={14} className={`text-[#8E8E93] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="ios-card divide-y divide-[#F0F0F2]">
          {loading ? (
            <div className="p-4 animate-pulse">
              <div className="h-4 bg-[#F0F0F2] rounded w-32 mb-3" />
              <div className="h-6 bg-[#F0F0F2] rounded w-20" />
            </div>
          ) : arrivals.length > 0 ? (
            arrivals.map((arrival, idx) => (
              <div key={idx} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-[#8E8E93] mb-1">{arrival.direction}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] font-bold text-[#1B2838]">
                        {arrival.arrivalMessage}
                      </span>
                      {arrival.trainType === "급행" && (
                        <span className="text-[10px] font-semibold text-[#E74C3C] bg-[#E74C3C]/10 px-1.5 py-0.5 rounded">
                          급행
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[12px] text-[#8E8E93]">{arrival.currentStation}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center">
              <p className="text-[14px] text-[#8E8E93]">도착 정보가 없습니다</p>
            </div>
          )}
        </div>

        {lastUpdated && (
          <p className="text-[11px] text-[#C7C7CC] mt-2 text-right">
            마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        )}
      </motion.div>

      {/* Transfer info */}
      {stations.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="px-4 mt-4"
        >
          <h3 className="text-[14px] font-semibold text-[#1B2838] mb-3 flex items-center gap-2">
            <ArrowUpDown size={16} className="text-[#E67E22]" />
            환승 정보
          </h3>
          <div className="ios-card p-4">
            <div className="space-y-3">
              {stations
                .filter(s => s.lineId !== selectedLine)
                .map(station => {
                  const transferLine = getLineInfo(station.lineId);
                  return (
                    <div key={station.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="line-badge"
                          style={{ backgroundColor: transferLine?.color }}
                        >
                          {transferLine?.shortName}
                        </span>
                        <span className="text-[14px] text-[#1B2838]">
                          {transferLine?.name}
                        </span>
                      </div>
                      <span className="text-[12px] text-[#8E8E93]">도보 약 3분</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Congestion (2차 기능 더미) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
        className="px-4 mt-4"
      >
        <h3 className="text-[14px] font-semibold text-[#1B2838] mb-3 flex items-center gap-2">
          <Users size={16} className="text-[#9B59B6]" />
          칸별 혼잡도
          <span className="text-[10px] bg-[#F0F0F2] text-[#8E8E93] px-1.5 py-0.5 rounded ml-1">준비중</span>
        </h3>
        <div className="ios-card p-4">
          <div className="flex items-end gap-1 h-16">
            {congestion.map((car, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: `${car.percentage * 0.6}px`,
                    backgroundColor:
                      car.level === "여유" ? "#27AE60" :
                      car.level === "보통" ? "#F1C40F" :
                      car.level === "혼잡" ? "#E67E22" : "#E74C3C",
                    opacity: 0.5,
                  }}
                />
                <span className="text-[9px] text-[#8E8E93]">{car.carNumber}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-[#8E8E93]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#27AE60]" />여유</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F1C40F]" />보통</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#E67E22]" />혼잡</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#E74C3C]" />매우혼잡</span>
          </div>
        </div>
      </motion.div>

      {/* Exit info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="px-4 mt-4"
      >
        <h3 className="text-[14px] font-semibold text-[#1B2838] mb-3 flex items-center gap-2">
          <DoorOpen size={16} className="text-[#27AE60]" />
          출구 정보
          <span className="text-[10px] bg-[#F0F0F2] text-[#8E8E93] px-1.5 py-0.5 rounded ml-1">준비중</span>
        </h3>
        <div className="ios-card p-4 opacity-70">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-[#F5F5F7] rounded-lg">
                <span className="w-6 h-6 rounded-full bg-[#27AE60] text-white text-[11px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-[12px] text-[#8E8E93]">
                  출구 정보 준비중
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Fast transfer car (2차 기능 더미) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="px-4 mt-4 mb-4"
      >
        <h3 className="text-[14px] font-semibold text-[#1B2838] mb-3 flex items-center gap-2">
          <Train size={16} className="text-[#4A90D9]" />
          빠른 환승 칸
          <span className="text-[10px] bg-[#F0F0F2] text-[#8E8E93] px-1.5 py-0.5 rounded ml-1">준비중</span>
        </h3>
        <div className="ios-card p-4 opacity-70">
          <p className="text-[13px] text-[#8E8E93]">
            빠른 환승을 위한 최적 탑승 위치 정보가 곧 제공됩니다.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
