/**
 * 공식 서울 지하철 노선도 기반 인터랙티브 지도.
 * - 배경은 원본 PDF에서 추출한 공식 PNG를 그대로 사용한다.
 * - 클릭 영역은 같은 PNG 픽셀 좌표계의 역 마커 위에 투명하게 얹는다.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ForwardedRef, MouseEvent, PointerEvent, TouchEvent, WheelEvent } from "react";
import {
  Briefcase,
  Check,
  CircleDot,
  Flag,
  GraduationCap,
  House,
  Info,
  Maximize2,
  Plus,
  Star,
  Train,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import metroData from "@shared/metro/data/metroData.json";
import officialMapCoords from "@shared/metro/data/officialMapCoords.json";
import { getRealtimeArrivals } from "@/lib/realtimeApi";
import type { ArrivalInfo } from "@/lib/realtimeApi";
import type { Station } from "@/lib/pathfinder";
import {
  getStationFavoriteMap,
  removeStationFavorite,
  setStationFavorite,
  STATION_FAVORITE_KINDS,
  type StationFavoriteKind,
  type StationFavoriteMap,
} from "@/lib/stationFavorites";

interface OfficialMapCoords {
  metadata: {
    image: string;
    width: number;
    height: number;
  };
  stations: Record<string, { x: number; y: number }>;
}

interface MapStation {
  id: string;
  name: string;
  lineId: string;
  x: number;
  y: number;
  transfers: string[];
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type StationRole = "from" | "to" | "via";

const officialMap = officialMapCoords as OfficialMapCoords;
const MAP_WIDTH = officialMap.metadata.width;
const MAP_HEIGHT = officialMap.metadata.height;
const MAP_IMAGE = officialMap.metadata.image;
const MAP_BOUNDS: ViewBox = { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT };
// 처음에는 3배 확대된 상태로 시작 (역명이 잘 보이게)
const INITIAL_VIEW_BOX: ViewBox = {
  x: MAP_WIDTH / 2 - MAP_WIDTH / 6,
  y: MAP_HEIGHT / 2 - MAP_HEIGHT / 6,
  w: MAP_WIDTH / 3,
  h: MAP_HEIGHT / 3,
};
// "전체 보기" 버튼이 가는 자리 (실제 전체 노선도)
const FULL_VIEW_BOX: ViewBox = { ...MAP_BOUNDS };
const MIN_VIEWBOX_SIZE = 320;
// 줌 배율: 작을수록 한 번에 많이 확대됨
const ZOOM_IN_FACTOR = 0.55;
const ZOOM_OUT_FACTOR = 1.8;
const WHEEL_ZOOM_IN_FACTOR = 0.7;
const WHEEL_ZOOM_OUT_FACTOR = 1.4;
const STATION_ROLE_OPTIONS = [
  { role: "from" as const, label: "출발지로", Icon: CircleDot, color: "#4A90D9" },
  { role: "via" as const, label: "경유지로", Icon: Plus, color: "#27AE60" },
  { role: "to" as const, label: "도착지로", Icon: Flag, color: "#E74C3C" },
];

const STATION_FAVORITE_ICON_MAP = {
  home: House,
  work: Briefcase,
  school: GraduationCap,
} satisfies Record<StationFavoriteKind, typeof House>;

const STATION_FAVORITE_COLOR_MAP = {
  home: "#4A90D9",
  work: "#7C5CFF",
  school: "#27AE60",
} satisfies Record<StationFavoriteKind, string>;

const ROLE_COLOR_MAP: Record<StationRole, string> = {
  from: "#4A90D9",
  via: "#27AE60",
  to: "#E74C3C",
};

const ROLE_LABEL_MAP: Record<StationRole, string> = {
  from: "출발",
  via: "경유",
  to: "도착",
};

export interface MapSelections {
  from?: string;
  via?: string;
  to?: string;
}

export interface MetroMapHandle {
  focusStation: (stationName: string, options?: { openMenu?: boolean }) => boolean;
}

function clampViewBox(box: ViewBox): ViewBox {
  const w = Math.max(MIN_VIEWBOX_SIZE, Math.min(MAP_BOUNDS.w, box.w));
  const h = Math.max(MIN_VIEWBOX_SIZE, Math.min(MAP_BOUNDS.h, box.h));
  const paddingX = w * 0.08;
  const paddingY = h * 0.08;
  const minX = MAP_BOUNDS.x - paddingX;
  const minY = MAP_BOUNDS.y - paddingY;
  const maxX = MAP_BOUNDS.x + MAP_BOUNDS.w - w + paddingX;
  const maxY = MAP_BOUNDS.y + MAP_BOUNDS.h - h + paddingY;

  return {
    x: Math.min(Math.max(box.x, minX), maxX),
    y: Math.min(Math.max(box.y, minY), maxY),
    w,
    h,
  };
}

function getRenderedViewport(rect: DOMRect, viewBox: ViewBox) {
  const scale = Math.min(rect.width / viewBox.w, rect.height / viewBox.h);
  const renderedW = viewBox.w * scale;
  const renderedH = viewBox.h * scale;

  return {
    renderedW,
    renderedH,
    offsetX: (rect.width - renderedW) / 2,
    offsetY: (rect.height - renderedH) / 2,
  };
}

function MetroMap({
  onStationSelect,
  onStationRoleSelect,
  selectedLines,
  highlightedStation,
  selections,
}: {
  onStationSelect?: (name: string) => void;
  onStationRoleSelect?: (name: string, role: StationRole) => void;
  selectedLines?: string[];
  highlightedStation?: string;
  selections?: MapSelections;
}, ref: ForwardedRef<MetroMapHandle>) {
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [viewBox, setViewBox] = useState<ViewBox>(INITIAL_VIEW_BOX);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [stationMenu, setStationMenu] = useState<MapStation | null>(null);
  const [menuArrivals, setMenuArrivals] = useState<ArrivalInfo[]>([]);
  const [menuArrivalsLoading, setMenuArrivalsLoading] = useState(false);
  const [showStationFavoritePicker, setShowStationFavoritePicker] = useState(false);
  const [stationFavoriteMap, setStationFavoriteMap] = useState<StationFavoriteMap>(() =>
    getStationFavoriteMap(),
  );

  const lastTouchDist = useRef<number | null>(null);
  const hasDragged = useRef(false);

  // 현재 역의 selection 역할 조회
  const getStationRole = useCallback(
    (name: string): StationRole | null => {
      if (!selections) return null;
      if (selections.from === name) return "from";
      if (selections.via === name) return "via";
      if (selections.to === name) return "to";
      return null;
    },
    [selections],
  );

  const stations: MapStation[] = useMemo(() => {
    const coordsById = officialMap.stations;

    return (metroData.stations as Station[])
      .filter(station => {
        if (selectedLines && selectedLines.length > 0) {
          return selectedLines.includes(station.lineId);
        }
        return true;
      })
      .map(station => {
        const coords = coordsById[station.id];
        if (!coords) return null;

        return {
          id: station.id,
          name: station.name,
          lineId: station.lineId,
          x: coords.x,
          y: coords.y,
          transfers: station.transfers,
        };
      })
      .filter((station): station is MapStation => Boolean(station));
  }, [selectedLines]);

  const uniqueStations = useMemo(() => {
    const seen = new Map<string, MapStation>();

    for (const station of stations) {
      const existing = seen.get(station.name);
      if (!existing || station.transfers.length > existing.transfers.length) {
        seen.set(station.name, station);
      }
    }

    return Array.from(seen.values());
  }, [stations]);

  const focusStationOnMap = useCallback((station: MapStation, openMenu = false) => {
    const nextSize = 620;
    setSelectedStation(station.name);
    setHoveredStation(null);
    setViewBox(clampViewBox({
      x: station.x - nextSize / 2,
      y: station.y - nextSize / 2,
      w: nextSize,
      h: nextSize,
    }));
    setStationMenu(openMenu ? station : null);
    if (!openMenu) setShowStationFavoritePicker(false);
  }, []);

  useImperativeHandle(ref, () => ({
    focusStation: (stationName, options) => {
      const station = uniqueStations.find(item => item.name === stationName);
      if (!station) return false;
      focusStationOnMap(station, options?.openMenu ?? false);
      return true;
    },
  }), [focusStationOnMap, uniqueStations]);

  useEffect(() => {
    if (!highlightedStation) return;
    const station = uniqueStations.find(item => item.name === highlightedStation);
    if (!station) return;

    focusStationOnMap(station);
  }, [focusStationOnMap, highlightedStation, uniqueStations]);

  const refreshStationFavorites = useCallback(() => {
    setStationFavoriteMap(getStationFavoriteMap());
  }, []);

  useEffect(() => {
    refreshStationFavorites();
    window.addEventListener("storage", refreshStationFavorites);
    window.addEventListener("metro:station-favorites-changed", refreshStationFavorites);
    return () => {
      window.removeEventListener("storage", refreshStationFavorites);
      window.removeEventListener("metro:station-favorites-changed", refreshStationFavorites);
    };
  }, [refreshStationFavorites]);

  useEffect(() => {
    if (!stationMenu) {
      setShowStationFavoritePicker(false);
    }
  }, [stationMenu]);

  useEffect(() => {
    if (!stationMenu) return;
    const frame = requestAnimationFrame(() => menuRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [stationMenu]);

  // 메뉴 열릴 때 실시간 도착정보 조회 (방향별로 최대 2개씩)
  useEffect(() => {
    if (!stationMenu) {
      setMenuArrivals([]);
      return;
    }
    let cancelled = false;
    setMenuArrivalsLoading(true);
    getRealtimeArrivals(stationMenu.name)
      .then(data => {
        if (cancelled) return;
        // 방향별로 그룹핑 후 각 방향 최대 2개
        const byDir = new Map<string, ArrivalInfo[]>();
        data.forEach(a => {
          const key = a.direction || "—";
          const list = byDir.get(key) ?? [];
          if (list.length < 2) list.push(a);
          byDir.set(key, list);
        });
        const flat: ArrivalInfo[] = [];
        byDir.forEach(list => flat.push(...list));
        setMenuArrivals(flat.slice(0, 4));
      })
      .finally(() => {
        if (!cancelled) setMenuArrivalsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stationMenu]);

  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const rendered = getRenderedViewport(rect, viewBox);
    const xRatio = rendered.renderedW > 0
      ? (clientX - rect.left - rendered.offsetX) / rendered.renderedW
      : 0;
    const yRatio = rendered.renderedH > 0
      ? (clientY - rect.top - rendered.offsetY) / rendered.renderedH
      : 0;

    return {
      x: viewBox.x + xRatio * viewBox.w,
      y: viewBox.y + yRatio * viewBox.h,
    };
  }, [viewBox]);

  const svgToContainerPoint = useCallback((point: { x: number; y: number }) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const rendered = getRenderedViewport(rect, viewBox);

    return {
      x: rendered.offsetX + ((point.x - viewBox.x) / viewBox.w) * rendered.renderedW,
      y: rendered.offsetY + ((point.y - viewBox.y) / viewBox.h) * rendered.renderedH,
      containerWidth: rect.width,
      containerHeight: rect.height,
    };
  }, [viewBox]);

  const stationMenuPosition = useMemo(() => {
    if (!stationMenu) return null;
    const point = svgToContainerPoint(stationMenu);
    if (!point) return null;

    const halfWidth = 120; // w-60 카드의 반
    const estimatedHeight = showStationFavoritePicker ? 366 : 298;
    const edgeGap = 10;
    const minLeft = Math.min(halfWidth + edgeGap, point.containerWidth / 2);
    const maxLeft = Math.max(minLeft, point.containerWidth - halfWidth - edgeGap);
    const left = Math.min(Math.max(point.x, minLeft), maxLeft);
    const hasRoomAbove = point.y - 14 - estimatedHeight >= edgeGap;
    const hasRoomBelow = point.y + 14 + estimatedHeight <= point.containerHeight - edgeGap;
    const placeAbove = hasRoomAbove || (!hasRoomBelow && point.y > point.containerHeight / 2);
    const top = placeAbove
      ? Math.min(point.containerHeight - edgeGap, Math.max(edgeGap + estimatedHeight, point.y - 14))
      : Math.max(edgeGap, Math.min(point.containerHeight - edgeGap - estimatedHeight, point.y + 14));

    return {
      left,
      top,
      transform: placeAbove ? "translate(-50%, -100%)" : "translate(-50%, 0)",
    };
  }, [showStationFavoritePicker, stationMenu, svgToContainerPoint]);

  const zoomAt = useCallback((factor: number, center?: { x: number; y: number }) => {
    setViewBox(prev => {
      const focus = center || { x: prev.x + prev.w / 2, y: prev.y + prev.h / 2 };
      const nextW = prev.w * factor;
      const nextH = prev.h * factor;
      const nextX = focus.x - (focus.x - prev.x) * (nextW / prev.w);
      const nextY = focus.y - (focus.y - prev.y) * (nextH / prev.h);
      return clampViewBox({ x: nextX, y: nextY, w: nextW, h: nextH });
    });
  }, []);

  const findNearestStation = useCallback((point: { x: number; y: number }) => {
    const maxDistance = Math.max(28, Math.min(86, viewBox.w * 0.034));
    let nearest: { station: MapStation; distance: number } | null = null;

    for (const station of uniqueStations) {
      const distance = Math.hypot(station.x - point.x, station.y - point.y);
      if (distance <= maxDistance && (!nearest || distance < nearest.distance)) {
        nearest = { station, distance };
      }
    }

    return nearest?.station || null;
  }, [uniqueStations, viewBox.w]);

  const panByScreenDelta = useCallback((dx: number, dy: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rendered = getRenderedViewport(rect, viewBox);
    const renderedW = rendered.renderedW || rect.width || 1;
    const renderedH = rendered.renderedH || rect.height || 1;

    setViewBox(prev => clampViewBox({
      ...prev,
      x: prev.x - dx * (prev.w / renderedW),
      y: prev.y - dy * (prev.h / renderedH),
    }));
  }, [viewBox]);

  const handlePointerDown = useCallback((event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "touch") return;
    hasDragged.current = false;
    setIsDragging(true);
    setStationMenu(null);
    setDragStart({ x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "touch") return;
    if (!isDragging) {
      const station = findNearestStation(screenToSvg(event.clientX, event.clientY));
      setHoveredStation(station?.name || null);
      return;
    }
    if (Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 2) {
      hasDragged.current = true;
      setStationMenu(null);
    }
    panByScreenDelta(event.clientX - dragStart.x, event.clientY - dragStart.y);
    setDragStart({ x: event.clientX, y: event.clientY });
  }, [dragStart, findNearestStation, isDragging, panByScreenDelta, screenToSvg]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    setStationMenu(null);
    zoomAt(event.deltaY > 0 ? WHEEL_ZOOM_OUT_FACTOR : WHEEL_ZOOM_IN_FACTOR, screenToSvg(event.clientX, event.clientY));
  }, [screenToSvg, zoomAt]);

  const handleTouchStart = useCallback((event: TouchEvent<SVGSVGElement>) => {
    hasDragged.current = false;
    setStationMenu(null);
    if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (event.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    }
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent<SVGSVGElement>) => {
    if (event.touches.length === 2 && lastTouchDist.current !== null) {
      hasDragged.current = true;
      setStationMenu(null);
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const center = {
        x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
        y: (event.touches[0].clientY + event.touches[1].clientY) / 2,
      };

      zoomAt(lastTouchDist.current / dist, screenToSvg(center.x, center.y));
      lastTouchDist.current = dist;
    } else if (event.touches.length === 1 && isDragging) {
      if (Math.hypot(event.touches[0].clientX - dragStart.x, event.touches[0].clientY - dragStart.y) > 2) {
        hasDragged.current = true;
        setStationMenu(null);
      }
      panByScreenDelta(
        event.touches[0].clientX - dragStart.x,
        event.touches[0].clientY - dragStart.y,
      );
      setDragStart({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    }
  }, [dragStart, isDragging, panByScreenDelta, screenToSvg, zoomAt]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchDist.current = null;
  }, []);

  const openStationMenu = useCallback((station: MapStation) => {
    setSelectedStation(station.name);
    setHoveredStation(null);
    setStationMenu(station);
  }, []);

  const handleStationRoleSelect = useCallback((role: StationRole) => {
    if (!stationMenu) return;
    const name = stationMenu.name;
    setSelectedStation(name);
    setStationMenu(null);

    if (onStationRoleSelect) {
      onStationRoleSelect(name, role);
      return;
    }

    if (onStationSelect) {
      onStationSelect(name);
      return;
    }

    const encodedName = encodeURIComponent(name);
    if (role === "from") {
      setLocation(`/?from=${encodedName}`);
    } else if (role === "to") {
      setLocation(`/?to=${encodedName}`);
    } else {
      setLocation(`/?via=${encodedName}`);
    }
  }, [onStationRoleSelect, onStationSelect, setLocation, stationMenu]);

  const handleOpenStationInfo = useCallback(() => {
    if (!stationMenu) return;
    const encodedName = encodeURIComponent(stationMenu.name);
    setStationMenu(null);
    setLocation(`/station/${encodedName}`);
  }, [setLocation, stationMenu]);

  const handleToggleStationFavorite = useCallback((kind: StationFavoriteKind) => {
    if (!stationMenu) return;

    const favorite = stationFavoriteMap[kind];
    const label = STATION_FAVORITE_KINDS.find(item => item.kind === kind)?.label ?? "즐겨찾기";

    if (favorite?.stationName === stationMenu.name) {
      removeStationFavorite(kind);
      refreshStationFavorites();
      toast(`${label} 설정을 해제했습니다`);
      return;
    }

    setStationFavorite(kind, stationMenu.name, stationMenu.lineId);
    refreshStationFavorites();
    toast(`${stationMenu.name}역을 ${label}으로 설정했습니다`);
  }, [refreshStationFavorites, stationFavoriteMap, stationMenu]);

  const handleMapClick = useCallback((event: MouseEvent<SVGSVGElement>) => {
    if (hasDragged.current) return;
    const station = findNearestStation(screenToSvg(event.clientX, event.clientY));
    if (station) {
      openStationMenu(station);
    } else {
      setStationMenu(null);
    }
  }, [findNearestStation, openStationMenu, screenToSvg]);

  const hitRadius = Math.max(10, Math.min(30, viewBox.w * 0.012));
  const ringRadius = Math.max(12, hitRadius * 1.25);
  const stationMenuFavoriteLabels = stationMenu
    ? STATION_FAVORITE_KINDS
      .filter(({ kind }) => stationFavoriteMap[kind]?.stationName === stationMenu.name)
      .map(({ label }) => label)
    : [];
  const isStationMenuFavorite = stationMenuFavoriteLabels.length > 0;

  return (
    <div className="relative w-full h-full bg-white" ref={containerRef}>
      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleMapClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-label="서울 지하철 공식 노선도"
        role="img"
      >
        <defs>
          <filter id="official-station-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <image
          href={MAP_IMAGE}
          x={0}
          y={0}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          preserveAspectRatio="none"
        />

        <g>
          {uniqueStations.map(station => {
            const isHovered = hoveredStation === station.name;
            const role = getStationRole(station.name);
            const isRoleSelected = role !== null;
            const isFocused = selectedStation === station.name || highlightedStation === station.name;
            const roleColor = role ? ROLE_COLOR_MAP[role] : null;

            return (
              <g key={station.id}>
                {/* Role ring (from/via/to) — 항상 표시 */}
                {isRoleSelected && roleColor && (
                  <>
                    <circle
                      cx={station.x}
                      cy={station.y}
                      r={ringRadius + 9}
                      fill={`${roleColor}33`}
                      stroke={roleColor}
                      strokeWidth={Math.max(2.5, viewBox.w * 0.003)}
                      filter="url(#official-station-glow)"
                      className="pointer-events-none"
                    />
                  </>
                )}
                {/* Focus ring (메뉴 열린 역) — role 없을 때만 별도 표시 */}
                {isFocused && !isRoleSelected && (
                  <circle
                    cx={station.x}
                    cy={station.y}
                    r={ringRadius + 7}
                    fill="rgba(74, 144, 217, 0.18)"
                    stroke="#1B6FD8"
                    strokeWidth={Math.max(2, viewBox.w * 0.0025)}
                    filter="url(#official-station-glow)"
                    className="pointer-events-none"
                  />
                )}
                {isHovered && !isFocused && !isRoleSelected && (
                  <circle
                    cx={station.x}
                    cy={station.y}
                    r={ringRadius}
                    fill="rgba(27, 40, 56, 0.12)"
                    stroke="#1B2838"
                    strokeWidth={Math.max(1.5, viewBox.w * 0.0018)}
                    className="pointer-events-none"
                  />
                )}
                <circle
                  cx={station.x}
                  cy={station.y}
                  r={hitRadius}
                  fill="transparent"
                  pointerEvents="none"
                  data-station-id={station.id}
                  data-station-name={station.name}
                >
                  <title>{station.name}</title>
                </circle>
              </g>
            );
          })}
        </g>
      </svg>

      {stationMenu && stationMenuPosition && (
        <div
          ref={menuRef}
          className="absolute z-30 w-60 rounded-2xl border border-[#E5E5EA] bg-white/95 p-2 shadow-[0_14px_40px_rgba(27,40,56,0.22)] backdrop-blur-md"
          style={stationMenuPosition}
          role="menu"
          aria-label={`${stationMenu.name}역 선택 메뉴`}
          tabIndex={-1}
        >
          {/* Header */}
          <div className="flex items-start gap-2 px-1.5 py-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-[14px] font-semibold text-[#1B2838]">
                  {stationMenu.name}
                </p>
                <button
                  type="button"
                  onClick={handleOpenStationInfo}
                  className="btn-press flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5F5F7] text-[#1B2838] transition-colors hover:bg-[#EDEDF2] focus:bg-[#EDEDF2] focus:outline-none"
                  aria-label={`${stationMenu.name}역 정보 보기`}
                  title={`${stationMenu.name}역 정보 보기`}
                >
                  <Info size={14} />
                </button>
              </div>
              {getStationRole(stationMenu.name) && (
                <p
                  className="text-[10px] font-bold"
                  style={{ color: ROLE_COLOR_MAP[getStationRole(stationMenu.name)!] }}
                >
                  현재: {ROLE_LABEL_MAP[getStationRole(stationMenu.name)!]}지
                </p>
              )}
              {isStationMenuFavorite && (
                <p className="truncate text-[10px] font-bold text-[#9C7A00]">
                  내 장소: {stationMenuFavoriteLabels.join(", ")}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowStationFavoritePicker(value => !value)}
              className={`btn-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                showStationFavoritePicker || isStationMenuFavorite
                  ? "bg-[#FFF7D9]"
                  : "bg-[#F5F5F7]"
              }`}
              aria-label="역 즐겨찾기 설정"
              aria-expanded={showStationFavoritePicker}
            >
              <Star
                size={16}
                className={isStationMenuFavorite ? "text-[#C8A218]" : "text-[#8E8E93]"}
                fill={isStationMenuFavorite ? "#C8A218" : "transparent"}
              />
            </button>
          </div>

          {showStationFavoritePicker && (
            <div className="mb-1.5 grid grid-cols-3 gap-1">
              {STATION_FAVORITE_KINDS.map(({ kind, label }) => {
                const Icon = STATION_FAVORITE_ICON_MAP[kind];
                const favorite = stationFavoriteMap[kind];
                const isSelected = favorite?.stationName === stationMenu.name;
                const color = STATION_FAVORITE_COLOR_MAP[kind];

                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => handleToggleStationFavorite(kind)}
                    className={`btn-press min-w-0 rounded-xl border px-1.5 py-2 text-left transition-all ${
                      isSelected
                        ? "border-transparent text-white shadow-sm"
                        : "border-[#ECECF1] bg-[#F8F9FB] text-[#1B2838]"
                    }`}
                    style={isSelected ? { backgroundColor: color } : undefined}
                  >
                    <span className="mb-1 flex items-center justify-between gap-1">
                      <Icon
                        size={13}
                        className={isSelected ? "text-white" : ""}
                        style={isSelected ? undefined : { color }}
                      />
                      {isSelected && <Check size={12} className="text-white" />}
                    </span>
                    <span className="block truncate text-[10.5px] font-bold">{label}</span>
                    <span
                      className={`mt-0.5 block truncate text-[9.5px] font-semibold ${
                        isSelected ? "text-white/80" : "text-[#8E8E93]"
                      }`}
                    >
                      {favorite?.stationName ?? "미설정"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Arrivals */}
          <div className="mt-1 rounded-xl bg-[#F8F9FB] px-2 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] mb-1.5 px-0.5">
              실시간 도착
            </p>
            {menuArrivalsLoading ? (
              <p className="text-[11px] text-[#8E8E93] px-0.5 py-1">불러오는 중...</p>
            ) : menuArrivals.length === 0 ? (
              <p className="text-[11px] text-[#8E8E93] px-0.5 py-1">도착 정보 없음</p>
            ) : (
              <ul className="space-y-1">
                {menuArrivals.map((a, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[11.5px]">
                    <Train size={11} className="shrink-0 text-[#4A90D9]" />
                    <span className="truncate font-medium text-[#1B2838] flex-1">
                      {a.direction || a.destination}
                    </span>
                    <span className="shrink-0 font-semibold text-[#1B2838]">
                      {a.arrivalMessage || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Role buttons */}
          <div className="mt-1.5 space-y-0.5">
            {STATION_ROLE_OPTIONS.map(({ role, label, Icon, color }) => {
              const isCurrentRole = getStationRole(stationMenu.name) === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleStationRoleSelect(role)}
                  className={`btn-press flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[13px] font-semibold focus:outline-none ${
                    isCurrentRole
                      ? "bg-[#F5F5F7] text-[#1B2838]"
                      : "text-[#1B2838] hover:bg-[#F5F5F7] focus:bg-[#F5F5F7]"
                  }`}
                  role="menuitem"
                  aria-pressed={isCurrentRole}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: color }}
                  >
                    <Icon size={13} />
                  </span>
                  <span className="flex-1">{label}</span>
                  {isCurrentRole && (
                    <span className="text-[9px] font-bold text-[#8E8E93]">선택됨</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => zoomAt(ZOOM_IN_FACTOR)}
          className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl shadow-md flex items-center justify-center text-[#1B2838] btn-press"
          aria-label="확대"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => zoomAt(ZOOM_OUT_FACTOR)}
          className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl shadow-md flex items-center justify-center text-[#1B2838] btn-press"
          aria-label="축소"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={() => {
            setSelectedStation(null);
            setStationMenu(null);
            setViewBox(FULL_VIEW_BOX);
          }}
          className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl shadow-md flex items-center justify-center text-[#1B2838] btn-press"
          aria-label="전체 보기"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default forwardRef(MetroMap);
