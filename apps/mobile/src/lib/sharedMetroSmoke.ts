import { findRoutes, searchStations } from '@shared/metro/pathfinder';

export function getSharedMetroSmokeStatus() {
  const stations = searchStations('강남');
  const routes = findRoutes('강남', '홍대입구');

  return {
    hasGangnamStation: stations.some((station) => station.name === '강남'),
    routeCount: routes.length,
    firstRouteMinutes: routes[0]?.totalTime ?? null,
  };
}
