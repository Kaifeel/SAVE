# Expo My Page Design

Date: 2026-08-23
Status: Approved in chat; awaiting written-spec review

## Context

The Expo `my` tab is a shell that renders only `마이`. The shared backend
already exposes authenticated profile, owned-item, and wishlist endpoints, and
the auth store already owns logout. This is the first of three approved mobile
parity subprojects: My Page, public profile, then full rental management.

## Goal

Replace the shell with a server-backed My Page that presents the signed-in
member, owned items, wishlist items, rental navigation, and logout without
inventing fallback records.

## Scope

- Load `GET /users/me`, `GET /users/me/items`, and `GET /users/me/wishlist`.
- Runtime-validate the profile and every catalog item response.
- Show name, department, university, profile image when supplied, owned items,
  and wishlist items.
- Open real item detail routes from both item sections.
- Navigate to the rental list route that the rental-management subproject will
  provide.
- Execute the existing auth-store logout and allow the established protected
  routing shell to return to login.
- Provide initial loading, independent partial errors, empty states, retry, and
  pull-to-refresh.
- Keep API/state/presentation responsibilities in separate focused modules.

Profile editing, notification preferences, local fixture records, and public
profile rendering are outside this subproject. Public profile is the next
approved subproject. A disabled notification-settings row will not be copied
from the web reference because it suggests functionality that does not exist.

## Architecture

### API and schema

Create a focused `profile` domain. `profile/schema.ts` validates the backend
`UserResponse` and normalizes snake-case fields to the existing `AuthUser`
shape. `profile/api.ts` exposes:

- `getMyProfile(): Promise<AuthUser>`;
- `getMyItems(): Promise<CatalogItem[]>`;
- `getMyWishlist(): Promise<CatalogItem[]>`.

Item arrays reuse `parseCatalogItem` for every entry. A malformed successful
response is an explicit protocol error, never a partial list.

### State ownership

`use-my-page.ts` owns three independently observable resources: profile, owned
items, and wishlist. Initial load requests them concurrently. One failed
resource does not erase successful resources. Retry can reload an individual
section, while pull-to-refresh reloads all three and retains current content
until authoritative replacements arrive. Stale completions after refresh or
unmount are ignored.

The authenticated store user may be displayed only while the authoritative
profile request is loading; it is session identity, not fabricated data. A
failed profile request remains visibly failed rather than silently presenting
the cached identity as a successful server result.

### Presentation

The route is a composition boundary. Focused components render the member
header, catalog sections, and account actions using the existing theme and
safe-area/tab spacing. Each section distinguishes loading, failure, empty, and
content. Catalog cards reuse the established item visual/card semantics where
possible and navigate to `/items/[id]` with the exact server ID.

The rental row navigates to `/rentals`. The logout action is disabled while its
promise is pending and displays an error without discarding the loaded page if
server revocation or local cleanup fails.

## Error Handling

- Network and server messages remain visible per failed resource.
- Retry affects only the requested failed section.
- Pull-to-refresh cannot replace successful content with fixtures or empty
  placeholders while a request is pending.
- Empty owned and wishlist arrays display neutral Korean empty messages.
- Invalid profile/item payloads become protocol errors.
- Repeated logout taps issue one logout operation.

## Testing Order

Per the user's request, implementation of My Page, public profile, and rental
management will be completed before running the combined automated test phase.
Tests will then cover schema rejection, exact API paths, partial failure,
refresh races, item/rental navigation, logout single-flight behavior, and
screen empty/error states. The final batch also runs TypeScript, Expo lint,
Android export, web regression tests, and backend tests.

Physical Android and iPhone checks remain `Not run` until devices and a real
signed-in account are available.

## Completion Criteria

- The `my` tab no longer contains shell or fixture content.
- All three endpoint results are runtime-validated.
- Partial failures and empty states are distinguishable.
- Owned and wishlist items open authoritative detail routes.
- Rental navigation targets `/rentals` and logout uses the existing secure
  session cleanup.
- No disabled fake settings action remains.
- The later combined verification phase passes before delivery ZIP creation.
