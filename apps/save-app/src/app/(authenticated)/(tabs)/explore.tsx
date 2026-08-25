import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/store';
import { ItemCard } from '@/catalog/components/item-card';
import { ScreenState } from '@/catalog/components/screen-state';
import { useExploreCatalog } from '@/catalog/use-explore-catalog';
import { theme } from '@/theme';

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string | string[] }>();
  const initialQuery = Array.isArray(params.query) ? params.query[0] ?? '' : params.query ?? '';
  const universityId = useAuthStore(state => state.user?.universityId);
  const catalog = useExploreCatalog(initialQuery, universityId);
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.headingRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" onPress={goBack} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.heading}>물품 탐색</Text>
        <View style={styles.back} />
      </View>
      <View style={styles.tabs}>
        <BoardButton active={catalog.type === 'LEND'} label="물품 빌려주기" onPress={() => catalog.setType('LEND')} />
        <BoardButton active={catalog.type === 'BORROW'} label="물품 빌리기" onPress={() => catalog.setType('BORROW')} />
      </View>
      <View style={styles.search}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          accessibilityLabel="탐색 검색어"
          placeholder="장소, 물품명 검색..."
          placeholderTextColor={theme.colors.muted}
          value={catalog.query}
          onChangeText={catalog.setQuery}
          style={styles.searchInput}
        />
      </View>
      <View style={styles.filter}>
        <Text style={styles.filterText}>
          {catalog.type === 'BORROW' ? '대여 희망 물품만 보기' : '대여 가능 물품만 보기'}
        </Text>
        <Switch
          accessibilityLabel="대여 가능 여부 필터"
          value={catalog.onlyAvailable}
          onValueChange={catalog.setOnlyAvailable}
          trackColor={{ false: '#e2e8f0', true: theme.colors.primary }}
        />
      </View>

      {catalog.loading || catalog.error || catalog.items.length === 0 ? (
        <ScreenState
          loading={catalog.loading}
          error={catalog.error}
          empty={!catalog.loading && !catalog.error && catalog.items.length === 0}
          emptyMessage="등록된 물품이 없습니다."
          onRetry={catalog.retry}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={catalog.items}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              variant="row"
              onPress={() => router.push({ pathname: '/items/[id]', params: { id: String(item.id) } })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function BoardButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.canvas, flex: 1, paddingHorizontal: 20, paddingTop: 18 },
  headingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  heading: { color: theme.colors.text, fontSize: 20, fontWeight: '900' },
  back: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
  backText: { color: theme.colors.text, fontSize: 32, lineHeight: 34 },
  tabs: { backgroundColor: '#f1f5f9', borderRadius: 16, flexDirection: 'row', gap: 4, marginBottom: 12, padding: 4 },
  tab: { alignItems: 'center', borderRadius: 12, flex: 1, paddingVertical: 10 },
  tabActive: { backgroundColor: theme.colors.surface },
  tabText: { color: theme.colors.muted, fontSize: 12, fontWeight: '800' },
  tabTextActive: { color: theme.colors.text },
  search: { alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 16, flexDirection: 'row', marginBottom: 12, paddingHorizontal: 14 },
  searchIcon: { color: theme.colors.muted, fontSize: 20, marginRight: 7 },
  searchInput: { color: theme.colors.text, flex: 1, fontSize: 15, minHeight: 48 },
  filter: { alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: '#f1f5f9', borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 14, paddingVertical: 8 },
  filterText: { color: theme.colors.text, fontSize: 12, fontWeight: '800' },
  list: { gap: 10, paddingBottom: 28 },
});
