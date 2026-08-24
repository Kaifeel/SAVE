import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { theme } from '@/theme';
import type { RentalReviewInput } from '../types';

export function ReviewDialog({
  visible,
  submitting,
  submissionError,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  submitting: boolean;
  submissionError?: string | null;
  onClose: () => void;
  onSubmit: (input: RentalReviewInput) => Promise<boolean>;
}) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setRating(0);
    setContent('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    const trimmed = content.trim();
    if (!rating || !trimmed) {
      setError('별점과 후기를 모두 입력해 주세요.');
      return;
    }
    setError(null);
    if (await onSubmit({ rating, content: trimmed })) close();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={submitting ? undefined : close}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.heading}>
            <Text style={styles.title}>거래 후기 작성</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              disabled={submitting}
              onPress={close}
              style={styles.close}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>별점</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(value => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${value}점`}
                accessibilityState={{ selected: rating === value }}
                disabled={submitting}
                key={value}
                onPress={() => setRating(value)}
                style={styles.starButton}
              >
                <Text style={[styles.star, value <= rating && styles.starSelected]}>★</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>텍스트 후기</Text>
          <TextInput
            accessibilityLabel="후기 내용"
            editable={!submitting}
            maxLength={500}
            multiline
            onChangeText={setContent}
            placeholder="거래 상대방과의 경험을 작성해 주세요."
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            textAlignVertical="top"
            value={content}
          />
          <Text style={styles.count}>{content.length}/500</Text>
          {error || submissionError ? (
            <Text accessibilityRole="alert" style={styles.error}>{error ?? submissionError}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => { void submit(); }}
            style={[styles.submit, submitting && styles.disabled]}
          >
            <Text style={styles.submitText}>{submitting ? '후기 제출 중' : '후기 제출'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(15, 23, 42, 0.5)', flex: 1, justifyContent: 'flex-end' },
  dialog: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 12, paddingBottom: 34, paddingHorizontal: 20, paddingTop: 18 },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: theme.colors.textStrong, fontSize: 19, fontWeight: '900' },
  close: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
  closeText: { color: theme.colors.textSoft, fontSize: 28, lineHeight: 30 },
  label: { color: theme.colors.text, fontSize: 13, fontWeight: '800', marginTop: 4 },
  stars: { flexDirection: 'row', gap: 6 },
  starButton: { padding: 2 },
  star: { color: theme.colors.border, fontSize: 32 },
  starSelected: { color: '#f59e0b' },
  input: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, color: theme.colors.text, fontSize: 14, height: 120, padding: 12 },
  count: { color: theme.colors.muted, fontSize: 11, textAlign: 'right' },
  error: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
  submit: { alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 14, marginTop: 4, paddingVertical: 14 },
  disabled: { opacity: 0.5 },
  submitText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
});
