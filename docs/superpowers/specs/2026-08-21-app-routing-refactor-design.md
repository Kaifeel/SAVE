# App Routing and Responsibility Refactor Design

## Goal

Refactor the 1,002-line `src/App.jsx` into focused routing, authentication,
layout, notification, and item-flow units while preserving the existing UI,
API contracts, authentication security model, and user-visible behavior.
Replace tab-only screen state with URL-backed navigation so browser refresh,
back/forward navigation, direct links, and bookmarks preserve the current
screen.

## Constraints

- Do not change backend APIs, database tables, migrations, or the ERD.
- Do not store access or refresh tokens in `localStorage` or `sessionStorage`.
- Keep the access token in the Zustand memory store and restore sessions with
  the existing HttpOnly refresh cookie.
- Keep the existing visual design, Korean copy, mock/API runtime modes, and
  realtime notification/chat behavior.
- Do not introduce React Router data loaders or actions. Declarative routing is
  sufficient for the current application.
- Preserve all existing tests and add route- and refresh-specific regression
  tests before changing production behavior.
- Keep transient interactions such as write, rental request, report, and
  notification popovers as local UI state rather than routes.

## Selected Approach

Install `react-router` and use `BrowserRouter`, declarative `Routes`, nested
layout routes, `NavLink`, `useNavigate`, and `useParams`.

This is preferred over the alternatives:

1. Keeping `activeTab` state would retain the existing refresh, deep-link, and
   browser-history limitations.
2. Building a custom router with `history.pushState` and `popstate` would
   recreate route matching, parameter parsing, and navigation synchronization
   without a project-specific benefit.

`BrowserRouter` requires production hosting to serve `index.html` for unknown
frontend paths. The deployment configuration must add an SPA fallback for
paths such as `/rentals` and `/items/12`. Hash routing is not selected because
the Google login exchange already uses the URL hash for
`google_login_code`.

## Route Map

| Route | Screen | Access |
|---|---|---|
| `/login` | Existing `LoginPage` | Public |
| `/profile/setup` | Existing `ProfileSetupPage` | Authenticated |
| `/` | Existing `HomePage` | Authenticated, completed profile |
| `/search` | Existing `SearchPage` | Authenticated, completed profile |
| `/items/:itemId` | Existing `ProductDetailPage` | Authenticated, completed profile |
| `/chats` | Existing `ChatPage` list state | Authenticated, completed profile |
| `/chats/:roomId` | Existing `ChatPage` active room | Authenticated, completed profile |
| `/users/:userId` | Existing `UserProfilePage` | Authenticated, completed profile |
| `/my` | Existing `MyPage` | Authenticated, completed profile |
| `/rentals` | Existing `RentalsPage` | Authenticated, completed profile |
| `/admin/*` | Existing admin screen or denial screen | Authenticated |
| `*` | Redirect to `/` after authentication | Depends on auth boundary |

Search board and availability filters remain owned by `SearchPage` during this
refactor. They do not become query parameters. Modal visibility also remains
local state. This keeps the first routing change focused on screen identity.

## Authentication Bootstrap

Create `src/hooks/useAuthBootstrap.js` and move the following behavior out of
`App.jsx` without changing its security model:

- Read `authStatus`, `accessToken`, and `user` from `useAuthStore`.
- Consume `google_login_code` from the URL hash once and remove it with
  `history.replaceState`.
- Call `exchangeGoogleLogin(code)` for a Google callback or
  `refreshSession()` for a normal browser startup.
- Keep the app in `checking` state until that request resolves.
- Apply the returned session and normalized profile state on success.
- Clear the session only after a confirmed refresh failure.
- Expose login, signup, profile completion, and logout operations to route
  boundaries and screens.

The route boundary must never redirect while `authStatus === "checking"`.
This prevents a successful browser refresh from flashing or committing a
navigation to `/login` before the refresh-cookie request finishes.

Authentication outcomes are:

```text
checking + refresh 200 -> authenticated -> requested protected URL
checking + refresh 401/403 -> unauthenticated -> /login
authenticated + incomplete profile -> /profile/setup
authenticated + complete profile -> requested application route
logout -> clear memory session -> /login
```

The currently observed refresh flow is working, so this refactor does not
change cookie attributes, token rotation, backend origin validation, or token
persistence.

## Component and State Boundaries

### `src/App.jsx`

Responsibilities after refactoring:

- Invoke `useAuthBootstrap`.
- Render the global checking state.
- Render `AppRouter` with the authenticated session contract.

Target size: approximately 80-150 lines.

### `src/app/AppRouter.jsx`

Responsibilities:

- Declare the route tree.
- Apply public, authenticated, profile-completion, and admin boundaries.
- Redirect unknown paths predictably.
- Pass route parameters to route adapters.

It must not fetch domain data or own modal state.

### `src/app/ProtectedRoute.jsx`

Responsibilities:

- Render an outlet only after authentication bootstrap completes.
- Redirect unauthenticated users to `/login` while preserving the requested
  location for post-login navigation.
- Redirect incomplete profiles to `/profile/setup`.

### `src/layouts/MarketplaceLayout.jsx`

Responsibilities:

- Render the existing mobile frame, header, main outlet, and bottom navigation.
- Compose existing item, chat, rental, profile, and recommendation hooks.
- Own cross-screen selections that still drive transient modals.
- Provide the minimum shared data/actions to route adapters through outlet
  context.

Target size: no more than approximately 350 lines. Domain-specific state and
handlers that exceed this boundary must move to focused hooks rather than being
copied from `App.jsx` wholesale.

### `src/hooks/useNotifications.js`

Responsibilities:

