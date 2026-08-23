# 07. 채팅과 알림

## 채팅 도메인 구조

```text
REST: Controller → ChatRoomService/ChatMessageService → Repository → DB
STOMP: ChatWebSocketController → ChatMessageService → ChatRealtimePublisher
커밋 이벤트: ChatMessageCreatedEvent → ChatNotificationListener → Firebase
```

## 채팅방

`ChatRoom`은 item, borrower, lender의 조합이며 DB unique constraint로 같은 조합의 방이 두 개 생기지 않게 한다.

`ChatRoomService.createOrGet(itemId, borrowerId)`는 물품과 사용자를 찾고 본인 물품 채팅을 거부한 뒤 기존 방을 반환하거나 새 방을 저장한다. `getMine(userId)`은 자신이 borrower 또는 lender인 방을 가져와 마지막 메시지, 상대 이름, unread count와 함께 `ChatRoomListResponse`로 만든다.

`ChatRoomController` endpoint:

- `POST /api/v1/chats/rooms`: 생성 또는 기존 방 반환
- `GET /api/v1/chats/rooms`: 내 채팅방 목록

## 메시지

`ChatMessageService.send(roomId, senderId, request)`는 방 참여자인지 확인하고 trim/길이 검증 후 메시지를 저장한다. 저장 성공 이벤트는 수신자 ID를 포함한다. `messages()`는 참여자만 최근 size개를 조회하고 시간순으로 응답한다. `markRead()`는 상대가 보낸 안 읽은 메시지를 일괄 update한다.

`ChatMessageController`는 REST 전송/목록/읽음을 담당한다. REST `send()` 뒤 `ChatRealtimePublisher`가 방 topic과 양쪽 개인 채팅 목록 queue에 갱신을 보낸다. `read()` 뒤에도 개인 목록을 다시 발행해 unread badge가 갱신된다.

## STOMP WebSocket

WebSocket은 연결을 유지해 서버가 먼저 데이터를 보낼 수 있다. STOMP는 그 연결 위에 destination, subscribe, message라는 규칙을 제공한다.

- 연결 endpoint: `/ws-chat`
- 방 메시지 발행: `/app/chats/rooms/{roomId}/messages`
- 방 구독: `/topic/chats/rooms/{roomId}`
- 개인 채팅 목록: `/user/queue/chat-list`
- 개인 알림: `/user/queue/notifications`

`WebSocketAuthorizationInterceptor`는 STOMP `CONNECT`의 Authorization Bearer JWT를 decode하고 Principal을 설정한다. SUBSCRIBE/SEND에서도 사용자의 destination 접근을 확인한다. `WebSocketConfig`는 endpoint, application prefix, broker prefix를 등록한다. `ChatWebSocketController.send()`는 `@MessageMapping` 요청을 Service와 publisher로 연결한다.

프론트 `stompClient.js`는 연결 시 token을 header에 넣고, 방/개인 queue를 구독하며 메시지 ID Set으로 중복 수신을 막는다. REST 응답보다 WebSocket echo가 먼저 도착할 수 있어 `useChatRooms`도 ID로 병합한다.

## 실시간 발행과 트랜잭션

`ChatRealtimePublisher`는 `SimpMessagingTemplate`을 사용한다.

- 방 topic: 참여 중인 두 브라우저가 새 메시지 수신
- user destination: 각 사용자에게 개인화된 채팅방 요약 전송
- 개인 발행 실패가 저장된 REST 응답까지 실패시키지 않도록 격리

실시간 전송은 일시적이며 DB 메시지가 source of truth다. 재연결하면 REST로 메시지와 채팅방 snapshot을 다시 불러온다.

## 앱 안 알림

`InAppNotification`은 recipient, rental, type, title/content, read, created/read 시각을 DB에 저장한다.

- `rentalRequested`: lender에게 신청 알림
- `rentalStarted`: borrower에게 거래 시작 알림(타입명은 legacy `RENTAL_APPROVED`)
- `rentalRejected`: borrower에게 거절 알림
- `reviewPublished`: 양쪽에게 후기 공개 알림
- `getMine/unreadCount`: 최근 50개와 읽지 않은 개수
- `markRead/markAllRead`: 본인의 알림만 변경

Service가 저장 후 `InAppNotificationCreatedEvent`를 publish한다. `InAppNotificationRealtimeListener`의 `@TransactionalEventListener(AFTER_COMMIT)`가 커밋 성공 뒤 `/user/queue/notifications`로 전송한다. DB 롤백 시 “실제로 없는 대여” 알림이 나가지 않는다.

## Firebase 앱 밖 푸시

`DeviceTokenService`는 사용자별 FCM device token 등록/해제/비활성화를 담당한다. 같은 token 재등록은 user/platform을 갱신하고 활성화한다.

`ChatMessageCreatedEvent`는 commit 후 `ChatNotificationListener`의 `@Async` 처리로 `PushNotificationService.sendChatMessage()`에 전달된다. 활성 token마다 Firebase message를 보내며 `UNREGISTERED` 오류 token은 disable한다. Firebase 설정이 없으면 채팅 저장은 정상이고 푸시만 생략한다.

현재 저장소에 React Native 앱은 없으므로 device token 등록 UI는 구현되어 있지 않다. 백엔드 endpoint와 README 예시만 준비된 상태다.

## 파일 책임 요약

- `domain/ChatRoom`, `ChatMessage`: JPA Entity
- `controller/*`: REST/STOMP 입력 어댑터
- `service/ChatRoomService`, `ChatMessageService`: 참여자·메시지 규칙
- `service/ChatRealtimePublisher`: broker 발행
- `repository/*`: 방/메시지 조회, unread update
- `dto/*`: 요청/응답 계약
- `config/*`: STOMP broker와 JWT 인가
- `notification/InAppNotification*`: 영속 앱 안 알림
- `notification/DeviceToken*`, `FirebaseConfig`, `PushNotificationService`: FCM

## 면접 연결

**WebSocket과 HTTP polling:** polling은 매번 HTTP 요청해 새 데이터가 없어도 비용이 든다. WebSocket은 연결을 유지해 낮은 지연의 양방향 전송이 가능하지만 연결 상태, 인증 갱신, 재연결, 서버 확장이 복잡하다.

**At-most-once/at-least-once:** 네트워크 재시도와 REST/WebSocket 두 경로 때문에 같은 메시지를 UI가 두 번 볼 수 있다. 영속 message ID 기반 dedup으로 화면을 멱등적으로 만든다.

**Event after commit:** 외부 전송을 DB commit 전에 하면 롤백 후에도 알림이 남는다. after-commit은 일관성을 높이지만 전송 실패 재시도를 완전히 보장하는 outbox pattern은 아니다.
