# Expo My Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Expo `my` shell with a server-backed profile, owned-item, wishlist, rental-navigation, and secure-logout experience.

**Architecture:** A focused `profile` domain validates transport data and owns the three remote resources. The route composes small presentation components and delegates item/rental navigation to Expo Router and logout to the existing auth store.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, TypeScript 6, Zustand, shared `apiRequest`, Jest Expo, React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-23-expo-my-page-design.md`

## Global Constraints

- Use only `GET /users/me`, `GET /users/me/items`, and `GET /users/me/wishlist` data.
- Runtime-validate profile and every catalog item before rendering.
- Do not add fallback users, products, locations, prices, counters, sessions, or disabled fake settings.
- Preserve successful sections when another resource fails or refreshes.
- Ignore stale request completions after refresh, identity change, or unmount.
- Item cards open `/items/[id]`; rental navigation opens `/rentals`.
- Logout uses `useAuthStore(state => state.logout)` and rejects repeated taps.
- Keep every new production file below 300 lines by responsibility.
- Per user direction, implement My Page, public profile, and rental management before running their combined automated test phase. This plan records the exact later tests but does not execute them during production implementation.

---

### Task 1: Profile schema and API boundary

**Files:**
- Create: `apps/save-app/src/profile/schema.ts`
- Create: `apps/save-app/src/profile/api.ts`

**Interfaces:**
- Consumes: `apiRequest<unknown>` and `parseCatalogItem`.
- Produces: `parseMyProfile(value): AuthUser`, `parseCatalogItemList(value, label): CatalogItem[]`, `getMyProfile()`, `getMyItems()`, and `getMyWishlist()`.

- [ ] **Step 1: Implement strict profile parsing**

Create `profile/schema.ts` with a local record guard and these exact required
fields: positive integer `id`, nonblank `email`, nonblank `name`, nullable
string `department`, nullable positive integer `university_id`, nullable string
`university_name`, nullable string `profile_image_url`, and `role` equal to
`USER` or `ADMIN`.

```ts
export function parseMyProfile(value: unknown): AuthUser {
  const user = record(value, 'profile');
  return {
    id: positiveInteger(user.id, 'id'),
    email: nonBlankString(user.email, 'email'),
    name: nonBlankString(user.name, 'name'),
    department: nullableString(user.department, 'department'),
    universityId: nullablePositiveInteger(user.university_id, 'university_id'),
    universityName: nullableString(user.university_name, 'university_name'),
    profileImageUrl: nullableString(user.profile_image_url, 'profile_image_url'),
    role: role(user.role),
  };
}

export function parseCatalogItemList(value: unknown, label: string): CatalogItem[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label} response`);
  return value.map(parseCatalogItem);
}
```

- [ ] **Step 2: Implement the three authenticated API calls**

```ts
export async function getMyProfile(): Promise<AuthUser> {
  return parseMyProfile(await apiRequest<unknown>('/users/me'));
}

export async function getMyItems(): Promise<CatalogItem[]> {
  return parseCatalogItemList(await apiRequest<unknown>('/users/me/items'), 'my items');
}

export async function getMyWishlist(): Promise<CatalogItem[]> {
  return parseCatalogItemList(await apiRequest<unknown>('/users/me/wishlist'), 'wishlist');
}
```

- [ ] **Step 3: Review the boundary without executing tests**

Check that no API result is cast directly to `AuthUser`/`CatalogItem[]`, all
paths start with `/users/me`, and no fallback array or member is returned from
an error branch.

- [ ] **Step 4: Commit the boundary**

```bash
git add apps/save-app/src/profile/schema.ts apps/save-app/src/profile/api.ts
git commit -m "feat: add Expo my page API"
```

---

### Task 2: Independent My Page resource state

**Files:**
- Create: `apps/save-app/src/profile/use-my-page.ts`

**Interfaces:**
- Consumes: `getMyProfile`, `getMyItems`, and `getMyWishlist`.
- Produces: `useMyPage()` with `profile`, `items`, `wishlist`, per-resource status/error, `refreshing`, `reload(resource)`, and `refresh()`.

- [ ] **Step 1: Define explicit resource state**

```ts
export type ResourceKey = 'profile' | 'items' | 'wishlist';
export type ResourceState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

export type MyPageState = {
  profile: ResourceState<AuthUser | null>;
  items: ResourceState<CatalogItem[]>;
  wishlist: ResourceState<CatalogItem[]>;
  refreshing: boolean;
  reload: (resource: ResourceKey) => Promise<void>;
  refresh: () => Promise<void>;
};
```

Initial collection data is `[]`; initial profile data is `null`. These are
absence states, not fabricated records.

- [ ] **Step 2: Implement request generation and stale-result protection**

Keep a generation counter per resource. `load(resource, preserveData)` marks
only that resource loading, clears only its error, awaits the matching API, and
commits only if mounted and its generation still matches. Error branches keep
existing data and store an Error message or the Korean resource fallback.

```ts
const loaders = {
  profile: getMyProfile,
  items: getMyItems,
  wishlist: getMyWishlist,
} as const;
```

Initial mount schedules all three loads concurrently. `reload` calls one
loader. `refresh` increments a refresh generation, awaits all three with
`Promise.allSettled`, and clears `refreshing` only for the current generation.

- [ ] **Step 3: Review state invariants without executing tests**

