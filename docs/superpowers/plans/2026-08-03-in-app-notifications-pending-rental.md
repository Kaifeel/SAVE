# In-App Notifications and Pending Rental Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the current chat fixes while adding persistent real-time rental notifications and a database-enforced first-request-wins `REQUEST_PENDING` item state.

**Architecture:** `RentalService` owns the rental/item state transaction and locks the item row before accepting a request. An in-app notification domain stores rental events and publishes committed notifications to a per-user STOMP destination; React loads the persisted snapshot through REST and merges real-time updates by notification ID.

**Tech Stack:** Java 17, Spring Boot 3, Spring Data JPA, Flyway, H2/PostgreSQL, Spring WebSocket/STOMP, React 19, Vite, Vitest, Testing Library.

## Global Constraints

- Work on the existing `feature/item-time-rental-flow` branch.
- Do not overwrite `App.jsx`, `useChatRooms.js`, or other current files with the notification snapshot; merge only notification-specific behavior.
- Preserve chat snapshot merging, message deduplication, room-read updates, and auth-change chat clearing.
- `ItemStatus` must be exactly `AVAILABLE`, `REQUEST_PENDING`, `RESERVED`, `RENTED`, `DELETED`.
- Only one active rental request may exist for an item; the database transaction decides the first winner.
- Initial in-app notification types are exactly `RENTAL_REQUESTED`, `RENTAL_APPROVED`, and `RENTAL_REJECTED`.
- Rental cancellation, payment, start, and return notifications and Firebase rental push are out of scope.
- Do not add a new frontend or backend dependency.

---

## File Map

**Backend rental state**

- Modify `backend/src/main/java/com/save/item/ItemStatus.java`: add `REQUEST_PENDING`.
- Modify `backend/src/main/java/com/save/item/ItemRepository.java`: expose a pessimistic-write item lookup.
- Modify `backend/src/main/java/com/save/rental/RentalService.java`: perform atomic state transitions.
- Modify `backend/src/main/java/com/save/item/ItemService.java`: prevent the generic item-status endpoint from bypassing rental transitions.
- Modify `backend/src/test/java/com/save/MarketplaceIntegrationTest.java`: verify the public rental flow and item states.

**Backend in-app notifications**

- Create `backend/src/main/java/com/save/notification/InAppNotification.java`: persistent notification entity.
- Create `backend/src/main/java/com/save/notification/InAppNotificationType.java`: supported rental notification enum.
- Create `backend/src/main/java/com/save/notification/InAppNotificationRepository.java`: owned list/read queries.
- Create `backend/src/main/java/com/save/notification/InAppNotificationResponse.java`: REST/STOMP contract.
- Create `backend/src/main/java/com/save/notification/InAppNotificationCreatedEvent.java`: after-commit payload.
- Create `backend/src/main/java/com/save/notification/InAppNotificationService.java`: creation and read operations.
- Create `backend/src/main/java/com/save/notification/InAppNotificationController.java`: authenticated REST endpoints.
- Create `backend/src/main/java/com/save/notification/InAppNotificationRealtimeListener.java`: personal STOMP publishing.
- Create `backend/src/main/resources/db/migration/V3__create_in_app_notifications.sql`: additive production migration.
- Create `backend/src/test/java/com/save/notification/InAppNotificationServiceTest.java`: recipient/type unit tests.
- Create `backend/src/test/java/com/save/notification/InAppNotificationRealtimeListenerTest.java`: destination unit test.
- Modify `backend/src/main/java/com/save/chat/config/WebSocketAuthorizationInterceptor.java`: authorize the personal notification queue.
- Modify `backend/src/test/java/com/save/chat/WebSocketSecurityIntegrationTest.java`: cover notification subscription authentication.

**Frontend notifications**

