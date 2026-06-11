import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import RouteResult from "./pages/RouteResult";
import RouteDetail from "./pages/RouteDetail";
import Riding from "./pages/Riding";
import StationInfo from "./pages/StationInfo";
import MapView from "./pages/MapView";
import Settings from "./pages/Settings";
import TabBar from "./components/TabBar";
function Router() {
  const [location] = useLocation();
  const reducedMotion = useReducedMotion();

  // make sure to consider if you need authentication for certain routes
  return (
    // 화면 전환 시 무중력 드리프트 인 — 페이지가 떠오르듯 진입한다.
    // exit 애니메이션은 sticky/fixed 레이아웃과 충돌하므로 진입만 연출.
    <motion.div
      key={location}
      initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 130, damping: 19, mass: 0.9 }}
    >
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/search">
          <Redirect to="/" replace />
        </Route>
        <Route path="/route-result" component={RouteResult} />
        <Route path="/route-detail/:id" component={RouteDetail} />
        <Route path="/riding" component={Riding} />
        <Route path="/station/:name" component={StationInfo} />
        <Route path="/map" component={MapView} />
        <Route path="/settings" component={Settings} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </motion.div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster position="top-center" offset={16} />
          <div className="max-w-[480px] mx-auto min-h-screen bg-background relative">
            <Router />
            <TabBar />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
