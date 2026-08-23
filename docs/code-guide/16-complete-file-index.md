# 16. 전체 파일 색인

이 색인은 직접 작성된 운영 소스가 빠졌는지 확인하고, 낯선 파일에서 어느 문서로 이동할지 알려준다. Java record는 선언한 component 이름의 접근자, 일반 Entity의 반복 getter/setter는 [02](02-java-spring-basics.md)의 공통 규칙을 따른다. 기능성 메서드는 해당 도메인 문서에 설명했다.

## 백엔드 시작점과 common (6개)

| 파일 | 역할 |
|---|---|
| `SaveChatApiApplication.java` | `main`에서 Spring Boot 실행; async/scheduling 활성화 |
| `common/ApiError.java` | 오류 message/timestamp record, `of` factory |
| `common/BusinessException.java` | HTTP status를 가진 업무 RuntimeException |
| `common/CorrelationIdFilter.java` | 요청 ID 검증/생성, 응답 header와 MDC, finally 정리 |
| `common/GlobalExceptionHandler.java` | BusinessException을 ApiError 응답으로 변환 |
| `common/TimeConfig.java` | UTC `Clock` Bean |

## security (24개)

| 파일 | 역할 |
|---|---|
| `AuthController.java` | 모든 auth endpoint와 cookie/session 시작 |
| `AuthOriginValidator.java` | refresh/logout 허용 Origin 검사 |
| `AuthService.java` | local signup/login, BCrypt와 대학 검증 |
| `AuthSessionService.java` | access/refresh token 수명주기 조립 |
| `JwtTokenService.java` | JWT claim/만료/서명 token 발급 |
| `RefreshTokenService.java` | 난수·hash·rotation·replay family revoke |
| `RefreshCookieService.java` | 설정 이름의 HttpOnly refresh cookie read/write/clear |
| `GoogleOAuthService.java` | Google ID token audience/email과 사용자 처리 |
| `GoogleLoginTicketService.java` | 짧은 일회용 redirect code issue/consume/expiry cleanup |
| `PknuEmailPolicy.java` | 이메일 normalize와 정확한 학교 domain 제한 |
| `ProductionSecretsValidator.java` | prod JWT/cookie 시작 검증 |
| `SecurityConfig.java` | filter chain, CORS, BCrypt, JWT encoder/decoder Bean |
| `SuspendedUserFilter.java` | 인증된 정지 사용자 요청 차단 |
| `RefreshToken.java` | DB Entity; consumed/revoked/expired 상태 |
| `RefreshTokenRepository.java` | hash/family lock 조회 |
| `AuthResponse.java` | access token, type, 신규 여부, user 응답 |
| `AuthUserResponse.java` | auth에서 공개하는 사용자 DTO와 `from` |
| `AuthSession.java` | response/raw refresh/expiry 내부 record |
| `IssuedRefreshToken.java` | 최초 발급 raw token/expiry |
| `RotatedRefreshToken.java` | 회전 결과 user/raw/expiry |
| `LoginRequest.java` | email/password 검증 입력 |
| `SignUpRequest.java` | 회원가입 검증 입력 |
| `GoogleLoginRequest.java` | Google ID token 입력 |
| `GoogleLoginCodeRequest.java` | redirect one-time code 입력 |
security 패키지의 반복적인 record 접근자와 Entity getter까지 포함한 동작 설명은 [03-security-auth.md](03-security-auth.md)에 있다.

## user와 university (15개)

| 파일 | 역할 |
|---|---|
| `user/User.java` | 사용자 Entity, local factory/Google 연결, profile/제재 변경 |
| `user/UserController.java` | 내 정보/profile endpoint |
| `user/PublicUserController.java` | 공개 profile/items/reviews endpoint |
| `user/UserService.java` | 사용자 업무 조회·수정 |
| `user/UserRepository.java` | email/OAuth/만료 제재 조회 |
| `user/UserResponse.java` | 내 사용자 JSON과 `from` |
| `user/PublicUserProfileResponse.java` | 민감 필드 없는 공개 JSON |
| `user/UserProfileUpdateRequest.java` | profile 수정 검증 입력 |
| `user/UserRole.java` | USER/ADMIN |
| `user/UserStatus.java` | 활성/정지 상태 |
| `user/ExpiredSanctionScheduler.java` | 만료 정지 주기 복구 |
| `university/University.java` | 대학 Entity |
| `university/UniversityController.java` | 대학/장소 공개 조회 |
| `university/UniversityAdminController.java` | ADMIN 대학/장소 생성 |
| `university/UniversityRepository.java` | 대학 CRUD/이름 중복 조회 |

