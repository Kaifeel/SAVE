# SAVE Full-stack Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete SAVE's item, chat, rental, wishlist, recommendation, My Page, and production-configuration flows against the existing Spring Boot API without modifying the protected ERD documents.

**Architecture:** Deliver five vertical slices, keeping transport DTO conversion in `src/api`, view state in focused React hooks/components, and authorization/business rules in Spring services. Spring Boot remains the only backend, calls OpenAI's Responses API through an injectable port, and selects development or production database/storage implementations through profiles.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, Vitest, React Testing Library, STOMP.js, Spring Boot 3.3.5, Java 17, JPA, H2, PostgreSQL, Flyway, AWS SDK v2 S3 client.

## Global Constraints

- Preserve React 19, Vite, Tailwind, Spring Boot 3.3, and Java 17.
- Use the backend snake_case JSON contract as canonical.
- Never edit `backend/docs/schema.dbml` or `backend/docs/database-tables.md`.
- Preserve existing uncommitted backend changes and untracked files.
- Never fall back to mock data after a real API failure.
- Keep direct `PAID` transitions disabled in production.
- Keep OpenAI and S3 credentials server-side.
- Use TDD for behavior changes: focused test fails, minimal code passes, then refactor.
- Stage and commit only files listed by the current task.

---

### Task 1: Frontend Test Harness, API Modes, and Common Errors

**Files:**
- Modify: `package.json`
- Modify: `src/api/client.js`
- Modify: `src/api/auth.js`
- Modify: `src/App.jsx`
- Create: `src/config/runtime.js`
- Create: `src/components/ToastProvider.jsx`
- Create: `src/components/AsyncState.jsx`
- Create: `src/test/setup.js`
- Create: `src/api/client.test.js`
- Create: `src/config/runtime.test.js`
- Create: `src/components/ToastProvider.test.jsx`
- Create: `.env.example`

**Interfaces:**
- Produces: `API_MODE` with values `mock | development | production`.
- Produces: `subscribeUnauthorized(listener): () => void`.
- Produces: `ToastProvider`, `useToast()`, and `AsyncState`.
- Consumes: existing `ApiError`, `saveAuth`, and `clearSavedAuth`.

- [ ] **Step 1: Add the failing API-mode and 401 tests**

```js
// src/config/runtime.test.js
import { describe, expect, it } from 'vitest'
import { parseApiMode } from './runtime'

describe('parseApiMode', () => {
  it('accepts only explicit runtime modes', () => {
    expect(parseApiMode('mock')).toBe('mock')
    expect(parseApiMode('development')).toBe('development')
    expect(parseApiMode('production')).toBe('production')
    expect(() => parseApiMode('true')).toThrow('VITE_API_MODE')
  })
})

// src/api/client.test.js
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, subscribeUnauthorized } from './client'

afterEach(() => vi.restoreAllMocks())

describe('apiFetch', () => {
  it('publishes one unauthorized event for a 401 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: 'expired' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )))
    const listener = vi.fn()
    const unsubscribe = subscribeUnauthorized(listener)

    await expect(apiFetch('/users/me')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'UNAUTHORIZED',
    })
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })
})
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npm test -- --run src/config/runtime.test.js src/api/client.test.js
```

Expected: FAIL because the test script, `parseApiMode`, and
`subscribeUnauthorized` do not exist.

- [ ] **Step 3: Add the test dependencies and minimal shared infrastructure**

Add these scripts and dependencies:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "@stomp/stompjs": "^7.2.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^26.1.0",
    "vitest": "^3.2.4"
  }
}
```

Implement the runtime parser:

```js
// src/config/runtime.js
const MODES = new Set(['mock', 'development', 'production'])

export function parseApiMode(value) {
  const mode = value || 'development'
  if (!MODES.has(mode)) {
    throw new Error(`VITE_API_MODE must be mock, development, or production; received ${mode}`)
  }
  return mode
}

export const API_MODE = parseApiMode(import.meta.env.VITE_API_MODE)
export const USE_API = API_MODE !== 'mock'
```

Extend `ApiError` with `code`, translate network failures to
`code: 'NETWORK_ERROR'`, and notify a module-scoped listener set once for each
401 response:

```js
const unauthorizedListeners = new Set()

export function subscribeUnauthorized(listener) {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}
```

Add a React-context toast queue with `success(message)` and `error(message)`.
Add `AsyncState` accepting `loading`, `error`, `empty`, `onRetry`, and
`children`. Subscribe in `App.jsx`; on 401 call `clearSavedAuth()`, clear the
in-memory auth state, and route to login.

Create `.env.example`:

```dotenv
VITE_API_MODE=development
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_AUTO_LOGIN=false
```

- [ ] **Step 4: Verify GREEN and the frontend baseline**

Run:

```bash
npm run test:run
npm run lint
```

Expected: all tests pass and ESLint exits 0.

- [ ] **Step 5: Commit only Task 1 files**

```bash
git add package.json package-lock.json .env.example src/config src/test \
  src/api/client.js src/api/client.test.js src/api/auth.js \
  src/components/ToastProvider.jsx src/components/ToastProvider.test.jsx \
  src/components/AsyncState.jsx src/App.jsx
