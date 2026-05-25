/**
 * 탑승 안내 화면
 *
 * 2단계 흐름:
 * 1) selecting: 출발역 주변 열차 목록 표시 → 사용자가 탭하여 "내 열차" 선택
 * 2) tracking: 선택한 열차의 위치를 30초마다 폴링하여 현재 위치 갱신
 *
 * 시뮬레이션 모드(API 키 없음/실패)에서는 selecting을 건너뛰고 바로 tracking
 * (8초마다 한 정거장씩 자동 진행).
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import {
  Bell, BellOff, BellRing, Minus, Plus, Users, ArrowUpDown,
  ArrowLeft, RefreshCw, Train,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getLineInfo, getStationInfo, getStationsByLine } from "@/lib/pathfinder";
import { getTrainPositions, getCongestion } from "@/lib/realtimeApi";
import type { CongestionInfo, TrainPosition } from "@/lib/realtimeApi";

interface RidingPayload {
  lineId: string;
  lineName: string;
  direction: string;
  fromStationName: string;
  toStationName: string;
  stationNames: string[];
  isTransferAtEnd: boolean;
}

interface EnrichedTrain extends TrainPosition {
  /** 출발역 대비 거리 (정거장 수). 음수=뒤에서 다가오는 중, 0=출발역 정차, 양수=이미 지나감 */
  distance: number;
  /** 우리와 같은 방향인지 (방향 추론 가능할 때만 true/false, 아니면 null) */
  sameDirection: boolean | null;
  /** 노선 전체에서의 정거장 인덱스 (방향 보정 후, 출발역 기준) */
  posIdxOriented: number;
}

type Phase = "selecting" | "tracking";

