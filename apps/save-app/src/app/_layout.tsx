import { Stack } from 'expo-router';

import { useAuthStore } from '@/auth/store';
import { AppBootstrap } from '@/components/app-bootstrap';
import { NotificationCoordinator } from '@/notifications/coordinator';

export default function RootLayout() {
  const status = useAuthStore(state => state.status);
  const authenticated = status === 'authenticated';
  const accessToken = useAuthStore(state => state.accessToken);

  return (
    <AppBootstrap>
      {authenticated && accessToken ? <NotificationCoordinator accessToken={accessToken} /> : null}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={authenticated}>
          <Stack.Screen name="(authenticated)" />
        </Stack.Protected>
        <Stack.Protected guard={!authenticated}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
        </Stack.Protected>
      </Stack>
    </AppBootstrap>
  );
}
