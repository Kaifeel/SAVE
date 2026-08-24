import { useEffect } from 'react';
import { Stack } from 'expo-router';

import { useAuthStore } from '@/auth/store';
import { useChatStore } from '@/chat/store';

export default function AuthenticatedLayout() {
  const accessToken = useAuthStore(state => state.accessToken);
  const connectRealtime = useChatStore(state => state.connectRealtime);
  const disconnectRealtime = useChatStore(state => state.disconnectRealtime);

  useEffect(() => {
    if (!accessToken) return undefined;
    connectRealtime(accessToken);
    return () => { void disconnectRealtime(); };
  }, [accessToken, connectRealtime, disconnectRealtime]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="items/[id]" />
      <Stack.Screen name="users/[id]" />
      <Stack.Screen name="chats/[id]" />
      <Stack.Screen name="rentals/index" />
      <Stack.Screen name="rentals/[id]" />
    </Stack>
  );
}
