# SAVE mobile app

This is the canonical Expo application for SAVE. It uses Expo Router with routes under `src/app` and the existing shared Spring Boot server in `../../backend`.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Keep `EXPO_PUBLIC_API_MODE=api`. For an Android emulator with the backend on the development host, use `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api/v1`. For a physical device, replace `10.0.2.2` with the host's LAN address and ensure the device can reach the server.
4. Configure Google Cloud and the apps using `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and backend `GOOGLE_CLIENT_IDS`. Keep all values local and do not commit `.env.local`.
5. Start the configured existing backend, then start Expo with `npm run start`.

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

Physical-device checks remain required for Google OAuth, SecureStore restoration, camera access, and Android system-back behavior. An automated test or Android export does not replace those checks. Current screen-by-screen implementation and device status is recorded in [`../../docs/mobile-ui-parity.md`](../../docs/mobile-ui-parity.md).
