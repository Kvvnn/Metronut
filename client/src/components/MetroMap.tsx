/**
 * 공식 서울 지하철 노선도 기반 인터랙티브 지도.
 * - 배경은 원본 PDF에서 추출한 공식 PNG를 그대로 사용한다.
 * - 클릭 영역은 같은 PNG 픽셀 좌표계의 역 마커 위에 투명하게 얹는다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, TouchEvent, WheelEvent } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useLocation } from "wouter";
import metroData from "@/data/metroData.json";
import officialMapCoords from "@/data/officialMapCoords.json";
import type { Station } from "@/lib/pathfinder";

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

const officialMap = officialMapCoords as OfficialMapCoords;
const MAP_WIDTH = officialMap.metadata.width;
const MAP_HEIGHT = officialMap.metadata.height;
const MAP_IMAGE = officialMap.metadata.image;
const MAP_BOUNDS: ViewBox = { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT };
const INITIAL_VIEW_BOX: ViewBox = { ...MAP_BOUNDS };
const MIN_VIEWBOX_SIZE = 320;

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

  const [viewBox, setViewBox] = useState<ViewBox>(INITIAL_VIEW_BOX);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  const lastTouchDist = useRef<number | null>(null);
  const hasDragged = useRef(false);

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

  useEffect(() => {
    if (!highlightedStation) return;
    const station = uniqueStations.find(item => item.name === highlightedStation);
    if (!station) return;

    const nextSize = 620;
    setSelectedStation(station.name);
    setViewBox(clampViewBox({
      x: station.x - nextSize / 2,
      y: station.y - nextSize / 2,
      w: nextSize,
      h: nextSize,
    }));
  }, [highlightedStation, uniqueStations]);

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
    }
    panByScreenDelta(event.clientX - dragStart.x, event.clientY - dragStart.y);
    setDragStart({ x: event.clientX, y: event.clientY });
  }, [dragStart, findNearestStation, isDragging, panByScreenDelta, screenToSvg]);

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

  const handleStationClick = useCallback((name: string) => {
    setSelectedStation(name);
    if (onStationSelect) {
      onStationSelect(name);
      return;
    }

    setLocation(`/station/${encodeURIComponent(name)}`);
  }, [onStationSelect, setLocation]);

  const handleMapClick = useCallback((event: PointerEvent<SVGSVGElement>) => {
    if (hasDragged.current) return;
    const station = findNearestStation(screenToSvg(event.clientX, event.clientY));
    if (station) {
      handleStationClick(station.name);
    }
  }, [findNearestStation, handleStationClick, screenToSvg]);

  const hitRadius = Math.max(10, Math.min(30, viewBox.w * 0.012));
  const ringRadius = Math.max(12, hitRadius * 1.25);

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
            const isSelected = selectedStation === station.name || highlightedStation === station.name;

            return (
              <g key={station.id}>
                {isSelected && (
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
                {isHovered && !isSelected && (
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

      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => zoomAt(0.78)}
          className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl shadow-md flex items-center justify-center text-[#1B2838] btn-press"
          aria-label="확대"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => zoomAt(1.25)}
          className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl shadow-md flex items-center justify-center text-[#1B2838] btn-press"
          aria-label="축소"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={() => {
            setSelectedStation(null);
            setViewBox(INITIAL_VIEW_BOX);
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
