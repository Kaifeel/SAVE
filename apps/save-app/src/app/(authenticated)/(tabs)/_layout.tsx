import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { theme } from '@/theme';

const icons: Record<string, string> = {
  index: '⌂',
  explore: '⌕',
  create: '+',
  chat: '◌',
  my: '●',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>{icons[route.name]}</Text>,
      })}
    >
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="explore" options={{ title: '탐색' }} />
      <Tabs.Screen name="create" options={{ title: '글쓰기' }} />
      <Tabs.Screen name="chat" options={{ title: '채팅' }} />
      <Tabs.Screen name="my" options={{ title: '마이' }} />
    </Tabs>
  );
}
