# Public Profile and Offline Rental Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selectively merge public profiles into SAVE and replace the online-style approval/payment rental flow with a safe offline request/start/complete flow.

**Architecture:** Preserve the current item request lock, notifications, chat, reports, and admin code. Add profile-specific API/UI units, serialize rental transitions with a repository write lock, and refresh all item views after rental mutations so the frontend reflects server state.

**Tech Stack:** Java 17, Spring Boot, Spring Data JPA, Spring Security JWT, H2/PostgreSQL, React 19, Vite, Vitest, Testing Library.

## Global Constraints

- Do not copy whole files from `SAVE_4-profile`; port profile-specific changes only.
- Keep persisted/realtime notifications, authenticated chat, reporting, admin, Google login, production storage/security, and unrelated copy intact.
- Do not add a direct `RENTED`/`AVAILABLE` item toggle.
- Keep `APPROVED` and `PAID` enum values readable for historical rows, but remove their active HTTP/UI flow.
- Preserve unrelated user-owned workspace changes.
- Implement every behavior test-first and observe the intended failing result before production edits.

---

### Task 1: Public profile backend

**Files:**
- Create: `backend/src/main/java/com/save/user/PublicUserController.java`
- Create: `backend/src/main/java/com/save/user/PublicUserProfileResponse.java`
- Create: `backend/src/test/java/com/save/user/PublicUserProfileIntegrationTest.java`
- Modify: `backend/src/main/java/com/save/user/UserService.java`
- Modify: `backend/src/main/java/com/save/rental/RentalRepository.java`

**Interfaces:**
- Produces: `GET /api/v1/users/{userId}/profile`
- Produces: `GET /api/v1/users/{userId}/items`
- Produces: `PublicUserProfileResponse.from(User,long)`
- Produces: `RentalRepository.countByLenderIdAndStatus(Integer,RentalStatus): long`

- [ ] **Step 1: Add failing public-profile integration tests**

Create the profile integration test using the existing signup and item helpers. Assert the allow-list and absence of private fields:

```java
mockMvc.perform(get("/api/v1/users/{userId}/profile", ownerId)
        .header("Authorization", bearer(viewerToken)))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.name").value("프로필주인"))
    .andExpect(jsonPath("$.rating").value(0.0))
    .andExpect(jsonPath("$.review_count").value(0))
    .andExpect(jsonPath("$.completed_trade_count").value(0))
    .andExpect(jsonPath("$.email").doesNotExist())
    .andExpect(jsonPath("$.oauth_id").doesNotExist())
    .andExpect(jsonPath("$.role").doesNotExist());
```

Also assert visible items and unknown-user `404`.

- [ ] **Step 2: Run the profile test and verify RED**

Run:

```bash
cd backend && ./gradlew test --tests com.save.user.PublicUserProfileIntegrationTest
```

Expected: compilation or endpoint failure because the controller and DTO do not exist.

- [ ] **Step 3: Implement the minimal backend profile API**

Add the response record and service methods:

```java
public record PublicUserProfileResponse(
        Integer id, String name, String department,
        Integer universityId, String universityName,
        String profileImageUrl, double rating, long reviewCount,
        long completedTradeCount) {
    public static PublicUserProfileResponse from(User user, long completedTradeCount) {
        return new PublicUserProfileResponse(
                user.getId(), user.getName(), user.getDepartment(),
                user.getUniversity() == null ? null : user.getUniversity().getId(),
                user.getUniversity() == null ? null : user.getUniversity().getName(),
                user.getProfileImageUrl(), 0.0, 0, completedTradeCount);
    }
}
```

Expose the two authenticated endpoints and compute viewer-specific wishlist state without returning private account fields.

- [ ] **Step 4: Run the profile test and full backend regression subset**

Run:

```bash
cd backend && ./gradlew test --tests com.save.user.PublicUserProfileIntegrationTest --tests com.save.MarketplaceIntegrationTest
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add backend/src/main/java/com/save/user backend/src/main/java/com/save/rental/RentalRepository.java backend/src/test/java/com/save/user/PublicUserProfileIntegrationTest.java
git commit -m "feat: add public user profiles"
```

---

### Task 2: Offline rental backend and transition locking

