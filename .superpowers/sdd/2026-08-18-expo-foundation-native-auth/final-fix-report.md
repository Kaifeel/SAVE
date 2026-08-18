# Expo foundation/native-auth final fix report

Date: 2026-08-18

Branch: `feature/expo-src-parity`

Fix base: `4d90727d09bc672548f261d73ba12c015112cfa7`

## Outcome

This single final-fix wave closes the runtime auth-response validation and signup parity findings without changing the browser auth or backend implementations. Expo now rejects malformed successful auth responses before normalization or persistence, loads signup universities from the real public catalog, requires the full web signup contract, and covers Android/iOS/web Google client-ID selection independently.

## Changes

- `apps/save-app/src/auth/api.ts`
  - Treats successful JSON as `unknown` and validates the complete session before normalization.
  - Requires nonblank access/refresh tokens, exact `Bearer`, boolean `is_new_user`, a parseable nonblank refresh expiry, a finite user ID, nonblank email, a supported nonblank role, and correctly typed nullable profile fields.
  - Converts invalid/malformed 2xx JSON to sanitized `ApiError('Invalid authentication response', 502)` without including response data, parser details, or credentials.
- `apps/save-app/src/auth/api.test.ts`
  - Adds table-driven malformed/missing auth protocol cases and malformed JSON coverage.
- `apps/save-app/src/auth/store.test.ts`
  - Proves a protocol rejection performs no SecureStore write and exposes no authenticated user/access token.
- `apps/save-app/src/universities/api.ts` and `api.test.ts`
  - Add a focused typed public `GET /universities` boundary with response validation and explicit API/protocol failures.
- `apps/save-app/src/app/signup.tsx`
  - Loads the real catalog with loading, failure, and retry states; no mock or fabricated fallback exists.
  - Uses a dependency-free React Native modal/list selector with Android back dismissal.
  - Requires name, university, department, email, and password and submits the exact selected `universityId`.
  - Exposes accessible validation/catalog/API errors and disables submission and selection while pending.
  - Guards catalog results against stale requests and updates after unmount.
- `apps/save-app/src/__tests__/signup-screen.test.tsx`
  - Directly covers required validation, real catalog selection/exact submission, pending disable, catalog loading/error/retry/no fallback, and signup failure.
- `apps/save-app/src/auth/types.ts`
  - Makes `department` and `universityId` required in `SignupInput`.
- `apps/save-app/src/auth/google-login.ts` and `google-login.test.tsx`
  - Route the hook through a pure platform selector and independently test Android, iOS, and web IDs.
- `docs/mobile-ui-parity.md` and `apps/save-app/README.md`
  - Record actual signup/auth behavior, fresh verification, and dependency-audit disposition.

## TDD evidence

### Auth protocol and university API RED

Command:

```bash
cd apps/save-app
npm test -- --runTestsByPath src/auth/api.test.ts src/auth/store.test.ts src/universities/api.test.ts
```

Observed before implementation:

- `src/auth/api.test.ts`: 19 protocol cases failed because malformed sessions resolved or raw `TypeError`/`SyntaxError` escaped.
- `src/universities/api.test.ts`: suite failed because `./api` did not exist.
- `src/auth/store.test.ts`: the security assertion passed when supplied a protocol rejection, locating the missing enforcement at the API boundary.

### Auth protocol and university API GREEN

The same command passed 3 suites and 42 tests after the minimal boundary implementation.

### Signup screen RED

Command:

```bash
npm test -- --runTestsByPath src/__tests__/signup-screen.test.tsx
```

Observed before implementation: 1 suite and all 5 tests failed because the screen had no catalog loader, selector, catalog failure/retry UI, required university validation, or exact university submission.

### Signup screen GREEN

The same command passed 1 suite and 5 tests after implementation.

### Google platform selection RED/GREEN

Command:

```bash
npm test -- --runTestsByPath src/auth/google-login.test.tsx
```

Observed RED: the three Android/iOS/web cases failed because `selectGoogleClientId` did not exist.

Observed GREEN: all 6 Google-login tests passed after routing the hook through the selector.

### Changed-area regression GREEN

Command:

```bash
npm test -- --runTestsByPath src/auth/google-login.test.tsx src/auth/api.test.ts src/auth/store.test.ts src/universities/api.test.ts src/__tests__/signup-screen.test.tsx
```

