# Mobile UI parity status

This matrix tracks the canonical Expo app in `apps/save-app` against the web reference in `src`. The Expo app uses the existing shared Spring Boot server in `backend`; it does not have a separate mobile backend.

## Status definitions

- `shell`: the route is a presentation-only placeholder or the target route is not present. It does not imply that API behavior works.
- `implemented`: the described UI and API boundary are implemented and covered by automated tests. It does not imply physical-device verification.
- `verified`: the implemented flow has also passed the applicable physical-device acceptance check. No screen has this status yet.

## Screen matrix

| Screen | Status | Web reference path | Expo target path | API status | Hardcoded-data audit | Physical-device status |
| --- | --- | --- | --- | --- | --- | --- |
| Login | `implemented` | `src/pages/LoginPage.jsx` | `apps/save-app/src/app/login.tsx` | Email login and Google ID-token submission are wired to the existing mobile auth API. Interactive Google OAuth is not device-verified. | Pass: no forbidden tags, counters, trade totals, or mock tokens. | Not run. |
| Signup | `implemented` | `src/pages/LoginPage.jsx` | `apps/save-app/src/app/signup.tsx` | Email signup requires name, a university loaded from the public `/universities` catalog, department, email, and password. The native modal selector, catalog loading/error/retry states, exact `universityId` submission, pending state, validation, and API failure are covered by direct screen tests; no catalog fallback is fabricated. | Pass: no forbidden values, university fixtures, or mock tokens in production code. | Not run. |
| Authentication shell | `implemented` | `src/App.jsx` | `apps/save-app/src/app/_layout.tsx`; `apps/save-app/src/app/(authenticated)/index.tsx`; `apps/save-app/src/components/app-bootstrap.tsx` | SecureStore refresh-token restoration, rotation, retry, and protected routing are wired to the existing mobile auth API and covered by automated tests. | Pass: no embedded sessions or mock token fallback. | Not run; SecureStore restoration and route behavior are not device-verified. |
| Home | `implemented` | `src/pages/HomePage.jsx` | `apps/save-app/src/app/(authenticated)/(tabs)/index.tsx` | Popular/latest item lists and recommendation history/creation use the existing `/items` and `/recommendations` APIs with session refresh, loading, empty, error, retry, and pull-to-refresh states. | Pass: server data only; no product fallback or forbidden display values. | Not run; pull-to-refresh and remote images are not device-verified. |
| Explore | `implemented` | `src/pages/SearchPage.jsx` | `apps/save-app/src/app/(authenticated)/(tabs)/explore.tsx` | Board, debounced query, availability, university, sort, and pagination parameters use the existing `/items` API. Empty and failed responses remain explicit. | Pass: server data only; missing location/university uses neutral copy rather than fixtures. | Not run; native switch and list behavior are not device-verified. |
| Compose | `shell` | `src/components/ItemRegistrationModal.jsx` | `apps/save-app/src/app/(authenticated)/(tabs)/create.tsx` | Not connected; the route renders only a title placeholder. | Pass: no draft item, photo, or product fixture data. | Not run. |
| Chats | `implemented` | `src/pages/ChatPage.jsx` | `apps/save-app/src/app/(authenticated)/(tabs)/chat.tsx`; `apps/save-app/src/app/(authenticated)/chats/[id].tsx` | Room lists, cursor-paged messages, read clearing, REST-authoritative optimistic send/retry, STOMP room/list updates, reconnect restoration, and duplicate reconciliation use the shared backend. All successful room/message/page responses are runtime-validated. | Pass: production chat code contains no sample rooms, messages, users, mock tokens, or fabricated item metadata. | Not run; Android and iPhone Expo Go two-device delivery, reconnect, unread clearing, and 50+ message pagination still require physical devices. |
| My | `shell` | `src/pages/MyPage.jsx` | `apps/save-app/src/app/(authenticated)/(tabs)/my.tsx` | Not connected; the route renders only a title placeholder. | Pass: no profile, rental, or notification fixture data. | Not run. |
| Item detail | `implemented` | `src/ProductDetailPage.jsx` | `apps/save-app/src/app/(authenticated)/items/[id].tsx` | Detail uses `/items/{id}` and wishlist uses `POST`/`DELETE /items/{id}/wishlist`; responses are runtime-validated and a successful mutation is followed by an authoritative refetch. | Pass: photo counter derives from real images; fixed tags, photo count, trade count, and fallback owner/location values are absent. | Not run; horizontal image paging and Android system-back are not device-verified. |
| Public profile | `shell` | `src/pages/UserProfilePage.jsx` | Planned `apps/save-app/src/app/(authenticated)/users/[id].tsx` is absent | Not connected; no Expo route exists. | Not applicable: no Expo public-profile UI or data exists to audit. | Not run. |
| Rentals | `implemented` (notification landing only) | `src/pages/RentalsPage.jsx` | `apps/save-app/src/app/(authenticated)/rentals/[id].tsx` | Notification deep links load and runtime-validate the authorized `/rentals/{id}` response. The screen is intentionally read-only; rental lists and transition actions remain unimplemented. | Pass: item ID, status, and dates come from the validated response; no sample rental is rendered in production. | Not run; Android notification opening and iPhone direct route opening require physical devices. |