- Create `src/api/notifications.js`: normalization and REST operations.
- Create `src/api/notifications.test.js`: API contract tests.
- Modify `src/chat/stompClient.js`: personal notification subscription.
- Modify `src/chat/stompClient.test.js`: notification destination test.
- Modify `src/hooks/useChatRooms.js`: forward notification frames without removing `onRoomRead`.
- Modify `src/hooks/useChatRooms.test.jsx`: verify forwarding and preserve read behavior.
- Modify `src/App.jsx`: load, merge, render, and mark notifications read while preserving chat state behavior.
- Create `src/App.notifications.test.jsx`: notification menu integration test.
- Modify `src/ProductDetailPage.jsx`: remove the owner's manual rental-state toggle.
- Modify `src/ProductDetailPage.owner.test.jsx`: assert that manual state mutation is absent.

**Documentation**

- Modify `backend/docs/database-tables.md`: document `REQUEST_PENDING` and notifications.
- Modify `backend/docs/schema.dbml`: add `notifications` and its references.
- Modify `backend/README.md`: document notification API and rental state flow.

---

### Task 1: Enforce the First-Request-Wins Item State

**Files:**
- Modify: `backend/src/test/java/com/save/MarketplaceIntegrationTest.java`
- Modify: `backend/src/main/java/com/save/item/ItemStatus.java`
- Modify: `backend/src/main/java/com/save/item/ItemRepository.java`
- Modify: `backend/src/main/java/com/save/rental/RentalService.java`
- Modify: `backend/src/main/java/com/save/item/ItemService.java`

**Interfaces:**
- Produces: `ItemRepository.findByIdForUpdate(Integer itemId): Optional<Item>`.
- Produces: `ItemStatus.REQUEST_PENDING` for later notification and UI work.
- Preserves: existing rental controller routes and `RentalResponse` JSON.

- [ ] **Step 1: Write failing integration assertions for the pending transition**

In `MarketplaceIntegrationTest.frontendMarketplaceFlowUsesImplementedApis`, assert the item state after request, approval, start, and return:

```java
mockMvc.perform(get("/api/v1/items/{itemId}", itemId)
        .header("Authorization", bearer(borrowerToken)))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.status").value("REQUEST_PENDING"));

mockMvc.perform(patch("/api/v1/rentals/{rentalId}/approve", rentalId)
        .header("Authorization", bearer(ownerToken)))
    .andExpect(status().isOk());
mockMvc.perform(get("/api/v1/items/{itemId}", itemId)
        .header("Authorization", bearer(borrowerToken)))
    .andExpect(jsonPath("$.status").value("RESERVED"));
```

Add a separate test that creates a second borrower and chat room, then attempts a second rental after the first request:

```java
mockMvc.perform(post("/api/v1/rentals")
        .header("Authorization", bearer(secondBorrowerToken))
        .contentType(MediaType.APPLICATION_JSON)
        .content(secondRequestJson))
    .andExpect(status().isConflict());
```

Add reject and pre-approval cancel cases that finish with `GET /items/{id}` returning `AVAILABLE`.

- [ ] **Step 2: Run the targeted integration test and verify RED**

Run:

```bash
cd backend
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew test --tests com.save.MarketplaceIntegrationTest
```

Expected: failure because `REQUEST_PENDING` is not a valid `ItemStatus` and a created request leaves the item `AVAILABLE`.

- [ ] **Step 3: Add the pending enum and locking repository method**

Change `ItemStatus` to:

```java
public enum ItemStatus {
    AVAILABLE, REQUEST_PENDING, RESERVED, RENTED, DELETED
}
```

Add to `ItemRepository`:

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select i from Item i where i.id = :itemId")
Optional<Item> findByIdForUpdate(@Param("itemId") Integer itemId);
```

Import `jakarta.persistence.LockModeType`, `java.util.Optional`, `org.springframework.data.jpa.repository.Lock`, `Query`, and `org.springframework.data.repository.query.Param`.

- [ ] **Step 4: Implement atomic rental/item transitions**

In `RentalService.create`, replace `itemRepository.findById(...)` with `findByIdForUpdate(...)`. After saving the rental and before returning, set:

```java
item.changeStatus(ItemStatus.REQUEST_PENDING);
```

Keep the current active-rental existence check as a defensive invariant. Update transitions exactly as follows:

```java
approve: REQUESTED + REQUEST_PENDING -> APPROVED + RESERVED
reject:  REQUESTED + REQUEST_PENDING -> REJECTED + AVAILABLE
cancel REQUESTED: REQUEST_PENDING -> CANCELED + AVAILABLE
cancel APPROVED:  RESERVED -> CANCELED + AVAILABLE
markPaid: APPROVED + RESERVED -> PAID + RESERVED
startRenting: PAID + RESERVED -> RENTING + RENTED
returnItem: RENTING + RENTED -> RETURNED + AVAILABLE
```

Before each item transition, reject an inconsistent item state with `BusinessException(HttpStatus.CONFLICT, "게시물과 대여 상태가 일치하지 않습니다.")`.

In `ItemService.changeStatus`, reject calls that try to mutate rental-controlled states:

```java
throw new BusinessException(HttpStatus.CONFLICT,
        "대여 상태는 대여 절차에서만 변경할 수 있습니다.");
