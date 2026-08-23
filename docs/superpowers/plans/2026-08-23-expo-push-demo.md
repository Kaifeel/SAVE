# Expo Push and Capstone Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver cross-platform Expo notification code, production-tolerant Expo Push Service delivery, an Android private-demo build, and an iPhone Expo Go rehearsal path.

**Architecture:** Expo obtains and rotates Expo Push Tokens; Spring stores token ownership and sends transaction-after-commit messages through a focused Expo Push HTTP client. Ticket IDs are persisted and a scheduled receipt checker disables permanently invalid tokens without failing chat or rental transactions.

**Tech Stack:** expo-notifications ~57.0.9, Expo Push Service, Spring RestClient, JPA/Flyway, EAS development/internal builds

**Spec:** `docs/superpowers/specs/2026-08-23-platform-integration-chat-push-design.md`

## Global Constraints

- Execute after the source-integration and Expo chat plans.
- Notification denial or delivery failure must never prevent login, chat persistence, or rental transitions.
- Implement Android/iOS-compatible app code; distribute only Android in this milestone.
- iPhone acceptance is Expo Go core-flow rehearsal, not App Store/TestFlight or production iOS push.
- Read Expo SDK 57 notification documentation immediately before dependency/config changes.

---

### Task 1: Replace Firebase Target Semantics with Expo Push Tokens

**Files:**
- Modify: `backend/src/main/java/com/save/notification/DeviceTokenRequest.java`
- Modify: `backend/src/main/java/com/save/notification/DeviceTokenService.java`
- Modify: `backend/src/main/java/com/save/notification/UserDeviceToken.java`
- Test: `backend/src/test/java/com/save/notification/DeviceTokenServiceTest.java`
- Create: `backend/src/test/java/com/save/notification/DeviceTokenControllerIntegrationTest.java`

**Interfaces:**
- Consumes: `PUT/DELETE /api/v1/device-tokens` and existing `user_device_tokens` table.
- Produces: validated Expo Push Token ownership with Android/iOS platform metadata.

- [ ] **Step 1: Write failing validation and ownership tests**

Accept `ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]` and `ExponentPushToken[...]`. Reject blank, over-512-character, and non-Expo token strings with 400. Verify registering an existing token transfers it to the authenticated user, and one user cannot delete another user's token.

- [ ] **Step 2: Run focused tests and observe failures**

Run: `cd backend && ./gradlew test --tests 'com.save.notification.DeviceToken*Test'`

- [ ] **Step 3: Implement normalized token validation**

Centralize validation in `DeviceTokenService.normalizeExpoPushToken(String)` and store only its trimmed return value. Keep `DevicePlatform.ANDROID` and `DevicePlatform.IOS`.

- [ ] **Step 4: Run tests and commit**

Run: `cd backend && ./gradlew test --tests 'com.save.notification.DeviceToken*Test'`

Run: `git add backend/src/main/java/com/save/notification backend/src/test/java/com/save/notification && git commit -m "feat: validate Expo push token ownership"`

### Task 2: Add Expo Push Tickets and HTTP Client

**Files:**
- Create: `backend/src/main/java/com/save/notification/ExpoPushClient.java`
- Create: `backend/src/main/java/com/save/notification/ExpoPushMessage.java`
- Create: `backend/src/main/java/com/save/notification/ExpoPushTicketResponse.java`
- Create: `backend/src/main/java/com/save/notification/PushDeliveryTicket.java`
- Create: `backend/src/main/java/com/save/notification/PushDeliveryTicketRepository.java`
- Create: `backend/src/main/resources/db/migration/V7__create_push_delivery_tickets.sql`
- Modify: `backend/src/main/resources/application.yml`
- Test: `backend/src/test/java/com/save/notification/ExpoPushClientTest.java`

**Interfaces:**
- Produces: `ExpoPushClient.send(List<ExpoPushMessage>)`, `ExpoPushClient.getReceipts(Set<String>)`, and persisted ticket IDs paired with device tokens.

- [ ] **Step 1: Write a failing HTTP contract test**

Use `MockRestServiceServer` to assert POST `https://exp.host/--/api/v2/push/send`, JSON content type, connect/read timeout behavior, and parsing of `ok` and `error` ticket entries in request order.

- [ ] **Step 2: Run the focused test**

Run: `cd backend && ./gradlew test --tests com.save.notification.ExpoPushClientTest`

- [ ] **Step 3: Implement the client and migration**

Configuration keys:

```yaml
expo:
  push:
    enabled: ${EXPO_PUSH_ENABLED:false}
    base-url: ${EXPO_PUSH_BASE_URL:https://exp.host}
    connect-timeout: ${EXPO_PUSH_CONNECT_TIMEOUT:3s}
    read-timeout: ${EXPO_PUSH_READ_TIMEOUT:5s}
```

The ticket table stores `ticket_id`, `device_token_id`, `status`, `error_code`, `created_at`, and `checked_at`. Never store notification message bodies in this operational table.

- [ ] **Step 4: Run Flyway and client tests**

