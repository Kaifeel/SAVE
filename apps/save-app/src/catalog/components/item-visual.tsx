import { Image, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

export function ItemVisual({ imageUrl, compact = false }: { imageUrl?: string; compact?: boolean }) {
  const style = compact ? styles.compact : styles.regular;
  if (imageUrl) {
    return <Image accessibilityLabel="물품 사진" source={{ uri: imageUrl }} style={[styles.image, style]} />;
  }
  return (
    <View accessibilityLabel="등록된 사진 없음" style={[styles.placeholder, style]}>
      <Text style={styles.placeholderText}>사진 없음</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: theme.colors.border },
  placeholder: { alignItems: 'center', backgroundColor: '#f1f5f9', justifyContent: 'center' },
  placeholderText: { color: theme.colors.muted, fontSize: 10, fontWeight: '700' },
  compact: { borderRadius: 14, height: 52, width: 52 },
  regular: { aspectRatio: 1, borderRadius: 16, width: '100%' },
});
