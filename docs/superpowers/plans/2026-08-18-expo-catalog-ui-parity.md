# Expo Catalog UI Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver real-data Expo home, explore, and item-detail routes that preserve the web UI hierarchy and never fall back to downloaded mock content.

**Architecture:** Add a small authenticated request client over the existing Zustand session store, validate and normalize catalog payloads at a dedicated boundary, and keep route components focused on screen state and navigation. Reuse only platform-safe presentation ideas from the downloaded app; the web `src` remains the UI source of truth.

**Tech Stack:** Expo SDK 57, Expo Router, React Native, TypeScript, Zustand, Jest Expo, React Native Testing Library, existing Spring Boot item/wishlist/recommendation APIs.

**Spec:** `docs/superpowers/specs/2026-08-18-expo-catalog-ui-parity-design.md`

## Global Constraints

- Work only in `/home/user/projects/SAVE-expo` on `feature/expo-src-parity`.
- Preserve the existing authentication routes, SecureStore rotation, and browser authentication behavior.
- UI hierarchy, copy, information order, and color intent come from the current web `src`, not the downloaded mobile UI.
- Do not import or create `mock.ts`, mock tokens, demo catalog records, or API-error fallbacks.
- Do not add TanStack Query.
- Do not render fixed `#카메라`, `#미러리스`, `#촬영`, `1 / 3`, or `거래 42회` values.
- Every production behavior starts with a failing test and follows RED–GREEN–REFACTOR.
- Keep item creation, camera, rental, chat, report, profile, and notification flows outside this plan.

---

### Task 1: Add a session-aware JSON client

**Files:**
- Create: `apps/save-app/src/api/client.ts`
- Create: `apps/save-app/src/api/client.test.ts`

**Interfaces:**
- Consumes: `runtime.apiBaseUrl`, `useAuthStore.getState().accessToken`, `refreshAccessToken()`.
- Produces: `apiRequest<T>(path: string, options?: ApiRequestOptions): Promise<T>` and `ApiError`.

- [ ] **Step 1: Write failing request-client tests**

Create tests that install an authenticated Zustand state, stub `fetch`, and assert real observable behavior:

```ts
it('sends the current bearer token and encoded query parameters', async () => {
  mockSession('access-1');
  fetchMock.mockResolvedValue(jsonResponse({ content: [] }));

  await apiRequest('/items', { params: { query: '렌즈 가방', only_available: true } });

  expect(fetchMock).toHaveBeenCalledWith(
    `${runtime.apiBaseUrl}/items?query=${encodeURIComponent('렌즈 가방')}&only_available=true`,
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer access-1' }) }),
  );
});

it('refreshes once after 401 and retries with the new token', async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
    .mockResolvedValueOnce(jsonResponse({ id: 7 }));
  refreshAccessToken.mockResolvedValue('access-2');

  await expect(apiRequest('/items/7')).resolves.toEqual({ id: 7 });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(lastAuthorization()).toBe('Bearer access-2');
});

it('does not convert offline errors into logout', async () => {
  fetchMock.mockRejectedValue(new TypeError('network'));
  await expect(apiRequest('/items')).rejects.toMatchObject({ status: 0 });
  expect(refreshAccessToken).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- src/api/client.test.ts`

Expected: FAIL because `src/api/client.ts` does not exist.

- [ ] **Step 3: Implement the minimal request client**

Implement URL construction without `new URL` dependence, JSON parsing, sanitized errors, bearer headers, and exactly one 401 refresh:

```ts
export type ApiRequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | null | undefined>;
  accessToken?: string | null;
  retried?: boolean;
};

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly data?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  // Read current state immediately before fetch, encode non-empty params,
  // retry once after refreshAccessToken(), and throw ApiError for failures.
}
```

Do not export token values, log requests, or include credentials/cookies.

- [ ] **Step 4: Verify GREEN and regression safety**

Run:

```bash
npm test -- src/api/client.test.ts
npm run typecheck
```

