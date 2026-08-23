# 11. 프론트 페이지와 컴포넌트

## 진입점

`main.jsx`는 `createRoot(document.getElementById('root'))`로 React root를 만들고 `StrictMode → ToastProvider → App`을 렌더한다. 개발 StrictMode는 side effect 문제를 찾기 위해 mount/effect를 추가 실행할 수 있다.

## App.jsx: 조립 책임

`App()`은 프로젝트 프론트의 중심이다.

### 로그인/프로필 state

Zustand의 token/user/status를 읽고, `isLoggedIn`, `isProfileComplete`, 이름·학과·대학을 화면 state로 관리한다. `applyAuth()`는 여러 auth 응답 형태를 store에 저장하고 profile complete 여부를 계산한다. `handleLogin()`은 email login/signup을 선택하고, `handleLogout()`은 서버 logout을 시도한 뒤 로컬 state를 항상 정리한다.

초기 effect는 Google fragment code 교환 또는 refresh cookie session 복구를 한 번 시작한다. `authBootstrapStarted` ref는 StrictMode에서 같은 일회용 code를 두 번 교환하는 것을 막는다.

### 데이터 Hook 조립

- `useReferenceData`: 대학/수령 장소
- `useItems`: 목록과 CRUD
- `useMyPageData`: 내 정보/물품/찜
- `useRentals`: 대여와 후기
- `useChatRooms`: 메시지/실시간 연결
- `useRecommendations`: 추천

`handleRentalChanged()`는 대여 성공 후 MyPage와 물품을 병렬 reload한다. `handleNotification()`은 ID로 중복을 막고 workflow 알림이면 관련 화면들을 reload한다.

### 목록 파생

- `campusItems`: 대학과 검색어 filter
- `filteredItems`: 빌려줘요/구해요, available filter, 상태 정렬
- `recommendItems`: 서버 추천 또는 mock section
- `homePopularItems`: 대여 가능한 인기 물품 최대 4개
- `recentItems`: recent section

원본 `items`를 직접 바꾸지 않고 `useMemo`로 파생 배열을 만든다.

### 프로젝트 정의 handler

| 함수 | 동작 |
|---|---|
| `handleChatListUpdate` | 개인 STOMP snapshot을 기존 rooms와 병합 |
| `handleChatRoomRead` | 선택 방 unread를 0으로 변경 |
| `handleRentalChanged` | 대여 뒤 관련 데이터 병렬 새로고침 |
| `handleNotification` | 실시간 알림 중복 제거와 workflow refresh |
| `handlePhotoSelect`, `handlePhotoRemove` | 최대 5개 File state 관리 |
| `resetItemForm` | 등록/수정 form 초기화 |
| `handleCreateItem` | mock/API 분기, payload 변환, 생성/수정, toast |
| `handleSendMessage` | 입력 trim, API send 또는 mock 메시지 추가 |
| `handleCompleteProfile` | 프로필 API 수정 후 화면/store 갱신 |
| `applyAuth` | auth 응답을 화면과 Zustand에 적용 |
| `handleLogin/logout` | 인증 시작/종료 |

### 렌더 분기

1. auth checking → 확인 문구
2. 비로그인 → `LoginPage`
3. `/admin` → role에 따라 `AdminPage`/`AdminAccessDenied`
4. 미완성 프로필 → `ProfileSetupPage`
5. 정상 사용자 → 모바일 frame과 현재 tab

아래쪽에는 detail/profile/report/item registration/rental request가 조건부 overlay로 조립된다. `selectedItem`, `profileTarget` 같은 state가 간단한 UI state machine 역할을 한다.

## 페이지

| 파일 | 입력과 책임 |
|---|---|
| `HomePage` | 추천/인기/최근 물품을 표시하고 선택·검색·추천 갱신 callback 실행 |
| `SearchPage` | 게시판 종류, 검색어, 대여 가능 filter와 loading/error/retry 표시 |
| `ChatPage` | 방 목록/활성 메시지 UI. 날짜 parse/key/format과 item ID 연결 수행 |
| `MyPage` | 프로필, 내 물품, 찜, 대여 내역/로그아웃 진입 |
| `RentalsPage` | 빌린/빌려준 역할별 action과 후기 modal. `RentalList`, `submitReview` 포함 |
| `LoginPage` | login/signup form, Google Identity script·redirect button 초기화 |
| `ProfileSetupPage` | 신규/미완성 사용자의 이름·학과·대학 입력 |
| `UserProfilePage` | 공개 프로필/물품/후기, API 실패 시 mock fallback, 신고/물품 이동 |
| `AdminPage` | 신고 목록·검색·상태·삭제·제재. 관리자 전용 독립 layout |
| `ProductDetailPage` | 물품 상세, 상대 프로필, 찜/신고/채팅/대여 또는 소유자 수정/삭제 |

### ChatPage helper

- `parseChatDate`: Date 변환 실패 시 null
- `getChatDateKey`: 같은 날짜 비교용 `YYYY-MM-DD`
- `formatChatDate`: 날짜 separator 라벨
- `formatChatTime`: 메시지/방 시각을 한국어 시각으로 지연 formatting
- `findLinkedItem`: 제목이 아닌 itemId로 연결해 동명 물품 오류 방지

### UserProfilePage helper

- `fallbackProfile`: 선택 물품의 owner 정보로 임시 프로필 구성
- `priceLabel`: 무료 또는 가격/단위 문자열
- API enabled/ID가 있으면 `useUserProfile`, 아니면 fallback 사용

### AdminPage helper/handler

- `normalizeReport`: snake/camel 응답을 화면 형태로 변환
- `formatDate`: 안전한 한국어 날짜
- `StatusBadge`: 상태 metadata 렌더
- `loadReports`, `replaceReport`, `openReport`, `changeStatus`, `removeItem`, `sanctionUser`

## 재사용 컴포넌트

| 파일 | 책임과 함수 |
|---|---|
| `AsyncState` | loading/error/empty를 공통 표시 |
| `BottomNavigation` | home/search/write/chat/my 전환, unread badge |
| `ItemRegistrationModal` | 등록/수정 controlled form. state는 App이 소유 |
| `RentalRequestForm` | 시작/종료 검증, `calculateTotal`, API payload 생성 |
| `ReportModal` | 열림/target/10자/제출 중 조건, `handleClose` |
| `ReviewFormModal` | 별점·trim 내용 검증, 최대 500자, `handleSubmit` |
| `ToastProvider` | toast 목록, `dismiss`, `show`, context value 제공 |
| `toast.js` | `ToastContext`, 안전한 `useToast()` |

## 컴포넌트 설계 관찰

Page는 주로 표시 역할이고 data 동작은 Hook/App에 있다. 그러나 `App.jsx`에는 너무 많은 state와 inline handler가 있어 수정 영향 범위가 크다. 면접에서 개선점을 묻는다면 인증 shell, navigation/router, item workflow, notification overlay로 분리하고 reducer 또는 feature별 context를 검토한다고 답할 수 있다. 단, 현재 코드 이해 단계에서 먼저 리팩터링할 필요는 없다.

## 접근성

`aria-label`, `aria-live`, `role=dialog/alert/status`, form label이 사용된다. icon-only button에는 화면 reader용 이름이 필요하다. modal에는 focus trap/ESC 복귀가 아직 완전하지 않아 개선 지점이다.
