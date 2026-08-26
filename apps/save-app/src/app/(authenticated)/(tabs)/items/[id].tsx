import { useState } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Dimensions,
  Alert,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemVisual } from '@/catalog/components/item-visual';
import { deleteItem } from '@/catalog/api';
import { COMMON_SAFETY_NOTICE } from '@/catalog/constants';
import { ScreenState } from '@/catalog/components/screen-state';
import { formatFee, formatRelativeTime } from '@/catalog/format';
import { useItemDetail } from '@/catalog/use-item-detail';
import { createOrGetChatRoom } from '@/chat/api';
import { useChatStore } from '@/chat/store';
import { createRental } from '@/rentals/api';
import { RentalRequestDialog, type RentalPeriod } from '@/rentals/components/rental-request-dialog';
import { useAuthStore } from '@/auth/store';
import { theme } from '@/theme';

const imageWidth = Dimensions.get('window').width;

export default function ItemDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const parsedId = rawId ? Number(rawId) : Number.NaN;
  const itemId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  const detail = useItemDetail(itemId);
  const [photoIndex, setPhotoIndex] = useState(0);
  const currentUserId = useAuthStore(state => state.user?.id ?? null);
  const [actionPending, setActionPending] = useState<'chat' | 'rental' | 'submit' | 'delete' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [chatRoomId, setChatRoomId] = useState<number | null>(null);
  const [rentalVisible, setRentalVisible] = useState(false);

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
  const isOwner = currentUserId === item.ownerId;
  const canRequestRental = !isOwner && item.type === 'LEND' && item.status === 'AVAILABLE';
  const onPhotoScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / imageWidth));
  };
  const prepareRoom = async (): Promise<number | null> => {
    try {
      const room = await createOrGetChatRoom(item.id);
      void useChatStore.getState().loadRooms();
      return room.id;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '채팅방을 준비하지 못했습니다.');
      return null;
    }
  };
  const openChat = async () => {
    setActionPending('chat');
    setActionError(null);
    const roomId = await prepareRoom();
    setActionPending(null);
    if (roomId) router.push({ pathname: '/chats/[id]', params: { id: String(roomId) } });
  };
  const openRental = async () => {
    setActionPending('rental');
    setActionError(null);
    const roomId = await prepareRoom();
    setActionPending(null);
    if (roomId) { setChatRoomId(roomId); setRentalVisible(true); }
  };
  const submitRental = async (period: RentalPeriod) => {
    if (!chatRoomId) return;
    setActionPending('submit');
    setActionError(null);
    try {
      const rental = await createRental({ itemId: item.id, chatRoomId, ...period });
      setRentalVisible(false);
      router.push({ pathname: '/rentals/[id]', params: { id: String(rental.id) } });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '대여 요청을 보내지 못했습니다.');
    } finally {
      setActionPending(null);
    }
  };
  const shareItem = async () => {
    try {
      await Share.share({
        message: `${item.title} · ${formatFee(item)}\nSAVE에서 확인해 보세요: saveapp://items/${item.id}`,
        title: item.title,
      });
    } catch {
      setActionError('게시글을 공유하지 못했습니다.');
    }
  };
  const confirmDelete = () => {
    Alert.alert('게시물 삭제', '이 게시물을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          setActionPending('delete');
          setActionError(null);
          void deleteItem(item.id)
            .then(() => router.replace('/'))
            .catch(error => setActionError(
              error instanceof Error ? error.message : '게시물을 삭제하지 못했습니다.',
            ))
            .finally(() => setActionPending(null));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View testID="item-detail-header" style={{ ...styles.header, top: insets.top + 12 }}>
        <BackButton onPress={router.back} />
        <View style={styles.headerActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="게시글 공유" onPress={() => void shareItem()} style={styles.roundButton}>
            <Feather color={theme.colors.textSoft} name="share-2" size={16} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.wishlisted ? '찜 해제' : '찜하기'}
            disabled={detail.wishlistPending}
            onPress={detail.toggleWishlist}
            style={styles.roundButton}
          >
            <Feather
              color={item.wishlisted ? theme.colors.danger : theme.colors.textSoft}
              name="heart"
              size={16}
            />
          </Pressable>
        </View>
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
            <View
              accessibilityLabel={`사진 ${photoIndex + 1}/${item.imageUrls.length}`}
              accessibilityLiveRegion="polite"
              style={styles.photoPagination}
            >
              {item.imageUrls.length > 1 ? (
                <View accessibilityElementsHidden style={styles.photoDots}>
                  {item.imageUrls.map((uri, index) => (
                    <View
                      key={`${uri}-${index}`}
                      style={[styles.photoDot, index === photoIndex && styles.photoDotActive]}
                    />
                  ))}
                </View>
              ) : null}
              <Text style={styles.photoCounter}>
                <Text style={styles.photoCounterActive}>{photoIndex + 1}</Text>
                <Text style={styles.photoCounterDivider}> / </Text>
                {item.imageUrls.length}
              </Text>
            </View>
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

        <Section title="주의사항">
          <View style={styles.precaution}><Text style={styles.precautionText}>{item.precautions || COMMON_SAFETY_NOTICE}</Text></View>
        </Section>

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
        {actionError && !rentalVisible ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.bottomArea}>
        {isOwner ? (
          <View style={styles.ownerActionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={actionPending !== null}
              onPress={() => router.push({ pathname: '/create', params: { itemId: String(item.id) } })}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>수정</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={actionPending !== null}
              onPress={confirmDelete}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>{actionPending === 'delete' ? '삭제 중...' : '삭제'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Pressable accessibilityRole="button" disabled={actionPending !== null} onPress={() => void openChat()} style={styles.chatButton}>
              <Text style={styles.chatButtonText}>{actionPending === 'chat' ? '준비 중...' : '채팅하기'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={!canRequestRental || actionPending !== null} onPress={() => void openRental()} style={[styles.rentalButton, !canRequestRental && styles.disabledButton]}>
              <Text style={styles.rentalButtonText}>{actionPending === 'rental' ? '준비 중...' : '대여 요청'}</Text>
            </Pressable>
          </View>
        )}
      </View>
      <RentalRequestDialog
        item={item}
        onClose={() => { if (actionPending !== 'submit') { setRentalVisible(false); setActionError(null); } }}
        onSubmit={period => void submitRental(period)}
        pending={actionPending === 'submit'}
        serverError={actionError}
        visible={rentalVisible}
      />
    </SafeAreaView>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" onPress={onPress} style={styles.roundButton}>
      <Feather color={theme.colors.text} name="arrow-left" size={16} />
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
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', left: 12, position: 'absolute', right: 12, zIndex: 2 },
  roundButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: '#f1f5f9',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    height: 36,
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    width: 36,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  content: { paddingBottom: 72 },
  visualArea: { backgroundColor: '#f1f5f9', minHeight: 220, position: 'relative' },
  detailImage: { backgroundColor: '#f8fafc', height: 260, resizeMode: 'contain', width: imageWidth },
  placeholderWrap: { alignSelf: 'center', height: 220, justifyContent: 'center', width: 220 },
  photoPagination: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 18,
    borderWidth: 1,
    bottom: 12,
    elevation: 3,
    flexDirection: 'row',
    gap: 8,
    left: '50%',
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'absolute',
    shadowColor: '#0f172a',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    transform: [{ translateX: '-50%' }],
  },
  photoDots: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  photoDot: { backgroundColor: '#cbd5e1', borderRadius: 3, height: 6, width: 6 },
  photoDotActive: { backgroundColor: theme.colors.primary, width: 16 },
  photoCounter: { color: theme.colors.textSoft, fontSize: 10, fontWeight: '800' },
  photoCounterActive: { color: theme.colors.primary },
  photoCounterDivider: { color: '#cbd5e1' },
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
  bottomArea: { bottom: 0, left: 0, position: 'absolute', right: 0 },
  actionRow: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 9 },
  chatButton: { alignItems: 'center', borderColor: theme.colors.primary, borderRadius: 11, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 44 },
  chatButtonText: { color: theme.colors.primary, fontSize: 13, fontWeight: '900' },
  rentalButton: { alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 11, flex: 1, justifyContent: 'center', minHeight: 44 },
  rentalButtonText: { color: theme.colors.surface, fontSize: 13, fontWeight: '900' },
  disabledButton: { opacity: 0.45 },
  ownerActionRow: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 9 },
  editButton: { alignItems: 'center', borderColor: theme.colors.border, borderRadius: 11, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 44 },
  editButtonText: { color: theme.colors.text, fontSize: 13, fontWeight: '900' },
  deleteButton: { alignItems: 'center', backgroundColor: '#f00046', borderRadius: 11, flex: 1, justifyContent: 'center', minHeight: 44 },
  deleteButtonText: { color: theme.colors.surface, fontSize: 13, fontWeight: '900' },
});