Run: `cd backend && ./gradlew test --tests com.save.notification.ExpoPushClientTest --tests com.save.config.ProductionConfigurationTest`

- [ ] **Step 5: Commit**

Run: `git add backend/src/main/java/com/save/notification backend/src/main/resources backend/src/test/java/com/save/notification && git commit -m "feat: add Expo push delivery client"`

### Task 3: Send Chat and Rental Push After Commit

**Files:**
- Modify: `backend/src/main/java/com/save/notification/PushNotificationService.java`
- Modify: `backend/src/main/java/com/save/notification/ChatNotificationListener.java`
- Create: `backend/src/main/java/com/save/notification/RentalPushNotificationListener.java`
- Modify: `backend/src/main/java/com/save/notification/InAppNotificationCreatedEvent.java`
- Test: `backend/src/test/java/com/save/notification/PushNotificationServiceTest.java`
- Test: `backend/src/test/java/com/save/notification/PushTransactionBoundaryIntegrationTest.java`
- Modify: `backend/build.gradle`
- Delete: `backend/src/main/java/com/save/notification/FirebaseConfig.java`

**Interfaces:**
- Consumes: chat-created and in-app rental/review notification events.
- Produces: Expo messages with data keys `type`, `roomId`, `messageId`, `rentalId`, `itemId` as applicable.

- [ ] **Step 1: Write failing message and transaction tests**

Assert chat push title/body/data, rental event routing, disabled-provider no-op, rollback sends nothing, and an `ExpoPushClient` exception does not change the committed chat/rental result.

- [ ] **Step 2: Run tests and observe Firebase-bound failures**

Run: `cd backend && ./gradlew test --tests 'com.save.notification.Push*Test'`

- [ ] **Step 3: Replace Firebase delivery**

Build one `ExpoPushMessage` per active device and call the Expo client in the existing after-commit async boundary. Persist successful ticket IDs; immediately disable tokens whose ticket error is `DeviceNotRegistered`.

- [ ] **Step 4: Remove Firebase Admin dependencies and configuration**

Remove `com.google.firebase:firebase-admin` and Firebase credentials properties. Keep Google OAuth dependencies. Update backend README and deployment variables from `FIREBASE_*` to `EXPO_PUSH_ENABLED`.

- [ ] **Step 5: Run notification and full backend tests, then commit**

Run: `cd backend && ./gradlew test`

Run: `git add backend && git commit -m "feat: deliver chat and rental Expo push"`

### Task 4: Check Push Receipts and Bound Async Work

**Files:**
- Create: `backend/src/main/java/com/save/notification/ExpoPushReceiptScheduler.java`
- Create: `backend/src/main/java/com/save/notification/PushAsyncConfig.java`
- Test: `backend/src/test/java/com/save/notification/ExpoPushReceiptSchedulerTest.java`
- Test: `backend/src/test/java/com/save/notification/PushAsyncConfigTest.java`

**Interfaces:**
- Consumes: pending ticket IDs at least 15 minutes old and Expo receipt endpoint.
- Produces: checked ticket status, invalid-token disablement, bounded `pushExecutor`.

- [ ] **Step 1: Write failing receipt tests**

Assert pending tickets younger than 15 minutes are skipped; `ok` marks delivered; `DeviceNotRegistered` marks failed and disables the device; transient HTTP failure leaves tickets pending for a later run.

- [ ] **Step 2: Run focused tests**

Run: `cd backend && ./gradlew test --tests com.save.notification.ExpoPushReceiptSchedulerTest --tests com.save.notification.PushAsyncConfigTest`

- [ ] **Step 3: Implement receipt polling and executor**

Poll at a one-minute fixed delay, claim at most 500 due tickets, and call `/--/api/v2/push/getReceipts`. Configure `pushExecutor` with core 2, max 4, queue 200, prefix `push-`, and caller-runs rejection.

- [ ] **Step 4: Run tests and commit**

Run: `cd backend && ./gradlew test`

Run: `git add backend/src/main/java/com/save/notification backend/src/test/java/com/save/notification && git commit -m "feat: reconcile Expo push receipts"`

### Task 5: Register and Route Notifications in Expo

**Files:**
- Modify: `apps/save-app/package.json`
- Modify: `apps/save-app/package-lock.json`
- Modify: `apps/save-app/app.json`
- Create: `apps/save-app/src/notifications/api.ts`
- Create: `apps/save-app/src/notifications/api.test.ts`
- Create: `apps/save-app/src/notifications/registration.ts`
- Create: `apps/save-app/src/notifications/registration.test.ts`
- Create: `apps/save-app/src/notifications/coordinator.tsx`
- Create: `apps/save-app/src/notifications/coordinator.test.tsx`
- Create: `apps/save-app/src/rentals/types.ts`
- Create: `apps/save-app/src/rentals/schema.ts`
- Create: `apps/save-app/src/rentals/schema.test.ts`
- Create: `apps/save-app/src/rentals/api.ts`
- Create: `apps/save-app/src/app/(authenticated)/rentals/[id].tsx`
- Create: `apps/save-app/src/__tests__/rental-notification-screen.test.tsx`
- Modify: `apps/save-app/src/app/_layout.tsx`
- Modify: `apps/save-app/src/auth/store.ts`
- Modify: `apps/save-app/src/auth/store.test.ts`

