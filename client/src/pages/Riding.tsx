/**
 * 탑승 중 안내 화면
 * Design: Seoul Flow - 실시간 위치 추적 UI
 * - 현재 위치 표시
 * - 남은 역/시간 카운트다운
 * - 하차 알림 설정
 * - 정차역 타임라인
 * - 2차 기능 더미: 혼잡도, 빠른 환승 위치
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Bell, BellOff, BellRing, Minus, Plus, Users, ArrowUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getLineInfo } from "@/lib/pathfinder";

// 시뮬레이션용 더미 데이터
const ridingData = {
  lineId: "2",
  direction: "잠실 방면",
  stations: [
    { name: "홍대입구", isTransfer: true, transferLines: ["gyeongui", "airport"] },
    { name: "합정", isTransfer: true, transferLines: ["6"] },
    { name: "당산", isTransfer: true, transferLines: ["9"] },
    { name: "영등포구청", isTransfer: true, transferLines: ["5"] },
    { name: "문래", isTransfer: false, transferLines: [] },
    { name: "신도림", isTransfer: true, transferLines: ["1"] },
    { name: "대림", isTransfer: true, transferLines: ["7"] },
    { name: "구로디지털단지", isTransfer: false, transferLines: [] },
    { name: "신림", isTransfer: false, transferLines: [] },
    { name: "서울대입구", isTransfer: false, transferLines: [] },
  ],
};

export default function Riding() {
  const [, setLocation] = useLocation();
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmBefore, setAlarmBefore] = useState(1);
  const [currentIdx, setCurrentIdx] = useState(3);
  const line = getLineInfo(ridingData.lineId);
  const lineColor = line?.color || "#00A84D";

  const destinationIdx = ridingData.stations.length - 1;
  const remaining = destinationIdx - currentIdx;
  const remainingTime = remaining * 2;
  const progress = (currentIdx / destinationIdx) * 100;

  // 시뮬레이션: 역 이동
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx(prev => {
        if (prev >= destinationIdx) {
          toast.success("목적지에 도착했습니다!");
          return prev;
        }
        const next = prev + 1;
        if (destinationIdx - next === alarmBefore) {
          toast("곧 도착합니다! 하차 준비하세요.", {
            icon: "🔔",
            duration: 5000,
          });
        }
        return next;
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [alarmBefore]);

  const arrivalTime = new Date();
  arrivalTime.setMinutes(arrivalTime.getMinutes() + remainingTime);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Status Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden"
        style={{ backgroundColor: lineColor }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="safe-top relative z-10 px-5 pt-4 pb-5">
          {/* Line & Direction */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="line-badge text-[12px]" style={{ backgroundColor: "rgba(255,255,255,0.25)" }}>
                {line?.shortName}
              </span>
              <span className="text-white/90 text-[14px] font-medium">{ridingData.direction}</span>
            </div>
            <button
              onClick={() => {
                setAlarmEnabled(!alarmEnabled);
                toast(alarmEnabled ? "알람이 해제되었습니다" : "알람이 설정되었습니다");
              }}
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center btn-press"
            >
              {alarmEnabled ? <BellRing size={18} className="text-white" /> : <BellOff size={18} className="text-white" />}
            </button>
          </div>

          {/* Current Station */}
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-white/70 text-[12px] mb-1">현재 위치</p>
            <h1 className="text-white text-[32px] font-bold tracking-tight leading-tight">
              {ridingData.stations[currentIdx].name}
            </h1>
            {currentIdx < destinationIdx && (
              <p className="text-white/70 text-[13px] mt-1">
                → {ridingData.stations[currentIdx + 1]?.name} 방면 이동 중
              </p>
            )}
          </motion.div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4">
            <div>
              <p className="text-white/60 text-[11px]">남은 역</p>
              <p className="text-white text-[22px] font-bold">{remaining}개</p>
            </div>
            <div>
              <p className="text-white/60 text-[11px]">남은 시간</p>
              <p className="text-white text-[22px] font-bold">{remainingTime}분</p>
            </div>
            <div>
              <p className="text-white/60 text-[11px]">도착 예정</p>
              <p className="text-white text-[22px] font-bold">
                {arrivalTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Progress Bar */}
      <div className="px-4 mt-4">
        <div className="ios-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-[#8E8E93]">진행률</span>
            <span className="text-[12px] font-semibold text-[#1B2838]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[#F0F0F2] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: lineColor }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            />
          </div>
        </div>
      </div>

      {/* Alarm Setting */}
      <div className="px-4 mt-3">
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FFF3EB] flex items-center justify-center">
                <Bell size={18} className="text-[#E67E22]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#1B2838]">하차 알림</p>
                <p className="text-[12px] text-[#8E8E93]">{alarmBefore}정거장 전 알림</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAlarmBefore(Math.max(1, alarmBefore - 1))}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center btn-press"
              >
                <Minus size={14} className="text-[#1B2838]" />
              </button>
              <span className="text-[16px] font-bold text-[#1B2838] w-4 text-center">{alarmBefore}</span>
              <button
                onClick={() => setAlarmBefore(Math.min(5, alarmBefore + 1))}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center btn-press"
              >
                <Plus size={14} className="text-[#1B2838]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2차 기능 더미: 혼잡도 */}
      <div className="px-4 mt-3">
        <button
          onClick={() => toast("칸별 혼잡도 기능이 곧 제공됩니다.")}
          className="w-full ios-card p-4 btn-press"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F5F0FF] flex items-center justify-center">
                <Users size={18} className="text-[#9B59B6]" />
              </div>
              <div className="text-left">
                <p className="text-[14px] font-medium text-[#1B2838]">칸별 혼잡도</p>
                <p className="text-[12px] text-[#8E8E93]">현재 탑승 칸의 혼잡 정보</p>
              </div>
            </div>
            <span className="text-[10px] bg-[#F0F0F2] text-[#8E8E93] px-1.5 py-0.5 rounded">준비중</span>
          </div>
        </button>
      </div>

      {/* Station Timeline */}
      <div className="px-4 mt-4">
        <h3 className="text-[15px] font-bold text-[#1B2838] mb-3">정차역</h3>
        <div className="ios-card overflow-hidden">
          {ridingData.stations.map((station, idx) => {
            const isCurrent = idx === currentIdx;
            const isPast = idx < currentIdx;
            const isDestination = idx === destinationIdx;
            const minutesAway = (idx - currentIdx) * 2;

            return (
              <motion.div
                key={station.name}
                animate={isCurrent ? { backgroundColor: ["rgba(74, 144, 217, 0.05)", "rgba(74, 144, 217, 0.1)", "rgba(74, 144, 217, 0.05)"] } : { backgroundColor: "rgba(0,0,0,0)" }}
                transition={isCurrent ? { duration: 2, repeat: Infinity } : {}}
                className={`flex items-center px-4 py-3 border-b border-[#F0F0F2] last:border-0 ${
                  isPast ? "opacity-40" : ""
                }`}
              >
                {/* Timeline dot */}
                <div className="relative mr-3 flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full border-2 ${
                      isCurrent
                        ? "border-[#4A90D9] bg-[#4A90D9]"
                        : isDestination
                        ? "border-[#E74C3C] bg-[#E74C3C]"
                        : isPast
                        ? "border-[#C7C7CC] bg-[#C7C7CC]"
                        : "border-[#D0D0D0] bg-white"
                    }`}
                  />
                </div>

                {/* Station info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[14px] ${isCurrent || isDestination ? "font-bold" : "font-medium"} ${
                      isPast ? "text-[#8E8E93]" : "text-[#1B2838]"
                    }`}>
                      {station.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-[#4A90D9] bg-[#EBF4FF] px-1.5 py-0.5 rounded">
                        현재
                      </span>
                    )}
                    {isDestination && (
                      <span className="text-[10px] font-semibold text-[#E74C3C] bg-[#FFF0F0] px-1.5 py-0.5 rounded">
                        하차
                      </span>
                    )}
                    {station.isTransfer && !isPast && !isCurrent && (
                      <span className="text-[10px] text-[#E67E22] bg-[#FFF3EB] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <ArrowUpDown size={8} />환승
                      </span>
                    )}
                  </div>
                  {station.isTransfer && station.transferLines.length > 0 && !isPast && (
                    <div className="flex items-center gap-1 mt-1">
                      {station.transferLines.map(lineId => {
                        const transferLine = getLineInfo(lineId);
                        return (
                          <span
                            key={lineId}
                            className="line-badge text-[8px]"
                            style={{ backgroundColor: transferLine?.color || "#888", minWidth: "auto", height: "16px", padding: "0 4px" }}
                          >
                            {transferLine?.shortName || lineId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Time */}
                {!isPast && !isCurrent && (
                  <span className="text-[12px] text-[#8E8E93]">
                    {minutesAway}분
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 2차 기능 더미: 빠른 환승 */}
      <div className="px-4 mt-4 mb-4">
        <button
          onClick={() => toast("빠른 환승 안내 기능이 곧 제공됩니다.")}
          className="w-full ios-card p-4 btn-press"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EBF4FF] flex items-center justify-center">
              <ArrowUpDown size={18} className="text-[#4A90D9]" />
            </div>
            <div className="text-left flex-1">
              <p className="text-[14px] font-medium text-[#1B2838]">빠른 환승 안내</p>
              <p className="text-[12px] text-[#8E8E93]">다음 환승역에서 최적 위치 안내</p>
            </div>
            <span className="text-[10px] bg-[#F0F0F2] text-[#8E8E93] px-1.5 py-0.5 rounded">준비중</span>
          </div>
        </button>
      </div>
    </div>
  );
}
