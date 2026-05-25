/**
 * 좌표 기반 인터랙티브 노선도
 * - 노선, 역 점, 클릭 영역을 모두 같은 mapCoords 좌표계로 그린다.
 * - 따라서 화면에 보이는 역 점과 실제 클릭 판정 위치가 항상 일치한다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, TouchEvent, WheelEvent } from "react";
import { useLocation } from "wouter";
import mapCoords from "@/data/mapCoords.json";
import metroData from "@/data/metroData.json";
import { getLineInfo } from "@/lib/pathfinder";
import type { Station } from "@/lib/pathfinder";

interface MapStation {
  id: string;
  name: string;
  lineId: string;
  x: number;
  y: number;
  transfers: string[];
}

interface MapEdge {
  from: string;
  to: string;
  lineId: string;
}

const MAP_BOUNDS = { x: 50, y: 50, w: 1800, h: 1400 };
const INITIAL_VIEW_BOX = { ...MAP_BOUNDS };
const MIN_VIEWBOX_WIDTH = 360;
const MIN_VIEWBOX_HEIGHT = 280;

function clampViewBox(box: { x: number; y: number; w: number; h: number }) {
  const w = Math.max(MIN_VIEWBOX_WIDTH, Math.min(MAP_BOUNDS.w, box.w));
  const h = Math.max(MIN_VIEWBOX_HEIGHT, Math.min(MAP_BOUNDS.h, box.h));
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

export default function MetroMap({
  onStationSelect,
  selectedLines,
  highlightedStation,
}: {
  onStationSelect?: (name: string) => void;
  selectedLines?: string[];
  highlightedStation?: string;
}) {
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewBox, setViewBox] = useState(INITIAL_VIEW_BOX);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  const lastTouchDist = useRef<number | null>(null);

  const stations: MapStation[] = useMemo(() => {
    const coordsById = mapCoords.stations as Record<string, { x: number; y: number }>;

    return (metroData.stations as Station[])
      .filter(station => {
        if (selectedLines && selectedLines.length > 0) {
          return selectedLines.includes(station.lineId);
        }
        return true;
      })
      .map(station => {
        const coords = coordsById[station.id];
        if (!coords || coords.x <= 0 || coords.y <= 0) return null;

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

  const stationPosMap = useMemo(() => {
    const map = new Map<string, MapStation>();
    for (const station of stations) {
      map.set(station.id, station);
    }
    return map;
  }, [stations]);

  const edges: MapEdge[] = useMemo(() => {
    const stationIds = new Set(stations.map(station => station.id));
    return (metroData.edges as MapEdge[])
      .filter(edge => stationIds.has(edge.from) && stationIds.has(edge.to));
  }, [stations]);

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

  const transferStations = useMemo(() => {
    const countByName = new Map<string, number>();

    for (const station of metroData.stations as Station[]) {
      countByName.set(station.name, (countByName.get(station.name) || 0) + 1);
    }

    return new Set(
      Array.from(countByName.entries())
        .filter(([, count]) => count > 1)
        .map(([name]) => name),
    );
  }, []);

  useEffect(() => {
    if (!highlightedStation) return;
    const station = uniqueStations.find(item => item.name === highlightedStation);
    if (!station) return;

    const nextW = 520;
    const nextH = 420;
    setSelectedStation(station.name);
    setViewBox(clampViewBox({
      x: station.x - nextW / 2,
      y: station.y - nextH / 2,
      w: nextW,
      h: nextH,
    }));
  }, [highlightedStation, uniqueStations]);

  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w;
    const y = viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h;
    return { x, y };
  }, [viewBox]);

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

  const handlePointerDown = useCallback((event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "touch") return;
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<SVGSVGElement>) => {
    if (!isDragging || event.pointerType === "touch") return;
    const width = containerRef.current?.clientWidth || 1;
    const height = containerRef.current?.clientHeight || 1;
    const dx = (event.clientX - dragStart.x) * (viewBox.w / width);
    const dy = (event.clientY - dragStart.y) * (viewBox.h / height);

    setViewBox(prev => clampViewBox({ ...prev, x: prev.x - dx, y: prev.y - dy }));
    setDragStart({ x: event.clientX, y: event.clientY });
  }, [dragStart, isDragging, viewBox.h, viewBox.w]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    zoomAt(event.deltaY > 0 ? 1.14 : 0.88, screenToSvg(event.clientX, event.clientY));
  }, [screenToSvg, zoomAt]);

  const handleTouchStart = useCallback((event: TouchEvent<SVGSVGElement>) => {
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
    event.preventDefault();

    if (event.touches.length === 2 && lastTouchDist.current !== null) {
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
      const width = containerRef.current?.clientWidth || 1;
      const height = containerRef.current?.clientHeight || 1;
      const dx = (event.touches[0].clientX - dragStart.x) * (viewBox.w / width);
      const dy = (event.touches[0].clientY - dragStart.y) * (viewBox.h / height);

      setViewBox(prev => clampViewBox({ ...prev, x: prev.x - dx, y: prev.y - dy }));
      setDragStart({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    }
  }, [dragStart, isDragging, screenToSvg, viewBox.h, viewBox.w, zoomAt]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchDist.current = null;
  }, []);

  const handleStationClick = useCallback((name: string) => {
    setSelectedStation(name);
    if (onStationSelect) {
      onStationSelect(name);
      return;
    }

    setLocation(`/station/${encodeURIComponent(name)}`);
  }, [onStationSelect, setLocation]);

  const zoomLevel = MAP_BOUNDS.w / viewBox.w;
  const stationRadius = zoomLevel > 2.5 ? 8 : zoomLevel > 1.5 ? 6 : 4.5;
  const labelMode = viewBox.w < 820 ? "all" : viewBox.w < 1350 ? "major" : "transfer";

  return (
    <div className="relative w-full h-full bg-[#F7F8FA]" ref={containerRef}>
      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="none"
        className="w-full h-full touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-label="서울 지하철 노선도"
        role="img"
      >
        <defs>
          <filter id="station-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x={MAP_BOUNDS.x - 80}
          y={MAP_BOUNDS.y - 80}
          width={MAP_BOUNDS.w + 160}
          height={MAP_BOUNDS.h + 160}
          fill="#F7F8FA"
        />

        <g>
          {edges.map((edge, index) => {
            const from = stationPosMap.get(edge.from);
            const to = stationPosMap.get(edge.to);
            if (!from || !to) return null;

            const line = getLineInfo(edge.lineId);
            return (
              <line
                key={`${edge.from}-${edge.to}-${index}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={line?.color || "#8E8E93"}
                strokeWidth={viewBox.w < 850 ? 6 : 5}
                strokeLinecap="round"
                opacity={0.9}
              />
            );
          })}
        </g>

        <g>
          {uniqueStations.map(station => {
            const line = getLineInfo(station.lineId);
            const isTransfer = transferStations.has(station.name);
            const isHovered = hoveredStation === station.name;
            const isSelected = selectedStation === station.name || highlightedStation === station.name;
            const radius = isTransfer ? stationRadius + 2 : stationRadius;
            const showLabel =
              labelMode === "all" ||
              (labelMode === "major" && (isTransfer || isHovered || isSelected)) ||
              (labelMode === "transfer" && (isTransfer || isHovered || isSelected));

            return (
              <g key={station.id}>
                {isSelected && (
                  <circle
                    cx={station.x}
                    cy={station.y}
                    r={radius + 8}
                    fill="none"
                    stroke="#1B2838"
                    strokeWidth={2}
                    opacity={0.45}
                    filter="url(#station-glow)"
                  />
                )}
                <circle
                  cx={station.x}
                  cy={station.y}
                  r={isHovered || isSelected ? radius + 2 : radius}
                  fill={isTransfer ? "#FFFFFF" : (line?.color || "#8E8E93")}
                  stroke={isTransfer ? "#2D3748" : "#FFFFFF"}
                  strokeWidth={isTransfer ? 2.25 : 1.8}
                  className="cursor-pointer"
                  onPointerDown={event => event.stopPropagation()}
                  onPointerEnter={() => setHoveredStation(station.name)}
                  onPointerLeave={() => setHoveredStation(null)}
                  onClick={event => {
                    event.stopPropagation();
                    handleStationClick(station.name);
                  }}
                />
                <circle
                  cx={station.x}
                  cy={station.y}
                  r={Math.max(16, radius + 9)}
                  fill="transparent"
                  className="cursor-pointer"
                  onPointerDown={event => event.stopPropagation()}
                  onPointerEnter={() => setHoveredStation(station.name)}
                  onPointerLeave={() => setHoveredStation(null)}
                  onClick={event => {
                    event.stopPropagation();
                    handleStationClick(station.name);
                  }}
                >
                  <title>{station.name}</title>
                </circle>
                {showLabel && (
                  <text
                    x={station.x}
                    y={station.y - radius - 7}
                    textAnchor="middle"
                    fontSize={viewBox.w < 650 ? 12 : 10}
                    fontWeight={isTransfer || isSelected ? 700 : 500}
                    fill={isSelected ? "#1B2838" : "#2D3748"}
                    paintOrder="stroke"
                    stroke="#F7F8FA"
                    strokeWidth={4}
                    className="pointer-events-none"
                    style={{ fontFamily: "Pretendard Variable, Pretendard, sans-serif" }}
                  >
                    {station.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => zoomAt(0.78)}
          className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl shadow-md flex items-center justify-center text-[#1B2838] font-bold text-base btn-press"
          aria-label="확대"
        >
          +
        </button>
        <button
          onClick={() => zoomAt(1.25)}
          className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl shadow-md flex items-center justify-center text-[#1B2838] font-bold text-base btn-press"
          aria-label="축소"
        >
          -
        </button>
        <button
          onClick={() => {
            setSelectedStation(null);
            setViewBox(INITIAL_VIEW_BOX);
          }}
          className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl shadow-md flex items-center justify-center text-[10px] text-[#8E8E93] font-medium btn-press"
        >
          전체
        </button>
      </div>
    </div>
  );
}
