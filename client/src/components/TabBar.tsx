import { useLocation } from "wouter";
import { Home, Search, Map, Train, Settings } from "lucide-react";

const tabs = [
  { path: "/", icon: Home, label: "홈" },
  { path: "/search", icon: Search, label: "검색" },
  { path: "/riding", icon: Train, label: "탑승중" },
  { path: "/settings", icon: Settings, label: "설정" },
];

// 탭 바를 숨길 페이지 (홈은 자체 하단 UI가 있으므로 숨김)
const hiddenPaths = ["/", "/route-result", "/route-detail", "/station", "/map"];

export default function TabBar() {
  const [location, setLocation] = useLocation();

  const shouldHide = hiddenPaths.some(p => {
    if (p === "/") return location === "/";
    return location.startsWith(p);
  });
  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] tab-bar safe-bottom z-50">
      <div className="flex items-center justify-around h-[52px] px-2">
        {tabs.map((tab) => {
          const isActive = location === tab.path;
          const Icon = tab.icon;
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
