# Web Source Responsibility Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `src/App.jsx` from 975 lines to a 250–350 line application composition boundary and split other mixed-responsibility web files without changing UI or runtime contracts.

**Architecture:** Extract intentional demo fixtures, domain protocol adapters, workflow hooks, and cohesive presentation regions in dependency order. Keep existing API hooks as remote-state owners and preserve `src/api/normalizers.js` as a compatibility barrel so consumers migrate without a big-bang rewrite.

**Tech Stack:** React 19, Zustand 5, Vitest 4, Testing Library, Vite 8, ESLint 10

**Spec:** `docs/superpowers/specs/2026-08-23-web-src-refactor-design.md`

## Global Constraints

- Do not redesign or restyle the UI.
- Do not change API paths, methods, payload keys, response normalization, or STOMP destinations.
- Preserve API mode and intentional mock-mode demo values.
- Preserve named imports from `src/api/normalizers.js` throughout migration.
- Do not add a routing library or replace Zustand.
- `src/App.jsx` must finish between 250 and 350 lines; stop for review if it exceeds 400.
- No new production file may exceed 300 lines without a cohesive-responsibility note in the final audit.
- Use `apply_patch` for edits, TDD for behavior changes, and characterization tests before moving risky existing behavior.
- Do not create the replacement ZIP until every automated gate passes.

---

### Task 1: Lock High-Risk App Orchestration Behavior

**Files:**
- Modify: `src/App.authRefresh.test.jsx`
- Create: `src/App.itemChat.test.jsx`

**Interfaces:**
- Consumes: current `App`, Zustand `useAuthStore`, `createOrGetChatRoom`, and `useChatRooms.selectRoom` behavior.
- Produces: characterization tests that protect session restoration and item-to-chat navigation during extraction.

- [ ] **Step 1: Add a session-install call-count characterization**

Spy on `useAuthStore.getState().setSession` before rendering and restore it after the assertion:

```jsx
it('installs one restored session exactly once', async () => {
  const setSession = vi.spyOn(useAuthStore.getState(), 'setSession')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    access_token: 'fresh-jwt',
    user: {
      id: 1,
      name: '구글사용자',
      department: '컴퓨터공학과',
      university_id: 1,
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })))

  render(<App />)
  await screen.findByRole('button', { name: '알림 열기' })

  expect(setSession).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Add an item-to-chat characterization**

In `App.itemChat.test.jsx`, run with `USE_API: true`, provide one selected item through the mocked `HomePage`, click its chat action, and assert exact effects:

```jsx
expect(createOrGetChatRoom).toHaveBeenCalledTimes(1)
expect(createOrGetChatRoom).toHaveBeenCalledWith(7, 'jwt')
expect(selectRoom).toHaveBeenCalledTimes(1)
expect(screen.getByText('채팅')).toBeInTheDocument()
```

The page mocks must expose real callback buttons rather than assert that mocks exist.

- [ ] **Step 3: Run the characterization tests**

Run: `npm run test:run -- src/App.authRefresh.test.jsx src/App.itemChat.test.jsx`

Expected: PASS. These tests describe existing behavior; they are not RED tests for a new feature.

- [ ] **Step 4: Mutation-check each test**

Temporarily invoke `applyAuth` twice and verify the auth test fails on call count. Restore it. Temporarily invoke `chatData.selectRoom` twice and verify the chat test fails. Restore it and rerun both tests to PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.authRefresh.test.jsx src/App.itemChat.test.jsx
git commit -m "test: characterize app orchestration boundaries"
```

### Task 2: Extract Intentional Demo Fixtures

**Files:**
- Create: `src/data/demoChats.js`
- Create: `src/data/demoNotifications.js`
- Create: `src/data/demoData.test.js`
- Modify: `src/App.jsx`
- Test: `src/App.itemForm.test.jsx`
- Test: `src/App.notifications.test.jsx`
- Test: `src/pages/ChatPage.test.jsx`

**Interfaces:**
- Produces: `createDemoChats(): ChatRoom[]` and `createDemoNotifications(): Notification[]`, each returning a fresh mutable graph.
- Consumes: only fixed values already present in `App.jsx`.

