# Platform Source Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the current web/backend/docs work and merge the canonical Expo app into one `integration/save-platform` branch without losing either authentication contract.

**Architecture:** The current and Expo directories are linked worktrees of the same repository. Commit the dirty current work in reviewable groups, merge `feature/expo-src-parity`, and resolve the three overlapping configuration files by composition rather than choosing one side.

**Tech Stack:** Git, React 19, Vite 8, Vitest 4, Spring Boot 3.3, Gradle 8.13, Expo SDK 57, Jest 30, TypeScript 6

**Spec:** `docs/superpowers/specs/2026-08-23-platform-integration-chat-push-design.md`

## Global Constraints

- Final source tree contains web under `src/`, Expo under `apps/save-app/`, and one backend under `backend/`.
- Preserve every current uncommitted backend security, web hardening, and documentation change.
- Do not delete `feature/expo-src-parity` or its worktree during this plan.
- Keep the current visual design unchanged.
- Resolve configuration conflicts by retaining both web and mobile behavior.

---

### Task 1: Checkpoint Current Backend Security Work

**Files:**
- Modify: `backend/src/main/java/com/save/security/AuthController.java`
- Modify: `backend/src/main/java/com/save/security/AuthOriginValidator.java`
- Modify: `backend/src/main/java/com/save/security/ProductionSecretsValidator.java`
- Modify: `backend/src/main/java/com/save/security/RefreshCookieService.java`
- Modify: `backend/src/main/resources/application.yml`
- Test: `backend/src/test/java/com/save/security/AuthRefreshIntegrationTest.java`
- Test: `backend/src/test/java/com/save/security/ProductionSecretsValidatorTest.java`
- Test: `backend/src/test/java/com/save/security/RefreshCookieServiceTest.java`

**Interfaces:**
- Consumes: Current dirty worktree based on `feature/item-time-rental-flow`.
- Produces: `integration/save-platform` with the browser security changes in one commit.

- [ ] **Step 1: Create the integration branch without changing the dirty files**

Run: `git switch -c integration/save-platform`

Expected: branch changes to `integration/save-platform`; `git status --short` still lists all current modifications.

- [ ] **Step 2: Run the focused security tests**

Run: `cd backend && ./gradlew test --tests 'com.save.security.*'`

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Commit only the backend security checkpoint**

```bash
git add backend/src/main/java/com/save/security/AuthController.java \
  backend/src/main/java/com/save/security/AuthOriginValidator.java \
  backend/src/main/java/com/save/security/ProductionSecretsValidator.java \
  backend/src/main/java/com/save/security/RefreshCookieService.java \
  backend/src/main/resources/application.yml \
  backend/src/test/java/com/save/security/AuthRefreshIntegrationTest.java \
  backend/src/test/java/com/save/security/ProductionSecretsValidatorTest.java \
  backend/src/test/java/com/save/security/RefreshCookieServiceTest.java
git diff --cached --check
git commit -m "security: harden browser refresh session boundaries"
```

Expected: no frontend or documentation path appears in `git show --stat --oneline HEAD`.

### Task 2: Checkpoint Web Frontend Hardening

**Files:**
- Modify: `index.html`, `package.json`, `package-lock.json`, `vite.config.js`
- Modify: all currently dirty paths under `src/`
- Create: `src/App.itemForm.test.jsx`
- Create: `src/api/chats.test.js`
- Create: `src/api/wishlist.test.js`
- Create: `src/hooks/useItems.mock.test.jsx`

**Interfaces:**
- Consumes: Web hardening verified as 42 Vitest files and 124 tests.
- Produces: One frontend commit that does not contain backend or docs changes.

- [ ] **Step 1: Run the complete web verification before committing**

Run: `npm run test:run && npm run lint && npm run build && git diff --check`

Expected: 42 test files and 124 tests pass; ESLint and Vite exit 0.

- [ ] **Step 2: Stage the exact web scope**

Run: `git add index.html package.json package-lock.json vite.config.js src`

Expected: `git diff --cached --name-only` contains only those roots.

- [ ] **Step 3: Commit the web checkpoint**

Run: `git commit -m "fix: harden frontend data and mock boundaries"`

