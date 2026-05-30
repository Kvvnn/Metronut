# Metronut Expo Port PRD

## 1. 목적

Metronut 웹앱의 핵심 지하철 이동 경험을 iPhone용 Expo 앱으로 포팅한다. 첫 버전의 목표는 웹과 동일한 전체 기능 복제가 아니라, 실제 이동 중인 사용자가 빠르게 경로를 찾고 탑승 중 안내를 확인할 수 있는 모바일 네이티브 경험을 안정적으로 제공하는 것이다.

## 2. 배경

현재 웹앱은 Vercel에 배포되어 있고, 루트 웹 빌드와 분리된 Expo 앱 뼈대가 `apps/mobile`에 생성되어 있다. 모바일 앱은 현재 iOS App Store 버전의 Expo Go 호환성을 위해 Expo SDK 54 기준으로 구성한다.

웹앱의 주요 기능은 다음과 같다.

- 노선도 기반 출발/경유/도착역 선택
- 역 검색 자동완성
- 경로 결과 목록
- 경로 상세 타임라인
- 빠른 환승 칸 안내
- 경로 및 역 즐겨찾기
- 역 상세 실시간 도착 정보
- 탑승 중 열차 위치/하차 알림/환승 안내
- 노선도 지도/목록 화면
- 설정, 시뮬레이션 데이터 토글

## 3. 제품 목표

1. 사용자는 iPhone에서 출발역과 도착역을 검색하거나 선택해 경로를 찾을 수 있다.
2. 사용자는 경로별 소요시간, 환승 횟수, 환승 이동 정보를 비교할 수 있다.
3. 사용자는 선택한 경로의 상세 타임라인과 빠른 환승 정보를 확인할 수 있다.
4. 사용자는 탑승 중 현재 구간, 남은 역, 환승/하차 알림을 확인할 수 있다.
5. 웹의 경로 계산 로직과 데이터셋은 가능한 한 공유해 결과 불일치를 줄인다.
6. Vercel 웹 배포와 Expo 앱 개발은 서로 빌드/배포 부담을 주지 않는다.

## 4. 비목표

- v1에서 웹 SVG 노선도를 1:1로 완전 재현하지 않는다.
- v1에서 App Store 배포, EAS Submit, 푸시 알림 인증서 설정까지 포함하지 않는다.
- v1에서 Android 완성도는 iOS와 동일한 수준으로 보장하지 않는다.
- v1에서 모든 웹 UI 컴포넌트를 React Native 컴포넌트로 일괄 변환하지 않는다.
- 웹의 `framer-motion`, DOM 이벤트, `window.localStorage` 의존 코드를 그대로 가져오지 않는다.

## 5. 대상 사용자

주 사용자는 서울/수도권 지하철을 자주 이용하는 iPhone 사용자다. 앱은 이동 중 한 손 사용, 짧은 확인 시간, 불안정한 네트워크 상황을 전제로 설계한다.

## 6. 핵심 사용자 시나리오

### 6.1 경로 찾기

사용자는 앱을 열고 출발역과 도착역을 입력한다. 필요하면 경유역을 추가한다. 검색 결과에서 역명과 노선 배지를 확인하고 역을 선택한다. 검색 버튼을 누르면 여러 경로 후보를 볼 수 있다.

### 6.2 경로 비교

사용자는 빠른 경로, 편한 경로, 도보 적은 경로 등 후보를 비교한다. 각 후보는 소요시간, 도착 예정 시각, 환승 횟수, 이동 역 수, 환승 이동 시간, 요금을 보여준다.

### 6.3 경로 상세 확인

사용자는 선택한 경로에서 노선별 탑승 구간, 환승 구간, 빠른 환승 칸, 행선지 정보를 확인한다. 마음에 드는 경로는 즐겨찾기에 저장한다.

### 6.4 탑승 안내

사용자는 경로 상세에서 탑승 안내를 시작한다. 앱은 현재 구간, 선택 열차, 진행률, 다음 환승/하차 지점, 알림 시점을 보여준다. 실시간 열차 위치 API를 사용할 수 없으면 시뮬레이션 상태를 명확히 표시한다.

### 6.5 역 정보 확인