git commit -m "feat: add explicit frontend API runtime modes"
```

---

### Task 2: University Reference Data and Item API Contract

**Files:**
- Create: `src/api/universities.js`
- Modify: `src/api/items.js`
- Modify: `src/api/normalizers.js`
- Modify: `src/api/auth.js`
- Create: `src/api/items.test.js`
- Create: `src/api/normalizers.test.js`
- Create: `src/api/universities.test.js`

**Interfaces:**
- Produces: `getUniversities()` and `getPickupLocations(universityId)`.
- Produces: `toCreateItemPayload(form)` with canonical snake_case fields.
- Produces: normalized item fields `universityId`, `university`,
  `pickupLocationId`, `location`, `wishlistCount`, and `wishlisted`.

- [ ] **Step 1: Write failing contract tests**

```js
// src/api/normalizers.test.js
import { describe, expect, it } from 'vitest'
import { normalizeItem, toCreateItemPayload } from './normalizers'

it('normalizes the Spring item response', () => {
  expect(normalizeItem({
    id: 7,
    rental_fee: 1200,
    rental_unit: 'DAY',
    pickup_location_id: 3,
    pickup_location_name: '누리관 앞',
    owner_university_id: 1,
    owner_university_name: '부경대학교',
    image_urls: ['/a.png'],
    wishlist_count: 4,
    wishlisted: true,
  })).toMatchObject({
    id: 7,
    price: 1200,
    priceType: '일',
    pickupLocationId: 3,
    location: '누리관 앞',
    universityId: 1,
    university: '부경대학교',
    photos: ['/a.png'],
    wishlistCount: 4,
    wishlisted: true,
  })
})

it('creates only canonical item request fields', () => {
  expect(toCreateItemPayload({
    title: '우산',
    price: '1000',
    priceType: '일',
    pickupLocationId: 3,
    type: 'rent',
    description: '깨끗함',
  })).toEqual({
    title: '우산',
    rental_fee: 1000,
    rental_unit: 'DAY',
    pickup_location_id: 3,
    type: 'LEND',
    description: '깨끗함',
    precautions: '',
    photos: [],
  })
})
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm run test:run -- src/api/items.test.js src/api/normalizers.test.js \
  src/api/universities.test.js
```

Expected: FAIL because old payload keys are `price`, `price_unit`, and
`pickup_location`, and the university module is absent.

- [ ] **Step 3: Implement canonical reference and item transport**

Implement:

```js
// src/api/universities.js
import { apiFetch } from './client'

export const getUniversities = () => apiFetch('/universities')
export const getPickupLocations = universityId =>
  apiFetch(`/universities/${universityId}/pickup-locations`)
```

Update JSON and multipart item requests to retain these exact keys:

```js
{
  title,
  type,
  rental_fee,
  rental_unit,
  pickup_location_id,
  description,
  precautions
}
```

Append each `photos` file under the multipart name `photos`. Update signup to
accept and send `university_id`. Extend the normalizer with the fields asserted
above and preserve the server's `owner_id` for ownership checks.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test:run -- src/api/items.test.js src/api/normalizers.test.js \
  src/api/universities.test.js
npm run lint
```

Expected: focused tests and lint pass.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/api/auth.js src/api/items.js src/api/items.test.js \
  src/api/normalizers.js src/api/normalizers.test.js \
  src/api/universities.js src/api/universities.test.js
git commit -m "feat: align item and university API contracts"
```

---

### Task 3: Item and Profile UI Integration

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/ItemRegistrationModal.jsx`
- Modify: `src/ProductDetailPage.jsx`
- Modify: `src/pages/HomePage.jsx`
- Modify: `src/pages/SearchPage.jsx`
- Modify: `src/pages/ProfileSetupPage.jsx`
- Create: `src/hooks/useReferenceData.js`
- Create: `src/hooks/useItems.js`
- Create: `src/components/ItemRegistrationModal.test.jsx`
- Create: `src/pages/SearchPage.test.jsx`

**Interfaces:**
- Consumes: Task 1 `AsyncState` and toast API.
- Consumes: Task 2 university and item functions.
- Produces: `useReferenceData(selectedUniversityId)` and
  `useItems({ universityId, accessToken })`.

- [ ] **Step 1: Write failing user-flow tests**

```jsx
it('submits the selected pickup location id', async () => {
  const onSubmit = vi.fn()
  render(<ItemRegistrationModal
    isOpen
    pickupLocations={[{ id: 11, name: '누리관 앞' }]}
    onSubmit={onSubmit}
  />)
  await userEvent.type(screen.getByLabelText('제목'), '우산')
  await userEvent.type(screen.getByLabelText('대여료'), '1000')
  await userEvent.selectOptions(screen.getByLabelText('수령 장소'), '11')
  await userEvent.click(screen.getByRole('button', { name: '등록하기' }))
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    pickupLocationId: 11,
  }))
})
```

Add a search-page test that renders an API error and invokes `onRetry` when the
retry button is clicked.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm run test:run -- src/components/ItemRegistrationModal.test.jsx \
  src/pages/SearchPage.test.jsx
