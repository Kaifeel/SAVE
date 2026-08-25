import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

type Props = {
  loggingOut: boolean;
  logoutError: string | null;
  onOpenRentals: () => void;
  onOpenNotificationSettings: () => void;
  onLogout: () => void;
};

export function AccountActions({
  loggingOut,
  logoutError,
  onOpenRentals,
  onOpenNotificationSettings,
  onLogout,
}: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="대여 내역"
        disabled={loggingOut}
        onPress={onOpenRentals}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Text style={styles.rowLabel}>대여 내역</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="알림 설정"
        disabled={loggingOut}
        onPress={onOpenNotificationSettings}
        style={({ pressed }) => [styles.row, styles.dividedRow, pressed && styles.pressed]}
      >
        <Text style={styles.rowLabel}>알림 설정</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={loggingOut}
        onPress={onLogout}
        style={({ pressed }) => [styles.row, styles.dividedRow, pressed && styles.pressed, loggingOut && styles.disabled]}
      >
        <Text style={styles.logoutLabel}>{loggingOut ? '로그아웃 중...' : '로그아웃'}</Text>
      </Pressable>
      {logoutError ? <Text accessibilityRole="alert" style={styles.error}>{logoutError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.surface, borderColor: '#f1f5f9', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: 16 },
  dividedRow: { borderTopColor: theme.colors.border, borderTopWidth: 1 },
  rowLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  chevron: { color: theme.colors.muted, fontSize: 25 },
  logoutLabel: { color: theme.colors.danger, fontSize: 14, fontWeight: '800' },
  error: { backgroundColor: '#fff1f2', color: theme.colors.danger, fontSize: 12, padding: 12 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