- [ ] **Step 1: Write fixture-isolation tests**

Create `src/data/demoData.test.js`:

```js
import { createDemoChats } from './demoChats.js'
import { createDemoNotifications } from './demoNotifications.js'

it('returns fresh demo graphs for every app mount', () => {
  const firstChats = createDemoChats()
  const secondChats = createDemoChats()
  firstChats[0].messages.push({ id: 999, text: 'mutation' })

  expect(secondChats[0].messages).not.toContainEqual(expect.objectContaining({ id: 999 }))
  expect(createDemoNotifications()).not.toBe(createDemoNotifications())
})
```

- [ ] **Step 2: Run the new test and observe RED**

Run: `npm run test:run -- src/data/demoData.test.js`

Expected: FAIL because fixture factory modules do not exist.

- [ ] **Step 3: Move the existing fixtures verbatim**

Export factories that allocate new arrays and nested message arrays. Replace inline initializers with:

```jsx
const [notifications, setNotifications] = useState(() => (
  USE_API ? [] : createDemoNotifications()
))
const [chats, setChats] = useState(() => (
  USE_API ? [] : createDemoChats()
))
```

- [ ] **Step 4: Run fixture and affected integration tests**

Run: `npm run test:run -- src/data/demoData.test.js src/App.itemForm.test.jsx src/App.notifications.test.jsx src/pages/ChatPage.test.jsx`

Expected: PASS with no changed copy or fixture values.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/data/demoChats.js src/data/demoNotifications.js src/data/demoData.test.js
git commit -m "refactor: extract web demo fixtures"
```

### Task 3: Split Protocol Normalizers by Domain

**Files:**
- Create: `src/api/normalizers/shared.js`
- Create: `src/api/normalizers/items.js`
- Create: `src/api/normalizers/users.js`
- Create: `src/api/normalizers/rentals.js`
- Create: `src/api/normalizers/chat.js`
- Modify: `src/api/normalizers.js`
- Modify: `src/api/normalizers.test.js`

**Interfaces:**
- `shared.js`: `unwrapList(response)`, `unwrapObject(response)`.
- `items.js`: `normalizeItem`, `normalizeItemsResponse`, `toCreateItemPayload`.
- `users.js`: `normalizePublicUserProfile`, `normalizePublicReview`, `normalizePublicReviewsResponse`.
- `rentals.js`: `normalizeRental`.
- `chat.js`: `normalizeChatMessage`, `normalizeChatRoom`, `normalizeChatRoomsResponse`, `mergeChatRoomSnapshot`, `mergeChatListUpdate`, `normalizeMessagesResponse`.
- `normalizers.js`: re-exports every existing named export unchanged.

- [ ] **Step 1: Add compatibility-barrel assertions**

Extend `src/api/normalizers.test.js` to import the barrel and direct modules and assert identity:

```js
import * as barrel from './normalizers.js'
import { normalizeItem } from './normalizers/items.js'
import { normalizeChatRoom } from './normalizers/chat.js'

