# Expo Public Profile Design

Date: 2026-08-24
Status: Approved in project sequence; awaiting written-spec review

## Context

The backend exposes public profile, public items, and public reviews, but Expo
has no `/users/[id]` route and the item-detail owner card is not actionable.
This is the second approved remaining-parity subproject after My Page and before
full rental management.

## Goal

Allow a signed-in user to open an item's owner profile and view only validated
server identity, rating, trade, review, and item data, then navigate to any of
that user's item details.

## Scope

- Add `/users/[id]` under the authenticated stack.
- Make the item-detail owner card open that route with `ownerId`.
- Load `GET /users/{id}/profile`, `/users/{id}/items`, and
  `/users/{id}/reviews` concurrently.
- Runtime-validate the route ID, profile, every item, and every review.
- Render name, optional department/university/profile image, rating, review
  count, completed trade count, public reviews, and registered items.
- Support loading, failure, empty, retry, pull-to-refresh, and stale-response
  suppression.
- Open real `/items/[id]` routes from registered items.

Reporting, profile editing, chat creation, and fallback profile reconstruction
from an item are outside this subproject. The screen must not hide a failed
profile request behind cached owner text from item detail.

## Architecture

### Public profile domain

Add `profile/public-schema.ts` with `PublicUserProfile` and `PublicReview`
types. Strict parsing accepts positive integer IDs and counts, finite rating,
ratings from 1 through 5, nonblank names/titles/timestamps, nullable optional
strings, and `reviewee_role` equal to `LENDER` or `BORROWER`.

`profile/public-api.ts` exposes:

- `getPublicProfile(userId)` → `/users/{id}/profile`;
- `getPublicItems(userId)` → `/users/{id}/items` and existing item parsing;
- `getPublicReviews(userId)` → `/users/{id}/reviews`.

Every function rejects a non-positive/non-integer ID before requesting.

### Remote state

`use-public-profile.ts` owns profile, items, and reviews as independent
resources using the same partial-failure and generation rules as My Page. The
profile resource is required to render the identity section, while item or
review errors remain localized. A route-ID change invalidates every prior
request and clears data belonging to the old user.

### Route and components

The route parses the Expo Router `id` parameter exactly once. Invalid or
repeated IDs show an explicit route error and make no API call. Focused
components render:

- profile identity and server metrics;
- review list with star rating, content, reviewer, item title, role, and
  relative time;
- registered item section using shared `ItemCard`;
- section-level error, empty, and retry states.

The authenticated stack declares `users/[id]`. Item detail wraps the entire
owner card in one accessible button named `{ownerName} 프로필 보기` and pushes
the server owner ID.

## Error Handling

- Invalid route IDs never reach the API.
- Profile failure displays a full identity error with retry.
- Item and review failures do not erase a loaded profile or each other.
- Refresh retains current data while all resources reload.
- Malformed successful responses render no partial or fallback record.
- Empty reviews and items have distinct neutral Korean messages.
- Selecting an item uses its validated server ID.

## Testing Order

Per user direction, production implementation precedes the combined automated
test phase. After rental management is also implemented, add schema, exact-path,
route-ID, partial-error, stale-request, refresh, empty-state, owner-navigation,
and item-navigation tests. Then run the full Expo, TypeScript, lint, Android
export, web, and backend gates.

Physical Android/iPhone navigation and remote-image checks remain `Not run`
until devices are available.

## Completion Criteria

- `/users/[id]` exists and item owners open it.
- All three public response shapes are runtime-validated.
- Profile, review, and item states remain independently recoverable.
- No item-derived fallback identity or fabricated metrics are rendered.
- Registered items open authoritative detail routes.
- Production files remain below 300 lines.
- Combined verification remains pending until rental management is complete.