Result: 5 suites and 53 tests passed.

## Final verification

### Expo tests, typecheck, and lint

Commands:

```bash
cd apps/save-app
npm test
npm run typecheck
npm run lint
```

Fresh final results:

- Jest: 10 suites, 77 tests, 0 failures.
- TypeScript: `tsc --noEmit` exited 0.
- ESLint: `expo lint` exited 0 with no diagnostics.

An intermediate lint run correctly caught synchronous loader initialization through an effect (`react-hooks/set-state-in-effect`). The loader was separated so the initial effect starts only the external promise and React state changes occur in completion callbacks; the direct signup suite stayed green and the final lint run passed.

### Android export

Command:

```bash
cd apps/save-app
npx expo export --platform android --output-dir /tmp/save-expo-final-fix-export
```

Result: exit 0; Metro bundled 1,282 modules and wrote `_expo/static/js/android/entry-c42b48d11e3d728a44db9cd771470507.hbc` plus `metadata.json`. The only output warning was the existing environment warning that `NO_COLOR` is ignored while `FORCE_COLOR` is set.

### Forbidden-hardcode audit

Command:

```bash
rg -n "#카메라|#미러리스|#촬영|1 / 3|거래 42회|mock-access-token|mock-refresh-token" apps/save-app --glob '!node_modules/**'
```

Result: no output and exit 1, the expected ripgrep result when there are no matches.

### Backend evidence

`git diff --name-only -- backend` returned no paths. This client-only wave relies on the immediately preceding full backend result recorded at the fix base: Gradle `BUILD SUCCESSFUL in 19s`. Browser cookie auth, mobile session endpoints, logout races, and OAuth audience validation were not modified.

## Dependency audit triage

The sandboxed production audit first failed exactly with:

```text
getaddrinfo EAI_AGAIN registry.npmjs.org
npm ERR! audit endpoint returned an error
```

After network approval, both requested commands completed against the npm registry:

```bash
npm audit --omit=dev --json
npm audit --json
```

Both reports contain the same package-level counts: 23 total, 15 high, 8 moderate, 0 low, and 0 critical. Therefore the full audit adds no dev-only advisory delta to the production audit. The paths are the Expo 57 / React Native 0.86 / Metro and related build-tool graph, including `image-size` and `uuid` transitively. npm's suggested automatic fixes include incompatible downgrades such as Expo 53 and React Native 0.72. No `npm audit fix` was applied. Disposition: track SDK-compatible upstream releases and re-audit when they are available.

## Self-review

- Re-read the design, implementation plan, and every final-review requirement after implementation.
- Confirmed the branch and base are correct and the worktree was clean before this wave.
- Reviewed the complete diff, including new untracked test/API files, and ran `git diff --check` successfully.
- Confirmed every auth success path (`login`, signup, Google, refresh) shares the same runtime validator before normalization.
- Confirmed protocol errors have a constant sanitized message/status and never incorporate response payloads, tokens, or JSON parser text.
- Confirmed rejected sessions do not reach `writeRefreshToken` or authenticated state.
- Confirmed signup has no static university options, cycling behavior, TanStack dependency, or mock fallback.
- Confirmed catalog loading is public/unauthenticated, uses `cache: no-store`, validates IDs/names, and exposes retry.
- Confirmed pending submission prevents duplicate submit and university changes.
- Confirmed the modal supplies `onRequestClose` for Android back and accessible roles/states for selection, errors, and buttons.
- Confirmed Google login behavior is unchanged except that platform selection is now directly testable.
- Confirmed `backend/`, browser auth, route protection, session rotation, and logout implementation files are unchanged.
- Confirmed no production tokens, client IDs, product fixtures, or forbidden hardcoded display values were introduced.

## Concerns and remaining device work

- npm currently reports 23 upstream package-level findings. The available automatic fixes are incompatible with Expo SDK 57 and were intentionally not forced.
- Interactive Google OAuth, SecureStore persistence/restoration, and Android modal/back behavior still require the planned physical-device acceptance run; automated tests and export are not substitutes.
- The Android export validates bundling, not an installed development build.
- Empty university catalogs display an explicit disabled `등록된 대학교가 없습니다.` state. A retry is presented for request/protocol failures; no option is fabricated.
