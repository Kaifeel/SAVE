# Chat2 Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the independently testable additions from `SAVE_4-chat2` into the current dirty `SAVE` workspace without overwriting unrelated work.

**Architecture:** Extend the existing STOMP chat transport with a per-user chat-list destination, then connect it to the current React chat state. Reuse the existing report/admin APIs while adding their missing UI, response display fields, and expired-sanction cleanup job.

**Tech Stack:** React 19, Vitest, Spring Boot, Spring Messaging/STOMP, Spring Data JPA, Flyway, JUnit 5.

## Global Constraints

- Preserve all unrelated uncommitted changes in `Downloads/SAVE`.
- Apply only the semantic diff from `Downloads/SAVE_4-chat2/SAVE_4/SAVE`.
- Add and run regression tests before each production change.
- Do not commit, push, or modify remote state.

---

### Task 1: Real-time chat-list updates

**Files:**
- Modify: `src/api/normalizers.js`, `src/chat/stompClient.js`, `src/hooks/useChatRooms.js`, `src/App.jsx`
- Modify: `backend/src/main/java/com/save/chat/config/WebSocketAuthorizationInterceptor.java`, `WebSocketConfig.java`, `controller/ChatMessageController.java`, `controller/ChatWebSocketController.java`, `service/ChatRoomService.java`
- Create: `backend/src/main/java/com/save/chat/service/ChatRealtimePublisher.java`
- Test: `src/api/normalizers.test.js`, `src/chat/stompClient.test.js`, `backend/src/test/java/com/save/chat/ChatRealtimePublisherTest.java`, `WebSocketSecurityIntegrationTest.java`

**Interfaces:**
- Produces: `mergeChatListUpdate(currentRooms, response, activeRoomId)` and `subscribeToChatList(handler)`.
- Produces: `ChatRealtimePublisher.publishMessage(roomId, response)` delivering room messages and `/user/queue/chat-list` summaries.

- [ ] Add tests for personal chat-list subscription, room merging, authenticated subscription, and participant summary publication.
- [ ] Run focused frontend and backend tests; verify failures identify the missing interfaces and destinations.
- [ ] Add `/queue` and `/user` broker support, authenticated personal subscriptions, server publishing, client subscription, and list merging.
- [ ] Run the focused tests again and verify they pass.

### Task 2: Report form and richer report responses

**Files:**
- Create: `src/components/ReportModal.jsx`, `src/components/ReportModal.test.jsx`
- Modify: `src/ProductDetailPage.jsx`, `src/ProductDetailPage.owner.test.jsx`, `src/App.jsx`
- Modify: `backend/src/main/java/com/save/report/Report.java`, `ReportCreateRequest.java`, `ReportResponse.java`
- Test: `backend/src/test/java/com/save/MarketplaceIntegrationTest.java`

**Interfaces:**
- Produces: `ReportModal` requiring a trimmed reason of 10–1000 characters.
- Produces: report responses containing reporter, reported-user, and item display names.

- [ ] Add UI and integration tests for item-target reporting, minimum reason length, and report display fields.
- [ ] Run focused tests and verify the missing modal/validation/display fields fail.
- [ ] Implement the modal, item callback, request validation, and response fields.
- [ ] Run the focused tests again and verify they pass.

### Task 3: Admin UI

**Files:**
- Create: `src/pages/AdminPage.jsx`, `src/pages/AdminPage.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: the existing functions in `src/api/reports.js`.
- Produces: `/admin` role-gated report management, item deletion, and user sanction UI.

- [ ] Add tests for report loading, actions, and access control.
- [ ] Run focused tests and verify the missing page fails.
- [ ] Add the admin page and route gate while disabling ordinary user data hooks on admin paths.
- [ ] Run focused tests again and verify they pass.

### Task 4: Automatic release of expired sanctions

**Files:**
- Modify: `backend/src/main/java/com/save/SaveChatApiApplication.java`, `backend/src/main/java/com/save/user/UserRepository.java`
- Create: `backend/src/main/java/com/save/user/ExpiredSanctionScheduler.java`
- Create: `backend/src/main/resources/db/migration/V2__index_user_sanction_expiry.sql`
- Create: `backend/src/test/java/com/save/user/ExpiredSanctionSchedulerIntegrationTest.java`

**Interfaces:**
- Produces: `UserRepository.releaseExpiredSanctions(now)` and a scheduled caller with a default 60-second delay.

- [ ] Add an integration test proving expired suspensions are cleared while active suspensions remain.
- [ ] Run the focused backend test and verify it fails because automatic release is absent.
- [ ] Enable scheduling, add the bulk update and scheduler, and add the supporting index.
- [ ] Run focused tests, the full frontend/backend suites, builds, and whitespace checks.