## item, wishlist, storage (28개)

| 파일 | 역할 |
|---|---|
| `item/Item.java` | 물품 Entity와 update/status/delete/view/image 동작 |
| `item/ItemImage.java` | 이미지 URL/순서 Entity |
| `item/PickupLocation.java` | 대학별 수령 장소 Entity |
| `item/ItemController.java` | list/detail, JSON/multipart CRUD endpoint |
| `item/ItemService.java` | 필터, 검증, 소유권, 통계, CRUD 업무 규칙 |
| `item/ItemRepository.java` | 상태/대학/소유자 조회와 write lock |
| `item/PickupLocationRepository.java` | 대학별 장소와 중복 조회 |
| `item/ItemResponse.java` | 물품·소유자·장소·찜·후기 출력과 `from` |
| `item/ItemPageResponse.java` | content/page/total 응답과 중첩 Pageable record |
| `item/ItemUpsertRequest.java` | JSON/multipart 공통 mutable form DTO |
| `item/ItemStatusUpdateRequest.java` | 상태 문자열 입력 |
| `item/ItemStatus.java` | 물품 상태 enum |
| `item/RentalUnit.java` | HOUR/DAY/WEEK/MONTH |
| `item/PhotoStorageService.java` | 최대 파일 수와 validate/store 조립 |
| `item/UploadResourceConfig.java` | dev `/uploads/**` resource handler |
| `wishlist/Wishlist.java` | user-item 연결 Entity |
| `wishlist/WishlistController.java` | 찜 추가/삭제 endpoint |
| `wishlist/WishlistService.java` | 멱등 추가/삭제, 본인/삭제 물품 검사 |
| `wishlist/WishlistRepository.java` | 존재/단건/사용자 목록/count 조회 |
| `wishlist/WishlistResponse.java` | 찜 응답과 `from` |
| `storage/ObjectStorage.java` | `store(ValidatedImage)` Port |
| `storage/LocalObjectStorage.java` | !prod filesystem 구현 |
| `storage/S3ObjectStorage.java` | prod AWS SDK S3 구현 |
| `storage/StorageProperties.java` | `storage.*`와 중첩 S3 설정 binding |
| `storage/UploadPolicy.java` | 크기/확장자/MIME/signature/decode 검증 |
| `storage/ObjectKeyFactory.java` | 날짜/UUID server object key |
| `storage/ValidatedImage.java` | defensive copy된 검증 이미지 bytes |
| `storage/StoredObject.java` | 저장 key/public URL record |

## rental과 review (20개)

| 파일 | 역할 |
|---|---|
| `rental/Rental.java` | 거래 Entity, status와 returnedAt 변경 |
| `rental/RentalController.java` | 생성/내역/detail/거절/취소/시작/반납 endpoint |
| `rental/RentalService.java` | 대여 상태 머신, 권한, lock, 금액 계산 |
| `rental/RentalRepository.java` | 참여자 목록/활성 여부/count/write lock |
| `rental/RentalCreateRequest.java` | item/room/기간/금액 검증 입력 |
| `rental/RentalResponse.java` | 거래와 후기 workflow 출력 |
| `rental/RentalStatus.java` | 거래 상태 enum |
| `review/Review.java` | 상호 후기 Entity |
| `review/ReviewController.java` | 후기 제출/공개 조회 endpoint |
| `review/ReviewService.java` | 작성 자격/마감/중복/공개 workflow |
| `review/ReviewQueryService.java` | 공개 목록과 평점 summary 조회 |
| `review/ReviewPolicy.java` | deadline/visible 정책 계산 |
| `review/ReviewRepository.java` | rental/reviewer/reviewee 조회·집계 |
| `review/ReviewCreateRequest.java` | rating/content 검증 입력 |
| `review/ReviewResponse.java` | 본인 후기 응답 |
| `review/PublicReviewResponse.java` | 공개 후기/거래 역할 응답 |
| `review/ReviewSubmissionResponse.java` | 제출 직후 공개/상대 상태 응답 |
| `review/ReviewSummary.java` | 평균/count value |
| `review/ReviewWorkflow.java` | deadline/current-user state value |
| `review/ReviewState.java` | 후기 UI 상태 enum |

