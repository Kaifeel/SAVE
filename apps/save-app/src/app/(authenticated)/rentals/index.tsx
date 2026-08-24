import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/store';
import { ScreenState } from '@/catalog/components/screen-state';
import { RentalSection } from '@/rentals/components/rental-section';
import { ReviewDialog } from '@/rentals/components/review-dialog';
import { rentalActionLabel } from '@/rentals/presentation';
import type { Rental, RentalAction } from '@/rentals/types';
import { useRentals } from '@/rentals/use-rentals';
import { theme } from '@/theme';

export default function RentalsScreen() {
  const router = useRouter();
  const userId = useAuthStore(state => state.user?.id ?? null);
  const data = useRentals(userId);
  const [reviewRental, setReviewRental] = useState<Rental | null>(null);

  const open = (rental: Rental) => {
    router.push({ pathname: '/rentals/[id]', params: { id: String(rental.id) } });
  };
  const act = (rental: Rental, action: RentalAction) => {
    Alert.alert(rentalActionLabel[action], '이 대여 상태를 변경하시겠습니까?', [
      { text: '아니요', style: 'cancel' },
      { text: '예', onPress: () => { void data.run(rental.id, action); } },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" onPress={router.back} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>대여 내역</Text>
        <View style={styles.placeholder} />
      </View>
      {data.loading && data.rentals.length === 0 ? <ScreenState loading /> : null}
      {!data.loading && data.error && data.rentals.length === 0 ? (
        <ScreenState error={data.error} onRetry={data.reload} />
      ) : null}
      {(!data.loading || data.rentals.length > 0) && (!data.error || data.rentals.length > 0) ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} tintColor={theme.colors.primary} />}
        >
          {data.actionError ? (
            <Pressable accessibilityRole="alert" onPress={data.clearActionError} style={styles.errorBox}>
              <Text style={styles.error}>{data.actionError}</Text>
            </Pressable>
          ) : null}
          <RentalSection
            emptyMessage="받은 대여 요청이 없습니다."
            onAction={act}
            onOpen={open}
            onReview={setReviewRental}
            pendingAction={data.pendingAction}
            rentals={data.received}
            role="lender"
            title="받은 요청"
          />
          <RentalSection
            emptyMessage="보낸 대여 요청이 없습니다."
            onAction={act}
            onOpen={open}
            onReview={setReviewRental}
            pendingAction={data.pendingAction}
            rentals={data.sent}
            role="borrower"
            title="보낸 요청"
          />
        </ScrollView>
      ) : null}
      <ReviewDialog
        onClose={() => setReviewRental(null)}
        onSubmit={input => reviewRental ? data.submitReview(reviewRental.id, input) : Promise.resolve(false)}
        submissionError={data.actionError}
        submitting={data.pendingAction === `${reviewRental?.id}:review`}
        visible={reviewRental !== null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.canvas, flex: 1 },
  header: { alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, borderBottomWidth: 1, flexDirection: 'row', height: 54, justifyContent: 'space-between', paddingHorizontal: 12 },
  back: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
  backText: { color: theme.colors.text, fontSize: 32, lineHeight: 34 },
  headerTitle: { color: theme.colors.textStrong, fontSize: 15, fontWeight: '900' },
  placeholder: { width: 38 },
  content: { gap: 24, paddingBottom: 60, paddingHorizontal: 20, paddingTop: 20 },
  errorBox: { backgroundColor: '#fff1f2', borderRadius: 12, padding: 12 },
  error: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
});
