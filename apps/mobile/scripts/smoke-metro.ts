import { findRoutes, findRoutesVia, getLineInfo, searchStations } from '../../../shared/metro/pathfinder';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const gangnamResults = searchStations('강남');
assert(gangnamResults.some((station) => station.name === '강남'), '강남역 검색 결과가 없습니다.');

const directRoutes = findRoutes('강남', '홍대입구');
assert(directRoutes.length > 0, '강남 -> 홍대입구 경로를 찾지 못했습니다.');
assert(directRoutes[0].totalTime > 0, '첫 번째 경로의 소요시간이 올바르지 않습니다.');

const viaRoutes = findRoutesVia('강남', '사당', '서울역');
assert(viaRoutes.length > 0, '강남 -> 사당 -> 서울역 경유 경로를 찾지 못했습니다.');

const line2 = getLineInfo('2');
assert(line2?.shortName === '2', '2호선 메타데이터를 찾지 못했습니다.');

console.log(
  JSON.stringify(
    {
      ok: true,
      gangnamLineCount: gangnamResults.find((station) => station.name === '강남')?.lines.length ?? 0,
      directRouteCount: directRoutes.length,
      firstDirectRouteMinutes: directRoutes[0].totalTime,
      viaRouteCount: viaRoutes.length,
    },
    null,
    2,
  ),
);