사용자는 역 상세에서 노선별 실시간 도착 정보, 첫차/막차 정보, 집/회사/학교 즐겨찾기 설정을 확인한다.

## 7. 기능 요구사항

### P0: 모바일 MVP

1. 앱 내 라우팅
   - Expo Router 기반 화면 구조를 사용한다.
   - 하단 탭은 `홈`, `노선`, `설정`으로 시작한다.
   - 경로 결과/상세/탑승/역 상세는 Stack 화면으로 진입한다.

2. 역 검색
   - 출발역, 도착역, 경유역 검색을 지원한다.
   - 역명 검색 결과에 환승 노선 배지를 표시한다.
   - 인기 역 바로 선택을 지원한다.

3. 경로 계산
   - 웹의 `pathfinder` 순수 로직을 모바일에서 공유한다.
   - `findRoutes`, `findRoutesVia`, `calculateArrivalTime`, `getLineInfo` 결과가 웹과 동일해야 한다.
   - 운행 시간 제한으로 경로가 불가능한 경우 안내 문구를 제공한다.

4. 경로 결과
   - 경로 후보 목록을 표시한다.
   - 각 경로의 소요시간, 환승 횟수, 역 수, 환승 이동 시간, 요금을 표시한다.
   - 후보 선택 시 경로 상세로 이동한다.

5. 경로 상세
   - 전체 요약 카드와 구간 타임라인을 표시한다.
   - 탑승 구간, 환승 구간을 구분한다.
   - 빠른 환승 정보가 있으면 칸/문 정보를 표시한다.
   - 경로 즐겨찾기 추가/삭제를 지원한다.

6. 로컬 저장
   - 웹의 `localStorage` 의존 코드는 모바일에서 AsyncStorage 기반 저장소로 추상화한다.
   - 경로 즐겨찾기, 역 즐겨찾기, 시뮬레이션 설정을 저장한다.

7. API 연결
   - 모바일 앱은 `EXPO_PUBLIC_API_BASE_URL`을 사용해 Vercel API를 호출한다.
   - `localhost`를 기본 API 주소로 사용하지 않는다.
   - 실시간 도착/열차 위치 요청 실패 시 시뮬레이션 폴백을 제공한다.

### P1: 탑승 안내

1. 탑승 세션
   - 경로 상세에서 전체 route payload를 넘겨 탑승 안내를 시작한다.
   - 현재 구간, 선택 열차, 알림 설정을 앱 재진입 후에도 복원한다.

2. 열차 위치
   - `/api/trpc/metro.getTrainPositions`를 통해 노선별 열차 위치를 조회한다.
   - 선택한 방향과 맞는 열차를 우선 표시한다.
   - API 장애/키 없음/빈 응답 상태를 UI에 표시한다.

3. 알림 UX
   - v1 Expo Go 단계에서는 실제 push/local notification을 필수로 하지 않는다.
   - 화면 내 알림 상태, 진동/소리 설정 UI를 먼저 구현한다.
   - development build 전환 후 `expo-notifications`를 붙인다.

### P2: 노선도

1. 노선 목록
   - 전체 노선 목록, 노선별 역 목록을 먼저 구현한다.
   - 역 선택 시 역 상세로 이동한다.

2. 지도형 노선도
   - 웹의 공식 PNG + 좌표 오버레이 방식을 React Native에서 재구현한다.
   - `react-native-svg` 또는 이미지 + 절대 배치 마커 조합을 검토한다.
   - 확대/축소/이동은 `react-native-gesture-handler` 기반으로 구현한다.
   - v1에서는 검색 중심 UX가 우선이며, 지도형 노선도는 P2로 둔다.

### P3: 네이티브 완성도

- development build 도입
- 로컬 알림
- 햅틱 피드백
- 앱 아이콘/스플래시 최종화
- EAS Build 설정
- TestFlight 배포
- 딥링크/Universal Links

## 8. 화면 구조

```txt
apps/mobile/src/app/
  _layout.tsx
  (tabs)/
    _layout.tsx
    index.tsx          # 홈: 역 검색 + 즐겨찾기
    lines.tsx          # 노선/역 목록
    settings.tsx       # 설정
  route-result.tsx     # 경로 후보
  route-detail/[id].tsx
  riding.tsx
  station/[name].tsx
```

