/**
 * 탑승 안내 미니 시트 — 현재 ride 화면 위에 떠 있는 슬림한 bottom sheet.
 * 환승 중에는 자동 선택된 열차를, 일반 탑승 중에는 선택한 열차 요약을 표시한다.
 * 상단 진행 레일을 탭하거나 위로 끌면 시트가 확장되면서 열차 선택 picker가 나타난다.
 */
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { useEffect, useRef } from "react";
import type { MouseEvent, PointerEvent, ReactNode } from "react";
import type { FastTransferInfo } from "@shared/fastTransfer";

export interface TransferSegmentData {
  type: "transfer";
  stationName: string;
  fromLineId: string;
  toLineId: string;
  toLineName: string;
  toDirection: string;
  walkMinutes: number;
  walkSeconds?: number;
  walkDistanceMeters?: number;
  fastTransfer?: FastTransferInfo | null;
}

const TAB_BAR_HEIGHT = 52;
const EXPAND_THRESHOLD_PX = -34;
const EXPAND_VELOCITY = -360;
const DISMISS_THRESHOLD_PX = 80;
const DISMISS_VELOCITY = 500;

export default function TransferMiniSheet({
  topSlot,
  expanded,
  onToggleExpand,
  onDismiss,
  detailsSlot,
  children,
}: {
  topSlot?: ReactNode;
  expanded: boolean;
  onToggleExpand: () => void;
  onDismiss?: () => void;
  detailsSlot?: ReactNode;
  children?: ReactNode;
}) {
  const dragControls = useDragControls();
  const didDragRef = useRef(false);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const isTouchDraggingRef = useRef(false);

  useEffect(() => {
    const handle = dragHandleRef.current;
    if (!handle) return;

    const preventPageScroll = (event: TouchEvent) => {
      if (!isTouchDraggingRef.current) return;
      event.preventDefault();
    };
    const stopTouchDrag = () => {
      isTouchDraggingRef.current = false;
    };

    handle.addEventListener("touchmove", preventPageScroll, { passive: false });
    window.addEventListener("touchend", stopTouchDrag);
    window.addEventListener("touchcancel", stopTouchDrag);

    return () => {
      handle.removeEventListener("touchmove", preventPageScroll);
      window.removeEventListener("touchend", stopTouchDrag);
      window.removeEventListener("touchcancel", stopTouchDrag);
    };
  }, []);

  const handleDragPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") {
      isTouchDraggingRef.current = true;
    }
    dragControls.start(event);
  };

  const handleTopSlotClick = (event: MouseEvent<HTMLDivElement>) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    onToggleExpand();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    isTouchDraggingRef.current = false;
    window.setTimeout(() => {
      didDragRef.current = false;
    }, 0);

    if (!expanded && (info.offset.y < EXPAND_THRESHOLD_PX || info.velocity.y < EXPAND_VELOCITY)) {
      onToggleExpand();
      return;
    }

    if (info.offset.y > DISMISS_THRESHOLD_PX || info.velocity.y > DISMISS_VELOCITY) {
      if (expanded) {
        onToggleExpand();
      } else if (onDismiss) {
        onDismiss();
      }
    }
  };

  // iOS smooth easing — 펼침/접힘 시 부드러운 감속
  const smoothEase = [0.32, 0.72, 0, 1] as const;

  return (
    <motion.div
      initial={{ y: 280, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 280, opacity: 0 }}
      transition={{
        y: { duration: 0.46, ease: smoothEase },
        opacity: { duration: 0.28, ease: "easeOut" },
      }}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.45, bottom: 0.65 }}
      onDragStart={() => {
        didDragRef.current = true;
      }}
      onDragEnd={handleDragEnd}
      className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-white rounded-t-2xl shadow-[0_-6px_28px_rgba(0,0,0,0.14)] select-none overflow-hidden overscroll-contain"
      style={{
        bottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
      }}
      aria-label="탑승 안내 하단 패널"
    >
      {topSlot && (
        <div
          ref={dragHandleRef}
          className="cursor-grab touch-none overscroll-contain bg-[#F8F9FB] active:cursor-grabbing"
          style={{ touchAction: "none", WebkitUserSelect: "none" }}
          onPointerDown={handleDragPointerDown}
          onPointerUp={() => {
            isTouchDraggingRef.current = false;
          }}
          onPointerCancel={() => {
            isTouchDraggingRef.current = false;
          }}
          onClick={handleTopSlotClick}
        >
          {topSlot}
        </div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (detailsSlot || children) && (
          <motion.div
            key="expanded-area"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.42, ease: smoothEase },
              opacity: { duration: 0.22, ease: "easeOut", delay: 0.05 },
            }}
            className="overflow-hidden border-t border-[#F0F0F2]"
          >
            {detailsSlot}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