```

Expected: FAIL because the modal stores a location string and search has no
error/retry contract.

- [ ] **Step 3: Implement the item/profile hooks and UI states**

`useReferenceData` loads universities once and pickup locations after an ID is
selected. `useItems` exposes:

```js
{
  items,
  loading,
  error,
  reload,
  create,
  update,
  remove,
  updateStatus
}
```

In API modes, do not initialize item state from `src/data/items.js`. Use
`university_id` in list queries. Submit `university_id` from profile setup and
`pickup_location_id` from item registration. Connect owner-only update, status,
and delete actions on the detail view. Replace registration alerts with toasts.

- [ ] **Step 4: Verify item flow**

Run:

```bash
npm run test:run
npm run lint
```

Expected: all frontend tests and lint pass.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/App.jsx src/ProductDetailPage.jsx src/components \
  src/pages/HomePage.jsx src/pages/SearchPage.jsx \
  src/pages/ProfileSetupPage.jsx src/hooks
git commit -m "feat: connect item and profile screens to reference data"
```

---

### Task 4: Chat REST Loading, Read State, and Optimistic Failures

**Files:**
- Modify: `src/api/chats.js`
- Modify: `src/api/normalizers.js`
- Modify: `src/pages/ChatPage.jsx`
- Create: `src/hooks/useChatRooms.js`
- Create: `src/hooks/useChatRooms.test.jsx`
- Create: `src/pages/ChatPage.test.jsx`

**Interfaces:**
- Produces: `markChatRoomRead(roomId, accessToken)`.
- Produces: `getChatMessages(roomId, accessToken, { before, size })`.
- Produces: optimistic messages with `clientId` and
  `deliveryStatus: sending | sent | failed`.

- [ ] **Step 1: Write failing chat behavior tests**

```jsx
it('loads and marks a room read when selected', async () => {
  const api = {
    getMessages: vi.fn().mockResolvedValue([{ id: 5, message: '안녕하세요' }]),
    markRead: vi.fn().mockResolvedValue(null),
  }
  const { result } = renderHook(() => useChatRooms({ api, accessToken: 'jwt' }))
  await act(() => result.current.selectRoom({ roomId: 9 }))
  expect(api.getMessages).toHaveBeenCalledWith(9, 'jwt', { size: 50 })
  expect(api.markRead).toHaveBeenCalledWith(9, 'jwt')
})

it('keeps a failed optimistic message available for retry', async () => {
  const api = { sendMessage: vi.fn().mockRejectedValue(new Error('offline')) }
  const { result } = renderHook(() => useChatRooms({ api, accessToken: 'jwt' }))
  await act(() => result.current.send(9, '메시지'))
  expect(result.current.messages[0].deliveryStatus).toBe('failed')
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm run test:run -- src/hooks/useChatRooms.test.jsx src/pages/ChatPage.test.jsx
```

Expected: FAIL because room selection does not fetch messages or mark them read,
and failed sends only show an alert.

- [ ] **Step 3: Implement REST chat state**

Add:

```js
export function markChatRoomRead(roomId, accessToken) {
  return apiFetch(`/chats/rooms/${roomId}/read`, {
    method: 'PATCH',
    accessToken,
  })
}
```

Have the hook fetch messages on room selection, set room unread count to zero
after a successful read call, and maintain optimistic delivery state. Retry
reuses the `clientId` and replaces it with the server-normalized message on
success. Chat-room creation errors stop navigation and use a toast.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test:run
npm run lint
```

Expected: tests and lint pass.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/api/chats.js src/api/normalizers.js src/hooks/useChatRooms.js \
  src/hooks/useChatRooms.test.jsx src/pages/ChatPage.jsx \
  src/pages/ChatPage.test.jsx src/App.jsx
git commit -m "feat: complete chat REST message flow"
```

---

### Task 5: Authenticated STOMP Chat

**Files:**
- Create: `src/chat/stompClient.js`
- Create: `src/chat/stompClient.test.js`
- Modify: `src/hooks/useChatRooms.js`
- Modify: `src/hooks/useChatRooms.test.jsx`
- Modify: `src/pages/ChatPage.jsx`

**Interfaces:**
- Produces: `createChatSocket({ baseUrl, accessToken, onStateChange })`.
- Produces socket methods `connect()`, `subscribe(roomId, handler)`,
  `publish(roomId, message)`, and `disconnect()`.
- Consumes normalized server message IDs from Task 4.

- [ ] **Step 1: Write failing socket tests**

```js
it('authenticates CONNECT and deduplicates messages by server id', () => {
  const client = createFakeStompClient()
  const socket = createChatSocket({
    baseUrl: 'http://localhost:8080',
    accessToken: 'jwt',
    clientFactory: () => client,
  })
  socket.connect()
  expect(client.connectHeaders.Authorization).toBe('Bearer jwt')

  const handler = vi.fn()
  socket.subscribe(3, handler)
  client.emit(3, { id: 8, message: '한 번' })
  client.emit(3, { id: 8, message: '한 번' })
  expect(handler).toHaveBeenCalledTimes(1)
})
```

Add a fake-timer test proving reconnect delays are capped at 30 seconds and
subscriptions are restored once.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm run test:run -- src/chat/stompClient.test.js \
  src/hooks/useChatRooms.test.jsx
```

Expected: FAIL because the STOMP adapter is absent.

- [ ] **Step 3: Implement the socket adapter**

Use `@stomp/stompjs` with:

```js
new Client({
  brokerURL: `${wsBaseUrl}/ws-chat`,
  connectHeaders: { Authorization: `Bearer ${accessToken}` },
  reconnectDelay: 0,
})
```

Implement bounded delays `1000, 2000, 4000, 8000, 16000, 30000`. Subscribe to
`/topic/chats/rooms/${roomId}` and publish to
`/app/chats/rooms/${roomId}/messages` with `{ message }`. The hook holds only
the selected room subscription and merges messages by server ID.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test:run
npm run lint
```

