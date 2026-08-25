import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { CatalogItem } from '@/catalog/types';
import { theme } from '@/theme';
import { RentalDateTimeField } from './rental-date-time-field';

export type RentalPeriod = {
  startDate: string;
  endDate: string;
  totalPrice: number;
};

function initialPeriod(): { start: Date; end: Date } {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(0);
  start.setHours(start.getHours() + 1);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

function localIso(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:00`;
}

function unitMilliseconds(unit: string): number {
  return ({ HOUR: 3_600_000, DAY: 86_400_000, WEEK: 604_800_000, MONTH: 2_592_000_000 } as Record<string, number>)[unit]
    ?? (unit === '시간' ? 3_600_000 : 86_400_000);
}

export function RentalRequestDialog({ item, visible, pending, serverError, onClose, onSubmit }: {
  item: CatalogItem;
  visible: boolean;
  pending: boolean;
  serverError: string | null;
  onClose: () => void;
  onSubmit: (period: RentalPeriod) => void;
}) {
  const initial = initialPeriod();
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      const next = initialPeriod();
      setStart(next.start); setEnd(next.end); setError(null);
    }
  }, [visible]);

  const submit = () => {
    if (end.getTime() <= start.getTime()) {
      setError('종료 시간은 시작 시간 이후여야 합니다.');
      return;
    }
    const units = Math.max(1, Math.ceil(
      (end.getTime() - start.getTime()) / unitMilliseconds(item.rentalUnit),
    ));
    setError(null);
    onSubmit({
      startDate: localIso(start),
      endDate: localIso(end),
      totalPrice: item.rentalFee * units,
    });
  };
  const estimatedTotal = item.rentalFee * Math.max(1, Math.ceil(
    (end.getTime() - start.getTime()) / unitMilliseconds(item.rentalUnit),
  ));

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>대여 요청</Text>
          <Text style={styles.help}>시작 시간과 종료 시간을 선택해 주세요.</Text>
          <RentalDateTimeField disabled={pending} label="대여 시작 시간" onChange={setStart} value={start} />
          <RentalDateTimeField disabled={pending} label="대여 종료 시간" minimumDate={start} onChange={setEnd} value={end} />
          <Text style={styles.total}>예상 금액 {estimatedTotal.toLocaleString('ko-KR')}원</Text>
          {error || serverError ? <Text accessibilityRole="alert" style={styles.error}>{error ?? serverError}</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={pending} onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>취소</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="대여 요청 보내기" disabled={pending} onPress={submit} style={styles.submit}><Text style={styles.submitText}>{pending ? '요청 중...' : '대여 요청'}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.48)', flex: 1, justifyContent: 'center', padding: 22 },
  dialog: { backgroundColor: theme.colors.surface, borderRadius: 20, gap: 12, padding: 20, width: '100%' },
  title: { color: theme.colors.textStrong, fontSize: 18, fontWeight: '900' },
  help: { color: theme.colors.textSoft, fontSize: 12 },
  total: { color: theme.colors.primary, fontSize: 14, fontWeight: '900', textAlign: 'right' },
  error: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancel: { alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, flex: 1, minHeight: 46, justifyContent: 'center' },
  cancelText: { color: theme.colors.text, fontWeight: '800' },
  submit: { alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 10, flex: 1, minHeight: 46, justifyContent: 'center' },
  submitText: { color: theme.colors.surface, fontWeight: '900' },
});
