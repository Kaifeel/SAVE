import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/store';
import type { CatalogItem } from '@/catalog/types';
import { AccountActions } from '@/profile/components/account-actions';
import { MemberHeader } from '@/profile/components/member-header';
import { ProfileItemSection } from '@/profile/components/profile-item-section';
import { useMyPage } from '@/profile/use-my-page';
import { theme } from '@/theme';

export default function MyScreen() {
  const router = useRouter();
  const sessionUser = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const page = useMyPage();
  const logoutInFlight = useRef(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const openItem = (item: CatalogItem) => {
    router.push({ pathname: '/items/[id]', params: { id: String(item.id) } });
  };

  const runLogout = async () => {
    if (logoutInFlight.current) return;
    logoutInFlight.current = true;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
    } catch (error) {
      setLogoutError(
        error instanceof Error && error.message
          ? error.message
          : '로그아웃에 실패했습니다.',
      );
    } finally {
      logoutInFlight.current = false;
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={page.refreshing}
            tintColor={theme.colors.primary}
            onRefresh={() => { void page.refresh(); }}
          />
        )}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>마이</Text>
        <MemberHeader
          user={page.profile.data ?? sessionUser}
          loading={page.profile.loading}
          error={page.profile.error}
          onRetry={() => { void page.reload('profile'); }}
        />
        <ProfileItemSection
          title="등록 물품"
          emptyMessage="등록한 물품이 없습니다."
          resource={page.items}
          onRetry={() => { void page.reload('items'); }}
          onItemPress={openItem}
        />
        <ProfileItemSection
          title="찜 목록"
          emptyMessage="찜한 물품이 없습니다."
          resource={page.wishlist}
          onRetry={() => { void page.reload('wishlist'); }}
          onItemPress={openItem}
        />
        <AccountActions
          loggingOut={loggingOut}
          logoutError={logoutError}
          onOpenRentals={() => router.push('/rentals')}
          onOpenNotificationSettings={() => router.push('/notification-settings')}
          onLogout={() => { void runLogout(); }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: theme.colors.canvas, flex: 1 },
  content: { gap: 22, paddingBottom: 120, paddingHorizontal: 20, paddingTop: 18 },
  title: { color: theme.colors.textStrong, fontSize: 24, fontWeight: '900' },
});
