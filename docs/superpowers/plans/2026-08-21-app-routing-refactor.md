# App Routing and Responsibility Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `App.jsx`'s tab-only screen selection with URL-backed routing and extract authentication, notifications, item editing, and the marketplace frame without changing APIs, session security, or visual behavior.

**Architecture:** `App` performs authentication bootstrap and delegates route decisions to `AppRouter`. A single authenticated `MarketplaceLayout` owns shared marketplace data, realtime connections, modals, and an outlet; small route adapters translate URL parameters into existing page props. Focused hooks own authentication bootstrap, notifications, and item editing.

**Tech Stack:** React 19, React Router declarative mode, Zustand, Vitest, Testing Library, Vite

**Spec:** `docs/superpowers/specs/2026-08-21-app-routing-refactor-design.md`

## Global Constraints

- Do not change backend APIs, database tables, migrations, or the ERD.
- Do not store access or refresh tokens in `localStorage` or `sessionStorage`.
- Preserve the HttpOnly refresh-cookie bootstrap, existing Korean UI, API/mock modes, notification reconciliation, and chat reconnect behavior.
- Use `BrowserRouter`; do not use data loaders/actions or hash routing.
- Keep write, rental, report, and notification popovers as local UI state.
- Production history fallback is a deployment requirement; API and asset URLs must not be rewritten.

---

### Task 1: Router dependency and URL-backed bottom navigation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/main.jsx`
- Modify: `src/components/BottomNavigation.jsx`
- Test: `src/components/BottomNavigation.test.jsx`

**Interfaces:**
- Consumes: React Router `BrowserRouter`, `NavLink`, and `useNavigate`.
- Produces: `BottomNavigation({ setIsWriteModalOpen, chats })`; route paths `/`, `/search`, `/chats`, and `/my`.

- [ ] **Step 1: Write a failing navigation test** that renders `BottomNavigation` inside `MemoryRouter`, clicks 탐색, and expects location `/search`; also verify unread chat and 글쓰기 callbacks.
- [ ] **Step 2: Run `npm test -- src/components/BottomNavigation.test.jsx`** and confirm failure because the component still requires `setActiveTab` and does not change location.
- [ ] **Step 3: Install `react-router`, wrap the app with `BrowserRouter`, and replace tab buttons with `NavLink`** while keeping the center write button local.
- [ ] **Step 4: Re-run the focused test** and confirm it passes.
- [ ] **Step 5: Commit** with `feat: add url-backed navigation`.

### Task 2: Authentication bootstrap and protected route boundaries

**Files:**
- Create: `src/hooks/useAuthBootstrap.js`
- Create: `src/hooks/useAuthBootstrap.test.jsx`
- Create: `src/app/ProtectedRoute.jsx`
- Create: `src/app/ProtectedRoute.test.jsx`
- Create: `src/app/AppRouter.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `useAuthStore`, `refreshSession()`, `exchangeGoogleLogin(code)`, current auth page callbacks.
- Produces: `useAuthBootstrap()` returning `{ authStatus, accessToken, user, applyAuth, completeProfile, logout }`; `ProtectedRoute({ requireProfile })` rendering `Outlet`; `AppRouter` route tree.

- [ ] **Step 1: Write failing hook tests** for refresh success, confirmed refresh failure, and one-time Google hash exchange/removal.
- [ ] **Step 2: Run the hook test** and confirm failure because the hook is missing.
- [ ] **Step 3: Implement the minimal bootstrap hook** by moving existing startup behavior unchanged and retaining the requested pathname.
- [ ] **Step 4: Write failing protected-route tests** for checking, unauthenticated redirect with location state, incomplete profile redirect, and authenticated outlet rendering.
- [ ] **Step 5: Run the route-boundary test** and confirm failure because the boundary is missing.
- [ ] **Step 6: Implement `ProtectedRoute` and the initial route tree**, keeping existing login/profile/admin components.
- [ ] **Step 7: Re-run focused auth tests** and confirm all pass.
- [ ] **Step 8: Commit** with `refactor: extract authentication routing`.

### Task 3: Notification state and bell extraction

**Files:**
- Create: `src/hooks/useNotifications.js`
- Create: `src/hooks/useNotifications.test.jsx`
- Create: `src/components/NotificationBell.jsx`
- Create: `src/components/NotificationBell.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: access token, enabled flag, `getNotifications`, mark-read APIs, realtime callback and reconnect signal.
- Produces: `useNotifications({ accessToken, enabled, onWorkflowNotification })` returning `{ notifications, unreadCount, handleRealtime, reload, markRead, markAllRead, clear }`; presentation-only `NotificationBell`.

