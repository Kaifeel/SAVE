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

import { useAuthStore } from '@/auth/store';
import { theme } from '@/theme';

export default function SignupScreen() {
  const signupWithEmail = useAuthStore(state => state.signupWithEmail);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const validationErrors = [
      ...(!name.trim() ? ['이름을 입력해주세요.'] : []),
      ...(!email.trim() ? ['이메일을 입력해주세요.'] : []),
      ...(!password ? ['비밀번호를 입력해주세요.'] : []),
      ...(password && password.length < 8 ? ['비밀번호는 8자 이상이어야 합니다.'] : []),
    ];

    if (validationErrors.length > 0) {
      setError(validationErrors);
      return;
    }

    setError([]);
    setIsSubmitting(true);
    try {
      await signupWithEmail({
        department: department.trim() || undefined,
        email: email.trim(),
        name: name.trim(),
        password,
      });
    } catch (requestError) {
      setError([
        requestError instanceof Error && requestError.message
          ? requestError.message
          : '회원가입에 실패했습니다.',
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.canvas}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.logo}>SAVE</Text>
            <Text style={styles.tagline}>캠퍼스 물품 대여 서비스</Text>
          </View>

          <View accessibilityRole="tablist" style={styles.tabs}>
            <Link href="/login" asChild>
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: false }} style={styles.tab}>
                <Text style={styles.tabLabel}>로그인</Text>
              </Pressable>
            </Link>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: true }} style={styles.activeTab}>
              <Text style={styles.activeTabLabel}>회원가입</Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            <Field label="이름" value={name} onChangeText={setName} maxLength={50} autoComplete="name" />
            <Field label="학과" value={department} onChangeText={setDepartment} maxLength={100} />
            <Field
              label="이메일"
              value={email}
              onChangeText={setEmail}
              maxLength={100}
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
            />
            <Field
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              maxLength={72}
              autoComplete="new-password"
              secureTextEntry
            />

            {error.length > 0 ? (
              <View accessible accessibilityRole="alert" style={styles.errorBox}>
                {error.map(message => <Text key={message} style={styles.errorText}>{message}</Text>)}
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => void submit()}
              style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, isSubmitting && styles.disabled]}
            >
              <Text style={styles.submitLabel}>{isSubmitting ? '처리 중...' : '회원가입'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  maxLength: number;
  autoCapitalize?: 'none';
  autoComplete?: 'email' | 'name' | 'new-password';
  inputMode?: 'email';
  secureTextEntry?: boolean;
};

function Field({ label, ...inputProps }: FieldProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} style={styles.input} {...inputProps} />
    </View>
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
