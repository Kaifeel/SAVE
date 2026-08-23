# 13. 테스트 코드 읽는 법과 전체 지도

## 테스트의 구조

대부분 Arrange–Act–Assert로 읽는다.

1. Arrange: Entity, mock, 화면, 입력 준비
2. Act: 메서드 호출, HTTP 요청, 사용자 클릭
3. Assert: 응답/DB/화면/호출 횟수 확인

테스트 이름은 “조건에서 기대 결과”를 문장으로 썼다. 구현을 읽기 전에 테스트 이름과 assertion을 보면 업무 규칙을 빨리 알 수 있다.

## 프론트 테스트 도구

- Vitest: `describe`, `it/test`, `expect`, `vi.fn/mock`
- React Testing Library: 실제 사용자 관점으로 render하고 role/label/text로 요소 탐색
- `userEvent`: click/type 같은 사용자 행동
- jsdom: Node 환경에 브라우저 DOM 흉내
- `waitFor/findBy*`: 비동기 렌더 결과 대기

`getBy*`는 즉시 없으면 실패, `queryBy*`는 없으면 null, `findBy*`는 나타날 때까지 비동기 대기한다. 구현 내부 state보다 화면과 외부 호출을 검증해야 리팩터링에 덜 깨진다.

## 프론트 테스트 파일별 목적

| 파일 | 검증하는 것 |
|---|---|
| `App.authRefresh.test.jsx` | 새로고침 cookie session 복구, 실패 후에만 로그인 표시 |
| `App.googleRedirect.test.jsx` | StrictMode 일회용 code 교환, 신규/미완성 profile |
| `App.notifications.test.jsx` | 영속 알림, 전체 읽음, 실시간 dedup, 후기 refresh |
| `ProductDetailPage.owner.test.jsx` | 소유자 action, 신고/profile callback, 상대 시간 표시 |
| `api/auth.test.js` | signup university_id와 Google code 계약 |
| `api/client.test.js` | URL/header/body, 오류, 401 refresh와 동시 요청 |
| `api/items.test.js` | JSON/FormData 선택과 item endpoint 계약 |
| `api/normalizers.test.js` | item/profile/rental/review/chat shape와 병합 |
| `api/notifications.test.js` | 알림 정규화와 인증 read 요청 |
| `api/rentals.test.js` | 현재 offline transition endpoint와 후기 payload |
| `api/universities.test.js` | 대학/장소 공개 API |
| `api/users.test.js` | 공개된 후기만 조회하는 endpoint |
| `chat/stompClient.test.js` | JWT CONNECT, 구독 destination, dedup, publish 계약 |
| `components/ItemRegistrationModal.test.jsx` | location ID 저장, rental unit 선택 |
| `components/RentalRequestForm.test.jsx` | 종료가 시작보다 뒤인지 |
| `components/ReportModal.test.jsx` | trim 10자와 취소 |
| `components/ReviewFormModal.test.jsx` | 별점/내용, 500자, 제출 중 disable |
| `components/ToastProvider.test.jsx` | context로 toast 표시·닫기 |
| `config/runtime.test.js` | API mode parse |
| `hooks/useChatRooms.test.jsx` | 메시지 로드/읽음, 실패 retry, 알림 forwarding |
| `hooks/useChatRooms.dedup.test.jsx` | WebSocket이 REST보다 먼저 와도 한 메시지 |
| `hooks/useMyPageData.test.jsx` | 세 section을 함께 reload |
| `hooks/useNow.test.jsx` | 1분 tick, hidden pause, visible 즉시 갱신 |
| `hooks/useRecommendations.test.jsx` | 추천 요청과 normalize/error |
| `hooks/useReferenceData.test.jsx` | 대학 후 장소 로드와 retry error |
| `hooks/useRentals.test.jsx` | transition lock, 관련 reload, 후기 즉시 merge |
| `hooks/useUserProfile.test.jsx` | 공개 profile/items/reviews와 refreshKey |
| `pages/AdminPage.test.jsx` | 신고 조회/상태 변경과 비관리자 화면 |
| `pages/ChatPage.test.jsx` | item ID 연결, 시간/date separator |
| `pages/HomePage.test.jsx` | 상대 시간 표시와 1분 갱신 |
| `pages/LoginPage.test.jsx` | Google Identity redirect 설정 |
| `pages/MyPage.test.jsx` | 내 정보/물품/찜/이동 렌더 |
| `pages/RentalsPage.test.jsx` | 역할별 action, pending disable, review state |
| `pages/SearchPage.test.jsx` | API 오류와 retry, mock 숨김 |
| `pages/UserProfilePage.test.jsx` | profile fallback, 후기 역할, 악성 markup text 처리 |
| `store/authStore.test.js` | 메모리 session과 profile-only update |
| `utils/itemVisibility.test.js` | AVAILABLE만 홈에 표시 |
| `utils/relativeTime.test.js` | 분/시간/일/날짜와 invalid 처리 |
| `test/setup.js` | 모든 Vitest 전에 jest-dom matcher와 공통 browser mock 준비 |