Expected: focused tests pass and TypeScript exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/save-app/src/api
git commit -m "feat: add authenticated Expo API client"
```

### Task 2: Validate and expose real catalog APIs

**Files:**
- Create: `apps/save-app/src/catalog/types.ts`
- Create: `apps/save-app/src/catalog/schema.ts`
- Create: `apps/save-app/src/catalog/schema.test.ts`
- Create: `apps/save-app/src/catalog/api.ts`
- Create: `apps/save-app/src/catalog/api.test.ts`

**Interfaces:**
- Consumes: `apiRequest<T>()` from Task 1 and current camel-case Spring `ItemResponse` fields.
- Produces: `CatalogItem`, `CatalogPage`, `RecommendationSummary`, `listItems()`, `getItem()`, `setWishlist()`, `getRecommendationHistory()`, and `createRecommendation()`.

- [ ] **Step 1: Write failing schema tests**

Define the normalized contract through tests:

```ts
const backendItem = {
  id: 7,
  ownerId: 3,
  ownerName: '김세이브',
  ownerUniversityId: 1,
  ownerUniversityName: '부경대학교',
  type: 'LEND',
  title: '삼각대',
  rentalFee: 3000,
  rentalUnit: 'DAY',
  pickupLocationId: 4,
  pickupLocationName: '도서관',
  description: '가벼운 삼각대',
  precautions: '파손 주의',
  status: 'AVAILABLE',
  mainImageUrl: null,
  imageUrls: [],
  viewCount: 2,
  wishlistCount: 1,
  wishlisted: false,
  ownerRating: 4.5,
  reviewCount: 8,
  createdAt: '2026-08-18T01:00:00Z',
  updatedAt: '2026-08-18T01:00:00Z',
};

it('normalizes an ItemResponse without inventing optional values', () => {
  expect(parseCatalogItem(backendItem)).toMatchObject({
    id: 7,
    title: '삼각대',
    pickupLocationName: '도서관',
    imageUrls: [],
  });
});

it('rejects malformed successful item payloads', () => {
  expect(() => parseCatalogItem({ ...backendItem, id: 'seven' })).toThrow('catalog');
});
```

Also assert page `content`, `pageable.pageNumber`, `pageable.pageSize`, and `totalElements`; optional backend values remain `null`, not fabricated strings.

- [ ] **Step 2: Run schema tests and confirm RED**

Run: `npm test -- src/catalog/schema.test.ts`

Expected: FAIL because the catalog modules do not exist.

- [ ] **Step 3: Implement types and runtime parsers**

Create explicit types:

```ts
export type CatalogItem = {
  id: number;
  ownerId: number;
  ownerName: string;
  ownerUniversityId: number | null;
  ownerUniversityName: string | null;
  type: 'LEND' | 'BORROW';
  title: string;
  rentalFee: number;
  rentalUnit: string;
  pickupLocationId: number | null;
  pickupLocationName: string | null;
  description: string;
  precautions: string | null;
  status: 'AVAILABLE' | 'RENTED' | 'UNAVAILABLE';
  imageUrls: string[];
  wishlistCount: number;
  wishlisted: boolean;
  ownerRating: number;
  reviewCount: number;
  createdAt: string;
};
```

Implement narrow `unknown` guards in `schema.ts`; do not use `any` and do not substitute owner, university, location, image, rating, or review fixtures.

- [ ] **Step 4: Write failing catalog API tests**

Mock only `apiRequest` and assert endpoint contracts:

```ts
it('lists available lend items with server filters', async () => {
  apiRequestMock.mockResolvedValue(pagePayload);
  await listItems({ type: 'LEND', query: '삼각대', onlyAvailable: true, sort: 'latest', page: 0, size: 20 });
  expect(apiRequestMock).toHaveBeenCalledWith('/items', {
    params: { type: 'LEND', query: '삼각대', only_available: true, sort: 'latest', page: 0, size: 20 },
  });
});

