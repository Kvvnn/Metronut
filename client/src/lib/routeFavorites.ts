export interface FavoriteRoute {
  id: string;
  from: string;
  to: string;
  via?: string;
  time?: string;
  transferCount?: number;
  savedAt: number;
}

const FAVORITE_ROUTES_KEY = "metro_favorite_routes";
const MAX_FAVORITE_ROUTES = 20;

export function getRouteFavoriteId(from: string, to: string, via = "") {
  return [from.trim(), via.trim(), to.trim()].join("|");
}

function readFavoriteRoutes(): FavoriteRoute[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(FAVORITE_ROUTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (route): route is FavoriteRoute =>
        typeof route?.id === "string" &&
        typeof route?.from === "string" &&
        typeof route?.to === "string" &&
        typeof route?.savedAt === "number",
    );
  } catch {
    return [];
  }
}

function writeFavoriteRoutes(routes: FavoriteRoute[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITE_ROUTES_KEY, JSON.stringify(routes));
  window.dispatchEvent(new Event("metro:favorites-changed"));
}

export function getFavoriteRoutes() {
  return readFavoriteRoutes().sort((a, b) => b.savedAt - a.savedAt);
}

export function isFavoriteRoute(from: string, to: string, via = "") {
  const id = getRouteFavoriteId(from, to, via);
  return readFavoriteRoutes().some(route => route.id === id);
}

export function addFavoriteRoute(route: Omit<FavoriteRoute, "id" | "savedAt">) {
  const id = getRouteFavoriteId(route.from, route.to, route.via);
  const nextRoute: FavoriteRoute = {
    ...route,
    id,
    savedAt: Date.now(),
  };
  const routes = readFavoriteRoutes().filter(item => item.id !== id);
  writeFavoriteRoutes([nextRoute, ...routes].slice(0, MAX_FAVORITE_ROUTES));
  return nextRoute;
}

export function removeFavoriteRoute(id: string) {
  writeFavoriteRoutes(readFavoriteRoutes().filter(route => route.id !== id));
}

export function toggleFavoriteRoute(route: Omit<FavoriteRoute, "id" | "savedAt">) {
  const id = getRouteFavoriteId(route.from, route.to, route.via);
  if (readFavoriteRoutes().some(item => item.id === id)) {
    removeFavoriteRoute(id);
    return false;
  }
  addFavoriteRoute(route);
  return true;
}
