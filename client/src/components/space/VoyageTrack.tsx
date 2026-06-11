/**
 * 우주 항해 트랙 — 탑승 진행률을 "캡슐이 목적지 행성으로 다가가는 항해"로 그린다.
 *
 * - 지나온 역: 캡슐 뒤로 흐려지는 작은 점 (지나온 별자리)
 * - 캡슐: 무중력 부유 애니메이션, 노선 색 엔진 글로우
 * - 목적지: 고리 행성. 가까워질수록 커지고, 한 정거장 전부터 맥동한다.
 */
import { motion, useReducedMotion } from "framer-motion";

export interface VoyageTrackProps {
  /** 0..1 구간 진행률 */
  progress: number;
  /** 전체 정차역 수 (출발역 포함) */
  stationCount: number;
  /** 현재 역 인덱스 */
  currentIndex: number;
  /** 남은 역 수 */
  remaining: number;
  lineColor: string;
  /** 열차가 주행 중인지 (정차 중이면 캡슐이 더 잔잔하게 떠 있는다) */
  moving?: boolean;
}

function CapsuleSvg({ lineColor }: { lineColor: string }) {
  return (
    <svg width="44" height="26" viewBox="0 0 44 26" fill="none" aria-hidden>
      {/* 엔진 글로우 */}
      <ellipse cx="6" cy="13" rx="6" ry="4" fill={lineColor} opacity="0.45" />
      {/* 몸체 */}
      <rect x="7" y="5" width="33" height="16" rx="8" fill="#E9EEF8" />
      <rect x="7" y="5" width="33" height="16" rx="8" stroke="#FFFFFF" strokeOpacity="0.5" />
      {/* 창문 */}
      <circle cx="30" cy="13" r="4" fill="#0B1026" />
      <circle cx="31.2" cy="11.8" r="1.2" fill="#9FB7E8" />
      {/* 노선 색 스트라이프 */}
      <rect x="12" y="9" width="10" height="8" rx="4" fill={lineColor} />
    </svg>
  );
}

export default function VoyageTrack({
  progress,
  stationCount,
  currentIndex,
  remaining,
  lineColor,
  moving = true,
}: VoyageTrackProps) {
  const reducedMotion = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, progress));
  // 캡슐·행성이 잘리지 않도록 트랙 유효 범위를 6%~88%로 매핑
  const capsuleLeft = 6 + clamped * 82;
  const arrivingSoon = remaining <= 1;
  const planetSize = 18 + (1 - Math.min(1, remaining / Math.max(1, stationCount - 1))) * 10;

  const dots = Array.from({ length: stationCount }, (_, i) => i).filter(
    i => i !== stationCount - 1,
  );

  return (
    <div className="relative h-[72px] w-full" aria-hidden>
      {/* 궤도선 */}
      <div
        className="absolute left-[4%] right-[4%] top-1/2 -translate-y-1/2 border-t border-dashed"
        style={{ borderColor: "rgba(255,255,255,0.18)" }}
      />

      {/* 역 점들 */}
      {dots.map(i => {
        const left = 6 + (i / Math.max(1, stationCount - 1)) * 82;
        const passed = i <= currentIndex;
        return (
          <span
            key={i}
            className="absolute top-1/2 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-700"
            style={{
              left: `${left}%`,
              backgroundColor: passed ? lineColor : "#FFFFFF",
              opacity: passed ? 0.28 : 0.55,
            }}
          />
        );
      })}

      {/* 목적지 행성 */}
      <motion.div
        className="absolute top-1/2"
        style={{ left: "94%", x: "-50%", y: "-50%" }}
        animate={
          reducedMotion
            ? undefined
            : arrivingSoon
              ? { scale: [1, 1.12, 1] }
              : { y: ["-54%", "-46%", "-54%"] }
        }
        transition={
          arrivingSoon
            ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
            : { duration: 5.2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <div className="relative" style={{ width: planetSize, height: planetSize }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundColor: lineColor,
              boxShadow: `0 0 ${arrivingSoon ? 18 : 10}px ${lineColor}AA`,
            }}
          />
          {/* 행성 고리 */}
          <div
            className="absolute left-1/2 top-1/2 rounded-[50%] border"
            style={{
              width: planetSize * 1.9,
              height: planetSize * 0.6,
              borderColor: "rgba(255,255,255,0.5)",
              transform: "translate(-50%, -50%) rotate(-18deg)",
            }}
          />
        </div>
      </motion.div>

      {/* 캡슐 */}
      <motion.div
        className="absolute top-1/2 z-10"
        style={{ x: "-50%" }}
        animate={{ left: `${capsuleLeft}%` }}
        transition={{ type: "spring", stiffness: 50, damping: 16 }}
      >
        <motion.div
          animate={
            reducedMotion
              ? { y: "-50%" }
              : moving
                ? { y: ["-58%", "-42%", "-58%"], rotate: [-2.5, 2.5, -2.5] }
                : { y: ["-53%", "-47%", "-53%"], rotate: [-1, 1, -1] }
          }
          transition={{ duration: moving ? 3.4 : 5.0, repeat: Infinity, ease: "easeInOut" }}
        >
          <CapsuleSvg lineColor={lineColor} />
        </motion.div>
      </motion.div>
    </div>
  );
}