Expected: all frontend tests and lint pass.

- [ ] **Step 5: Commit Task 5**

```bash
git add package.json package-lock.json src/chat src/hooks/useChatRooms.js \
  src/hooks/useChatRooms.test.jsx src/pages/ChatPage.jsx
git commit -m "feat: add authenticated realtime chat"
```

---

### Task 6: Rental Domain Guards and Environment-Gated Payment

**Files:**
- Modify: `backend/src/main/java/com/save/rental/RentalService.java`
- Modify: `backend/src/main/java/com/save/rental/RentalController.java`
- Modify: `backend/src/main/java/com/save/rental/RentalRepository.java`
- Create: `backend/src/main/java/com/save/rental/PaymentTransitionPolicy.java`
- Modify: `backend/src/test/java/com/save/MarketplaceIntegrationTest.java`
- Create: `backend/src/test/java/com/save/rental/RentalServiceTest.java`

**Interfaces:**
- Produces: `PaymentTransitionPolicy.assertDirectPaymentAllowed()`.
- Enforces item/chat/user/date/price consistency before saving a request.
- Keeps current REST endpoint paths unchanged.

- [ ] **Step 1: Add failing backend tests**

```java
@Test
void borrowerCannotRequestOwnItem() {
    assertThatThrownBy(() -> rentalService.create(ownerId,
            new RentalCreateRequest(itemId, roomId, start, end, 1000)))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("본인");
}

@Test
void productionRejectsDirectPaidTransition() {
    PaymentTransitionPolicy policy = new PaymentTransitionPolicy(false);
    assertThatThrownBy(policy::assertDirectPaymentAllowed)
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("결제");
}
```

Add tests for reversed dates, mismatched chat room/item, negative or
server-inconsistent total, and illegal transitions.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
JAVA_HOME=/home/user/.local/jdks/jdk-17.0.19+10 \
PATH=/home/user/.local/jdks/jdk-17.0.19+10/bin:$PATH \
./gradlew test --tests 'com.save.rental.*' \
  --tests 'com.save.MarketplaceIntegrationTest'
```

Expected: new guard tests fail.

- [ ] **Step 3: Implement minimal rental guards**

Inject `@Value("${features.direct-payment-transition:false}")` into
`PaymentTransitionPolicy`. Validate dates, parties, room/item relation,
availability, and price in `RentalService`. Add repository queries that detect
active rentals for an item. Call the payment policy only from the `/paid`
transition.

- [ ] **Step 4: Verify GREEN**

Run the Task 6 command again.

Expected: focused backend tests pass.

- [ ] **Step 5: Commit Task 6**

```bash
git add backend/src/main/java/com/save/rental \
  backend/src/test/java/com/save/rental \
  backend/src/test/java/com/save/MarketplaceIntegrationTest.java
git commit -m "feat: enforce rental lifecycle rules"
```

---

### Task 7: Rental API and UI

**Files:**
- Modify: `src/api/rentals.js`
- Create: `src/api/rentals.test.js`
- Create: `src/hooks/useRentals.js`
- Create: `src/hooks/useRentals.test.jsx`
- Create: `src/components/RentalRequestForm.jsx`
- Create: `src/components/RentalRequestForm.test.jsx`
- Create: `src/pages/RentalsPage.jsx`
- Create: `src/pages/RentalsPage.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/ProductDetailPage.jsx`
- Modify: `src/components/BottomNavigation.jsx`

**Interfaces:**
- Produces: `markRentalPaid` and `startRental` matching existing backend paths.
- Produces: `useRentals(accessToken)` with sent/received groups and transition
  actions.

- [ ] **Step 1: Write failing rental UI tests**

```jsx
it('rejects an end time before the start time', async () => {
  const onSubmit = vi.fn()
  render(<RentalRequestForm item={{ id: 1, price: 1000 }} onSubmit={onSubmit} />)
  await userEvent.type(screen.getByLabelText('시작일'), '2026-08-03T10:00')
  await userEvent.type(screen.getByLabelText('종료일'), '2026-08-02T10:00')
  await userEvent.click(screen.getByRole('button', { name: '대여 요청' }))
  expect(screen.getByText('종료일은 시작일 이후여야 합니다.')).toBeVisible()
  expect(onSubmit).not.toHaveBeenCalled()
})