The hardcoded-data audit covers the prohibited fixed tags, photo counter, trade total, and mock session tokens within `apps/save-app`, excluding `node_modules`. A passing audit means only that these forbidden values are absent; it does not prove an unimplemented screen has live data.

Authentication success responses are runtime-validated before normalization or SecureStore persistence. Catalog item, page, and recommendation responses are also runtime-validated before rendering. A malformed 2xx response becomes a protocol failure; it cannot install a session or render partial/fabricated catalog data.

## Local environment

1. Copy `apps/save-app/.env.example` to `apps/save-app/.env.local`.
2. Keep `EXPO_PUBLIC_API_MODE=api`. The mobile client uses the existing shared server in `backend`.
3. For an Android emulator with the backend running on the host, use `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api/v1`.
4. For a physical device, replace `10.0.2.2` with the development host's LAN address and ensure the device can reach that host and port.
5. Configure Google Cloud and the applications only through `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and the backend `GOOGLE_CLIENT_IDS`. Do not commit their values.

## Milestone verification

Run backend Gradle with its cache under `/tmp`:

```bash
cd backend
GRADLE_USER_HOME=/tmp/save-expo-gradle bash gradlew test
cd ..
npm --prefix apps/save-app test
npm --prefix apps/save-app run typecheck
npm --prefix apps/save-app run lint
cd apps/save-app
npx expo export --platform android --output-dir /tmp/save-expo-auth-export
```

The Android export is disposable build output under `/tmp`; it is not application source and should not be committed.

Latest results from 2026-08-18:

| Check | Result |
| --- | --- |
| Backend tests | Prior pass retained; the catalog UI milestone did not change `backend/`. |
| Expo tests | Pass: 16 suites and 117 tests. |
| TypeScript | Pass: `tsc --noEmit` exited 0. |
| ESLint | Pass: `expo lint` exited 0. |
| Web regression tests | Pass: 38 files and 101 tests. |
| Android export | Pass: Metro bundled 1,294 modules and wrote `_expo/static/js/android/entry-f69f6ddcbcde292128b4266efcdd2a8a.hbc` plus `metadata.json` under `/tmp/save-expo-catalog-final-20260818`. |
| Forbidden hardcoded content | Pass: the required `rg` audit returned no matches. |
| Production dependency audit | Reviewed: 23 findings (15 high, 8 moderate, 0 critical); suggested fixes are incompatible SDK/RN downgrades and were not applied. |
| Full dependency audit | Reviewed: the same 23 findings, with no additional dev-only advisory delta. |

The first Android export attempt found route tests under `src/app` and failed because Expo Router included them in its production route context. Moving those tests, without changing production route code, to `src/__tests__` made the focused tests, full checks, and export pass.

### Expo chat milestone results from 2026-08-23

| Check | Result |
| --- | --- |
| Backend tests | Pass: the full Gradle suite, including the authenticated real STOMP broker gate and cursor pagination integration test. |
| Web regression tests | Pass: 42 files and 130 tests. |
| Expo tests | Pass: 22 suites and 162 tests. |
| TypeScript | Pass: `tsc --noEmit` exited 0. |
| ESLint | Pass: `expo lint` exited 0. |
| Android export | Pass: Metro bundled 1,318 modules and wrote `_expo/static/js/android/entry-dd2895f30e2c5c63faf74424860214dd.hbc` plus `metadata.json` under `/tmp/save-expo-chat-android`. |
| Chat hardcoded-content audit | Pass: the production chat/app search returned no sample chat, fake-chat, mock-token, or fixed test-message matches. |
| Physical Android/iPhone chat smoke | Not run: no physical devices were attached to this workspace. Do not promote Chats to `verified` until the two-account acceptance checks pass. |

## Follow-up delivery plans

Create separate plans for:

1. Item composition plus camera/gallery upload.
2. Rental and profile workflows.
3. Full rental transition UI and profile workflows after the read-only notification landing.

### Expo push milestone results from 2026-08-23

| Check | Result |
| --- | --- |
| Backend | Pass: full Gradle gate; pending Expo tickets are polled after 15 minutes, delivery status is updated, and `DeviceNotRegistered` tokens are disabled. |
| Web | Pass: 42 files and 130 tests, ESLint, and production Vite build. |
| Expo | Pass: 28 suites and 197 tests, TypeScript, and ESLint. Registration, token rotation, logout removal, routing, and read-only rental landing are covered. |
| Android export | Pass: Metro bundled 1,386 modules and wrote `_expo/static/js/android/entry-7f0aad7d2f8c064f6d319227c8536429.hbc` under `/tmp/save-expo-push-android`. |
| Android delivery path | Implemented but not device-verified: EAS build, FCM V1 delivery, and notification deep links remain `Not run` until credentials and a device are available. |
| iPhone scope | Expo Go core-flow rehearsal only; production iOS push and store distribution are not required for this milestone. |

Each plan must leave the app runnable and retain the same TDD, test, typecheck, lint, export, hardcoded-data, and physical-device verification gates.
