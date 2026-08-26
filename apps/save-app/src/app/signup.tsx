import { Link } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { useGoogleLogin } from '@/auth/google-login';
import { useAuthStore } from '@/auth/store';
import { theme } from '@/theme';
import { getUniversities, type University } from '@/universities/api';

export default function SignupScreen() {
  const signupWithEmail = useAuthStore(state => state.signupWithEmail);
  const google = useGoogleLogin();
  const { width } = useWindowDimensions();
  const [name, setName] = useState('');
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [universityModalVisible, setUniversityModalVisible] = useState(false);
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mounted = useRef(true);
  const catalogRequest = useRef(0);

  const fetchCatalog = useCallback(async () => {
    const request = ++catalogRequest.current;
    try {
      const catalog = await getUniversities();
      if (mounted.current && request === catalogRequest.current) {
        setUniversities(catalog);
      }
    } catch (requestError) {
      if (mounted.current && request === catalogRequest.current) {
        setUniversities([]);
        setCatalogError(
          requestError instanceof Error && requestError.message
            ? requestError.message
            : '대학교 목록을 불러오지 못했습니다.',
        );
      }
    } finally {
      if (mounted.current && request === catalogRequest.current) {
        setCatalogLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const request = ++catalogRequest.current;
    getUniversities()
      .then(catalog => {
        if (mounted.current && request === catalogRequest.current) {
          setUniversities(catalog);
        }
      })
      .catch(requestError => {
        if (mounted.current && request === catalogRequest.current) {
          setUniversities([]);
          setCatalogError(
            requestError instanceof Error && requestError.message
              ? requestError.message
              : '대학교 목록을 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (mounted.current && request === catalogRequest.current) {
          setCatalogLoading(false);
        }
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  const retryCatalog = () => {
    setCatalogLoading(true);
    setCatalogError(null);
    void fetchCatalog();
  };

  const submit = async () => {
    const validationErrors = [
      ...(!name.trim() ? ['이름을 입력해주세요.'] : []),
      ...(!selectedUniversity ? ['대학교를 선택해주세요.'] : []),
      ...(!department.trim() ? ['학과를 입력해주세요.'] : []),
      ...(!email.trim() ? ['이메일을 입력해주세요.'] : []),
      ...(!password ? ['비밀번호를 입력해주세요.'] : []),
      ...(password && password.length < 8 ? ['비밀번호는 8자 이상이어야 합니다.'] : []),
    ];

    if (validationErrors.length > 0) {
      setError(validationErrors);
      return;
    }

    if (!selectedUniversity) {
      return;
    }

    setError([]);
    setIsSubmitting(true);
    try {
      await signupWithEmail({
        department: department.trim(),
        email: email.trim(),
        name: name.trim(),
        password,
        universityId: selectedUniversity.id,
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.canvas}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, width >= 640 && styles.desktopCard]}>
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

          {google.enabled ? (
            <View style={styles.googleSection}>
              <Pressable
                accessibilityRole="button"
                disabled={pending}
                onPress={() => void submitGoogle()}
                style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, pending && styles.disabled]}
              >
                {google.busy ? null : <GoogleLogo />}
                <Text style={styles.googleLabel}>
                  {google.busy ? '처리 중...' : 'Google 계정으로 계속하기'}
                </Text>
              </Pressable>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>또는 이메일로 계속</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>
          ) : null}

          <View style={styles.form}>
            <Field
              icon="person"
              label="이름"
              value={name}
              onChangeText={setName}
              maxLength={50}
              autoComplete="name"
            />
            <View>
              <Text style={styles.label}>대학교</Text>
              {catalogLoading ? (
                <Text accessibilityLiveRegion="polite" style={styles.catalogStatus}>
                  대학교 목록을 불러오는 중...
                </Text>
              ) : catalogError ? (
                <View accessibilityRole="alert" style={styles.catalogError}>
                  <Text style={styles.errorText}>{catalogError}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={retryCatalog}
                    style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.retryLabel}>대학교 목록 다시 불러오기</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={pending || universities.length === 0}
                  onPress={() => setUniversityModalVisible(true)}
                  style={({ pressed }) => [styles.selector, pressed && styles.pressed, pending && styles.disabled]}
                >
                  <Text style={selectedUniversity ? styles.selectorValue : styles.selectorPlaceholder}>
                    {selectedUniversity?.name ?? (universities.length === 0 ? '등록된 대학교가 없습니다.' : '대학교 선택')}
                  </Text>
                </Pressable>
              )}
            </View>
            <Field label="학과" value={department} onChangeText={setDepartment} maxLength={100} />
            <Field
              icon="email"
              label="이메일"
              value={email}
              onChangeText={setEmail}
              maxLength={100}
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
            />
            <Field
              icon="lock"
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              maxLength={72}
              autoComplete="new-password"
              secureTextEntry
            />

            {visibleErrors.length > 0 ? (
              <View accessible accessibilityRole="alert" style={styles.errorBox}>
                {visibleErrors.map(message => <Text key={message} style={styles.errorText}>{message}</Text>)}
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={() => void submit()}
              style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, pending && styles.disabled]}
            >
              <Text style={styles.submitLabel}>{isSubmitting ? '처리 중...' : '회원가입'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setUniversityModalVisible(false)}
        transparent
        visible={universityModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text accessibilityRole="header" style={styles.modalTitle}>대학교 선택</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setUniversityModalVisible(false)}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Text style={styles.closeLabel}>닫기</Text>
              </Pressable>
            </View>
            <ScrollView>
              {universities.map(university => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedUniversity?.id === university.id }}
                  key={university.id}
                  onPress={() => {
                    setSelectedUniversity(university);
                    setUniversityModalVisible(false);
                  }}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                >
                  <Text style={styles.optionLabel}>{university.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  icon?: 'email' | 'lock' | 'person';
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  maxLength: number;
  autoCapitalize?: 'none';
  autoComplete?: 'email' | 'name' | 'new-password';
  inputMode?: 'email';
  secureTextEntry?: boolean;
};

function Field({ icon, label, ...inputProps }: FieldProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputFrame}>
        {icon ? (
          <FieldIcon name={icon} />
        ) : null}
        <TextInput
          accessibilityLabel={label}
          style={[styles.input, icon && styles.inputWithIcon]}
          {...inputProps}
        />
      </View>
    </View>
  );
}

function GoogleLogo() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.googleLogo} testID="google-logo">
      <Text style={styles.googleLogoLetter}>G</Text>
      <View style={styles.googleLogoColors}>
        <View style={[styles.googleLogoColor, styles.googleBlue]} />
        <View style={[styles.googleLogoColor, styles.googleRed]} />
        <View style={[styles.googleLogoColor, styles.googleYellow]} />
        <View style={[styles.googleLogoColor, styles.googleGreen]} />
      </View>
    </View>
  );
}

function FieldIcon({ name }: { name: NonNullable<FieldProps['icon']> }) {
  if (name === 'person') {
    return (
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.inputIcon} testID="name-icon">
        <View style={styles.personHead} />
        <View style={styles.personBody} />
      </View>
    );
  }

  if (name === 'email') {
    return (
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.inputIcon, styles.emailIcon]} testID="email-icon">
        <View style={styles.emailFlapLeft} />
        <View style={styles.emailFlapRight} />
      </View>
    );
  }

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.inputIcon} testID="password-icon">
      <View style={styles.lockShackle} />
      <View style={styles.lockBody} />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { backgroundColor: theme.colors.canvas, flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  card: { alignSelf: 'center', backgroundColor: theme.colors.surface, justifyContent: 'center', maxWidth: 430, minHeight: '100%', paddingHorizontal: 28, paddingVertical: 48, width: '100%' },
  desktopCard: { borderColor: '#e2e8f0', borderLeftWidth: 1, borderRightWidth: 1, boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)', height: 844, minHeight: 844 },
  header: { marginBottom: 36 },
  logo: { color: theme.colors.primary, fontSize: 36, fontWeight: '900' },
  tagline: { color: '#64748b', fontSize: 14, fontWeight: '600', marginTop: 8 },
  tabs: { backgroundColor: '#f1f5f9', borderRadius: 8, flexDirection: 'row', height: 44, marginBottom: 28, padding: 4 },
  tab: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  activeTab: { alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 5, flex: 1, justifyContent: 'center' },
  tabLabel: { color: '#64748b', fontSize: 14, fontWeight: '700' },
  activeTabLabel: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
  googleSection: { marginBottom: 4 },
  googleButton: { alignItems: 'center', borderColor: '#cbd5e1', borderRadius: 7, borderWidth: 1, flexDirection: 'row', height: 48, justifyContent: 'center', position: 'relative' },
  googleLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  googleLogo: { height: 20, left: 14, position: 'absolute', top: 13, width: 20 },
  googleLogoLetter: { color: '#4285f4', fontSize: 19, fontWeight: '900', lineHeight: 20 },
  googleLogoColors: { bottom: 0, flexDirection: 'row', height: 3, left: 2, overflow: 'hidden', position: 'absolute', width: 16 },
  googleLogoColor: { flex: 1 },
  googleBlue: { backgroundColor: '#4285f4' },
  googleRed: { backgroundColor: '#ea4335' },
  googleYellow: { backgroundColor: '#fbbc05' },
  googleGreen: { backgroundColor: '#34a853' },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 12, marginVertical: 20 },
  dividerLine: { backgroundColor: '#e2e8f0', flex: 1, height: 1 },
  dividerLabel: { color: theme.colors.muted, fontSize: 12, fontWeight: '600' },
  form: { gap: 16 },
  label: { color: '#475569', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  inputFrame: { position: 'relative' },
  input: { borderColor: '#cbd5e1', borderRadius: 7, borderWidth: 1, color: theme.colors.text, fontSize: 14, height: 48, paddingHorizontal: 14, width: '100%' },
  inputWithIcon: { paddingLeft: 44 },
  inputIcon: { height: 20, left: 14, position: 'absolute', top: 14, width: 20, zIndex: 1 },
  personHead: { alignSelf: 'center', borderColor: '#94a3b8', borderRadius: 4, borderWidth: 1.6, height: 8, width: 8 },
  personBody: { alignSelf: 'center', borderColor: '#94a3b8', borderRadius: 8, borderWidth: 1.6, borderBottomWidth: 0, height: 9, marginTop: 2, width: 15 },
  emailIcon: { borderColor: '#94a3b8', borderRadius: 2, borderWidth: 1.6, height: 15, top: 16 },
  emailFlapLeft: { backgroundColor: '#94a3b8', height: 1.5, left: 1, position: 'absolute', top: 4, transform: [{ rotate: '31deg' }], width: 9 },
  emailFlapRight: { backgroundColor: '#94a3b8', height: 1.5, position: 'absolute', right: 1, top: 4, transform: [{ rotate: '-31deg' }], width: 9 },
  lockShackle: { alignSelf: 'center', borderColor: '#94a3b8', borderBottomWidth: 0, borderRadius: 6, borderWidth: 1.6, height: 9, width: 11 },
  lockBody: { backgroundColor: '#94a3b8', borderRadius: 2, height: 10, marginTop: -1, width: 20 },
  catalogStatus: { color: '#64748b', fontSize: 14, height: 48, paddingVertical: 14 },
  catalogError: { gap: 10 },
  retryButton: { alignItems: 'center', borderColor: theme.colors.primary, borderRadius: 7, borderWidth: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  retryLabel: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  selector: { borderColor: '#cbd5e1', borderRadius: 7, borderWidth: 1, height: 48, justifyContent: 'center', paddingHorizontal: 14 },
  selectorPlaceholder: { color: '#94a3b8', fontSize: 14 },
  selectorValue: { color: theme.colors.text, fontSize: 14 },
  errorBox: { gap: 4 },
  errorText: { color: theme.colors.danger, fontSize: 14, fontWeight: '600' },
  submitButton: { alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 7, height: 48, justifyContent: 'center' },
  submitLabel: { color: theme.colors.surface, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.8 },
  modalBackdrop: { backgroundColor: 'rgba(15, 23, 42, 0.45)', flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '70%', paddingBottom: 24 },
  modalHeader: { alignItems: 'center', borderBottomColor: '#e2e8f0', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 18 },
  modalTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  closeButton: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 8 },
  closeLabel: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
  option: { borderBottomColor: '#f1f5f9', borderBottomWidth: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: 20 },
  optionLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
});
