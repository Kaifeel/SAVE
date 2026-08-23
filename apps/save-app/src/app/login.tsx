import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useGoogleLogin } from '@/auth/google-login';
import { useAuthStore } from '@/auth/store';
import { theme } from '@/theme';

export default function LoginScreen() {
  const loginWithEmail = useAuthStore(state => state.loginWithEmail);
  const google = useGoogleLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const validationErrors = [
      ...(!email.trim() ? ['이메일을 입력해주세요.'] : []),
      ...(!password ? ['비밀번호를 입력해주세요.'] : []),
    ];

    if (validationErrors.length > 0) {
      setError(validationErrors);
      return;
    }

    setError([]);
    setIsSubmitting(true);
    try {
      await loginWithEmail({ email: email.trim(), password });
    } catch (requestError) {
      setError([
        requestError instanceof Error && requestError.message
          ? requestError.message
          : '로그인에 실패했습니다.',
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitGoogle = async () => {
    setError([]);
    try {
      await google.prompt();
    } catch {
      setError(['Google 로그인에 실패했습니다.']);
    }
  };

  const pending = isSubmitting || google.busy;
  const visibleErrors = [...error, ...(google.error ? [google.error] : [])];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.canvas}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.logo}>SAVE</Text>
            <Text style={styles.tagline}>캠퍼스 물품 대여 서비스</Text>
          </View>

          <View accessibilityRole="tablist" style={styles.tabs}>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: true }} style={styles.activeTab}>
              <Text style={styles.activeTabLabel}>로그인</Text>
            </Pressable>
            <Link href="/signup" asChild>
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: false }} style={styles.tab}>
                <Text style={styles.tabLabel}>회원가입</Text>
              </Pressable>
            </Link>
          </View>

          {google.enabled ? (
            <View style={styles.googleSection}>
              <Pressable
                accessibilityRole="button"
                disabled={pending}
                onPress={() => void submitGoogle()}
                style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
              >
                <Text style={styles.googleLabel}>{google.busy ? '처리 중...' : 'Google로 계속'}</Text>
              </Pressable>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>또는 이메일로 계속</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>
          ) : null}

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                accessibilityLabel="이메일"
                autoCapitalize="none"
                autoComplete="email"
                inputMode="email"
                maxLength={100}
                onChangeText={setEmail}
                style={styles.input}
                value={email}
              />
            </View>
            <View>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                accessibilityLabel="비밀번호"
                autoComplete="current-password"
                maxLength={72}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            {visibleErrors.length > 0 ? (
              <View accessible accessibilityRole="alert" style={styles.errorBox}>
                {visibleErrors.map(message => (
                  <Text key={message} style={styles.errorText}>{message}</Text>
                ))}
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={() => void submit()}
              style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, pending && styles.disabled]}
            >
              <Text style={styles.submitLabel}>{isSubmitting ? '처리 중...' : '로그인'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  canvas: { backgroundColor: theme.colors.canvas, flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  card: { alignSelf: 'center', backgroundColor: theme.colors.surface, maxWidth: 430, paddingHorizontal: 28, paddingVertical: 48, width: '100%' },
  header: { marginBottom: 36 },
  logo: { color: theme.colors.primary, fontSize: 36, fontWeight: '900' },
  tagline: { color: '#64748b', fontSize: 14, fontWeight: '600', marginTop: 8 },
  tabs: { backgroundColor: '#f1f5f9', borderRadius: 8, flexDirection: 'row', height: 44, marginBottom: 28, padding: 4 },
  tab: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  activeTab: { alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 5, flex: 1, justifyContent: 'center' },
  tabLabel: { color: '#64748b', fontSize: 14, fontWeight: '700' },
  activeTabLabel: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
  googleSection: { marginBottom: 4 },
  googleButton: { alignItems: 'center', borderColor: '#cbd5e1', borderRadius: 7, borderWidth: 1, height: 48, justifyContent: 'center' },
  googleLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 12, marginVertical: 20 },
  dividerLine: { backgroundColor: '#e2e8f0', flex: 1, height: 1 },
  dividerLabel: { color: theme.colors.muted, fontSize: 12, fontWeight: '600' },
  form: { gap: 16 },
  label: { color: '#475569', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderColor: '#cbd5e1', borderRadius: 7, borderWidth: 1, color: theme.colors.text, fontSize: 14, height: 48, paddingHorizontal: 14 },
  errorBox: { gap: 4 },
  errorText: { color: theme.colors.danger, fontSize: 14, fontWeight: '600' },
  submitButton: { alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 7, height: 48, justifyContent: 'center' },
  submitLabel: { color: theme.colors.surface, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.8 },
});