```

Deletion remains handled by the existing delete endpoint.

- [ ] **Step 5: Run the targeted integration test and verify GREEN**

Run the Task 1 command again. Expected: all `MarketplaceIntegrationTest` methods pass and the second request returns 409.

- [ ] **Step 6: Commit Task 1**

```bash
git add backend/src/main/java/com/save/item/ItemStatus.java backend/src/main/java/com/save/item/ItemRepository.java backend/src/main/java/com/save/item/ItemService.java backend/src/main/java/com/save/rental/RentalService.java backend/src/test/java/com/save/MarketplaceIntegrationTest.java
git commit -m "feat: lock items during rental requests"
```

---

### Task 2: Persist and Query In-App Notifications

**Files:**
- Create: `backend/src/main/java/com/save/notification/InAppNotification.java`
- Create: `backend/src/main/java/com/save/notification/InAppNotificationType.java`
- Create: `backend/src/main/java/com/save/notification/InAppNotificationRepository.java`
- Create: `backend/src/main/java/com/save/notification/InAppNotificationResponse.java`
- Create: `backend/src/main/java/com/save/notification/InAppNotificationCreatedEvent.java`
- Create: `backend/src/main/java/com/save/notification/InAppNotificationService.java`
- Create: `backend/src/main/java/com/save/notification/InAppNotificationController.java`
- Create: `backend/src/main/resources/db/migration/V3__create_in_app_notifications.sql`
- Create: `backend/src/test/java/com/save/notification/InAppNotificationServiceTest.java`

**Interfaces:**
- Produces: `rentalRequested(Rental)`, `rentalApproved(Rental)`, `rentalRejected(Rental)`.
- Produces: authenticated REST list/count/read/read-all endpoints under `/api/v1/notifications`.
- Produces: `InAppNotificationCreatedEvent(Integer recipientId, InAppNotificationResponse notification)`.

- [ ] **Step 1: Write the failing notification service test**

Create `InAppNotificationServiceTest` with Mockito and verify the exact recipient/type mapping:

```java
@Test
void storesRentalRequestForLenderAndPublishesStoredNotification() {
    Rental rental = mock(Rental.class);
    User lender = mock(User.class);
    Item item = mock(Item.class);
    when(lender.getId()).thenReturn(2);
    when(item.getId()).thenReturn(4);
    when(item.getTitle()).thenReturn("테스트 물품");
    when(rental.getId()).thenReturn(5);
    when(rental.getLender()).thenReturn(lender);
    when(rental.getItem()).thenReturn(item);
    when(repository.save(any(InAppNotification.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    service.rentalRequested(rental);

    ArgumentCaptor<InAppNotification> stored =
        ArgumentCaptor.forClass(InAppNotification.class);
    verify(repository).save(stored.capture());
    assertThat(stored.getValue().getRecipient()).isSameAs(lender);
    assertThat(stored.getValue().getType())
        .isEqualTo(InAppNotificationType.RENTAL_REQUESTED);
    verify(eventPublisher).publishEvent(any(InAppNotificationCreatedEvent.class));
}
```

Add parallel assertions for approved/rejected notifications targeting the borrower.

- [ ] **Step 2: Run the notification test and verify RED**

```bash
cd backend
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew test --tests com.save.notification.InAppNotificationServiceTest
```

Expected: compilation failure because the in-app notification types do not exist.

- [ ] **Step 3: Create the entity, enum, response, repository, and event**

Use these exact core declarations:

```java
public enum InAppNotificationType {
    RENTAL_REQUESTED, RENTAL_APPROVED, RENTAL_REJECTED
}

public record InAppNotificationCreatedEvent(
        Integer recipientId,
        InAppNotificationResponse notification
) {}

public record InAppNotificationResponse(
        Integer id, String type, Integer rentalId, Integer itemId,
        String title, String content, boolean read, LocalDateTime createdAt
) {}
```

Map `InAppNotification` to `notifications` with required `recipient`, required `rental`, enum `type`, `title(100)`, `content(500)`, `is_read`, `created_at`, and nullable `read_at`. `markRead()` changes the flag and sets `readAt` only on the first call.

Define repository methods exactly:

```java
List<InAppNotification> findTop50ByRecipientIdOrderByCreatedAtDesc(Integer userId);
Optional<InAppNotification> findByIdAndRecipientId(Integer id, Integer userId);
long countByRecipientIdAndReadFalse(Integer userId);

@Modifying
@Query("""
    update InAppNotification n
       set n.read = true, n.readAt = CURRENT_TIMESTAMP
     where n.recipient.id = :userId and n.read = false
    """)
int markAllRead(@Param("userId") Integer userId);
```

- [ ] **Step 4: Implement the service and authenticated controller**

`InAppNotificationService` must store the notification before publishing its event. It exposes the three rental creation methods plus `getMine`, `unreadCount`, `markRead`, and `markAllRead`. `markRead` must use `findByIdAndRecipientId`; a missing owned record returns a 404 `BusinessException`.

Create controller mappings:

```java
@GetMapping
List<InAppNotificationResponse> mine(...)

@GetMapping("/unread-count")
Map<String, Long> unreadCount(...)

@PatchMapping("/{notificationId}/read")
InAppNotificationResponse markRead(...)

@PatchMapping("/read-all")
ResponseEntity<Void> markAllRead(...)
```

Resolve the current user with `Integer.valueOf(jwt.getSubject())` for every operation.

- [ ] **Step 5: Add the additive Flyway migration**

Create `V3__create_in_app_notifications.sql`:

```sql
CREATE TABLE notifications (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    rental_id INTEGER NOT NULL REFERENCES rentals(id),
    type VARCHAR(30) NOT NULL,
    title VARCHAR(100) NOT NULL,
    content VARCHAR(500) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user_created
    ON notifications(user_id, created_at);
CREATE INDEX idx_notifications_user_read
    ON notifications(user_id, is_read);
```

- [ ] **Step 6: Run the notification test and verify GREEN**

Run the Task 2 test command. Expected: request, approval, and rejection mapping tests pass.

- [ ] **Step 7: Commit Task 2**

```bash
git add backend/src/main/java/com/save/notification/InAppNotification.java backend/src/main/java/com/save/notification/InAppNotificationType.java backend/src/main/java/com/save/notification/InAppNotificationRepository.java backend/src/main/java/com/save/notification/InAppNotificationResponse.java backend/src/main/java/com/save/notification/InAppNotificationCreatedEvent.java backend/src/main/java/com/save/notification/InAppNotificationService.java backend/src/main/java/com/save/notification/InAppNotificationController.java backend/src/main/resources/db/migration/V3__create_in_app_notifications.sql backend/src/test/java/com/save/notification/InAppNotificationServiceTest.java
git commit -m "feat: persist rental notifications"
```

---

### Task 3: Emit Rental Notifications After Commit

**Files:**
- Modify: `backend/src/main/java/com/save/rental/RentalService.java`
- Create: `backend/src/main/java/com/save/notification/InAppNotificationRealtimeListener.java`
- Create: `backend/src/test/java/com/save/notification/InAppNotificationRealtimeListenerTest.java`
- Modify: `backend/src/main/java/com/save/chat/config/WebSocketAuthorizationInterceptor.java`
- Modify: `backend/src/test/java/com/save/chat/WebSocketSecurityIntegrationTest.java`
- Modify: `backend/src/test/java/com/save/MarketplaceIntegrationTest.java`

**Interfaces:**
- Consumes: Task 2 `InAppNotificationService` and `InAppNotificationCreatedEvent`.
- Produces: `/user/queue/notifications` authenticated STOMP stream.

- [ ] **Step 1: Write failing real-time and integration tests**

Create a listener unit test:

```java
@Test
void sendsCommittedNotificationToRecipientQueue() {
    InAppNotificationResponse response = new InAppNotificationResponse(
        3, "RENTAL_REQUESTED", 7, 9, "새 대여 요청", "요청이 도착했습니다.",
        false, LocalDateTime.parse("2026-08-03T12:00:00"));

    listener.onCreated(new InAppNotificationCreatedEvent(2, response));

    verify(messagingTemplate).convertAndSendToUser(
        "2", "/queue/notifications", response);
}
```

Extend `MarketplaceIntegrationTest` so the owner sees `RENTAL_REQUESTED`, the borrower sees `RENTAL_APPROVED` after approval, and a rejected request produces `RENTAL_REJECTED`:

```java
mockMvc.perform(get("/api/v1/notifications")
        .header("Authorization", bearer(ownerToken)))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$[0].type").value("RENTAL_REQUESTED"));
```

Extend WebSocket security coverage so an unauthenticated subscription to `/user/queue/notifications` is rejected and an authenticated subscription is accepted.

- [ ] **Step 2: Run targeted tests and verify RED**

```bash
cd backend
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew test --tests com.save.notification.InAppNotificationRealtimeListenerTest --tests com.save.MarketplaceIntegrationTest --tests com.save.chat.WebSocketSecurityIntegrationTest
```

Expected: listener class is missing and rental operations create no notifications.

- [ ] **Step 3: Wire notifications into rental transitions**

Inject `InAppNotificationService` into `RentalService`. Call methods only after each state mutation succeeds:

```java
create:  notificationService.rentalRequested(rental)
approve: notificationService.rentalApproved(rental)
reject:  notificationService.rentalRejected(rental)
```

Do not publish notification events for cancellation, payment, start, or return.

- [ ] **Step 4: Add after-commit STOMP publishing and authorization**

Implement the listener:

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void onCreated(InAppNotificationCreatedEvent event) {
    messagingTemplate.convertAndSendToUser(
        event.recipientId().toString(),
        "/queue/notifications",
        event.notification());
}
```

In `WebSocketAuthorizationInterceptor`, add:

```java
private static final String NOTIFICATION_DESTINATION = "/user/queue/notifications";
```

Treat this destination like `/user/queue/chat-list`: require an authenticated STOMP user without applying chat-room participant parsing.

- [ ] **Step 5: Run targeted tests and verify GREEN**

Run the Task 3 command. Expected: all listener, marketplace, and WebSocket security tests pass.

- [ ] **Step 6: Commit Task 3**

```bash
git add backend/src/main/java/com/save/rental/RentalService.java backend/src/main/java/com/save/notification/InAppNotificationRealtimeListener.java backend/src/test/java/com/save/notification/InAppNotificationRealtimeListenerTest.java backend/src/main/java/com/save/chat/config/WebSocketAuthorizationInterceptor.java backend/src/test/java/com/save/chat/WebSocketSecurityIntegrationTest.java backend/src/test/java/com/save/MarketplaceIntegrationTest.java
git commit -m "feat: deliver rental notifications in real time"
```

---

### Task 4: Add the Frontend Notification Transport

**Files:**
- Create: `src/api/notifications.js`
- Create: `src/api/notifications.test.js`
- Modify: `src/chat/stompClient.js`
- Modify: `src/chat/stompClient.test.js`
- Modify: `src/hooks/useChatRooms.js`
- Modify: `src/hooks/useChatRooms.test.jsx`

**Interfaces:**
- Produces: `getNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `normalizeNotification`.
- Produces: `socket.subscribeToNotifications(handler): unsubscribe`.
- Produces: optional `useChatRooms({ onNotification })` callback while preserving `onRoomRead`.

- [ ] **Step 1: Write failing REST and STOMP tests**

In `notifications.test.js`, verify snake/camel normalization and authenticated calls:

```js
expect(normalizeNotification({
  id: 3,
  type: 'RENTAL_APPROVED',
  rental_id: 7,
  item_id: 9,
  title: '대여 요청 승인',
  content: '승인되었습니다.',
  read: false,
  created_at: '2026-08-03T12:00:00',
})).toMatchObject({
  id: 3,
  rentalId: 7,
  itemId: 9,
  text: '승인되었습니다.',
  read: false,
})
```

In the fake STOMP client, add `emitNotification(body)` for `/user/queue/notifications`, then assert:

```js
socket.subscribeToNotifications(handler)
client.emitNotification({ id: 3, type: 'RENTAL_REQUESTED' })
expect(client.subscribe).toHaveBeenCalledWith(
  '/user/queue/notifications', expect.any(Function))
expect(handler).toHaveBeenCalledWith({ id: 3, type: 'RENTAL_REQUESTED' })
```

In `useChatRooms.test.jsx`, connect a fake socket, emit a notification, and assert `onNotification` receives it. Keep the existing `onRoomRead` assertion unchanged.

- [ ] **Step 2: Run focused frontend tests and verify RED**

```bash
npm run test:run -- src/api/notifications.test.js src/chat/stompClient.test.js src/hooks/useChatRooms.test.jsx
```

Expected: notification module and subscription methods are missing.

- [ ] **Step 3: Implement the REST adapter**

`normalizeNotification` must return:

```js
{
  id,
  type,
  rentalId,
  itemId,
  title,
  text,
  read,
  time,
}
```

Format a valid timestamp with `toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })`; preserve an invalid input string and return an empty string for a missing time.

Implement authenticated REST calls to:

```text
GET   /notifications
PATCH /notifications/{id}/read
PATCH /notifications/read-all
```

- [ ] **Step 4: Implement STOMP subscription and hook forwarding**

Add one replaceable subscription under key `notifications`:

```js
subscribeToNotifications(handler) {
  subscriptions.get('notifications')?.unsubscribe()
  const subscription = client.subscribe('/user/queue/notifications', frame => {
    handler(JSON.parse(frame.body))
  })
  subscriptions.set('notifications', subscription)
  return () => {
    subscription.unsubscribe()
    subscriptions.delete('notifications')
  }
}
```

Add `onNotification` to `useChatRooms` and subscribe only while the socket is connected. Do not remove `onRoomRead`; keep calling it after the REST mark-read request succeeds.

- [ ] **Step 5: Run focused frontend tests and verify GREEN**

Run the Task 4 command. Expected: REST, STOMP, notification forwarding, and existing room-read tests pass.

- [ ] **Step 6: Commit Task 4**

```bash
git add src/api/notifications.js src/api/notifications.test.js src/chat/stompClient.js src/chat/stompClient.test.js src/hooks/useChatRooms.js src/hooks/useChatRooms.test.jsx
git commit -m "feat: add realtime notification transport"
```

---

### Task 5: Integrate the Notification Bell Without Regressing Chat

**Files:**
- Create: `src/App.notifications.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/ProductDetailPage.jsx`
- Modify: `src/ProductDetailPage.owner.test.jsx`

**Interfaces:**
- Consumes: Task 4 REST helpers and `useChatRooms.onNotification`.
- Preserves: `mergeChatRoomSnapshot`, `mergeChatListUpdate`, `handleChatRoomRead`, and auth-change chat clearing.

- [ ] **Step 1: Write failing App notification tests**

Mock `getNotifications` to resolve one unread stored notification, render `App`, open the accessible bell button, and assert the content is shown:

```jsx
const bell = await screen.findByRole('button', { name: '알림 열기' })
fireEvent.click(bell)
expect(await screen.findByRole('dialog', { name: '알림 목록' }))
  .toBeInTheDocument()
expect(screen.getByText('새 대여 요청')).toBeInTheDocument()
expect(screen.getByText('카메라 대여 요청이 도착했습니다.')).toBeInTheDocument()
```

Capture the `onNotification` callback passed to the mocked `useChatRooms`, invoke it twice with the same ID, and assert one list item is rendered. Click `모두 읽음`, assert `markAllNotificationsRead('jwt')`, and assert the unread indicator disappears.

Update `ProductDetailPage.owner.test.jsx`:

```jsx
expect(screen.queryByRole('button', { name: /대여 중으로 변경/ }))
  .not.toBeInTheDocument()
expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
```

- [ ] **Step 2: Run focused component tests and verify RED**

```bash
npm run test:run -- src/App.notifications.test.jsx src/ProductDetailPage.owner.test.jsx src/App.googleRedirect.test.jsx src/hooks/useChatRooms.dedup.test.jsx
```

Expected: persisted notifications are not loaded and the manual status button still exists.

- [ ] **Step 3: Selectively merge notification state into App**

Import `getNotifications`, `markAllNotificationsRead`, and `normalizeNotification`. Replace hardcoded API-mode notification data with `useState([])` while retaining mock notifications only when `USE_API` is false.

Keep these current behaviors unchanged:

```js
setChats(current => mergeChatRoomSnapshot(current, roomResponse))
handleChatRoomRead(roomId)
setChats([])
setActiveChatRoom(null)
```

Load notifications after authenticated profile completion. Merge real-time notifications by ID:

```js
const handleNotification = useCallback(response => {
  const incoming = normalizeNotification(response)
  setNotifications(current => current.some(entry => entry.id === incoming.id)
    ? current
    : [incoming, ...current])
}, [])
```

Pass both `onNotification: handleNotification` and `onRoomRead: handleChatRoomRead` to `useChatRooms`.

- [ ] **Step 4: Make the bell accessible and persistent**

Add `type="button"`, `aria-label="알림 열기"`, and `aria-expanded`. Give the menu `role="dialog"` and `aria-label="알림 목록"`. On `모두 읽음`, await the backend request in API mode, then update all local entries to `read: true`; on failure leave them unread and show the existing error toast.

- [ ] **Step 5: Remove the manual owner rental-status button**

Change the owner action area to two columns containing only 수정 and 삭제. Remove the `onStatusChange` prop and its `App.jsx` callback so rental state changes can occur only through rental transition APIs.

- [ ] **Step 6: Run focused component tests and verify GREEN**

Run the Task 5 command. Expected: notification UI tests and all named chat/auth regression tests pass.

- [ ] **Step 7: Commit Task 5**

```bash
git add src/App.jsx src/App.notifications.test.jsx src/ProductDetailPage.jsx src/ProductDetailPage.owner.test.jsx
git commit -m "feat: show persisted rental notifications"
```

---

### Task 6: Update the ERD and Run Full Verification

**Files:**
- Modify: `backend/docs/database-tables.md`
- Modify: `backend/docs/schema.dbml`
- Modify: `backend/README.md`

**Interfaces:**
- Documents: Task 1 item states and Task 2 notification schema/API.

- [ ] **Step 1: Update schema documentation**

In every item status list, replace:

```text
AVAILABLE, RESERVED, RENTED, DELETED
```

with:

```text
AVAILABLE, REQUEST_PENDING, RESERVED, RENTED, DELETED
```

Add the `notifications` table with `user_id -> users.id` and `rental_id -> rentals.id`, the exact columns from `V3`, and both index names. Add the four REST endpoints and the `/user/queue/notifications` STOMP destination to `backend/README.md`.

- [ ] **Step 2: Verify database migration ordering and working-tree hygiene**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intended Task 6 documentation changes remain uncommitted.

- [ ] **Step 3: Run the full backend suite**

```bash
cd backend
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew test
```

Expected: `BUILD SUCCESSFUL` with zero failed tests.

- [ ] **Step 4: Run the full frontend suite**

From the repository root:

```bash
npm run test:run
```

Expected: all test files and tests pass.

- [ ] **Step 5: Run lint and production build**

```bash
npm run lint
npm run build
```

Expected: ESLint exits 0 and Vite reports a successful production build.

- [ ] **Step 6: Commit documentation**

```bash
git add backend/docs/database-tables.md backend/docs/schema.dbml backend/README.md
git commit -m "docs: document rental notifications and pending state"
```

- [ ] **Step 7: Verify the final branch state**

```bash
git status --short
git log --oneline -8
```

Expected: clean working tree and the six implementation commits after the design/plan commits.