it('uses POST to add and DELETE to remove a wishlist', async () => {
  await setWishlist(7, true);
  await setWishlist(7, false);
  expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/items/7/wishlist', { method: 'POST' });
  expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/items/7/wishlist', { method: 'DELETE' });
});
```

Cover item detail, recommendation history, and web-equivalent recommendation input keys.

- [ ] **Step 5: Run catalog API tests and confirm RED**

Run: `npm test -- src/catalog/api.test.ts`

Expected: FAIL because `src/catalog/api.ts` does not exist.

- [ ] **Step 6: Implement catalog API functions**

Implement:

```ts
export function listItems(input: ListItemsInput): Promise<CatalogPage>;
export function getItem(id: number): Promise<CatalogItem>;
export function setWishlist(id: number, wishlisted: boolean): Promise<void>;
export function getRecommendationHistory(): Promise<RecommendationSummary[]>;
export function createRecommendation(input: RecommendationInput): Promise<RecommendationSummary>;
```

Every successful response passes through the runtime parser before reaching a screen.

- [ ] **Step 7: Verify GREEN and commit**

Run:

```bash
npm test -- src/catalog/schema.test.ts src/catalog/api.test.ts
npm run typecheck
```

Then commit:

```bash
git add apps/save-app/src/catalog
git commit -m "feat: add validated Expo catalog APIs"
```

### Task 3: Implement shared catalog UI, home, and explore

**Files:**
- Create: `apps/save-app/src/catalog/components/screen-state.tsx`
- Create: `apps/save-app/src/catalog/components/item-visual.tsx`
- Create: `apps/save-app/src/catalog/components/item-card.tsx`
- Create: `apps/save-app/src/catalog/format.ts`
- Create: `apps/save-app/src/catalog/use-home-catalog.ts`
- Create: `apps/save-app/src/catalog/use-explore-catalog.ts`
- Create: `apps/save-app/src/__tests__/home-screen.test.tsx`
- Create: `apps/save-app/src/__tests__/explore-screen.test.tsx`
- Modify: `apps/save-app/src/app/(authenticated)/(tabs)/index.tsx`
- Modify: `apps/save-app/src/app/(authenticated)/(tabs)/explore.tsx`
- Modify: `apps/save-app/src/theme.ts`

**Interfaces:**
- Consumes: Task 2 catalog functions and existing `useAuthStore(state => state.user)`.
- Produces: real-data home and explore routes plus reusable item presentation.

- [ ] **Step 1: Write failing home-screen tests**

Mock the catalog boundary, not React Native primitives. Assert:

```ts
it('renders web-reference sections in order from server data', async () => {
  render(<HomeScreen />);
  expect(await screen.findByText('오늘의 AI 추천 물품')).toBeOnTheScreen();
  expect(screen.getByText('인기 대여 물품')).toBeOnTheScreen();
  expect(screen.getByText('방금 올라왔어요')).toBeOnTheScreen();
  expect(screen.getByText('서버 삼각대')).toBeOnTheScreen();
});

it('does not replace an empty recommendation with catalog items', async () => {
  recommendationHistoryMock.mockResolvedValue([]);
  render(<HomeScreen />);
  expect(await screen.findByText('AI 추천 받기')).toBeOnTheScreen();
  expect(screen.queryByText('가짜 추천')).not.toBeOnTheScreen();
});

it('opens explore with the entered query and opens item detail', async () => {
  // Submit search and press a server item; assert Expo Router parameters.
});
```

Cover loading failure, retry, and pull-to-refresh completion.

- [ ] **Step 2: Run home tests and confirm RED**

Run: `npm test -- src/__tests__/home-screen.test.tsx`

Expected: FAIL because the current route is a title-only shell.

- [ ] **Step 3: Implement home and shared components**

Reproduce the web order and Korean copy with React Native `ScrollView`, `RefreshControl`, `TextInput`, `Pressable`, and data-only item components. Request popular and latest lists independently. Read the authenticated user's university and department for campus filtering and recommendation creation. Render a neutral image placeholder only when the API supplies no image.

- [ ] **Step 4: Verify home GREEN**

Run: `npm test -- src/__tests__/home-screen.test.tsx`

Expected: home tests pass with no console warnings.

- [ ] **Step 5: Write failing explore-screen tests**

```ts
it('sends board, query, and availability filters to the server', async () => {
  render(<ExploreScreen />);
  fireEvent.press(screen.getByText('물품 빌리기'));
  fireEvent.changeText(screen.getByPlaceholderText('장소, 물품명 검색...'), '우산');
  fireEvent.press(screen.getByRole('switch'));
  await waitFor(() => expect(listItemsMock).toHaveBeenLastCalledWith(expect.objectContaining({
    type: 'BORROW', query: '우산', onlyAvailable: true,
  })));
});

