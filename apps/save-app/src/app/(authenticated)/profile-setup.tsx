import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuthStore } from '@/auth/store';
import { updateMyProfile } from '@/profile/api';
import { theme } from '@/theme';

export default function ProfileSetupScreen() {
  const user = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);
  const [name, setName] = useState(user?.name ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!name.trim() || !department.trim() || !user?.universityId) {
      setError('이름과 학과를 입력해주세요.');
      return;
    }

    setPending(true);
    setError(null);
    try {
      const updated = await updateMyProfile({
        name: name.trim(),
        department: department.trim(),
        universityId: user.universityId,
      });
      updateUser(updated);
      router.replace('/(authenticated)/(tabs)');
    } catch (reason) {
      setError(reason instanceof Error && reason.message
        ? reason.message
        : '회원 정보를 저장하지 못했습니다.');
    } finally {
      setPending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.canvas}
    >
      <View style={styles.card}>
        <Text style={styles.title}>회원 정보 입력</Text>
        <Text style={styles.description}>서비스 이용을 위해 학과 정보를 입력해주세요.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>대학교</Text>
          <View style={styles.fixedField}>
            <Text style={styles.fixedValue}>{user?.universityName ?? '부경대학교'}</Text>
          </View>

          <Text style={styles.label}>이름</Text>
          <TextInput
            accessibilityLabel="이름"
            onChangeText={setName}
            style={styles.input}
            value={name}
          />

          <Text style={styles.label}>학과</Text>
          <TextInput
            accessibilityLabel="학과"
            onChangeText={setDepartment}
            placeholder="예: 컴퓨터공학과"
            style={styles.input}
            value={department}
          />
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={() => void submit()}
          style={({ pressed }) => [styles.button, pressed && styles.pressed, pending && styles.disabled]}
        >
          <Text style={styles.buttonLabel}>{pending ? '저장 중...' : '입력 완료'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  canvas: { backgroundColor: theme.colors.canvas, flex: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 24, padding: 24 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '800' },
  description: { color: theme.colors.muted, fontSize: 14, marginTop: 8 },
  form: { marginTop: 32 },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  fixedField: { backgroundColor: '#e2e8f0', borderRadius: 10, height: 50, justifyContent: 'center', paddingHorizontal: 16 },
  fixedValue: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  input: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', borderRadius: 10, borderWidth: 1, color: theme.colors.text, fontSize: 15, height: 50, paddingHorizontal: 16 },
  error: { color: '#dc2626', fontSize: 13, marginTop: 16 },
  button: { alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 10, height: 54, justifyContent: 'center', marginTop: 32 },
  buttonLabel: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.55 },
});
