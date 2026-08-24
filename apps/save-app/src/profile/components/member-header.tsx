import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AuthUser } from '@/auth/types';
import { theme } from '@/theme';

type Props = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function MemberHeader({ user, loading, error, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.identity}>
        {user?.profileImageUrl ? (
          <Image
            accessibilityLabel={`${user.name} 프로필 사진`}
            contentFit="cover"
            source={{ uri: user.profileImageUrl }}
            style={styles.avatar}
          />
        ) : (
          <View accessibilityLabel="기본 프로필 이미지" style={[styles.avatar, styles.placeholder]}>
            <Text style={styles.placeholderText}>●</Text>
          </View>
        )}
        <View style={styles.copy}>
          {user ? (
            <>
              <Text numberOfLines={1} style={styles.name}>{user.name}</Text>
              {user.department ? <Text style={styles.department}>{user.department}</Text> : null}
              {user.universityName ? <Text style={styles.university}>{user.universityName}</Text> : null}
            </>
          ) : loading ? (
            <Text accessibilityLiveRegion="polite" style={styles.status}>프로필을 불러오는 중...</Text>
          ) : null}
        </View>
      </View>
      {error ? (
        <View accessibilityRole="alert" style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry}>
            <Text style={styles.retry}>프로필 다시 불러오기</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  identity: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  avatar: { borderRadius: 34, height: 68, width: 68 },
  placeholder: { alignItems: 'center', backgroundColor: theme.colors.primarySoft, borderColor: '#c7d2fe', borderWidth: 1, justifyContent: 'center' },
  placeholderText: { color: theme.colors.primary, fontSize: 28 },
  copy: { flex: 1, gap: 3 },
  name: { color: theme.colors.textStrong, fontSize: 21, fontWeight: '900' },
  department: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  university: { color: theme.colors.textSoft, fontSize: 12 },
  status: { color: theme.colors.textSoft, fontSize: 13 },
  errorBox: { backgroundColor: '#fff1f2', borderRadius: 12, gap: 6, padding: 10 },
  errorText: { color: theme.colors.danger, fontSize: 12 },
  retry: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
});