it('shows loading, empty, error, and retry as distinct states', async () => {
  // Reject once, assert alert and retry, then resolve an empty page and assert empty copy.
});
```

Also assert item navigation and route-query initialization.

- [ ] **Step 6: Run explore tests and confirm RED**

Run: `npm test -- src/__tests__/explore-screen.test.tsx`

Expected: FAIL because the current route is a title-only shell.

- [ ] **Step 7: Implement explore**

Use a debounced server query, server-side board and availability filters, `FlatList`, and stable retry state. Do not import downloaded normalizers or mock arrays. Missing location and university values render neutral labels rather than assumed campus data.

- [ ] **Step 8: Verify GREEN and commit**

Run:

```bash
npm test -- src/__tests__/home-screen.test.tsx src/__tests__/explore-screen.test.tsx
npm run typecheck
npm run lint
```

Then commit:

```bash
git add apps/save-app/src/catalog apps/save-app/src/app apps/save-app/src/__tests__ apps/save-app/src/theme.ts
git commit -m "feat: add real-data Expo catalog screens"
```

### Task 4: Implement item detail, wishlist, and milestone verification

**Files:**
- Create: `apps/save-app/src/app/(authenticated)/items/[id].tsx`
- Create: `apps/save-app/src/catalog/use-item-detail.ts`
- Create: `apps/save-app/src/__tests__/item-detail-screen.test.tsx`
- Create: `apps/save-app/src/app/(authenticated)/_layout.tsx`
- Modify: `docs/mobile-ui-parity.md`
- Modify: `apps/save-app/README.md`

**Interfaces:**
- Consumes: `getItem()`, `setWishlist()`, `CatalogItem`, and Expo Router route/back APIs.
- Produces: a protected `/items/[id]` detail route with authoritative wishlist state.

- [ ] **Step 1: Write failing detail-route tests**

```ts
it('renders only API-provided detail values and the actual photo count', async () => {
  getItemMock.mockResolvedValue({ ...item, imageUrls: ['one.jpg', 'two.jpg'] });
  render(<ItemDetailScreen />);
  expect(await screen.findByText('1 / 2')).toBeOnTheScreen();
  expect(screen.queryByText('#카메라')).not.toBeOnTheScreen();
  expect(screen.queryByText('거래 42회')).not.toBeOnTheScreen();
});

it('uses a neutral placeholder and omits the counter when there are no photos', async () => {
  getItemMock.mockResolvedValue({ ...item, imageUrls: [] });
  render(<ItemDetailScreen />);
  expect(await screen.findByLabelText('등록된 사진 없음')).toBeOnTheScreen();
  expect(screen.queryByText(/1 \/ /)).not.toBeOnTheScreen();
});

it('does not fetch an invalid route id and offers back navigation', async () => {
  routeParams.id = 'invalid';
  render(<ItemDetailScreen />);
  expect(await screen.findByText('물품을 찾을 수 없습니다.')).toBeOnTheScreen();
  expect(getItemMock).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('뒤로가기'));
  expect(router.back).toHaveBeenCalled();
});
```

Cover 404, retry, image paging, failed wishlist rollback/refetch, successful wishlist count, and owner information.

- [ ] **Step 2: Run detail tests and confirm RED**

Run: `npm test -- src/__tests__/item-detail-screen.test.tsx`

Expected: FAIL because `/items/[id]` does not exist.

- [ ] **Step 3: Implement item detail and authoritative wishlist state**

Create the authenticated stack layout with the tabs and item-detail route registered and default headers disabled. Use `ScrollView`/horizontal image paging with a derived index, safe-area header, real response fields, and a fixed bottom area matching the web structure. Omit tags because the API has no tag field. Do not expose chat/rental/profile/report/share actions as successful controls in this milestone. Wishlist mutation errors keep/refetch server truth and render a retryable non-destructive message.

- [ ] **Step 4: Verify detail GREEN**

Run:

```bash
npm test -- src/__tests__/item-detail-screen.test.tsx
npm run typecheck
npm run lint
```

Expected: focused detail tests, TypeScript, and lint pass.

- [ ] **Step 5: Update parity documentation**

Mark Home, Explore, and Item detail as `implemented`, list the exact real endpoints, and retain `Not run` for physical-device checks. Record Compose and later flows as shells/absent. Update the mobile README with the real-catalog verification commands and LAN API requirement.

- [ ] **Step 6: Run forbidden-content audit**

Run:

```bash
rg -n "#카메라|#미러리스|#촬영|1 / 3|거래 42회|mock-access-token|mock-refresh-token|src/data/mock" apps/save-app/src --glob '!**/*.test.*'
```

Expected: no matches.

- [ ] **Step 7: Run full verification**

Run:

```bash
npm --prefix apps/save-app test
npm --prefix apps/save-app run typecheck
npm --prefix apps/save-app run lint
npm run test:run
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api/v1 \
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=verification-web.apps.googleusercontent.com \
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=verification-ios.apps.googleusercontent.com \
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=verification-android.apps.googleusercontent.com \
EXPO_PUBLIC_API_MODE=api \
npm --prefix apps/save-app exec expo export -- --platform android --output-dir /tmp/save-expo-catalog-export
```

Expected: all Expo and web tests pass, typecheck/lint exit 0, and Android export completes. Run backend tests only if implementation reveals and changes a backend contract.

- [ ] **Step 8: Commit**

```bash
git add apps/save-app/src apps/save-app/README.md docs/mobile-ui-parity.md
git commit -m "feat: add Expo item detail parity"
```