Expected: the working tree retains only untracked/modified documentation paths.

### Task 3: Checkpoint Project Documentation

**Files:**
- Create: `docs/code-guide/**`
- Create: `docs/gcp-private-beta-deployment.md`

**Interfaces:**
- Consumes: Existing user-authored guide and deployment files.
- Produces: Documentation commit independent of source changes.

- [ ] **Step 1: Verify the documents contain no secret-looking assignments**

Run: `rg -n '(PRIVATE KEY|api[_-]?key\s*=|password\s*=|secret\s*=)[^.]+' docs/code-guide docs/gcp-private-beta-deployment.md`

Expected: only explanatory placeholders or variable names; no live credential value.

- [ ] **Step 2: Stage and inspect the documentation**

Run: `git add docs/code-guide docs/gcp-private-beta-deployment.md && git diff --cached --check && git diff --cached --stat`

Expected: only the two documentation scopes are staged.

- [ ] **Step 3: Commit the documentation**

Run: `git commit -m "docs: add project code and deployment guides"`

### Task 4: Merge the Expo Branch and Compose Configuration

**Files:**
- Create: `apps/save-app/**`
- Create: `docs/mobile-ui-parity.md`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `package.json`
- Modify: `vite.config.js`
- Modify: `eslint.config.js`

**Interfaces:**
- Consumes: `feature/expo-src-parity` at `9ad6eb4` or its reviewed successor.
- Produces: A single branch containing browser and mobile auth, web, Expo, and backend.

- [ ] **Step 1: Start the merge**

Run: `git merge --no-ff feature/expo-src-parity`

Expected: Git either completes or reports conflicts limited to the known overlapping configuration paths.

- [ ] **Step 2: Resolve `backend/src/main/resources/application.yml` by composition**

The OAuth section must retain both properties:

```yaml
google:
  oauth:
    client-id: ${GOOGLE_CLIENT_ID:69359391525-029eu2u4u5g6r8lqhbi07i5laeh4f10c.apps.googleusercontent.com}
    client-ids: ${GOOGLE_CLIENT_IDS:${google.oauth.client-id}}
    redirect-success-uri: ${GOOGLE_REDIRECT_SUCCESS_URI:http://localhost:5173}
    redirect-ticket-ttl-seconds: ${GOOGLE_REDIRECT_TICKET_TTL_SECONDS:60}
```

- [ ] **Step 3: Resolve root web tooling by composition**

Keep `name: "save-web"`, all existing web scripts, and these Expo forwarding scripts in `package.json`:

```json
"app:start": "npm --prefix apps/save-app run start",
"app:android": "npm --prefix apps/save-app run android",
"app:lint": "npm --prefix apps/save-app run lint",
"app:typecheck": "npm --prefix apps/save-app run typecheck",
"app:test": "npm --prefix apps/save-app run test"
```

Keep Vitest discovery as:

```js
include: ['src/**/*.{test,spec}.{js,jsx}'],
exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
```

Keep `apps/save-app/**` in root ESLint global ignores because Expo owns its lint configuration.

- [ ] **Step 4: Finish the merge commit**

Run: `git add backend/src/main/resources/application.yml package.json package-lock.json vite.config.js eslint.config.js apps docs/mobile-ui-parity.md && git diff --cached --check && git commit`

Expected: a merge commit with both parents and no unmerged entries from `git diff --name-only --diff-filter=U`.

### Task 5: Verify the Unified Baseline

**Files:**
- Modify only if a verification failure proves an integration defect.

**Interfaces:**
- Consumes: Unified platform source tree.
- Produces: Passing baseline for the STOMP plan.

- [ ] **Step 1: Verify web and backend**

Run: `npm run test:run && npm run lint && npm run build && (cd backend && ./gradlew test)`

Expected: every command exits 0.

- [ ] **Step 2: Verify Expo**

Run: `npm run app:test && npm run app:typecheck && npm run app:lint`

Expected: every command exits 0.

- [ ] **Step 3: Verify repository integrity**

Run: `git diff --check && git status --short && git log --oneline --decorate -8`

Expected: no source changes remain, and the merge plus three checkpoint commits are visible.
