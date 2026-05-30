# Project TODO

- [x] Basic homepage layout with metro map
- [x] Navigation tab bar (iOS style)
- [x] Station search with autocomplete (727 stations, 21 lines)
- [x] Route search algorithm (shortest time / fewest transfers / least walking)
- [x] Route result page with multiple options
- [x] Route detail page with transfer info
- [x] Riding page with real-time position tracking
- [x] Station info page with realtime arrivals
- [x] Metro map page (list view)
- [x] Settings page with API key management
- [x] PWA manifest and service worker
- [x] Interactive SVG metro map component
- [x] UX redesign - metro map as home centerpiece
- [x] Metro map coordinate refinement (v3)
- [x] Search → metro map integration (highlight station)
- [x] Fullstack upgrade (web-db-user)
- [x] Home.tsx conflict resolution (remove useAuth import issue)
- [x] API proxy implementation (server-side Seoul Metro API)
- [x] Remove API key from client-side localStorage
- [x] Update Settings page to reflect server-side API key
- [x] Update realtimeApi.ts to use tRPC instead of direct API calls
- [x] 2nd phase feature dummies (dark mode, congestion, offline data)
- [x] Write vitest tests for API proxy
- [x] Metro map coordinate refinement v5 - improved layout with spread coordinates and line separation
- [x] Further refinement: 2호선 rectangular loop shape, transfer station coordinate unification (39 close pairs unified)
- [ ] Metro map coordinate v6 - extract pixel coords directly from reference PNG and interpolate
- [x] 급행/특급 경로 반영 (국토교통부 급행노선 CSV 기준, config 기반 다중 급행: 경인급행·경인특급·경부급행·장항급행·9호선·수인분당·경춘)
- [x] 실시간 위치 API directAt 파싱 → trainType(일반/급행/특급), 탑승중 화면 급행 배지 + "이 급행은 ○○ 통과" 안내

## 급행 관련 추후 작업 (deferred)
- [ ] **공항철도 직통 반영**: 정차 3역(서울역·인천공항T1·T2)인데 역간 거리가 극단적으로 불균등(서울역→T1 ~43분, T1→T2 ~6분)하고 **별도 프리미엄 운임**이라 균일 hop·동일운임 모델로는 부정확. 구간별 실제 소요시간 + 직통 별도운임을 별도 처리해야 함. (현재 `shared/metro/pathfinder.ts`의 `EXPRESS_SERVICES`에서 제외, 사유 주석 있음)
- [ ] **경의선 서울역지선 + 문산-서울역 급행 반영**: metroData에 경의선 서울역 지선(가좌–신촌–서울역) 역/엣지가 미모델링되어 매핑 불가. 지선 데이터 추가 후 `EXPRESS_SERVICES`에 문산-서울역 급행 추가.
- [ ] (참고) CSV의 전 구간 나열형(당고개-오이도, 소요산-인천, 문산-지평)은 통과역이 거의 없어 급행으로 미반영.
