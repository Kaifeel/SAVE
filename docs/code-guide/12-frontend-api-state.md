# 12. 프론트 API, 정규화, 상태 Hook

## api/client.js

모든 REST 요청의 공통 계층이다.

- `ApiError`: message/status/code/data를 가진 사용자 정의 Error
- `subscribeUnauthorized(listener)`: 401 최종 실패 구독과 unsubscribe 함수
- `buildUrl(path, params)`: base URL, path, query string 구성; 빈 값 제외
- `parseResponse(res)`: 204는 null, JSON은 object, 나머지는 text
- `request(path, options, retried)`: token/header/cookie/fetch, network 오류, 401 refresh/retry, ApiError 변환
- `apiFetch`: request 공개 wrapper
- `refreshAuthSession`: 동시 refresh를 `refreshPromise` 하나로 합치고 Zustand 갱신

`credentials: 'include'`는 cross-origin 정책이 허용되는 경우에도 refresh cookie를 포함한다. FormData는 브라우저가 boundary가 포함된 Content-Type을 만들도록 수동 JSON header를 생략한다.

## API 모듈 전체

| 파일 | 공개 함수 |
|---|---|
| `auth.js` | `loginWithGoogle`, `exchangeGoogleLogin`, `loginWithEmail`, `signUpWithEmail`, `refreshSession`, `logoutSession`, `getAccessToken`, `getAuthUser` |
| `items.js` | `getItems`, `createItem`, `getItemDetail`, `updateItem`, `updateItemStatus`, `deleteItem`; 내부 FormData/payload helper |
| `chats.js` | `createOrGetChatRoom`, `getChatRooms`, `getChatMessages`, `markChatRoomRead`, `sendChatMessage` |
| `rentals.js` | `createRental`, `getMyRentals`, `getRentalDetail`, `rejectRental`, `cancelRental`, `returnRental`, `startRental`, `submitRentalReview` |
| `users.js` | `getMyInfo`, `updateMyProfile`, `getMyItems`, `getMyWishlist`, `getPublicUserProfile`, `getPublicUserItems`, `getPublicUserReviews` |
| `universities.js` | `getUniversities`, `getPickupLocations` |
| `wishlist.js` | `addWishlist`, `removeWishlist` |
| `notifications.js` | `normalizeNotification`, `getNotifications`, `markNotificationRead`, `markAllNotificationsRead` |
| `recommendations.js` | `getRecommendations`, `getMyRecommendationHistory`, `getRecommendationDetail` |
| `reports.js` | `createReport`, `getAdminReports`, `getAdminReportDetail`, `updateAdminReportStatus`, `deleteAdminItem`, `sanctionAdminUser` |

이 함수들은 UI를 렌더하지 않고 HTTP 계약만 표현한다. method가 생략되면 fetch 기본 GET이다. body는 JSON.stringify 후 보내며 서버의 snake_case 필드 이름을 맞춘다.

## normalizers.js

백엔드 응답과 mock/과거 응답을 화면용 shape으로 통일한다.

- `unwrapList/unwrapObject`: array/content/data/items wrapper 허용
- `normalizeItem(s)`: ID, 가격, 단위, owner, 이미지, 찜, 상태를 통일
- `normalizePublicUserProfile`
- `normalizeRental`: ID와 review 시각/state 통일
- `normalizePublicReview`, `normalizePublicReviewsResponse`
- `normalizeChatMessage`: current user를 `sender:'me'`로 표시
- `normalizeChatRoom`, `normalizeChatRoomsResponse`: 방 요약, unread, messages
- `chatRoomTimestamp`: 정렬 가능한 epoch 또는 null
- `mergeChatRoomSnapshot`: REST snapshot과 더 최신 실시간 state 병합
- `mergeChatListUpdate`: 개인 실시간 방 update를 맨 위로 이동, 활성 방 unread 0
- `normalizeMessagesResponse`
- `toCreateItemPayload`: UI 필드를 API snake_case와 enum으로 변경

정규화는 backend 계약 변화에 대한 adapter다. 하지만 지나치게 많은 alias는 서버 bug를 조용히 숨길 수 있으므로 안정화 후 canonical shape만 남기는 것이 좋다.

## Custom Hook

### `useItems`

`items/loading/error`와 `reload/create/update/remove/updateStatus`를 제공한다. API disabled면 initial mock을 사용한다. 성공 응답은 normalize 후 목록에 삽입/교체하고 soft delete는 화면에서 제거한다.

