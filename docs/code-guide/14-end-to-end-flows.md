# 14. 기능별 End-to-End 호출 추적

## 1. 앱 새로고침과 로그인 복구

```text
main.jsx → App mount
→ auth bootstrap effect
→ auth.refreshSession
→ client.refreshAuthSession (동시 요청 single-flight)
→ POST /api/v1/auth/refresh + HttpOnly cookie + Origin
→ AuthController.refresh
→ AuthOriginValidator.requireAllowed
→ RefreshCookieService.read
→ AuthSessionService.refresh
→ RefreshTokenService.rotate
→ RefreshTokenRepository(lock)
→ 새 access token + 회전 cookie
→ authStore.setSession
→ App.applyAuth/render
```

실패하면 store를 지우고 로그인 화면을 보인다. 처음부터 로그인 화면을 보여줬다가 뒤집지 않아 flash를 줄인다.

## 2. 물품 등록

```text
BottomNavigation 글쓰기
→ ItemRegistrationModal controlled inputs
→ App.handlePhotoSelect / handleCreateItem
→ toCreateItemPayload
→ useItems.create
→ api/items.createItem
→ 사진이면 FormData, 아니면 JSON
→ ItemController.createMultipart/createJson
→ ItemService.create
→ User/PickupLocation 조회와 검증
→ PhotoStorageService → UploadPolicy → Local/S3
→ ItemRepository.save
→ ItemResponse
→ normalizeItem
→ items state 앞에 추가 → React rerender
```

## 3. 물품 목록과 상세

```text
useItems.reload → GET /items?university_id=...
→ ItemController.list → ItemService.list → ItemRepository
→ ItemPageResponse → normalizeItemsResponse
→ HomePage/SearchPage

물품 click → selectedItem state → ProductDetailPage
```

상세 API를 별도 부르면 조회 수와 찜/후기 통계를 계산한다. 현재 리스트에서 선택한 normalized item을 바로 상세에 쓰는 경로도 있다.

## 4. 찜

```text
ProductDetailPage Heart click
→ App onToggleWishlist
→ selectedItem을 먼저 optimistic 변경
→ POST/DELETE /items/{id}/wishlist
→ WishlistController → WishlistService → Repository
→ 성공: 전체 items에도 반영
→ 실패: selectedItem을 previous로 rollback + toast
```

## 5. 대여 신청

```text
ProductDetailPage 대여 요청
→ 먼저 createOrGetChatRoom
→ rentalRequest modal + RentalRequestForm
→ 시작/종료와 calculateTotal
→ useRentals.create → POST /rentals
→ RentalController → RentalService.create
→ Item row lock, 금액/채팅방/권한/상태 검사
→ Rental INSERT + Item REQUEST_PENDING
→ InAppNotification INSERT
→ commit 후 lender WebSocket 알림
→ 프론트 rental/item/mypage reload
```

가격은 프론트도 계산하지만 조작 가능하므로 서버가 같은 규칙으로 다시 계산한다.

## 6. 대여 시작·거절·취소·반납

```text
RentalsPage role별 버튼
→ useRentals.transition(id, action)
→ pendingAction으로 버튼 잠금
→ PATCH /rentals/{id}/{action}
→ RentalService findByIdForUpdate
→ 사용자 role + Rental/Item 상태 검사
→ 두 Entity 상태 변경
→ commit
→ local rental 교체 + 관련 reload
```

## 7. 후기

```text
RETURNED rental의 후기 작성
→ ReviewFormModal
→ useRentals.submitReview
→ POST /rentals/{id}/reviews
→ ReviewController → ReviewService.submit
→ 참여자/기한/중복/rating/content 검사
→ 첫 후기 저장(비공개) 또는 양쪽 공개
→ 공개 시 양쪽 notification
→ review state 즉시 merge + background reload
```

## 8. 채팅

```text
ProductDetailPage 채팅
→ createOrGetChatRoom
→ useChatRooms.selectRoom
→ GET messages + PATCH read
→ STOMP room subscription

메시지 전송
→ optimistic clientId message
→ POST messages 또는 STOMP publish
→ ChatMessageService 저장/참여자 검사
→ ChatRealtimePublisher topic + 개인 chat-list
→ ID dedup/merge
→ 실패면 deliveryStatus=failed, retry 가능
```

## 9. 신고와 관리자 처리

```text
신고 버튼 → ReportModal → POST /reports
→ Request가 target 존재/reason 형식 검증
→ ReportService가 reporter와 target ID 존재 확인 → PENDING 저장

/admin → AdminPage → GET /admin/reports
→ ADMIN JWT 인가
→ status 변경 / item soft delete / user suspend
→ 목록과 detail state 갱신
```

현재 Service는 자기 신고나 복수 target의 상호 관계를 검사하지 않는다.

## 10. AI 추천

```text
useRecommendations.refresh
→ 학과/찜/시간/날씨 context
→ RecommendationService가 같은 대학 후보 최대 50개
→ OpenAI strict JSON schema
→ 서버가 반환 ID allowlist 재검증
→ Recommendation과 item 관계 저장
→ normalized items로 Home 추천 표시
```

## 흐름을 직접 추적하는 방법

1. 브라우저 버튼 text를 `rg`로 찾는다.
2. `onClick/onSubmit` 함수 이름을 찾는다.
3. 그 함수가 부르는 Hook/API export를 연다.
4. URL을 backend `@*Mapping`에서 찾는다.
5. Controller가 호출하는 Service 메서드를 연다.
6. Repository/Entity와 성공·예외 조건을 기록한다.
7. 같은 이름의 test에서 예상 결과를 확인한다.

예: `rg "대여 요청" src`, `rg 'PostMapping.*rentals|RequestMapping.*rentals' backend/src` 같은 식으로 양쪽을 만난다.