**Files:**
- Modify: `backend/src/main/java/com/save/rental/RentalController.java`
- Modify: `backend/src/main/java/com/save/rental/RentalRepository.java`
- Modify: `backend/src/main/java/com/save/rental/RentalService.java`
- Delete: `backend/src/main/java/com/save/rental/PaymentTransitionPolicy.java`
- Delete: `backend/src/test/java/com/save/rental/PaymentTransitionPolicyTest.java`
- Modify: `backend/src/main/java/com/save/notification/InAppNotificationService.java`
- Modify: `backend/src/main/resources/application-dev.yml`
- Modify: `backend/src/main/resources/application-prod.yml`
- Modify: `backend/src/test/java/com/save/MarketplaceIntegrationTest.java`
- Create: `backend/src/test/java/com/save/rental/RentalTransitionLockIntegrationTest.java`

**Interfaces:**
- Produces: `RentalRepository.findByIdForUpdate(Integer): Optional<Rental>`
- Changes: `PATCH /api/v1/rentals/{id}/start` transitions `REQUESTED -> RENTING`
- Changes: `PATCH /api/v1/rentals/{id}/return` is lender-only and transitions `RENTING -> RETURNED`
- Removes: `/approve` and `/paid` controller mappings

- [ ] **Step 1: Rewrite the marketplace flow test for offline rental behavior**

Replace approve/paid/start assertions with direct start, enforce lender-only completion, and prove the item can be requested again:

```java
mockMvc.perform(patch("/api/v1/rentals/{id}/start", rentalId)
        .header("Authorization", bearer(ownerToken)))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.status").value("RENTING"));

mockMvc.perform(patch("/api/v1/rentals/{id}/return", rentalId)
        .header("Authorization", bearer(borrowerToken)))
    .andExpect(status().isForbidden());

mockMvc.perform(patch("/api/v1/rentals/{id}/return", rentalId)
        .header("Authorization", bearer(ownerToken)))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.status").value("RETURNED"));
```

Assert `/approve` and `/paid` return `404`, the item becomes `AVAILABLE`, and a new request succeeds after completion.
After completion, query the owner's public profile and assert
`completed_trade_count` is `1`.

- [ ] **Step 2: Add a failing transition serialization test**

Use two executor tasks with independent transactions to invoke conflicting `start` and `reject` operations on the same `REQUESTED` rental. Assert exactly one succeeds and the final rental/item pair is one of:

```text
RENTING / RENTED
REJECTED / AVAILABLE
```

- [ ] **Step 3: Run backend tests and verify RED**

Run:

```bash
cd backend && ./gradlew test --tests com.save.MarketplaceIntegrationTest --tests com.save.rental.RentalTransitionLockIntegrationTest
```

Expected: FAIL because start still requires `PAID`, borrower return is allowed, old endpoints exist, and the rental lock query is missing.

- [ ] **Step 4: Implement the rental write lock and offline transitions**

Add:

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select r from Rental r where r.id = :rentalId")
Optional<Rental> findByIdForUpdate(@Param("rentalId") Integer rentalId);
```

Load every state-changing rental through this method. Change `startRenting` to require `REQUESTED` plus `REQUEST_PENDING`, then set `RENTING` plus `RENTED`. Require the lender in `returnItem`. Remove controller mappings for approve and paid, and update the start notification copy to describe trade start.

Delete `PaymentTransitionPolicy` and its test, remove it from the
`RentalService` constructor, and remove the now-unused
`features.direct-payment-transition` configuration from both profiles.

- [ ] **Step 5: Run the focused backend tests and verify GREEN**

Run:

```bash
cd backend && ./gradlew test --tests com.save.MarketplaceIntegrationTest --tests com.save.rental.RentalTransitionLockIntegrationTest --tests com.save.notification.InAppNotificationServiceTest
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add backend/src/main/java/com/save/rental backend/src/main/java/com/save/notification/InAppNotificationService.java backend/src/main/resources/application-dev.yml backend/src/main/resources/application-prod.yml backend/src/test/java/com/save/MarketplaceIntegrationTest.java backend/src/test/java/com/save/rental backend/src/test/java/com/save/notification
git commit -m "feat: simplify offline rental lifecycle"
```

---

### Task 3: Public profile frontend

**Files:**
- Create: `src/pages/UserProfilePage.jsx`
- Create: `src/pages/UserProfilePage.test.jsx`
- Create: `src/hooks/useUserProfile.js`
- Create: `src/hooks/useUserProfile.test.jsx`
- Modify: `src/api/users.js`
- Modify: `src/api/normalizers.js`
- Modify: `src/api/normalizers.test.js`
- Modify: `src/ProductDetailPage.jsx`
- Modify: `src/ProductDetailPage.owner.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Produces: `getPublicUserProfile(userId, accessToken)`
- Produces: `getPublicUserItems(userId, accessToken)`
- Produces: `normalizePublicUserProfile(response)`
- Produces: `useUserProfile(options)`
- Produces: `UserProfilePage` and `ProductDetailPage.onOwnerProfile`

