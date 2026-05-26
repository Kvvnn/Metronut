/**
 * 환승 안내 미니 시트 — 다음 ride 화면 위에 떠 있는 슬림한 sticky 카드.
 * 자동 선택된 열차 + 도착 ETA + "자세히 보기" 버튼 (picker 펼치기).
 * swipe down으로 dismiss (즉시 다음 ride로 진행).
 */
import { motion } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { ChevronUp, Clock, Train } from "lucide-react";

export interface TransferSegmentData {
  type: "transfer";
  stationName: string;
  fromLineId: string;
  toLineId: string;
  toLineName: string;
  toDirection: string;
  walkMinutes: number;
  fastCar: number;
  fastDoor: number;
}

const TAB_BAR_HEIGHT = 52;
const DISMISS_THRESHOLD_PX = 60;
const DISMISS_VELOCITY = 400;

export default function TransferMiniSheet({
  boardingStationName,
  selectedTrainNo,
  etaMinutes,
  isSimulated,
  toLineColor,
  onShowDetails,
  onDismiss,
}: {
  boardingStationName: string;
  selectedTrainNo: string | null;
  etaMinutes: number | null;
  isSimulated: boolean;
  toLineColor: string;
  onShowDetails: () => void;
  onDismiss: () => void;
}) {
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > DISMISS_THRESHOLD_PX || info.velocity.y > DISMISS_VELOCITY) {
      onDismiss();
    }
  };

  const etaLabel =
    etaMinutes === null
      ? "도착 시간 확인 중"
      : etaMinutes <= 0
      ? "곧 도착"
      : `약 ${etaMinutes}분 후 도착`;

  return (
    <motion.div
      initial={{ y: 200, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 200, opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.65 }}
      onDragEnd={handleDragEnd}
      className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-white rounded-t-2xl shadow-[0_-6px_28px_rgba(0,0,0,0.14)] touch-pan-y select-none"
      style={{
        bottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
      }}
      aria-label="환승 자동 선택 안내. 아래로 스와이프하면 닫습니다."
    >
      <div className="sheet-handle" />
      <div className="px-4 pb-3 pt-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: toLineColor }}
          >
            자동 선택
          </span>
          {isSimulated && (
            <span className="rounded bg-[#FFE9C7] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#C97A1B]">
              시뮬
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Train size={14} className="shrink-0" style={{ color: toLineColor }} />
              <span className="truncate text-[15px] font-bold text-[#1B2838]">
                {selectedTrainNo ? `${selectedTrainNo}${isSimulated ? "" : "호"}` : "선택 중..."}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[12px] text-[#8E8E93]">
              <Clock size={11} className="shrink-0" />
              <span className="truncate">
                {boardingStationName} <span className="font-semibold text-[#1B2838]">{etaLabel}</span>
              </span>
            </div>
          </div>

          <button
            onClick={onShowDetails}
            className="btn-press shrink-0 flex items-center gap-1 rounded-full px-3 py-2 text-[12px] font-semibold text-white"
            style={{ backgroundColor: toLineColor }}
          >
            자세히 보기
            <ChevronUp size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
