import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FavoriteRoute {
  id: string;
  from: string;
  to: string;
  via?: string;
  time?: string;
  transferCount?: number;
  savedAt: number;
}

const FAVORITE_ROUTES_KEY = 'metro_favorite_routes';
const MAX_FAVORITE_ROUTES = 20;

export function getRouteFavoriteId(from: string, to: string, via = '') {
  return [from.trim(), via.trim(), to.trim()].join('|');
}

function isFavoriteRouteValue(route: unknown): route is FavoriteRoute {
  return (
    typeof route === 'object' &&
    route !== null &&
    typeof (route as FavoriteRoute).id === 'string' &&
    typeof (route as FavoriteRoute).from === 'string' &&
    typeof (route as FavoriteRoute).to === 'string' &&
    typeof (route as FavoriteRoute).savedAt === 'number'
  );
}

async function readFavoriteRoutes(): Promise<FavoriteRoute[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITE_ROUTES_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFavoriteRouteValue);
  } catch {
    return [];
  }
}

async function writeFavoriteRoutes(routes: FavoriteRoute[]) {
  await AsyncStorage.setItem(FAVORITE_ROUTES_KEY, JSON.stringify(routes));
}

export async function getFavoriteRoutes() {
  const routes = await readFavoriteRoutes();
  return routes.sort((a, b) => b.savedAt - a.savedAt);
}

export async function isFavoriteRoute(from: string, to: string, via = '') {
  const id = getRouteFavoriteId(from, to, via);
  const routes = await readFavoriteRoutes();
  return routes.some((route) => route.id === id);
}

export async function addFavoriteRoute(route: Omit<FavoriteRoute, 'id' | 'savedAt'>) {
  const id = getRouteFavoriteId(route.from, route.to, route.via);
  const nextRoute: FavoriteRoute = {
    ...route,
    id,
    savedAt: Date.now(),
  };
  const routes = (await readFavoriteRoutes()).filter((item) => item.id !== id);
  await writeFavoriteRoutes([nextRoute, ...routes].slice(0, MAX_FAVORITE_ROUTES));
  return nextRoute;
}

export async function removeFavoriteRoute(id: string) {
  const routes = await readFavoriteRoutes();
  await writeFavoriteRoutes(routes.filter((route) => route.id !== id));
}

export async function toggleFavoriteRoute(route: Omit<FavoriteRoute, 'id' | 'savedAt'>) {
  const id = getRouteFavoriteId(route.from, route.to, route.via);
  const routes = await readFavoriteRoutes();

  if (routes.some((item) => item.id === id)) {
    await writeFavoriteRoutes(routes.filter((item) => item.id !== id));
    return false;
  }

  const nextRoute: FavoriteRoute = {
    ...route,
    id,
    savedAt: Date.now(),
  };
  await writeFavoriteRoutes([nextRoute, ...routes].slice(0, MAX_FAVORITE_ROUTES));
  return true;
}