- [ ] **Step 1: Add failing API, hook, page, and owner-card tests**

Port the profile-specific tests from `SAVE_4-profile`, excluding its manual status-toggle assertions. The owner test must assert:

```jsx
await user.click(screen.getByRole('button', { name: '나 프로필 보기' }))
expect(onOwnerProfile).toHaveBeenCalledWith(item)
expect(screen.queryByRole('button', { name: /대여 (중|가능)으로 변경/ })).not.toBeInTheDocument()
```

The profile page test must render `0.0`, `0`, completed trades, registered items, back navigation, selection, and report behavior.

- [ ] **Step 2: Run frontend profile tests and verify RED**

Run:

```bash
npm test -- --run src/hooks/useUserProfile.test.jsx src/pages/UserProfilePage.test.jsx src/ProductDetailPage.owner.test.jsx src/api/normalizers.test.js
```

Expected: FAIL because profile API, normalizer, hook, page, and owner callback are absent.

- [ ] **Step 3: Implement profile-specific frontend units**

Add API functions:

```js
export function getPublicUserProfile(userId, accessToken) {
  return apiFetch(`/users/${userId}/profile`, { accessToken })
}

export function getPublicUserItems(userId, accessToken) {
  return apiFetch(`/users/${userId}/items`, { accessToken })
}
```

Port the profile normalizer, hook, and page. Merge only `profileTarget`, `onOwnerProfile`, profile navigation, and report integration into the current `App.jsx`, preserving current notification and chat callbacks.

- [ ] **Step 4: Run profile tests and verify GREEN**

Run:

```bash
npm test -- --run src/hooks/useUserProfile.test.jsx src/pages/UserProfilePage.test.jsx src/ProductDetailPage.owner.test.jsx src/api/normalizers.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/App.jsx src/ProductDetailPage.jsx src/ProductDetailPage.owner.test.jsx src/api src/hooks/useUserProfile* src/pages/UserProfilePage*
git commit -m "feat: add public profile experience"
```

---

### Task 4: Shared copy, unit input, and real My Page status

**Files:**
- Modify: `src/pages/SearchPage.jsx`
- Modify: `src/pages/SearchPage.test.jsx`
- Modify: `src/components/ItemRegistrationModal.jsx`
- Modify: `src/components/ItemRegistrationModal.test.jsx`
- Modify: `src/pages/MyPage.jsx`
- Create: `src/pages/MyPage.test.jsx`

**Interfaces:**
- Changes only visible copy, the unit options, and status-to-label presentation.

- [ ] **Step 1: Add failing presentation tests**

Assert board-specific copy and absence of the invalid unit:

```jsx
expect(screen.getByText('대여 희망 물품만 보기')).toBeInTheDocument()
expect(screen.queryByRole('option', { name: '무료' })).not.toBeInTheDocument()
```

Add table-driven My Page assertions for `available`, `request_pending`, `reserved`, and `rented`, independent of array position.

- [ ] **Step 2: Run presentation tests and verify RED**

Run:

```bash
npm test -- --run src/pages/SearchPage.test.jsx src/components/ItemRegistrationModal.test.jsx src/pages/MyPage.test.jsx
```

Expected: FAIL because copy is static, the free unit exists, and My Page uses indexes.

- [ ] **Step 3: Implement minimal presentation changes**

Use:

```js
const STATUS_META = {
  available: ['대여 가능', 'text-emerald-600 bg-emerald-50'],
  request_pending: ['요청 확인 중', 'text-amber-600 bg-amber-50'],
  reserved: ['대여 예약', 'text-indigo-600 bg-indigo-50'],
  rented: ['대여 중', 'text-rose-500 bg-rose-50'],
}
```

Remove only the `무료` option, retain zero-price rendering, and make the search label depend on `activeBoard`.

