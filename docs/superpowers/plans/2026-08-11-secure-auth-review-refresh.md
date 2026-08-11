# Secure Authentication and Review Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser-persisted authentication with a memory-only Zustand session backed by rotating HttpOnly refresh tokens, and make mutual reviews refresh locally and across participants without a browser reload.

**Architecture:** Spring Boot issues short-lived JWT access tokens in JSON and rotating opaque refresh tokens in HttpOnly cookies whose hashes are stored in PostgreSQL/H2. React restores the session through `/auth/refresh`, keeps access/user state only in Zustand memory, retries one failed API request after a shared refresh, and invalidates rental/review data from local submissions and WebSocket notifications.

**Tech Stack:** Java 17, Spring Boot 3.3, Spring Security resource server, Spring Data JPA, Flyway, React 19, Zustand, Vitest, Testing Library, STOMP WebSocket.

## Global Constraints

- Preserve `REQUESTED -> RENTING -> RETURNED` and all existing transaction buttons.
- Do not store access tokens, refresh tokens, or user profiles in `localStorage` or `sessionStorage`.
- Use a 15-minute access-token default and a 14-day refresh-token absolute lifetime.
- Store only SHA-256 refresh-token hashes in the database and rotate on every refresh.
- Keep the mutual blind-review publication rule unchanged.
- Preserve the user's uncommitted `backend/src/main/resources/application.yml` change and `docs/gcp-private-beta-deployment.md`.

---

### Task 1: Rotating Refresh Token Domain

**Files:**
- Create: `backend/src/main/java/com/save/security/RefreshToken.java`
- Create: `backend/src/main/java/com/save/security/RefreshTokenRepository.java`
- Create: `backend/src/main/java/com/save/security/IssuedRefreshToken.java`
- Create: `backend/src/main/java/com/save/security/RotatedRefreshToken.java`
- Create: `backend/src/main/java/com/save/security/RefreshTokenService.java`
- Create: `backend/src/main/resources/db/migration/V6__create_refresh_tokens.sql`
- Create: `backend/src/test/java/com/save/security/RefreshTokenServiceTest.java`

**Interfaces:**
- Consumes: `UserRepository`, `Clock`, and `security.refresh-token.expiration-seconds`.
- Produces: `IssuedRefreshToken issue(User user)`, `RotatedRefreshToken rotate(String rawToken)`, and `void revokeFamily(String rawToken)`.

- [ ] **Step 1: Write failing rotation tests**

Use a fixed clock and assert issue stores only a hash, rotation changes the raw token without extending absolute expiry, replay revokes the family, expiry rejects rotation, and logout-style revocation invalidates the active token.

```java
IssuedRefreshToken issued = service.issue(user);
assertThat(issued.rawToken()).isNotBlank();
assertThat(repository.findByTokenHash(sha256(issued.rawToken()))).isPresent();

RotatedRefreshToken rotated = service.rotate(issued.rawToken());
assertThat(rotated.user().getId()).isEqualTo(user.getId());
assertThat(rotated.rawToken()).isNotEqualTo(issued.rawToken());
assertThat(rotated.expiresAt()).isEqualTo(issued.expiresAt());
```

- [ ] **Step 2: Verify RED**

Run:

```bash
cd backend
./gradlew test --tests com.save.security.RefreshTokenServiceTest
```

Expected: compilation fails because the refresh-token types do not exist.

- [ ] **Step 3: Implement persistence and rotation**

Use a 32-byte `SecureRandom` token, URL-safe Base64 without padding, SHA-256 hashing, a UUID family identifier, pessimistic lookup by hash, and unchanged absolute expiry during rotation. Keep consumed rows so reuse is detectable. Migration V6 creates `refresh_tokens` with `user_id`, `token_hash`, `family_id`, `created_at`, `expires_at`, `consumed_at`, and `revoked_at`, plus unique hash and family/user indexes.

- [ ] **Step 4: Verify GREEN**

