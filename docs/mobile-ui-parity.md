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
| Signup | `implemented` | `src/pages/LoginPage.jsx` | `apps/save-app/src/app/signup.tsx` | Email signup is wired to the existing mobile auth API. The current form does not fabricate university catalog data. | Pass: no forbidden values or mock tokens. | Not run. |
| Authentication shell | `implemented` | `src/App.jsx` | `apps/save-app/src/app/_layout.tsx`; `apps/save-app/src/app/(authenticated)/index.tsx`; `apps/save-app/src/components/app-bootstrap.tsx` | SecureStore refresh-token restoration, rotation, retry, and protected routing are wired to the existing mobile auth API and covered by automated tests. | Pass: no embedded sessions or mock token fallback. | Not run; SecureStore restoration and route behavior are not device-verified. |
| Home | `shell` | `src/pages/HomePage.jsx` | `apps/save-app/src/app/(authenticated)/(tabs)/index.tsx` | Not connected; the route renders only a title placeholder. | Pass: no product records or forbidden display values. | Not run. |
| Explore | `shell` | `src/pages/SearchPage.jsx` | `apps/save-app/src/app/(authenticated)/(tabs)/explore.tsx` | Not connected; the route renders only a title placeholder. | Pass: no product records or forbidden display values. | Not run. |
| Compose | `shell` | `src/components/ItemRegistrationModal.jsx` | `apps/save-app/src/app/(authenticated)/(tabs)/create.tsx` | Not connected; the route renders only a title placeholder. | Pass: no draft item, photo, or product fixture data. | Not run. |
| Chats | `shell` | `src/pages/ChatPage.jsx` | `apps/save-app/src/app/(authenticated)/(tabs)/chat.tsx`; planned `apps/save-app/src/app/(authenticated)/chats/[id].tsx` is absent | Not connected; the tab renders only a title placeholder and no chat-room route exists. | Pass: no chat rooms, notifications, messages, or forbidden display values. | Not run. |
| My | `shell` | `src/pages/MyPage.jsx` | `apps/save-app/src/app/(authenticated)/(tabs)/my.tsx` | Not connected; the route renders only a title placeholder. | Pass: no profile, rental, or notification fixture data. | Not run. |
| Item detail | `shell` | `src/ProductDetailPage.jsx` | Planned `apps/save-app/src/app/(authenticated)/items/[id].tsx` is absent | Not connected; no Expo route exists. | Not applicable: no Expo item-detail UI or data exists to audit. | Not run. |
| Public profile | `shell` | `src/pages/UserProfilePage.jsx` | Planned `apps/save-app/src/app/(authenticated)/users/[id].tsx` is absent | Not connected; no Expo route exists. | Not applicable: no Expo public-profile UI or data exists to audit. | Not run. |
| Rentals | `shell` | `src/pages/RentalsPage.jsx` | Planned routes under `apps/save-app/src/app/(authenticated)/rentals/` are absent | Not connected; no Expo rental list or detail route exists. | Not applicable: no Expo rentals UI or data exists to audit. | Not run. |

The hardcoded-data audit covers the prohibited fixed tags, photo counter, trade total, and mock session tokens within `apps/save-app`, excluding `node_modules`. A passing audit means only that these forbidden values are absent; it does not prove an unimplemented screen has live data.

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

Results from 2026-08-18:

| Check | Result |
| --- | --- |
| Backend tests | Pass: Gradle `BUILD SUCCESSFUL in 19s`; the test task executed. |
| Expo tests | Pass: 8 suites and 44 tests. |
| TypeScript | Pass: `tsc --noEmit` exited 0. |
| ESLint | Pass: `expo lint` exited 0. |
| Android export | Pass: Metro bundled 1,281 modules and wrote `_expo/static/js/android/entry-ef6b8d3cc5ebe54f0e9a913fa181e44f.hbc` plus `metadata.json` under `/tmp/save-expo-auth-export`. |
| Forbidden hardcoded content | Pass: the required `rg` audit returned no matches. |

The first Android export attempt found route tests under `src/app` and failed because Expo Router included them in its production route context. Moving those tests, without changing production route code, to `src/__tests__` made the focused tests, full checks, and export pass.

## Follow-up delivery plans

Create separate plans for:

1. Catalog UI parity and corrections to hardcoded web behavior.
2. Item composition plus rental and profile workflows.
3. Real-time chat and notifications.

Each plan must leave the app runnable and retain the same TDD, test, typecheck, lint, export, hardcoded-data, and physical-device verification gates.