**Interfaces:**
- Consumes: authenticated access token, Expo notification token/listeners, backend device-token endpoints.
- Produces: registration, refresh, logout unregister, foreground behavior, and deep-link routing.

- [ ] **Step 1: Install the SDK-matched dependency**

Run: `cd apps/save-app && npx expo install expo-notifications`

Expected: package resolves to Expo SDK 57's compatible `~57.0.9` line.

- [ ] **Step 2: Write failing registration tests**

Cover physical-device check, Android channel creation before permission request, denied permission no-op, Expo token PUT with platform, token-change PUT, logout DELETE before access-token removal, and registration failure that leaves auth intact.

- [ ] **Step 3: Write failing notification-routing tests**

Assert `CHAT_MESSAGE` routes to `/(authenticated)/chats/{roomId}` and
`RENTAL_REQUESTED`, `RENTAL_APPROVED`, `RENTAL_REJECTED`, and
`REVIEW_PUBLISHED` route to `/(authenticated)/rentals/{rentalId}`. Unknown
types do not navigate.

- [ ] **Step 4: Write the failing rental-notification landing test**

Runtime-validate `GET /rentals/{id}` and assert the route renders the real item
ID, rental status, start date, and end date. Loading, 404, and retry states use
neutral copy. This route is read-only and does not add rental transition actions.

- [ ] **Step 5: Run focused tests**

Run: `npm --prefix apps/save-app test -- --runTestsByPath src/notifications/api.test.ts src/notifications/registration.test.ts src/notifications/coordinator.test.tsx src/rentals/schema.test.ts src/__tests__/rental-notification-screen.test.tsx src/auth/store.test.ts`

- [ ] **Step 6: Implement registration, routing, and the read-only rental landing**

Use `Notifications.getExpoPushTokenAsync`, `addPushTokenListener`, and `addNotificationResponseReceivedListener`. Mount the coordinator only for authenticated sessions. Store the current token in module state plus SecureStore so logout can unregister before clearing the session.

The rental parser accepts the backend `RentalResponse` snake_case contract and
the landing screen calls `apiRequest<unknown>` followed by that parser. Register
`rentals/[id]` in the authenticated stack.

- [ ] **Step 7: Add the Expo config plugin**

Add `expo-notifications` to `plugins` in `app.json`, with an Android channel/icon only when a valid monochrome asset exists. Do not embed credentials in the repository.

- [ ] **Step 8: Run Expo verification and commit**

Run: `npm run app:test && npm run app:typecheck && npm run app:lint`

Run: `git add apps/save-app && git commit -m "feat: register and route Expo notifications"`

### Task 6: Build and Rehearse the Capstone Demo

**Files:**
- Create: `apps/save-app/eas.json`
- Modify: `apps/save-app/README.md`
- Modify: `docs/mobile-ui-parity.md`
- Modify: `docs/gcp-private-beta-deployment.md`
- Create: `docs/capstone-demo-checklist.md`

**Interfaces:**
- Consumes: configured Cloud Run HTTPS API, Expo/EAS project credentials, two demo accounts.
- Produces: Android internal build instructions and recorded iPhone Expo Go rehearsal.

- [ ] **Step 1: Add development and internal Android build profiles**

`eas.json` must define a development-client profile and an internal-distribution Android preview profile. Environment values reference EAS secrets or profiles; no credential values are committed.

- [ ] **Step 2: Run all automated gates**

Run: `npm run test:run && npm run lint && npm run build && npm run app:test && npm run app:typecheck && npm run app:lint && (cd backend && ./gradlew test)`

- [ ] **Step 3: Export Android locally**

Run: `cd apps/save-app && npx expo export --platform android --output-dir /tmp/save-expo-push-android`

- [ ] **Step 4: Build and verify Android on a physical device**

Run the approved EAS internal build workflow. Verify foreground, background, terminated-app notification, chat deep link, rental deep link, token refresh, logout unregister, and network reconnect.

- [ ] **Step 5: Rehearse iPhone Expo Go**

Using the same Cloud Run HTTPS API, verify Expo Go launch, email login, Google login if configured, catalog, item detail, chat list, bidirectional messages, reconnect, and safe-area/keyboard behavior. iOS push is informational only and does not block this milestone.

- [ ] **Step 6: Record results and commit**

Write device model, OS version, build identifier, date, pass/fail, fallback email account readiness, and Android APK location policy in `docs/capstone-demo-checklist.md` without credentials.

Run: `git add apps/save-app/eas.json apps/save-app/README.md docs/mobile-ui-parity.md docs/gcp-private-beta-deployment.md docs/capstone-demo-checklist.md && git commit -m "docs: prepare Android and iPhone capstone demo"`
