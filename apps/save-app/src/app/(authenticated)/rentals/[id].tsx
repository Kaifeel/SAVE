import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/store';
import { ScreenState } from '@/catalog/components/screen-state';
import { ReviewDialog } from '@/rentals/components/review-dialog';
import {
  availableActions,
  formatRentalDate,
  rentalActionLabel,
  rentalRole,
  rentalStatusLabel,
  reviewStateLabel,
} from '@/rentals/presentation';
import type { RentalAction } from '@/rentals/types';
import { useRentalDetail } from '@/rentals/use-rental-detail';
import { theme } from '@/theme';

function routeRentalId(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default function RentalDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rentalId = routeRentalId(params.id);
  const userId = useAuthStore(state => state.user?.id ?? null);
  const detail = useRentalDetail(rentalId);
  const [reviewOpen, setReviewOpen] = useState(false);

  const confirm = (action: RentalAction) => {
    Alert.alert(
      rentalActionLabel[action],
      '이 대여 상태를 변경하시겠습니까?',
      [
        { text: '아니요', style: 'cancel' },
        { text: '예', onPress: () => { void detail.run(action); } },
      ],
    );
  };

  if (detail.loading && !detail.rental) {
    return <SafeAreaView style={styles.screen}><ScreenState loading /></SafeAreaView>;
  }
  if (!rentalId || detail.notFound) {
    return <Shell onBack={router.back}><ScreenState empty emptyMessage="대여 정보를 찾을 수 없습니다." /></Shell>;
  }
  if (!detail.rental) {
    return <Shell onBack={router.back}><ScreenState error={detail.error ?? '대여 정보를 불러오지 못했습니다.'} onRetry={detail.reload} /></Shell>;
  }

  const rental = detail.rental;
  const role = rentalRole(rental, userId);
  const actions = availableActions(rental, role);

  return (
    <Shell onBack={router.back}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.eyebrow}>{role === 'lender' ? '받은 요청' : '보낸 요청'}</Text>
            <Text style={styles.title}>대여 #{rental.id}</Text>
          </View>
          <Text style={styles.status}>{rentalStatusLabel[rental.status]}</Text>
        </View>
        <View style={styles.card}>
          <Row label="물품" value={`#${rental.itemId}`} />
          <Row label="시작" value={formatRentalDate(rental.startDate)} />
          <Row label="종료" value={formatRentalDate(rental.endDate)} />
          <Row label="총 금액" value={`${rental.totalPrice.toLocaleString('ko-KR')}원`} />
          {rental.returnedAt ? <Row label="반납 처리" value={formatRentalDate(rental.returnedAt)} /> : null}
        </View>
        <View style={styles.links}>
          <LinkButton label="물품 상세" onPress={() => router.push({ pathname: '/items/[id]', params: { id: String(rental.itemId) } })} />
          <LinkButton label="거래 채팅" onPress={() => router.push({ pathname: '/chats/[id]', params: { id: String(rental.chatRoomId) } })} />
        </View>
        {detail.error ? <Text accessibilityRole="alert" style={styles.error}>{detail.error}</Text> : null}
        {actions.length > 0 ? (
          <View style={styles.actions}>
            {actions.map(action => (
              <Pressable
                accessibilityRole="button"
                disabled={detail.pendingAction !== null}
                key={action}
                onPress={() => confirm(action)}
                style={[styles.primary, action === 'reject' && styles.danger, detail.pendingAction && styles.disabled]}
              >
                <Text style={styles.primaryText}>
                  {detail.pendingAction === action ? '처리 중' : rentalActionLabel[action]}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {rental.reviewState === 'AVAILABLE' ? (
          <Pressable accessibilityRole="button" onPress={() => setReviewOpen(true)} style={styles.reviewButton}>
            <Text style={styles.primaryText}>후기 작성</Text>
          </Pressable>
        ) : null}
        {reviewStateLabel[rental.reviewState] ? (
          <Text style={styles.reviewState}>{reviewStateLabel[rental.reviewState]}</Text>
        ) : null}
      </ScrollView>
      <ReviewDialog
        onClose={() => setReviewOpen(false)}
        onSubmit={detail.submitReview}
        submissionError={detail.error}
        submitting={detail.pendingAction === 'review'}
        visible={reviewOpen}
      />
    </Shell>
  );
}

function Shell({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>대여 상세</Text>
        <View style={styles.placeholder} />
      </View>
      {children}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}><Text style={styles.linkText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.canvas, flex: 1 },
  header: { alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, borderBottomWidth: 1, flexDirection: 'row', height: 54, justifyContent: 'space-between', paddingHorizontal: 12 },
  back: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
  backText: { color: theme.colors.text, fontSize: 32, lineHeight: 34 },
  headerTitle: { color: theme.colors.textStrong, fontSize: 15, fontWeight: '900' },
  placeholder: { width: 38 },
  content: { gap: 16, padding: 20 },
  titleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  titleCopy: { gap: 3 },
  eyebrow: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  title: { color: theme.colors.textStrong, fontSize: 24, fontWeight: '900' },
  status: { backgroundColor: theme.colors.primarySoft, borderRadius: 12, color: theme.colors.primary, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 7 },
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 16, borderWidth: 1, gap: 16, padding: 18 },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: theme.colors.textSoft, fontSize: 13 },
  value: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  links: { flexDirection: 'row', gap: 10 },
  link: { alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 12, borderWidth: 1, flex: 1, paddingVertical: 12 },
  linkText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10 },
  primary: { alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 13, flex: 1, paddingVertical: 14 },
  danger: { backgroundColor: theme.colors.danger },
  reviewButton: { alignItems: 'center', backgroundColor: '#f59e0b', borderRadius: 13, paddingVertical: 14 },
  primaryText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  error: { backgroundColor: '#fff1f2', borderRadius: 12, color: theme.colors.danger, fontSize: 12, padding: 12 },
  reviewState: { color: theme.colors.textSoft, fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