expect(barrel.normalizeItem).toBe(normalizeItem)
expect(barrel.normalizeChatRoom).toBe(normalizeChatRoom)
```

- [ ] **Step 2: Run and observe RED**

Run: `npm run test:run -- src/api/normalizers.test.js`

Expected: FAIL because domain modules are absent.

- [ ] **Step 3: Move functions without rewriting them**

Move each function and its private helpers to the specified domain file. Export shared unwrap helpers. Replace `normalizers.js` with explicit re-exports:

```js
export * from './normalizers/items.js'
export * from './normalizers/users.js'
export * from './normalizers/rentals.js'
export * from './normalizers/chat.js'
```

- [ ] **Step 4: Run normalizer and consumer tests**

Run: `npm run test:run -- src/api/normalizers.test.js src/api/items.test.js src/api/chats.test.js src/api/rentals.test.js src/api/users.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/normalizers.js src/api/normalizers src/api/normalizers.test.js
git commit -m "refactor: split web protocol normalizers"
```

### Task 4: Extract Item Editor State and Submission

**Files:**
- Create: `src/hooks/useItemEditor.js`
- Create: `src/hooks/useItemEditor.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/ItemRegistrationModal.jsx`
- Test: `src/App.itemForm.test.jsx`

**Interfaces:**
- Consumes: `{ itemData, pickupLocations, university, setSelectedItem, toast, apiEnabled }`.
- Produces:

```js
{
  isOpen, isSubmitting, editingItemId,
  fields: { type, title, price, priceType, pickupLocationId, description, photos },
  setters: { setType, setTitle, setPrice, setPriceType, setPickupLocationId, setDescription },
  openCreate(), openEdit(item), close(), selectPhotos(event), removePhoto(index), submit(event)
}
```

- [ ] **Step 1: Write failing hook tests**

Use `renderHook` to prove `openEdit` maps an item to fields, `close` resets every field, photo selection caps at five, and successful API create closes the modal. Derive expected field literals in the tests.

- [ ] **Step 2: Run and observe RED**

Run: `npm run test:run -- src/hooks/useItemEditor.test.jsx`

Expected: FAIL because `useItemEditor` does not exist.

- [ ] **Step 3: Implement the hook with current behavior**

Move the existing field state and the bodies of `handlePhotoSelect`, `handlePhotoRemove`, `resetItemForm`, `closeItemForm`, `openCreateItemForm`, and `handleCreateItem`. Keep the current mock item shape, toast copy, API payload conversion, edit/create calls, and cleanup ordering.

- [ ] **Step 4: Replace App field state with the hook contract**

Pass explicit hook members to `ItemRegistrationModal`; do not pass the entire hook object. Replace the detail `onEdit` callback with `itemEditor.openEdit`.

- [ ] **Step 5: Run hook, form, and item integration tests**

Run: `npm run test:run -- src/hooks/useItemEditor.test.jsx src/App.itemForm.test.jsx src/components/ItemRegistrationModal.test.jsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/hooks/useItemEditor.js src/hooks/useItemEditor.test.jsx src/components/ItemRegistrationModal.jsx
git commit -m "refactor: extract web item editor workflow"
```

### Task 5: Extract App Notification Workflow

**Files:**
- Create: `src/hooks/useAppNotifications.js`
- Create: `src/hooks/useAppNotifications.test.jsx`
- Modify: `src/App.jsx`
- Test: `src/App.notifications.test.jsx`

**Interfaces:**
- Consumes: `{ accessToken, enabled, initialNotifications, reloadItems, reloadRentals, reloadMyPage, toast }`.
- Produces: `{ notifications, isOpen, setIsOpen, receive(response), markAllRead(), clear() }`.

- [ ] **Step 1: Write failing hook tests**

Cover API load, ID deduplication, workflow-type reload fan-out, mark-all-read success, mark-all-read failure preserving unread state, and `clear()` closing the panel.

```jsx
expect(result.current.notifications.filter(entry => entry.id === 20)).toHaveLength(1)
expect(reloadRentals).toHaveBeenCalledTimes(1)
expect(markAllNotificationsRead).toHaveBeenCalledWith('jwt')
```

- [ ] **Step 2: Run and observe RED**

Run: `npm run test:run -- src/hooks/useAppNotifications.test.jsx`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the hook by moving existing behavior**

Keep `WORKFLOW_NOTIFICATION_TYPES` inside the hook module. Use the existing `normalizeNotification`, `getNotifications`, and `markAllNotificationsRead` adapters and current Korean error copy.

- [ ] **Step 4: Wire App and chat callback to the hook**

Pass `notifications.receive` as `useChatRooms({ onNotification })`; use `notifications.markAllRead` from the panel; call `notifications.clear()` on unauthorized and logout paths.

- [ ] **Step 5: Run focused tests**

Run: `npm run test:run -- src/hooks/useAppNotifications.test.jsx src/App.notifications.test.jsx src/App.authRefresh.test.jsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/hooks/useAppNotifications.js src/hooks/useAppNotifications.test.jsx
git commit -m "refactor: extract web notification workflow"
```

### Task 6: Extract App Session Workflow

**Files:**
- Create: `src/hooks/useAppSession.js`
- Create: `src/hooks/useAppSession.test.jsx`
- Modify: `src/App.jsx`
- Test: `src/App.authRefresh.test.jsx`
- Test: `src/App.googleRedirect.test.jsx`

**Interfaces:**
- Consumes: `{ apiEnabled, devAutoLogin, toast }`.
- Produces:

```js
{
  accessToken, user, authStatus, isLoggedIn, isProfileComplete,
  member: { name, department, universityId },
  memberSetters: { setName, setDepartment, setUniversityId },
  login(credentials), completeProfile(), clear(), logout()
}
```

- [ ] **Step 1: Write failing hook tests**

Cover refresh restoration exactly once, Google hash exchange and URL cleanup, 401 becoming logged out, completed/incomplete profile derivation, profile update, and logout cleanup when the server call rejects.

- [ ] **Step 2: Run and observe RED**

Run: `npm run test:run -- src/hooks/useAppSession.test.jsx`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement session orchestration**

Move `applyAuth`, bootstrap ref/effect, login, profile completion, local auth
clearing, and the server logout call. The hook must not import chat,
notification, item, or navigation modules. `logout()` clears the Zustand and
derived local session in `finally`, preserving cleanup when the request fails.

- [ ] **Step 4: Replace duplicate App auth state with the hook**

Remove local login/profile state from `App`. Continue deriving university
display name in `App` from `universities`, the session user, and the existing
API/mock fallback copy. After all downstream hooks exist, define one short
`resetTransientState` callback in `App` that clears chats, notifications,
active chat, selected overlays, and the active tab. The unauthorized
subscription calls `session.clear()` and this callback; the logout handler
awaits `session.logout()` and then calls it. This explicit composition avoids
a session/notification/chat hook cycle.

- [ ] **Step 5: Run focused auth and App tests**

Run: `npm run test:run -- src/hooks/useAppSession.test.jsx src/App.authRefresh.test.jsx src/App.googleRedirect.test.jsx src/pages/LoginPage.test.jsx`

Expected: PASS, including the Task 1 exact-once assertion.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/hooks/useAppSession.js src/hooks/useAppSession.test.jsx
git commit -m "refactor: extract web session workflow"
```