export default function Riding() {
  const [, setLocation] = useLocation();

  const ridingData = useMemo<RidingPayload | null>(() => {
    try {
      const raw = sessionStorage.getItem("riding_data");
      return raw ? (JSON.parse(raw) as RidingPayload) : null;
    } catch {
      return null;
    }
  }, []);

  const stations = useMemo(() => {
    if (!ridingData) return [];
    return ridingData.stationNames.map(name => {
      const infos = getStationInfo(name);
      const transferLines = infos
        .filter(s => s.lineId !== ridingData.lineId)
        .map(s => s.lineId);
      return { name, isTransfer: transferLines.length > 0, transferLines };
    });
  }, [ridingData]);

  const [phase, setPhase] = useState<Phase>("selecting");
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmBefore, setAlarmBefore] = useState(1);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isSimulated, setIsSimulated] = useState(false);
  const [congestion, setCongestion] = useState<CongestionInfo[]>([]);
  const [congestionSimulated, setCongestionSimulated] = useState(true);

  const trainNoRef = useRef<string | null>(null);
  const alarmFiredRef = useRef(false);

  const line = getLineInfo(ridingData?.lineId || "");
  const lineColor = line?.color || "#00A84D";
  const destinationIdx = stations.length - 1;

  // ===== Phase 1: 열차 선택 (가로 노선도) =====
  const [availableTrains, setAvailableTrains] = useState<EnrichedTrain[]>([]);
  const [loadingTrains, setLoadingTrains] = useState(true);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fromStationDomRef = useRef<HTMLDivElement>(null);
  const didAutoScrollRef = useRef(false);

  /**
   * 노선 전체 역을 "우리 진행 방향" 순서로 정렬해서 반환.
   * (line의 default order가 우리 방향과 반대일 수 있으므로 보정)
   */
  const orientedLineStations = useMemo(() => {
    if (!ridingData) return { stations: [], fromIdx: -1, toIdx: -1 };
    const lineStations = getStationsByLine(ridingData.lineId);
    const fromIdx = lineStations.findIndex(s => s.name === ridingData.fromStationName);
    const toIdx = lineStations.findIndex(s => s.name === ridingData.toStationName);
    if (fromIdx < 0 || toIdx < 0) {
      return { stations: lineStations, fromIdx, toIdx };
    }
    if (toIdx >= fromIdx) {
      return { stations: lineStations, fromIdx, toIdx };
    }
    // 반대 방향이면 역순으로 정렬
    const reversed = [...lineStations].reverse();
    return {
      stations: reversed,
      fromIdx: reversed.findIndex(s => s.name === ridingData.fromStationName),
      toIdx: reversed.findIndex(s => s.name === ridingData.toStationName),
    };
  }, [ridingData]);

  const fetchAvailableTrains = useMemo(() => {
    return async (signal?: { cancelled: boolean }) => {
      if (!ridingData) return;
      setLoadingTrains(true);

      const { positions, isSimulated: sim } = await getTrainPositions(ridingData.lineName);
      if (signal?.cancelled) return;

      if (sim || positions.length === 0) {
        // 실데이터 없음: 선택 단계 건너뛰고 시뮬레이션 모드로 바로 진입
        setIsSimulated(true);
        setPhase("tracking");
        return;
      }

      const { stations: lineStationsOriented, fromIdx, toIdx } = orientedLineStations;
      const stationIndex = new Map(lineStationsOriented.map((s, i) => [s.name, i]));

      if (fromIdx < 0) {
        // 방향 추론 실패 — 우리 stationNames 기준 거리만이라도
        const fallbackIdx = (name: string) => ridingData.stationNames.indexOf(name);
        const enriched: EnrichedTrain[] = positions.map(p => ({
          ...p,
          distance: 999,
          sameDirection: null,
          posIdxOriented: fallbackIdx(p.stationName),
        }));
        setAvailableTrains(enriched);
        setSelectionError(null);
        setLoadingTrains(false);
        return;
      }

      const enriched: EnrichedTrain[] = positions.map(p => {
        const posIdx = stationIndex.get(p.stationName) ?? -1;
        const destIdx = stationIndex.get(p.destination) ?? -1;
        // oriented 배열에서는 항상 toIdx > fromIdx 이므로 distance = posIdx - fromIdx
        const distance = posIdx >= 0 ? posIdx - fromIdx : 999;
        const sameDirection =
          posIdx >= 0 && destIdx >= 0 ? destIdx > posIdx : null;
        return { ...p, distance, sameDirection, posIdxOriented: posIdx };
      });

      // 우리 방향만 통과
      const filtered = enriched.filter(t => t.sameDirection !== false);

      setAvailableTrains(filtered);
      setSelectionError(
        filtered.length === 0 ? "이 노선의 운행 중 열차가 없습니다." : null,
      );
      setLoadingTrains(false);
    };
  }, [ridingData, orientedLineStations]);

  useEffect(() => {
    if (!ridingData || phase !== "selecting") return;
    const signal = { cancelled: false };
    fetchAvailableTrains(signal);
    const interval = setInterval(() => fetchAvailableTrains(signal), 15000);
    return () => {
      signal.cancelled = true;
      clearInterval(interval);
    };
  }, [ridingData, phase, fetchAvailableTrains]);

  // 처음 로드 시 출발역으로 자동 스크롤
  useEffect(() => {
    if (phase !== "selecting") return;
    if (didAutoScrollRef.current) return;
    if (!fromStationDomRef.current) return;
    if (orientedLineStations.stations.length === 0) return;
    fromStationDomRef.current.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "center",
    });
    didAutoScrollRef.current = true;
  }, [phase, orientedLineStations]);

  const onSelectTrain = (train: EnrichedTrain) => {
    if (!ridingData) return;
    trainNoRef.current = train.trainNo;
    const idxInRoute = ridingData.stationNames.indexOf(train.stationName);
    setCurrentIdx(idxInRoute >= 0 ? idxInRoute : 0);
    setIsSimulated(false);
    setPhase("tracking");
    toast(`${train.trainNo}호 열차 안내를 시작합니다`);
  };

  // ===== Phase 2: 추적 =====
  useEffect(() => {
    if (phase !== "tracking" || !ridingData || isSimulated) return;
    let cancelled = false;

    const poll = async () => {
      const { positions, isSimulated: sim } = await getTrainPositions(ridingData.lineName);
      if (cancelled) return;
      if (sim || positions.length === 0) {
        setIsSimulated(true);
        return;
      }
      const target = positions.find(p => p.trainNo === trainNoRef.current);
      if (!target) {
        // 우리 열차가 응답에 없음 — 종착 or 운행 종료 가능성
        return;
      }
      const idx = ridingData.stationNames.indexOf(target.stationName);
      if (idx >= 0) setCurrentIdx(idx);
    };

    poll();
    const interval = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase, ridingData, isSimulated]);

  // 시뮬레이션 폴백: 8초마다 한 정거장씩
  useEffect(() => {
    if (phase !== "tracking" || !isSimulated || !ridingData) return;
    const timer = setInterval(() => {
      setCurrentIdx(prev => Math.min(prev + 1, destinationIdx));
    }, 8000);
    return () => clearInterval(timer);
  }, [phase, isSimulated, ridingData, destinationIdx]);

  // 하차 알림
  useEffect(() => {
    if (phase !== "tracking") return;
    const remaining = destinationIdx - currentIdx;
    if (alarmEnabled && !alarmFiredRef.current && remaining === alarmBefore) {
      toast("곧 도착합니다! 하차 준비하세요.", { icon: "🔔", duration: 5000 });
      alarmFiredRef.current = true;
    }
    if (remaining === 0 && destinationIdx > 0) {
      toast.success("목적지에 도착했습니다!");
    }
  }, [phase, currentIdx, destinationIdx, alarmEnabled, alarmBefore]);

  // 혼잡도 (현재역 기준)
  useEffect(() => {
    if (phase !== "tracking" || !ridingData || !stations[currentIdx]) return;
    let cancelled = false;
    const fetchCongestion = async () => {
      const { cars, isSimulated: sim } = await getCongestion(
        stations[currentIdx].name,
        ridingData.lineId,
      );
      if (cancelled) return;
      setCongestion(cars);
      setCongestionSimulated(sim);
    };
    fetchCongestion();
    const interval = setInterval(fetchCongestion, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase, ridingData, currentIdx, stations]);

  // ===== 빈 상태 가드 =====
  if (!ridingData || stations.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <p className="text-[14px] text-[#8E8E93] text-center mb-4">
          탑승할 경로 정보가 없습니다.<br />
          먼저 경로를 검색하고 "탑승 안내 시작"을 눌러주세요.
        </p>
        <button
          onClick={() => setLocation("/search")}
          className="px-5 py-3 bg-[#1B2838] text-white rounded-xl text-[14px] font-semibold btn-press"
        >
          경로 검색하러 가기
        </button>
      </div>
    );
  }

  // ===== Phase 1 UI: 가로 노선도 + 열차 위치 =====
  if (phase === "selecting") {
    const { stations: lineStationsOriented, fromIdx, toIdx } = orientedLineStations;
    const routeStationSet = new Set(ridingData.stationNames);
    const arriveLabel = ridingData.isTransferAtEnd ? "환승" : "하차";

    // 같은 역에 여러 열차가 있을 수 있으므로 인덱스별로 그룹핑
    const trainsByIdx = new Map<number, EnrichedTrain[]>();
    availableTrains.forEach(t => {
      if (t.posIdxOriented < 0) return;
      const list = trainsByIdx.get(t.posIdxOriented) ?? [];
      list.push(t);
      trainsByIdx.set(t.posIdxOriented, list);
    });

    const STATION_WIDTH = 72;
    const TRAIN_LANE_HEIGHT = 64;

    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="relative overflow-hidden" style={{ backgroundColor: lineColor }}>
          <div className="safe-top relative z-10 px-5 pt-4 pb-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => window.history.back()}
                className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center btn-press"
              >
                <ArrowLeft size={18} className="text-white" />
              </button>
              <div className="flex items-center gap-2">
                <span className="line-badge text-[12px]" style={{ backgroundColor: "rgba(255,255,255,0.25)" }}>
                  {line?.shortName}
                </span>
                <span className="text-white/90 text-[14px] font-medium">{ridingData.direction}</span>
              </div>
              <button
                onClick={() => fetchAvailableTrains()}
                className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center btn-press"
              >
                <RefreshCw size={16} className={`text-white ${loadingTrains ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div>
              <p className="text-white/70 text-[12px] mb-1">탑승할 열차 선택</p>
              <h1 className="text-white text-[24px] font-bold tracking-tight leading-tight">
                {ridingData.fromStationName} → {ridingData.toStationName}
              </h1>
              <p className="text-white/70 text-[12px] mt-1">
                좌우로 스크롤하며 열차를 탭하세요 · 15초마다 갱신
              </p>
            </div>
          </div>
        </div>

        {/* Horizontal line diagram */}
        <div className="mt-5">
          <div className="px-4 mb-2 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#1B2838]">
              {line?.name} 실시간 열차 위치
            </h3>
            <span className="text-[11px] text-[#8E8E93]">
              {availableTrains.length}대 운행
            </span>
          </div>

          {loadingTrains && availableTrains.length === 0 ? (
            <div className="mx-4 ios-card p-6 text-center">
              <RefreshCw size={20} className="text-[#8E8E93] animate-spin mx-auto mb-2" />
              <p className="text-[13px] text-[#8E8E93]">열차 위치를 불러오는 중...</p>
            </div>
          ) : selectionError && availableTrains.length === 0 ? (
            <div className="mx-4 ios-card p-6 text-center">
              <Train size={24} className="text-[#C7C7CC] mx-auto mb-2" />
              <p className="text-[13px] text-[#8E8E93]">{selectionError}</p>
              <p className="text-[11px] text-[#C7C7CC] mt-2">잠시 후 자동으로 다시 시도합니다.</p>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto no-scrollbar bg-white border-y border-[#F0F0F2]"
              style={{ scrollSnapType: "x proximity" }}
            >
              <div
                className="relative inline-flex items-end px-6 pt-3 pb-5"
                style={{ minWidth: `${lineStationsOriented.length * STATION_WIDTH}px` }}
              >
                {/* 노선 베이스 라인 (옅게) */}
                <div
                  className="absolute h-[3px] rounded-full opacity-25 pointer-events-none"
                  style={{
                    backgroundColor: lineColor,
                    left: `${24 + STATION_WIDTH / 2}px`,
                    right: `${24 + STATION_WIDTH / 2}px`,
                    bottom: `${20 + 28}px`,
                  }}
                />
                {/* 우리 구간 강조 라인 */}
                {fromIdx >= 0 && toIdx >= 0 && (
                  <div
                    className="absolute h-[3px] rounded-full pointer-events-none"
                    style={{
                      backgroundColor: lineColor,
                      left: `${24 + fromIdx * STATION_WIDTH + STATION_WIDTH / 2}px`,
                      width: `${(toIdx - fromIdx) * STATION_WIDTH}px`,
                      bottom: `${20 + 28}px`,
                    }}
                  />
                )}

                {lineStationsOriented.map((station, idx) => {
                  const isFrom = idx === fromIdx;
                  const isTo = idx === toIdx;
                  const isOnRoute = routeStationSet.has(station.name);
                  const transfers = getStationInfo(station.name).filter(s => s.lineId !== ridingData.lineId);
                  const isTransferStation = transfers.length > 0;
                  const trainsHere = trainsByIdx.get(idx) ?? [];

                  return (
                    <div
                      key={station.id}
                      ref={isFrom ? fromStationDomRef : null}
                      className="relative shrink-0 flex flex-col items-center"
                      style={{ width: `${STATION_WIDTH}px`, scrollSnapAlign: "center" }}
                    >
                      {/* Train lane */}
                      <div
                        className="w-full flex flex-col items-center justify-end gap-1 mb-2"
                        style={{ height: `${TRAIN_LANE_HEIGHT}px` }}
                      >
                        {trainsHere.map(train => (
                          <TrainPin
                            key={train.trainNo}
                            train={train}
                            lineColor={lineColor}
                            onSelect={() => onSelectTrain(train)}
                          />
                        ))}
                      </div>

                      {/* Station dot */}
                      <div className="relative flex items-center justify-center" style={{ height: "16px" }}>
                        {isFrom || isTo ? (
                          <div
                            className="w-4 h-4 rounded-full border-[3px] bg-white z-10"
                            style={{ borderColor: isFrom ? "#4A90D9" : "#E74C3C" }}
                          />
                        ) : (
                          <div
                            className={`w-2.5 h-2.5 rounded-full z-10 ${
                              isOnRoute ? "" : "bg-white border-[1.5px]"
                            }`}
                            style={{
                              backgroundColor: isOnRoute ? lineColor : undefined,
                              borderColor: isOnRoute ? undefined : "#D0D0D0",
                            }}
                          />
                        )}
                      </div>

                      {/* Station name + role label */}
                      <div className="mt-1.5 flex flex-col items-center min-h-[36px]">
                        <span
                          className={`text-[10.5px] leading-tight text-center whitespace-nowrap ${
                            isFrom || isTo
                              ? "font-bold text-[#1B2838]"
                              : isOnRoute
                              ? "font-medium text-[#1B2838]"
                              : "text-[#B0B0B5]"
                          }`}
                        >
                          {station.name}
                        </span>
                        {isFrom && (
                          <span className="text-[9px] font-bold text-[#4A90D9] mt-0.5">★ 출발</span>
                        )}
                        {isTo && (
                          <span className="text-[9px] font-bold text-[#E74C3C] mt-0.5">★ {arriveLabel}</span>
                        )}
                        {!isFrom && !isTo && isTransferStation && isOnRoute && (
                          <span className="text-[9px] font-semibold text-[#E67E22] mt-0.5">◆ 환승</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-4 mt-4">
          <div className="ios-card p-3 flex items-center justify-around text-[11px] text-[#8E8E93]">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border-[2px] border-[#4A90D9] bg-white" />
              출발
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border-[2px] border-[#E74C3C] bg-white" />
              {arriveLabel}
            </span>
            <span className="flex items-center gap-1">
              <Train size={12} style={{ color: lineColor }} />
              열차 (탭하여 선택)
            </span>
          </div>
        </div>

        {/* Info footer */}
        <div className="px-4 mt-3">
          <div className="bg-[#F0F7FF] rounded-lg p-3">
            <p className="text-[11px] text-[#4A90D9] leading-relaxed">
              💡 출발역 주변의 열차 중 자신이 탑승한(또는 탑승할) 열차를 탭하세요. 선택 후 그 열차의 위치를 실시간 추적합니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ===== Phase 2 UI: 추적 =====
  const remaining = Math.max(0, destinationIdx - currentIdx);
  const remainingTime = remaining * 2;
  const progress = destinationIdx > 0 ? (currentIdx / destinationIdx) * 100 : 0;
  const arrivalTime = new Date();
  arrivalTime.setMinutes(arrivalTime.getMinutes() + remainingTime);
  const currentStation = stations[currentIdx];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Status Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden"
        style={{ backgroundColor: lineColor }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="safe-top relative z-10 px-5 pt-4 pb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="line-badge text-[12px]" style={{ backgroundColor: "rgba(255,255,255,0.25)" }}>
                {line?.shortName}
              </span>
              <span className="text-white/90 text-[14px] font-medium">{ridingData.direction}</span>
              {isSimulated ? (
                <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded">시뮬레이션</span>
              ) : trainNoRef.current ? (
                <span className="text-[10px] bg-white/25 text-white px-1.5 py-0.5 rounded">{trainNoRef.current}호</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {!isSimulated && (
                <button
                  onClick={() => {
                    trainNoRef.current = null;
                    alarmFiredRef.current = false;
                    setPhase("selecting");
                  }}
                  className="text-[11px] text-white/80 underline px-2 py-1 btn-press"
                >
                  열차 변경
                </button>
              )}
              <button
                onClick={() => {
                  setAlarmEnabled(!alarmEnabled);
                  toast(alarmEnabled ? "알람이 해제되었습니다" : "알람이 설정되었습니다");
                }}
                className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center btn-press"
              >
                {alarmEnabled ? <BellRing size={18} className="text-white" /> : <BellOff size={18} className="text-white" />}
              </button>
            </div>
          </div>

          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-white/70 text-[12px] mb-1">현재 위치</p>
            <h1 className="text-white text-[32px] font-bold tracking-tight leading-tight">
              {currentStation?.name}
            </h1>
            {currentIdx < destinationIdx && (
              <p className="text-white/70 text-[13px] mt-1">
                → {stations[currentIdx + 1]?.name} 방면 이동 중
              </p>
            )}
          </motion.div>

          <div className="flex items-center gap-6 mt-4">
            <div>
              <p className="text-white/60 text-[11px]">남은 역</p>
              <p className="text-white text-[22px] font-bold">{remaining}개</p>
            </div>
            <div>
              <p className="text-white/60 text-[11px]">남은 시간</p>
              <p className="text-white text-[22px] font-bold">{remainingTime}분</p>
            </div>
            <div>
              <p className="text-white/60 text-[11px]">도착 예정</p>
              <p className="text-white text-[22px] font-bold">
                {arrivalTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Progress Bar */}
      <div className="px-4 mt-4">
        <div className="ios-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-[#8E8E93]">진행률</span>
            <span className="text-[12px] font-semibold text-[#1B2838]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[#F0F0F2] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: lineColor }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            />
          </div>
        </div>
      </div>

      {/* Alarm Setting */}
      <div className="px-4 mt-3">
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FFF3EB] flex items-center justify-center">
                <Bell size={18} className="text-[#E67E22]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#1B2838]">하차 알림</p>
                <p className="text-[12px] text-[#8E8E93]">{alarmBefore}정거장 전 알림</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setAlarmBefore(Math.max(1, alarmBefore - 1)); alarmFiredRef.current = false; }}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center btn-press"
              >
                <Minus size={14} className="text-[#1B2838]" />
              </button>
              <span className="text-[16px] font-bold text-[#1B2838] w-4 text-center">{alarmBefore}</span>
              <button
                onClick={() => { setAlarmBefore(Math.min(5, alarmBefore + 1)); alarmFiredRef.current = false; }}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center btn-press"
              >
                <Plus size={14} className="text-[#1B2838]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 칸별 혼잡도 */}
      <div className="px-4 mt-3">
        <div className="ios-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#F5F0FF] flex items-center justify-center">
              <Users size={18} className="text-[#9B59B6]" />
            </div>
            <div className="text-left flex-1">
              <p className="text-[14px] font-medium text-[#1B2838]">
                칸별 혼잡도
                {congestionSimulated && (
                  <span className="text-[10px] bg-[#FFF3EB] text-[#E67E22] px-1.5 py-0.5 rounded ml-1">시뮬레이션</span>
                )}
              </p>
              <p className="text-[12px] text-[#8E8E93]">{currentStation?.name}역 기준</p>
            </div>
          </div>
          <div className="flex items-end gap-1 h-12">
            {congestion.map((car, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: `${Math.max(8, car.percentage * 0.48)}px`,
                    backgroundColor:
                      car.level === "여유" ? "#27AE60" :
                      car.level === "보통" ? "#F1C40F" :
                      car.level === "혼잡" ? "#E67E22" : "#E74C3C",
                    opacity: 0.7,
                  }}
                />
                <span className="text-[9px] text-[#8E8E93]">{car.carNumber}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Station Timeline */}
      <div className="px-4 mt-4">
        <h3 className="text-[15px] font-bold text-[#1B2838] mb-3">정차역</h3>
        <div className="ios-card overflow-hidden">
          {stations.map((station, idx) => {
            const isCurrent = idx === currentIdx;
            const isPast = idx < currentIdx;
            const isDestination = idx === destinationIdx;
            const minutesAway = (idx - currentIdx) * 2;

            return (
              <motion.div
                key={`${station.name}-${idx}`}
                animate={isCurrent ? { backgroundColor: ["rgba(74, 144, 217, 0.05)", "rgba(74, 144, 217, 0.1)", "rgba(74, 144, 217, 0.05)"] } : { backgroundColor: "rgba(0,0,0,0)" }}
                transition={isCurrent ? { duration: 2, repeat: Infinity } : {}}
                className={`flex items-center px-4 py-3 border-b border-[#F0F0F2] last:border-0 ${
                  isPast ? "opacity-40" : ""
                }`}
              >
                <div className="relative mr-3 flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full border-2 ${
                      isCurrent
                        ? "border-[#4A90D9] bg-[#4A90D9]"
                        : isDestination
                        ? "border-[#E74C3C] bg-[#E74C3C]"
                        : isPast
                        ? "border-[#C7C7CC] bg-[#C7C7CC]"
                        : "border-[#D0D0D0] bg-white"
                    }`}
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[14px] ${isCurrent || isDestination ? "font-bold" : "font-medium"} ${
                      isPast ? "text-[#8E8E93]" : "text-[#1B2838]"
                    }`}>
                      {station.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-[#4A90D9] bg-[#EBF4FF] px-1.5 py-0.5 rounded">
                        현재
                      </span>
                    )}
                    {isDestination && (
                      <span className="text-[10px] font-semibold text-[#E74C3C] bg-[#FFF0F0] px-1.5 py-0.5 rounded">
                        하차
                      </span>
                    )}
                    {station.isTransfer && !isPast && !isCurrent && (
                      <span className="text-[10px] text-[#E67E22] bg-[#FFF3EB] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <ArrowUpDown size={8} />환승
                      </span>
                    )}
                  </div>
                  {station.isTransfer && station.transferLines.length > 0 && !isPast && (
                    <div className="flex items-center gap-1 mt-1">
                      {station.transferLines.map(lineId => {
                        const transferLine = getLineInfo(lineId);
                        return (
                          <span
                            key={lineId}
                            className="line-badge text-[8px]"
                            style={{ backgroundColor: transferLine?.color || "#888", minWidth: "auto", height: "16px", padding: "0 4px" }}
                          >
                            {transferLine?.shortName || lineId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!isPast && !isCurrent && (
                  <span className="text-[12px] text-[#8E8E93]">
                    {minutesAway}분
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 노선도 위에 떠 있는 열차 핀.
 * trainStatus: 0=진입, 1=도착(정차), 2=출발
 */
function TrainPin({
  train,
  lineColor,
  onSelect,
}: {
  train: EnrichedTrain;
  lineColor: string;
  onSelect: () => void;
}) {
  // 진입/도착 시 살짝 펄스
  const pulsing = train.trainStatus === "0" || train.trainStatus === "1";

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      className="relative flex flex-col items-center btn-press"
      title={`${train.trainNo}호 · ${train.destination || "—"} 방면`}
    >
      <div
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shadow-sm"
        style={{
          backgroundColor: lineColor,
          color: "white",
          boxShadow: pulsing ? `0 0 0 3px ${lineColor}33` : undefined,
        }}
      >
        <Train size={10} className="text-white" />
        <span className="text-[9px] font-bold leading-none">{train.trainNo}</span>
      </div>
      {/* 꼬리 (역 dot 방향) */}
      <div
        className="w-[2px] h-2"
        style={{ backgroundColor: lineColor, opacity: 0.6 }}
      />
    </motion.button>
  );
}
