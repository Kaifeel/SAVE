# Expo Catalog UI Parity Design

**Date:** 2026-08-18

## Goal

Implement the first usable post-authentication Expo experience—home, explore, and item detail—without redesigning the current web UI or restoring the downloaded mobile app's mock behavior.

## Scope

This milestone includes:

- authenticated home with search entry, AI recommendation, popular items, and recent items;
- explore with lend/borrow selection, query input, availability filtering, and item results;
- item detail with photos, item metadata, owner summary, wishlist action, and native back navigation;
- typed, runtime-validated access to the existing item, wishlist, and recommendation endpoints;
- loading, empty, error, retry, refresh, and expired-session behavior;
- automated behavior and presentation-parity tests plus Android export verification.

This milestone excludes item creation/editing, camera and gallery permissions, rentals, chat, reports, public profiles, notifications, and TanStack Query. Buttons whose destination belongs to an excluded milestone must not pretend to succeed; they remain absent or visibly unavailable until their flow exists.

## Source of Truth

UI and behavior precedence is strict:

1. `src/pages/HomePage.jsx`, `src/pages/SearchPage.jsx`, and `src/ProductDetailPage.jsx` define visible structure, copy, information order, colors, and user intent.
2. The current repository's Spring controllers and response records define network behavior and data fields.
3. `/mnt/c/Users/Admin/Downloads/SAVE-private-beta-test2026-08-11-3-mobile/SAVE/apps/save-app` is only a React Native implementation reference.

Downloaded mobile layouts may supply platform mechanics such as `FlatList`, `Pressable`, safe-area handling, Expo Router calls, and image rendering. They must not override the web reference, introduce new copy, or reintroduce `src/data/mock.ts`, mock tokens, fabricated API fallbacks, or hardcoded catalog records.

Native controls may differ from HTML controls where Android or iOS requires it, but the hierarchy, labels, information order, primary actions, and visual tokens stay aligned with the web reference. There is no discretionary redesign in this milestone.

## Architecture

### Routes

- `src/app/(authenticated)/(tabs)/index.tsx` renders home.
- `src/app/(authenticated)/(tabs)/explore.tsx` renders explore.
- `src/app/(authenticated)/items/[id].tsx` renders item detail.
- Item presses use `router.push({ pathname: '/items/[id]', params: { id } })`.
- The detail header calls `router.back()` and retains native Android system-back behavior through Expo Router.

The existing protected route group and authentication bootstrap remain unchanged except for any minimal shared request integration required by catalog calls.

### Data boundary

Catalog transport lives outside route components:

- `src/api/client.ts` sends authenticated JSON requests, retries once after the existing session store refreshes a 401, and never logs tokens.
- `src/catalog/types.ts` contains the normalized item and page types used by screens.
- `src/catalog/schema.ts` validates backend item and page payloads at runtime before normalization.
- `src/catalog/api.ts` implements list, detail, wishlist, and recommendation-history calls.
- `src/catalog/use-catalog.ts` owns screen loading, error, refresh, and query state without adding TanStack Query.

The list request maps directly to `GET /api/v1/items` parameters: `type`, `query`, `only_available`, `sort`, `page`, `size`, and the authenticated user's `university_id` when present. Home requests `sort=popular` and `sort=latest` independently so one section cannot silently masquerade as the other. Explore sends the selected board, query, and availability flag to the server instead of filtering fabricated local records.

Item detail uses `GET /api/v1/items/{id}`. Wishlist uses `POST` or `DELETE /api/v1/items/{id}/wishlist`, then reconciles the detail state from the successful server result or a refetch. Recommendation presentation uses the real recommendation API only. Existing history can seed the recommendation card; creating a recommendation uses the same inputs and behavior as the web hook. Empty history remains an explicit request state, never a demo recommendation.

### Session behavior

The access token remains memory-only in the current Zustand authentication store. Catalog requests read the current access token immediately before a request. On the first non-auth 401, the client awaits the store's existing single-flight refresh and retries once. A second 401 clears the session through the current store behavior and protected routing returns to login.

Offline and 5xx failures do not log the user out. They produce a sanitized screen error with retry. Malformed 2xx catalog payloads produce a protocol error and never render partial or invented item data.

