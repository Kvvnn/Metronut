import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Search from "./pages/Search";
import RouteResult from "./pages/RouteResult";
import RouteDetail from "./pages/RouteDetail";
import Riding from "./pages/Riding";
import StationInfo from "./pages/StationInfo";
import MapView from "./pages/MapView";
import Settings from "./pages/Settings";
import TabBar from "./components/TabBar";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={Search} />
      <Route path="/route-result" component={RouteResult} />
      <Route path="/route-detail/:id" component={RouteDetail} />
      <Route path="/riding" component={Riding} />
      <Route path="/station/:name" component={StationInfo} />
      <Route path="/map" component={MapView} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" />
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
