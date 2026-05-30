/**
 * 역 상세 화면
 * Design: iOS 스타일 정보 카드 - Seoul Flow 디자인
 * - 실시간 열차 도착시간 (API 연동)
 * - 출구 정보
 * - 환승 정보
 */
import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import {
  ArrowLeft,
  Train,
  Clock,
  DoorOpen,
  ArrowUpDown,
  Star,
  RefreshCw,
  Home,
  Briefcase,
  GraduationCap,
  Check,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getStationInfo, getLineInfo } from "@/lib/pathfinder";
import { getRealtimeArrivals, checkApiKeyStatus } from "@/lib/realtimeApi";
import type { ArrivalInfo } from "@/lib/realtimeApi";
import { getFirstLastTrain } from "@/lib/firstLastTrain";
import type { DayType } from "@/lib/firstLastTrain";
import { getUseSimulatedTrainData } from "@/lib/simulationSettings";
import { toast } from "sonner";
import {
  getStationFavoriteKindsForStation,
  getStationFavoriteMap,
  removeStationFavorite,
  setStationFavorite,
  STATION_FAVORITE_KINDS,
  type StationFavoriteKind,
} from "@/lib/stationFavorites";

const stationFavoriteIconMap = {
  home: Home,
  work: Briefcase,
  school: GraduationCap,
} satisfies Record<StationFavoriteKind, typeof Home>;

const stationFavoriteColorMap = {
  home: "#4A90D9",
  work: "#7C5CFF",
  school: "#27AE60",
} satisfies Record<StationFavoriteKind, string>;