## 백엔드 테스트 도구

- JUnit 5: test lifecycle과 assertion
- Spring Boot Test: 실제 Bean/설정/transaction을 포함한 통합 테스트
- MockMvc: 실제 socket 없이 MVC filter/controller 호출
- Mockito: Repository/Firebase/SimpMessagingTemplate 같은 의존성 mock
- `@DataJpaTest`: Repository와 DB lock/query 중심 slice
- H2: 테스트 DB. PostgreSQL 고유 동작은 운영과 차이가 날 수 있음

## 백엔드 테스트 파일별 목적

| 파일 | 검증하는 것 |
|---|---|
| `MarketplaceIntegrationTest.java` | 가입→물품→찜→채팅→대여 전체 API, 취소/거절, 삭제 찜 제거 |
| `chat/ChatMessageControllerTest.java` | 읽음 뒤 개인 chat list 재발행 |
| `chat/ChatRealtimePublisherTest.java` | 방과 양쪽 개인 요약 발행, 개인 실패 격리 |
| `chat/WebSocketSecurityIntegrationTest.java` | JWT 없는 연결 거부와 개인 destination 인가 |
| `config/ProductionConfigurationTest.java` | prod PostgreSQL/Flyway/JPA validate |
| `item/ItemTimestampTest.java` | JVM Seoul zone에서도 UTC Instant |
| `notification/InAppNotificationRealtimeListenerTest.java` | 커밋 알림을 recipient queue로 전송 |
| `notification/InAppNotificationServiceTest.java` | 대여 신청/시작/거절 알림 저장·event |
| `rental/RentalReturnedAtTest.java` | 정확한 반납 시각과 재설정 금지 |
| `rental/RentalTransitionLockIntegrationTest.java` | start/reject 동시 충돌 중 하나만 성공 |
| `review/PublicReviewIntegrationTest.java` | 첫 후기 숨김, 양쪽 제출 뒤 공개 |
| `review/ReviewSubmissionIntegrationTest.java` | 권한/상태/중복/값/마감/workflow 전부 |
| `security/AuthControllerRedirectTest.java` | Google code redirect와 CSRF token |
| `security/AuthIntegrationTest.java` | BCrypt/JWT, 잘못된 비밀번호/학교 domain |
| `security/AuthRefreshIntegrationTest.java` | cookie 회전, 최신 profile, logout, origin |
| `security/GoogleLoginTicketServiceTest.java` | 일회용 ticket 재사용 금지 |
| `security/ProductionSecretsValidatorTest.java` | prod 기본/짧은 secret, insecure cookie 거부 |
| `security/RefreshCookieServiceTest.java` | 설정 cookie name으로 read/write |
| `security/RefreshTokenServiceTest.java` | hash-only, 절대 만료, replay family 폐기, logout |
| `security/SecurityBoundaryIntegrationTest.java` | CORS, Google POST, suspended user 차단 |
| `security/SecurityHeadersIntegrationTest.java` | 브라우저 보안 header |
| `storage/LocalObjectStorageTest.java` | client path를 object key에 쓰지 않음 |
| `storage/S3ObjectStorageTest.java` | bucket/key/content type/bytes |
| `storage/UploadPolicyTest.java` | 확장자/MIME/signature/크기와 정상 PNG |
| `university/DevelopmentReferenceDataTest.java` | dev 기준 대학/장소 seed |
| `user/ExpiredSanctionSchedulerIntegrationTest.java` | 만료된 제재만 복구 |
| `user/PublicUserProfileIntegrationTest.java` | 공개 field와 보이는 item, unknown 404 |

`mockito-extensions/org.mockito.plugins.MockMaker`의 값은 `mock-maker-subclass`다. Java subclass 기반 mock maker를 명시하므로 final class/final method는 mock할 수 없다. 대신 일부 JVM에서 inline mock maker의 agent 경고·제약을 피하는 설정이다.

## 단위·통합·E2E 구분

- 단위 테스트: 한 class/function과 fake 의존성. 빠르고 실패 원인이 좁다.
- 통합 테스트: Spring/JPA/Security 등 실제 결합. 설정/transaction 문제를 찾는다.
- E2E: 실제 브라우저·서버·DB 전체. 현재 저장소에는 브라우저 E2E 도구가 없고 `MarketplaceIntegrationTest`가 API 수준 전체 흐름을 담당한다.

## 면접 연결

**Mock이 많을 때 단점:** 구현 호출 순서에 결합하고 실제 설정/쿼리 오류를 놓친다. 중요한 lock/security/schema는 통합 테스트로 보완한다.

**Flaky test:** 시간, thread, network, 실행 순서에 따라 간헐 실패하는 테스트다. Clock/fake timer, 독립 DB cleanup, 비동기 명시 대기로 줄인다.

**무엇을 먼저 테스트하는가:** 금전·권한·상태·동시성처럼 실패 비용이 높은 규칙과 경계값부터 한다. 이 프로젝트에서는 대여 lock, refresh replay, 후기 공개가 그 예다.
