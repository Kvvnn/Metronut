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
import { toast } from "sonner";
import {
  getExpressStopNames,
  getLineInfo,
  getPracticalTransferSeconds,
  getStationInfo,
} from "@/lib/pathfinder";
import {
  SIM_TRAIN_PREFIX,
  isPastLastTrain,
  advanceFakeTrains,
  dedupeTrainsByNo,
  enrichTrains,
  filterSameDirectionTrains,
  formatPositionAge,
  generateFakeTrains,
  getForwardDistance,
  isBeforeBoardingStation,
  isCircularLineId,
  isDeepInactiveTrain,
  isSimTrainNo,
  orientRideStations,
} from "@shared/metro/ridingTrains";
import type { OrientedStations, TrainEnrichment, TrainInactiveLevel } from "@shared/metro/ridingTrains";
import { getTrainPositions } from "@/lib/realtimeApi";
import type { TrainPosition } from "@/lib/realtimeApi";
import TransferMiniSheet from "@/components/TransferMiniSheet";
import type { TransferSegmentData } from "@/components/TransferMiniSheet";
import Starfield from "@/components/space/Starfield";
import VoyageTrack from "@/components/space/VoyageTrack";
import { formatFastTransferInfo } from "@shared/fastTransfer";

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

type EnrichedTrain = TrainPosition & TrainEnrichment;

// 페이지 이탈(설정/노선 보기 등) 후 복귀 시 복원할 탑승 세션 상태.
const RIDING_SESSION_KEY = "riding_session";
interface RidingSessionState {
  currentSegmentIdx: number;
  selectedTrainNo: string | null;
  selectedTrainSnapshot: EnrichedTrain | null;
  currentIdx: number;
  alarmEnabled: boolean;
  alarmBefore: number;
}

