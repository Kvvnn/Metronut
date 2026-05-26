/**
 * 경로 시작 확인 오버레이.
 * 출발지/도착지가 모두 선택되면 표시. via는 있으면 함께 표시.
 */
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MapPin, Plus, X } from "lucide-react";

export default function RouteConfirmDialog({
  open,
  from,
  via,
  to,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  from: string;
  via?: string;
  to: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pt-4"
          style={{
            backgroundColor: "rgba(15, 23, 36, 0.55)",
            // 탭바(52px + safe-area)를 충분히 회피
            paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
          }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: "120%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "120%", opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-3xl bg-white p-5 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#8E8E93]">
                경로 시작
              </span>
              <button
                onClick={onCancel}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-[#F5F5F7] btn-press"
                aria-label="닫기"
              >
                <X size={14} className="text-[#8E8E93]" />
              </button>
            </div>

            {/* Route */}
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EBF4FF]">
                <MapPin size={14} className="text-[#4A90D9]" />
              </span>
              <span className="text-[18px] font-bold text-[#1B2838] truncate flex-1">
                {from}
              </span>
            </div>

            {via && (
              <div className="flex items-center gap-2 ml-3.5 py-1.5">
                <span className="text-[#27AE60] text-[16px]">┃</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EAF7EF]">
                  <Plus size={11} className="text-[#27AE60]" />
                </span>
                <span className="text-[13px] text-[#27AE60] font-semibold truncate">
                  {via} 경유
                </span>
              </div>
            )}
            {!via && (
              <div className="ml-3.5 py-1 flex items-center text-[#C7C7CC]">
                <ArrowRight size={14} className="rotate-90" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF0F0]">
                <MapPin size={14} className="text-[#E74C3C]" />
              </span>
              <span className="text-[18px] font-bold text-[#1B2838] truncate flex-1">
                {to}
              </span>
            </div>

            {/* Question */}
            <p className="mt-5 text-[14px] text-[#1B2838] text-center">
              이 경로로 시작하시겠습니까?
            </p>

            {/* Buttons */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-2xl bg-[#F5F5F7] text-[15px] font-semibold text-[#1B2838] btn-press"
              >
                취소
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 rounded-2xl bg-[#1B2838] text-[15px] font-semibold text-white btn-press"
              >
                시작
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
