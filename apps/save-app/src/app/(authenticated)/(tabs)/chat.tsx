import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenState } from '@/catalog/components/screen-state';
import { useChatStore } from '@/chat/store';
import type { ChatRoom } from '@/chat/types';
import { theme } from '@/theme';

function formatRoomTime(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

export default function ChatScreen() {
  const router = useRouter();
  const rooms = useChatStore(state => state.rooms);
  const loading = useChatStore(state => state.loadingRooms);
  const error = useChatStore(state => state.roomsError);
  const loadRooms = useChatStore(state => state.loadRooms);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  if (loading && rooms.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator
          accessibilityLabel="채팅 목록 불러오는 중"
          color={theme.colors.primary}
          size="large"
        />
      </SafeAreaView>
    );
  }

  if (error && rooms.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.title}>채팅</Text>
        <ScreenState error={error} onRetry={() => void loadRooms()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>채팅</Text>
      <FlatList
        contentContainerStyle={rooms.length === 0 ? styles.emptyList : styles.list}
        data={rooms}
        keyExtractor={room => String(room.id)}
        ListEmptyComponent={(
          <ScreenState empty emptyMessage="아직 시작된 채팅이 없습니다." />
        )}
        onRefresh={() => void loadRooms()}
        refreshing={loading}
        renderItem={({ item }) => (
          <RoomRow
            room={item}
            onPress={() => router.push({
              pathname: '/chats/[id]',
              params: { id: String(item.id) },
            })}
          />
        )}
      />
    </SafeAreaView>
  );
}

function RoomRow({ room, onPress }: { room: ChatRoom; onPress: () => void }) {
  const time = formatRoomTime(room.lastMessageAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${room.opponentName} ${room.itemTitle} 채팅 열기`}
      onPress={onPress}
      style={styles.room}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{room.opponentName.slice(0, 1)}</Text>
      </View>
      <View style={styles.roomBody}>
        <View style={styles.roomTitleRow}>
          <Text numberOfLines={1} style={styles.opponent}>{room.opponentName}</Text>
          {time ? <Text style={styles.time}>{time}</Text> : null}
        </View>
        <Text numberOfLines={1} style={styles.itemTitle}>{room.itemTitle}</Text>
        {room.lastMessage ? (
          <Text numberOfLines={1} style={styles.lastMessage}>{room.lastMessage}</Text>
        ) : (
          <Text style={styles.lastMessage}>아직 메시지가 없습니다.</Text>
        )}
      </View>
      {room.unreadCount > 0 ? (
        <View accessibilityLabel={`읽지 않은 메시지 ${room.unreadCount}개`} style={styles.badge}>
          <Text style={styles.badgeText}>{room.unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.canvas, flex: 1 },
  title: { color: theme.colors.textStrong, fontSize: 22, fontWeight: '900', paddingHorizontal: 18, paddingVertical: 16 },
  list: { gap: 10, paddingBottom: 24, paddingHorizontal: 14 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  room: { alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  avatar: { alignItems: 'center', backgroundColor: theme.colors.primarySoft, borderRadius: 25, height: 50, justifyContent: 'center', width: 50 },
  avatarText: { color: theme.colors.primary, fontSize: 18, fontWeight: '900' },
  roomBody: { flex: 1, gap: 4 },
  roomTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  opponent: { color: theme.colors.textStrong, flex: 1, fontSize: 14, fontWeight: '900' },
  time: { color: theme.colors.muted, fontSize: 10 },
  itemTitle: { color: theme.colors.text, fontSize: 12, fontWeight: '700' },
  lastMessage: { color: theme.colors.textSoft, fontSize: 12 },
  badge: { alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 14, justifyContent: 'center', minHeight: 28, minWidth: 28, paddingHorizontal: 7 },
  badgeText: { color: theme.colors.surface, fontSize: 11, fontWeight: '900' },
});