- Load persisted notifications.
- Normalize, deduplicate, order, and merge realtime notifications.
- Reconcile state after WebSocket reconnection.
- Mark one or all notifications as read.
- Expose loading/error/action state to the UI.

This hook preserves the notification race-condition fixes already committed on
`fix/notification-reliability`.

### `src/components/NotificationBell.jsx`

Responsibilities:

- Render the existing bell, unread dot, dropdown, individual-read action, and
  mark-all-read action.
- Receive notification data and actions from `useNotifications`.
- Contain no API calls.

### `src/hooks/useItemEditor.js`

Responsibilities:

- Own item create/edit form fields, photo selection/removal, validation,
  submit state, and reset behavior.
- Adapt form state to the existing item API payload.
- Leave presentation inside the existing `ItemRegistrationModal`.

### Route adapters

Small route adapters resolve URL parameters and supply the existing page
components with their current props:

- `ItemDetailRoute` resolves `itemId` after item data loads.
- `ChatRoomRoute` resolves `roomId` from the loaded accessible room list and
  invokes the existing room-selection behavior.
- `UserProfileRoute` supplies `userId` to `UserProfilePage`.

Adapters display the existing loading/error style while data is pending and a
not-found state when the requested accessible resource does not exist. They do
not silently redirect a missing resource to a different item or room.

## Navigation Changes

- Replace `setActiveTab("home")` with navigation to `/`.
- Replace `setActiveTab("search")` with navigation to `/search`.
- Replace chat-tab selection with navigation to `/chats`.
- Opening a chat room navigates to `/chats/:roomId`.
- Replace `setActiveTab("my")` with navigation to `/my`.
- Replace rental navigation with `/rentals`.
- Opening an item navigates to `/items/:itemId` instead of storing
  `selectedItem` as the screen identity.
- Opening a public profile navigates to `/users/:userId`.
- Back buttons use router navigation and browser history instead of assigning a
  replacement tab state.
- Bottom navigation uses `NavLink` so active styling derives from the URL.

The Google exchange hash is read before normal route rendering and then removed
without changing the pathname.

## Data and Realtime Behavior

The refactor does not move server state into the router. Existing hooks remain
the source of items, chat rooms, rentals, recommendations, and profile data.

On WebSocket reconnection:

- `useChatRooms` continues to reload the active room and preserve messages that
  arrived during snapshot requests.
- `useNotifications` reloads and reconciles persisted notifications.
- The layout refreshes the chat-room snapshot.

Route changes must not create new WebSocket clients. One authenticated
`MarketplaceLayout` instance owns the realtime hooks while navigating among its
child routes.

## Error Handling

- Authentication checking renders the existing checking message and no route
  redirect.
- Confirmed unauthenticated state redirects to `/login`.
- Direct item/chat/profile routes render loading while their required data is
  loading.
- Missing or inaccessible resources render an explicit not-found/error state.
- Notification and chat synchronization failures preserve current data and use
  the existing toast/error channels.
- Unknown authenticated routes redirect to `/`.
- Production deployment must serve `index.html` for frontend route requests;
  API and asset paths must remain excluded from that fallback.

## Testing Strategy

All behavior changes follow test-driven development.

### Routing tests

- Direct render at `/rentals` shows `RentalsPage` after successful refresh.
- Direct render at `/items/:itemId` resolves and shows the requested item.
- Direct render at `/chats/:roomId` selects the requested accessible room.
- Bottom navigation updates both the screen and URL.
- Browser back returns to the previous screen.
- Unknown authenticated routes redirect to `/`.

### Authentication-route tests

- `checking` does not render or redirect to login.
- Refresh success preserves the originally requested protected URL.
- Refresh 401 redirects to `/login` only after the request resolves.
- Incomplete profiles redirect to `/profile/setup`.
- Completed profile submission returns to the originally requested route or
  `/` when no route was recorded.
- Logout clears the session and navigates to `/login`.
- Google exchange continues to work with the existing hash ticket.

### Extracted-unit tests

- `useNotifications` retains realtime entries when an older request resolves,
  accepts authoritative read state from a later server snapshot, and reloads
  after reconnection.
- `NotificationBell` invokes individual and all-read actions and preserves the
  current accessible labels.
- `useItemEditor` preserves create/edit payloads, validation, photo removal,
  reset, and failure behavior.
- `useChatRooms` retains the existing race, ordering, reconnection, and stale
  socket tests.

### Verification

- Run the complete Vitest suite.
- Run ESLint.
- Run the Vite production build.
- Run the backend test suite because authentication contracts remain part of
  the end-to-end startup flow, even though backend production code is not
  changed.
- Verify direct navigation to every declared route using the production SPA
  fallback configuration.

## Delivery Sequence

1. Add routing dependency and route-boundary regression tests.
2. Introduce the router while preserving the current `App` internals.
3. Extract authentication bootstrap and route guards.
4. Convert tab, item, profile, chat-room, rental, and admin navigation to URLs.
5. Extract notifications and `NotificationBell`.
6. Extract item editor state and actions.
7. Reduce `App.jsx` and move the shared frame to `MarketplaceLayout`.
8. Add deployment SPA fallback documentation/configuration.
9. Run full verification and compare existing UI behavior.

Each step must remain independently testable. Routing and responsibility
extraction must be committed separately so functional regressions can be
isolated from mechanical file moves.

## Out of Scope

- Backend authentication behavior or cookie attribute changes.
- Database or ERD changes.
- Notification outbox implementation.
- External WebSocket broker adoption.
- Query-parameter persistence for search filters.
- Visual redesign.
- React Router loaders/actions or server-side rendering.
