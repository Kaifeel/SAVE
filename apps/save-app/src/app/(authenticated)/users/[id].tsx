import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CatalogItem } from '@/catalog/types';
import { ProfileItemSection } from '@/profile/components/profile-item-section';
import { PublicProfileHeader } from '@/profile/components/public-profile-header';
import { PublicReviewSection } from '@/profile/components/public-review-section';
import { usePublicProfile } from '@/profile/use-public-profile';
import { theme } from '@/theme';

function routeUserId(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default function PublicProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const userId = routeUserId(params.id);
  const page = usePublicProfile(userId);

  const openItem = (item: CatalogItem) => {
    router.push({ pathname: '/items/[id]', params: { id: String(item.id) } });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.navigation}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" onPress={router.back} style={styles.back}>
          <Text style={styles.backLabel}>‹</Text>
        </Pressable>
        <Text style={styles.navigationTitle}>작성자 프로필</Text>
        <View style={styles.spacer} />
      </View>
      {!userId ? (
        <View accessibilityRole="alert" style={styles.routeError}>
          <Text style={styles.routeErrorText}>올바르지 않은 사용자 경로입니다.</Text>
        </View>
      ) : (
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
          <PublicProfileHeader
            resource={page.profile}
            onRetry={() => { void page.reload('profile'); }}
          />
          <PublicReviewSection
            resource={page.reviews}
            onRetry={() => { void page.reload('reviews'); }}
          />
          <ProfileItemSection
            title="등록 물품"
            emptyMessage="등록된 물품이 없습니다."
            resource={page.items}
            onRetry={() => { void page.reload('items'); }}
            onItemPress={openItem}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: theme.colors.canvas, flex: 1 },
  navigation: { alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, borderBottomWidth: 1, flexDirection: 'row', height: 54, justifyContent: 'space-between', paddingHorizontal: 12 },
  back: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
  backLabel: { color: theme.colors.text, fontSize: 32, lineHeight: 34 },
  navigationTitle: { color: theme.colors.textStrong, fontSize: 14, fontWeight: '900' },
  spacer: { width: 38 },
  content: { gap: 24, paddingBottom: 60, paddingHorizontal: 20, paddingTop: 22 },
  routeError: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  routeErrorText: { color: theme.colors.danger, fontSize: 14, fontWeight: '700' },
});