## 9. 기술 설계

### 9.1 코드 공유 전략

웹의 `client/src/lib/pathfinder.ts`는 DOM 의존이 거의 없는 핵심 로직이므로 `shared/metro`로 이동한다. 모바일과 웹은 같은 경로 계산 모듈을 import한다.

권장 분리:

```txt
shared/
  metro/
    pathfinder.ts
    routeServiceWindow.ts
    firstLastTrain.ts
    serviceSchedule.ts
    realtimeTypes.ts
    storageTypes.ts
```

웹 전용:

```txt
client/src/lib/realtimeApi.ts
client/src/lib/*Favorites.ts
```

모바일 전용:

```txt
apps/mobile/src/lib/realtimeApi.ts
apps/mobile/src/lib/storage.ts
apps/mobile/src/lib/routeFavorites.ts
apps/mobile/src/lib/stationFavorites.ts
```

### 9.2 API 클라이언트

웹은 상대 경로 `/api/trpc/...`를 사용하지만, 모바일은 절대 URL이 필요하다.

모바일 API 클라이언트는 다음 규칙을 따른다.

- `EXPO_PUBLIC_API_BASE_URL` 필수
- fetch URL은 `${API_BASE_URL}/api/trpc/...`
- 네트워크 실패 시 UI가 멈추지 않고 시뮬레이션 데이터로 폴백
- API 키는 앱에 넣지 않고 Vercel 서버 환경변수에 둔다.

### 9.3 저장소

웹 `localStorage`를 직접 공유하지 않는다. 저장소 인터페이스를 먼저 정의한다.

