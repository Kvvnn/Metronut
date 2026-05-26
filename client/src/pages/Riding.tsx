/**
 * 탑승 안내 화면
 *
 * 한 화면 구조:
 * - 상단 sticky: 미니 nav + 가로 노선도 (전체 노선, 항상 표시, 열차 탭하여 선택)
 * - 하단 스크롤: 선택된 열차의 안내 UI (현재 위치/진행률/알람/타임라인)
 *
 * 사용자는 추적 중에도 위 노선도에서 다른 열차를 탭해 언제든 전환 가능.
 * 시뮬레이션 모드(실데이터 없음): 가짜 열차 6대를 노선도에 띄우고 사용자가
 * 골라서 추적 (8초마다 한 정거장씩 전진). 상단 'SIM' 뱃지로 구분.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Bell, BellOff, BellRing, ChevronDown, ChevronLeft, ChevronRight, Clock, Minus, Plus,
  ArrowLeft, RefreshCw, Train,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { getLineInfo, getStationInfo, getStationsByLine } from "@/lib/pathfinder";
import { getTrainPositions } from "@/lib/realtimeApi";
import type { TrainPosition } from "@/lib/realtimeApi";
import TransferMiniSheet from "@/components/TransferMiniSheet";
import type { TransferSegmentData } from "@/components/TransferMiniSheet";

interface RideSegmentData {
  type: "ride";
  lineId: string;
  lineName: string;
  direction: string;
  fromStationName: string;
  toStationName: string;
  stationNames: string[];
}

type RoutePayloadSegment = RideSegmentData | TransferSegmentData;

interface FullRoutePayload {
  segments: RoutePayloadSegment[];
  overallFromStation: string;
  overallToStation: string;
}

// 현재 ride segment에서 파생되는 레거시 데이터
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
  posIdxOriented: number;
  sameDirection: boolean | null;
}

// 가짜 열차 식별 prefix. 실데이터 API trainNo는 보통 4자리 숫자라 충돌 X.
const SIM_TRAIN_PREFIX = "S";

/**
 * 시뮬레이션 모드용 가짜 열차 생성.
 * 노선 전체에 6대 분산 배치. 모두 우리 방향 (sameDirection: true).
 */
function generateFakeTrains(
  lineStations: { name: string }[],
  updnLine: string,
): EnrichedTrain[] {
  if (lineStations.length === 0) return [];
  const lastIdx = lineStations.length - 1;
  const destination = lineStations[lastIdx]?.name ?? "";
  const COUNT = 6;
  const trains: EnrichedTrain[] = [];
  for (let i = 0; i < COUNT; i++) {
    const posIdx = Math.floor((lastIdx * (i + 1)) / (COUNT + 1));
    const station = lineStations[posIdx];
    if (!station) continue;
    trains.push({
      trainNo: `${SIM_TRAIN_PREFIX}${2001 + i}`,
      stationName: station.name,
      updnLine,
      trainStatus: ["0", "1", "2"][i % 3], // 진입/정차/출발 섞임
      destination,
      receivedAt: new Date().toISOString(),
      posIdxOriented: posIdx,
      sameDirection: true,
    });
  }
  return trains;
}

/**
 * 가짜 열차 한 정거장씩 전진. 종착 도달하면 그대로 정지.
 * status 0→1→2 사이클 (진입→정차→출발).
 */
function advanceFakeTrains(
  trains: EnrichedTrain[],
  lineStations: { name: string }[],
): EnrichedTrain[] {
  const lastIdx = lineStations.length - 1;
  return trains.map(t => {
    if (t.posIdxOriented >= lastIdx) return t;
    const nextIdx = t.posIdxOriented + 1;
    const nextStation = lineStations[nextIdx];
    if (!nextStation) return t;
    return {
      ...t,
      posIdxOriented: nextIdx,
      stationName: nextStation.name,
      trainStatus: t.trainStatus === "1" ? "2" : t.trainStatus === "2" ? "0" : "1",
      receivedAt: new Date().toISOString(),
    };
  });
}

function isSimTrainNo(trainNo: string | null | undefined): boolean {
  return !!trainNo && trainNo.startsWith(SIM_TRAIN_PREFIX);
}

