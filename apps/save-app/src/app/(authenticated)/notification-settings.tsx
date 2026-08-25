import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/auth/store';
import {
  getPushNotificationSettings,
  setPushNotificationsEnabled,
  type PushNotificationSettings,
} from '@/notifications/registration';
import { theme } from '@/theme';

function permissionLabel(settings: PushNotificationSettings | null): string {
  if (!settings?.supported) return '실제 Android 또는 iPhone 기기에서 사용할 수 있습니다.';
  if (settings.permissionGranted) return '휴대폰 알림 권한이 허용되어 있습니다.';
  if (settings.permissionStatus === 'denied') return '휴대폰 설정에서 알림 권한이 차단되어 있습니다.';
  return '알림을 켜면 휴대폰 권한을 요청합니다.';
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const accessToken = useAuthStore(state => state.accessToken);
  const [settings, setSettings] = useState<PushNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSettings(await getPushNotificationSettings());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error && reason.message
        ? reason.message
        : '알림 상태를 확인하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const enabled = Boolean(
    settings?.supported
      && settings.preferenceEnabled
      && settings.permissionGranted,
  );

  const toggle = async (nextEnabled: boolean) => {
    if (!accessToken || saving) return;
    setSaving(true);
    setError(null);
    try {
      const next = await setPushNotificationsEnabled(nextEnabled, accessToken);
      setSettings(next);
      if (nextEnabled && !next.permissionGranted) {
        setError('휴대폰 알림 권한을 허용해 주세요.');
      }
    } catch (reason) {
      setError(reason instanceof Error && reason.message
        ? reason.message
        : '알림 설정을 변경하지 못했습니다.');
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Text style={styles.backLabel}>‹</Text>
        </Pressable>
        <Text style={styles.title}>알림 설정</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>푸시 알림</Text>
            <Text style={styles.description}>채팅, 대여 요청과 거래 상태 알림을 받습니다.</Text>
          </View>
          <Switch
            accessibilityLabel="푸시 알림"
            disabled={loading || saving || !settings?.supported}
            onValueChange={next => { void toggle(next); }}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
            value={enabled}
          />
        </View>

        <Text style={styles.status}>{loading ? '알림 상태 확인 중...' : permissionLabel(settings)}</Text>
        {settings?.permissionStatus === 'denied' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => { void Linking.openSettings(); }}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
          >
            <Text style={styles.settingsButtonLabel}>휴대폰 설정 열기</Text>
          </Pressable>
        ) : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: theme.colors.canvas, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: 16 },
  back: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  backLabel: { color: theme.colors.text, fontSize: 34, lineHeight: 36 },
  title: { color: theme.colors.textStrong, fontSize: 18, fontWeight: '900' },
  headerSpacer: { width: 40 },
  content: { gap: 14, padding: 20 },
  card: { alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 16, justifyContent: 'space-between', padding: 18 },
  settingText: { flex: 1, gap: 5 },
  settingTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '900' },
  description: { color: theme.colors.textSoft, fontSize: 13, lineHeight: 19 },
  status: { color: theme.colors.textSoft, fontSize: 12, lineHeight: 18, paddingHorizontal: 4 },
  settingsButton: { alignItems: 'center', backgroundColor: theme.colors.primarySoft, borderRadius: 12, minHeight: 46, justifyContent: 'center', paddingHorizontal: 16 },
  settingsButtonLabel: { color: theme.colors.primary, fontSize: 14, fontWeight: '800' },
  error: { backgroundColor: '#fff1f2', borderRadius: 10, color: theme.colors.danger, fontSize: 12, padding: 12 },
  pressed: { opacity: 0.7 },
});