### Task 7: Extract App Frame and Active Page Composition

**Files:**
- Create: `src/components/AppFrame.jsx`
- Create: `src/components/AppHeader.jsx`
- Create: `src/components/NotificationPanel.jsx`
- Create: `src/components/ActivePage.jsx`
- Modify: `src/App.jsx`
- Test: `src/App.notifications.test.jsx`
- Test: `src/App.itemForm.test.jsx`

**Interfaces:**
- `NotificationPanel({ open, notifications, onToggle, onMarkAllRead })`.
- `AppHeader({ university, notifications, notificationOpen, onToggleNotifications, onMarkAllRead })`.
- `ActivePage({ activeTab, homeProps, searchProps, chatProps, myProps, rentalProps })`.
- `AppFrame({ headerProps, navigationProps, chatDetailOpen, children })`.

- [ ] **Step 1: Add direct interaction tests for extracted boundaries**

Create `src/components/AppFrame.test.jsx` and assert that the notification toggle is keyboard-accessible, unread state is visible, mark-all-read calls once, the child slot renders, and bottom navigation retains the same labels.

- [ ] **Step 2: Run and observe RED**

Run: `npm run test:run -- src/components/AppFrame.test.jsx`

Expected: FAIL because frame components do not exist.

- [ ] **Step 3: Move JSX without changing class names or copy**

Copy the exact mobile-frame, status-bar, header, notification, main container, and bottom-navigation markup. `AppFrame` owns no state and calls only supplied callbacks.

- [ ] **Step 4: Extract active-page selection**

Move the five tab branches into `ActivePage`. Keep page prop names unchanged. Memoize prop groups in `App` only if existing tests or React profiling show unstable dependencies; do not add speculative memoization.

- [ ] **Step 5: Run frame and App integration tests**

Run: `npm run test:run -- src/components/AppFrame.test.jsx src/App.notifications.test.jsx src/App.itemForm.test.jsx src/App.itemChat.test.jsx`