export default function Riding() {
  const [, setLocation] = useLocation();

  // 전체 여정 (모든 segments)
  const route = useMemo<FullRoutePayload | null>(() => {
    try {
      const raw = sessionStorage.getItem("riding_route");
      return raw ? (JSON.parse(raw) as FullRoutePayload) : null;
    } catch {
      return null;
    }
  }, []);

  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const currentSegment = route?.segments[currentSegmentIdx] ?? null;
  const totalSegments = route?.segments.length ?? 0;
  const isLastSegment = currentSegmentIdx >= totalSegments - 1;
  const isTransferOverlay = currentSegment?.type === "transfer";
  const arrivedFinalRef = useRef(false);

  // 환승 모드에선 다음 ride segment를 미리 표시 (transfer-as-preview).
  // displayedRideIdx = 화면에 띄울 ride segment 인덱스.
  const displayedRideIdx = useMemo(() => {
    if (!route) return currentSegmentIdx;
    if (!isTransferOverlay) return currentSegmentIdx;
    for (let i = currentSegmentIdx + 1; i < route.segments.length; i++) {
      if (route.segments[i].type === "ride") return i;
    }
    return currentSegmentIdx;
  }, [currentSegmentIdx, isTransferOverlay, route]);

  const displayedRideSegment = route?.segments[displayedRideIdx] ?? null;

  // 진행 표시용: ride segments만 추림 (환승은 카운트 X)
  const rideSegments = useMemo(() => {
    if (!route) return [];
    return route.segments
      .map((segment, originalIdx) => ({ segment, originalIdx }))
      .filter(x => x.segment.type === "ride");
  }, [route]);
  const currentRideIdx = rideSegments.findIndex(r => r.originalIdx === displayedRideIdx);
  const totalRides = rideSegments.length;

  // displayedRide에서 레거시 ridingData 파생 (기존 ride UI 코드와 호환)
  const ridingData = useMemo<RidingPayload | null>(() => {
    if (!displayedRideSegment || displayedRideSegment.type !== "ride") return null;
    const hasMoreRides =
      route?.segments
        .slice(displayedRideIdx + 1)
        .some(s => s.type === "ride") ?? false;
    return {
      lineId: displayedRideSegment.lineId,
      lineName: displayedRideSegment.lineName,
      direction: displayedRideSegment.direction,
      fromStationName: displayedRideSegment.fromStationName,
      toStationName: displayedRideSegment.toStationName,
      stationNames: displayedRideSegment.stationNames,
      isTransferAtEnd: hasMoreRides,
    };
  }, [displayedRideSegment, displayedRideIdx, route]);

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

  const [selectedTrainNo, setSelectedTrainNo] = useState<string | null>(null);
  const [selectedTrainSnapshot, setSelectedTrainSnapshot] = useState<EnrichedTrain | null>(null);
  const [isTrainPickerExpanded, setIsTrainPickerExpanded] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isSimulated, setIsSimulated] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmBefore, setAlarmBefore] = useState(1);
  const [availableTrains, setAvailableTrains] = useState<EnrichedTrain[]>([]);
  const [loadingTrains, setLoadingTrains] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [trainPositionError, setTrainPositionError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const trainNoRef = useRef<string | null>(null);
  const alarmFiredRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fromStationDomRef = useRef<HTMLDivElement>(null);
  const didInitialScrollRef = useRef(false);

  const line = getLineInfo(ridingData?.lineId || "");
  const lineColor = line?.color || "#00A84D";
  const destinationIdx = stations.length - 1;
  const prefersReducedMotion = useReducedMotion();
  const slideTransition = {
    duration: prefersReducedMotion ? 0.01 : 0.26,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  // 노선 전체 역을 우리 진행 방향 순서로 정렬.
  // expectedUpdnLine: API updnLine 매칭용 ("0"=상행/내선, "1"=하행/외선).
  //
  // 방향 추론은 stationNames[0] → stationNames[1] 인접 두 역의 자연 인덱스
  // 비교가 가장 정확함 (인접 역은 거의 항상 연속된 인덱스). fromIdx vs toIdx
  // 만 보면 노선이 길거나 순환선/지선 통합 때문에 위치가 비선형이라 잘못
  // 추론될 수 있음.
  const orientedLineStations = useMemo(() => {
    if (!ridingData)
      return {
        stations: [],
        fromIdx: -1,
        toIdx: -1,
        expectedUpdnLine: null as string | null,
      };
    const lineStations = getStationsByLine(ridingData.lineId);
    const fromIdx = lineStations.findIndex(s => s.name === ridingData.fromStationName);
    const toIdx = lineStations.findIndex(s => s.name === ridingData.toStationName);
    if (fromIdx < 0)
      return { stations: lineStations, fromIdx, toIdx, expectedUpdnLine: null };

    // 인접 두 역으로 방향 결정 (실패 시 from→to 폴백)
    let isReversed: boolean | null = null;
    if (ridingData.stationNames.length >= 2) {
      const a = lineStations.findIndex(s => s.name === ridingData.stationNames[0]);
      const b = lineStations.findIndex(s => s.name === ridingData.stationNames[1]);
      if (a >= 0 && b >= 0) {
        isReversed = b < a;
      }
    }
    if (isReversed === null && toIdx >= 0) {
      isReversed = toIdx < fromIdx;
    }
    if (isReversed === null) {
      return { stations: lineStations, fromIdx, toIdx, expectedUpdnLine: null };
    }

    const expectedUpdnLine = isReversed ? "0" : "1";
    if (!isReversed) {
      return { stations: lineStations, fromIdx, toIdx, expectedUpdnLine };
    }
    const reversed = [...lineStations].reverse();
    return {
      stations: reversed,
      fromIdx: reversed.findIndex(s => s.name === ridingData.fromStationName),
      toIdx: toIdx >= 0 ? reversed.findIndex(s => s.name === ridingData.toStationName) : -1,
      expectedUpdnLine,
    };
  }, [ridingData]);

  // ===== 위치 폴링 (15초마다) =====
  // 이 한 effect로 (a) 가로 노선도용 열차 목록과 (b) 선택된 열차의 추적을 동시 처리.
  useEffect(() => {
    if (!ridingData) return;
    let cancelled = false;

    let interval: number | undefined;
    const poll = async () => {
      if (!cancelled) setLoadingTrains(true);
      const {
        positions,
        isSimulated: sim,
        errorCode,
        errorMessage,
      } = await getTrainPositions(ridingData.lineName);
      if (cancelled) return;

      setLoadingTrains(false);
      setHasFetched(true);

      const { stations: lineStationsOriented, fromIdx, expectedUpdnLine } = orientedLineStations;

      if (sim) {
        setIsSimulated(true);
        setTrainPositionError(errorMessage ?? "열차 위치를 불러오지 못했습니다.");
        // 이미 sim 열차가 있으면 유지 (sim advance timer가 움직임), 없으면 새로 생성
        setAvailableTrains(prev => {
          if (prev.length > 0 && prev.every(t => isSimTrainNo(t.trainNo))) return prev;
          return generateFakeTrains(lineStationsOriented, expectedUpdnLine ?? "1");
        });
        return errorCode ?? "SIMULATED";
      }
      setIsSimulated(false);
      setTrainPositionError(null);

      const stationIndex = new Map(lineStationsOriented.map((s, i) => [s.name, i]));

      const enriched: EnrichedTrain[] = positions.map(p => {
        const posIdx = stationIndex.get(p.stationName) ?? -1;
        const destIdx = stationIndex.get(p.destination) ?? -1;
        const sameDirection =
          posIdx >= 0 && destIdx >= 0 ? destIdx > posIdx : null;
        return { ...p, posIdxOriented: posIdx, sameDirection };
      });
      // 방향 필터 (다층):
      //   0) 선택된 열차는 무조건 통과 (회차/destination 변경으로 필터에서
      //      빠지면 pin이 사라져 사용자가 deselect된 줄로 오해함)
      //   1) sameDirection === true: destIdx > posIdx로 확정 → 통과
      //   2) sameDirection === null: 목적지가 라인 데이터 밖
      //      ("내선순환"/"외선순환", 지선 종착 등). updnLine이 우리 방향과
      //      일치하면 통과 (2호선 순환선/지선 대응 폴백)
      //   3) sameDirection === false: 반대 방향 → 제외
      const selectedNo = trainNoRef.current;
      const filtered =
        fromIdx >= 0
          ? enriched.filter(t => {
              if (selectedNo && t.trainNo === selectedNo) return true;
              if (t.sameDirection === true) return true;
              if (t.sameDirection === null && expectedUpdnLine && t.updnLine === expectedUpdnLine) {
                return true;
              }
              return false;
            })
          : enriched;
      setAvailableTrains(filtered);
      return null;
    };

    void poll().then(errorCode => {
      if (cancelled) return;
      if (errorCode === "ERROR-337") return;
      interval = window.setInterval(poll, selectedTrainNo ? 15000 : 60000);
    });
    return () => {
      cancelled = true;
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [ridingData, orientedLineStations, refreshTick, selectedTrainNo]);

  const refreshPositions = useCallback(() => setRefreshTick(t => t + 1), []);

  // ===== 선택한 열차의 위치/snapshot 추적 (실데이터·sim 통합) =====
  // availableTrains가 갱신될 때마다 selected의 stationName 기준으로 currentIdx 동기화.
  useEffect(() => {
    const selectedNo = trainNoRef.current;
    if (!selectedNo || !ridingData) return;
    const myTrain = availableTrains.find(t => t.trainNo === selectedNo);
    if (!myTrain) return;
    setSelectedTrainSnapshot(myTrain);
    const idx = ridingData.stationNames.indexOf(myTrain.stationName);
    if (idx >= 0) setCurrentIdx(idx);
  }, [availableTrains, ridingData]);

  // ===== 시뮬레이션 모드: 8초마다 가짜 열차들 한 정거장씩 전진 =====
  useEffect(() => {
    if (!isSimulated) return;
    if (orientedLineStations.stations.length === 0) return;
    const timer = setInterval(() => {
      setAvailableTrains(prev => {
        if (prev.length === 0 || !prev.every(t => isSimTrainNo(t.trainNo))) return prev;
        return advanceFakeTrains(prev, orientedLineStations.stations);
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [isSimulated, orientedLineStations]);

  // ===== 초기 자동 스크롤: 출발역으로 센터링 =====
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (!fromStationDomRef.current) return;
    if (orientedLineStations.stations.length === 0) return;
    fromStationDomRef.current.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "center",
    });
    didInitialScrollRef.current = true;
  }, [orientedLineStations]);

  // 접힌 열차 선택 영역을 다시 펼치면 선택한 열차/현재 역으로 복귀
  useEffect(() => {
    if (!isTrainPickerExpanded || !selectedTrainNo || !ridingData) return;
    if (orientedLineStations.stations.length === 0) return;

    const selectedTrain = selectedTrainNo
      ? availableTrains.find(t => t.trainNo === selectedTrainNo) ?? null
      : null;
    const currentStationName = ridingData.stationNames[currentIdx];
    const targetIdx =
      selectedTrain && selectedTrain.posIdxOriented >= 0
        ? selectedTrain.posIdxOriented
        : orientedLineStations.stations.findIndex(s => s.name === currentStationName);

    if (targetIdx < 0) return;

    const timeout = window.setTimeout(() => {
      const target = scrollContainerRef.current?.querySelector<HTMLElement>(
        `[data-pos-idx="${targetIdx}"]`,
      );
      target?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
    }, prefersReducedMotion ? 0 : 80);

    return () => window.clearTimeout(timeout);
  }, [
    availableTrains,
    currentIdx,
    isTrainPickerExpanded,
    orientedLineStations,
    prefersReducedMotion,
    ridingData,
    selectedTrainNo,
  ]);

  // ===== 마우스 드래그 + 휠 스크롤 (데스크탑 지원) =====
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let didDrag = false;
    const DRAG_THRESHOLD = 5;

    const onMouseDown = (e: MouseEvent) => {
      // 좌클릭만
      if (e.button !== 0) return;
      isDown = true;
      didDrag = false;
      startX = e.pageX;
      startScrollLeft = el.scrollLeft;
      el.style.cursor = "grabbing";
    };

    const stop = () => {
      isDown = false;
      el.style.cursor = "grab";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > DRAG_THRESHOLD) didDrag = true;
      if (didDrag) {
        e.preventDefault();
        el.scrollLeft = startScrollLeft - dx;
      }
    };

    // 드래그 후 발생하는 click을 capture 단계에서 차단 (train pin 선택 방지)
    const onClickCapture = (e: MouseEvent) => {
      if (didDrag) {
        e.stopPropagation();
        e.preventDefault();
        didDrag = false;
      }
    };

    // 휠: vertical → horizontal
    const onWheel = (e: WheelEvent) => {
      // 이미 수평 휠이면 브라우저 기본 처리
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.style.cursor = "grab";
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", stop);
    window.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", stop);
    el.addEventListener("click", onClickCapture, { capture: true });
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.style.cursor = "";
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", stop);
      el.removeEventListener("click", onClickCapture, { capture: true } as EventListenerOptions);
      el.removeEventListener("wheel", onWheel);
    };
  }, [hasFetched, isSimulated, selectedTrainNo, isTrainPickerExpanded]);

  // ===== 하차 알림 (도착 직전 N정거장) =====
  useEffect(() => {
    if (!selectedTrainNo) return;
    const remaining = destinationIdx - currentIdx;
    if (alarmEnabled && !alarmFiredRef.current && remaining === alarmBefore && remaining > 0) {
      toast("곧 도착합니다! 하차 준비하세요.", { icon: "🔔", duration: 5000 });
      alarmFiredRef.current = true;
    }
  }, [currentIdx, destinationIdx, alarmEnabled, alarmBefore, selectedTrainNo]);

  // ===== 표시 중인 ride segment가 바뀔 때 segment-local state 리셋 =====
  // transfer overlay 모드에서 다음 ride를 미리 띄울 때도 reset 되어야 함.
  // 단, transfer → 그 다음 ride 로 자동 advance될 때는 displayedRideIdx가
  // 그대로라 reset 안 일어남 (사용자가 미리 선택한 열차 유지).
  useEffect(() => {
    setSelectedTrainNo(null);
    setSelectedTrainSnapshot(null);
    trainNoRef.current = null;
    setCurrentIdx(0);
    alarmFiredRef.current = false;
    didInitialScrollRef.current = false;
    setIsTrainPickerExpanded(true);
    setAvailableTrains([]);
    setHasFetched(false);
    setTrainPositionError(null);
  }, [displayedRideIdx]);

  // ===== Ride 완료 시 자동으로 다음 segment로 진행 (또는 최종 도착) =====
  // transfer overlay 중에는 displayedRide가 "미리보기"라 도착 처리 X
  useEffect(() => {
    if (isTransferOverlay) return;
    if (currentSegment?.type !== "ride") return;
    if (!selectedTrainNo) return;
    if (currentIdx < destinationIdx || destinationIdx === 0) return;

    if (isLastSegment) {
      // 최종 도착 — 자동 진행 X, dismissable toast
      if (!arrivedFinalRef.current) {
        arrivedFinalRef.current = true;
        toast.success("🎉 최종 목적지에 도착했습니다!", {
          duration: Infinity,
          action: {
            label: "닫기",
            onClick: () => {
              setLocation("/");
            },
          },
        });
      }
      return;
    }

    // 환승 안내로 자동 진행
    toast(`${ridingData?.toStationName || ""}역 도착! 환승 안내로 이동합니다.`, {
      duration: 2500,
    });
    const t = setTimeout(() => {
      setCurrentSegmentIdx(idx => idx + 1);
    }, 1800);
    return () => clearTimeout(t);
  }, [
    currentIdx,
    destinationIdx,
    currentSegment,
    selectedTrainNo,
    isLastSegment,
    isTransferOverlay,
    ridingData,
    setLocation,
  ]);

  // ===== Transfer 자동 진행 (walkMinutes + 1분 여유 후) =====
  useEffect(() => {
    if (currentSegment?.type !== "transfer") return;
    if (isLastSegment) return; // 마지막 segment가 transfer일 일은 없지만 안전장치
    const seconds = currentSegment.walkMinutes * 60 + 60; // 도보 + 1분 여유
    const t = setTimeout(() => {
      setCurrentSegmentIdx(idx => idx + 1);
      toast("환승 완료, 다음 안내로 이동합니다", { duration: 2000 });
    }, seconds * 1000);
    return () => clearTimeout(t);
  }, [currentSegment, isLastSegment]);

  // ===== Transfer 진입 시 보딩역에 가장 빨리 도착할 열차 자동 선택 =====
  // 사용자가 이미 다른 열차를 골랐으면(selectedTrainNo) 자동선택 안 함.
  useEffect(() => {
    if (!isTransferOverlay) return;
    if (selectedTrainNo) return;
    if (availableTrains.length === 0) return;
    const boardIdx = orientedLineStations.fromIdx;
    if (boardIdx < 0) return;

    // 정렬 우선순위:
    //   1. 보딩역에 approaching 중인 열차 (posIdx < boardIdx) 먼저
    //   2. 보딩역에서 가까운 순 (|distance| 작은 순)
    const sorted = [...availableTrains].sort((a, b) => {
      const da = boardIdx - a.posIdxOriented;
      const db = boardIdx - b.posIdxOriented;
      const aApproaching = da >= 0;
      const bApproaching = db >= 0;
      if (aApproaching && !bApproaching) return -1;
      if (!aApproaching && bApproaching) return 1;
      return Math.abs(da) - Math.abs(db);
    });
    const best = sorted[0];
    if (best) {
      trainNoRef.current = best.trainNo;
      setSelectedTrainNo(best.trainNo);
      setSelectedTrainSnapshot(best);
      setIsTrainPickerExpanded(false);
      alarmFiredRef.current = false;
    }
  }, [isTransferOverlay, availableTrains, orientedLineStations.fromIdx, selectedTrainNo]);

  const onSelectTrain = (train: EnrichedTrain) => {
    if (!ridingData) return;
    trainNoRef.current = train.trainNo;
    setSelectedTrainNo(train.trainNo);
    setSelectedTrainSnapshot(train);
    setIsTrainPickerExpanded(false);
    const idxInRoute = ridingData.stationNames.indexOf(train.stationName);
    if (idxInRoute >= 0) {
      setCurrentIdx(idxInRoute);
    } else if (train.posIdxOriented >= 0 && fromIdx >= 0 && train.posIdxOriented < fromIdx) {
      setCurrentIdx(0);
    } else if (train.posIdxOriented >= 0 && toIdx >= 0 && train.posIdxOriented > toIdx) {
      setCurrentIdx(destinationIdx);
    }
    alarmFiredRef.current = false;
    // 선택한 열차 위치로 스크롤 (탭 위치 자체로 알 수 있지만 시각적 강조)
    const target = scrollContainerRef.current?.querySelector<HTMLElement>(
      `[data-pos-idx="${train.posIdxOriented}"]`,
    );
    target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    toast(`${train.trainNo}호 열차 안내를 시작합니다`);
  };

  // ===== Empty guard =====
  if (!route || !currentSegment || totalSegments === 0) {
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

  // ===== Ride segment 안전장치 =====
  // (transfer 모드에선 displayedRide가 다음 ride로 셋됨 → 이 가드 통과)
  if (!ridingData || stations.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <p className="text-[14px] text-[#8E8E93] text-center mb-4">
          경로 데이터를 불러올 수 없습니다.
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

  const { stations: lineStationsOriented, fromIdx, toIdx } = orientedLineStations;
  const routeStationSet = new Set(ridingData.stationNames);

  const trainsByIdx = new Map<number, EnrichedTrain[]>();
  availableTrains.forEach(t => {
    if (t.posIdxOriented < 0) return;
    const list = trainsByIdx.get(t.posIdxOriented) ?? [];
    list.push(t);
    trainsByIdx.set(t.posIdxOriented, list);
  });

  const STATION_WIDTH = 56;
  const BASE_LEFT_PADDING = 16;
  // Align the 2px rail center with the station-dot center:
  // bottom padding 12 + label block 24 + label gap 4 + dot center 6 - rail half 1.
  const STATION_LINE_BOTTOM = 45;
  const arriveLabel = ridingData.isTransferAtEnd ? "환승" : "하차";
  const remaining = Math.max(0, destinationIdx - currentIdx);
  const remainingTime = remaining * 2;
  const progress = destinationIdx > 0 ? (currentIdx / destinationIdx) * 100 : 0;
  const arrivalTime = new Date();
  arrivalTime.setMinutes(arrivalTime.getMinutes() + remainingTime);
  const currentStation = stations[currentIdx];
  const isTracking = !!selectedTrainNo;

  // 선택한 열차의 현재 위치 (waiting 상태 판정용). sim 열차도 포함.
  const selectedTrainPos = selectedTrainNo
    ? availableTrains.find(t => t.trainNo === selectedTrainNo) ?? selectedTrainSnapshot
    : null;
  // 열차가 아직 출발역 도달 전인지 (탑승 대기 상태)
  const isWaitingForBoard =
    selectedTrainPos !== null &&
    fromIdx >= 0 &&
    selectedTrainPos.posIdxOriented < fromIdx;
  const stationsUntilBoard = isWaitingForBoard
    ? fromIdx - selectedTrainPos.posIdxOriented
    : 0;
  // 대략적 ETA: 역간 2분 가정. 출발 직후(status=2)면 도착이 더 빠를 가능성
  const etaMinutes =
    isWaitingForBoard
      ? selectedTrainPos.trainStatus === "2"
        ? Math.max(1, stationsUntilBoard * 2 - 1)
        : stationsUntilBoard * 2
      : 0;
  const showFullTrainPicker = !isTracking || isTrainPickerExpanded;
  const selectedTrainStationName = selectedTrainPos?.stationName || currentStation?.name || "위치 확인 중";
  const routeProgressPercent = isWaitingForBoard
    ? 0
    : Math.max(0, Math.min(100, progress));
  const routeProgressMarkerTransform =
    routeProgressPercent <= 0
      ? "translateX(0)"
      : routeProgressPercent >= 100
      ? "translateX(-100%)"
      : "translateX(-50%)";
  const routeProgressLabelTransform =
    routeProgressPercent <= 12
      ? "translateX(0)"
      : routeProgressPercent >= 88
      ? "translateX(-100%)"
      : "translateX(-50%)";
  const compactProgressStationLabel =
    isWaitingForBoard && selectedTrainStationName
      ? `${selectedTrainStationName} · 탑승 전`
      : selectedTrainStationName;
  const selectedTrainMeta = isWaitingForBoard
    ? `${ridingData.fromStationName}까지 ${stationsUntilBoard}정거장 전`
    : currentIdx < destinationIdx
    ? `${stations[currentIdx + 1]?.name} 방면`
    : `${arriveLabel} 완료`;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ===== Sticky top: nav + 가로 노선도 ===== */}
      <div className="sticky top-0 z-40 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        {/* Mini nav bar */}
        <div
          className="nav-bar"
          style={{
            paddingTop: "calc(max(20px, env(safe-area-inset-top, 0px)) + 4px)",
          }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => window.history.back()}
              className="btn-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              aria-label="이전 화면"
            >
              <ArrowLeft size={22} className="text-[#1B2838]" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <div className="flex min-w-0 items-center justify-center gap-1.5">
                <span
                  className="line-badge shrink-0 text-[10px]"
                  style={{ backgroundColor: lineColor }}
                >
                  {line?.shortName}
                </span>
                <span className="truncate text-[15px] font-semibold text-[#1B2838]">
                  탑승중
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] leading-4 text-[#8E8E93]">
                {ridingData.direction} · {availableTrains.length}대
              </p>
            </div>
            <button
              onClick={refreshPositions}
              className="btn-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              title="새로고침"
              aria-label="열차 위치 새로고침"
            >
              <RefreshCw
                size={18}
                className={`text-[#1B2838] ${loadingTrains ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Ride 진행 + prev/next (여러 ride segments일 때만, 환승은 카운트 X) */}
          {totalRides > 1 && (
            <div className="flex items-center gap-2 px-4 pb-3">
              <button
                onClick={() => {
                  if (currentRideIdx > 0) {
                    setCurrentSegmentIdx(rideSegments[currentRideIdx - 1].originalIdx);
                  }
                }}
                disabled={currentRideIdx <= 0}
                className="btn-press flex h-7 items-center gap-0.5 rounded-full bg-[#F5F5F7] px-2.5 text-[#1B2838] disabled:opacity-35"
                title="이전 노선"
              >
                <ChevronLeft size={12} />
                <span className="text-[10px] font-bold">이전</span>
              </button>
              <div className="flex flex-1 items-center justify-center gap-1">
                {rideSegments.map((r, i) => (
                  <button
                    key={r.originalIdx}
                    onClick={() => setCurrentSegmentIdx(r.originalIdx)}
                    className="h-1.5 rounded-full transition-all btn-press"
                    style={{
                      width: i === currentRideIdx ? "20px" : "8px",
                      backgroundColor:
                        i === currentRideIdx
                          ? lineColor
                          : i < currentRideIdx
                          ? `${lineColor}66`
                          : "#DADAE0",
                    }}
                    title={`${i + 1}/${totalRides} 노선`}
                  />
                ))}
                <span className="ml-1.5 text-[10px] font-medium text-[#8E8E93]">
                  {currentRideIdx + 1}/{totalRides}
                </span>
              </div>
              <button
                onClick={() => {
                  if (currentRideIdx < totalRides - 1) {
                    setCurrentSegmentIdx(rideSegments[currentRideIdx + 1].originalIdx);
                  }
                }}
                disabled={currentRideIdx >= totalRides - 1}
                className="btn-press flex h-7 items-center gap-0.5 rounded-full bg-[#F5F5F7] px-2.5 text-[#1B2838] disabled:opacity-35"
                title="다음 노선"
              >
                <span className="text-[10px] font-bold">다음</span>
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>

        <AnimatePresence initial={false} mode="popLayout">
          {showFullTrainPicker ? (
            <motion.div
              key="train-picker"
              initial={isTracking ? { opacity: 0, y: -14 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={slideTransition}
            >
              <>
                <div
                  ref={scrollContainerRef}
                  className="overflow-x-auto no-scrollbar bg-white border-b border-[#F0F0F2]"
                  style={{ scrollSnapType: "x proximity" }}
                >
                  <div
                    className="relative inline-flex items-end px-4 pt-2 pb-3"
                    style={{ minWidth: `${lineStationsOriented.length * STATION_WIDTH}px` }}
                  >
                    {/* 베이스 라인 */}
                    <div
                      className="absolute h-[2px] rounded-full opacity-20 pointer-events-none"
                      style={{
                        backgroundColor: lineColor,
                        left: `${BASE_LEFT_PADDING + STATION_WIDTH / 2}px`,
                        right: `${BASE_LEFT_PADDING + STATION_WIDTH / 2}px`,
                        bottom: `${STATION_LINE_BOTTOM}px`,
                      }}
                    />
                    {/* 우리 구간 강조 라인 */}
                    {fromIdx >= 0 && toIdx >= 0 && (
                      <div
                        className="absolute h-[2px] rounded-full pointer-events-none"
                        style={{
                          backgroundColor: lineColor,
                          left: `${BASE_LEFT_PADDING + fromIdx * STATION_WIDTH + STATION_WIDTH / 2}px`,
                          width: `${(toIdx - fromIdx) * STATION_WIDTH}px`,
                          bottom: `${STATION_LINE_BOTTOM}px`,
                        }}
                      />
                    )}

                    {lineStationsOriented.map((station, idx) => {
                      const isFrom = idx === fromIdx;
                      const isTo = idx === toIdx;
                      const isOnRoute = routeStationSet.has(station.name);
                      const trainsHere = trainsByIdx.get(idx) ?? [];

                      return (
                        <div
                          key={station.id}
                          ref={isFrom ? fromStationDomRef : null}
                          data-pos-idx={idx}
                          className="relative shrink-0 flex flex-col items-center"
                          style={{ width: `${STATION_WIDTH}px`, scrollSnapAlign: "center" }}
                        >
                          {/* Train lane */}
                          <div
                            className="w-full flex flex-col items-center justify-end gap-0.5 mb-1"
                            style={{ minHeight: "30px" }}
                          >
                            {trainsHere.slice(0, 2).map(train => (
                              <CompactTrainPin
                                key={train.trainNo}
                                train={train}
                                lineColor={lineColor}
                                isSelected={train.trainNo === selectedTrainNo}
                                onSelect={() => onSelectTrain(train)}
                                stationWidth={STATION_WIDTH}
                              />
                            ))}
                            {trainsHere.length > 2 && (
                              <span className="text-[8px] text-[#8E8E93]">
                                +{trainsHere.length - 2}
                              </span>
                            )}
                          </div>

                          {/* Station dot */}
                          <div
                            className="relative flex items-center justify-center"
                            style={{ height: "12px" }}
                          >
                            {isFrom || isTo ? (
                              <div
                                className="w-3 h-3 rounded-full border-[2.5px] bg-white z-10"
                                style={{ borderColor: isFrom ? "#4A90D9" : "#E74C3C" }}
                              />
                            ) : (
                              <div
                                className={`w-2 h-2 rounded-full z-10 ${
                                  isOnRoute ? "" : "bg-white border border-[#D0D0D0]"
                                }`}
                                style={{ backgroundColor: isOnRoute ? lineColor : undefined }}
                              />
                            )}
                          </div>

                          {/* Station name */}
                          <div className="mt-1 flex flex-col items-center min-h-[24px]">
                            <span
                              className={`text-[9.5px] leading-tight text-center whitespace-nowrap ${
                                isFrom || isTo
                                  ? "font-bold text-[#1B2838]"
                                  : isOnRoute
                                  ? "text-[#1B2838]"
                                  : "text-[#B0B0B5]"
                              }`}
                            >
                              {station.name}
                            </span>
                            {isFrom && (
                              <span className="text-[8px] font-bold text-[#4A90D9] mt-0.5 leading-none">
                                출발
                              </span>
                            )}
                            {isTo && (
                              <span className="text-[8px] font-bold text-[#E74C3C] mt-0.5 leading-none">
                                {arriveLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {hasFetched && isSimulated && (
                  <div className="bg-[#FFF8EF] border-b border-[#F0E4D0] px-4 py-1.5 flex items-center justify-center gap-2">
                    <span className="text-[9px] font-bold text-[#C97A1B] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFE9C7]">
                      시뮬레이션
                    </span>
                    <span className="text-[10px] text-[#8E8E93] truncate">
                      {trainPositionError ?? "실데이터를 사용할 수 없어 가짜 열차를 표시합니다"}
                    </span>
                  </div>
                )}
              </>
            </motion.div>
          ) : (
            <motion.div
              key="selected-train-strip"
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={slideTransition}
              className="border-b border-[#F0F0F2] bg-white/95 px-3 py-2 backdrop-blur-md"
            >
              <button
                type="button"
                onClick={() => setIsTrainPickerExpanded(true)}
                className="btn-press flex w-full flex-col gap-2 rounded-xl px-1 py-0.5 text-left"
                aria-label="열차 선택 영역 펼치기"
              >
                <span className="flex w-full items-center gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: lineColor }}
                  >
                    <Train size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="max-w-[96px] truncate text-[13px] font-bold text-[#1B2838]">
                        {selectedTrainNo}{isSimulated ? "" : "호"}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-[#C7C7CC]" />
                      <span className="truncate text-[12px] font-semibold text-[#1B2838]">
                        {selectedTrainStationName}
                      </span>
                    </span>
                    <span className="block truncate text-[10.5px] leading-tight text-[#8E8E93]">
                      {selectedTrainMeta}
                    </span>
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5F5F7] text-[#8E8E93]">
                    <ChevronDown size={14} />
                  </span>
                </span>
                <span className="block w-full">
                  <span className="mb-1 flex items-center justify-between gap-2 text-[9.5px] font-medium text-[#8E8E93]">
                    <span className="min-w-0 flex-1 truncate">{ridingData.fromStationName}</span>
                    <span className="min-w-0 flex-1 truncate text-right">{ridingData.toStationName}</span>
                  </span>
                  <span className="relative block h-7 overflow-hidden">
                    <motion.span
                      className="absolute top-0 max-w-[42%] truncate rounded-full px-1.5 py-0.5 text-[9.5px] font-bold"
                      style={{
                        backgroundColor: `${lineColor}14`,
                        color: lineColor,
                        transform: routeProgressLabelTransform,
                      }}
                      animate={{ left: `${routeProgressPercent}%` }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {compactProgressStationLabel}
                    </motion.span>
                    <span className="absolute bottom-[5px] left-0 right-0 h-1 rounded-full bg-[#E5E5EA]" />
                    <motion.span
                      className="absolute bottom-[5px] left-0 h-1 rounded-full"
                      style={{ backgroundColor: lineColor }}
                      animate={{ width: `${routeProgressPercent}%` }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <motion.span
                      className="absolute bottom-[1px] h-3 w-3 rounded-full border-2 border-white shadow-[0_1px_5px_rgba(27,40,56,0.22)]"
                      style={{
                        transform: routeProgressMarkerTransform,
                        backgroundColor: lineColor,
                      }}
                      animate={{ left: `${routeProgressPercent}%` }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </span>
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== Below: 안내 UI (선택 시) 또는 placeholder ===== */}
      {!isTracking ? (
        <div className="px-4 pt-6">
          <div className="ios-card p-6 text-center">
            <Train size={28} className="text-[#C7C7CC] mx-auto mb-2" />
            <p className="text-[14px] font-semibold text-[#1B2838] mb-1">
              위 노선도에서 열차를 선택하세요
            </p>
            <p className="text-[12px] text-[#8E8E93] leading-relaxed">
              {ridingData.fromStationName}역(★ 출발) 주변의 열차 핀을 탭하면<br />
              실시간 추적이 시작됩니다.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* === 탑승 전: 도착 카운트다운 (가장 중요한 정보) === */}
          {isWaitingForBoard ? (
            <div className="px-4 pt-4">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="ios-card p-5 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{ backgroundColor: lineColor }}
                />
                <div className="flex items-center justify-between mb-3 ml-2">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#4A90D9]" />
                    <span className="text-[12px] text-[#8E8E93] font-medium">
                      {ridingData.fromStationName}역까지
                    </span>
                  </div>
                  <span className="text-[9px] bg-[#EBF4FF] text-[#4A90D9] px-1.5 py-0.5 rounded font-semibold">
                    {selectedTrainNo}호
                  </span>
                </div>

                <motion.div
                  key={etaMinutes}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="ml-2 flex items-baseline gap-2"
                >
                  <span className="text-[#1B2838] text-[12px] font-medium">약</span>
                  <span
                    className="font-bold tracking-tight leading-none"
                    style={{ color: lineColor, fontSize: "64px" }}
                  >
                    {etaMinutes}
                  </span>
                  <span className="text-[#1B2838] text-[20px] font-bold">분 후 도착</span>
                </motion.div>

                <div className="ml-2 mt-3 flex items-center gap-2 text-[13px] text-[#8E8E93]">
                  <span className="font-semibold text-[#1B2838]">
                    {selectedTrainPos?.stationName}
                  </span>
                  <span>·</span>
                  <span>
                    {stationsUntilBoard === 1
                      ? "곧 도착"
                      : `${stationsUntilBoard}정거장 전`}
                  </span>
                  {selectedTrainPos?.trainStatus === "1" && (
                    <span className="text-[10px] bg-[#F0FFF4] text-[#27AE60] px-1.5 py-0.5 rounded font-semibold ml-1">
                      정차 중
                    </span>
                  )}
                  {selectedTrainPos?.trainStatus === "0" && (
                    <span className="text-[10px] bg-[#F0FFF4] text-[#27AE60] px-1.5 py-0.5 rounded font-semibold ml-1">
                      역 진입
                    </span>
                  )}
                  {selectedTrainPos?.trainStatus === "2" && (
                    <span className="text-[10px] bg-[#FFF3EB] text-[#E67E22] px-1.5 py-0.5 rounded font-semibold ml-1">
                      출발 직후
                    </span>
                  )}
                </div>

                {/* 진행 시각화: 열차가 출발역에 얼마나 가까운지 */}
                <div className="ml-2 mt-4 h-1.5 bg-[#F0F0F2] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: lineColor }}
                    animate={{
                      width: `${Math.max(8, 100 - Math.min(100, stationsUntilBoard * 12))}%`,
                    }}
                    transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                  />
                </div>
                <p className="ml-2 mt-2 text-[11px] text-[#8E8E93]">
                  → {ridingData.toStationName}{ridingData.isTransferAtEnd ? " (환승)" : " (하차)"}
                </p>
              </motion.div>
            </div>
          ) : (
            <>
              {/* === 탑승 중: 현재 위치 카드 === */}
              <div className="px-4 pt-4">
                <div className="ios-card p-4 relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 w-1 h-full"
                    style={{ backgroundColor: lineColor }}
                  />
                  <div className="flex items-center justify-between mb-2 ml-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#8E8E93]">현재 위치</span>
                      <span className="text-[9px] bg-[#EBF4FF] text-[#4A90D9] px-1.5 py-0.5 rounded font-semibold">
                        {selectedTrainNo}{isSimulated ? "" : "호"}
                      </span>
                      {isSimulated && (
                        <span className="text-[9px] bg-[#FFE9C7] text-[#C97A1B] px-1.5 py-0.5 rounded font-semibold">
                          시뮬
                        </span>
                      )}
                    </div>
                  </div>
                  <motion.div
                    key={currentIdx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="ml-2"
                  >
                    <h1 className="text-[#1B2838] text-[26px] font-bold tracking-tight leading-tight">
                      {currentStation?.name}
                    </h1>
                    {currentIdx < destinationIdx && (
                      <p className="text-[#8E8E93] text-[12px] mt-0.5">
                        → {stations[currentIdx + 1]?.name} 방면 이동 중
                      </p>
                    )}
                  </motion.div>
                  <div className="flex items-center gap-5 mt-4 ml-2">
                    <div>
                      <p className="text-[#8E8E93] text-[10px]">남은 역</p>
                      <p className="text-[#1B2838] text-[18px] font-bold">{remaining}개</p>
                    </div>
                    <div>
                      <p className="text-[#8E8E93] text-[10px]">남은 시간</p>
                      <p className="text-[#1B2838] text-[18px] font-bold">{remainingTime}분</p>
                    </div>
                    <div>
                      <p className="text-[#8E8E93] text-[10px]">도착 예정</p>
                      <p className="text-[#1B2838] text-[18px] font-bold">
                        {arrivalTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="px-4 mt-3">
                <div className="ios-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] text-[#8E8E93]">진행률</span>
                    <span className="text-[12px] font-semibold text-[#1B2838]">
                      {Math.round(progress)}%
                    </span>
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
            </>
          )}

          {/* Alarm */}
          <div className="px-4 mt-3">
            <div className="ios-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FFF3EB] flex items-center justify-center">
                    <Bell size={18} className="text-[#E67E22]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#1B2838]">하차 알림</p>
                    <p className="text-[12px] text-[#8E8E93]">
                      {alarmBefore}정거장 전 알림
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setAlarmBefore(Math.max(1, alarmBefore - 1));
                      alarmFiredRef.current = false;
                    }}
                    className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center btn-press"
                  >
                    <Minus size={14} className="text-[#1B2838]" />
                  </button>
                  <span className="text-[16px] font-bold text-[#1B2838] w-4 text-center">
                    {alarmBefore}
                  </span>
                  <button
                    onClick={() => {
                      setAlarmBefore(Math.min(5, alarmBefore + 1));
                      alarmFiredRef.current = false;
                    }}
                    className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center btn-press"
                  >
                    <Plus size={14} className="text-[#1B2838]" />
                  </button>
                  <button
                    onClick={() => {
                      setAlarmEnabled(!alarmEnabled);
                      toast(alarmEnabled ? "알람이 해제되었습니다" : "알람이 설정되었습니다");
                    }}
                    className="w-9 h-9 rounded-full bg-[#F5F5F7] flex items-center justify-center btn-press ml-1"
                  >
                    {alarmEnabled ? (
                      <BellRing size={16} className="text-[#E67E22]" />
                    ) : (
                      <BellOff size={16} className="text-[#8E8E93]" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="px-4 mt-4">
            <h3 className="text-[15px] font-bold text-[#1B2838] mb-3">정차역</h3>
            <div className="ios-card overflow-hidden">
              {stations.map((station, idx) => {
                const isCurrent = idx === currentIdx;
                const isPast = idx < currentIdx;
                const isLastStop = idx === destinationIdx;
                const isMutedMiddleStop =
                  idx > currentIdx && idx < destinationIdx && !isCurrent && !isLastStop;
                const minutesAway = (idx - currentIdx) * 2;

                return (
                  <motion.div
                    key={`${station.name}-${idx}`}
                    animate={
                      isCurrent
                        ? { backgroundColor: "rgba(74, 144, 217, 0.16)" }
                        : { backgroundColor: "rgba(0,0,0,0)" }
                    }
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className={`relative flex min-h-[52px] items-center border-b border-[#F0F0F2] px-4 py-2 last:border-0 ${
                      isCurrent ? "shadow-[inset_4px_0_0_#4A90D9]" : ""
                    } ${
                      isPast ? "opacity-40" : isMutedMiddleStop ? "opacity-35" : ""
                    }`}
                  >
                    <div className="relative mr-3 flex flex-col items-center">
                      <div
                        className={`rounded-full ${
                          isCurrent
                            ? "h-4 w-4 border-[3px] border-white bg-[#4A90D9] shadow-[0_0_0_3px_rgba(74,144,217,0.24)]"
                            : isLastStop
                            ? "h-3 w-3 border-2 border-[#E74C3C] bg-[#E74C3C]"
                            : isPast
                            ? "h-3 w-3 border-2 border-[#C7C7CC] bg-[#C7C7CC]"
                            : "h-3 w-3 border-2 border-[#D0D0D0] bg-white"
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={`min-w-0 truncate ${isCurrent ? "text-[15px]" : "text-[14px]"} ${
                            isCurrent || isLastStop ? "font-bold" : "font-medium"
                          } ${isPast ? "text-[#8E8E93]" : "text-[#1B2838]"}`}
                        >
                          {station.name}
                        </span>
                        {station.isTransfer && station.transferLines.length > 0 && !isPast && (
                          <div className="flex shrink-0 items-center gap-1">
                            {station.transferLines.map(lineId => {
                              const transferLine = getLineInfo(lineId);
                              return (
                                <span
                                  key={lineId}
                                  className="line-badge text-[8px]"
                                  style={{
                                    backgroundColor: transferLine?.color || "#888",
                                    minWidth: "auto",
                                    height: "16px",
                                    padding: "0 4px",
                                  }}
                                >
                                  {transferLine?.shortName || lineId}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-3 flex shrink-0 items-center gap-1.5">
                      {!isPast && !isCurrent && (
                        <span className="text-[12px] text-[#8E8E93]">{minutesAway}분</span>
                      )}
                      {isCurrent && (
                        <span className="rounded bg-[#4A90D9] px-2 py-0.5 text-[10px] font-semibold text-white">
                          현재
                        </span>
                      )}
                      {isLastStop && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            arriveLabel === "환승"
                              ? "bg-[#FFF3EB] text-[#E67E22]"
                              : "bg-[#FFF0F0] text-[#E74C3C]"
                          }`}
                        >
                          {arriveLabel}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 환승 mini sheet (transfer 모드, 자동 선택 정보 + 자세히 보기) */}
      <AnimatePresence>
        {isTransferOverlay && currentSegment?.type === "transfer" && ridingData && (
          <TransferMiniSheet
            key={`transfer-${currentSegmentIdx}`}
            boardingStationName={ridingData.fromStationName}
            selectedTrainNo={selectedTrainNo}
            etaMinutes={isWaitingForBoard ? etaMinutes : selectedTrainNo ? 0 : null}
            isSimulated={isSimulated}
            toLineColor={lineColor}
            onShowDetails={() => setIsTrainPickerExpanded(true)}
            onDismiss={() => {
              // 다음 segment(ride)로 즉시 진행
              if (currentSegmentIdx < totalSegments - 1) {
                setCurrentSegmentIdx(idx => idx + 1);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 컴팩트 열차 핀 (sticky 노선도용)
 */
function CompactTrainPin({
  train,
  lineColor,
  isSelected,
  onSelect,
  stationWidth,
}: {
  train: EnrichedTrain;
  lineColor: string;
  isSelected: boolean;
  onSelect: () => void;
  stationWidth: number;
}) {
  // trainStatus: 0=진입(approaching this station from prev), 1=정차, 2=출발(departed toward next)
  // 역과 역 사이 위치 시각화: 진입은 살짝 왼쪽, 출발은 오른쪽으로 이동
  const transitOffsetPx =
    train.trainStatus === "2"
      ? stationWidth * 0.4 // 출발 직후 → 다음 역 방향(우측)
      : train.trainStatus === "0"
      ? stationWidth * -0.3 // 진입 중 → 이전 역 방향(좌측)에서 다가옴
      : 0; // 정차 or unknown → 역 위치 그대로

  const pulsing = train.trainStatus === "0" || train.trainStatus === "1";
  const inTransit = train.trainStatus === "2" || train.trainStatus === "0";

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0, x: transitOffsetPx }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      onClick={onSelect}
      className="relative btn-press flex items-center"
      title={`${train.trainNo}호 · ${train.destination || "—"} 방면${
        train.trainStatus === "2"
          ? " (출발 직후)"
          : train.trainStatus === "0"
          ? " (진입 중)"
          : train.trainStatus === "1"
          ? " (정차 중)"
          : ""
      }`}
    >
      <div
        className="flex items-center gap-0.5 px-1 py-[1.5px] rounded-full"
        style={{
          backgroundColor: lineColor,
          color: "white",
          boxShadow: isSelected
            ? `0 0 0 2px white, 0 0 0 4px ${lineColor}`
            : pulsing
            ? `0 0 0 2px ${lineColor}33`
            : undefined,
        }}
      >
        <Train size={8} className="text-white shrink-0" />
        <span className="text-[8.5px] font-bold leading-none">{train.trainNo}</span>
        {inTransit && (
          <span
            className="ml-0.5 text-[8px] leading-none font-bold"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {train.trainStatus === "2" ? "→" : "←"}
          </span>
        )}
      </div>
    </motion.button>
  );
}