Run the Task 1 command and confirm every refresh-token service test passes.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/save/security/RefreshToken.java backend/src/main/java/com/save/security/RefreshTokenRepository.java backend/src/main/java/com/save/security/IssuedRefreshToken.java backend/src/main/java/com/save/security/RotatedRefreshToken.java backend/src/main/java/com/save/security/RefreshTokenService.java backend/src/main/resources/db/migration/V6__create_refresh_tokens.sql backend/src/test/java/com/save/security/RefreshTokenServiceTest.java
git commit -m "feat: add rotating refresh tokens"
```

### Task 2: Authentication Session Cookies and Endpoints

**Files:**
- Create: `backend/src/main/java/com/save/security/AuthSession.java`
- Create: `backend/src/main/java/com/save/security/AuthSessionService.java`
- Create: `backend/src/main/java/com/save/security/RefreshCookieService.java`
- Modify: `backend/src/main/java/com/save/security/AuthController.java`
- Modify: `backend/src/main/java/com/save/security/JwtTokenService.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/src/main/resources/application-dev.yml`
- Modify: `backend/src/main/resources/application-prod.yml`
- Modify: `backend/src/test/java/com/save/security/AuthControllerRedirectTest.java`
- Modify: `backend/src/test/java/com/save/security/AuthIntegrationTest.java`
- Create: `backend/src/test/java/com/save/security/AuthRefreshIntegrationTest.java`

**Interfaces:**
- Consumes: existing `AuthResponse` values and Task 1 refresh tokens.
- Produces: `AuthSession start(AuthResponse response)`, `AuthSession refresh(String rawToken)`, and cookie-backed `/auth/refresh` and `/auth/logout`.

- [ ] **Step 1: Write failing endpoint tests**

Test signup/login for a `Set-Cookie` header containing `HttpOnly`, `SameSite=Lax`, and `Path=/api/v1/auth`. Extract the cookie, refresh, and assert a new access token, latest database profile, and different refresh cookie. Assert the old cookie cannot refresh again, logout clears it, and Google exchange sets it.

- [ ] **Step 2: Verify RED**

```bash
cd backend
./gradlew test --tests com.save.security.AuthIntegrationTest --tests com.save.security.AuthRefreshIntegrationTest --tests com.save.security.AuthControllerRedirectTest
```

Expected: refresh endpoint and cookie assertions fail because only access-token responses exist.

- [ ] **Step 3: Implement unified sessions**

`AuthSession` contains `AuthResponse response` and `String refreshToken`. `AuthSessionService.start` loads the response user and issues a refresh token. `refresh` rotates the cookie token, reloads the current user, and returns:

```java
new AuthResponse(jwtTokenService.issue(user), "Bearer", false, AuthUserResponse.from(user))
```

`RefreshCookieService` creates and clears the cookie. Set access-token default to 900 seconds, refresh absolute lifetime to 1,209,600 seconds, cookie `Secure=false` in dev and `Secure=true` in prod. Validate refresh/logout `Origin` against exact configured CORS origins when present.

- [ ] **Step 4: Verify GREEN**

Run the focused tests and then `cd backend && ./gradlew test`.

- [ ] **Step 5: Commit**

Stage only Task 2 files and intended configuration hunks, preserving the pre-existing Google client-ID fallback.

```bash
git commit -m "feat: issue refresh cookie sessions"
```

### Task 3: Memory-only Zustand Authentication

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/store/authStore.js`
- Create: `src/store/authStore.test.js`
- Modify: `src/api/auth.js`
- Modify: `src/api/client.js`
- Modify: `src/api/client.test.js`
- Modify: `src/App.jsx`
- Modify: `src/App.googleRedirect.test.jsx`
- Create: `src/App.authRefresh.test.jsx`

**Interfaces:**
- Produces: `useAuthStore` with `accessToken`, `user`, `authStatus`, `setSession`, `updateUser`, and `clearSession`.
- Produces: `refreshSession()` and `logoutSession()`.

- [ ] **Step 1: Add Zustand**

```bash
npm install zustand
```

- [ ] **Step 2: Write failing store/bootstrap tests**

```javascript
useAuthStore.getState().setSession({ access_token: 'jwt', user: completeUser })
expect(useAuthStore.getState().accessToken).toBe('jwt')
expect(localStorage.length).toBe(0)
expect(sessionStorage.length).toBe(0)
```

Render `App` with a successful refresh containing a completed Google user and assert profile setup is absent. Render failed refresh and assert login appears only after checking completes.

- [ ] **Step 3: Verify RED**

```bash
npm run test:run -- src/store/authStore.test.js src/App.authRefresh.test.jsx src/App.googleRedirect.test.jsx src/api/client.test.js
```

Expected: failures because the store, refresh API, and bootstrap do not exist.

- [ ] **Step 4: Implement memory sessions**

Remove browser-storage auth helpers. `App` reads Zustand, begins in `checking`, shares one refresh promise in StrictMode, and calls `updateUser` after profile setup. Login/Google exchange call `setSession`; logout calls the server before `clearSession`.

In `api/client.js`, share concurrent refresh attempts with one module promise. On a protected request's first 401, call raw `/auth/refresh`, update the store, retry once using the new token, and never refresh `/auth/*` requests or retry a second 401.

- [ ] **Step 5: Verify GREEN**