const TRAIN_POSITION_POLL_MS = 15000;

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

  // 페이지를 떠났다 돌아왔을 때 선택 상태를 복원한다.
  // 같은 여정(riding_route)일 때만 복원해 새 경로에 옛 선택이 새는 것을 막는다.
  const restoredSession = useMemo<RidingSessionState | null>(() => {
    try {
      const raw = sessionStorage.getItem(RIDING_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { routeRaw?: string; state?: RidingSessionState };
      if (parsed.routeRaw !== sessionStorage.getItem("riding_route")) return null;
      return parsed.state ?? null;
    } catch {
      return null;
    }
  }, []);

  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(
    restoredSession?.currentSegmentIdx ?? 0,
  );
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
  const routeStationSet = useMemo(
    () => new Set(ridingData?.stationNames ?? []),
    [ridingData],
  );

  const [selectedTrainNo, setSelectedTrainNo] = useState<string | null>(
    restoredSession?.selectedTrainNo ?? null,
  );
  const [selectedTrainSnapshot, setSelectedTrainSnapshot] = useState<EnrichedTrain | null>(
    restoredSession?.selectedTrainSnapshot ?? null,
  );
  const [isTrainPickerExpanded, setIsTrainPickerExpanded] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(restoredSession?.currentIdx ?? 0);
  const [isSimulated, setIsSimulated] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(restoredSession?.alarmEnabled ?? true);
  const [alarmBefore, setAlarmBefore] = useState(restoredSession?.alarmBefore ?? 1);
  const [availableTrains, setAvailableTrains] = useState<EnrichedTrain[]>([]);
  const [loadingTrains, setLoadingTrains] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [trainPositionError, setTrainPositionError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  // 환승 전역 미리보기: 다음 노선 열차 + 미리 골라둔 열차.
  const [nextLineTrains, setNextLineTrains] = useState<EnrichedTrain[]>([]);
  const [pendingNextTrainNo, setPendingNextTrainNo] = useState<string | null>(null);

  const trainNoRef = useRef<string | null>(restoredSession?.selectedTrainNo ?? null);
  const alarmFiredRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fromStationDomRef = useRef<HTMLDivElement>(null);
  const didInitialScrollRef = useRef(false);
  // 표시 중인 ride segment 추적용. 첫 마운트(복원 직후)와 실제 segment 전환을 구분한다.
  const prevDisplayedRideIdxRef = useRef<number | null>(null);
  // 미리 골라둔 다음 열차. segment 리셋에도 살아남아 실제 환승 시 적용된다(상태는 UI용).
  const pendingNextTrainNoRef = useRef<string | null>(null);
  // 환승 전역 "환승역입니다" 알림을 환승당 1회만 울리기 위한 가드.
  const preTransferAlertedRef = useRef(false);

  const line = getLineInfo(ridingData?.lineId || "");
  const lineColor = line?.color || "#00A84D";
  const destinationIdx = stations.length - 1;
  const isCircularRide = isCircularLineId(ridingData?.lineId);

  // ===== 다음 환승 노선 (현재 ride가 환승으로 끝날 때) =====
  const nextRideIdx = useMemo(() => {
    if (!route || currentSegment?.type !== "ride") return -1;
    for (let i = currentSegmentIdx + 1; i < route.segments.length; i++) {
      if (route.segments[i].type === "ride") return i;
    }
    return -1;
  }, [route, currentSegment, currentSegmentIdx]);
  const nextRideSegment =
    nextRideIdx >= 0 && route?.segments[nextRideIdx]?.type === "ride"
      ? (route.segments[nextRideIdx] as RideSegmentData)
      : null;
  const upcomingTransferSegment = useMemo<TransferSegmentData | null>(() => {
    if (!route || currentSegment?.type !== "ride" || nextRideIdx < 0) return null;
    const segment = route.segments
      .slice(currentSegmentIdx + 1, nextRideIdx)
      .find(segment => segment.type === "transfer");
    return segment?.type === "transfer" ? segment : null;
  }, [currentSegment, currentSegmentIdx, nextRideIdx, route]);
  const activeTransferSegment =
    currentSegment?.type === "transfer" ? currentSegment : upcomingTransferSegment;
  const nextLineName = nextRideSegment?.lineName ?? null;
  // 막차가 끊긴 노선/방향에서는 열차를 고를 수 없게 한다.
  const nowForLastTrain = new Date();
  const isPastLastTrainForRide = ridingData
    ? isPastLastTrain(ridingData.lineId, ridingData.fromStationName, ridingData.toStationName, nowForLastTrain)
    : false;
  const isPastLastTrainForNext = nextRideSegment
    ? isPastLastTrain(nextRideSegment.lineId, nextRideSegment.fromStationName, nextRideSegment.toStationName, nowForLastTrain)
    : false;
  const nextOriented = useMemo<OrientedStations | null>(() => {
    if (nextRideIdx < 0 || !route) return null;
    const seg = route.segments[nextRideIdx];
    if (seg.type !== "ride") return null;
    return orientRideStations(seg.lineId, seg.fromStationName, seg.toStationName, seg.stationNames);
  }, [nextRideIdx, route]);

  // 환승 전역 윈도: 현재 ride가 환승으로 끝나고, 선택 열차가 종착(환승)역 직전 역에 도달.
  const inPreTransferWindow =
    currentSegment?.type === "ride" &&
    (ridingData?.isTransferAtEnd ?? false) &&
    nextRideIdx >= 0 &&
    !!selectedTrainNo &&
    destinationIdx > 0 &&
    currentIdx >= destinationIdx - 1 &&
    currentIdx < destinationIdx;
  const fastTransferLabel =
    (isTransferOverlay || inPreTransferWindow) && activeTransferSegment?.fastTransfer
      ? formatFastTransferInfo(activeTransferSegment.fastTransfer)
      : null;

  // 다음 노선에서 환승역(보딩역)에 아직 탈 수 있는 열차 (미리선택 후보, 최대 6대).
  const nextBoardable = useMemo<EnrichedTrain[]>(() => {
    if (!nextOriented || nextOriented.fromIdx < 0 || nextRideIdx < 0 || !route) return [];
    const seg = route.segments[nextRideIdx];
    if (seg.type !== "ride") return [];
    const boardIdx = nextOriented.fromIdx;
    const total = nextOriented.stations.length;
    const routeSet = new Set(seg.stationNames);
    const circ = isCircularLineId(seg.lineId);
    const candidates = nextLineTrains.filter(t => {
      if (isDeepInactiveTrain(t, routeSet, boardIdx, nextOriented.toIdx, total, circ)) return false;
      if (t.posIdxOriented < 0) return false;
      if (circ) {
        if (t.posIdxOriented === boardIdx) return t.trainStatus !== "2";
        return isBeforeBoardingStation(t, routeSet, boardIdx, nextOriented.toIdx, total, true);
      }
      if (t.posIdxOriented < boardIdx) return true;
      if (t.posIdxOriented === boardIdx) return t.trainStatus !== "2";
      return false;
    });
    const distance = (t: EnrichedTrain) =>
      circ ? getForwardDistance(t.posIdxOriented, boardIdx, total) : boardIdx - t.posIdxOriented;
    return candidates.sort((a, b) => distance(a) - distance(b)).slice(0, 6);
  }, [nextLineTrains, nextOriented, nextRideIdx, route]);

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
  const orientedLineStations = useMemo<OrientedStations>(() => {
    if (!ridingData) {
      return { stations: [], fromIdx: -1, toIdx: -1, expectedUpdnLine: null };
    }
    return orientRideStations(
      ridingData.lineId,
      ridingData.fromStationName,
      ridingData.toStationName,
      ridingData.stationNames,
    );
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

      const { stations: lineStationsOriented, expectedUpdnLine } = orientedLineStations;

      if (sim) {
        setIsSimulated(true);
        setTrainPositionError(
          errorCode === "SIMULATION_ENABLED"
            ? null
            : errorMessage ?? "열차 위치를 불러오지 못했습니다.",
        );
        // 이미 sim 열차가 있으면 유지 (sim advance timer가 움직임), 없으면 새로 생성
        setAvailableTrains(prev => {
          if (prev.length > 0 && prev.every(t => isSimTrainNo(t.trainNo))) return prev;
          return generateFakeTrains(lineStationsOriented, expectedUpdnLine ?? "1");
        });
        return errorCode ?? "SIMULATED";
      }
      setIsSimulated(false);

      // 방향 필터 (다층):
      //   0) 선택된 열차는 무조건 통과 (회차/destination 변경으로 필터에서
      //      빠지면 pin이 사라져 사용자가 deselect된 줄로 오해함)
      //   1) API updnLine이 있으면 우선 매칭한다. 1호선처럼 분기/종착이 많은
      //      노선에서 목적지 인덱스만 보면 반대 방향이 섞일 수 있다.
      //   2) sameDirection === true: destIdx > posIdx로 확정 → 통과
      //   3) sameDirection === null: 목적지가 라인 데이터 밖 → updnLine 매칭 신뢰.
      //   4) sameDirection === false: 반대 방향 → 제외
      const enriched = enrichTrains(positions, orientedLineStations);
      const filtered = filterSameDirectionTrains(enriched, orientedLineStations, trainNoRef.current);
      const selectedNo = trainNoRef.current;
      const selectedTrain = selectedNo
        ? filtered.find(train => train.trainNo === selectedNo) ?? null
        : null;
      const freshFiltered = filtered.filter(train => !train.isStale);
      const visibleFiltered = filtered.filter(
        train => !train.isStale || (selectedNo !== null && train.trainNo === selectedNo),
      );
      if (positions.length === 0) {
        setTrainPositionError("서울시 API 응답에 현재 열차 위치가 없습니다.");
      } else if (filtered.length === 0) {
        setTrainPositionError(
          `${ridingData.lineName} ${ridingData.direction} 열차를 찾지 못했습니다.`,
        );
      } else if (selectedTrain?.isStale) {
        setTrainPositionError(
          `${selectedTrain.trainNo}호 위치가 ${formatPositionAge(
            selectedTrain.receivedAtAgeSeconds,
          )} 전 수신된 값입니다. 새 위치를 기다리는 중입니다.`,
        );
      } else if (freshFiltered.length === 0) {
        const latestAge = filtered
          .map(train => train.receivedAtAgeSeconds)
          .filter((age): age is number => age !== undefined)
          .sort((a, b) => a - b)[0];
        setTrainPositionError(
          `서울시 위치 데이터가 ${formatPositionAge(latestAge)} 전 값입니다. 새 위치를 기다리는 중입니다.`,
        );
      } else {
        setTrainPositionError(null);
      }
      setAvailableTrains(dedupeTrainsByNo(visibleFiltered));
      return null;
    };

    void poll().then(() => {
      if (cancelled) return;
      interval = window.setInterval(poll, TRAIN_POSITION_POLL_MS);
    });
    return () => {
      cancelled = true;
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [ridingData, orientedLineStations, refreshTick, selectedTrainNo]);

  const refreshPositions = useCallback(() => setRefreshTick(t => t + 1), []);

  // ===== 환승 전역 윈도: 다음 노선 열차 위치 폴링 (미리선택용) =====
  useEffect(() => {
    if (!inPreTransferWindow || !nextOriented || nextRideIdx < 0 || !route) return;
    const seg = route.segments[nextRideIdx];
    if (seg.type !== "ride") return;
    let cancelled = false;
    let interval: number | undefined;
    const poll = async () => {
      const { positions, isSimulated: sim } = await getTrainPositions(seg.lineName);
      if (cancelled) return;
      if (sim) {
        setNextLineTrains(
          generateFakeTrains(nextOriented.stations, nextOriented.expectedUpdnLine ?? "1"),
        );
        return;
      }
      const enriched = enrichTrains(
        positions.filter(position => !position.isStale),
        nextOriented,
      );
      setNextLineTrains(dedupeTrainsByNo(filterSameDirectionTrains(enriched, nextOriented, null)));
    };
    void poll();
    interval = window.setInterval(poll, TRAIN_POSITION_POLL_MS);
    return () => {
      cancelled = true;
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [inPreTransferWindow, nextOriented, nextRideIdx, route]);

  // ===== 환승 전역 출발 시 "환승역입니다" 알림 (환승당 1회) =====
  useEffect(() => {
    if (!inPreTransferWindow || preTransferAlertedRef.current) return;
    const sel = availableTrains.find(t => t.trainNo === selectedTrainNo) ?? selectedTrainSnapshot;
    // 선택 열차가 환승 전역에서 출발("2")하는 순간 트리거.
    if (!sel || sel.trainStatus !== "2") return;
    preTransferAlertedRef.current = true;
    toast("환승역입니다", {
      description: nextLineName ? `${nextLineName}으로 갈아탈 준비를 하세요` : "갈아탈 준비를 하세요",
    });
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([120, 60, 120]);
    }
    setIsTrainPickerExpanded(true);
  }, [inPreTransferWindow, availableTrains, selectedTrainNo, selectedTrainSnapshot, nextLineName]);

  // ===== 선택한 열차의 위치/snapshot 추적 (실데이터·sim 통합) =====
  // availableTrains가 갱신될 때마다 selected의 stationName 기준으로 currentIdx 동기화.
  useEffect(() => {
    const selectedNo = trainNoRef.current;
    if (!selectedNo || !ridingData) return;
    const myTrain = availableTrains.find(t => t.trainNo === selectedNo);
    if (!myTrain) return;
    setSelectedTrainSnapshot(myTrain);
    const idx = ridingData.stationNames.indexOf(myTrain.stationName);
    if (idx >= 0) {
      setCurrentIdx(idx);
    } else if (
      myTrain.posIdxOriented >= 0 &&
      orientedLineStations.fromIdx >= 0 &&
      isBeforeBoardingStation(
        myTrain,
        routeStationSet,
        orientedLineStations.fromIdx,
        orientedLineStations.toIdx,
        orientedLineStations.stations.length,
        isCircularRide,
      )
    ) {
      setCurrentIdx(0);
    } else if (
      myTrain.posIdxOriented >= 0 &&
      orientedLineStations.toIdx >= 0 &&
      myTrain.posIdxOriented > orientedLineStations.toIdx
    ) {
      setCurrentIdx(destinationIdx);
    }
  }, [
    availableTrains,
    destinationIdx,
    isCircularRide,
    orientedLineStations,
    ridingData,
    routeStationSet,
  ]);

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
  // 첫 마운트에서는 복원된 선택을 지우면 안 되므로 실제 segment 전환일 때만 리셋한다.
  useEffect(() => {
    if (prevDisplayedRideIdxRef.current === null) {
      prevDisplayedRideIdxRef.current = displayedRideIdx;
      return;
    }
    if (prevDisplayedRideIdxRef.current === displayedRideIdx) return;
    prevDisplayedRideIdxRef.current = displayedRideIdx;
    setSelectedTrainNo(null);
    setSelectedTrainSnapshot(null);
    trainNoRef.current = null;
    setCurrentIdx(0);
    alarmFiredRef.current = false;
    didInitialScrollRef.current = false;
    setAvailableTrains([]);
    setHasFetched(false);
    setTrainPositionError(null);
    // 환승 전역 미리보기 상태 리셋 (다음 환승 알림은 다시 울려야 함).
    // pendingNextTrainNoRef는 carryover가 소비하므로 여기서 지우지 않는다.
    setNextLineTrains([]);
    setPendingNextTrainNo(null);
    preTransferAlertedRef.current = false;
  }, [displayedRideIdx]);

  // 환승 구간에 진입하면 하단 서랍을 자동으로 열어 다음 열차 선택 안내를 보여준다.
  useEffect(() => {
    if (!isTransferOverlay) return;
    setIsTrainPickerExpanded(true);
  }, [displayedRideIdx, isTransferOverlay]);

  // ===== 선택 상태 영속화: 설정/노선 등으로 이탈했다 돌아와도 유지 =====
  useEffect(() => {
    try {
      const routeRaw = sessionStorage.getItem("riding_route");
      if (!routeRaw) return;
      const state: RidingSessionState = {
        currentSegmentIdx,
        selectedTrainNo,
        selectedTrainSnapshot,
        currentIdx,
        alarmEnabled,
        alarmBefore,
      };
      sessionStorage.setItem(RIDING_SESSION_KEY, JSON.stringify({ routeRaw, state }));
    } catch {
      // sessionStorage 사용 불가 시 무시
    }
  }, [
    currentSegmentIdx,
    selectedTrainNo,
    selectedTrainSnapshot,
    currentIdx,
    alarmEnabled,
    alarmBefore,
  ]);

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

  // ===== Transfer 자동 진행 (실사용 보정 환승 시간 후) =====
  useEffect(() => {
    if (currentSegment?.type !== "transfer") return;
    if (isLastSegment) return; // 마지막 segment가 transfer일 일은 없지만 안전장치
    const seconds = getPracticalTransferSeconds({
      time: currentSegment.walkMinutes,
      transferSeconds: currentSegment.walkSeconds,
    });
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

    // 환승 전역에서 미리 골라둔 열차가 이 노선에 아직 있으면 그대로 적용 (자동선택보다 우선).
    const pending = pendingNextTrainNoRef.current;
    if (pending) {
      const match = availableTrains.find(t => t.trainNo === pending);
      if (match) {
        pendingNextTrainNoRef.current = null;
        trainNoRef.current = match.trainNo;
        setSelectedTrainNo(match.trainNo);
        setSelectedTrainSnapshot(match);
        setIsTrainPickerExpanded(true);
        return;
      }
    }

    // 보딩역에서 아직 탈 수 있는 열차만 후보로 삼는다.
    //   - 경로 이탈/목적지 통과 열차 제외 (기존 isDeepInactiveTrain)
    //   - 보딩역 이전 역(posIdx < boardIdx): 다가오는 중 → 탑승 가능
    //   - 보딩역에 있고 아직 출발 전(trainStatus !== "2"): 탑승 가능
    //   - 보딩역을 지났거나(posIdx > boardIdx) 보딩역에서 이미 출발("2"): 제외
    const boardable = availableTrains.filter(train => {
      if (
        isDeepInactiveTrain(
          train,
          routeStationSet,
          boardIdx,
          orientedLineStations.toIdx,
          orientedLineStations.stations.length,
          isCircularRide,
        )
      ) {
        return false;
      }
      if (train.posIdxOriented < 0) return false;
      if (isCircularRide) {
        if (train.posIdxOriented === boardIdx) return train.trainStatus !== "2";
        return isBeforeBoardingStation(
          train,
          routeStationSet,
          boardIdx,
          orientedLineStations.toIdx,
          orientedLineStations.stations.length,
          true,
        );
      }
      if (train.posIdxOriented < boardIdx) return true;
      if (train.posIdxOriented === boardIdx) return train.trainStatus !== "2";
      return false;
    });
    // 탈 수 있는 열차가 없으면 자동선택하지 않는다.
    // selectedTrainNo가 계속 null이라 다음 폴링에서 다가오는 열차를 잡는다.
    if (boardable.length === 0) return;

    // 보딩역에 가장 빨리 도착할 열차 = 보딩역에 가장 가까운(거리가 작은) 열차
    const best = boardable.reduce((soonest, train) => {
      const trainDistance = isCircularRide
        ? getForwardDistance(train.posIdxOriented, boardIdx, orientedLineStations.stations.length)
        : boardIdx - train.posIdxOriented;
      const soonestDistance = isCircularRide
        ? getForwardDistance(soonest.posIdxOriented, boardIdx, orientedLineStations.stations.length)
        : boardIdx - soonest.posIdxOriented;
      return trainDistance < soonestDistance ? train : soonest;
    });

    trainNoRef.current = best.trainNo;
    setSelectedTrainNo(best.trainNo);
    setSelectedTrainSnapshot(best);
    setIsTrainPickerExpanded(true);
    alarmFiredRef.current = false;
  }, [
    isTransferOverlay,
    availableTrains,
    isCircularRide,
    orientedLineStations.fromIdx,
    orientedLineStations.toIdx,
    orientedLineStations.stations.length,
    routeStationSet,
    selectedTrainNo,
  ]);

  const onSelectTrain = (train: EnrichedTrain) => {
    if (!ridingData) return;
    if (isPastLastTrainForRide) {
      toast("이미 막차가 끊겨 열차를 고를 수 없습니다.");
      return;
    }
    trainNoRef.current = train.trainNo;
    setSelectedTrainNo(train.trainNo);
    setSelectedTrainSnapshot(train);
    const idxInRoute = ridingData.stationNames.indexOf(train.stationName);
    if (idxInRoute >= 0) {
      setCurrentIdx(idxInRoute);
    } else if (
      isBeforeBoardingStation(
        train,
        routeStationSet,
        fromIdx,
        toIdx,
        lineStationsOriented.length,
        isCircularRide,
      )
    ) {
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

  // 환승 전역에서 다음 노선 열차를 미리 골라둔다. 실제 환승 시 carryover가 적용.
  const onPreSelectNextTrain = (trainNo: string) => {
    if (isPastLastTrainForNext) {
      toast("환승할 노선의 막차가 끊겨 열차를 고를 수 없습니다.");
      return;
    }
    const next = pendingNextTrainNo === trainNo ? null : trainNo;
    setPendingNextTrainNo(next);
    pendingNextTrainNoRef.current = next;
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
  // 선택한 열차가 급행/특급이면 현재 경로에서 통과(무정차)하는 역을 안내한다.
  // skipped === null: 해당 노선에 정차패턴이 여럿이라 통과역을 단정할 수 없는 경우(배지만 표시).
  const expressSkipInfo = useMemo(() => {
    const type = selectedTrainPos?.trainType;
    if (!ridingData || (type !== "급행" && type !== "특급")) return null;
    const stopNames = getExpressStopNames(ridingData.lineId, type);
    if (!stopNames) return { type, skipped: null as string[] | null };
    const names = stations.map(s => s.name);
    const stopIdxs = names.map((n, i) => (stopNames.has(n) ? i : -1)).filter(i => i >= 0);
    if (stopIdxs.length < 2) return { type, skipped: null };
    const skipped = names
      .slice(stopIdxs[0], stopIdxs[stopIdxs.length - 1] + 1)
      .filter(n => !stopNames.has(n));
    return { type, skipped };
  }, [selectedTrainPos?.trainType, ridingData, stations]);

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
  const markerSourceIdx =
    selectedTrainPos?.posIdxOriented ??
    (fromIdx >= 0 && currentIdx >= 0 ? fromIdx + currentIdx : -1);
  const trainRailMarkerPercent =
    fromIdx >= 0 && toIdx > fromIdx && markerSourceIdx >= 0
      ? Math.max(0, Math.min(100, ((markerSourceIdx - fromIdx) / (toIdx - fromIdx)) * 100))
      : 0;
  const showTrainRailMarker =
    !isTransferOverlay && isTracking && fromIdx >= 0 && toIdx > fromIdx;

  const rideSegmentProgressJsx = (
    <div className="px-7 py-2.5">
      <div className="relative flex h-11 flex-1 items-center gap-2">
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
              className="btn-press flex h-full min-w-0 flex-1 items-center"
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
                {isTransferOverlay && i === currentRideIdx && (
                  <span
                    data-transfer-wait-marker="true"
                    className="pointer-events-none absolute left-0 top-1/2 z-20 h-7 w-7 -translate-x-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  >
                    <motion.span
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: `${segmentColor}33` }}
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
                      style={{ backgroundColor: segmentColor }}
                    />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const sheetDetailsJsx = showTrainSelectionGuidance ? (
    <div className="px-4 pb-2 pt-3">
      <h2 className="truncate px-1 text-[20px] font-bold leading-tight text-[#1B2838]">
        열차를 고르세요
      </h2>
      {isPastLastTrainForRide && (
        <div className="mt-2 rounded-xl border border-[#F3D6D6] bg-[#FDF1F1] px-3 py-2">
          <p className="text-[11px] font-bold text-[#C0392B]">막차 종료</p>
          <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-[#6E6E73]">
            이 방향 막차가 이미 끊겨 열차를 고를 수 없습니다.
          </p>
        </div>
      )}
      {hasFetched && trainPositionError && (
        <div className="mt-2 rounded-xl border border-[#F0E4D0] bg-[#FFF8EF] px-3 py-2">
          <p className="text-[11px] font-bold text-[#C97A1B]">실시간 위치 확인 필요</p>
          <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-[#6E6E73]">
            {trainPositionError}
          </p>
        </div>
      )}
      {fastTransferLabel && (
        <p className="mt-1 flex items-center gap-1 px-1 text-[12px] font-semibold text-[#E67E22]">
          <Train size={13} />
          빠른 환승 {fastTransferLabel}
        </p>
      )}
    </div>
  ) : null;

  // 환승 전역 미리선택 패널: 현재 열차 추적은 그대로 두고, 다음 노선 열차를 미리 고른다.
  const nextLineColor = nextRideSegment
    ? getLineInfo(nextRideSegment.lineId)?.color ?? "#1B2838"
    : "#1B2838";
  const preTransferPanelJsx = inPreTransferWindow ? (
    <div className="border-b border-[#F0E4D0] bg-[#FFF8EF] px-4 pb-3 pt-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="line-badge shrink-0 text-[10px]" style={{ backgroundColor: nextLineColor }}>
          {getLineInfo(nextRideSegment?.lineId ?? "")?.shortName ?? ""}
        </span>
        <span className="text-[13px] font-bold text-[#1B2838]">
          곧 {nextRideSegment?.fromStationName} 환승 · 탈 열차 미리 선택
        </span>
      </div>
      {fastTransferLabel && (
        <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1.5 text-[12px] font-semibold text-[#E67E22]">
          <Train size={13} />
          <span>빠른 환승 {fastTransferLabel}</span>
        </div>
      )}
      {isPastLastTrainForNext ? (
        <p className="px-1 text-[12px] font-semibold text-[#C0392B]">막차가 끊겨 열차를 고를 수 없습니다.</p>
      ) : nextBoardable.length === 0 ? (
        <p className="px-1 text-[12px] text-[#8E8E93]">다음 노선 열차 위치를 확인하는 중…</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {nextBoardable.map(train => {
            const selected = pendingNextTrainNo === train.trainNo;
            return (
              <button
                key={train.trainNo}
                type="button"
                onClick={() => onPreSelectNextTrain(train.trainNo)}
                aria-pressed={selected}
                className="btn-press flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-bold"
                style={{
                  backgroundColor: selected ? nextLineColor : "white",
                  color: selected ? "white" : "#1B2838",
                  border: `1.5px solid ${nextLineColor}`,
                }}
              >
                <Train size={12} style={{ color: selected ? "white" : nextLineColor }} />
                <span className="whitespace-nowrap">{train.trainNo}</span>
                <span className="whitespace-nowrap text-[10px] font-semibold opacity-80">
                  {train.stationName}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {pendingNextTrainNo && (
        <p className="mt-1.5 px-1 text-[11px] font-semibold" style={{ color: nextLineColor }}>
          {pendingNextTrainNo}호 미리 선택됨 · 환승하면 자동 적용됩니다
        </p>
      )}
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
                {/* Train lane: 같은 역에 겹쳐도 세로로 쌓지 않고 한 줄(가로)로 표시 */}
                <div
                  className="w-full flex flex-row items-center justify-center gap-1 mb-1.5"
                  style={{ minHeight: "45px" }}
                >
                  {trainsHere.slice(0, 2).map(train => {
                    const isSelected = train.trainNo === selectedTrainNo;
                    const inactiveLevel: TrainInactiveLevel = isSelected
                      ? "none"
                      : isDeepInactiveTrain(
                          train,
                          routeStationSet,
                          fromIdx,
                          toIdx,
                          lineStationsOriented.length,
                          isCircularRide,
                        )
                      ? "deep"
                      : selectedTrainNo !== null
                      ? "soft"
                      : "none";

                    return (
                      <CompactTrainPin
                        key={train.trainNo}
                        train={train}
                        lineColor={lineColor}
                        isSelected={isSelected}
                        inactiveLevel={inactiveLevel}
                        onSelect={() => onSelectTrain(train)}
                        stationWidth={STATION_WIDTH}
                      />
                    );
                  })}
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
                {trainPositionError
                  ? "실시간 위치 확인 필요"
                  : `${ridingData.direction} · ${availableTrains.length}대`}
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
            {hasFetched && trainPositionError && (
              <div className="mt-4 rounded-2xl border border-[#F0E4D0] bg-[#FFF8EF] px-4 py-3 text-left">
                <p className="text-[12px] font-bold text-[#C97A1B]">
                  실시간 위치 확인 필요
                </p>
                <p className="mt-1 text-[13px] font-medium leading-relaxed text-[#6E6E73]">
                  {trainPositionError}
                </p>
              </div>
            )}
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
                className="space-card p-5"
              >
                <Starfield
                  speed={selectedTrainPos?.trainStatus === "1" ? 0.12 : 0.55}
                  shootingStars
                />
                <div className="relative z-10">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[#9FC2FF]" />
                      <span className="text-[12px] font-semibold text-[#9AA3C0]">
                        {ridingData.fromStationName}역까지
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {expressSkipInfo && (
                        <span
                          className="rounded-md px-2 py-1 text-[10px] font-bold text-white"
                          style={{ backgroundColor: lineColor }}
                        >
                          {expressSkipInfo.type}
                        </span>
                      )}
                      <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold text-[#9FC2FF]">
                        {selectedTrainNo}호
                      </span>
                    </div>
                  </div>

                  {expressSkipInfo && expressSkipInfo.skipped && expressSkipInfo.skipped.length > 0 && (
                    <p className="mb-3 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-[#FFD9A8]">
                      이 {expressSkipInfo.type}은 {expressSkipInfo.skipped.join(" · ")} 역을 통과합니다
                    </p>
                  )}

                  <motion.div
                    key={etaMinutes}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-baseline gap-2"
                  >
                    <span className="text-[13px] font-semibold text-[#E9EEF8]">약</span>
                    <span
                      className="font-bold leading-none tracking-tight text-white"
                      style={{ fontSize: "64px", textShadow: `0 0 28px ${lineColor}` }}
                    >
                      {etaMinutes}
                    </span>
                    <span className="text-[20px] font-bold text-[#E9EEF8]">분 후 도착</span>
                  </motion.div>

                  <div className="mt-3 flex items-center gap-2 text-[13px] text-[#9AA3C0]">
                    <span className="font-semibold text-[#E9EEF8]">
                      {selectedTrainPos?.stationName}
                    </span>
                    <span>·</span>
                    <span>
                      {stationsUntilBoard === 1
                        ? `${ridingData.fromStationName}역 곧 도착`
                        : `${ridingData.fromStationName}역까지 ${stationsUntilBoard}정거장 전`}
                    </span>
                    {selectedTrainPos?.trainStatus === "1" && (
                      <span className="text-[10px] bg-white/10 text-[#7BE3A3] px-1.5 py-0.5 rounded font-semibold ml-1">
                        정차 중
                      </span>
                    )}
                    {selectedTrainPos?.trainStatus === "0" && (
                      <span className="text-[10px] bg-white/10 text-[#7BE3A3] px-1.5 py-0.5 rounded font-semibold ml-1">
                        역 진입
                      </span>
                    )}
                    {selectedTrainPos?.trainStatus === "2" && (
                      <span className="text-[10px] bg-white/10 text-[#FFC08A] px-1.5 py-0.5 rounded font-semibold ml-1">
                        출발 직후
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-[11px] text-[#9AA3C0]">
                    → {ridingData.toStationName}{ridingData.isTransferAtEnd ? " (환승)" : " (하차)"}
                  </p>
                </div>
              </motion.div>
            </div>
          ) : (
            <>
              {/* === 탑승 중: 우주 항해 카드 === */}
              <div className="px-4 pt-4">
                <div className="space-card p-5">
                  <Starfield
                    speed={
                      remaining === 0
                        ? 0.04
                        : selectedTrainPos?.trainStatus === "1"
                          ? 0.12
                          : 0.9
                    }
                    shootingStars
                  />
                  <div className="relative z-10">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-[12px] font-semibold text-[#9AA3C0]">현재 위치</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold text-[#9FC2FF]">
                          {selectedTrainNo}{isSimulated ? "" : "호"}
                        </span>
                        {isSimulated && (
                          <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold text-[#FFD9A8]">
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
                        className="truncate text-[34px] font-bold leading-tight tracking-tight text-white"
                        style={{ textShadow: `0 0 24px ${lineColor}` }}
                      >
                        {currentStation?.name}
                      </h1>
                      {currentIdx < destinationIdx && (
                        <p className="mt-1 truncate text-[13px] font-medium text-[#9AA3C0]">
                          → {stations[currentIdx + 1]?.name} 방면 이동 중
                        </p>
                      )}
                    </motion.div>

                    <VoyageTrack
                      progress={destinationIdx > 0 ? currentIdx / destinationIdx : 1}
                      stationCount={destinationIdx + 1}
                      currentIndex={currentIdx}
                      remaining={remaining}
                      lineColor={lineColor}
                      moving={remaining > 0 && selectedTrainPos?.trainStatus !== "1"}
                    />

                    {/* 착륙(하차)/도킹(환승) 연출 — 도착 순간에만 떠오른다 */}
                    <AnimatePresence>
                      {remaining === 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 160, damping: 18 }}
                          className="mb-4 flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5"
                        >
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <motion.span
                              className="absolute inset-0 rounded-full"
                              style={{ backgroundColor: lineColor }}
                              animate={{ scale: [1, 2.6], opacity: [0.8, 0] }}
                              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                            />
                            <span
                              className="relative h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: lineColor }}
                            />
                          </span>
                          <p className="min-w-0 truncate text-[13px] font-bold text-white">
                            {arriveLabel === "환승"
                              ? `${currentStation?.name} 도킹 — 환승 정거장입니다`
                              : `${currentStation?.name} 착륙 — 항해 완료`}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-4">
                      <div className="pr-3">
                        <p className="text-[10px] font-semibold text-[#9AA3C0]">남은 역</p>
                        <p className="mt-1 text-[21px] font-bold leading-none text-white">
                          {remaining}<span className="text-[13px]">개</span>
                        </p>
                      </div>
                      <div className="px-3">
                        <p className="text-[10px] font-semibold text-[#9AA3C0]">남은 시간</p>
                        <p className="mt-1 text-[21px] font-bold leading-none text-white">
                          {remainingTime}<span className="text-[13px]">분</span>
                        </p>
                      </div>
                      <div className="min-w-0 pl-3">
                        <p className="text-[10px] font-semibold text-[#9AA3C0]">도착 예정</p>
                        <p className="mt-1 truncate text-[19px] font-bold leading-none text-white">
                          {arrivalTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </p>
                      </div>
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
                const isPassedStop = idx < currentIdx;
                const isUpcomingStop = idx > currentIdx;
                const minutesAway = (idx - currentIdx) * 2;

                return (
                  <motion.div
                    key={`${station.name}-${idx}`}
                    animate={isCurrent ? { backgroundColor: "rgba(248,250,252,1)" } : { backgroundColor: "rgba(255,255,255,1)" }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className={`flex min-h-11 items-center border-b border-[#F2F2F5] px-3 py-1.5 last:border-0 ${
                      isPassedStop ? "opacity-35" : isUpcomingStop ? "opacity-[0.64]" : ""
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
                        } ${isPassedStop ? "text-[#8E8E93]" : "text-[#1B2838]"}`}
                      >
                        {station.name}
                      </span>
                      {station.isTransfer && station.transferLines.length > 0 && !isPassedStop && (
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
            {preTransferPanelJsx}
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
  inactiveLevel,
  onSelect,
  stationWidth,
}: {
  train: EnrichedTrain;
  lineColor: string;
  isSelected: boolean;
  inactiveLevel: "none" | "soft" | "deep";
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
  const isSoftInactive = inactiveLevel === "soft";
  const isDeepInactive = inactiveLevel === "deep";
  const isInactive = inactiveLevel !== "none";

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0, x: transitOffsetPx }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      onClick={isDeepInactive ? undefined : onSelect}
      aria-pressed={isSelected}
      aria-disabled={isDeepInactive}
      className={`relative flex items-center ${
        isDeepInactive ? "cursor-not-allowed" : "btn-press"
      } ${isSelected ? "z-20" : "z-0"}`}
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
        className="flex items-center gap-1 px-1.5 py-1 rounded-full transition-[background-color,opacity,filter] duration-200"
        style={{
          backgroundColor: isDeepInactive ? "#C7C7CC" : lineColor,
          color: "white",
          opacity: isDeepInactive ? 0.46 : isSoftInactive ? 0.38 : 1,
          filter: isDeepInactive ? "saturate(0.45)" : isSoftInactive ? "saturate(0.7)" : undefined,
          boxShadow: isSelected
            ? `0 0 0 2px white, 0 0 0 4px ${lineColor}`
            : pulsing && !isInactive
            ? `0 0 0 2px ${lineColor}33`
            : undefined,
        }}
      >
        <Train size={12} className="text-white shrink-0" />
        {(train.trainType === "급행" || train.trainType === "특급") && (
          <span
            className="rounded-[3px] bg-white px-1 text-[9px] font-extrabold leading-tight whitespace-nowrap"
            style={{ color: lineColor }}
          >
            {train.trainType}
          </span>
        )}
        {isSelected && (
          <span className="text-[12px] font-bold leading-none whitespace-nowrap">
            {train.trainNo}
          </span>
        )}
      </div>
    </motion.button>
  );
}
