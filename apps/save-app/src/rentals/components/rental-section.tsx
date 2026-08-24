import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';
import {
  availableActions,
  formatRentalDate,
  rentalActionLabel,
  rentalStatusLabel,
  reviewStateLabel,
  type RentalRole,
} from '../presentation';
import type { Rental, RentalAction } from '../types';

export function RentalSection({
  title,
  emptyMessage,
  rentals,
  role,
  pendingAction,
  onOpen,
  onAction,
  onReview,
}: {
  title: string;
  emptyMessage: string;
  rentals: Rental[];
  role: RentalRole;
  pendingAction: string | null;
  onOpen: (rental: Rental) => void;
  onAction: (rental: Rental, action: RentalAction) => void;
  onReview: (rental: Rental) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{rentals.length}건</Text>
      </View>
      {rentals.length === 0 ? <Text style={styles.empty}>{emptyMessage}</Text> : null}
      {rentals.map(rental => {
        const actions = availableActions(rental, role);
        const busy = pendingAction?.startsWith(`${rental.id}:`) ?? false;
        return (
          <View key={rental.id} style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`물품 ${rental.itemId} 대여 상세 보기`}
              onPress={() => onOpen(rental)}
              style={styles.summary}
            >
              <View style={styles.summaryTop}>
                <Text style={styles.item}>물품 #{rental.itemId}</Text>
                <Text style={styles.status}>{rentalStatusLabel[rental.status]}</Text>
              </View>
              <Text style={styles.period}>
                {formatRentalDate(rental.startDate)} ~ {formatRentalDate(rental.endDate)}
              </Text>
              <Text style={styles.price}>{rental.totalPrice.toLocaleString('ko-KR')}원</Text>
            </Pressable>
            {actions.length > 0 || rental.reviewState === 'AVAILABLE' ? (
              <View style={styles.actions}>
                {actions.map(action => (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    key={action}
                    onPress={() => onAction(rental, action)}
                    style={[styles.action, action === 'reject' && styles.secondary, busy && styles.disabled]}
                  >
                    <Text style={[styles.actionText, action === 'reject' && styles.secondaryText]}>
                      {rentalActionLabel[action]}
                    </Text>
                  </Pressable>
                ))}
                {rental.reviewState === 'AVAILABLE' ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => onReview(rental)}
                    style={[styles.review, busy && styles.disabled]}
                  >
                    <Text style={styles.reviewText}>후기 작성</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {reviewStateLabel[rental.reviewState] ? (
              <Text style={styles.reviewState}>{reviewStateLabel[rental.reviewState]}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: theme.colors.textStrong, fontSize: 17, fontWeight: '900' },
  count: { color: theme.colors.muted, fontSize: 12, fontWeight: '700' },
  empty: { backgroundColor: theme.colors.surface, borderRadius: 14, color: theme.colors.textSoft, fontSize: 13, padding: 20, textAlign: 'center' },
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 16, borderWidth: 1, gap: 12, padding: 15 },
  summary: { gap: 6 },
  summaryTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  item: { color: theme.colors.textStrong, fontSize: 14, fontWeight: '900' },
  status: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  period: { color: theme.colors.textSoft, fontSize: 12 },
  price: { color: theme.colors.text, fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  actionText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  secondary: { backgroundColor: '#fff1f2' },
  secondaryText: { color: theme.colors.danger },
  review: { backgroundColor: '#f59e0b', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  reviewText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  reviewState: { color: theme.colors.textSoft, fontSize: 11, fontWeight: '700' },
});