Expected: PASS with unchanged DOM roles and copy.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/components/AppFrame.jsx src/components/AppHeader.jsx src/components/NotificationPanel.jsx src/components/ActivePage.jsx src/components/AppFrame.test.jsx
git commit -m "refactor: extract web application frame"
```

### Task 8: Extract Marketplace Actions and Overlay Composition

**Files:**
- Create: `src/hooks/useItemActions.js`
- Create: `src/hooks/useItemActions.test.jsx`
- Create: `src/hooks/useReportFlow.js`
- Create: `src/hooks/useReportFlow.test.jsx`
- Create: `src/components/AppOverlays.jsx`
- Modify: `src/App.jsx`
- Test: `src/App.itemForm.test.jsx`
- Test: `src/App.itemChat.test.jsx`

**Interfaces:**
- `useItemActions` consumes `{ accessToken, apiEnabled, selectedItem,
  setSelectedItem, setItems, reloadItems, chatData, chats, setChats,
  setActiveTab, setRentalRequest, itemEditor, toast }` and produces
  `{ deleteItem, prepareRental, toggleWishlist, openChat }`.
- `useReportFlow` consumes `{ accessToken, toast }` and produces
  `{ target, reason, setReason, isSubmitting, open(target), close(), submit() }`.
- `AppOverlays` consumes selected/profile/report/rental targets and explicit action callbacks; it renders the existing five overlays.

- [ ] **Step 1: Write failing action tests**

In `useItemActions.test.jsx`, cover optimistic wishlist rollback, one API
chat-room creation/selection, item delete success/failure, and rental
preparation using a normalized room ID. In `useReportFlow.test.jsx`, cover the
10-trimmed-character validation boundary, successful submission, failed
submission preserving the target/reason for retry, and explicit close reset.

- [ ] **Step 2: Run and observe RED**

Run: `npm run test:run -- src/hooks/useItemActions.test.jsx src/hooks/useReportFlow.test.jsx`

Expected: FAIL because the hooks do not exist.

- [ ] **Step 3: Implement the two workflow hooks from existing callbacks**

Move callback bodies verbatim first. Keep all existing toast copy and use
`normalizeChatRoom`, `addWishlist`, `removeWishlist`, `createOrGetChatRoom`,
and `createReport` at the same boundaries. Do not pass an App object or either
hook's complete return value into the other hook.

- [ ] **Step 4: Move overlay JSX to AppOverlays**

Do not give `AppOverlays` the entire App state. Define named props grouped by overlay: `itemDetail`, `profile`, `report`, `itemEditor`, and `rentalRequest`.

- [ ] **Step 5: Run action and integration tests**

Run: `npm run test:run -- src/hooks/useItemActions.test.jsx src/hooks/useReportFlow.test.jsx src/App.itemForm.test.jsx src/App.itemChat.test.jsx src/ProductDetailPage.owner.test.jsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/hooks/useItemActions.js src/hooks/useItemActions.test.jsx src/hooks/useReportFlow.js src/hooks/useReportFlow.test.jsx src/components/AppOverlays.jsx
git commit -m "refactor: extract web marketplace overlays"
```

### Task 9: Finish App Composition and Enforce the Size Gate

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: all extracted hooks/components from Tasks 2–8.
- Produces: `App` as the sole exported application composition component, 250–350 lines.

- [ ] **Step 1: Remove residual moved code and clarify prop assembly**

Keep top-level gates, hook construction, filtered/recommended item derivation, active tab/target state, and component composition. Remove dead imports and comments that narrate obvious JSX.

- [ ] **Step 2: Measure the composition boundary**

Run: `wc -l src/App.jsx`

Expected: 250–350 lines. Line count is a review measurement, not a source-text unit test.

- [ ] **Step 3: Run App and full web tests**

Run: `npm run test:run -- src/App.authRefresh.test.jsx src/App.googleRedirect.test.jsx src/App.itemForm.test.jsx src/App.itemChat.test.jsx src/App.notifications.test.jsx`

Run: `npm run test:run`

Expected: all tests PASS and `wc -l src/App.jsx` reports 250–350.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "refactor: reduce App to composition boundary"
```

### Task 10: Split Chat Presentation Responsibilities

