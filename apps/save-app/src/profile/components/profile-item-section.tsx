import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ItemCard } from '@/catalog/components/item-card';
import type { CatalogItem } from '@/catalog/types';
import { theme } from '@/theme';
import type { ResourceState } from '../use-my-page';

type Props = {
  title: string;
  emptyMessage: string;
  resource: ResourceState<CatalogItem[]>;
  onRetry: () => void;
  onItemPress: (item: CatalogItem) => void;
};

export function ProfileItemSection({
  title,
  emptyMessage,
  resource,
  onRetry,
  onItemPress,
}: Props) {
  const initialLoading = resource.loading && resource.data.length === 0;
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {initialLoading ? (
        <Text accessibilityLiveRegion="polite" style={styles.status}>{title}을 불러오는 중...</Text>
      ) : null}
      {resource.error ? (
        <View accessibilityRole="alert" style={styles.errorBox}>
          <Text style={styles.errorText}>{resource.error}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry}>
            <Text style={styles.retry}>{title} 다시 불러오기</Text>
          </Pressable>
        </View>
      ) : null}
      {!resource.loading && !resource.error && resource.data.length === 0 ? (
        <Text style={styles.empty}>{emptyMessage}</Text>
      ) : null}
      {resource.data.length > 0 ? (
        <View style={styles.list}>
          {resource.data.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              variant="row"
              onPress={() => onItemPress(item)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  title: { color: theme.colors.textStrong, fontSize: 17, fontWeight: '900' },
  status: { color: theme.colors.textSoft, fontSize: 13, paddingVertical: 12 },
  errorBox: { backgroundColor: '#fff1f2', borderRadius: 12, gap: 6, padding: 10 },
  errorText: { color: theme.colors.danger, fontSize: 12 },
  retry: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  empty: { backgroundColor: theme.colors.surface, borderRadius: 14, color: theme.colors.textSoft, fontSize: 13, padding: 16, textAlign: 'center' },
  list: { gap: 10 },
});
