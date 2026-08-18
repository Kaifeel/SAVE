# Expo Source-Parity App Design

## Objective

Build the production Expo application from the current web application in `src/` as the product UI and behavior reference. The Expo app must preserve the same information hierarchy, design language, labels, and workflows while using native navigation and native controls where appropriate.

The work will be developed on branch `feature/expo-src-parity` in the separate worktree `/home/user/projects/SAVE-expo`. The canonical mobile application will live at `apps/save-app`.

## Source of truth and scope

- `src/` is the reference for product UI, behavior, and feature coverage.
- Existing downloaded `mobile` and `apps/save-app` directories are reference material only. They are not canonical and will not be copied wholesale.
- Known bad values in the web UI are defects, not product requirements. They must be corrected before being represented in Expo.
- The web and Expo apps share the existing Spring Boot backend, database, and API server. No second mobile backend will be created.
- The downloaded copies remain untouched until the new Expo app passes the agreed parity checks. Their later removal requires separate approval.

## Repository structure

```text
SAVE-expo/
├── src/                         # web UI and behavior reference
├── apps/
│   └── save-app/                # canonical Expo application
├── backend/                     # existing shared backend
└── docs/
    └── mobile-ui-parity.md      # screen-by-screen acceptance matrix
```

Web React components will not be shared directly with React Native components. DOM, Tailwind, browser routing, and React Native controls have different constraints. The two clients will instead share the same backend field contracts, display rules, state definitions, design tokens, and acceptance criteria.

## Navigation and state ownership

Expo Router will own every transition users perceive as moving to another screen. React local state will own transient UI within a screen.

```text
app/
├── _layout.tsx
├── login.tsx
├── signup.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── explore.tsx
│   ├── compose.tsx
│   ├── chats.tsx
│   └── my.tsx
├── items/[id].tsx
├── users/[id].tsx
├── chats/[id].tsx
└── rentals/[id].tsx
```

- Tab roots do not display a back button.
- Detail, profile, chat-room, and rental-detail screens display an explicit back affordance and support Expo Router history.
- Android system back follows the same route stack.
- Modals, notification popovers, field values, dates, and selected photos use local component state.
- Zustand is limited to authentication state and current-user session metadata.
- Server data uses typed API modules and feature-specific hooks modeled after the existing web hooks.
- TanStack Query is deliberately excluded from the initial implementation. It may be evaluated later only if real cache, pagination, or mutation synchronization needs justify it.

## Screen mapping

| Web reference | Expo target |
| --- | --- |
| `src/pages/LoginPage.jsx` | `app/login.tsx`, `app/signup.tsx` |
| `src/pages/HomePage.jsx` | `app/(tabs)/index.tsx` |
| `src/pages/SearchPage.jsx` | `app/(tabs)/explore.tsx` |
| `src/components/ItemRegistrationModal.jsx` | `app/(tabs)/compose.tsx` |
| `src/pages/ChatPage.jsx` | `app/(tabs)/chats.tsx`, `app/chats/[id].tsx` |
| `src/pages/MyPage.jsx` | `app/(tabs)/my.tsx` |
| `src/ProductDetailPage.jsx` | `app/items/[id].tsx` |
| `src/pages/UserProfilePage.jsx` | `app/users/[id].tsx` |
| `src/pages/RentalsPage.jsx` | rental list and detail routes |

Native navigation, image picking, camera access, date selection, and platform dialogs may use native conventions. These adaptations must not change the meaning, ordering, or availability of product actions.

## Data flow

```text
Spring API
  -> typed API client
  -> response normalization and validation
  -> feature hook
  -> Expo screen
```

Feature hooks own loading, error, empty, reload, and mutation-refresh behavior. Empty or failed API responses must never silently fall back to demo content. Mock fixtures are permitted only when an explicit development-only API mode is selected.

Production configuration validation must stop the build or app bootstrap when:

- the API base URL is absent;
- the WebSocket URL is absent for enabled real-time features;
- mock mode is enabled;
- required platform OAuth client IDs are absent.

## Dynamic display rules

