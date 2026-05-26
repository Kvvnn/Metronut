/**
 * 탑승 안내 화면
 *
 * 한 화면 구조:
 * - 상단 sticky: 미니 nav
 * - 하단 스크롤: 선택된 열차의 안내 UI (현재 위치/진행률/알람/타임라인)
 *
 * 사용자는 하단 서랍을 열어 열차를 선택하거나 다른 열차로 전환 가능.
 * 시뮬레이션 모드(실데이터 없음): 가짜 열차 6대를 노선도에 띄우고 사용자가
 * 골라서 추적 (8초마다 한 정거장씩 전진). 상단 'SIM' 뱃지로 구분.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Bell, BellOff, BellRing, Clock, Minus, Plus,
  ArrowLeft, RefreshCw, Train,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  /** 운행 패턴 라벨 (예: "인천행", "마천행"). 없으면 direction 사용 */
  patternLabel?: string;
  /** 운행 패턴 종착역명 */
  patternTerminus?: string;
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
  /**
   * 시뮬 전용: posIdxOriented (가장 가까운 역) 기준 진행률.
   * -0.5 = 직전 역에서 막 출발, 0 = 역 위, +0.5 = 다음 역 직전.
   * progress가 0.5를 넘으면 posIdxOriented가 1 증가하고 progress는 -0.5로 reset.
   */
  transitProgress?: number;
  /** 시뮬 전용: 트레인별 속도 (역간 1구간을 1/speed tick 만에 통과) */
  simSpeed?: number;
  /** 시뮬 전용: 정차 시 남은 dwell tick 수 */
  dwellTicks?: number;
}

// 가짜 열차 식별 prefix. 실데이터 API trainNo는 보통 4자리 숫자라 충돌 X.
const SIM_TRAIN_PREFIX = "S";
const SIM_TICK_MS = 2000;
const SIM_TRAIN_COUNT = 8;

/**
 * 시뮬레이션 모드용 가짜 열차 생성.
 * 노선 전체에 트레인 분산 배치. 트레인별 다른 progress + 속도로 다양성 확보.
 */
function generateFakeTrains(
  lineStations: { name: string }[],
  updnLine: string,
): EnrichedTrain[] {
  if (lineStations.length === 0) return [];
  const lastIdx = lineStations.length - 1;
  const destination = lineStations[lastIdx]?.name ?? "";
  const trains: EnrichedTrain[] = [];
  for (let i = 0; i < SIM_TRAIN_COUNT; i++) {
    const posIdx = Math.floor((lastIdx * (i + 1)) / (SIM_TRAIN_COUNT + 1));
    const station = lineStations[posIdx];
    if (!station) continue;
    // 트레인마다 progress를 분산: 일부는 정차, 일부는 운행 중
    const initialProgress = ((i * 0.31) % 1) - 0.5; // -0.5 ~ +0.5
    const speed = 0.14 + (i % 3) * 0.025; // 0.14 / 0.165 / 0.19
    const trainStatus =
      Math.abs(initialProgress) < 0.05
        ? "1"
        : initialProgress < -0.15
        ? "0"
        : "2";
    trains.push({
      trainNo: `${SIM_TRAIN_PREFIX}${2001 + i}`,
      stationName: station.name,
      updnLine,
      trainStatus,
      destination,
      receivedAt: new Date().toISOString(),
      posIdxOriented: posIdx,
      sameDirection: true,
      transitProgress: initialProgress,
      simSpeed: speed,
      dwellTicks: trainStatus === "1" ? 1 : 0,
    });
  }
  return trains;
}

/**
 * 시뮬 트레인 한 tick 진행 (SIM_TICK_MS마다).
 *  - dwellTicks > 0: 정차 유지, dwell-1
 *  - progress += simSpeed
 *  - progress 0 근처 진입 시 정차(dwell=1~2) 처리
 *  - progress >= 0.5: posIdxOriented++, progress -= 1
 *  - 종착역(lastIdx) 도달 시 정지
 */