## chat (17개)

| 파일 | 역할 |
|---|---|
| `chat/domain/ChatRoom.java` | item/borrower/lender unique 방 Entity |
| `chat/domain/ChatMessage.java` | sender/message/read/time Entity |
| `chat/controller/ChatRoomController.java` | 방 생성/내 목록 REST |
| `chat/controller/ChatMessageController.java` | REST 메시지/목록/읽음 |
| `chat/controller/ChatWebSocketController.java` | STOMP message endpoint |
| `chat/service/ChatRoomService.java` | create-or-get와 참여 방 summary |
| `chat/service/ChatMessageService.java` | 참여자 검증, 저장, 목록, 읽음 |
| `chat/service/ChatRealtimePublisher.java` | room topic/개인 chat-list 발행 |
| `chat/repository/ChatRoomRepository.java` | 조합/참여자/fetch 조회 |
| `chat/repository/ChatMessageRepository.java` | 최근 메시지/unread/bulk read |
| `chat/config/WebSocketConfig.java` | endpoint/broker/destination 설정 |
| `chat/config/WebSocketAuthorizationInterceptor.java` | CONNECT JWT와 destination 인가 |
| `chat/dto/ChatRoomCreateRequest.java` | item ID 입력 |
| `chat/dto/ChatRoomCreateResponse.java` | 생성/기존 방 정보 |
| `chat/dto/ChatRoomListResponse.java` | 마지막 메시지/unread/opponent summary |
| `chat/dto/ChatMessageSendRequest.java` | message 검증 입력 |
| `chat/dto/ChatMessageResponse.java` | 저장 메시지 응답 |

## notification (18개)

| 파일 | 역할 |
|---|---|
| `InAppNotification.java` | 영속 알림 Entity와 markRead |
| `InAppNotificationController.java` | 내 목록/count/read/read-all endpoint |
| `InAppNotificationService.java` | 대여/후기 알림 생성과 조회·읽음 |
| `InAppNotificationRepository.java` | 최근 50개/소유 알림/count/bulk update |
| `InAppNotificationResponse.java` | 알림 JSON과 `from` |
| `InAppNotificationType.java` | rental/review 알림 종류 |
| `InAppNotificationCreatedEvent.java` | recipient + response event |
| `InAppNotificationRealtimeListener.java` | commit 후 개인 STOMP queue |
| `ChatMessageCreatedEvent.java` | push에 필요한 message/receiver 정보 |
| `ChatNotificationListener.java` | commit 후 async FCM 호출 |
| `PushNotificationService.java` | token별 Firebase 발송/invalid disable |
| `FirebaseConfig.java` | 조건부 FirebaseApp/Messaging Bean |
| `UserDeviceToken.java` | 사용자 FCM token Entity/reactivate/disable |
| `UserDeviceTokenRepository.java` | token/사용자 활성 목록 |
| `DeviceTokenController.java` | token 등록/해제 endpoint |
| `DeviceTokenService.java` | 등록 소유권/활성/disable 규칙 |
| `DeviceTokenRequest.java` | token/platform 입력 |
| `DevicePlatform.java` | ANDROID/IOS platform enum |

## report (11개)

| 파일 | 역할 |
|---|---|
| `Report.java` | 신고 대상/상태/처리시각 Entity |
| `ReportController.java` | 일반 사용자 신고 생성 |
| `AdminController.java` | 관리자 신고/삭제/제재 endpoint |
| `ReportService.java` | 대상 검증, 상태, soft delete, suspend |
| `ReportRepository.java` | 최신 신고 조회 CRUD |
| `ReportCreateRequest.java` | 대상 존재와 상세 사유 custom validation |
| `ReportStatusUpdateRequest.java` | 상태 입력 |
| `UserSanctionRequest.java` | 사유와 SUSPENDED 입력 |
| `ReportResponse.java` | 신고 상세 응답과 `from` |
| `UserSanctionResponse.java` | 제재 결과 응답 |
| `ReportStatus.java` | PENDING/REVIEWING/RESOLVED/REJECTED |