**Files:**
- Create: `src/chat/presentation.js`
- Create: `src/chat/presentation.test.js`
- Create: `src/components/chat/ChatRoomList.jsx`
- Create: `src/components/chat/ChatMessageTimeline.jsx`
- Create: `src/components/chat/ChatComposer.jsx`
- Modify: `src/pages/ChatPage.jsx`
- Test: `src/pages/ChatPage.test.jsx`

**Interfaces:**
- `presentation.js`: `itemStatusMeta(item)`, `formatChatDate(value)`, `formatChatTime(value)`, `getChatDateKey(value)`, `findLinkedItem(items, room)`.
- `ChatRoomList({ chats, selectChatRoom })`.
- `ChatMessageTimeline({ room, loadingMessages, loadingOlder, hasOlder, loadOlder, messageError, retryMessage, socketState })`.
- `ChatComposer({ value, onChange, onSend })`.

- [ ] **Step 1: Write direct presentation tests**

Move current date-boundary, timestamp, status, and duplicate-title item-link expectations into direct utility tests with literal expected output.

- [ ] **Step 2: Run and observe RED**

Run: `npm run test:run -- src/chat/presentation.test.js`

Expected: FAIL because presentation utilities are not exported from the new module.

- [ ] **Step 3: Move pure helpers and visual regions**

Preserve every class name, accessibility label, empty/error state, pagination control, delivery indicator, and reconnect copy. Keep `ChatPage` as the two-mode room/detail layout.

- [ ] **Step 4: Run chat tests**

Run: `npm run test:run -- src/chat/presentation.test.js src/pages/ChatPage.test.jsx src/hooks/useChatRooms.test.jsx src/hooks/useChatRooms.dedup.test.jsx`

Expected: PASS and `ChatPage.jsx` below 200 lines.

- [ ] **Step 5: Commit**

```bash
git add src/chat/presentation.js src/chat/presentation.test.js src/components/chat src/pages/ChatPage.jsx src/pages/ChatPage.test.jsx
git commit -m "refactor: split web chat presentation"
```

### Task 11: Split Admin Report State and Views

**Files:**
- Create: `src/hooks/useAdminReports.js`
- Create: `src/hooks/useAdminReports.test.jsx`
- Create: `src/api/reports.test.js`
- Create: `src/components/admin/AdminReportList.jsx`
- Create: `src/components/admin/AdminReportDetail.jsx`
- Create: `src/components/admin/AdminStatusBadge.jsx`
- Modify: `src/api/reports.js`
- Modify: `src/pages/AdminPage.jsx`
- Test: `src/pages/AdminPage.test.jsx`

**Interfaces:**
- `normalizeAdminReport(report)` moves to and is exported from `src/api/reports.js`.
- `useAdminReports({ accessToken, api })` produces `{ reports, filteredReports, selectedReport, statusFilter, setStatusFilter, loading, error, notice, selectReport(id), updateStatus(status), deleteItem(), sanctionUser(), retry() }`.
- View components consume display data and callback props only.

- [ ] **Step 1: Write failing normalization and hook tests**

Assert literal normalization of snake_case fields, filter results, detail loading, status mutation/refetch, item deletion, sanctioning, and failure notice behavior.

- [ ] **Step 2: Run and observe RED**

Run: `npm run test:run -- src/hooks/useAdminReports.test.jsx src/api/reports.test.js`

Expected: FAIL for missing exported normalizer/hook behavior.

- [ ] **Step 3: Move state and endpoint adaptation**

Keep dependency injection through the current `api` prop so `AdminPage.test.jsx` remains fast. Move no UI into the hook.

- [ ] **Step 4: Extract report views**

Move the responsive table/list and detail/action panel with exact existing markup and copy. Preserve `AdminAccessDenied` as a named export from `AdminPage.jsx`.

- [ ] **Step 5: Run admin tests**

Run: `npm run test:run -- src/hooks/useAdminReports.test.jsx src/api/reports.test.js src/pages/AdminPage.test.jsx`

Expected: PASS and `AdminPage.jsx` below 250 lines.

- [ ] **Step 6: Commit**