it.each([
  ['REQUESTED', 'lender', ['승인', '거절']],
  ['REQUESTED', 'borrower', ['취소']],
  ['PAID', 'lender', ['대여 시작']],
  ['RENTING', 'lender', ['반납 처리']],
])('%s 상태에서 %s에게 허용된 동작만 표시한다', (status, role, labels) => {
  render(<RentalsPage rentals={[rental(status, role)]} />)
  labels.forEach(label => expect(screen.getByRole('button', { name: label })).toBeVisible())
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm run test:run -- src/api/rentals.test.js \
  src/hooks/useRentals.test.jsx src/components/RentalRequestForm.test.jsx \
  src/pages/RentalsPage.test.jsx
```

Expected: FAIL because the API functions and screens are incomplete.

- [ ] **Step 3: Implement rental transport and screens**

Add:

```js
export const markRentalPaid = (id, token) =>
  apiFetch(`/rentals/${id}/paid`, { method: 'PATCH', accessToken: token })
export const startRental = (id, token) =>
  apiFetch(`/rentals/${id}/start`, { method: 'PATCH', accessToken: token })
```

Normalize rental dates/status and group by `borrower_id`/`lender_id` relative to
the signed-in user. The request form emits:

```js
{
  item_id: item.id,
  chat_room_id: chatRoomId,
  start_date: new Date(start).toISOString(),
  end_date: new Date(end).toISOString(),
  total_price: calculatedTotal
}
```

Show the development payment action only when
`API_MODE === 'development'`. Refresh the affected rental and item after each
transition.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test:run
npm run lint
```

Expected: all frontend tests and lint pass.

- [ ] **Step 5: Commit Task 7**

```bash
git add src/api/rentals.js src/api/rentals.test.js src/hooks/useRentals* \
  src/components/RentalRequestForm* src/pages/RentalsPage* \
  src/App.jsx src/ProductDetailPage.jsx src/components/BottomNavigation.jsx
git commit -m "feat: connect rental request and lifecycle screens"
```

---

### Task 8: Wishlist and My Page Data

**Files:**
- Modify: `src/ProductDetailPage.jsx`
- Modify: `src/pages/MyPage.jsx`
- Modify: `src/api/normalizers.js`
- Create: `src/hooks/useMyPageData.js`
- Create: `src/hooks/useMyPageData.test.jsx`
- Create: `src/ProductDetailPage.test.jsx`
- Create: `src/pages/MyPage.test.jsx`

**Interfaces:**
- Consumes: `getMyInfo`, `getMyItems`, `getMyWishlist`, and `getMyRentals`.
- Produces independent section states under `profile`, `items`, `wishlist`, and
  `rentals`.

- [ ] **Step 1: Write failing rollback and partial-failure tests**

```jsx
it('rolls back wishlist state when the API fails', async () => {
  const toggleWishlist = vi.fn().mockRejectedValue(new Error('failed'))
  render(<ProductDetailPage
    item={{ id: 1, wishlisted: false, wishlistCount: 2 }}
    onToggleWishlist={toggleWishlist}
  />)
  await userEvent.click(screen.getByRole('button', { name: '찜하기' }))
  expect(await screen.findByText('찜 처리에 실패했습니다.')).toBeVisible()
  expect(screen.getByText('2')).toBeVisible()
})

it('shows successful sections when one My Page request fails', async () => {
  const api = fakeMyPageApi({ wishlist: Promise.reject(new Error('failed')) })
  render(<MyPage api={api} />)
  expect(await screen.findByText('내가 등록한 우산')).toBeVisible()
  expect(screen.getByText('찜 목록을 불러오지 못했습니다.')).toBeVisible()
})
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm run test:run -- src/ProductDetailPage.test.jsx \
  src/hooks/useMyPageData.test.jsx src/pages/MyPage.test.jsx
```

Expected: FAIL because wishlist controls and API-backed My Page sections are
not connected.

- [ ] **Step 3: Implement wishlist and independent My Page sections**

Optimistically toggle wishlist state, call add/remove, and restore the previous
item on failure. `useMyPageData` starts the four requests concurrently with
separate state reducers; no `Promise.all` rejection may discard successful
results. Remove “준비 중” and hardcoded My Page item data in API modes.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test:run
npm run lint
```

Expected: tests and lint pass.

- [ ] **Step 5: Commit Task 8**

```bash
git add src/ProductDetailPage.jsx src/ProductDetailPage.test.jsx \
  src/pages/MyPage.jsx src/pages/MyPage.test.jsx src/hooks/useMyPageData* \
  src/api/normalizers.js
git commit -m "feat: connect wishlist and My Page data"
```

---

### Task 9: Structured OpenAI Recommendation Service

**Files:**
- Create: `backend/src/main/java/com/save/recommendation/RecommendationAiPort.java`
- Modify: `backend/src/main/java/com/save/recommendation/OpenAiRecommendationClient.java`
- Modify: `backend/src/main/java/com/save/recommendation/RecommendationService.java`
- Modify: `backend/src/main/java/com/save/recommendation/Recommendation.java`
- Modify: `backend/src/main/java/com/save/recommendation/RecommendationResponse.java`
- Create: `backend/src/main/java/com/save/recommendation/AiRecommendationResult.java`
- Create: `backend/src/test/java/com/save/recommendation/RecommendationServiceTest.java`
- Create: `backend/src/test/java/com/save/recommendation/OpenAiRecommendationClientTest.java`
- Modify: `src/api/recommendations.js`
- Create: `src/hooks/useRecommendations.js`
- Create: `src/hooks/useRecommendations.test.jsx`
- Modify: `src/pages/HomePage.jsx`
- Modify: `src/pages/MyPage.jsx`

**Interfaces:**
- Produces:

```java
public interface RecommendationAiPort {
    AiRecommendationResult recommend(RecommendationAiInput input);
}

public record AiRecommendationResult(
        String headline,
        List<RecommendedItem> recommendations) {
    public record RecommendedItem(Integer itemId, String reason) {}
}
```

- Consumes only server-selected candidate item IDs.
- Returns at most three ordered, validated recommendations.

- [ ] **Step 1: Write failing service and client tests**

```java
@Test
void removesUnknownAndDuplicateAiItemIdsWhilePreservingOrder() {
    RecommendationAiPort ai = input -> new AiRecommendationResult("추천",
            List.of(new RecommendedItem(2, "첫째"),
                    new RecommendedItem(999, "없는 상품"),
                    new RecommendedItem(2, "중복"),
                    new RecommendedItem(3, "둘째")));
    RecommendationResponse response = serviceWith(ai).recommend(userId, request);
    assertThat(response.recommendedItems())
            .extracting(ItemResponse::id)
            .containsExactly(2, 3);
    assertThat(response.recommendationReasons())
            .containsExactly("첫째", "둘째");
}

@Test
void sendsResponsesApiStructuredOutputSchema() {
    RecordedRequest request = executeAgainstMockWebServer();
    JsonNode body = objectMapper.readTree(request.getBody().readUtf8());
    assertThat(request.getPath()).isEqualTo("/v1/responses");
    assertThat(body.at("/text/format/type").asText()).isEqualTo("json_schema");
    assertThat(body.at("/text/format/schema/properties/headline").isObject()).isTrue();
}
```

Add service tests for same-university `AVAILABLE` candidates, owner exclusion,
maximum three results, refusal, missing credentials, timeout, and persisted
headline/reason ordering.

- [ ] **Step 2: Verify RED**

Run:

```bash
JAVA_HOME=/home/user/.local/jdks/jdk-17.0.19+10 \
PATH=/home/user/.local/jdks/jdk-17.0.19+10/bin:$PATH \
./gradlew test --tests 'com.save.recommendation.*'
```

Expected: FAIL because the port, response fields, and Responses API contract do
not exist.

- [ ] **Step 3: Implement the recommendation port and persistence**

Build an input containing the authenticated user's database profile, wishlist,
context, and bounded candidate DTOs. POST to `/v1/responses` with `input` and:

```json
{
  "text": {
    "format": {
      "type": "json_schema",
      "name": "save_recommendations",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "headline": { "type": "string" },
          "recommendations": {
            "type": "array",
            "minItems": 1,
            "maxItems": 3,
            "items": {
              "type": "object",
              "properties": {
                "item_id": { "type": "integer" },
                "reason": { "type": "string" }
              },
              "required": ["item_id", "reason"],
              "additionalProperties": false
            }
          }
        },
        "required": ["headline", "recommendations"],
        "additionalProperties": false
      }
    }
  }
}
```

Parse `output` message content, handle `refusal` and incomplete responses, then
validate IDs against the candidate map. Persist `headline` and ordered reasons
alongside the existing ordered item relation. Do not use the Python mock
datasets or add FastAPI.

On the frontend, call recommendations after authentication/context is
available. Render `headline`, items, and reasons in Home and history in My Page.
Show an empty state for zero history and an error state for API failure.

- [ ] **Step 4: Verify backend and frontend recommendation tests**

Run:

```bash
cd backend
JAVA_HOME=/home/user/.local/jdks/jdk-17.0.19+10 \
PATH=/home/user/.local/jdks/jdk-17.0.19+10/bin:$PATH \
./gradlew test --tests 'com.save.recommendation.*'
cd ..
npm run test:run -- src/hooks/useRecommendations.test.jsx
npm run lint
```

Expected: focused backend/frontend tests and lint pass without a live OpenAI
request.

- [ ] **Step 5: Commit Task 9**

```bash
git add backend/src/main/java/com/save/recommendation \
  backend/src/test/java/com/save/recommendation \
  src/api/recommendations.js src/hooks/useRecommendations* \
  src/pages/HomePage.jsx src/pages/MyPage.jsx