## recommendation (10개)

| 파일 | 역할 |
|---|---|
| `Recommendation.java` | 요청 context/result/item 관계 Entity |
| `RecommendationController.java` | 생성/history/detail endpoint |
| `RecommendationService.java` | 후보/권한/AI 결과 allowlist/저장 |
| `RecommendationRepository.java` | 사용자별 최신 기록 |
| `RecommendationAiPort.java` | 추천 외부 서비스 interface |
| `OpenAiRecommendationClient.java` | Responses API/JSON schema 구현 |
| `RecommendationAiInput.java` | 모델 입력과 중첩 후보 item |
| `AiRecommendationResult.java` | headline과 중첩 추천 결과 |
| `RecommendationRequest.java` | 사용자 context 검증 입력 |
| `RecommendationResponse.java` | 저장 결과와 normalized item 출력 |

## 프론트 운영 JS/JSX 파일 전체 (46개)

### root (3)

- `main.jsx`: React root, StrictMode, ToastProvider
- `App.jsx`: 인증·탭·Hook·modal·workflow 전체 조립
- `ProductDetailPage.jsx`: 물품 상세와 사용자 action

### api (12)

- `client.js`: 공통 fetch, ApiError, refresh/retry/single-flight
- `auth.js`: 인증 API
- `items.js`: 물품 JSON/multipart API
- `normalizers.js`: 서버/mock 응답 화면 shape와 채팅 merge
- `chats.js`: 방/메시지/read API
- `rentals.js`: 대여 전환/후기 API
- `notifications.js`: 알림 normalize/read API
- `recommendations.js`: 추천 API
- `reports.js`: 일반 신고/관리자 API
- `universities.js`: 대학/장소 API
- `users.js`: 내/공개 사용자 API
- `wishlist.js`: 찜 API

### hooks (8)

- `useItems.js`: 물품 server state와 CRUD
- `useReferenceData.js`: 대학→장소 의존 로드
- `useMyPageData.js`: 내 정보/물품/찜 묶음
- `useRentals.js`: 거래 목록/transition/review
- `useChatRooms.js`: socket, optimistic message, retry/read
- `useRecommendations.js`: 추천 요청 state
- `useUserProfile.js`: 공개 profile/items/reviews
- `useNow.js`: visibility-aware 현재 시각 tick

### pages (9)

- `HomePage.jsx`, `SearchPage.jsx`, `ChatPage.jsx`, `MyPage.jsx`
- `RentalsPage.jsx`, `LoginPage.jsx`, `ProfileSetupPage.jsx`
- `UserProfilePage.jsx`, `AdminPage.jsx`

각 Page의 helper와 props는 [11](11-frontend-pages-components.md)에 있다.

### components (8)

- `AsyncState.jsx`, `BottomNavigation.jsx`, `ItemRegistrationModal.jsx`
- `RentalRequestForm.jsx`, `ReportModal.jsx`, `ReviewFormModal.jsx`
- `ToastProvider.jsx`, `toast.js`

### 나머지 JS (6)

- `chat/stompClient.js`: STOMP transport
- `config/runtime.js`: API mode/USE_API
- `store/authStore.js`: 메모리 auth Zustand
- `utils/itemVisibility.js`: available filter
- `utils/relativeTime.js`: 상대 시간
- `data/items.js`: API off일 때 mock item

`App.css`, `index.css`는 각각 App 추가 스타일과 Tailwind/전역 스타일이며 위 46개 JS/JSX 집계와 별도다. `src/test/setup.js`도 운영 코드가 아니라 Vitest 공통 초기화이므로 테스트 절에서 다룬다.

## 설정과 데이터 파일