- [ ] **Step 1: Write failing hook tests** proving that a delayed snapshot cannot discard realtime entries, snapshot read state is authoritative for duplicate IDs, ordering uses `createdAt`, and reload occurs when called on reconnect.
- [ ] **Step 2: Run the hook test** and confirm failure because the hook is missing.
- [ ] **Step 3: Move normalization/merge/load/read behavior into the hook** without changing API calls.
- [ ] **Step 4: Write failing bell interaction tests** for opening, individual read, and mark-all read using real rendered controls.
- [ ] **Step 5: Run the bell test** and confirm failure because the component is missing.
- [ ] **Step 6: Extract the existing bell markup into a presentation component** and connect it to the hook.
- [ ] **Step 7: Re-run focused and existing notification tests** and confirm they pass.
- [ ] **Step 8: Commit** with `refactor: extract notification flow`.

### Task 4: Item editor extraction

**Files:**
- Create: `src/hooks/useItemEditor.js`
- Create: `src/hooks/useItemEditor.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: item API adapter, mock `setItems`, pickup locations, university, toast, and modal-close callback.
- Produces: fields/setters required by `ItemRegistrationModal`, `openCreate()`, `openEdit(item)`, `handlePhotoSelect`, `handlePhotoRemove`, `submit(event)`, and `reset()`.

- [ ] **Step 1: Write failing tests** for required fields, create payload, edit payload, five-photo cap/removal, reset, and rejected submission state.
- [ ] **Step 2: Run the focused test** and confirm failure because the hook is missing.
- [ ] **Step 3: Move existing item form state and handlers into `useItemEditor`** while retaining `toCreateItemPayload` and mock item shape.
- [ ] **Step 4: Re-run item editor and modal tests** and confirm they pass.
- [ ] **Step 5: Commit** with `refactor: extract item editor state`.

### Task 5: Marketplace layout and routed screens

**Files:**
- Create: `src/layouts/MarketplaceLayout.jsx`
- Create: `src/app/routes/ItemDetailRoute.jsx`
- Create: `src/app/routes/ChatRoomRoute.jsx`
- Create: `src/app/routes/UserProfileRoute.jsx`
- Create: `src/app/AppRouter.test.jsx`
- Modify: `src/app/AppRouter.jsx`
- Modify: `src/pages/HomePage.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: existing data hooks/page components, `Outlet`, `useOutletContext`, `useNavigate`, and URL params.
- Produces: nested authenticated routes `/`, `/search`, `/items/:itemId`, `/chats`, `/chats/:roomId`, `/users/:userId`, `/my`, `/rentals`, and `/admin/*`.

- [ ] **Step 1: Write failing integration tests** for direct `/rentals`, direct item and chat-room selection, unknown-route redirect, bottom navigation URL updates, and browser back.
- [ ] **Step 2: Run the routing test** and confirm failures because screens are still selected by `activeTab`/modal state.
- [ ] **Step 3: Move the authenticated mobile frame and shared domain hooks into `MarketplaceLayout`** and expose only route-required values through outlet context.
- [ ] **Step 4: Add route adapters** that resolve item/room/user IDs and render explicit loading/not-found states.
- [ ] **Step 5: Replace `setActiveTab`, selected-item screen identity, and profile screen identity with `navigate()` calls**, retaining transient modal state only.
- [ ] **Step 6: Reduce `App.jsx` to bootstrap plus `AppRouter` composition** and ensure one layout instance owns realtime hooks across child navigation.
- [ ] **Step 7: Re-run routing tests and all existing frontend tests** and fix behavior-preserving regressions.
- [ ] **Step 8: Commit** with `refactor: route marketplace screens`.

### Task 6: Deployment note and full verification

**Files:**
- Modify: deployment documentation under `docs/` when present.

**Interfaces:**
- Consumes: hosting configuration documented by the repository.
- Produces: explicit SPA history fallback requirement for non-API, non-asset paths.

- [ ] **Step 1: Document the `index.html` history fallback** in the existing deployment guide without changing backend routes.
- [ ] **Step 2: Run `npm test -- --run`** and require all frontend tests to pass.
- [ ] **Step 3: Run `npm run lint`** and require zero lint errors.
- [ ] **Step 4: Run `npm run build`** and require a successful production bundle.
- [ ] **Step 5: Run `bash ./gradlew test --rerun-tasks` in `backend/`** and require all backend tests to pass.
- [ ] **Step 6: Run `git diff --check` and inspect `git status --short`** to verify clean formatting and intended scope only.
- [ ] **Step 7: Commit** with `docs: describe spa route fallback` if documentation changed independently.