- Display uploaded photos when present.
- Use a neutral package placeholder when no photo exists; do not imply a camera category.
- Render tags only when real tag data exists. Hide the tag area otherwise.
- Calculate the photo counter from the current index and actual photo count; hide it when it adds no information.
- Calculate relative time from `createdAt`.
- Read completed transaction count from `completedTradeCount`.
- Display deposit information only when the backend contract provides it.
- Resolve university and pickup location from API data rather than fixed defaults.
- Render notifications, chat rooms, rentals, and profile values only from API or explicit empty/error states.
- Do not ship fixed values such as `#카메라`, `#미러리스`, `#촬영`, `1 / 3`, `방금 전`, `거래 42회`, or fixed notification records.

The web reference must receive the same corrections for known hardcoded display defects so parity is measured against corrected behavior rather than copied defects.

## Authentication design

Browser authentication retains its HttpOnly refresh cookie flow. Native authentication uses explicit mobile endpoints on the existing backend; this is an extension of the same service, not a second backend.

```text
POST /auth/mobile/signup
POST /auth/mobile/login
POST /auth/mobile/google
POST /auth/mobile/refresh
POST /auth/mobile/logout
```

Native login and refresh responses return an access token and a rotating refresh token in JSON. Expo stores only the refresh token in SecureStore and keeps the access token in memory. Logout revokes the refresh token. Refresh failure clears local credentials and returns the user to login without using a mock session.

Google login uses platform-specific Android and iOS client IDs. The backend validates ID-token audiences against an explicit allow-list containing the configured web, Android, and iOS OAuth client IDs. Tokens, authorization codes, and session credentials must never be logged.

At application bootstrap:

1. Read the refresh token from SecureStore.
2. Call the mobile refresh endpoint once.
3. Atomically replace the rotated refresh token.
4. Restore the user and enter the authenticated route group.
5. On invalid or revoked credentials, clear the store and show login.
6. On temporary network failure, show a retryable bootstrap error rather than treating the user as logged out.

Concurrent unauthorized API responses share one in-flight refresh request. A failed retry is not repeated recursively.

## Delivery sequence

1. Create the Expo Router shell, design tokens, runtime configuration validation, typed API client, and reusable async states.
2. Implement email and Google authentication, SecureStore restoration, rotation, logout, and route protection.
3. Implement home, exploration/search, item detail, and public profile with corrected dynamic display rules.
4. Implement item composition, native photo capture/selection, validation, upload, and list refresh.
5. Implement wishlist, my page, profile editing, rentals, reviews, and reporting.
6. Implement chat, WebSocket reconnection, unread state, in-app notifications, and push integration.
7. Complete the web-to-mobile parity matrix and release verification.

Each phase must leave the app runnable. Later phases cannot hide incomplete behavior behind production-looking mock content.

## Error handling

- Distinguish offline/network errors, authentication expiry, forbidden actions, validation failures, and server failures.
- Show retry controls for safe idempotent reads.
- Keep WebSocket failures local to chat and notification surfaces.
- Validate image count, type, and size before upload.
- Cancel stale screen requests when route parameters change or screens unmount.
- Avoid showing stale records after create, edit, delete, wishlist, rental, or review mutations by explicitly refreshing affected feature hooks.

## Testing and acceptance

Every phase must pass:

- TypeScript checking;
- ESLint;
- unit tests for normalization, display rules, auth rotation, and runtime validation;
- React Native Testing Library tests for loading, error, empty, and populated screen states;
- API contract tests for browser and native authentication behavior;
- Android bundle/export generation;
- an Android development build on a physical device for native OAuth, SecureStore, camera, and system-back behavior;
- screen-by-screen review against the web parity matrix;
- a production guard confirming no mock mode or embedded mock records can be activated accidentally.

The final critical flow is:

```text
Google login
-> home list
-> item detail
-> wishlist
-> create item with photo
-> chat
-> rental request
-> logout
-> relaunch and restore a valid session
```

## Release progression

```text
local development build
-> physical Android internal test
-> OAuth and session-restore verification
-> UI parity review
-> EAS preview build
-> private beta
-> EAS production build
```

No duplicate mobile directory will be declared canonical, deleted, or merged until this new application meets the core acceptance flow and the user separately approves cleanup.