- [ ] **Step 4: Run presentation tests and verify GREEN**

Run the same command and expect PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/pages/SearchPage* src/components/ItemRegistrationModal* src/pages/MyPage*
git commit -m "fix: align rental copy and item status display"
```

---

### Task 5: Simplified rental actions and post-transition refresh

**Files:**
- Modify: `src/api/rentals.js`
- Create: `src/api/rentals.test.js`
- Modify: `src/hooks/useRentals.js`
- Create: `src/hooks/useRentals.test.jsx`
- Modify: `src/hooks/useMyPageData.js`
- Create: `src/hooks/useMyPageData.test.jsx`
- Modify: `src/pages/RentalsPage.jsx`
- Create: `src/pages/RentalsPage.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Removes: `approveRental`, `markRentalPaid`
- Keeps: `startRental`, `rejectRental`, `cancelRental`, `returnRental`
- Adds: pending action state in `useRentals`
- Adds: reload callback support for item and My Page synchronization

- [ ] **Step 1: Add failing API and action tests**

Assert that `REQUESTED` renders `거래 시작`, `거절`, or `요청 취소` according to role, `RENTING` renders `거래 완료` only for the lender, and no approval/payment copy exists.

Assert a transition disables its buttons and invokes refresh callbacks after success:

```jsx
await act(async () => {
  await result.current.transition(3, 'startRental')
})
expect(onRentalChanged).toHaveBeenCalledTimes(1)
expect(api.startRental).toHaveBeenCalledWith(3, 'jwt')
```

- [ ] **Step 2: Run rental frontend tests and verify RED**

Run:

```bash
npm test -- --run src/api/rentals.test.js src/hooks/useRentals.test.jsx src/hooks/useMyPageData.test.jsx src/pages/RentalsPage.test.jsx
```

Expected: FAIL because old actions and API functions remain and refresh hooks are absent.

- [ ] **Step 3: Implement offline action mapping and refresh coordination**

Use this action map:

```js
const actions = {
  REQUESTED: {
    lender: [['거래 시작', 'startRental'], ['거절', 'rejectRental']],
    borrower: [['요청 취소', 'cancelRental']],
  },
  RENTING: { lender: [['거래 완료', 'returnRental']] },
}
```

Track the pending rental/action key, disable affected buttons, and call a single `onRentalChanged` callback after successful create or transition. In `App`, coordinate `Promise.allSettled([rentalData.reload(), myPageData.reload(), itemData.reload()])` without changing the already-successful server result into a false failure.

- [ ] **Step 4: Run focused frontend tests and verify GREEN**

Run the same test command and expect PASS.

- [ ] **Step 5: Run frontend interaction regressions**

Run:

```bash
npm test -- --run src/App.notifications.test.jsx src/App.googleRedirect.test.jsx src/hooks/useChatRooms.test.jsx src/pages/AdminPage.test.jsx
```

Expected: PASS, proving profile/rental App changes preserved notification, login, chat, and admin behavior.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/App.jsx src/api/rentals* src/hooks/useRentals* src/hooks/useMyPageData* src/pages/RentalsPage*
git commit -m "feat: connect offline rental actions"
```

---

### Task 6: Documentation and full verification

**Files:**
- Modify: `backend/README.md`
- Modify only if needed: `.env.example`

**Interfaces:**
- Documents the public-profile endpoints and offline rental state machine.

- [ ] **Step 1: Update backend documentation**

Replace the approval/payment sequence with:

```text
REQUESTED -> RENTING -> RETURNED
REQUEST_PENDING -> RENTED -> AVAILABLE
```

Document lender start/complete permissions, borrower cancel, lender reject, and the two public-profile endpoints.

- [ ] **Step 2: Run complete backend verification**

```bash
cd backend && ./gradlew test
```

Expected: exit 0 with zero failed tests.

- [ ] **Step 3: Run complete frontend verification**

```bash
npm test -- --run
npm run build
npm run lint
```

Expected: every command exits 0 without warnings treated as errors.

- [ ] **Step 4: Inspect the final diff and preservation constraints**

```bash
git diff --check
git status --short
git diff --stat e27d40b..HEAD
```

Confirm that notification, chat, report, admin, Google login, production config,
and unrelated user changes were not removed.

- [ ] **Step 5: Commit documentation**

```bash
git add backend/README.md .env.example
git commit -m "docs: explain offline rental flow"
```
