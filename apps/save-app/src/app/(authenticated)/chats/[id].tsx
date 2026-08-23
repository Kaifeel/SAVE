import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/store';
import { useChatStore, type TimelineMessage } from '@/chat/store';
import { theme } from '@/theme';

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const parsedId = rawId ? Number(rawId) : Number.NaN;
  const roomId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const currentUserId = useAuthStore(state => state.user?.id ?? null);
  const rooms = useChatStore(state => state.rooms);
  const messages = useChatStore(state => state.messages);
  const loadingMessages = useChatStore(state => state.loadingMessages);
  const loadingOlder = useChatStore(state => state.loadingOlder);
  const hasOlder = useChatStore(state => state.hasOlder);
  const messagesError = useChatStore(state => state.messagesError);
  const socketState = useChatStore(state => state.socketState);
  const openRoom = useChatStore(state => state.openRoom);
  const closeRoom = useChatStore(state => state.closeRoom);
  const loadOlder = useChatStore(state => state.loadOlder);
  const send = useChatStore(state => state.send);
  const retry = useChatStore(state => state.retry);
  const [input, setInput] = useState('');
  const room = rooms.find(entry => entry.id === roomId);

  useEffect(() => {
    if (roomId === null) return undefined;
    void openRoom(roomId);
    return closeRoom;
  }, [closeRoom, openRoom, roomId]);

  if (roomId === null) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header title="채팅방을 찾을 수 없습니다." subtitle={null} onBack={router.back} />
        <View style={styles.center}><Text style={styles.empty}>채팅방을 찾을 수 없습니다.</Text></View>
      </SafeAreaView>
    );
  }

  const submit = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await send(text);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <Header
          title={room?.opponentName ?? '채팅 상대 정보 없음'}
          subtitle={room?.itemTitle ?? '물품 정보 없음'}
          onBack={router.back}
        />
        {socketState !== 'connected' ? (
          <Text accessibilityRole="alert" style={styles.connection}>
            실시간 연결을 복구하는 중...
          </Text>
        ) : null}
        {loadingMessages && messages.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator
              accessibilityLabel="메시지 불러오는 중"
              color={theme.colors.primary}
            />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={styles.messages}
            data={messages}
            keyExtractor={message => String(message.id)}
            ListHeaderComponent={hasOlder ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전 메시지 보기"
                disabled={loadingOlder}
                onPress={() => void loadOlder()}
                style={styles.olderButton}
              >
                <Text style={styles.olderText}>
                  {loadingOlder ? '이전 메시지를 불러오는 중...' : '이전 메시지 보기'}
                </Text>
              </Pressable>
            ) : null}
            ListEmptyComponent={<Text style={styles.empty}>아직 메시지가 없습니다.</Text>}
            renderItem={({ item }) => (
              <MessageBubble
                currentUserId={currentUserId}
                message={item}
                onRetry={() => item.clientId && void retry(item.clientId)}
              />
            )}
          />
        )}
        {messagesError ? <Text accessibilityRole="alert" style={styles.error}>{messagesError}</Text> : null}
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="메시지 입력"
            onChangeText={setInput}
            onSubmitEditing={() => void submit()}
            placeholder="메시지 입력..."
            placeholderTextColor={theme.colors.muted}
            returnKeyType="send"
            style={styles.input}
            value={input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="메시지 보내기"
            disabled={!input.trim()}
            onPress={() => void submit()}
            style={[styles.sendButton, !input.trim() && styles.sendDisabled]}
          >
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ title, subtitle, onBack }: {
  title: string;
  subtitle: string | null;
  onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>←</Text>
      </Pressable>
      <View style={styles.headerBody}>
        <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function MessageBubble({ message, currentUserId, onRetry }: {
  message: TimelineMessage;
  currentUserId: number | null;
  onRetry: () => void;
}) {
  const mine = message.senderId === currentUserId;
  return (
    <View style={[styles.messageRow, mine && styles.messageRowMine]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={mine ? styles.messageMine : styles.messageOther}>{message.message}</Text>
      </View>
      <View style={[styles.messageMeta, mine && styles.messageMetaMine]}>
        {message.deliveryStatus === 'sending' ? <Text style={styles.meta}>전송 중</Text> : null}
        {message.deliveryStatus === 'failed' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${message.message} 재전송`}
            onPress={onRetry}
          >
            <Text style={styles.retry}>재전송</Text>
          </Pressable>
        ) : null}
        <Text style={styles.meta}>{formatMessageTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.canvas, flex: 1 },
  keyboard: { flex: 1 },
  header: { alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  back: { alignItems: 'center', borderColor: theme.colors.border, borderRadius: 19, borderWidth: 1, height: 38, justifyContent: 'center', width: 38 },
  backText: { color: theme.colors.text, fontSize: 19, fontWeight: '800' },
  headerBody: { flex: 1, gap: 2 },
  headerTitle: { color: theme.colors.textStrong, fontSize: 15, fontWeight: '900' },
  headerSubtitle: { color: theme.colors.textSoft, fontSize: 11, fontWeight: '600' },
  connection: { backgroundColor: '#f1f5f9', color: theme.colors.textSoft, fontSize: 10, fontWeight: '700', paddingVertical: 5, textAlign: 'center' },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  messages: { flexGrow: 1, gap: 10, padding: 14 },
  olderButton: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 7 },
  olderText: { color: theme.colors.textSoft, fontSize: 11, fontWeight: '800' },
  empty: { color: theme.colors.textSoft, fontSize: 13, fontWeight: '600', padding: 24, textAlign: 'center' },
  messageRow: { alignItems: 'flex-start' },
  messageRowMine: { alignItems: 'flex-end' },
  bubble: { borderRadius: 17, maxWidth: '78%', paddingHorizontal: 13, paddingVertical: 10 },
  bubbleMine: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 5 },
  bubbleOther: { backgroundColor: theme.colors.surface, borderBottomLeftRadius: 5, borderColor: theme.colors.border, borderWidth: 1 },
  messageMine: { color: theme.colors.surface, fontSize: 13, lineHeight: 19 },
  messageOther: { color: theme.colors.text, fontSize: 13, lineHeight: 19 },
  messageMeta: { flexDirection: 'row', gap: 5, marginTop: 4 },
  messageMetaMine: { justifyContent: 'flex-end' },
  meta: { color: theme.colors.muted, fontSize: 9 },
  retry: { color: theme.colors.danger, fontSize: 10, fontWeight: '800' },
  error: { color: theme.colors.danger, fontSize: 11, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 5, textAlign: 'center' },
  composer: { alignItems: 'center', backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 8, padding: 10 },
  input: { backgroundColor: '#f1f5f9', borderRadius: 20, color: theme.colors.text, flex: 1, fontSize: 13, paddingHorizontal: 15, paddingVertical: 11 },
  sendButton: { alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  sendDisabled: { backgroundColor: theme.colors.border },
  sendText: { color: theme.colors.surface, fontSize: 18, fontWeight: '900' },
});
