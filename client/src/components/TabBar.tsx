import { useLocation } from "wouter";
import { Search, Train, Settings } from "lucide-react";

const tabs = [
  { path: "/", icon: Search, label: "검색" },
  { path: "/riding", icon: Train, label: "탑승중", isPrimary: true },
  { path: "/settings", icon: Settings, label: "설정" },
];

// 탭 바를 숨길 페이지
const hiddenPaths = ["/route-result", "/route-detail", "/station", "/map"];

const PRIMARY_COLOR = "#4A90D9";

export default function TabBar() {
  const [location, setLocation] = useLocation();

  const shouldHide = hiddenPaths.some(p => {
    return location.startsWith(p);
  });
  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] tab-bar safe-bottom z-50">
      <div className="flex items-center justify-around h-[52px] px-2">
        {tabs.map(tab => {
          const isActive = location === tab.path;
          const Icon = tab.icon;

          if (tab.isPrimary) {
            // 메인 탭 (탑승중): point color로 강조, 살짝 살짝 큰 사이즈, 항상 시각적 우선
            return (
              <button
                key={tab.path}
                onClick={() => setLocation(tab.path)}
                className="flex flex-col items-center justify-center gap-0.5 w-16 h-full btn-press relative"
                aria-label={tab.label}
              >
                <div
                  className="flex items-center justify-center rounded-2xl shadow-sm transition-transform duration-200"
                  style={{
                    width: "38px",
                    height: "38px",
                    backgroundColor: PRIMARY_COLOR,
                    transform: isActive ? "scale(1.05)" : "scale(1)",
                    boxShadow: isActive
                      ? `0 6px 18px ${PRIMARY_COLOR}55`
                      : `0 3px 10px ${PRIMARY_COLOR}30`,
                  }}
                >
                  <Icon size={20} strokeWidth={2.2} className="text-white" />
                </div>
                <span
                  className="text-[9.5px] font-semibold tracking-tight mt-0.5"
                  style={{ color: isActive ? PRIMARY_COLOR : "#8E8E93" }}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => setLocation(tab.path)}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full btn-press"
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.6}
                className={`transition-colors duration-200 ${
                  isActive ? "text-[#1B2838]" : "text-[#8E8E93]"
                }`}
              />
              <span
                className={`text-[10px] font-medium tracking-tight transition-colors duration-200 ${
                  isActive ? "text-[#1B2838]" : "text-[#8E8E93]"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
