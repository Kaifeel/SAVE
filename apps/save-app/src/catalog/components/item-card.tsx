import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';
import { formatFee, formatRelativeTime } from '../format';
import type { CatalogItem } from '../types';
import { ItemVisual } from './item-visual';

export function ItemCard({
  item,
  variant,
  onPress,
}: {
  item: CatalogItem;
  variant: 'grid' | 'row';
  onPress: () => void;
}) {
  const location = item.pickupLocationName ?? '장소 미정';
  if (variant === 'grid') {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 상세 보기`} onPress={onPress} style={styles.grid}>
        <ItemVisual imageUrl={item.imageUrls[0]} />
        <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
        <Text style={styles.fee}>{formatFee(item)}</Text>
        <Text numberOfLines={1} style={styles.meta}>⌖ {location}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} 상세 보기`} onPress={onPress} style={styles.row}>
      <ItemVisual compact imageUrl={item.imageUrls[0]} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text numberOfLines={1} style={[styles.title, styles.flex]}>{item.title}</Text>
          <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.fee}>{formatFee(item)}</Text>
        <Text numberOfLines={1} style={styles.meta}>⌖ {location}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { backgroundColor: theme.colors.surface, borderColor: '#f1f5f9', borderRadius: 18, borderWidth: 1, gap: 5, padding: 10, width: '48%' },
  row: { alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: '#f1f5f9', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 12 },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  title: { color: theme.colors.text, fontSize: 14, fontWeight: '800', marginTop: 3 },
  fee: { color: theme.colors.primary, fontSize: 14, fontWeight: '900' },
  meta: { color: theme.colors.textSoft, fontSize: 10 },
  time: { color: theme.colors.muted, fontSize: 10 },
});
