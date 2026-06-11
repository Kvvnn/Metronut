# 모바일 ↔ 웹 UI 완전 일치 작업 계획 (페이즈)

목표: Expo 모바일 앱의 모든 화면을 웹(`client/`)과 **시각적으로 동일**하게 만든다.
진행 방식: `/loop`로 **한 페이즈씩** 진행. 각 페이즈는 독립적으로 검증·완료 가능하도록 구성.

## 이미 완료된 것 (기준선)
- ✅ 색/테마 토큰을 웹 iOS 팔레트로 교체 (네이비/파랑/쿨그레이 + iOS 카드 그림자)
- ✅ 전 화면 하드코딩 베이지/그린 리터럴 → 웹 쿨톤 치환
- ✅ 홈을 지도-중심 구조로 재구성(시범): 지도 히어로 + 떠있는 검색카드 + 하단 즐겨찾기 시트(탭 토글)
- ✅ `MetroOfficialMap`을 controlled 컴포넌트로 리팩터(selections/onStationRoleSelect)

## 공통 검증 (모든 페이즈 끝에)
```bash
cd apps/mobile && npx tsc --noEmit && npx expo lint && npx expo-doctor
# 루트: pnpm check && pnpm test
```
폰 확인: `pnpm mobile:start` → Expo Go

## 원천적 한계 (사전 합의)
웹(HTML/SVG/CSS)과 RN은 렌더링 엔진이 달라 **글자 렌더링·backdrop-blur·일부 그림자**는 100% 픽셀 동일 불가. 목표는 "구분 어려운 수준의 동일".

---

## Phase 1 — 디자인 기반(폰트·공통 컴포넌트·애니메이션) ✅
**왜 먼저:** 이후 모든 페이즈가 이 위에 쌓인다.
- [x] Pretendard 폰트 추가(`expo-font`, 6개 정적 굵기 OTF) → 웹과 동일 서체. `lib/fonts.ts` weight→family 매핑 + `apply-global-font.ts` 가 Text/TextInput 전역 치환
- [x] `PressableScale` 공통 컴포넌트(웹 `.btn-press` = 눌렀을 때 scale 0.97, ease-out-expo)
- [x] `BottomSheet` 공통 컴포넌트: **실제 드래그 제스처**(react-native-gesture-handler Pan + reanimated spring), collapse/expand 스냅, 핸들바
- [x] 등장 애니메이션 헬퍼(`lib/animations.ts`: fade/slideUp/stagger, 웹 ease `[0.23,1,0.32,1]` = `easeOutExpo`)
- [x] iOS 공통 UI 프리미티브: `Card` / `Divider` / `Badge` (`components/ui/`)
- [x] 루트에 `GestureHandlerRootView` + `useFonts` 게이트 + 스플래시 제어
**완료 기준:** 폰트가 웹과 같게 보이고, 공통 시트/버튼이 데모에서 동작. → tsc/lint 통과, 컴포넌트 준비 완료(다음 페이즈에서 화면 적용).

## Phase 2 — 홈 마무리 (4/5)
- [x] 하단 즐겨찾기 시트를 Phase 1 `BottomSheet`로 교체(탭 토글 → 진짜 드래그/스냅, `sheetAnchor` 절대배치)
- [x] 검색카드 등장 애니메이션(`slideDown` = 웹 y:-20→0 fade) + 시트 드래그 등장
- [x] 지도 초기 줌/위치를 웹(3배 확대 시작)과 일치 — `DEFAULT_SCALE=0.72`(이전 0.24의 3배), 첫 레이아웃에 코어 중앙 정렬(`getInitialTransform`), 리셋도 동일
- [ ] 역 탭 메뉴를 웹 팝오버 스타일로 — **보류**: 마커 앵커드 팝오버는 위치/클램핑 온디바이스 튜닝 필요. 현재 하단 액션 카드 유지(기능 동일)
- [x] 경로 확인을 웹 `RouteConfirmDialog`와 동일한 모달로 — `RouteConfirmModal`(하단 슬라이드업 + 백드롭, 핀/경유/시작·취소)
**완료 기준:** 홈이 웹 홈과 상호작용까지 거의 동일. → 팝오버 1건 제외 충족. tsc/lint 통과.

