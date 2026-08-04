# Public Profile and Offline Rental Design

## 1. Goal

Add the public-user-profile experience developed in `SAVE_4-profile` to the
current `SAVE` codebase without replacing newer rental locking, in-app
notifications, chat synchronization, reporting, or administration behavior.
At the same time, simplify the rental experience for an offline-payment service
from the current approval/payment/start sequence to:

```text
borrower requests -> lender starts trade -> lender completes trade
```

The user-facing flow must stay simple while the server continues to own
authorization, state transitions, locking, and data consistency.

## 2. Scope and Preservation Constraints

The implementation will selectively port profile-specific code instead of
copying whole files from `SAVE_4-profile`.

The following current `SAVE` behavior must remain intact:

- item locking during rental requests;
- persisted and realtime in-app notifications;
- authenticated REST and STOMP chat;
- report submission and the administrator screen;
- Google redirect login;
- production security, storage, PostgreSQL, and Flyway configuration;
- unrelated frontend copy and layouts; and
- any user-owned uncommitted workspace changes.

The following are explicitly out of scope:

- a manual item-owner toggle that changes an item directly between `RENTED`
  and `AVAILABLE` without a rental record;
- online payments, payment-provider webhooks, or payment confirmation;
- a chat invitation ticket or chat acceptance workflow;
- ratings and reviews beyond the profile-compatible placeholder values;
- anonymous public-profile access;
- refresh-token or JWT-storage redesign; and
- unrelated refactoring.

## 3. Public Profile Backend

### 3.1 Endpoints

Add authenticated endpoints under `/api/v1/users`:

```http
GET /api/v1/users/{userId}/profile
GET /api/v1/users/{userId}/items
```

`GET /profile` returns only:

- user ID;
- name;
- department;
- university ID and name;
- profile image URL;
- rating `0.0`;
- review count `0`; and
- actual completed-trade count.

The completed-trade count is the number of rentals where the profiled user is
the lender and the rental status is `RETURNED`. Email, OAuth identifiers,
password hash, role, account status, and sanction fields must not be returned.

`GET /items` returns the profiled user's non-deleted items. Wishlist state is
computed for the authenticated viewer, while wishlist counts retain their
existing behavior.

An unknown user returns `404`. Existing security rules continue to require a
valid SAVE JWT for both endpoints.

### 3.2 Components

- `PublicUserController` exposes the two endpoints.
- `PublicUserProfileResponse` is the allow-listed response DTO.
- `UserService` loads the user, completed trade count, visible items, and
  viewer-specific wishlist state.
- `RentalRepository` gains the completed-trade count query.

## 4. Public Profile Frontend

The item-detail author card opens `UserProfilePage`. The page displays the
profile image, name, department, university, rating `0.0`, review count `0`,
completed trades, and the author's registered items.

Selecting an item on the profile closes the profile and opens that item's
detail. A different user can open the existing report modal from the profile;
the current user cannot report their own profile.

`useUserProfile` loads profile and item requests concurrently, ignores stale
responses after unmount, exposes retry state, and retains the existing
`SAVE_4-profile` fallback behavior for mock mode. API response normalization is
isolated in `normalizePublicUserProfile`.

Loading, empty, failure, retry, navigation, item selection, and report behavior
must be covered by frontend tests.

## 5. Offline Rental State Machine

### 5.1 User-facing flow

The supported flow becomes:

```text
AVAILABLE
  -> borrower sends request
REQUEST_PENDING / REQUESTED
  -> lender starts trade
RENTED / RENTING
  -> lender completes trade
AVAILABLE / RETURNED
```

Before trade start, the lender may reject the request and the borrower may
cancel it. Either action restores the item to `AVAILABLE`.

The frontend no longer presents approval, payment-complete, or a second rental
start confirmation. Offline payment and handoff are coordinated in chat. The
lender presses `거래 시작` when the item is actually handed over and presses
`거래 완료` when it is returned.

### 5.2 Server transitions

- Create request: only the borrower; lock the item; require `AVAILABLE`; create
  `REQUESTED`; set the item to `REQUEST_PENDING`.
- Reject request: only the lender; require `REQUESTED` and `REQUEST_PENDING`;
  set `REJECTED` and restore `AVAILABLE`.
- Cancel request: only the borrower; require `REQUESTED` and
  `REQUEST_PENDING`; set `CANCELED` and restore `AVAILABLE`.
- Start trade: only the lender; require `REQUESTED` and `REQUEST_PENDING`; set
  the rental directly to `RENTING` and the item to `RENTED`.
- Complete trade: only the lender; require `RENTING` and `RENTED`; set the
  rental to `RETURNED` and restore the item to `AVAILABLE`.