```ts
interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

웹은 `localStorage`, 모바일은 `AsyncStorage` 구현체를 사용한다.

### 9.4 UI 포팅 원칙

- Tailwind/Radix/lucide-react/framer-motion 코드는 그대로 포팅하지 않는다.
- React Native 기본 컴포넌트와 `StyleSheet`로 재작성한다.
- 아이콘은 `@expo/vector-icons`를 우선 사용한다.
- 모션은 MVP에서 최소화하고, 필요 시 Reanimated로 구현한다.
- 모든 터치 타겟은 최소 44pt 이상으로 만든다.
- 리스트는 `ScrollView` 남용 대신 큰 데이터에는 `FlatList`를 사용한다.

## 10. 데이터 요구사항

모바일 앱에 포함해야 하는 정적 데이터:

- `metroData.json`
- `officialTransferTimes`
- `officialFastTransfers`
- `firstLastTrain.json`
- `serviceSchedule.json`
- `officialMapCoords.json`는 P2 지도형 노선도에서 사용

데이터 파일은 웹과 모바일이 중복으로 들고 있지 않도록 `shared` 또는 `apps/mobile/assets/data` 전략을 결정한다. MVP에서는 import 안정성을 우선해 `shared`로 옮기는 방식을 권장한다.

## 11. 구현 단계

### Phase 0: 기반 정리

- `apps/mobile` SDK 54 상태 유지
- `EXPO_PUBLIC_API_BASE_URL` 설정
- 하단 탭/Stack 라우팅 구성
- 공통 색상/간격/타입 스타일 정의

완료 기준:

- `pnpm mobile:start`로 iPhone Expo Go에서 앱이 열린다.
- `pnpm --dir apps/mobile exec tsc --noEmit` 통과
- `pnpm mobile:lint` 통과

### Phase 1: 순수 로직 공유

- `pathfinder`와 관련 정적 데이터를 shared로 이동
- 웹 import 경로 갱신
- 모바일에서 경로 계산 smoke test 작성

완료 기준:

- 웹 경로 결과와 모바일 경로 결과가 주요 샘플에서 동일하다.
- 루트 `pnpm build` 통과
- 모바일 타입체크 통과

### Phase 2: 홈/검색/경로 결과

- 홈 검색 UI 구현
- 역 자동완성 구현
- 경로 결과 화면 구현
- 경유역 지원

완료 기준:

- 강남 → 홍대입구 경로 검색 가능
- 경유역 포함 검색 가능
- 경로 후보 1개 이상 표시

### Phase 3: 경로 상세/즐겨찾기

- 경로 상세 타임라인 구현
- 빠른 환승 칸 안내 구현
- AsyncStorage 기반 경로 즐겨찾기 구현

완료 기준:

- 경로 상세에서 구간별 안내 확인 가능
- 경로 저장/삭제 후 앱 재시작에도 유지

### Phase 4: 역 상세/실시간 정보

- 역 상세 화면 구현
- 실시간 도착 API 연결
- 첫차/막차 정보 표시
- 집/회사/학교 즐겨찾기 구현

완료 기준:

- 역 상세에서 노선별 도착 정보 표시
- API 실패 시 시뮬레이션 상태 표시

### Phase 5: 탑승 안내

- route payload 직렬화
- 현재 구간/진행률/남은 역 표시
- 열차 위치 조회
- 화면 내 하차 알림 상태 구현

완료 기준:

- 경로 상세에서 탑승 안내 진입 가능
- 선택한 구간의 열차 후보 표시
- 시뮬레이션 모드에서도 탑승 흐름 테스트 가능

### Phase 6: 노선 목록/지도

- 노선 목록과 역 목록 구현
- 공식 지도 이미지/좌표 오버레이 검증
- 확대/이동 제스처 구현

완료 기준:

- 노선 목록에서 역 상세 진입 가능
- 지도에서 역 선택 후 출발/도착 지정 가능

## 12. 품질 기준

- iPhone 13 mini 폭에서도 텍스트가 잘리지 않는다.
- 모든 주요 CTA는 44pt 이상이다.
- 네트워크 실패, API 키 없음, 데이터 없음 상태를 명확히 보여준다.
- 경로 계산은 JS 스레드를 과도하게 막지 않는다.
- 앱 첫 화면은 2초 이내 상호작용 가능해야 한다.
- 경로 검색 결과 생성은 일반 케이스에서 1초 이내여야 한다.

## 13. 테스트 계획

### 수동 테스트 시나리오

- 강남 → 홍대입구 검색
- 서울역 → 잠실 검색
- 신도림 → 왕십리 검색
- 강남 → 사당 → 서울역 경유 검색
- 환승역 상세: 왕십리, 신도림, 사당
- API 키 없음 상태에서 역 상세 확인
- 시뮬레이션 데이터 ON/OFF
- 앱 재시작 후 즐겨찾기 유지 확인

### 자동 테스트

- shared 경로 계산 유닛 테스트
- storage adapter 테스트
- API URL 생성 테스트
- route payload 직렬화/복원 테스트

## 14. 리스크와 대응

1. 웹 UI가 DOM/Tailwind에 강하게 묶여 있음
   - 대응: UI는 재작성하고, 로직만 공유한다.

2. 경로 계산 데이터가 크고 모바일 번들에 부담이 될 수 있음
   - 대응: 먼저 정적 import로 구현하고, 빌드 크기 확인 후 지연 로딩을 검토한다.

3. 실시간 API가 모바일에서 CORS/상대경로 문제를 일으킬 수 있음
   - 대응: Vercel API 절대 URL만 사용한다.

4. Expo Go는 네이티브 기능 제약이 있음
   - 대응: P0-P2는 Expo Go에서 가능한 범위로 제한하고, 알림/배포 기능은 development build 전환 후 진행한다.

5. 공식 노선도 제스처 포팅 난도가 높음
   - 대응: MVP는 검색/목록 중심으로 출시하고, 지도형 노선도는 별도 단계로 진행한다.

## 15. 성공 지표

- iPhone Expo Go에서 주요 검색 시나리오가 막힘 없이 완료된다.
- 웹과 모바일의 대표 경로 결과가 일치한다.
- 실시간 API 실패 상황에서도 사용자는 경로 검색과 탑승 시뮬레이션을 계속 사용할 수 있다.
- 모바일-only 변경은 Vercel 웹 배포를 트리거하지 않는다.

## 16. 첫 구현 태스크

1. `apps/mobile/src/app/(tabs)` 라우팅 구조 생성
2. `shared/metro`로 경로 계산 로직 이동
3. 모바일 `realtimeApi` 절대 URL 버전 작성
4. AsyncStorage 설치 및 storage adapter 작성
5. 홈 검색 화면 구현
6. 경로 결과 화면 구현
7. 경로 상세 화면 구현