Verify one failed request cannot clear the other two resources, refresh retains
old data while pending, and cleanup invalidates all request generations.

- [ ] **Step 4: Commit the state boundary**

```bash
git add apps/save-app/src/profile/use-my-page.ts
git commit -m "feat: add Expo my page state"
```

---

### Task 3: My Page presentation components

**Files:**
- Create: `apps/save-app/src/profile/components/member-header.tsx`
- Create: `apps/save-app/src/profile/components/profile-item-section.tsx`
- Create: `apps/save-app/src/profile/components/account-actions.tsx`

**Interfaces:**
- Consumes: `AuthUser`, `ResourceState<CatalogItem[]>`, shared `ItemCard`, and action callbacks.
- Produces: focused accessible profile sections with no navigation or API imports.

- [ ] **Step 1: Implement the member header**

Render the real profile image through `expo-image` when
`profileImageUrl !== null`; otherwise render a neutral person glyph without a
name, school, or image fixture. Display name, optional department, and optional
university. While authoritative profile is loading, the route may pass the auth
store user with `loading=true`; an error message remains visible if the server
profile fails.

- [ ] **Step 2: Implement reusable owned/wishlist sections**

```ts
type ProfileItemSectionProps = {
  title: string;
  emptyMessage: string;
  resource: ResourceState<CatalogItem[]>;
  onRetry: () => void;
  onItemPress: (item: CatalogItem) => void;
};
```

Render a loading status only when no retained data exists, an alert plus retry
for errors, the exact empty message for a successful empty array, and shared
row `ItemCard`s for content. Do not limit server arrays to two records.

- [ ] **Step 3: Implement account actions**

Provide `대여 내역` and `로그아웃` buttons only. The logout button label becomes
`로그아웃 중...` and is disabled while pending. Render logout errors as an
accessible alert. Do not add the disabled web notification-settings row.

- [ ] **Step 4: Review component size and accessibility**

Confirm each file is under 300 lines, every action has a role/name, loading
copy has a live region, and errors have `accessibilityRole="alert"`.

- [ ] **Step 5: Commit the presentation boundaries**

```bash
git add apps/save-app/src/profile/components
git commit -m "feat: add Expo my page sections"
```

---

### Task 4: Replace the My tab shell

**Files:**
- Modify: `apps/save-app/src/app/(authenticated)/(tabs)/my.tsx`

**Interfaces:**
- Consumes: `useMyPage`, auth-store `user`/`logout`, Expo Router, and Task 3 components.
- Produces: complete My tab navigation and secure logout orchestration.

- [ ] **Step 1: Compose the server-backed route**

Use `SafeAreaView` and a refreshable `ScrollView`. Select `user` and `logout`
from `useAuthStore`, obtain resources from `useMyPage`, and open items with:

```ts
router.push({ pathname: '/items/[id]', params: { id: String(item.id) } });
```

Open rentals with `router.push('/rentals')`. Pass
`profile.data ?? sessionUser` to the header but keep `profile.error` visible.

- [ ] **Step 2: Add logout single-flight handling**

Use a synchronous ref plus visible pending state. On error, preserve the page
and show the actual Error message or `로그아웃에 실패했습니다.`. Do not navigate
manually after success; the existing authenticated layout responds to cleared
auth state.

- [ ] **Step 3: Add pull-to-refresh**

Attach `RefreshControl` with `refreshing={page.refreshing}` and
`onRefresh={() => { void page.refresh(); }}`. Keep current sections visible
during the refresh.

- [ ] **Step 4: Review the completed route without running tests**

Confirm the shell text-only implementation is gone, no hardcoded user/item
records appear, and the file stays below 300 lines.

- [ ] **Step 5: Commit the completed My Page**

```bash
git add apps/save-app/src/app/'(authenticated)'/'(tabs)'/my.tsx
git commit -m "feat: implement Expo my page"
```

---

### Task 5: Record deferred verification cases

**Files:**
- Modify: `docs/mobile-ui-parity.md`
- Later create during the combined test phase: `apps/save-app/src/profile/schema.test.ts`
- Later create during the combined test phase: `apps/save-app/src/profile/api.test.ts`
- Later create during the combined test phase: `apps/save-app/src/profile/use-my-page.test.tsx`
- Later create during the combined test phase: `apps/save-app/src/__tests__/my-screen.test.tsx`

**Interfaces:**
- Consumes: completed My Page implementation.
- Produces: an honest `implemented, verification deferred` milestone until the final combined test phase runs.

- [ ] **Step 1: Update the parity row without claiming test success**

Record the real endpoints, runtime validation, partial-state behavior, item and
rental navigation, and logout. Keep physical-device status `Not run`. State
that automated verification is deferred until public-profile and rental code is
complete.

- [ ] **Step 2: Record exact later test behaviors**

The combined test phase must add cases for malformed profile fields, malformed
item arrays, exact three API paths, partial failure, stale refresh suppression,
empty sections, item/rental routes, repeated logout taps, and logout failure.
Expectations must use literal backend-shaped fixtures rather than production
builders.

- [ ] **Step 3: Commit truthful documentation**

```bash
git add docs/mobile-ui-parity.md
git commit -m "docs: record Expo my page implementation"
```

After this plan, create and approve the public-profile design/plan, then the
rental-management design/plan. Run the combined tests only after all three
production implementations are committed, as explicitly requested.