git commit -m "feat: add structured OpenAI item recommendations"
```

---

### Task 10: PostgreSQL and Flyway Production Profile

**Files:**
- Modify: `backend/build.gradle`
- Split/Modify: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/resources/application-dev.yml`
- Create: `backend/src/main/resources/application-prod.yml`
- Create: `backend/src/main/resources/db/migration/V1__baseline.sql`
- Create: `backend/src/test/java/com/save/config/ProductionConfigurationTest.java`
- Modify: `.env.example`

**Interfaces:**
- Development: H2 plus JPA update.
- Production: PostgreSQL plus Flyway and JPA validate.
- Produces environment contract `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.

- [ ] **Step 1: Add a failing production-context test**

```java
@Test
void productionUsesPostgresFlywayAndJpaValidation() {
    new ApplicationContextRunner()
            .withInitializer(new ConfigDataApplicationContextInitializer())
            .withPropertyValues(
                    "spring.profiles.active=prod",
                    "DB_URL=jdbc:postgresql://localhost:5432/save",
                    "DB_USERNAME=save",
                    "DB_PASSWORD=secret",
                    "JWT_SECRET=01234567890123456789012345678901",
                    "CORS_ALLOWED_ORIGINS=https://save.example")
            .run(context -> {
                assertThat(context.getEnvironment()
                        .getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
                assertThat(context.getEnvironment()
                        .getProperty("spring.flyway.enabled")).isEqualTo("true");
            });
}
```

- [ ] **Step 2: Verify RED**

Run:

```bash
JAVA_HOME=/home/user/.local/jdks/jdk-17.0.19+10 \
PATH=/home/user/.local/jdks/jdk-17.0.19+10/bin:$PATH \
./gradlew test --tests 'com.save.config.ProductionConfigurationTest'
```

Expected: FAIL because the production profile and Flyway dependency are absent.

- [ ] **Step 3: Add profile configuration and baseline migration**

Add:

```gradle
implementation 'org.flywaydb:flyway-core'
implementation 'org.flywaydb:flyway-database-postgresql'
runtimeOnly 'org.postgresql:postgresql'
```

Move H2 and local storage properties into `application-dev.yml`. Configure
environment-backed production datasource values, Flyway enabled, H2 console disabled, and
`ddl-auto: validate` in `application-prod.yml`. Write `V1__baseline.sql` from
the current JPA mappings, including recommendation headline/reasons, without
editing either protected ERD document.

- [ ] **Step 4: Verify profile and full backend tests**

Run:

```bash
JAVA_HOME=/home/user/.local/jdks/jdk-17.0.19+10 \
PATH=/home/user/.local/jdks/jdk-17.0.19+10/bin:$PATH \
./gradlew test
```

Expected: all backend tests pass.

- [ ] **Step 5: Commit Task 10**

```bash
git add backend/build.gradle backend/src/main/resources/application*.yml \
  backend/src/main/resources/db/migration \
  backend/src/test/java/com/save/config .env.example
git commit -m "feat: add PostgreSQL Flyway production profile"
```

---

### Task 11: Secure Upload Boundary and S3-Compatible Storage

**Files:**
- Modify: `backend/src/main/java/com/save/item/PhotoStorageService.java`
- Create: `backend/src/main/java/com/save/storage/ObjectStorage.java`
- Create: `backend/src/main/java/com/save/storage/LocalObjectStorage.java`
- Create: `backend/src/main/java/com/save/storage/S3ObjectStorage.java`
- Create: `backend/src/main/java/com/save/storage/UploadPolicy.java`
- Create: `backend/src/main/java/com/save/storage/StorageProperties.java`
- Modify: `backend/src/main/resources/application-dev.yml`
- Modify: `backend/src/main/resources/application-prod.yml`
- Modify: `backend/build.gradle`
- Create: `backend/src/test/java/com/save/storage/UploadPolicyTest.java`
- Create: `backend/src/test/java/com/save/storage/LocalObjectStorageTest.java`
- Create: `backend/src/test/java/com/save/storage/S3ObjectStorageTest.java`

**Interfaces:**
- Produces: `ObjectStorage.store(ValidatedImage image): StoredObject`.
- Produces: `UploadPolicy.validate(MultipartFile): ValidatedImage`.
- Development selects `LocalObjectStorage`; production selects
  `S3ObjectStorage`.

- [ ] **Step 1: Write failing upload security tests**

```java
@Test
void rejectsExtensionMimeAndSignatureMismatch() {
    MockMultipartFile file = new MockMultipartFile(
            "photos", "../avatar.png", "image/png", "not-a-png".getBytes(UTF_8));
    assertThatThrownBy(() -> policy.validate(file))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("이미지");
}

@Test
void generatedObjectNameDoesNotContainClientPath() {
    StoredObject stored = storage.store(validPng("../../secret.png"));
    assertThat(stored.key()).doesNotContain("..", "secret.png");
}
```

Add tests for byte limit, image count, JPEG/PNG/WebP decoding, S3 bucket/key,
content type, and endpoint override.

- [ ] **Step 2: Verify RED**

Run:

```bash
JAVA_HOME=/home/user/.local/jdks/jdk-17.0.19+10 \
PATH=/home/user/.local/jdks/jdk-17.0.19+10/bin:$PATH \
./gradlew test --tests 'com.save.storage.*'
```

Expected: FAIL because the storage abstraction and security policy are absent.

- [ ] **Step 3: Implement validation and profile-selected storage**

Add AWS SDK v2 S3 dependency. Validate configured count/size, extension,
declared MIME, magic bytes, and `ImageIO` decoding before storage. Generate
keys as `items/{yyyy}/{MM}/{UUID}.{serverExtension}`. Resolve local paths
against a normalized configured root and reject escape. Build the S3 client
from endpoint, region, bucket, credentials, and path-style environment
properties; never log credentials.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
JAVA_HOME=/home/user/.local/jdks/jdk-17.0.19+10 \
PATH=/home/user/.local/jdks/jdk-17.0.19+10/bin:$PATH \
./gradlew test --tests 'com.save.storage.*' \
  --tests 'com.save.MarketplaceIntegrationTest'
```

Expected: storage and item integration tests pass.

- [ ] **Step 5: Commit Task 11**

```bash
git add backend/build.gradle backend/src/main/java/com/save/item/PhotoStorageService.java \
  backend/src/main/java/com/save/storage backend/src/test/java/com/save/storage \
  backend/src/main/resources/application-dev.yml \
  backend/src/main/resources/application-prod.yml
git commit -m "feat: secure uploads with pluggable object storage"
```

---

### Task 12: Production Secrets, CORS, Suspensions, WebSocket Authorization, and Health

**Files:**
- Modify: `backend/src/main/java/com/save/security/SecurityConfig.java`
- Modify: `backend/src/main/java/com/save/chat/config/WebSocketConfig.java`
- Create: `backend/src/main/java/com/save/security/ProductionSecretsValidator.java`
- Create: `backend/src/main/java/com/save/common/CorrelationIdFilter.java`
- Modify: `backend/build.gradle`
- Modify: `backend/src/main/resources/application-prod.yml`
- Create: `backend/src/test/java/com/save/security/SecurityBoundaryIntegrationTest.java`
- Create: `backend/src/test/java/com/save/chat/WebSocketSecurityIntegrationTest.java`
- Create: `backend/src/test/java/com/save/security/ProductionSecretsValidatorTest.java`
- Modify: `backend/README.md`

**Interfaces:**
- Requires exact production origins from `CORS_ALLOWED_ORIGINS`.
- Rejects missing/short/default production JWT secrets.
- Rejects suspended users in HTTP and STOMP authentication.
- Exposes Spring Actuator health only.

- [ ] **Step 1: Write failing security-boundary tests**

```java
@Test
void productionRejectsDevelopmentJwtSecret() {
    assertThatThrownBy(() -> validator.validate(
            "save-local-development-jwt-secret-change-me-2026"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("JWT_SECRET");
}

@Test
void corsDoesNotAllowUnconfiguredOrigin() throws Exception {
    mockMvc.perform(options("/api/v1/items")
            .header("Origin", "https://evil.example")
            .header("Access-Control-Request-Method", "GET"))
            .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
}
```

Add HTTP and STOMP tests for suspended users, missing STOMP JWT, invalid JWT,
and subscription by a room nonparticipant.

- [ ] **Step 2: Verify RED**

Run:

```bash
JAVA_HOME=/home/user/.local/jdks/jdk-17.0.19+10 \
PATH=/home/user/.local/jdks/jdk-17.0.19+10/bin:$PATH \
./gradlew test --tests 'com.save.security.*' --tests 'com.save.chat.*'
```

Expected: new validation and WebSocket authorization tests fail.

- [ ] **Step 3: Implement security and observability boundaries**

Parse comma-separated exact CORS origins and reject wildcard origins when
credentials are enabled. Validate the JWT secret during production startup.
Check user status after JWT subject resolution for HTTP and STOMP. Authorize
room subscription/publish against `ChatRoomService`. Add Actuator and expose
only `health` and `info`. Add or propagate `X-Correlation-ID`; put it in MDC and
remove it in `finally`. Document environment variables, safe logging, backup,
monitoring, and privacy-policy launch requirements.

- [ ] **Step 4: Verify GREEN and backend regression**

Run:

```bash
JAVA_HOME=/home/user/.local/jdks/jdk-17.0.19+10 \
PATH=/home/user/.local/jdks/jdk-17.0.19+10/bin:$PATH \
./gradlew test
```

Expected: all backend tests pass.

- [ ] **Step 5: Commit Task 12**

```bash
git add backend/build.gradle backend/README.md \
  backend/src/main/java/com/save/security \
  backend/src/main/java/com/save/chat/config/WebSocketConfig.java \
  backend/src/main/java/com/save/common/CorrelationIdFilter.java \
  backend/src/main/resources/application-prod.yml \
  backend/src/test/java/com/save/security \
  backend/src/test/java/com/save/chat
git commit -m "feat: enforce production security boundaries"
```

---

### Task 13: Full Verification and Protected-ERD Audit

**Files:**
- Modify only if a verification failure identifies a defect in Tasks 1-12.
- Never modify: `backend/docs/schema.dbml`
- Never modify: `backend/docs/database-tables.md`

**Interfaces:**
- Consumes all prior task outputs.
- Produces clean verification evidence.

- [ ] **Step 1: Install Linux frontend dependencies without deleting user data**

Because the checked-in workspace currently contains Windows native packages,
move the existing dependency directory to a recoverable sibling before
installing:

```bash
mv node_modules node_modules.windows-backup
npm ci
```

Expected: Linux-native Vite/Rolldown dependencies install successfully. Keep
`node_modules.windows-backup` untracked and report it to the user; do not delete
it without permission.

- [ ] **Step 2: Run full frontend verification**

```bash
npm run test:run
npm run lint
npm run build
```

Expected: all tests pass, ESLint exits 0, and Vite build exits 0.

- [ ] **Step 3: Run full backend verification**

```bash
cd backend
JAVA_HOME=/home/user/.local/jdks/jdk-17.0.19+10 \
PATH=/home/user/.local/jdks/jdk-17.0.19+10/bin:$PATH \
./gradlew clean test
```

Expected: all backend tests pass on Java 17.

- [ ] **Step 4: Audit requirements and ERD protection**

```bash
cd ..
git diff --check
git diff --name-only -- backend/docs/schema.dbml backend/docs/database-tables.md
git status --short
```

Expected: `git diff --check` produces no output; the protected-ERD command
produces no output; status contains only intentional source changes and the
pre-existing user changes/backups already reported.

- [ ] **Step 5: Record final verification evidence**

If verification exposed a defect, return to the owning task, repeat its
red/green cycle, and commit only that task's named files. Do not create an empty
verification commit. Report exact test counts, build results, remaining
external provisioning requirements, the recoverable Windows dependency backup,
and the unchanged ERD files.
