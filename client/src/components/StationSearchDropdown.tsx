/**
 * Home 검색 필드를 탭했을 때 inline으로 펼쳐지는 역 검색 드롭다운.
 * 별도 페이지로 이동하지 않고 같은 화면에서 자동완성으로 역 선택.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { searchStations } from "@/lib/pathfinder";
import type { Line } from "@/lib/pathfinder";

const POPULAR = [
  "강남",
  "홍대입구",
  "서울역",
  "잠실",
  "신도림",
  "왕십리",
  "여의도",
  "사당",
];

export default function StationSearchDropdown({
  open,
  field,
  onSelect,
  onClose,
}: {
  open: boolean;
  field: "from" | "via" | "to" | null;
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ name: string; lines: Line[] }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 드롭다운 열릴 때 검색어 초기화 + input focus
  useEffect(() => {
    if (open) {
      setQuery("");
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open, field]);

  // 자동완성
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setResults(searchStations(query));
  }, [query]);

  const placeholder =
    field === "from" ? "출발역 검색" : field === "to" ? "도착역 검색" : "경유역 검색";
  const accentColor =
    field === "from" ? "#4A90D9" : field === "to" ? "#E74C3C" : "#27AE60";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30"
          />

          {/* Dropdown panel — Home 검색 카드 바로 아래에서 슬라이드 다운 */}
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 safe-top"
            style={{ top: 0 }}
          >
            <div className="px-4 pt-3 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] rounded-b-2xl">
              {/* 입력 */}
              <div
                className="flex items-center gap-2 bg-[#F5F5F7] rounded-2xl px-3 py-3"
                style={{ borderLeft: `3px solid ${accentColor}` }}
              >
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent text-[15px] text-[#1B2838] placeholder:text-[#8E8E93] outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="p-1 btn-press"
                    aria-label="검색어 지우기"
                  >
                    <X size={14} className="text-[#8E8E93]" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-[13px] text-[#4A90D9] font-semibold ml-1 btn-press px-2 py-1 rounded-lg"
                >
                  취소
                </button>
              </div>

              {/* 결과 */}
              <div className="mt-3 max-h-[60vh] overflow-y-auto">
                {results.length > 0 ? (
                  <div className="ios-card divide-y divide-[#F0F0F2] mb-3">
                    {results.map((s, idx) => (
                      <motion.button
                        key={s.name}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02, duration: 0.18 }}
                        className="w-full flex items-center px-4 py-3 btn-press"
                        onClick={() => {
                          onSelect(s.name);
                          setQuery("");
                        }}
                      >
                        <div className="flex-1 text-left">
                          <span className="text-[15px] font-medium text-[#1B2838]">
                            {s.name}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {s.lines.map(line => (
                            <span
                              key={line.id}
                              className="line-badge text-[10px]"
                              style={{ backgroundColor: line.color }}
                            >
                              {line.shortName}
                            </span>
                          ))}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="py-4">
                    {query ? (
                      <p className="text-[13px] text-[#8E8E93] text-center mb-4">
                        검색 결과가 없습니다
                      </p>
                    ) : null}
                    <p className="text-[11px] text-[#8E8E93] mb-2 px-1">
                      자주 검색하는 역
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {POPULAR.map(name => (
                        <button
                          key={name}
                          onClick={() => {
                            onSelect(name);
                            setQuery("");
                          }}
                          className="px-3 py-1.5 bg-[#F5F5F7] rounded-full text-[12px] font-medium text-[#1B2838] btn-press"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