```bash
git add src/api/reports.js src/api/reports.test.js src/hooks/useAdminReports.js src/hooks/useAdminReports.test.jsx src/components/admin src/pages/AdminPage.jsx src/pages/AdminPage.test.jsx
git commit -m "refactor: split web admin report workflow"
```

### Task 12: Split the Item Editor View and Verify the Integrated Project

**Files:**
- Modify: `src/components/ItemRegistrationModal.jsx`
- Create: `src/components/item-editor/PhotoSection.jsx`
- Create: `src/components/item-editor/ItemBasicsSection.jsx`
- Create: `docs/web-src-refactor-report.md`

**Interfaces:**
- Consumes: final production tree and all prior task tests.
- Produces: evidence-backed line-count/responsibility report and a verified integrated branch.

- [ ] **Step 1: Generate the final production line-count report**

Run:

```bash
find src -type f \( -name '*.js' -o -name '*.jsx' \) ! -name '*.test.js' ! -name '*.test.jsx' -print0 | xargs -0 wc -l | sort -nr
```

Record before/after counts in `docs/web-src-refactor-report.md`. For every production file above 200 lines, state its single cohesive responsibility or split it.

- [ ] **Step 2: Extract the two cohesive modal sections**

Move photo preview/upload/removal markup to `PhotoSection`. Move type, title,
price unit, pickup location, and description fields to `ItemBasicsSection`.
Keep modal chrome, submit/cancel controls, and form submission in
`ItemRegistrationModal`. Preserve every class name, label, input name, and
accessibility role. Run `src/components/ItemRegistrationModal.test.jsx` after
each section moves.

- [ ] **Step 3: Run web gates**

Run: `npm run test:run`

Run: `npm run lint`

Run: `npm run build`

Expected: all web tests pass, ESLint exits 0, and Vite produces `dist/` successfully.

- [ ] **Step 4: Run Expo gates**

Run: `npm run app:test`

Run: `npm run app:typecheck`

Run: `npm run app:lint`

Expected: Expo tests, TypeScript, and ESLint pass.

- [ ] **Step 5: Run backend gate**

Run: `cd backend && ./gradlew test --rerun-tasks`

Expected: `BUILD SUCCESSFUL`. If the environment blocks the Gradle user cache, rerun through the approved escalated Gradle test path.

- [ ] **Step 6: Review and commit the audit**

Run: `git diff --check`

Run: `git status --short`

Commit only source, tests, and the report:

```bash
git add src docs/web-src-refactor-report.md
git commit -m "docs: record web source refactor verification"
```

### Task 13: Replace the Dated Source Archive

**Files:**
- No repository files modified.
- Create outside repository: `/mnt/c/Users/Admin/Downloads/SAVE-private-beta-test2026-08-23-src-refactor.zip`

**Interfaces:**
- Consumes: clean committed `integration/save-platform` HEAD after Task 12.
- Produces: verified source-only ZIP using the existing date naming convention.

- [ ] **Step 1: Verify the branch is clean and capture HEAD**

Run: `git status --short --branch`

Run: `git rev-parse --short HEAD`

Expected: no modified or untracked source files.

- [ ] **Step 2: Create the source-only archive in `/tmp`**

Run:

```bash
git archive --format=zip --prefix=SAVE/ --output=/tmp/SAVE-private-beta-test2026-08-23-src-refactor.zip HEAD
```

- [ ] **Step 3: Validate archive entries**

Run: `jar tf /tmp/SAVE-private-beta-test2026-08-23-src-refactor.zip`

Expected: committed source is present; `.git`, `node_modules`, `dist`, `.env.local`, and credentials are absent.

- [ ] **Step 4: Copy only with external-write approval**

Copy to `/mnt/c/Users/Admin/Downloads/SAVE-private-beta-test2026-08-23-src-refactor.zip` through the approved external-write path. Do not overwrite an existing file without checking first.

- [ ] **Step 5: Compare hashes**

Run:

```bash
sha256sum /tmp/SAVE-private-beta-test2026-08-23-src-refactor.zip /mnt/c/Users/Admin/Downloads/SAVE-private-beta-test2026-08-23-src-refactor.zip
```

Expected: both SHA-256 values are identical.
