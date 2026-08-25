# SAVE mobile app

This is the canonical Expo application for SAVE. It uses Expo Router with routes under `src/app` and the existing shared Spring Boot server in `../../backend`.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Keep `EXPO_PUBLIC_API_MODE=api` for real authentication. While the signup backend is unavailable, development builds may use `EXPO_PUBLIC_API_MODE=mock`; this bypasses only email signup with an in-memory session and is rejected by production configuration. In local Expo LAN mode, the app derives `http://<Expo host>:8080/api/v1` when `EXPO_PUBLIC_API_BASE_URL` is empty. Set the variable explicitly for an Android emulator (`http://10.0.2.2:8080/api/v1`), Expo tunnel, nonstandard backend port, HTTPS server, or production build.
4. Configure Google Cloud and the apps using `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and backend `GOOGLE_CLIENT_IDS`. Keep all values local and do not commit `.env.local`.
5. Start the configured existing backend, then start Expo with `npm run start`.

After authentication, Home, Explore, item detail, item creation, camera/gallery upload, chat, rental requests and status actions, reviews, notification settings, and profiles use the shared backend. Chat uses authenticated STOMP plus REST recovery. The mobile client never substitutes mock catalog, chat, or rental records when those endpoints are empty or unavailable.

Item detail keeps the tab bar available, supports native sharing, and pages multiple images without cropping them. Rental requests use the system date/time picker on Android and iOS. The web target uses a text date/time fallback because the native picker is not available in a browser.

## Push notifications and EAS

Android remote push requires an EAS development or preview build; Android Expo Go cannot receive remote push on Expo SDK 54. iPhone Expo Go remains supported for the capstone core-flow rehearsal, but production iOS push and App Store/TestFlight distribution are outside this milestone.

1. Sign in to the Expo account and link this directory to an EAS project with `npx eas-cli@latest init`. The generated EAS project ID is read at runtime from `Constants.easConfig.projectId`; do not invent or hardcode it.
2. In both the EAS `development` and `preview` environments, configure `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_API_MODE=api`, and the three `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` values. Client-side `EXPO_PUBLIC_*` values are visible in the app bundle and are not secrets.
3. Upload Android `google-services.json` as an EAS file environment variable named `GOOGLE_SERVICES_JSON`. `app.config.ts` adds its temporary build path to the native config. Do not commit the local file.
4. Upload the matching FCM V1 service-account key through EAS Credentials. That private key belongs in the EAS credential store, never in this repository or the Spring backend.
5. Create an Android developer build with `npx eas-cli@latest build --platform android --profile development`, or a production-like internal APK with `npx eas-cli@latest build --platform android --profile preview`.

The fixed Android application ID is `com.save.capstone`. It is application identity, not sample data; changing it later creates a different Android app and requires new EAS/FCM credentials.

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
npx expo export --platform android --output-dir /tmp/save-expo-push-android
```

Physical-device checks remain required for Google OAuth, SecureStore restoration, camera/gallery permissions, push delivery/deep links, remote catalog images, horizontal image paging, native sharing, native date/time selection, STOMP reconnect, and Android system-back behavior. These features are implemented, but an automated test or platform export does not replace real-device checks. Use [`../../docs/capstone-demo-checklist.md`](../../docs/capstone-demo-checklist.md) for rehearsal evidence and [`../../docs/mobile-ui-parity.md`](../../docs/mobile-ui-parity.md) for screen status.

## Dependency audit disposition

The latest dependency installation on 2026-08-23 reported 16 findings: 11 moderate, 5 high, and 0 critical. They remain in the Expo/React Native build dependency graph. No automatic `npm audit fix` was applied because forced remediation can cross the SDK compatibility boundary; re-evaluate against SDK-compatible upstream releases.
