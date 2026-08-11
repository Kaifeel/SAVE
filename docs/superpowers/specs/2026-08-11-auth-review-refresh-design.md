# Secure Authentication and Review Refresh Design

## Goal

Fix the reported refresh defects while strengthening browser authentication:

1. Email and Google users remain authenticated on browser refresh without storing authentication data in `localStorage`.
2. A Google user who completed profile setup does not return to the profile setup screen after refresh.
3. Rental review state, published review text, rating averages, and review counts update without a full browser refresh.
4. User-provided review text cannot execute as HTML or JavaScript.

## Non-goals

- Do not change the existing `REQUESTED -> RENTING -> RETURNED` offline rental lifecycle or its buttons.
- Do not add a separate approval or payment state.
- Do not use Zustand persistence or browser storage for tokens or user profiles.
- Do not change the mutual blind-review publication rule.

## Frontend Authentication Store

Add Zustand and create `src/store/authStore.js`. The store is memory-only and contains:

- `accessToken`
- `user`
- `authStatus`: `checking`, `authenticated`, or `anonymous`
- `setSession(session)`
- `updateUser(user)`
- `clearSession()`

The store must not use Zustand `persist`, `localStorage`, or `sessionStorage`. `App.jsx`, API callers, WebSocket setup, and authenticated hooks read the access token and current user from this store.

On application startup, the store begins in `checking`. The frontend calls `POST /api/v1/auth/refresh` with credentials included. A successful response installs the new access token and the latest database user in the store. A rejected refresh changes the state to `anonymous`. While checking, the application shows an authentication loading screen rather than briefly showing login or profile setup.

After profile setup succeeds, the returned user is installed with `updateUser`. The database remains the authoritative source, and the next refresh response returns the same completed profile.

## Token Model

### Access token

- JWT bearer token returned in the JSON authentication response.
- Fifteen-minute default lifetime, configurable by environment variable.
- Stored only in the Zustand memory store.
- Sent in the existing `Authorization: Bearer` header and STOMP connect header.

### Refresh token

- Cryptographically random opaque value with a fourteen-day absolute lifetime, configurable by environment variable.
- Stored in the browser only as an `HttpOnly` cookie.
- Stored in the database only as a SHA-256 hash with user, token-family identifier, creation time, expiry time, consumed time, and revocation time.
- Rotated on every successful refresh. The consumed token cannot be used again.
- Reuse of a consumed token revokes the entire token family.
- Issued for email signup, email login, direct Google login, and Google redirect exchange through the same session service.

The cookie uses a narrow authentication path, `HttpOnly`, and `SameSite=Lax`. Production uses `Secure`; local HTTP development disables only `Secure` through profile configuration. Refresh and logout requests validate their `Origin` against the exact configured CORS origins as defense in depth against cross-site requests.

## Authentication Endpoints

- Existing signup, login, Google login, and Google exchange responses set the rotated refresh cookie and return an access token plus user.
- `POST /api/v1/auth/refresh` consumes and rotates the refresh token, sets the replacement cookie, and returns a new access token plus the latest user.
- `POST /api/v1/auth/logout` revokes the presented refresh-token family and clears the cookie.

The frontend API client performs at most one shared refresh operation after a 401, updates the store, and retries the original request once. Refresh, login, and logout calls are excluded from automatic retry to prevent loops. If refresh fails, the store is cleared and unauthorized subscribers are notified.

## Review Refresh

### Local submission

After review submission succeeds, `useRentals` immediately applies the returned `review_state` and `review_deadline` to the matching rental. It then performs the existing server reload. The modal closes after success, so the current browser immediately displays `상대방 후기 작성 대기 중` or `후기 공개됨`.

Related My Page, item, rating-summary, and open-profile data are invalidated and reloaded after the submission.

### Other participant submission

When the second review makes both reviews public, the backend creates a `REVIEW_PUBLISHED` in-app notification for both rental participants through the existing WebSocket notification channel. Receiving rental or review workflow notifications reloads rentals, My Page data, item summaries, and the currently open public profile.

Opening rental history always performs a fresh rental query. This is the fallback when the WebSocket was disconnected and removes the need for a full browser refresh.

## XSS and Browser Security

- Render reviews and other user text through normal React text interpolation only.
- Do not use `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, or `eval` with user-controlled data.
- Validate dynamic URL protocols and allow only expected HTTP(S) or local application paths.
- Keep backend length and format validation for user input.
- Add a production Content Security Policy that restricts script, object, frame, and base sources while preserving the Google Identity Services origins needed by login.
- Add security headers without weakening the existing frame protection outside the development H2 console.
- Treat the HttpOnly cookie as token-theft mitigation, not as a substitute for preventing XSS.

## Failure Handling

- Failed profile updates do not mutate the store or leave profile setup.
- Failed startup refresh results in the normal login page, not a partially authenticated UI.
- Failed automatic refresh retries no request more than once.
- Failed review submission keeps the form open and shows the existing error toast.
- Failed background data refresh keeps the successful local review workflow state and can be retried by reopening rental history.

## Tests

- Backend token tests cover issuance, hashing, expiry, rotation, replay-family revocation, logout, cookie flags, latest-user refresh responses, and authentication endpoint integration.
- Frontend store tests prove that no authentication data is written to browser storage.
- Frontend bootstrap tests cover refresh success, refresh failure, and completed Google profile restoration.
- API-client tests cover one-time concurrent refresh and one retry without loops.
- Profile tests prove successful setup updates the store and survives a simulated application restart through `/auth/refresh`.
- Review hook tests prove immediate local workflow-state updates.
- Notification tests prove `REVIEW_PUBLISHED` reloads related data.
- Backend review integration tests prove the second review notifies both participants.
- XSS regression tests prove malicious review markup is rendered as text and cannot create executable DOM nodes.
- Run the complete frontend test suite, backend test suite, frontend production build, and lint.
