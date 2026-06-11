# 메트로넛 앱 출시 체크리스트

마지막 갱신: 2026-06-11

## 현재 상태

| 항목 | 상태 |
|---|---|
| 웹-모바일 기능 패리티 | ✅ 완료 (홈 즐겨찾기, 설정, 노선도, 역 정보, 경로 검색/상세, 탑승 안내) |
| 실시간 열차 로직 공유화 | ✅ `shared/metro/ridingTrains.ts` (방향 필터·막차·급행 통과역·환승 미리선택) |
| 로컬 알림 (하차/환승 임박) | ✅ expo-notifications, Android 채널 `riding-alerts` |
| 프로덕션 API 연결 | ✅ `https://metronut.vercel.app` (eas.json 모든 프로필) |
| 앱 아이콘/스플래시 | ✅ 브랜드 아트웍으로 교체 (Expo 기본 아이콘 제거) |
| 개인정보 처리방침 | ✅ `https://metronut.vercel.app/privacy.html` (배포 후 유효) |
| expo-doctor | ✅ 18/18 |
| EAS projectId | ✅ `58450270-27f8-4064-9acc-33e4ec2a0134` (@arangot/metronut) |
| Android keystore | ✅ EAS 클라우드 자동 생성 |
| Android 프로덕션 빌드 | ✅ 성공 (1.0.0 build 2, .aab) — Play Store 제출용. 폰 직접설치는 `--profile preview`로 .apk 빌드 |
| iOS 프로덕션 빌드 | ❌ Apple Developer 계정 필요 (대화형 1회: `npx eas-cli build --platform ios --profile production`) |

## 출시 절차

### 1. EAS 프로젝트 연결 (1회) — ✅ 완료 (2026-06-11)

```bash
cd apps/mobile
npx eas-cli login          # 완료: hermano1uno@gmail.com
npx eas-cli init           # 완료: app.json에 projectId/owner 기록됨
```

### 2. 서버 변경 배포

모바일 앱이 의존하는 서버 개선(열차 위치 신선도 필드)이 아직 배포 전이다.
루트에서 커밋 후 main에 푸시하면 Vercel이 자동 배포한다.

```bash
git add -A && git commit && git push
curl -s "https://metronut.vercel.app/api/trpc/metro.getApiStatus?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D"
# → {"hasApiKey":true} 확인
```

### 3. 빌드

```bash
cd apps/mobile
npx eas-cli build --profile production --platform ios
npx eas-cli build --profile production --platform android
```

- iOS: Apple Developer Program 계정 필요 (eas build가 인증서/프로비저닝 자동 처리)
- Android: 첫 빌드에서 keystore 자동 생성 선택

### 4. 스토어 제출

```bash
npx eas-cli submit --platform ios
npx eas-cli submit --platform android
```

준비물:
- [ ] App Store Connect / Google Play Console 계정과 앱 등록
- [ ] 스크린샷 (iPhone 6.7" 필수, iPad는 supportsTablet=true라 권장)
- [ ] 앱 설명문 (한국어) — "서울 지하철 경로 검색과 실시간 탑승 안내"
- [ ] 개인정보 처리방침 URL: `https://metronut.vercel.app/privacy.html`
- [ ] 심사 메모: 위치권한 미사용, 계정 불필요, 공공데이터(서울 열린데이터광장) API 사용

## 검증 명령어

```bash
# 루트에서
pnpm check && pnpm test          # 웹/서버 타입체크 + 테스트
pnpm mobile:smoke                # 공유 메트로 로직 스모크

# apps/mobile에서
npx tsc --noEmit && npx expo lint
npx expo-doctor                  # 프로젝트 설정 검증 (18/18 기대)
```

## 알려진 제약

- Expo Go(Android)에서는 알림이 동작하지 않음 (SDK 53+) → development build 사용
- 백그라운드(앱 종료) 상태의 하차 알림은 미구현 — 백그라운드 위치 권한 필요, 별도 과제
- 버전 올릴 때: `app.json`의 `version`(+ iOS `buildNumber`는 eas production 프로필의 `autoIncrement`가 처리)
