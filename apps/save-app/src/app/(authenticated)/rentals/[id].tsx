import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { ScreenState } from '@/catalog/components/screen-state';
import { getRental } from '@/rentals/api';
import type { Rental } from '@/rentals/types';
import { theme } from '@/theme';

export default function RentalNotificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const parsedId = rawId ? Number(rawId) : Number.NaN;
  const rentalId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(rentalId !== null);
  const [notFound, setNotFound] = useState(rentalId === null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (rentalId === null) return;
    setLoading(true);
    setError(null);
    try {
      setRental(await getRental(rentalId));
      setNotFound(false);
    } catch (reason) {
      setRental(null);
      if (reason instanceof ApiError && reason.status === 404) {
        setNotFound(true);
      } else {
        setError('대여 정보를 불러오지 못했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [rentalId]);

  useEffect(() => {
    const timeout = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timeout);
  }, [load]);

  if (loading) {
    return <SafeAreaView style={styles.screen}><ScreenState loading /></SafeAreaView>;
  }
  if (notFound || !rentalId) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header onBack={router.back} />
        <ScreenState empty emptyMessage="대여 정보를 찾을 수 없습니다." />
      </SafeAreaView>
    );
  }
  if (error || !rental) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header onBack={router.back} />
        <ScreenState error={error ?? '대여 정보를 불러오지 못했습니다.'} onRetry={load} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Header onBack={router.back} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>대여 정보</Text>
        <Text style={styles.title}>물품 #{rental.itemId}</Text>
        <View style={styles.card}>
          <Row label="상태" value={statusLabel(rental.status)} />
          <Row label="시작일" value={formatDate(rental.startDate)} />
          <Row label="종료일" value={formatDate(rental.endDate)} />
        </View>
        <Text style={styles.notice}>이 화면은 알림으로 받은 대여 상태를 확인하는 읽기 전용 화면입니다.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>←</Text>
      </Pressable>
      <Text style={styles.headerTitle}>대여 알림</Text>
      <View style={styles.backPlaceholder} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${Number(match[1])}. ${Number(match[2])}. ${Number(match[3])}.` : value;
}

function statusLabel(status: Rental['status']): string {
  return ({
    REQUESTED: '요청됨',
    APPROVED: '승인됨',
    PAID: '결제됨',
    RENTING: '대여 중',
    RETURNED: '반납됨',
    REJECTED: '거절됨',
    CANCELED: '취소됨',
  })[status];
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.surface, flex: 1 },
  header: { alignItems: 'center', borderBottomColor: theme.colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  back: { alignItems: 'center', borderColor: theme.colors.border, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  backText: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  backPlaceholder: { height: 40, width: 40 },
  headerTitle: { color: theme.colors.textStrong, fontSize: 16, fontWeight: '900' },
  content: { gap: 14, padding: 20 },
  eyebrow: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  title: { color: theme.colors.textStrong, fontSize: 24, fontWeight: '900' },
  card: { borderColor: theme.colors.border, borderRadius: 16, borderWidth: 1, gap: 16, padding: 18 },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: theme.colors.textSoft, fontSize: 13 },
  value: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  notice: { color: theme.colors.textSoft, fontSize: 12, lineHeight: 18 },
});
