# 서울 지하철 안내 앱 - 디자인 브레인스토밍

## 앱 개요
수도권 전체 지하철 노선을 포함한 iOS 네이티브 스타일 PWA 지하철 안내 앱.
경로 검색, 실시간 열차 도착 정보, 탑승 중 안내, 하차 알람, 환승 안내 등 종합 지하철 네비게이션 서비스.

---

<response>
## 아이디어 1: "Apple Transit" - iOS Human Interface Guidelines 완벽 준수

<text>
### Design Movement
Apple의 Human Interface Guidelines(HIG)를 완벽히 따르는 네이티브 iOS 디자인. iOS 18의 최신 디자인 언어를 웹에서 구현.

### Core Principles
1. **Clarity** - 콘텐츠가 UI의 주인공. 불필요한 장식 배제
2. **Deference** - UI는 콘텐츠를 방해하지 않고 보조
3. **Depth** - 레이어와 모션으로 공간감 표현
4. **Consistency** - iOS 사용자가 즉시 익숙하게 느끼는 패턴

### Color Philosophy
- 배경: 순수 화이트(#FFFFFF)와 iOS 시스템 그레이(#F2F2F7)
- 각 노선별 공식 컬러를 액센트로 활용
- 시스템 블루(#007AFF)를 주요 인터랙션 컬러로
- 다크모드: iOS 다크 팔레트 (#1C1C1E, #2C2C2E)

### Layout Paradigm
- iOS 스타일 Large Title 네비게이션
- 하단 탭 바 (홈, 검색, 노선도, 탑승중, 설정)
- 풀스크린 모달과 시트(Bottom Sheet) 활용
- Safe Area 준수, 노치 대응

### Signature Elements
1. SF Pro 스타일 타이포그래피 시스템
2. iOS 블러 글래스모피즘 (vibrancy effect)
3. 부드러운 코너 라디우스 (continuous corner)

### Interaction Philosophy
- 스와이프 제스처 기반 네비게이션
- 햅틱 피드백 시뮬레이션 (진동 패턴)
- Pull-to-refresh, 스와이프 삭제 등 iOS 관용구

### Animation
- iOS 스프링 애니메이션 (damping: 0.8, stiffness: 300)
- 페이지 전환: 슬라이드 + 페이드 (300ms)
- 바텀 시트: 스프링 물리 기반 드래그
- 리스트 아이템: 스태거 페이드인 (50ms 간격)

### Typography System
- Primary: SF Pro Display (시스템 폰트 스택)
- Body: SF Pro Text / -apple-system
- 크기 체계: 34px(Large Title), 22px(Title), 17px(Body), 15px(Subhead), 13px(Caption)
</text>
<probability>0.08</probability>
</response>

<response>
## 아이디어 2: "Metro Noir" - 다크 모드 우선 미니멀리즘

<text>
### Design Movement
도쿄 지하철 사이니지 + 스위스 타이포그래피에서 영감받은 다크 모드 우선 디자인. 정보 밀도가 높으면서도 시각적 피로가 없는 인터페이스.

### Core Principles
1. **Information Density** - 한 화면에 필요한 정보를 모두 담되 혼잡하지 않게
2. **Monochrome Base** - 노선 컬러만 유일한 색상 요소
3. **Grid Precision** - 8px 그리드에 완벽히 정렬된 레이아웃
4. **Functional Beauty** - 모든 요소가 기능적 목적을 가짐

### Color Philosophy
- 배경: 깊은 차콜(#0A0A0F)과 다크 그레이(#1A1A2E)
- 텍스트: 순수 화이트(#FFFFFF)와 미디엄 그레이(#8E8E93)
- 노선 컬러만 유일한 크로매틱 요소
- 네온 글로우 효과로 현재 위치/활성 상태 표시

### Layout Paradigm
- 수직 스크롤 기반 단일 컬럼
- 카드리스 디자인 - 구분선과 여백으로 섹션 분리
- 풀블리드 노선 시각화
- 하단 고정 액션 바

### Signature Elements
1. 노선 컬러 네온 글로우 효과
2. 모노스페이스 숫자 표시 (시간, 역 번호)
3. 미니멀한 선형 아이콘 시스템

### Interaction Philosophy
- 탭 중심 인터랙션 (제스처 최소화)
- 마이크로 애니메이션으로 상태 변화 전달
- 프로그레스 인디케이터의 적극 활용

### Animation
- 짧고 날카로운 전환 (150-200ms)
- ease-out 커브 위주
- 숫자 카운트다운 애니메이션
- 노선 경로 드로잉 애니메이션

### Typography System
- Primary: JetBrains Mono (숫자/시간)
- Body: Pretendard (한글 본문)
- 크기 체계: 극단적 대비 - 48px(핵심 숫자) vs 12px(보조 정보)
</text>
<probability>0.05</probability>
</response>

<response>
## 아이디어 3: "Seoul Flow" - 한국적 모던 + iOS 하이브리드

<text>
### Design Movement
한국 디자인 감성(카카오맵, 네이버 지도의 세련됨)과 iOS 네이티브 패턴을 결합. 밝고 깨끗하면서도 정보 전달력이 뛰어난 실용적 모던 디자인.

### Core Principles
1. **Warm Minimalism** - 차갑지 않은, 따뜻한 미니멀리즘
2. **Scannable** - 3초 안에 핵심 정보 파악 가능
3. **Contextual** - 상황에 따라 UI가 적응 (탑승 전/중/후)
4. **Delightful** - 작은 디테일에서 느끼는 즐거움

### Color Philosophy
- 배경: 따뜻한 화이트(#FAFAFA)와 소프트 그레이(#F5F5F7)
- 주요 액센트: 딥 네이비(#1B2838) - 신뢰감과 안정감
- 보조 액센트: 소프트 블루(#4A90D9) - 인터랙션 요소
- 노선별 공식 컬러를 뱃지/라인에 활용
- 서브틀한 그라디언트로 깊이감 표현

### Layout Paradigm
- iOS 스타일 탭 바 + 카드 기반 콘텐츠
- 바텀 시트 패턴 (경로 상세, 역 정보)
- 수평 스크롤 카드 캐러셀 (경로 옵션)
- 컨텍스트 전환 시 풀스크린 모달

### Signature Elements
1. 소프트 그림자와 미세한 보더로 카드 깊이감
2. 노선 컬러 필(pill) 뱃지 시스템
3. 프로그레스 바 기반 여정 시각화 (현재 위치 표시)

### Interaction Philosophy
- iOS 네이티브 제스처 (스와이프 백, 풀 투 리프레시)
- 바텀 시트 드래그 인터랙션
- 검색 시 실시간 자동완성
- 롱프레스로 즐겨찾기 추가

### Animation
- iOS 스프링 애니메이션 (자연스러운 바운스)
- 페이지 전환: 공유 요소 트랜지션 (300ms)
- 카드 등장: 스태거 슬라이드업 (40ms 간격)
- 경로 시각화: 순차적 라인 드로잉
- 바텀 시트: 물리 기반 스프링 (overdamped)
- 숫자 변경: 슬롯 머신 스타일 롤링

### Typography System
- Display: Pretendard Bold/ExtraBold (제목, 핵심 숫자)
- Body: Pretendard Regular/Medium (본문, 설명)
- Mono: SF Mono / Menlo (시간, 역번호)
- 크기 체계: 28px(페이지 타이틀), 20px(섹션 타이틀), 16px(본문), 14px(보조), 12px(캡션)
- 자간: -0.02em (한글 가독성 최적화)
</text>
<probability>0.07</probability>
</response>

---

## 선택: 아이디어 3 - "Seoul Flow"

한국 사용자에게 가장 친숙하면서도 iOS 네이티브 경험을 제공하는 "Seoul Flow" 디자인을 선택합니다.
- 따뜻한 미니멀리즘으로 모던하고 깔끔한 느낌 구현
- iOS HIG 패턴(탭 바, 바텀 시트, 네비게이션)을 충실히 따름
- 노선별 공식 컬러를 활용한 직관적 정보 전달
- Pretendard 폰트로 한글 가독성 극대화
