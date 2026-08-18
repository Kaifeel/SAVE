# SAVE mobile app

This is the canonical Expo application for SAVE. It uses Expo Router with routes under `src/app` and the existing shared Spring Boot server in `../../backend`.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Keep `EXPO_PUBLIC_API_MODE=api`. For an Android emulator with the backend on the development host, use `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api/v1`. For a physical device, replace `10.0.2.2` with the host's LAN address and ensure the device can reach the server.
4. Configure Google Cloud and the apps using `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and backend `GOOGLE_CLIENT_IDS`. Keep all values local and do not commit `.env.local`.
5. Start the configured existing backend, then start Expo with `npm run start`.

After authentication, Home, Explore, and Item detail read real data from the existing `/api/v1/items`, `/api/v1/recommendations`, and wishlist endpoints. The mobile client never substitutes mock catalog records when those endpoints are empty or unavailable. Item creation, camera/gallery upload, rental, profile, and chat remain later milestones.

## Verification

From the repository root, run:

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

Physical-device checks remain required for Google OAuth, SecureStore restoration, remote catalog images, horizontal image paging, and Android system-back behavior. Camera access is not implemented yet. An automated test or Android export does not replace those checks. Current screen-by-screen implementation and device status is recorded in [`../../docs/mobile-ui-parity.md`](../../docs/mobile-ui-parity.md).

## Dependency audit disposition

On 2026-08-18, both `npm audit --omit=dev --json` and `npm audit --json` reported the same 23 package-level findings: 15 high, 8 moderate, and 0 critical. There was no additional dev-only advisory delta. The findings are in the Expo 57, React Native 0.86, Metro, and related build-tool dependency graph. npm's suggested automatic remediations would downgrade to incompatible Expo 53 or React Native 0.72-era versions, so no `npm audit fix` was applied. Re-evaluate against SDK-compatible upstream releases rather than forcing those incompatible changes.
