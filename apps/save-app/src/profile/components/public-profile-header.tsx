import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';
import type { ResourceState } from '../use-my-page';
import type { PublicUserProfile } from '../public-schema';

export function PublicProfileHeader({
  resource,
  onRetry,
}: {
  resource: ResourceState<PublicUserProfile | null>;
  onRetry: () => void;
}) {
  if (resource.loading && !resource.data) {
    return <Text accessibilityLiveRegion="polite" style={styles.status}>프로필을 불러오는 중입니다.</Text>;
  }
  if (!resource.data) {
    return (
      <View accessibilityRole="alert" style={styles.errorBox}>
        <Text style={styles.errorText}>{resource.error ?? '프로필을 불러오지 못했습니다.'}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry}>
          <Text style={styles.retry}>프로필 다시 불러오기</Text>
        </Pressable>
      </View>
    );
  }

  const profile = resource.data;
  return (
    <View style={styles.container}>
      <View style={styles.identity}>
        {profile.profileImageUrl ? (
          <Image
            accessibilityLabel={`${profile.name} 프로필 사진`}
            contentFit="cover"
            source={{ uri: profile.profileImageUrl }}
            style={styles.avatar}
          />
        ) : (
          <View accessibilityLabel="기본 프로필 이미지" style={[styles.avatar, styles.placeholder]}>
            <Text style={styles.placeholderIcon}>●</Text>
          </View>
        )}
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>{profile.name}</Text>
          {profile.department ? <Text style={styles.department}>{profile.department}</Text> : null}
          {profile.universityName ? <Text style={styles.university}>{profile.universityName}</Text> : null}
        </View>
      </View>
      <View style={styles.metrics}>
        <Metric label="평점" value={`★ ${profile.rating.toFixed(1)}`} />
        <Metric label="후기" value={String(profile.reviewCount)} />
        <Metric label="완료 거래" value={String(profile.completedTradeCount)} />
      </View>
      {resource.error ? <Text accessibilityRole="alert" style={styles.inlineError}>{resource.error}</Text> : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  identity: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  avatar: { borderRadius: 38, height: 76, width: 76 },
  placeholder: { alignItems: 'center', backgroundColor: theme.colors.primarySoft, justifyContent: 'center' },
  placeholderIcon: { color: theme.colors.primary, fontSize: 30 },
  copy: { flex: 1, gap: 4 },
  name: { color: theme.colors.textStrong, fontSize: 21, fontWeight: '900' },
  department: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  university: { color: theme.colors.textSoft, fontSize: 12 },
  metrics: { backgroundColor: '#f1f5f9', borderRadius: 16, flexDirection: 'row', paddingVertical: 13 },
  metric: { alignItems: 'center', flex: 1, gap: 3 },
  metricValue: { color: theme.colors.textStrong, fontSize: 14, fontWeight: '900' },
  metricLabel: { color: theme.colors.muted, fontSize: 10 },
  status: { color: theme.colors.textSoft, fontSize: 13, paddingVertical: 40, textAlign: 'center' },
  errorBox: { backgroundColor: '#fff1f2', borderRadius: 14, gap: 8, padding: 14 },
  errorText: { color: theme.colors.danger, fontSize: 13 },
  retry: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  inlineError: { color: theme.colors.danger, fontSize: 12 },
});
