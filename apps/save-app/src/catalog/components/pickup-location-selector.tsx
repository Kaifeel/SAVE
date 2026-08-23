import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';
import type { PickupLocation } from '@/universities/api';

type Props = {
  locations: PickupLocation[];
  selectedId: number | null;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  onRetry: () => void;
  onSelect: (id: number) => void;
};

export function PickupLocationSelector({
  locations,
  selectedId,
  loading,
  error,
  disabled,
  onRetry,
  onSelect,
}: Props) {
  const [visible, setVisible] = useState(false);
  const selected = locations.find(location => location.id === selectedId);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>거래 장소</Text>
      {loading ? (
        <Text accessibilityLiveRegion="polite" style={styles.status}>거래 장소를 불러오는 중...</Text>
      ) : error ? (
        <View accessibilityRole="alert" style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          >
            <Text style={styles.retryLabel}>거래 장소 다시 불러오기</Text>
          </Pressable>
        </View>
      ) : locations.length === 0 ? (
        <Text accessibilityRole="alert" style={styles.empty}>등록된 거래 장소가 없습니다.</Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={selected?.name ?? '거래 장소 선택'}
          disabled={disabled}
          onPress={() => setVisible(true)}
          style={({ pressed }) => [styles.selector, pressed && styles.pressed, disabled && styles.disabled]}
        >
          <Text style={selected ? styles.value : styles.placeholder}>
            {selected?.name ?? '거래 장소 선택'}
          </Text>
          <Text style={styles.chevron}>⌄</Text>
        </Pressable>
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        transparent
        visible={visible}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable accessibilityRole="menu" style={styles.sheet}>
            <Text style={styles.sheetTitle}>거래 장소 선택</Text>
            {locations.map(location => (
              <Pressable
                key={location.id}
                accessibilityRole="button"
                accessibilityLabel={location.name}
                onPress={() => {
                  onSelect(location.id);
                  setVisible(false);
                }}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              >
                <Text style={styles.optionText}>{location.name}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  label: { color: theme.colors.textSoft, fontSize: 13, fontWeight: '700' },
  status: { color: theme.colors.textSoft, fontSize: 13, paddingVertical: 12 },
  errorBox: { borderRadius: 14, padding: 12, backgroundColor: '#fff1f2', gap: 10 },
  errorText: { color: theme.colors.danger, fontSize: 12, lineHeight: 18 },
  retryButton: { alignSelf: 'flex-start' },
  retryLabel: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
  empty: { color: theme.colors.warning, fontSize: 12, paddingVertical: 12 },
  selector: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.canvas,
  },
  value: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  placeholder: { color: theme.colors.muted, fontSize: 14 },
  chevron: { color: theme.colors.muted, fontSize: 18 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: { backgroundColor: theme.colors.surface, padding: 20, paddingBottom: 32, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 8 },
  sheetTitle: { color: theme.colors.textStrong, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  option: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  optionText: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
