/**
 * 인터랙티브 SVG 노선도 컴포넌트
 * Design: iOS 스타일 - 핀치 줌, 패닝, 역 탭 상호작용
 * - 전체 수도권 노선을 SVG로 시각화
 * - 핀치 줌 & 드래그 패닝 지원
 * - 역 탭 시 역 상세 이동 또는 출발/도착역 설정
 * - 노선 필터링
 * - 검색된 역 하이라이트 + 자동 줌인
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import mapCoords from "@/data/mapCoords.json";
import metroData from "@/data/metroData.json";
import { getLineInfo } from "@/lib/pathfinder";
import type { Station, Line } from "@/lib/pathfinder";

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
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Transform state
  const [viewBox, setViewBox] = useState({ x: 50, y: 50, w: 1800, h: 1400 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  // Touch state for pinch zoom
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

  // Process data
  const stations: MapStation[] = useMemo(() => {
    return (metroData.stations as Station[])
      .filter(s => {
        if (selectedLines && selectedLines.length > 0) {
          return selectedLines.includes(s.lineId);
        }
        return true;
      })
      .map(s => {
        const coords = (mapCoords.stations as Record<string, { x: number; y: number }>)[s.id];
        return {
          id: s.id,
          name: s.name,
          lineId: s.lineId,
          x: coords?.x || 0,
          y: coords?.y || 0,
          transfers: s.transfers,
        };
      })
      .filter(s => s.x > 0 && s.y > 0);
  }, [selectedLines]);

  const edges: MapEdge[] = useMemo(() => {
    const stationIds = new Set(stations.map(s => s.id));
    return (metroData.edges as { from: string; to: string; lineId: string }[])
      .filter(e => stationIds.has(e.from) && stationIds.has(e.to));
  }, [stations]);

  // Station position lookup
  const stationPosMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number; name: string; lineId: string; transfers: string[] }>();
    stations.forEach(s => map.set(s.id, { x: s.x, y: s.y, name: s.name, lineId: s.lineId, transfers: s.transfers }));
    return map;
  }, [stations]);

  // Deduplicate stations by name (show only one dot per physical station)
  const uniqueStations = useMemo(() => {
    const seen = new Map<string, MapStation>();
    stations.forEach(s => {
      if (!seen.has(s.name)) {
        seen.set(s.name, s);
      } else {
        const existing = seen.get(s.name)!;
        if (s.transfers.length > existing.transfers.length) {
          seen.set(s.name, s);
        }
      }
    });
    return Array.from(seen.values());
  }, [stations]);

  // Transfer stations (stations with multiple lines)
  const transferStations = useMemo(() => {
    const nameCount = new Map<string, number>();
    (metroData.stations as Station[]).forEach(s => {
      nameCount.set(s.name, (nameCount.get(s.name) || 0) + 1);
    });
    return new Set(
      Array.from(nameCount.entries())
        .filter(([, count]) => count > 1)
        .map(([name]) => name)
    );
  }, []);

  // Auto-zoom to highlighted station
  useEffect(() => {
    if (highlightedStation) {
      const station = uniqueStations.find(s => s.name === highlightedStation);
      if (station) {
        const zoomW = 600;
        const zoomH = 480;
        setViewBox({
          x: station.x - zoomW / 2,
          y: station.y - zoomH / 2,
          w: zoomW,
          h: zoomH,
        });
        setSelectedStation(highlightedStation);
      }
    }
  }, [highlightedStation, uniqueStations]);

  // Convert screen coords to SVG coords
  const screenToSvg = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w;
    const y = viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h;
    return { x, y };
  }, [viewBox]);

  // Mouse/touch handlers for panning
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || e.pointerType === 'touch') return;
    const dx = (e.clientX - dragStart.x) * (viewBox.w / (containerRef.current?.clientWidth || 1));
    const dy = (e.clientY - dragStart.y) * (viewBox.h / (containerRef.current?.clientHeight || 1));
    setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, viewBox.w, viewBox.h]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const svgPoint = screenToSvg(e.clientX, e.clientY);

    setViewBox(prev => {
      const newW = Math.max(300, Math.min(2000, prev.w * factor));
      const newH = Math.max(240, Math.min(1600, prev.h * factor));
      const newX = svgPoint.x - (svgPoint.x - prev.x) * (newW / prev.w);
      const newY = svgPoint.y - (svgPoint.y - prev.y) * (newH / prev.h);
      return { x: newX, y: newY, w: newW, h: newH };
    });
  }, [screenToSvg]);

  // Touch handlers for pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = lastTouchDist.current / dist;

      const center = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      const svgPoint = screenToSvg(center.x, center.y);

      setViewBox(prev => {
        const newW = Math.max(300, Math.min(2000, prev.w * factor));
        const newH = Math.max(240, Math.min(1600, prev.h * factor));
        const newX = svgPoint.x - (svgPoint.x - prev.x) * (newW / prev.w);
        const newY = svgPoint.y - (svgPoint.y - prev.y) * (newH / prev.h);
        return { x: newX, y: newY, w: newW, h: newH };
      });

      lastTouchDist.current = dist;
      lastTouchCenter.current = center;
    } else if (e.touches.length === 1 && isDragging) {
      const dx = (e.touches[0].clientX - dragStart.x) * (viewBox.w / (containerRef.current?.clientWidth || 1));
      const dy = (e.touches[0].clientY - dragStart.y) * (viewBox.h / (containerRef.current?.clientHeight || 1));
      setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, [isDragging, dragStart, viewBox.w, viewBox.h, screenToSvg]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchDist.current = null;
    lastTouchCenter.current = null;
  }, []);

  // Station click handler
  const handleStationClick = useCallback((name: string) => {
    if (onStationSelect) {
      onStationSelect(name);
      setSelectedStation(name);
    } else {
      setSelectedStation(name);
      setLocation(`/station/${encodeURIComponent(name)}`);
    }
  }, [onStationSelect, setLocation]);

  // Zoom controls
  const zoomIn = () => {
    setViewBox(prev => ({
      x: prev.x + prev.w * 0.1,
      y: prev.y + prev.h * 0.1,
      w: Math.max(300, prev.w * 0.8),
      h: Math.max(240, prev.h * 0.8),
    }));
  };

  const zoomOut = () => {
    setViewBox(prev => ({
      x: prev.x - prev.w * 0.125,
      y: prev.y - prev.h * 0.125,
      w: Math.min(1800, prev.w * 1.25),
      h: Math.min(1400, prev.h * 1.25),
    }));
  };

  const resetView = () => {
    setViewBox({ x: 50, y: 50, w: 1800, h: 1400 });
    setSelectedStation(null);
  };

  // Determine station radius based on zoom level
  const stationRadius = useMemo(() => {
    const zoomLevel = 1900 / viewBox.w;
    if (zoomLevel > 2.5) return 10;
    if (zoomLevel > 1.5) return 7;
    return 5;
  }, [viewBox.w]);

  // Show labels only when zoomed in enough
  const showLabels = viewBox.w < 1400;
  const showAllLabels = viewBox.w < 800;
  const showTransferLabelsOnly = viewBox.w < 1800 && viewBox.w >= 1400;

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* SVG Map */}
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-full touch-none select-none"
        style={{ background: '#FAFBFC' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid pattern for visual reference */}
        <defs>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#F0F0F2" strokeWidth="0.5" />
          </pattern>
          {/* Highlight glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="50" y="50" width="1800" height="1400" fill="url(#grid)" />

        {/* Edges (lines between stations) */}
        <g className="edges">
          {edges.map((edge, idx) => {
            const fromPos = stationPosMap.get(edge.from);
            const toPos = stationPosMap.get(edge.to);
            if (!fromPos || !toPos) return null;
            const line = getLineInfo(edge.lineId);
            return (
              <line
                key={idx}
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke={line?.color || '#999'}
                strokeWidth={viewBox.w < 800 ? 5 : 4}
                strokeLinecap="round"
                opacity={0.85}
              />
            );
          })}
        </g>

        {/* Station dots */}
        <g className="stations">
          {uniqueStations.map(station => {
            const isTransfer = transferStations.has(station.name);
            const isHovered = hoveredStation === station.name;
            const isSelected = selectedStation === station.name;
            const isHighlighted = highlightedStation === station.name;
            const line = getLineInfo(station.lineId);
            const r = isTransfer ? stationRadius + 2 : stationRadius;

            return (
              <g key={station.id}>
                {/* Highlight ring for selected/highlighted station */}
                {(isHighlighted || isSelected) && (
                  <circle
                    cx={station.x}
                    cy={station.y}
                    r={r + 8}
                    fill="none"
                    stroke="#4A90D9"
                    strokeWidth={2}
                    opacity={0.6}
                    filter="url(#glow)"
                  >
                    <animate
                      attributeName="r"
                      values={`${r + 6};${r + 10};${r + 6}`}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0.3;0.6"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {/* Station circle */}
                <circle
                  cx={station.x}
                  cy={station.y}
                  r={isHovered || isSelected || isHighlighted ? r + 3 : r}
                  fill={isTransfer ? 'white' : (line?.color || '#999')}
                  stroke={isHighlighted || isSelected ? '#4A90D9' : (isTransfer ? '#333' : 'white')}
                  strokeWidth={isHighlighted || isSelected ? 3 : (isTransfer ? 2.5 : 2)}
                  className="cursor-pointer transition-all"
                  style={{ filter: isHovered ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' : undefined }}
                  onPointerEnter={() => setHoveredStation(station.name)}
                  onPointerLeave={() => setHoveredStation(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStationClick(station.name);
                  }}
                />
                {/* Inner dot for transfer stations */}
                {isTransfer && (
                  <circle
                    cx={station.x}
                    cy={station.y}
                    r={r - 3}
                    fill={isHighlighted || isSelected ? '#4A90D9' : '#333'}
                    className="pointer-events-none"
                  />
                )}
                {/* Station label */}
                {(showAllLabels || (showLabels && (isTransfer || isHovered || isHighlighted || isSelected)) || (showTransferLabelsOnly && isTransfer) || isHighlighted || isSelected) && (
                  <text
                    x={station.x}
                    y={station.y - r - 5}
                    textAnchor="middle"
                    fontSize={viewBox.w < 600 ? 11 : (isHighlighted || isSelected ? 10 : 8)}
                    fontWeight={isTransfer || isHighlighted || isSelected ? 600 : 400}
                    fill={isHighlighted || isSelected ? '#4A90D9' : '#1B2838'}
                    className="pointer-events-none select-none"
                    style={{ fontFamily: 'Pretendard Variable, sans-serif' }}
                  >
                    {station.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Hovered station tooltip */}
        {hoveredStation && !showLabels && !transferStations.has(hoveredStation) && (() => {
          const s = uniqueStations.find(st => st.name === hoveredStation);
          if (!s) return null;
          return (
            <g>
              <rect
                x={s.x - 40}
                y={s.y - stationRadius - 24}
                width={80}
                height={18}
                rx={4}
                fill="rgba(27, 40, 56, 0.9)"
              />
              <text
                x={s.x}
                y={s.y - stationRadius - 12}
                textAnchor="middle"
                fontSize={10}
                fill="white"
                fontWeight={500}
                style={{ fontFamily: 'Pretendard Variable, sans-serif' }}
              >
                {hoveredStation}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={zoomIn}
          className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl shadow-md flex items-center justify-center text-[#1B2838] font-bold text-base btn-press"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl shadow-md flex items-center justify-center text-[#1B2838] font-bold text-base btn-press"
        >
          −
        </button>
        <button
          onClick={resetView}
          className="w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl shadow-md flex items-center justify-center text-[10px] text-[#8E8E93] font-medium btn-press"
        >
          전체
        </button>
      </div>
    </div>
  );
}
