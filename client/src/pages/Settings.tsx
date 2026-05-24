/**
 * 설정 화면
 * Design: iOS 스타일 설정 리스트 - Seoul Flow
 * - 알림 설정
 * - 선호 경로 설정
 * - API 키 설정 (실시간 정보용)
 * - 2차 기능 더미: 다크모드, 언어, 데이터 관리
 * - 앱 정보
 */
import { useState, useEffect } from "react";
import { Bell, Route, Info, ChevronRight, Moon, Vibrate, Globe, Trash2, Database, Shield, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { checkApiKeyStatus } from "@/lib/realtimeApi";

export default function Settings() {
  const [alarmSound, setAlarmSound] = useState(true);
  const [alarmVibrate, setAlarmVibrate] = useState(true);
  const [alarmBefore, setAlarmBefore] = useState("1");
  const [preferRoute, setPreferRoute] = useState("fastest");
  const [showApiInfo, setShowApiInfo] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);

  useEffect(() => {
    checkApiKeyStatus().then(hasKey => setApiConfigured(hasKey));
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="safe-top pt-4 px-5 pb-3">
        <h1 className="text-[28px] font-bold tracking-tight text-[#1B2838]">
          설정
        </h1>
      </header>

      {/* Notification Settings */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="px-4 mt-4"
      >
        <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
          알림
        </h3>
        <div className="ios-card divide-y divide-[#F0F0F2]">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EBF4FF] flex items-center justify-center">
                <Bell size={16} className="text-[#4A90D9]" />
              </div>
              <span className="text-[15px] text-[#1B2838]">알림 소리</span>
            </div>
            <ToggleSwitch checked={alarmSound} onChange={setAlarmSound} />
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FFF3EB] flex items-center justify-center">
                <Vibrate size={16} className="text-[#E67E22]" />
              </div>
              <span className="text-[15px] text-[#1B2838]">진동</span>
            </div>
            <ToggleSwitch checked={alarmVibrate} onChange={setAlarmVibrate} />
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F0FFF4] flex items-center justify-center">
                <Bell size={16} className="text-[#27AE60]" />
              </div>
              <span className="text-[15px] text-[#1B2838]">하차 알림 시점</span>
            </div>
            <select
              value={alarmBefore}
              onChange={(e) => setAlarmBefore(e.target.value)}
              className="text-[14px] text-[#4A90D9] bg-transparent font-medium"
            >
              <option value="1">1정거장 전</option>
              <option value="2">2정거장 전</option>
              <option value="3">3정거장 전</option>
            </select>
          </div>
        </div>
      </motion.section>

      {/* Route Preference */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
        className="px-4 mt-6"
      >
        <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
          경로 설정
        </h3>
        <div className="ios-card divide-y divide-[#F0F0F2]">
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#F5F0FF] flex items-center justify-center">
                <Route size={16} className="text-[#9B59B6]" />
              </div>
              <span className="text-[15px] text-[#1B2838]">선호 경로</span>
            </div>
            <div className="flex gap-2">
              {[
                { value: "fastest", label: "빠른 경로" },
                { value: "fewest", label: "최소 환승" },
                { value: "least-walk", label: "도보 적은" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPreferRoute(opt.value)}
                  className={`flex-1 py-2 rounded-lg text-[13px] font-medium btn-press transition-all ${
                    preferRoute === opt.value
                      ? "bg-[#1B2838] text-white"
                      : "bg-[#F5F5F7] text-[#1B2838]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* API Key Settings - Server Proxy */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="px-4 mt-6"
      >
        <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
          실시간 정보
        </h3>
        <div className="ios-card divide-y divide-[#F0F0F2]">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 btn-press"
            onClick={() => setShowApiInfo(!showApiInfo)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] flex items-center justify-center">
                <Shield size={16} className="text-[#4A90D9]" />
              </div>
              <div className="text-left">
                <span className="text-[15px] text-[#1B2838] block">실시간 도착 정보</span>
                <span className="text-[12px] text-[#8E8E93]">
                  {apiConfigured ? "✓ 서버에서 안전하게 관리 중" : "시뮬레이션 모드"}
                </span>
              </div>
            </div>
            <ChevronRight size={16} className={`text-[#C7C7CC] transition-transform ${showApiInfo ? "rotate-90" : ""}`} />
          </button>

          {showApiInfo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="px-4 py-3"
            >
              <div className="bg-[#F0F7FF] rounded-lg p-3 mb-3">
                <p className="text-[12px] text-[#1B2838] font-medium mb-1">보안 안내</p>
                <p className="text-[11px] text-[#6B7280] leading-relaxed">
                  API 키는 서버 환경변수에 안전하게 저장되어 있습니다. 
                  클라이언트에 노출되지 않으며, 서버를 통해 프록시됩니다.
                </p>
              </div>
              {apiConfigured ? (
                <div className="flex items-center gap-2 text-[12px] text-[#27AE60]">
                  <div className="w-2 h-2 rounded-full bg-[#27AE60] animate-pulse" />
                  실시간 데이터 활성화됨
                </div>
              ) : (
                <div>
                  <p className="text-[12px] text-[#8E8E93] mb-2">
                    현재 시뮬레이션 데이터를 사용 중입니다.
                  </p>
                  <a
                    href="https://data.seoul.go.kr/dataList/OA-12764/F/1/datasetView.do"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[12px] text-[#4A90D9]"
                  >
                    <ExternalLink size={12} />
                    서울 열린데이터 광장에서 API 키 발급
                  </a>
                  <p className="text-[11px] text-[#8E8E93] mt-2 leading-relaxed">
                    관리자에게 API 키를 전달하면 서버에 등록해 드립니다.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.section>

      {/* 2차 기능 더미 - 일반 설정 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="px-4 mt-6"
      >
        <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
          일반
        </h3>
        <div className="ios-card divide-y divide-[#F0F0F2]">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 btn-press"
            onClick={() => toast("다크 모드 기능이 곧 제공됩니다.")}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1B2838] flex items-center justify-center">
                <Moon size={16} className="text-white" />
              </div>
              <div className="text-left">
                <span className="text-[15px] text-[#1B2838] block">다크 모드</span>
                <span className="text-[12px] text-[#8E8E93]">시스템 설정에 따름</span>
              </div>
            </div>
            <span className="text-[10px] bg-[#F0F0F2] text-[#8E8E93] px-1.5 py-0.5 rounded">준비중</span>
          </button>
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 btn-press"
            onClick={() => toast("언어 설정 기능이 곧 제공됩니다.")}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EBF4FF] flex items-center justify-center">
                <Globe size={16} className="text-[#4A90D9]" />
              </div>
              <div className="text-left">
                <span className="text-[15px] text-[#1B2838] block">언어</span>
                <span className="text-[12px] text-[#8E8E93]">한국어</span>
              </div>
            </div>
            <span className="text-[10px] bg-[#F0F0F2] text-[#8E8E93] px-1.5 py-0.5 rounded">준비중</span>
          </button>
        </div>
      </motion.section>

      {/* 2차 기능 더미 - 데이터 관리 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="px-4 mt-6"
      >
        <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
          데이터 관리
        </h3>
        <div className="ios-card divide-y divide-[#F0F0F2]">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 btn-press"
            onClick={() => toast("오프라인 데이터 기능이 곧 제공됩니다.")}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F0FFF4] flex items-center justify-center">
                <Database size={16} className="text-[#27AE60]" />
              </div>
              <div className="text-left">
                <span className="text-[15px] text-[#1B2838] block">오프라인 데이터</span>
                <span className="text-[12px] text-[#8E8E93]">노선 데이터 다운로드</span>
              </div>
            </div>
            <span className="text-[10px] bg-[#F0F0F2] text-[#8E8E93] px-1.5 py-0.5 rounded">준비중</span>
          </button>
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 btn-press"
            onClick={() => {
              // API 키는 보존하고 검색 기록만 삭제
              const apiKey = localStorage.getItem("metro_api_key");
              const prefs = localStorage.getItem("metro_preferences");
              localStorage.clear();
              if (apiKey) localStorage.setItem("metro_api_key", apiKey);
              if (prefs) localStorage.setItem("metro_preferences", prefs);
              toast.success("검색 기록이 초기화되었습니다");
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FFF0F0] flex items-center justify-center">
                <Trash2 size={16} className="text-[#E74C3C]" />
              </div>
              <span className="text-[15px] text-[#1B2838]">검색 기록 초기화</span>
            </div>
            <ChevronRight size={16} className="text-[#C7C7CC]" />
          </button>
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 btn-press"
            onClick={() => toast("개인정보 처리방침 페이지가 곧 제공됩니다.")}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center">
                <Shield size={16} className="text-[#8E8E93]" />
              </div>
              <span className="text-[15px] text-[#1B2838]">개인정보 처리방침</span>
            </div>
            <ChevronRight size={16} className="text-[#C7C7CC]" />
          </button>
        </div>
      </motion.section>

      {/* App Info */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="px-4 mt-6 mb-4"
      >
        <h3 className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
          정보
        </h3>
        <div className="ios-card divide-y divide-[#F0F0F2]">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center">
                <Info size={16} className="text-[#8E8E93]" />
              </div>
              <span className="text-[15px] text-[#1B2838]">앱 버전</span>
            </div>
            <span className="text-[14px] text-[#8E8E93]">1.0.0 (MVP)</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] flex items-center justify-center">
                <Database size={16} className="text-[#8E8E93]" />
              </div>
              <span className="text-[15px] text-[#1B2838]">노선 데이터</span>
            </div>
            <span className="text-[14px] text-[#8E8E93]">21개 노선 · 727개 역</span>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 btn-press ${
        checked ? "bg-[#34C759]" : "bg-[#E0E0E0]"
      }`}
    >
      <motion.div
        className="absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-sm"
        animate={{ left: checked ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
