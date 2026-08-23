import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

type ScreenStateProps = {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
};

export function ScreenState({
  loading,
  error,
  empty,
  emptyMessage = '표시할 내용이 없습니다.',
  onRetry,
}: ScreenStateProps) {
  if (loading) {
    return <View style={styles.state}><ActivityIndicator color={theme.colors.primary} /></View>;
  }
  if (error) {
    return (
      <View style={styles.state}>
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        {onRetry ? (
          <Pressable accessibilityRole="button" accessibilityLabel="다시 시도" onPress={onRetry} style={styles.retry}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
  if (empty) {
    return <View style={styles.state}><Text style={styles.empty}>{emptyMessage}</Text></View>;
  }
  return null;
}

const styles = StyleSheet.create({
  state: { alignItems: 'center', gap: 12, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 36 },
  error: { color: theme.colors.danger, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  empty: { color: theme.colors.textSoft, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  retry: { backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: theme.colors.surface, fontSize: 12, fontWeight: '800' },
});
