import * as SplashScreen from 'expo-splash-screen';
import { type PropsWithChildren, useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/auth/store';
import { theme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export function AppBootstrap({ children }: PropsWithChildren) {
  const bootstrapStarted = useRef(false);
  const status = useAuthStore(state => state.status);
  const bootstrap = useAuthStore(state => state.bootstrap);
  const retryBootstrap = useAuthStore(state => state.retryBootstrap);

  useEffect(() => {
    if (bootstrapStarted.current) {
      return;
    }

    bootstrapStarted.current = true;
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== 'hydrating') {
      SplashScreen.hide();
    }
  }, [status]);

  if (status === 'hydrating') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          accessibilityLabel="로그인 상태 확인 중"
          color={theme.colors.primary}
          size="large"
        />
      </View>
    );
  }

  if (status === 'offline') {
    return (
      <View style={styles.centered}>
        <Text accessibilityRole="alert" style={styles.title}>네트워크 연결을 확인해주세요.</Text>
        <Text style={styles.message}>로그인 상태를 확인하지 못했습니다.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void retryBootstrap()}
          style={styles.retryButton}
        >
          <Text style={styles.retryLabel}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    backgroundColor: theme.colors.canvas,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryLabel: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
});
