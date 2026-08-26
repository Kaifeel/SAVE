import { useCallback, useEffect, useRef, useState } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/store';
import { ItemCard } from '@/catalog/components/item-card';
import { ScreenState } from '@/catalog/components/screen-state';
import { useHomeCatalog } from '@/catalog/use-home-catalog';
import {
  getInAppNotifications,
  markAllInAppNotificationsRead,
  type InAppNotification,
} from '@/notifications/api';
import { theme } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const [query, setQuery] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const catalog = useHomeCatalog(user?.universityId);
  const refreshCatalog = catalog.refresh;
  const hasFocused = useRef(false);

  useFocusEffect(useCallback(() => {
    if (!hasFocused.current) {
      hasFocused.current = true;
      return;
    }
    void refreshCatalog();
  }, [refreshCatalog]));

  useEffect(() => {
    let active = true;
    void getInAppNotifications()
      .then(next => { if (active) setNotifications(next); })
      .catch(() => { if (active) setNotificationError('알림을 불러오지 못했습니다.'); })
      .finally(() => { if (active) setNotificationLoading(false); });
    return () => { active = false; };
  }, []);

  const markAllNotificationsRead = async () => {
    try {
      await markAllInAppNotificationsRead();
      setNotifications(current => current.map(notification => ({ ...notification, read: true })));
      setNotificationError(null);
    } catch {
      setNotificationError('알림을 읽음 처리하지 못했습니다.');
    }
  };

  const openItem = (id: number) => router.push({ pathname: '/items/[id]', params: { id: String(id) } });
  const openExplore = () => router.push({ pathname: '/explore', params: { query: query.trim() } });

  if (catalog.loading) {
    return <SafeAreaView edges={['top']} style={styles.screen}><ScreenState loading /></SafeAreaView>;
  }
  if (catalog.error && catalog.popular.length === 0 && catalog.recent.length === 0) {
    return <SafeAreaView edges={['top']} style={styles.screen}><ScreenState error={catalog.error} onRetry={catalog.retry} /></SafeAreaView>;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.location}>
          <Feather color={theme.colors.primary} name="map-pin" size={19} />
          <Text numberOfLines={1} style={styles.universityName}>
            {user?.universityName ?? '학교 정보 없음'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.serviceBadge}>
            <Text style={styles.serviceBadgeText}>SAVE 대여</Text>
          </View>
          <Pressable
            accessibilityLabel={notificationOpen ? '알림 닫기' : '알림 열기'}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setNotificationOpen(current => !current)}
            style={styles.notificationButton}
          >
            <Feather color={theme.colors.textSoft} name="bell" size={21} />
            {notifications.some(notification => !notification.read) ? (
              <View accessibilityLabel="읽지 않은 알림 있음" style={styles.unreadDot} />
            ) : null}
          </Pressable>
        </View>
        {notificationOpen ? (
          <View accessibilityLabel="알림 목록" role="dialog" style={styles.notificationPanel}>
            <View style={styles.notificationPanelHeader}>
              <Text style={styles.notificationPanelTitle}>알림</Text>
              <Pressable accessibilityRole="button" onPress={() => void markAllNotificationsRead()}>
                <Text style={styles.markAllText}>모두 읽음</Text>
              </Pressable>
            </View>
            {notificationLoading ? (
              <Text style={styles.notificationEmpty}>알림을 불러오는 중...</Text>
            ) : notificationError ? (
              <Text accessibilityRole="alert" style={styles.notificationError}>{notificationError}</Text>
            ) : notifications.length === 0 ? (
              <Text style={styles.notificationEmpty}>새로운 알림이 없습니다.</Text>
            ) : (
              <ScrollView style={styles.notificationList}>
                {notifications.map(notification => (
                  <View key={notification.id} style={[styles.notificationItem, !notification.read && styles.notificationItemUnread]}>
                    <View style={styles.notificationItemHeader}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationTime}>{formatNotificationTime(notification.createdAt)}</Text>
                    </View>
                    <Text style={styles.notificationContent}>{notification.content}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={catalog.refreshing} onRefresh={catalog.refresh} tintColor={theme.colors.primary} />}
      >
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          accessibilityLabel="물품 검색어"
          placeholder="빌리고 싶은 물건을 검색하세요"
          placeholderTextColor={theme.colors.muted}
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={openExplore}
          style={styles.searchInput}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="검색" onPress={openExplore}>
          <Text style={styles.searchButton}>검색</Text>
        </Pressable>
      </View>

      <View style={styles.recommendation}>
        <Text style={styles.recommendationTitle}>오늘의 AI 추천 물품</Text>
        <Text style={styles.recommendationHeadline}>
          {catalog.recommendation?.headline ?? '상황에 맞는 물품을 추천받아 보세요.'}
        </Text>
        {catalog.recommendation ? (
          <View style={styles.listGap}>
            {catalog.recommendation.items.slice(0, 2).map(item => (
              <ItemCard key={`recommend-${item.id}`} item={item} variant="row" onPress={() => openItem(item.id)} />
            ))}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="AI 추천 받기"
            disabled={!user?.department}
            onPress={() => user?.department && catalog.requestRecommendation(user.department)}
            style={styles.recommendationButton}
          >
            <Text style={styles.recommendationButtonText}>AI 추천 받기</Text>
          </Pressable>
        )}
      </View>

      <SectionTitle title="인기 대여 물품" onMore={openExplore} />
      {catalog.popular.length ? (
        <View style={styles.grid}>
          {catalog.popular.slice(0, 4).map(item => (
            <ItemCard key={`popular-${item.id}`} item={item} variant="grid" onPress={() => openItem(item.id)} />
          ))}
        </View>
      ) : <ScreenState empty emptyMessage="대여 가능한 물품이 없습니다." />}

      <SectionTitle title="방금 올라왔어요" onMore={openExplore} />
      {catalog.recent.length ? (
        <View style={styles.listGap}>
          {catalog.recent.map(item => (
            <ItemCard key={`recent-${item.id}`} item={item} variant="row" onPress={() => openItem(item.id)} />
          ))}
        </View>
      ) : <ScreenState empty emptyMessage="최근 등록된 물품이 없습니다." />}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title, onMore }: { title: string; onMore: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.title}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${title} 더보기`} onPress={onMore}>
        <Text style={styles.more}>더보기 ›</Text>
      </Pressable>
    </View>
  );
}

function formatNotificationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.canvas, flex: 1 },
  header: { alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: 20, position: 'relative', zIndex: 10 },
  location: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 6 },
  universityName: { color: theme.colors.text, flexShrink: 1, fontSize: 16, fontWeight: '900' },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  serviceBadge: { backgroundColor: theme.colors.primarySoft, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5 },
  serviceBadgeText: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  notificationButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  unreadDot: { backgroundColor: theme.colors.danger, borderColor: theme.colors.surface, borderRadius: 5, borderWidth: 2, height: 10, position: 'absolute', right: 5, top: 5, width: 10 },
  notificationPanel: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 16, borderWidth: 1, elevation: 12, maxHeight: 360, position: 'absolute', right: 12, shadowColor: '#0f172a', shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.16, shadowRadius: 14, top: 58, width: 288, zIndex: 20 },
  notificationPanelHeader: { alignItems: 'center', borderBottomColor: theme.colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  notificationPanelTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '900' },
  markAllText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  notificationEmpty: { color: theme.colors.muted, fontSize: 12, paddingHorizontal: 16, paddingVertical: 28, textAlign: 'center' },
  notificationError: { color: theme.colors.danger, fontSize: 12, paddingHorizontal: 16, paddingVertical: 24, textAlign: 'center' },
  notificationList: { maxHeight: 292 },
  notificationItem: { borderBottomColor: '#f1f5f9', borderBottomWidth: 1, gap: 4, paddingHorizontal: 16, paddingVertical: 12 },
  notificationItemUnread: { backgroundColor: theme.colors.primarySoft },
  notificationItemHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  notificationTitle: { color: theme.colors.primary, flex: 1, fontSize: 12, fontWeight: '900' },
  notificationTime: { color: theme.colors.muted, fontSize: 9 },
  notificationContent: { color: theme.colors.textSoft, fontSize: 12, lineHeight: 18 },
  content: { gap: 14, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 12 },
  searchWrap: { alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 16, flexDirection: 'row', paddingHorizontal: 14 },
  searchIcon: { color: theme.colors.muted, fontSize: 20, marginRight: 7 },
  searchInput: { color: theme.colors.text, flex: 1, fontSize: 15, minHeight: 48 },
  searchButton: { color: theme.colors.primary, fontSize: 12, fontWeight: '800', paddingVertical: 12 },
  recommendation: { backgroundColor: theme.colors.primarySoft, borderColor: '#c7d2fe', borderRadius: 24, borderWidth: 1, gap: 10, padding: 16 },
  recommendationTitle: { color: theme.colors.primaryText, fontSize: 17, fontWeight: '900' },
  recommendationHeadline: { color: theme.colors.primaryText, fontSize: 15, fontWeight: '700' },
  recommendationButton: { alignSelf: 'flex-start', backgroundColor: theme.colors.primary, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9 },
  recommendationButtonText: { color: theme.colors.surface, fontSize: 12, fontWeight: '800' },
  sectionTitle: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: '900' },
  more: { color: theme.colors.textSoft, fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  listGap: { gap: 10 },
});