export default function StationInfo() {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name || "");
  const stations = useMemo(() => getStationInfo(decodedName), [decodedName]);
  const [selectedLine, setSelectedLine] = useState(stations[0]?.lineId || "");
  const [arrivals, setArrivals] = useState<ArrivalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isSimulated, setIsSimulated] = useState(true);
  const [showFavoritePicker, setShowFavoritePicker] = useState(false);
  const [stationFavoriteMap, setStationFavoriteMap] = useState(() => getStationFavoriteMap());
  const [scheduleDayType, setScheduleDayType] = useState<DayType>(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6 ? "weekend" : "weekday";
  });

  const firstLast = useMemo(
    () => getFirstLastTrain(selectedLine, decodedName, scheduleDayType),
    [selectedLine, decodedName, scheduleDayType],
  );

  const line = getLineInfo(selectedLine);
  const assignedFavoriteKinds = getStationFavoriteKindsForStation(decodedName);
  const isFavoriteStation = assignedFavoriteKinds.length > 0;

  const refreshStationFavorites = () => {
    setStationFavoriteMap(getStationFavoriteMap());
  };

  useEffect(() => {
    loadArrivals();
    checkApiKeyStatus().then(hasKey => setIsSimulated(getUseSimulatedTrainData() || !hasKey));
  }, [decodedName, selectedLine, stations]);

  useEffect(() => {
    refreshStationFavorites();
    window.addEventListener("storage", refreshStationFavorites);
    window.addEventListener("metro:station-favorites-changed", refreshStationFavorites);
    return () => {
      window.removeEventListener("storage", refreshStationFavorites);
      window.removeEventListener("metro:station-favorites-changed", refreshStationFavorites);
    };
  }, []);

  const handleToggleStationFavorite = (kind: StationFavoriteKind) => {
    const favorite = stationFavoriteMap[kind];
    const label = STATION_FAVORITE_KINDS.find(item => item.kind === kind)?.label ?? "즐겨찾기";

    if (favorite?.stationName === decodedName) {
      removeStationFavorite(kind);
      refreshStationFavorites();
      toast(`${label} 설정을 해제했습니다`);
      return;
    }

    setStationFavorite(kind, decodedName, selectedLine);
    refreshStationFavorites();
    toast(`${decodedName}역을 ${label}으로 설정했습니다`);
  };

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
            onClick={() => setShowFavoritePicker(value => !value)}
            className="btn-press flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F5F7]"
            aria-label="역 즐겨찾기 설정"
            aria-expanded={showFavoritePicker}
          >
            <Star
              size={18}
              className={isFavoriteStation ? "text-[#C8A218]" : "text-[#8E8E93]"}
              fill={isFavoriteStation ? "#C8A218" : "transparent"}
            />
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

      <AnimatePresence initial={false}>
        {showFavoritePicker && (
          <motion.div
            key="station-favorite-picker"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden px-4 pt-4"
          >
            <div className="ios-card p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-bold text-[#1B2838]">자주 가는 역으로 설정</p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#8E8E93]">
                    집, 회사, 학교 중 하나로 저장합니다
                  </p>
                </div>
                {isFavoriteStation && (
                  <span className="shrink-0 rounded-full bg-[#FFF7D9] px-2 py-1 text-[10px] font-bold text-[#9C7A00]">
                    설정됨
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {STATION_FAVORITE_KINDS.map(({ kind, label }) => {
                  const Icon = stationFavoriteIconMap[kind];
                  const favorite = stationFavoriteMap[kind];
                  const isSelected = favorite?.stationName === decodedName;
                  const color = stationFavoriteColorMap[kind];

                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => handleToggleStationFavorite(kind)}
                      className={`btn-press min-w-0 rounded-2xl border px-2 py-3 text-left transition-all ${
                        isSelected
                          ? "border-transparent text-white shadow-sm"
                          : "border-[#ECECF1] bg-[#F8F8FA] text-[#1B2838]"
                      }`}
                      style={isSelected ? { backgroundColor: color } : undefined}
                    >
                      <span className="mb-2 flex items-center justify-between gap-1">
                        <Icon
                          size={16}
                          className={isSelected ? "text-white" : ""}
                          style={isSelected ? undefined : { color }}
                        />
                        {isSelected && <Check size={14} className="text-white" />}
                      </span>
                      <span className="block truncate text-[12px] font-bold">{label}</span>
                      <span
                        className={`mt-0.5 block truncate text-[10px] font-medium ${
                          isSelected ? "text-white/80" : "text-[#8E8E93]"
                        }`}
                      >
                        {favorite?.stationName ?? "미설정"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* 첫차 / 막차 */}
      {firstLast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
          className="px-4 mt-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[#1B2838]">
              <Clock size={16} style={{ color: line?.color }} />
              첫차 · 막차
              <span className="rounded bg-[#F0F0F2] px-1.5 py-0.5 text-[10px] text-[#8E8E93]">
                참고용
              </span>
            </h3>
            <div className="flex shrink-0 rounded-full bg-[#F5F5F7] p-0.5 text-[11px] font-semibold">
              {(["weekday", "weekend"] as DayType[]).map(dt => (
                <button
                  key={dt}
                  type="button"
                  onClick={() => setScheduleDayType(dt)}
                  className={`btn-press rounded-full px-3 py-1 transition-colors ${
                    scheduleDayType === dt
                      ? "bg-white text-[#1B2838] shadow-sm"
                      : "text-[#8E8E93]"
                  }`}
                >
                  {dt === "weekday" ? "평일" : "주말"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="ios-card p-4">
              <p className="text-[11px] text-[#8E8E93]">
                {firstLast.downTerminus} 방면
              </p>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-[#8E8E93]">첫차</span>
                  <span className="text-[18px] font-bold tracking-tight text-[#1B2838]">
                    {firstLast.downFirst}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-[#8E8E93]">막차</span>
                  <span className="text-[18px] font-bold tracking-tight text-[#1B2838]">
                    {firstLast.downLast}
                  </span>
                </div>
              </div>
            </div>
            <div className="ios-card p-4">
              <p className="text-[11px] text-[#8E8E93]">
                {firstLast.upTerminus} 방면
              </p>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-[#8E8E93]">첫차</span>
                  <span className="text-[18px] font-bold tracking-tight text-[#1B2838]">
                    {firstLast.upFirst}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-[#8E8E93]">막차</span>
                  <span className="text-[18px] font-bold tracking-tight text-[#1B2838]">
                    {firstLast.upLast}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

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

      {/* Fast transfer car */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="px-4 mt-4 mb-4"
      >
        <h3 className="text-[14px] font-semibold text-[#1B2838] mb-3 flex items-center gap-2">
          <Train size={16} className="text-[#4A90D9]" />
          빠른 환승 칸
        </h3>
        <div className="ios-card p-4">
          <p className="text-[13px] text-[#8E8E93]">
            빠른 환승 위치는 타고 온 노선과 갈아탈 노선의 방면에 따라 달라져요. 경로 상세에서 실제 환승 조합 기준으로 확인할 수 있습니다.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