## Phase 3 — 노선 탭(웹 MapView)
- [ ] 웹 `MapView`와 동일 레이아웃: 세그먼트(지도/목록), 지도 뷰, 목록 뷰
- [ ] 목록 뷰: 가로 스크롤 노선 선택칩 + 타임라인 점 + 환승 배지
- [ ] 헤더/타이틀/간격 일치
**완료 기준:** '노선' 탭이 웹 노선도 페이지와 동일.

## Phase 4 — 경로 결과 + 경로 상세
- [ ] `RouteResult`: 카드 레이아웃 정밀 일치(라벨/소요시간/노선 인디케이터/패턴/환승·역수·요금 행), 스태거 등장, 카드 무중력 부유(`space-float`)
- [ ] `RouteDetail`: 구간 타임라인 정밀 일치, 즐겨찾기 별
- [ ] '탑승 안내 시작' 버튼을 웹의 딥스페이스(별 흐름 `Starfield` + 그라데이션)로 — Phase 8 에셋 의존 시 우선 그라데이션만
**완료 기준:** 두 화면이 웹과 동일.

## Phase 5 — 역 정보(StationInfo)
- [ ] 실시간 도착 레이아웃, 첫차·막차 카드, 환승 정보, 출구 정보 섹션, 빠른 환승 안내
- [ ] 즐겨찾기(집/회사/학교) 버튼 레이아웃 일치
**완료 기준:** 역 정보 화면이 웹과 동일.

## Phase 6 — 설정(Settings)
- [ ] 웹 iOS 설정 리스트 정밀 일치: 앱 아이콘 헤더, **색상 아이콘 칩**(파랑/오렌지/그린/퍼플/레드 틴트), 알림·경로·데이터소스·일반·데이터관리·정보 섹션
- [ ] 다크모드 토글 행(Phase 9 와 연동)
**완료 기준:** 설정 화면이 웹과 동일.

## Phase 7 — 탑승 안내(Riding) ※ 가장 큼, 2개로 분할 가능
**7a 레이아웃/안내**
- [ ] 상단 sticky 미니 네비, 스크롤 안내 UI, 진행 레일 + 열차 마커, 구간 진행률
**7b 열차 선택 드로어 + 환승**
- [ ] 하단 드래그 열차 선택 드로어(Phase 1 시트), 환승 미니시트, 미리선택 패널
**완료 기준:** 탑승 안내가 웹과 동일(상호작용 포함).

## Phase 8 — 우주 테마 연출 & 마이크로 인터랙션
- [ ] `Starfield`, `VoyageTrack`을 `react-native-svg`(또는 Skia)로 이식
- [ ] `space-card` 그라데이션, `space-float` 무중력 애니메이션
- [ ] 전역 `btn-press` scale 적용, prefers-reduced-motion 대응
**완료 기준:** 웹의 우주 연출이 모바일에도 동일하게 표현.

## Phase 9 — 다크 모드
- [ ] 웹 `.dark` 토큰을 모바일 테마에 추가(라이트/다크 팔레트)
- [ ] 테마 컨텍스트 + 시스템 연동(`use-color-scheme`) + 설정 토글 연결
- [ ] 전 화면 다크 검수
**완료 기준:** 다크 모드가 웹과 동일하게 동작.

---

## 권장 순서
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
(1은 기반이라 필수 선행. 3~6은 서로 독립이라 순서 바꿔도 됨. 8·9는 마감 단계.)

## loop 사용 예시
```
/loop Phase 2 작업해줘. apps/mobile/UI-PARITY-PLAN.md 의 Phase 2 항목을 모두 구현하고 검증까지.
```
