# STOMP and Web Chat Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close STOMP destination-injection paths and make the browser chat recoverable, bounded, and capable of loading older messages.

**Architecture:** Keep REST as the authoritative message-write path and STOMP as realtime delivery. Split inbound authorization by command, add ID cursor pagination to REST, and make the browser socket adapter tolerate malformed frames and reconnect without unbounded memory.

**Tech Stack:** Spring WebSocket/STOMP, Spring Data JPA, React hooks, @stomp/stompjs, Vitest, JUnit 5

**Spec:** `docs/superpowers/specs/2026-08-23-platform-integration-chat-push-design.md`

## Global Constraints

- Execute after `2026-08-23-platform-source-integration.md`.
- Keep REST message persistence authoritative; clients do not publish chat messages directly to broker topics.
- Keep Spring simple broker and Cloud Run maximum instance count 1.
- Preserve existing UI layout and styling.
- Every behavior change follows a red-green test cycle.

---

### Task 1: Enforce Command-Specific STOMP Destinations

**Files:**
- Modify: `backend/src/main/java/com/save/chat/config/WebSocketAuthorizationInterceptor.java`
- Test: `backend/src/test/java/com/save/chat/WebSocketSecurityIntegrationTest.java`

**Interfaces:**
- Consumes: `ChatRoomService.assertParticipant(Integer roomId, Integer userId)`.
- Produces: `SEND_ROOM_DESTINATION` and `SUBSCRIBE_ROOM_DESTINATION` authorization rules.

- [ ] **Step 1: Add failing destination-direction tests**

Add tests that build authenticated STOMP accessors and assert:

```java
assertThatThrownBy(() -> preSend(StompCommand.SEND, "/topic/chats/rooms/3", principal))
        .hasMessageContaining("Unsupported");
assertThatThrownBy(() -> preSend(StompCommand.SUBSCRIBE,
        "/app/chats/rooms/3/messages", principal)).hasMessageContaining("Unsupported");
```

Also verify the valid `SEND /app/chats/rooms/3/messages` and `SUBSCRIBE /topic/chats/rooms/3` paths call `chatRoomService.assertParticipant(3, 7)`.

- [ ] **Step 2: Run the focused test and observe failure**

Run: `cd backend && ./gradlew test --tests com.save.chat.WebSocketSecurityIntegrationTest`

Expected: at least the topic `SEND` and app `SUBSCRIBE` tests fail against the shared regex.

- [ ] **Step 3: Split command authorization**

Use exact patterns:

```java
private static final Pattern SEND_ROOM_DESTINATION = Pattern.compile(
        "^/app/chats/rooms/(\\d+)/messages$");
private static final Pattern SUBSCRIBE_ROOM_DESTINATION = Pattern.compile(
        "^/topic/chats/rooms/(\\d+)$");
```

Select the pattern from `StompCommand.SEND` or `StompCommand.SUBSCRIBE`; reject any other destination before checking participation.

- [ ] **Step 4: Run focused and full chat tests**

Run: `cd backend && ./gradlew test --tests 'com.save.chat.*'`

Expected: all chat tests pass.

- [ ] **Step 5: Commit**

Run: `git add backend/src/main/java/com/save/chat/config/WebSocketAuthorizationInterceptor.java backend/src/test/java/com/save/chat/WebSocketSecurityIntegrationTest.java && git commit -m "security: restrict stomp command destinations"`

### Task 2: Add Message Cursor Pagination

**Files:**
- Modify: `backend/src/main/java/com/save/chat/controller/ChatMessageController.java`
- Modify: `backend/src/main/java/com/save/chat/service/ChatMessageService.java`
- Modify: `backend/src/main/java/com/save/chat/repository/ChatMessageRepository.java`
- Create: `backend/src/main/java/com/save/chat/dto/ChatMessagePageResponse.java`
- Test: `backend/src/test/java/com/save/chat/ChatMessagePaginationIntegrationTest.java`

**Interfaces:**
- Consumes: `GET /api/v1/chats/rooms/{roomId}/messages`.
- Produces: `ChatMessagePageResponse(List<ChatMessageResponse> messages, Integer nextBefore, boolean hasMore)` and query parameters `size`, `before`.

- [ ] **Step 1: Add a failing pagination integration test**

Create five ordered messages, request `size=2`, then request `before=<nextBefore>`. Assert the pages contain `[4,5]` then `[2,3]`, do not overlap, and a nonparticipant gets 403.

- [ ] **Step 2: Run the test and observe the missing page contract**

Run: `cd backend && ./gradlew test --tests com.save.chat.ChatMessagePaginationIntegrationTest`

Expected: compilation or response-shape failure because `before` and `ChatMessagePageResponse` do not exist.

- [ ] **Step 3: Add repository and service pagination**

Add repository methods returning `size + 1` rows:

```java
List<ChatMessage> findByChatRoomIdOrderByIdDesc(Integer roomId, Pageable pageable);
List<ChatMessage> findByChatRoomIdAndIdLessThanOrderByIdDesc(
        Integer roomId, Integer before, Pageable pageable);
```

Reverse only the retained `size` messages for chronological display. Set `hasMore` from the extra row and `nextBefore` to the oldest returned message ID when more rows exist.

- [ ] **Step 4: Return the page while retaining omitted-`before` compatibility**

Controller signature:

```java
public ChatMessagePageResponse messages(
        Integer roomId, Jwt jwt, int size, Optional<Integer> before)
```

Clients must accept the new object shape; no second legacy endpoint is added.

- [ ] **Step 5: Run chat and marketplace tests**