function tickFakeTrains(
  trains: EnrichedTrain[],
  lineStations: { name: string }[],
): EnrichedTrain[] {
  const lastIdx = lineStations.length - 1;
  return trains.map(t => {
    const speed = t.simSpeed ?? 0.16;
    const dwell = t.dwellTicks ?? 0;
    const progress = t.transitProgress ?? 0;

    // 종착 정지
    if (t.posIdxOriented >= lastIdx && progress >= 0) {
      return {
        ...t,
        transitProgress: 0,
        trainStatus: "1",
        dwellTicks: 0,
        receivedAt: new Date().toISOString(),
      };
    }

    // 정차 dwell 소진
    if (dwell > 0) {
      return {
        ...t,
        dwellTicks: dwell - 1,
        trainStatus: "1",
        receivedAt: new Date().toISOString(),
      };
    }

    let newProgress = progress + speed;
    let posIdx = t.posIdxOriented;
    let stationName = t.stationName;
    let newDwell = 0;

    // 다음 역으로 reparent (progress 0.5 넘으면 가장 가까운 역이 다음)
    if (newProgress >= 0.5) {
      posIdx = Math.min(posIdx + 1, lastIdx);
      newProgress -= 1; // -0.5 reset
      stationName = lineStations[posIdx]?.name ?? stationName;
    }

    // 역 중심 진입 시 snap & 정차
    let status: string;
    if (newProgress > -speed * 0.6 && newProgress < speed * 0.6) {
      newProgress = 0;
      newDwell = 1 + Math.floor(Math.random() * 2); // 2~6초 정차
      status = "1";
    } else if (newProgress < 0) {
      status = "0"; // 진입 중
    } else {
      status = "2"; // 출발 직후/운행
    }

    return {
      ...t,
      posIdxOriented: posIdx,
      stationName,
      transitProgress: newProgress,
      dwellTicks: newDwell,
      trainStatus: status,
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

  // ===== 시뮬레이션 모드: SIM_TICK_MS마다 가짜 열차들 부드럽게 진행 =====
  // 매 tick 작은 progress 증가 + framer-motion linear transition으로 연속 움직임.
  useEffect(() => {
    if (!isSimulated) return;
    if (orientedLineStations.stations.length === 0) return;
    const timer = setInterval(() => {
      setAvailableTrains(prev => {
        if (prev.length === 0 || !prev.every(t => isSimTrainNo(t.trainNo))) return prev;
        return tickFakeTrains(prev, orientedLineStations.stations);
      });
    }, SIM_TICK_MS);
    return () => clearInterval(timer);
  }, [isSimulated, orientedLineStations]);

  // ===== 초기 자동 스크롤: 출발역으로 센터링 =====
  // 하단 시트가 처음 열린 뒤 ref가 생기면 출발역을 중앙에 맞춘다.
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
  }, [orientedLineStations, isTrainPickerExpanded]);

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

  // ===== 하차 알림: 시각 표시로 충분 — toast 제거 =====
  useEffect(() => {
    if (!selectedTrainNo) return;
    const remaining = destinationIdx - currentIdx;
    if (alarmEnabled && !alarmFiredRef.current && remaining === alarmBefore && remaining > 0) {
      alarmFiredRef.current = true;
    }
  }, [currentIdx, destinationIdx, alarmEnabled, alarmBefore, selectedTrainNo]);

  // ===== 표시 중인 ride segment가 바뀔 때 segment-local state 리셋 =====
  // 서랍 열림/닫힘은 사용자가 정한 상태를 유지한다. 자동으로 여는 경우는 환승 진입뿐이다.
  useEffect(() => {
    setSelectedTrainNo(null);
    setSelectedTrainSnapshot(null);
    trainNoRef.current = null;
    setCurrentIdx(0);
    alarmFiredRef.current = false;
    didInitialScrollRef.current = false;
    setAvailableTrains([]);
    setHasFetched(false);
    setTrainPositionError(null);
  }, [displayedRideIdx]);

  // 환승 구간에 진입하면 하단 서랍을 자동으로 열어 다음 열차 선택 안내를 보여준다.
  useEffect(() => {
    if (!isTransferOverlay) return;
    setIsTrainPickerExpanded(true);
  }, [displayedRideIdx, isTransferOverlay]);

  // ===== Ride 완료 시 자동으로 다음 segment로 진행 (또는 최종 도착) =====
  // transfer overlay 중에는 displayedRide가 "미리보기"라 도착 처리 X
  useEffect(() => {
    if (isTransferOverlay) return;
    if (currentSegment?.type !== "ride") return;
    if (!selectedTrainNo) return;
    if (currentIdx < destinationIdx || destinationIdx === 0) return;

    if (isLastSegment) {
      // 최종 도착 — toast 없이 inline UI(타임라인의 종착역 상태)로 표시
      arrivedFinalRef.current = true;
      return;
    }

    // 환승 안내로 자동 진행 (toast 없음 — 팝업이 곧바로 뜸)
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
      setIsTrainPickerExpanded(true);
      alarmFiredRef.current = false;
    }
  }, [isTransferOverlay, availableTrains, orientedLineStations.fromIdx, selectedTrainNo]);

  const onSelectTrain = (train: EnrichedTrain) => {
    if (!ridingData) return;
    trainNoRef.current = train.trainNo;
    setSelectedTrainNo(train.trainNo);
    setSelectedTrainSnapshot(train);
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
          onClick={() => setLocation("/")}
          className="px-5 py-3 bg-[#1B2838] text-white rounded-xl text-[14px] font-semibold btn-press"
        >
          노선도로 가기
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
          onClick={() => setLocation("/")}
          className="px-5 py-3 bg-[#1B2838] text-white rounded-xl text-[14px] font-semibold btn-press"
        >
          노선도로 가기
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

  const STATION_WIDTH = 84;
  const BASE_LEFT_PADDING = 16;
  // Align the 3px rail center with the station-dot center.
  const STATION_LINE_BOTTOM = 66;
  const arriveLabel = ridingData.isTransferAtEnd ? "환승" : "하차";
  const remaining = Math.max(0, destinationIdx - currentIdx);
  const remainingTime = remaining * 2;
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
  // Picker는 하단 시트에서만 렌더한다. 첫 진입도 열린 하단 시트에서 시작한다.
  const pickerInSheet = isTrainPickerExpanded;
  const selectedTrainStationName = selectedTrainPos?.stationName || currentStation?.name || "위치 확인 중";
  const selectedTrainMeta = isWaitingForBoard
    ? `${ridingData.fromStationName}까지 ${stationsUntilBoard}정거장 전`
    : currentIdx < destinationIdx
    ? `${stations[currentIdx + 1]?.name} 방면`
    : `${arriveLabel} 완료`;
  const sheetEtaLabel =
    etaMinutes <= 0 ? "곧 도착" : `약 ${etaMinutes}분 후 도착`;
  const sheetSecondaryLabel =
    isWaitingForBoard || isTransferOverlay
      ? `${ridingData.fromStationName} ${sheetEtaLabel}`
      : selectedTrainMeta;
  const showTrainSelectionGuidance = !isTracking || isTransferOverlay;
  const activeRideSegment = rideSegments[currentRideIdx]?.segment;
  const activeRideLine =
    activeRideSegment?.type === "ride"
      ? getLineInfo(activeRideSegment.lineId)
      : line;
  const markerSourceIdx =
    selectedTrainPos?.posIdxOriented ??
    (fromIdx >= 0 && currentIdx >= 0 ? fromIdx + currentIdx : -1);
  const trainRailMarkerPercent =
    fromIdx >= 0 && toIdx > fromIdx && markerSourceIdx >= 0
      ? Math.max(0, Math.min(100, ((markerSourceIdx - fromIdx) / (toIdx - fromIdx)) * 100))
      : 0;
  const showTrainRailMarker =
    !isTransferOverlay && isTracking && fromIdx >= 0 && toIdx > fromIdx;
  const railMarkerColor = activeRideLine?.color ?? lineColor;

  const rideSegmentProgressJsx = (
    <div className="px-7 py-3.5">
      <div className="relative flex min-h-9 flex-1 items-center gap-2">
        {rideSegments.map((r, i) => {
          const segmentColor =
            r.segment.type === "ride"
              ? getLineInfo(r.segment.lineId)?.color ?? lineColor
              : lineColor;
          const segmentName =
            r.segment.type === "ride"
              ? getLineInfo(r.segment.lineId)?.name ?? r.segment.lineName
              : "노선";

          return (
            <button
              key={r.originalIdx}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (totalRides > 1 && i !== currentRideIdx) {
                  setCurrentSegmentIdx(r.originalIdx);
                  return;
                }
                setIsTrainPickerExpanded(value => !value);
              }}
              className="btn-press flex h-11 min-w-0 flex-1 items-center"
              style={{ flexGrow: i === currentRideIdx ? 1.8 : 1 }}
              title={`${i + 1}/${totalRides} ${segmentName}`}
              aria-label={`${i + 1}번째 노선으로 이동`}
            >
              <span
                className="relative block h-4 w-full rounded-full transition-all"
                style={{
                  backgroundColor:
                    i === currentRideIdx ? segmentColor : `${segmentColor}66`,
                }}
              >
                {showTrainRailMarker && i === currentRideIdx && (
                  <motion.span
                    data-train-progress-marker="true"
                    className="pointer-events-none absolute top-1/2 z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-white shadow-[0_2px_8px_rgba(27,40,56,0.24)]"
                    initial={false}
                    animate={{ left: `${trainRailMarkerPercent}%` }}
                    transition={slideTransition}
                    aria-hidden="true"
                  />
                )}
              </span>
            </button>
          );
        })}
        {isTransferOverlay && (
          <span
            data-transfer-wait-marker="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-7 w-7 -translate-x-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: `${railMarkerColor}33` }}
              animate={
                prefersReducedMotion
                  ? { scale: 1, opacity: 0.7 }
                  : { scale: [0.82, 1.35, 0.82], opacity: [0.45, 0.9, 0.45] }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 0.01 }
                  : { duration: 1.3, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }
              }
            />
            <span
              className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_2px_8px_rgba(27,40,56,0.24)]"
              style={{ backgroundColor: railMarkerColor }}
            />
          </span>
        )}
      </div>
    </div>
  );

  const sheetDetailsJsx = showTrainSelectionGuidance ? (
    <div className="px-4 pb-2 pt-3">
      <h2 className="truncate px-1 text-[20px] font-bold leading-tight text-[#1B2838]">
        열차를 고르세요
      </h2>
    </div>
  ) : null;

  // Train picker JSX. 하단 시트 안에서만 렌더해 scrollContainerRef 충돌을 피한다.
  const pickerJsx = (
    <>
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto no-scrollbar bg-white"
        style={{ scrollSnapType: "x proximity" }}
      >
        <div
          className="relative inline-flex items-end px-4 pt-3 pb-4"
          style={{ minWidth: `${lineStationsOriented.length * STATION_WIDTH}px` }}
        >
          {/* 베이스 라인 */}
          <div
            className="absolute h-[3px] rounded-full opacity-20 pointer-events-none"
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
              className="absolute h-[3px] rounded-full pointer-events-none"
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
                  className="w-full flex flex-col items-center justify-end gap-1 mb-1.5"
                  style={{ minHeight: "45px" }}
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
                    <span className="text-[11px] font-semibold text-[#8E8E93]">
                      +{trainsHere.length - 2}
                    </span>
                  )}
                </div>

                {/* Station dot */}
                <div
                  className="relative flex items-center justify-center"
                  style={{ height: "18px" }}
                >
                  {isFrom || isTo ? (
                    <div
                      className="w-[18px] h-[18px] rounded-full border-[3px] bg-white z-10"
                      style={{ borderColor: isFrom ? "#4A90D9" : "#E74C3C" }}
                    />
                  ) : (
                    <div
                      className={`w-3 h-3 rounded-full z-10 ${
                        isOnRoute ? "" : "bg-white border border-[#D0D0D0]"
                      }`}
                      style={{ backgroundColor: isOnRoute ? lineColor : undefined }}
                    />
                  )}
                </div>

                {/* Station name */}
                <div className="mt-1.5 flex flex-col items-center min-h-[36px]">
                  <span
                    className={`text-[13px] leading-tight text-center whitespace-nowrap ${
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
                    <span className="text-[11px] font-bold text-[#4A90D9] mt-1 leading-none">
                      출발
                    </span>
                  )}
                  {isTo && (
                    <span className="text-[11px] font-bold text-[#E74C3C] mt-1 leading-none">
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
        <div className="bg-[#FFF8EF] border-t border-[#F0E4D0] px-4 py-1.5 flex items-center justify-center gap-2">
          <span className="text-[9px] font-bold text-[#C97A1B] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFE9C7]">
            시뮬레이션
          </span>
          <span className="text-[10px] text-[#8E8E93] truncate">
            {trainPositionError ?? "실데이터를 사용할 수 없어 가짜 열차를 표시합니다"}
          </span>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background pb-[220px]">
      {/* ===== Sticky top: nav ===== */}
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
        </div>
      </div>

      {/* ===== Below: 안내 UI (선택 시) 또는 placeholder ===== */}
      {!isTracking ? (
        <div className="flex min-h-[42vh] items-center justify-center px-6 pb-24 text-center">
          <div>
            <Train size={42} className="mx-auto mb-4 text-[#C7C7CC]" />
            <p className="mb-2 text-[20px] font-bold text-[#1B2838]">
              열차 선택 대기
            </p>
            <p className="text-[14px] font-medium leading-relaxed text-[#8E8E93]">
              {ridingData.fromStationName} 출발 · {ridingData.direction}
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
                className="ios-card overflow-hidden p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#4A90D9]" />
                    <span className="text-[12px] font-semibold text-[#8E8E93]">
                      {ridingData.fromStationName}역까지
                    </span>
                  </div>
                  <span className="rounded-md bg-[#EBF4FF] px-2 py-1 text-[10px] font-bold text-[#4A90D9]">
                    {selectedTrainNo}호
                  </span>
                </div>

                <motion.div
                  key={etaMinutes}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-baseline gap-2"
                >
                  <span className="text-[13px] font-semibold text-[#1B2838]">약</span>
                  <span
                    className="font-bold leading-none tracking-tight"
                    style={{ color: lineColor, fontSize: "64px" }}
                  >
                    {etaMinutes}
                  </span>
                  <span className="text-[20px] font-bold text-[#1B2838]">분 후 도착</span>
                </motion.div>

                <div className="mt-3 flex items-center gap-2 text-[13px] text-[#8E8E93]">
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
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#F0F0F2]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: lineColor }}
                    animate={{
                      width: `${Math.max(8, 100 - Math.min(100, stationsUntilBoard * 12))}%`,
                    }}
                    transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-[#8E8E93]">
                  → {ridingData.toStationName}{ridingData.isTransferAtEnd ? " (환승)" : " (하차)"}
                </p>
              </motion.div>
            </div>
          ) : (
            <>
              {/* === 탑승 중: 현재 위치 카드 === */}
              <div className="px-4 pt-4">
                <div className="ios-card overflow-hidden p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-[12px] font-semibold text-[#8E8E93]">현재 위치</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-md bg-[#EBF4FF] px-2 py-1 text-[10px] font-bold text-[#4A90D9]">
                        {selectedTrainNo}{isSimulated ? "" : "호"}
                      </span>
                      {isSimulated && (
                        <span className="rounded-md bg-[#FFE9C7] px-2 py-1 text-[10px] font-bold text-[#C97A1B]">
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
                  >
                    <h1
                      className="truncate text-[34px] font-bold leading-tight tracking-tight"
                      style={{ color: lineColor }}
                    >
                      {currentStation?.name}
                    </h1>
                    {currentIdx < destinationIdx && (
                      <p className="mt-1 truncate text-[13px] font-medium text-[#8E8E93]">
                        → {stations[currentIdx + 1]?.name} 방면 이동 중
                      </p>
                    )}
                  </motion.div>

                  <div className="mt-5 grid grid-cols-3 divide-x divide-[#ECECF1] border-t border-[#F0F0F2] pt-4">
                    <div className="pr-3">
                      <p className="text-[10px] font-semibold text-[#8E8E93]">남은 역</p>
                      <p className="mt-1 text-[21px] font-bold leading-none text-[#1B2838]">
                        {remaining}<span className="text-[13px]">개</span>
                      </p>
                    </div>
                    <div className="px-3">
                      <p className="text-[10px] font-semibold text-[#8E8E93]">남은 시간</p>
                      <p className="mt-1 text-[21px] font-bold leading-none text-[#1B2838]">
                        {remainingTime}<span className="text-[13px]">분</span>
                      </p>
                    </div>
                    <div className="min-w-0 pl-3">
                      <p className="text-[10px] font-semibold text-[#8E8E93]">도착 예정</p>
                      <p className="mt-1 truncate text-[19px] font-bold leading-none text-[#1B2838]">
                        {arrivalTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
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
                    onClick={() => setAlarmEnabled(!alarmEnabled)}
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
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#1B2838]">정차역</h3>
              <span className="text-[12px] font-semibold text-[#8E8E93]">
                {remaining === 0 ? "도착" : `${remaining}개 남음`}
              </span>
            </div>
            <div className="ios-card overflow-hidden">
              {stations.map((station, idx) => {
                const isCurrent = idx === currentIdx;
                const isLastStop = idx === destinationIdx;
                const isInactiveStop = !isCurrent && !isLastStop;
                const minutesAway = (idx - currentIdx) * 2;

                return (
                  <motion.div
                    key={`${station.name}-${idx}`}
                    animate={isCurrent ? { backgroundColor: "rgba(248,250,252,1)" } : { backgroundColor: "rgba(255,255,255,1)" }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className={`flex min-h-11 items-center border-b border-[#F2F2F5] px-3 py-1.5 last:border-0 ${
                      isInactiveStop ? "opacity-35" : ""
                    }`}
                  >
                    <div className="mr-3 flex h-6 w-4 items-center justify-center">
                      <span
                        className={`rounded-full ${
                          isCurrent
                            ? "h-3 w-3 border-2 border-white"
                            : isLastStop
                            ? "h-2.5 w-2.5"
                            : "h-2 w-2"
                        }`}
                        style={{
                          backgroundColor: isLastStop
                            ? arriveLabel === "환승"
                              ? "#E67E22"
                              : "#E74C3C"
                            : isCurrent
                            ? lineColor
                            : "#DADAE0",
                          boxShadow: isCurrent ? `0 0 0 2px ${lineColor}22` : undefined,
                        }}
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span
                        className={`min-w-0 truncate text-[14px] ${
                          isCurrent || isLastStop ? "font-bold" : "font-medium"
                        } ${isInactiveStop ? "text-[#8E8E93]" : "text-[#1B2838]"}`}
                      >
                        {station.name}
                      </span>
                      {station.isTransfer && station.transferLines.length > 0 && !isInactiveStop && (
                        <div className="flex shrink-0 items-center gap-1">
                          {station.transferLines.slice(0, 2).map(lineId => {
                            const transferLine = getLineInfo(lineId);
                            return (
                              <span
                                key={lineId}
                                className="line-badge text-[8px]"
                                style={{
                                  backgroundColor: transferLine?.color || "#888",
                                  minWidth: "auto",
                                  height: "15px",
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

                    <div className="ml-3 flex shrink-0 items-center gap-1.5">
                      {isLastStop && !isCurrent && (
                        <span className="text-[12px] font-medium text-[#A0A0A7]">{minutesAway}분</span>
                      )}
                      {isCurrent && (
                        <span className="rounded-md bg-[#EBF4FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#4A90D9]">
                          현재
                        </span>
                      )}
                      {isLastStop && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
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

      {/* 탑승 mini sheet — segment 전환 시 unmount/remount 하지 않고 mount 유지하여
          내부 props만 바뀌게(촐싹 방지). picker 펼침/접힘만 부드러운 height transition. */}
      <AnimatePresence>
        {ridingData && (
          <TransferMiniSheet
            topSlot={rideSegmentProgressJsx}
            expanded={pickerInSheet}
            onToggleExpand={() => setIsTrainPickerExpanded(value => !value)}
            detailsSlot={sheetDetailsJsx}
          >
            {pickerInSheet && pickerJsx}
          </TransferMiniSheet>
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
  // 위치 시각화:
  //  - 시뮬 트레인 (transitProgress != null): progress * stationWidth로 픽셀 단위 보간
  //    -0.5(이전 역 직후) ~ 0(역 위) ~ +0.5(다음 역 직전) → -stationWidth/2 ~ +stationWidth/2
  //  - 실데이터 트레인: trainStatus 기반 추정 offset (정확한 위치 없음)
  const hasProgress = typeof train.transitProgress === "number";
  const transitOffsetPx = hasProgress
    ? (train.transitProgress as number) * stationWidth
    : train.trainStatus === "2"
    ? stationWidth * 0.4
    : train.trainStatus === "0"
    ? stationWidth * -0.3
    : 0;

  const pulsing = train.trainStatus === "0" || train.trainStatus === "1";
  const inTransit = train.trainStatus === "2" || train.trainStatus === "0";
  // 시뮬은 tick 주기에 맞춰 linear로 부드럽게 흐름, 실데이터는 spring-like 짧은 transition
  const motionTransition = hasProgress
    ? { duration: SIM_TICK_MS / 1000, ease: "linear" as const }
    : { duration: 0.4, ease: [0.23, 1, 0.32, 1] as const };

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0, x: transitOffsetPx }}
      transition={motionTransition}
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
        className="flex items-center gap-1 px-1.5 py-1 rounded-full"
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
        <Train size={12} className="text-white shrink-0" />
        <span className="text-[12px] font-bold leading-none">{train.trainNo}</span>
        {inTransit && (
          <span
            className="ml-0.5 text-[11px] leading-none font-bold"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {train.trainStatus === "2" ? "→" : "←"}
          </span>
        )}
      </div>
    </motion.button>
  );
}