Run focused tests and the complete frontend suite.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/store src/api/auth.js src/api/client.js src/api/client.test.js src/App.jsx src/App.googleRedirect.test.jsx src/App.authRefresh.test.jsx
git commit -m "feat: restore auth through memory store"
```

### Task 4: Immediate and Realtime Review Refresh

**Files:**
- Modify: `backend/src/main/java/com/save/notification/InAppNotificationType.java`
- Modify: `backend/src/main/java/com/save/notification/InAppNotificationService.java`
- Modify: `backend/src/main/java/com/save/review/ReviewService.java`
- Modify: `backend/src/test/java/com/save/review/ReviewSubmissionIntegrationTest.java`
- Modify: `src/hooks/useRentals.js`
- Modify: `src/hooks/useRentals.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/App.notifications.test.jsx`
- Modify: `src/pages/UserProfilePage.jsx`
- Modify: `src/hooks/useUserProfile.js`
- Modify: `src/hooks/useUserProfile.test.jsx`

**Interfaces:**
- Produces: `REVIEW_PUBLISHED` notifications for both participants.
- Produces: a workflow refresh version consumed by rental and profile data hooks.

- [ ] **Step 1: Write failing refresh tests**

Keep an initial rental in the hook fixture and assert submission immediately changes `reviewState` to `SUBMITTED_WAITING`. Assert the second backend submission creates two `REVIEW_PUBLISHED` notifications. Emit that notification in the App test and expect rental/My Page/item reload callbacks.

- [ ] **Step 2: Verify RED**

Run focused frontend hook/notification tests and `ReviewSubmissionIntegrationTest`. Confirm failures are caused by missing immediate merge and notification type.

- [ ] **Step 3: Implement refresh paths**

Normalize the submission response and merge `reviewState`/`reviewDeadline` before awaiting reload. On publication, create notifications for lender and borrower. In `App`, increment a workflow refresh version for rental/review notifications and reload rentals, My Page, items, and open profile. Reload rentals whenever `activeTab` becomes `rentals`.

- [ ] **Step 4: Verify GREEN**

Run focused and full frontend/backend suites.

- [ ] **Step 5: Commit**

```bash
git commit -m "fix: refresh published reviews without reload"
```

### Task 5: XSS Regression and Browser Headers

**Files:**
- Modify: `src/pages/UserProfilePage.test.jsx`
- Modify: `index.html`
- Modify: `backend/src/main/java/com/save/security/SecurityConfig.java`
- Create: `backend/src/test/java/com/save/security/SecurityHeadersIntegrationTest.java`
- Modify: `docs/gcp-private-beta-deployment.md`

**Interfaces:**
- Consumes: untrusted review content as plain text.
- Produces: non-executable rendering and production header guidance compatible with Google Identity Services.

- [ ] **Step 1: Write failing security tests**

Render `<img src=x onerror=alert(1)>` as review content, assert the exact text is visible, and assert no unintended image node exists. Add backend assertions for content-type, referrer, and permissions-policy headers.

- [ ] **Step 2: Audit dangerous sinks**

```bash
rg -n "dangerouslySetInnerHTML|innerHTML|document\.write|\beval\(" src
```

Expected: no user-controlled unsafe sink; trace and remove any unsafe match.

- [ ] **Step 3: Implement minimum hardening**

Keep review content in React text interpolation. Add Spring security headers. Add an `index.html` CSP meta policy permitting self and exact Google Identity Services endpoints, blocking objects, and restricting base URIs. Document equivalent production response headers because response headers take precedence over meta delivery.

- [ ] **Step 4: Verify GREEN**

Run focused tests, frontend build, and lint.

- [ ] **Step 5: Commit**

Review `docs/gcp-private-beta-deployment.md` for credentials before staging it.

```bash
git commit -m "security: harden browser rendering and headers"
```

### Task 6: End-to-End Verification and Documentation

**Files:**
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `.env.example`

**Interfaces:**
- Documents Windows CMD and Linux/macOS startup, cookie behavior, token lifetimes, local Google origin, and no browser token storage.

- [ ] **Step 1: Update setup documentation**

Explain that frontend/backend must use the same `localhost` host label, refresh requests require credentials, production requires HTTPS, and blocking the first-party refresh cookie prevents session restoration.

- [ ] **Step 2: Run complete verification**

```bash
npm run test:run
npm run lint
npm run build
cd backend
./gradlew test --no-daemon
```

Expected: every command exits 0 with no failed tests or lint errors.

- [ ] **Step 3: Inspect final state**

```bash
git diff --check
git status --short
git log --oneline -8
```

Confirm only intended changes remain and the user's pre-existing configuration is preserved.

- [ ] **Step 4: Commit**

```bash
git add README.md backend/README.md .env.example
git commit -m "docs: explain secure local authentication"
```