Run: `cd backend && ./gradlew test --tests 'com.save.chat.*' --tests com.save.MarketplaceIntegrationTest`

- [ ] **Step 6: Commit**

Run: `git add backend/src/main/java/com/save/chat backend/src/test/java/com/save/chat && git commit -m "feat: paginate chat messages by cursor"`

### Task 3: Harden the Browser STOMP Adapter

**Files:**
- Modify: `src/chat/stompClient.js`
- Test: `src/chat/stompClient.test.js`

**Interfaces:**
- Consumes: STOMP frames from room and personal destinations.
- Produces: `parseFrame(frame, onProtocolError)` behavior and a deduplication window capped at 500 IDs.

- [ ] **Step 1: Add failing malformed-frame and bounded-cache tests**

Assert invalid JSON calls `onProtocolError` without calling the message handler. Emit 501 unique IDs and then ID 1 again; assert ID 1 is accepted after eviction.

- [ ] **Step 2: Run the focused test and observe failure**

Run: `npm run test:run -- src/chat/stompClient.test.js`

Expected: invalid JSON throws and ID 1 remains permanently deduplicated.

- [ ] **Step 3: Implement bounded frame handling**

Extend `createChatSocket` with `onProtocolError = () => {}`. Maintain an insertion-order queue plus `Set`; evict the oldest ID whenever the size exceeds 500. Wrap JSON parsing for all three subscription types in `try/catch` and report only the failed frame.

- [ ] **Step 4: Remove the unused direct STOMP publish method**

Delete `publish(roomId, message)` and its test because `useChatRooms.deliver()` uses the authoritative REST API.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test:run -- src/chat/stompClient.test.js src/hooks/useChatRooms.test.jsx src/hooks/useChatRooms.dedup.test.jsx`

Run: `git add src/chat/stompClient.js src/chat/stompClient.test.js && git commit -m "fix: bound and isolate stomp frame processing"`

### Task 4: Add Browser Older-Message and Connection State

**Files:**
- Modify: `src/api/chats.js`
- Modify: `src/api/normalizers.js`
- Modify: `src/hooks/useChatRooms.js`
- Modify: `src/pages/ChatPage.jsx`
- Test: `src/api/normalizers.test.js`
- Test: `src/hooks/useChatRooms.test.jsx`
- Test: `src/pages/ChatPage.test.jsx`

**Interfaces:**
- Consumes: `{ messages, next_before, has_more }` from the backend.
- Produces: hook fields `loadOlder()`, `loadingOlder`, `hasOlder`, `socketState`.

- [ ] **Step 1: Add failing page-normalization and merge tests**

Assert snake_case page data becomes:

```js
{
  messages: [normalizedOldest, normalizedNewest],
  nextBefore: 12,
  hasMore: true,
}
```

Assert `loadOlder()` prepends messages without duplicating IDs already received over STOMP.

- [ ] **Step 2: Add failing UI state tests**

Assert a `이전 메시지 보기` button invokes `loadOlder`, and `socketState="disconnected"` renders `실시간 연결을 복구하는 중...` without removing existing messages.

- [ ] **Step 3: Run tests and observe failures**

Run: `npm run test:run -- src/api/normalizers.test.js src/hooks/useChatRooms.test.jsx src/pages/ChatPage.test.jsx`

- [ ] **Step 4: Implement API normalization and hook state**

`getChatMessages` sends `{ size: 50, before }`. `selectRoom` installs the first page; `loadOlder` uses the active room's `nextBefore`, prepends unique IDs, and updates `hasOlder` and `nextBefore`.

- [ ] **Step 5: Render controls using existing typography and colors**

Place the older-message control at the top of the message list and a neutral connection status below the chat header. Do not change dimensions, navigation, or the message bubble design.

- [ ] **Step 6: Run web verification and commit**

Run: `npm run test:run && npm run lint && npm run build`

Run: `git add src/api/chats.js src/api/normalizers.js src/api/normalizers.test.js src/hooks/useChatRooms.js src/hooks/useChatRooms.test.jsx src/pages/ChatPage.jsx src/pages/ChatPage.test.jsx && git commit -m "feat: recover and paginate web chat"`

### Task 5: Add a Real Broker Integration Gate

**Files:**
- Create: `backend/src/test/java/com/save/chat/WebSocketBrokerIntegrationTest.java`

**Interfaces:**
- Consumes: `/ws-chat`, JWT STOMP CONNECT header, room topic and app destination.
- Produces: An integration test proving a saved message reaches an authorized subscription and invalid direction is rejected.

- [ ] **Step 1: Write the failing Spring Boot WebSocket integration test**

Start on a random port, create two active participants and a room, connect with a signed access token, subscribe to the room topic, send through `/app/.../messages`, and await one frame with a bounded `CompletableFuture.get(5, SECONDS)`.

- [ ] **Step 2: Run and diagnose the first failure**

Run: `cd backend && ./gradlew test --tests com.save.chat.WebSocketBrokerIntegrationTest`

Expected: the new test initially exposes any test-client, auth-header, or transaction setup gap.

- [ ] **Step 3: Complete only the required test fixture integration**

Use the production `JwtTokenService` to create the CONNECT token and existing repositories for participants and room. Do not add a test-only unauthenticated endpoint.

- [ ] **Step 4: Run full backend tests and commit**

Run: `cd backend && ./gradlew test`

Run: `git add backend/src/test/java/com/save/chat/WebSocketBrokerIntegrationTest.java && git commit -m "test: verify authenticated websocket delivery"`
