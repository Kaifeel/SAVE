import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuthStore } from '@/auth/store';
import { ItemCard } from '@/catalog/components/item-card';
import { ScreenState } from '@/catalog/components/screen-state';
import { useHomeCatalog } from '@/catalog/use-home-catalog';
import { theme } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const [query, setQuery] = useState('');
  const catalog = useHomeCatalog(user?.universityId);
  const openItem = (id: number) => router.push({ pathname: '/items/[id]', params: { id: String(id) } });
  const openExplore = () => router.push({ pathname: '/explore', params: { query: query.trim() } });

  if (catalog.loading) {
    return <View style={styles.screen}><ScreenState loading /></View>;
  }
  if (catalog.error && catalog.popular.length === 0 && catalog.recent.length === 0) {
    return <View style={styles.screen}><ScreenState error={catalog.error} onRetry={catalog.retry} /></View>;
  }

  return (
    <ScrollView
      style={styles.screen}
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

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.canvas, flex: 1 },
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
