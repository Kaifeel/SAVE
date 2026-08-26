import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

type TabName = 'chat' | 'create' | 'explore' | 'home' | 'my';

const routeIcons: Record<string, TabName> = {
  index: 'home',
  explore: 'explore',
  create: 'create',
  chat: 'chat',
  my: 'my',
};

export default function TabsLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.muted,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name={routeIcons[route.name]} />
          ),
          tabBarIconStyle: styles.iconSlot,
          tabBarItemStyle: styles.tabItem,
          tabBarLabelStyle: styles.tabLabel,
          tabBarStyle: styles.tabBar,
        })}
      >
        <Tabs.Screen name="index" options={{ title: '홈' }} />
        <Tabs.Screen name="explore" options={{ title: '탐색' }} />
        <Tabs.Screen name="create" options={{ title: '글쓰기' }} />
        <Tabs.Screen name="chat" options={{ title: '채팅' }} />
        <Tabs.Screen name="my" options={{ title: '마이' }} />
        <Tabs.Screen name="items/[id]" options={{ href: null }} />
      </Tabs>
    </>
  );
}

function TabIcon({ color, focused, name }: { color: string; focused: boolean; name: TabName }) {
  if (name === 'create') {
    return (
      <View style={styles.createLift} testID="tab-icon-create">
        <View style={styles.createCircle}>
          <View style={styles.plusHorizontal} />
          <View style={styles.plusVertical} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.iconColumn} testID={`tab-icon-${name}`}>
      <View style={styles.iconCanvas}>
        {name === 'home' ? <HomeIcon color={color} /> : null}
        {name === 'explore' ? <SearchIcon color={color} /> : null}
        {name === 'chat' ? <ChatIcon color={color} /> : null}
        {name === 'my' ? <UserIcon color={color} /> : null}
      </View>
      {focused ? <View style={styles.activeDot} testID={`tab-active-dot-${name}`} /> : null}
    </View>
  );
}

function HomeIcon({ color }: { color: string }) {
  return <View style={styles.homeIcon}><View style={[styles.homeRoof, { borderColor: color }]} /><View style={[styles.homeBody, { borderColor: color }]} /></View>;
}

function SearchIcon({ color }: { color: string }) {
  return <View style={styles.searchIcon}><View style={[styles.searchCircle, { borderColor: color }]} /><View style={[styles.searchHandle, { backgroundColor: color }]} /></View>;
}

function ChatIcon({ color }: { color: string }) {
  return <View style={styles.chatIcon}><View style={[styles.chatBubble, { borderColor: color }]} /><View style={[styles.chatTail, { borderBottomColor: color }]} /></View>;
}

function UserIcon({ color }: { color: string }) {
  return <View style={styles.userIcon}><View style={[styles.userHead, { borderColor: color }]} /><View style={[styles.userBody, { borderColor: color }]} /></View>;
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, borderTopWidth: 1, elevation: 12, height: 72, paddingBottom: 8, paddingHorizontal: 8, paddingTop: 9, shadowColor: '#0f172a', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
  tabItem: { paddingTop: 1 },
  tabLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  iconSlot: { overflow: 'visible' },
  iconColumn: { alignItems: 'center', height: 30, justifyContent: 'flex-start', width: 30 },
  iconCanvas: { height: 24, width: 24 },
  activeDot: { backgroundColor: theme.colors.primary, borderRadius: 2, bottom: 0, height: 4, position: 'absolute', width: 4 },
  createLift: { alignItems: 'center', height: 50, justifyContent: 'center', transform: [{ translateY: -10 }], width: 52 },
  createCircle: { alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 24, elevation: 8, height: 48, justifyContent: 'center', shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 8, width: 48 },
  plusHorizontal: { backgroundColor: '#ffffff', borderRadius: 2, height: 3, position: 'absolute', width: 22 },
  plusVertical: { backgroundColor: '#ffffff', borderRadius: 2, height: 22, position: 'absolute', width: 3 },
  homeIcon: { height: 24, width: 24 },
  homeRoof: { borderLeftWidth: 2, borderTopWidth: 2, height: 14, left: 5, position: 'absolute', top: 2, transform: [{ rotate: '45deg' }], width: 14 },
  homeBody: { borderBottomLeftRadius: 2, borderBottomRightRadius: 2, borderBottomWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, bottom: 1, height: 13, left: 4, position: 'absolute', width: 16 },
  searchIcon: { height: 24, width: 24 },
  searchCircle: { borderRadius: 8, borderWidth: 2, height: 16, left: 2, position: 'absolute', top: 2, width: 16 },
  searchHandle: { borderRadius: 1, height: 2, position: 'absolute', right: 1, top: 17, transform: [{ rotate: '45deg' }], width: 8 },
  chatIcon: { height: 24, width: 24 },
  chatBubble: { borderRadius: 4, borderWidth: 2, height: 17, left: 2, position: 'absolute', top: 2, width: 20 },
  chatTail: { borderBottomWidth: 2, bottom: 2, height: 7, left: 5, position: 'absolute', transform: [{ rotate: '-35deg' }], width: 7 },
  userIcon: { height: 24, width: 24 },
  userHead: { borderRadius: 5, borderWidth: 2, height: 10, left: 7, position: 'absolute', top: 1, width: 10 },
  userBody: { borderBottomWidth: 0, borderLeftWidth: 2, borderRadius: 9, borderRightWidth: 2, borderTopWidth: 2, bottom: 0, height: 10, left: 3, position: 'absolute', width: 18 },
});