| 파일 | 역할 |
|---|---|
| `package.json` | npm script와 React/Vite/Test/Tailwind 의존성 |
| `package-lock.json` | 설치 버전 재현 lockfile; 수동 편집하지 않음 |
| `vite.config.js` | React/Tailwind/Vitest 설정 |
| `eslint.config.js` | JS/React lint 규칙 |
| `index.html` | `#root`와 `src/main.jsx` 진입 |
| `backend/build.gradle` | Java 17, Spring/JPA/Security/WebSocket/Flyway/S3/Firebase 의존성 |
| `backend/settings.gradle` | Gradle project 이름 |
| `backend/gradle.properties` | Gradle 실행 옵션과 project property |
| `backend/gradle/wrapper/gradle-wrapper.properties` | Wrapper가 받을 Gradle 8.13 배포 URL/검증 설정 |
| `backend/gradle/wrapper/gradle-wrapper.jar` | Wrapper bootstrap 바이너리; 생성물이라 내부 코드는 해설 제외 |
| `backend/gradlew`, `backend/gradlew.bat` | Unix/Windows Gradle Wrapper 실행 스크립트 |
| `backend/bootRun.ps1` | Windows PowerShell에서 환경변수 확인 후 bootRun 실행 |
| `backend/Dockerfile` | JDK 이미지에서 Gradle build 후 JRE 이미지로 jar 실행하는 multi-stage 배포 |
| `application.yml` | 공통 JSON/JPA/security/storage/외부 설정 |
| `application-dev.yml` | H2/local upload/dev profile |
| `application-prod.yml` | PostgreSQL/Flyway/S3/Secure cookie |
| `data-dev.sql` | 개발 대학/수령 장소 기준 데이터 |
| `db/migration/V1..V6.sql` | 운영 schema 변경. [09](09-database.md) 참조 |

## 정적 자산과 기존 보조 문서

| 파일 | 역할 |
|---|---|
| `public/favicon.svg` | 브라우저 tab 아이콘 |
| `public/icons.svg` | 공개 SVG icon asset |
| `src/assets/hero.png` | 프론트 hero bitmap asset |
| `src/assets/react.svg`, `src/assets/vite.svg` | 초기 template/logo SVG; 현재 import 여부를 확인 후 정리 가능 |
| `backend/docs/database-tables.md` | DB 테이블 요약 |
| `backend/docs/schema.dbml` | DBML 도구에서 관계도를 그릴 schema |
| 루트/백엔드 `README.md` | 실행·API·인증·채팅·Firebase 설명 |
| `docs/gcp-private-beta-deployment.md` | GCP 비공개 beta 배포 절차(현재 사용자 작업 파일) |

## 테스트 파일

프론트 38개 테스트 파일과 `src/test/setup.js`, 백엔드 27개 테스트 Java 파일 및 Mockito 설정은 이름과 검증 목적을 [13-testing-guide.md](13-testing-guide.md)에 하나씩 정리했다. 테스트 함수는 `it/void`의 자연어 이름이 요구사항이며, setup/helper는 fixture·mock·cleanup을 준비한다.

## 모르는 함수의 출처 판별표

| 모양 | 대개 어디에서 오는가 |
|---|---|
| `findBy...` Repository method | Spring Data가 이름으로 구현 생성 |
| `save/findById/delete` | `JpaRepository` 상속 메서드 |
| `stream/map/filter/toList` | Java Collection/Stream 표준 API |
| `Response.from` | 프로젝트가 정의한 static 변환 함수 |
| record의 `email()` | Java compiler 자동 접근자 |
| `use...` | React built-in 또는 `src/hooks` custom Hook |
| `setX` | `useState`가 반환한 setter |
| `apiFetch` | `src/api/client.js` 프로젝트 함수 |
| `fetch`, `FormData`, `URL` | 브라우저 Web API |
| `map/filter/find/some` | JavaScript Array 표준 함수 |
| `Client`, `subscribe`, `publish` | STOMP library API |

## 소스가 바뀌었을 때 갱신 순서

새 파일을 추가하면 이 색인 → 해당 도메인 문서 → E2E 흐름 → 관련 CS/테스트 항목 순으로 갱신한다. endpoint가 바뀌면 프론트 API와 Controller 양쪽을 함께 확인한다.