## Screen Design

### Home

Home preserves the web order:

1. search field;
2. `오늘의 AI 추천 물품` card;
3. `인기 대여 물품` two-column section;
4. `방금 올라왔어요` list;
5. explicit empty/error states where appropriate.

Submitting or focusing the home search opens explore with the query encoded in route parameters. `더보기` opens explore. Item cards open the corresponding detail route. Pull-to-refresh reloads home sections from the server.

The recommendation area never substitutes popular or latest items when recommendation data is absent. It displays the web CTA and server error/retry behavior. Recommendation results show at most two items, matching the web UI.

### Explore

Explore preserves the web board tabs, search field, availability switch, and vertical item rows. Search input is debounced before sending a request; a route-provided home query initializes the field. Board and availability changes reset pagination and reload from page zero.

Results show backend-provided status, fee, rental unit, pickup location, and university. Missing optional values use neutral UI such as `장소 미정`; they never assume `부경대학교` or `캠퍼스 내`. Loading, no results, failed request, and retry are visually distinct.

### Item detail

Detail preserves the web information order and fixed bottom action area while using native safe-area padding. It renders real `imageUrls`. When there are no images it shows a neutral placeholder; it does not show a camera illustration. The photo counter is derived from the actual selected index and image count and is omitted when no image exists.

The screen renders title, pickup location, relative creation time, fee/unit, description, precautions, owner name, university, owner rating, review count, status, and wishlist count only from the API response. The following forbidden fixed values are removed:

- `#카메라`, `#미러리스`, `#촬영`;
- `1 / 3`;
- `거래 42회`;
- fabricated deposit, owner, location, university, review, or photo values.

Because the current item API has no tags field, the tags row is omitted rather than invented. The owner/profile, chat, rental, share, and report flows are outside this milestone; no button may navigate to a nonexistent route or display a false success message. Owner-only edit/delete actions remain out of scope until compose/edit is implemented.

## Components

Reusable presentation units remain small and data-agnostic:

- `ScreenState` renders loading, error/retry, and empty content;
- `ItemVisual` renders a remote image or neutral placeholder;
- `ItemCard` renders the home card variants and explore row from a normalized `CatalogItem`;
- `CatalogHeader` and section-title elements reproduce shared web spacing and typography where useful.

Components receive values and callbacks. They do not import the auth store, perform fetches, or access downloaded mock data.

## Error and Empty-State Rules

- No response or empty response means an empty state, not fixtures.
- Network and server errors remain retryable and preserve the current query/filter state.
- Invalid route IDs show a safe not-found state with a back action and do not issue `NaN` requests.
- A 404 detail response shows `물품을 찾을 수 없습니다.`.
- A failed wishlist mutation restores/refetches authoritative state and shows a non-destructive error.
- Refresh indicators stop in `finally` paths.
- Accessibility labels describe search, back, wishlist, section navigation, and image position.

## Testing

Implementation follows RED–GREEN–REFACTOR.

Automated coverage includes:

- runtime item/page validation and camel-case backend response mapping;
- authenticated headers, query parameters, one-time 401 refresh, and malformed 2xx rejection;
- home section order, server-only data, empty recommendation behavior, refresh, and navigation;
- explore board/query/availability requests, empty/error/retry states, and detail navigation;
- detail route ID validation, actual photo counter, absent-photo placeholder, wishlist behavior, and native back action;
- explicit assertions that forbidden hardcoded tags, counters, trade totals, mock tokens, and imported mock data do not occur in production mobile code.

The milestone gate runs the focused Expo tests, the complete Expo suite, TypeScript, Expo lint, the existing web suite, backend tests if backend code changes, and an Android production export with configured non-secret verification values. Physical-device back navigation and remote image behavior remain a separately recorded manual check.

## Delivery Boundaries

The implementation stays on `feature/expo-src-parity` in `/home/user/projects/SAVE-expo`. It does not modify or copy from the unrelated dirty backend files in `/home/user/projects/SAVE`. The downloaded repository remains read-only reference material.

Completion means a user can authenticate, view real home and explore catalog data, open a real item detail, navigate back, refresh, and distinguish empty/error states without seeing fabricated data. It does not mean the full mobile application is complete.