The `APPROVED` and `PAID` enum values remain readable for database compatibility
but are not produced by the new user flow. The backend removes the
`PATCH /api/v1/rentals/{rentalId}/approve` and
`PATCH /api/v1/rentals/{rentalId}/paid` controller mappings, and the frontend
removes their API functions and action definitions. This prevents an alternate
route around the offline state machine while leaving historical enum values
readable.

### 5.3 Identity binding

A rental request contains `item_id` and `chat_room_id`. The server verifies
that:

- the JWT subject is the chat room borrower;
- the item owner is the chat room lender; and
- the chat room item matches the requested item.

No shared chat or rental ticket is sent between users. Each participant uses
their own SAVE JWT, and the server authorizes them against the persisted chat
room and rental record.

## 6. Transaction and Concurrency Rules

Request creation retains the pessimistic write lock on the item row. Rental
state-changing operations load the rental through a pessimistic write query so
that conflicting operations on the same rental are serialized.

Every transition remains transactional and rechecks both rental and item state
after the lock is acquired. Consequently, concurrent start/reject/cancel or
complete requests cannot both succeed. A losing request returns `409 Conflict`
instead of overwriting the winning state.

State changes and notification creation occur in the same transaction.
Realtime delivery continues after commit so a rolled-back rental transition
cannot produce a successful notification.

## 7. Notifications

Existing notification storage and realtime transport remain in place.

- Request creation notifies the lender with `RENTAL_REQUESTED`.
- Rejection notifies the borrower with `RENTAL_REJECTED`.
- Trade start reuses the existing `RENTAL_APPROVED` compatibility type but
  displays offline-flow copy indicating that the trade has started.

This change does not add new notification enum values or a completion
notification.

## 8. Frontend Rental Synchronization

`RentalsPage` presents only the actions valid for the simplified flow:

- `REQUESTED`, lender: `거래 시작`, `거절`;
- `REQUESTED`, borrower: `요청 취소`;
- `RENTING`, lender: `거래 완료`.

Action buttons are disabled while their request is pending to prevent accidental
double submission. After request creation or any state transition succeeds, the
frontend refreshes:

- rental history;
- the current user's registered items; and
- the shared item list.

`MyPage` displays the actual normalized item status instead of deriving status
from array position:

- `available` -> `대여 가능`;
- `request_pending` -> `요청 확인 중`;
- `reserved` -> `대여 예약` for legacy data;
- `rented` -> `대여 중`.

No direct item-status toggle is added to `ProductDetailPage`.

## 9. Shared Frontend Copy and Input Improvements

Only the confirmed `SAVE_4-profile` shared improvements are applied:

- borrow-board availability label: `대여 희망 물품만 보기`;
- lend-board availability label: `대여 가능 물품만 보기`; and
- remove `무료` from the rental-unit selector because free rental is represented
  by a rental fee of zero, not by a time unit.

Other profile-unrelated copy and layout remain unchanged.

## 10. Error Handling

- Invalid user profiles return `404` without exposing private fields.
- Unauthorized profile, rental, and chat access uses existing JWT security.
- Invalid rental transitions return `409` with the existing business-error
  response format.
- Failed frontend requests keep their existing data, show a toast or local
  error state, and permit retry.
- Refresh failure after a successful transition is reported separately and does
  not falsely report that the server transition failed.

## 11. Testing Strategy

Implementation follows test-driven development.

Backend integration tests cover:

- public profile allow-list fields and completed-trade count;
- public item visibility and viewer wishlist state;
- unknown profile `404`;
- request directly transitioning to `RENTING` through lender trade start;
- borrower and unauthorized-user transition rejection;
- cancel and reject restoring `AVAILABLE`;
- completion restoring `AVAILABLE` and allowing a later request;
- conflicting transition serialization; and
- preservation of request-time item locking.

Frontend tests cover:

- public-profile loading, rendering, retry, selection, and reporting;
- board-specific filter text;
- removal of the invalid `무료` unit;
- actual My Page item-status labels;
- simplified rental actions and pending-button behavior; and
- list refresh callbacks after creation and transitions.

The final verification runs the complete frontend test suite, frontend build and
lint, and complete backend test suite.

## 12. Completion Criteria

The change is complete when:

- profile endpoints and the profile page work without exposing private account
  fields;
- the only normal rental path is request, trade start, and trade completion;
- offline payment requires no application button;
- concurrent conflicting transitions cannot both succeed;
- completed trades restore the item to `AVAILABLE`;
- frontend lists show the server state without a page reload;
- newer SAVE notifications, chat, reporting, and administration behavior remain
  present; and
- all required verification commands pass without modifying unrelated user
  changes.