### `useReferenceData`

대학을 먼저 가져오고 선택 universityId가 생기면 장소를 가져온다. `reloadUniversities`, retry 가능한 error를 제공하며 임의 fallback을 숨기지 않는다.

### `useMyPageData`

내 정보, 내 물품, 찜의 세 비동기 상태를 묶는다. `reload()`가 API들을 병렬 호출하고 각 section의 loading/error/data를 갱신한다.

### `useRentals`

- `reload`: 내 rental normalize 후 borrowed/lent 분류
- `transition(id, action)`: `pendingAction` key로 중복 클릭 잠금, action API 실행, 로컬 교체 후 관련 화면 reload
- `create`: 새 대여 생성
- `submitReview`: 응답의 review state를 즉시 merge한 뒤 background reload

UI disabled만 믿지 않고 backend도 상태/권한을 다시 검사한다.

### `useChatRooms`

- `defaultSocketUrl`: 현재 origin에서 ws/wss URL 생성
- effect: token이 있으면 STOMP 생성, room/list/notification callback 연결, cleanup disconnect
- `selectRoom`: 메시지 조회와 읽음 처리, active room 설정
- `deliver`: optimistic 메시지를 REST로 전송하고 성공 ID 병합, 실패면 failed 상태 유지
- `send`: client ID를 만든 optimistic message 추가
- `retry`: 실패 메시지를 다시 sending으로 전환 후 deliver

REST와 WebSocket 도착 순서가 정해져 있지 않아 ID dedup과 함수형 state update가 중요하다.

### `useRecommendations`

사용자 학과/찜 제목/현재 시간대 같은 context로 추천을 요청하고 응답 물품을 normalize한다. `current`, `history`, `error`, `refresh`를 제공한다. 이 Hook에는 별도 loading state가 없다.

### `useUserProfile`

profile/items/reviews를 병렬 로드하고 normalize한다. `refreshKey` 변경 때 열린 프로필을 다시 읽어 후기 공개를 반영한다. `reload`는 수동 version state를 올린다.

### `useNow`

현재 epoch를 1분마다 갱신해 “5분 전” 표시를 재렌더한다. tab이 hidden이면 interval을 멈추고 visible 복귀 시 즉시 갱신한다.

## STOMP client

`createChatSocket({url, accessToken, onStateChange, clientFactory})`은 Client를 만들고 connectHeaders에 Bearer token을 넣는다. 반환 객체는 `connect`, 방별 `subscribe`, `subscribeToChatList`, `subscribeToNotifications`, `publish`, `disconnect`를 제공한다. `subscribe(roomId, handler)`가 방 topic을 연결하고 `seenMessageIds`로 메시지 중복을 막는다. `publish(roomId, message)`는 backend `{message}` 계약을 `/app/chats/rooms/{roomId}/messages`에 발행한다. 현재 `useChatRooms.deliver()`의 실제 전송은 REST API를 사용하며 socket `publish`는 공개되어 있지만 Hook에서 호출하지 않는다.

## 순수 utility

- `availableItems(items)`: status가 available인 물품만
- `formatRelativeTime(value, now)`: 분/시간/일 전 또는 날짜. 잘못된 값은 빈 문자열
- `parseApiMode`: mock/development/production만 허용하고 기본값 결정
- `API_MODE`, `USE_API`: parsing된 현재 mode와 API 사용 여부 상수

## 상태 일관성 패턴

- 서버 DB가 source of truth이고 reload로 회복한다.
- 사용자 반응이 중요한 찜/채팅은 optimistic update 후 실패 rollback/failed 표시.
- ID로 dedup하여 실시간과 REST의 중복을 제거한다.
- 함수형 setter로 동시 비동기 callback이 최신 state를 기준으로 합쳐지게 한다.

## 면접 연결

**Q. 서버 state와 UI state 차이는?**

서버 state는 여러 사용자에게 공유되고 DB가 권위가 있다. modal open, input 같은 UI state는 현재 브라우저에만 있다. 이 프로젝트는 서버 state 전용 라이브러리 없이 custom Hook과 reload로 동기화한다.

**Q. 낙관적 업데이트 실패 시?**

이전 snapshot으로 rollback하거나 failed 상태와 retry를 제공한다. 동시에 들어온 다른 update를 덮지 않도록 ID 단위 merge와 최신 state 함수가 필요하다.
