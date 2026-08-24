import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemVisual } from '@/catalog/components/item-visual';
import { ScreenState } from '@/catalog/components/screen-state';
import { formatFee, formatRelativeTime } from '@/catalog/format';
import { useItemDetail } from '@/catalog/use-item-detail';
import { theme } from '@/theme';

const imageWidth = Dimensions.get('window').width;

export default function ItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const parsedId = rawId ? Number(rawId) : Number.NaN;
  const itemId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const detail = useItemDetail(itemId);
  const [photoIndex, setPhotoIndex] = useState(0);

  if (detail.loading) {
    return <SafeAreaView style={styles.screen}><ScreenState loading /></SafeAreaView>;
  }
  if (detail.notFound) {
    return (
      <SafeAreaView style={styles.screen}>
        <BackButton onPress={router.back} />
        <ScreenState empty emptyMessage="물품을 찾을 수 없습니다." />
      </SafeAreaView>
    );
  }
  if (detail.error || !detail.item) {
    return (
      <SafeAreaView style={styles.screen}>
        <BackButton onPress={router.back} />
        <ScreenState error={detail.error ?? '물품 정보를 불러오지 못했습니다.'} onRetry={detail.retry} />
      </SafeAreaView>
    );
  }

  const item = detail.item;
  const onPhotoScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / imageWidth));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackButton onPress={router.back} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.wishlisted ? '찜 해제' : '찜하기'}
          disabled={detail.wishlistPending}
          onPress={detail.toggleWishlist}
          style={styles.roundButton}
        >
          <Text style={[styles.roundIcon, item.wishlisted && styles.wishlisted]}>{item.wishlisted ? '♥' : '♡'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.visualArea}>
          {item.imageUrls.length ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onPhotoScroll}
            >
              {item.imageUrls.map((uri, index) => (
                <Image
                  accessibilityLabel={`물품 사진 ${index + 1}`}
                  key={uri}
                  source={{ uri }}
                  style={styles.detailImage}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.placeholderWrap}><ItemVisual /></View>
          )}
          {item.imageUrls.length ? (
            <Text style={styles.photoCounter}>{photoIndex + 1} / {item.imageUrls.length}</Text>
          ) : null}
        </View>

        <View style={styles.mainInfo}>
          <View style={styles.titleRow}>
            <View style={styles.titleBody}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                ⌖ {item.pickupLocationName ?? '장소 미정'} · {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
            <Text style={styles.fee}>{formatFee(item)}</Text>
          </View>
          <View style={styles.countRow}>
            <Text style={styles.count}>찜 {item.wishlistCount}</Text>
            <Text style={styles.count}>조회 {item.viewCount}</Text>
            <Text style={styles.status}>{statusLabel(item.status)}</Text>
          </View>
        </View>

        <Section title="물품 설명">
          <Text style={styles.body}>{item.description || '등록된 설명이 없습니다.'}</Text>
        </Section>

        {item.precautions ? (
          <Section title="주의사항">
            <View style={styles.precaution}><Text style={styles.precautionText}>{item.precautions}</Text></View>
          </Section>
        ) : null}

        <Section title="대여자 정보">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.ownerName} 프로필 보기`}
            onPress={() => router.push({
              pathname: '/users/[id]',
              params: { id: String(item.ownerId) },
            })}
            style={styles.ownerCard}
          >
            <View style={styles.avatar}><Text style={styles.avatarText}>{item.ownerName.slice(0, 1)}</Text></View>
            <View style={styles.ownerBody}>
              <Text style={styles.ownerName}>{item.ownerName}</Text>
              {item.ownerUniversityName ? <Text style={styles.meta}>{item.ownerUniversityName}</Text> : null}
              <Text style={styles.rating}>★ {item.ownerRating.toFixed(1)} · 후기 {item.reviewCount}개</Text>
            </View>
          </Pressable>
        </Section>

        {detail.wishlistError ? <Text accessibilityRole="alert" style={styles.error}>{detail.wishlistError}</Text> : null}
        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.bottomNotice}>
        <Text style={styles.bottomNoticeText}>채팅과 대여 요청은 다음 단계에서 연결됩니다.</Text>
      </View>
    </SafeAreaView>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" onPress={onPress} style={styles.roundButton}>
      <Text style={styles.roundIcon}>←</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function statusLabel(status: string): string {
  return ({
    AVAILABLE: '대여 가능',
    REQUEST_PENDING: '요청 확인 중',
    RESERVED: '예약됨',
    RENTED: '대여 중',
    DELETED: '삭제됨',
  } as Record<string, string>)[status] ?? status;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.surface, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', left: 12, position: 'absolute', right: 12, top: 12, zIndex: 2 },
  roundButton: { alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  roundIcon: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  wishlisted: { color: theme.colors.danger },
  content: { paddingBottom: 78 },
  visualArea: { backgroundColor: '#f1f5f9', minHeight: 220, position: 'relative' },
  detailImage: { backgroundColor: theme.colors.border, height: 260, resizeMode: 'cover', width: imageWidth },
  placeholderWrap: { alignSelf: 'center', height: 220, justifyContent: 'center', width: 220 },
  photoCounter: { backgroundColor: '#334155', borderRadius: 12, bottom: 12, color: theme.colors.surface, fontSize: 10, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 4, position: 'absolute', right: 12 },
  mainInfo: { paddingHorizontal: 18, paddingVertical: 18 },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  titleBody: { flex: 1, gap: 5 },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '900' },
  fee: { color: theme.colors.primary, fontSize: 15, fontWeight: '900' },
  meta: { color: theme.colors.textSoft, fontSize: 11 },
  countRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  count: { color: theme.colors.textSoft, fontSize: 11 },
  status: { color: theme.colors.success, fontSize: 11, fontWeight: '800' },
  section: { borderTopColor: '#f1f5f9', borderTopWidth: 1, gap: 10, paddingHorizontal: 18, paddingVertical: 20 },
  sectionTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '900' },
  body: { color: theme.colors.textSoft, fontSize: 13, lineHeight: 21 },
  precaution: { backgroundColor: '#fff7ed', borderRadius: 14, padding: 13 },
  precautionText: { color: theme.colors.warning, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  ownerCard: { alignItems: 'center', borderColor: '#f1f5f9', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  avatar: { alignItems: 'center', backgroundColor: theme.colors.primarySoft, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  avatarText: { color: theme.colors.primary, fontSize: 17, fontWeight: '900' },
  ownerBody: { flex: 1, gap: 3 },
  ownerName: { color: theme.colors.text, fontSize: 14, fontWeight: '900' },
  rating: { color: theme.colors.textSoft, fontSize: 11 },
  error: { color: theme.colors.danger, fontSize: 12, fontWeight: '700', paddingHorizontal: 18, textAlign: 'center' },
  bottomSpace: { height: 10 },
  bottomNotice: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, borderTopWidth: 1, bottom: 0, left: 0, paddingHorizontal: 18, paddingVertical: 15, position: 'absolute', right: 0 },
  bottomNoticeText: { color: theme.colors.textSoft, fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
