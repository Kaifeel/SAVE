import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatRelativeTime } from '@/catalog/format';
import { theme } from '@/theme';
import type { PublicReview } from '../public-schema';
import type { ResourceState } from '../use-my-page';

export function PublicReviewSection({
  resource,
  onRetry,
}: {
  resource: ResourceState<PublicReview[]>;
  onRetry: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>받은 후기</Text>
        <Text style={styles.count}>{resource.data.length}개</Text>
      </View>
      {resource.loading && resource.data.length === 0 ? (
        <Text accessibilityLiveRegion="polite" style={styles.status}>후기를 불러오는 중입니다.</Text>
      ) : null}
      {resource.error ? (
        <View accessibilityRole="alert" style={styles.errorBox}>
          <Text style={styles.errorText}>{resource.error}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry}>
            <Text style={styles.retry}>후기 다시 불러오기</Text>
          </Pressable>
        </View>
      ) : null}
      {!resource.loading && !resource.error && resource.data.length === 0 ? (
        <Text style={styles.empty}>아직 공개된 후기가 없습니다.</Text>
      ) : null}
      {resource.data.map(review => (
        <View key={review.id} style={styles.card}>
          <View style={styles.reviewTop}>
            <Text accessibilityLabel={`${review.rating}점`} style={styles.stars}>
              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
            </Text>
            <Text style={styles.time}>{formatRelativeTime(review.createdAt)}</Text>
          </View>
          <Text style={styles.content}>{review.content}</Text>
          <Text style={styles.meta}>{review.reviewerName} · {review.itemTitle}</Text>
          <Text style={styles.role}>
            {review.revieweeRole === 'LENDER'
              ? '물품을 빌려주고 받은 후기'
              : '물품을 빌리고 받은 후기'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: theme.colors.textStrong, fontSize: 17, fontWeight: '900' },
  count: { color: theme.colors.muted, fontSize: 12, fontWeight: '700' },
  status: { color: theme.colors.textSoft, fontSize: 13, paddingVertical: 16 },
  empty: { backgroundColor: theme.colors.surface, borderRadius: 14, color: theme.colors.textSoft, fontSize: 13, padding: 20, textAlign: 'center' },
  errorBox: { backgroundColor: '#fff1f2', borderRadius: 12, gap: 6, padding: 10 },
  errorText: { color: theme.colors.danger, fontSize: 12 },
  retry: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  card: { backgroundColor: theme.colors.surface, borderColor: '#f1f5f9', borderRadius: 16, borderWidth: 1, gap: 8, padding: 14 },
  reviewTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  stars: { color: '#f59e0b', fontSize: 14 },
  time: { color: theme.colors.muted, fontSize: 10 },
  content: { color: theme.colors.text, fontSize: 13, lineHeight: 20 },
  meta: { color: theme.colors.textSoft, fontSize: 11, fontWeight: '700' },
  role: { color: theme.colors.primary, fontSize: 10, fontWeight: '700' },
});
