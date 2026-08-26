import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/theme';
import { COMMON_SAFETY_NOTICE } from '../constants';
import type { UseItemComposerResult } from '../use-item-composer';
import { ItemPhotoSelector } from './item-photo-selector';
import { PickupLocationSelector } from './pickup-location-selector';

type Props = {
  composer: UseItemComposerResult;
  permissionNotice: string | null;
  onChoosePhotos: () => void;
  onTakePhoto: () => void;
  onOpenPhotoSettings: () => void;
  onSubmit: () => void;
};

export function ItemComposeForm({ composer, permissionNotice, onChoosePhotos, onTakePhoto, onOpenPhotoSettings, onSubmit }: Props) {
  const blocked = composer.locationsLoading || Boolean(composer.locationError) || composer.locations.length === 0;
  const notice = permissionNotice ?? composer.photoNotice;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{composer.editing ? '물품 수정' : '물품 등록'}</Text>
            <Text style={styles.subtitle}>{composer.editing ? '등록한 물품 정보를 수정하세요.' : '캠퍼스에서 함께 사용할 물품을 등록해 보세요.'}</Text>
          </View>

          <View accessibilityRole="tablist" style={styles.segment}>
            <TypeButton
              label="빌려줄래요"
              selected={composer.draft.type === 'LEND'}
              disabled={composer.submitting}
              onPress={() => composer.setField('type', 'LEND')}
            />
            <TypeButton
              label="빌려주세요"
              selected={composer.draft.type === 'BORROW'}
              disabled={composer.submitting}
              onPress={() => composer.setField('type', 'BORROW')}
            />
          </View>

          {composer.editing ? (
            <View style={styles.existingPhotoNotice}>
              <Text style={styles.existingPhotoText}>기존 사진은 그대로 유지됩니다.</Text>
              <Text style={styles.existingPhotoCount}>사진 {composer.existingPhotoCount}장</Text>
            </View>
          ) : (
            <ItemPhotoSelector
              photos={composer.draft.photos}
              notice={notice}
              disabled={composer.submitting}
              onChoosePhotos={onChoosePhotos}
              onTakePhoto={onTakePhoto}
              onOpenSettings={onOpenPhotoSettings}
              onRemove={composer.removePhoto}
            />
          )}

          <Field
            label="물품 이름"
            placeholder="예: USB-C 충전기"
            value={composer.draft.title}
            onChangeText={value => composer.setField('title', value)}
            editable={!composer.submitting}
          />

          <View style={styles.field}>
            <Text style={styles.label}>대여 가격</Text>
            <View style={styles.priceRow}>
              <TextInput
                accessibilityLabel="대여 가격"
                editable={!composer.submitting}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.muted}
                value={composer.draft.rentalFee}
                onChangeText={value => composer.setField('rentalFee', value)}
                style={[styles.input, styles.priceInput]}
              />
              <View style={styles.unitSegment}>
                {(['일', '시간'] as const).map(unit => (
                  <Pressable
                    key={unit}
                    accessibilityRole="button"
                    accessibilityLabel={`${unit} 단위`}
                    accessibilityState={{ selected: composer.draft.rentalUnit === unit }}
                    disabled={composer.submitting}
                    onPress={() => composer.setField('rentalUnit', unit)}
                    style={[
                      styles.unitButton,
                      composer.draft.rentalUnit === unit && styles.unitButtonActive,
                    ]}
                  >
                    <Text style={composer.draft.rentalUnit === unit ? styles.unitActive : styles.unitLabel}>
                      {unit}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <PickupLocationSelector
            locations={composer.locations}
            selectedId={composer.draft.pickupLocationId}
            loading={composer.locationsLoading}
            error={composer.locationError}
            disabled={composer.submitting}
            onRetry={() => { void composer.retryLocations(); }}
            onSelect={id => composer.setField('pickupLocationId', id)}
          />

          <Field
            label="설명"
            placeholder="물품 상태와 대여 방법을 알려주세요."
            value={composer.draft.description}
            onChangeText={value => composer.setField('description', value)}
            editable={!composer.submitting}
            multiline
          />
          <View style={styles.field}>
            <Text style={styles.label}>주의사항</Text>
            <View accessibilityRole="text" style={styles.safetyNotice}>
              <Text style={styles.safetyIcon}>!</Text>
              <Text style={styles.safetyText}>{COMMON_SAFETY_NOTICE}</Text>
            </View>
          </View>

          {composer.submitError ? (
            <Text accessibilityRole="alert" style={styles.error}>{composer.submitError}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={composer.submitting || blocked}
            onPress={onSubmit}
            style={({ pressed }) => [
              styles.submit,
              pressed && styles.pressed,
              (composer.submitting || blocked) && styles.disabled,
            ]}
          >
            <Text style={styles.submitLabel}>{composer.submitting ? (composer.editing ? '수정 중...' : '등록 중...') : (composer.editing ? '물품 수정' : '물품 등록')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TypeButton({ label, selected, disabled, onPress }: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.typeButton, selected && styles.typeButtonActive]}
    >
      <Text style={selected ? styles.typeActive : styles.typeLabel}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, multiline = false, ...props }: {
  label: string;
  multiline?: boolean;
  placeholder: string;
  value: string;
  editable: boolean;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={theme.colors.muted}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120, gap: 20 },
  header: { gap: 5 },
  title: { color: theme.colors.textStrong, fontSize: 24, fontWeight: '900' },
  subtitle: { color: theme.colors.textSoft, fontSize: 13, lineHeight: 19 },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: theme.colors.border },
  typeButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  typeButtonActive: { backgroundColor: theme.colors.surface },
  typeLabel: { color: theme.colors.textSoft, fontSize: 13, fontWeight: '700' },
  typeActive: { color: theme.colors.primary, fontSize: 13, fontWeight: '900' },
  field: { gap: 8 },
  label: { color: theme.colors.textSoft, fontSize: 13, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, paddingHorizontal: 14, color: theme.colors.text, backgroundColor: theme.colors.surface, fontSize: 14 },
  textarea: { minHeight: 96, paddingTop: 13, paddingBottom: 13 },
  safetyNotice: { alignItems: 'flex-start', backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
  safetyIcon: { backgroundColor: theme.colors.warning, borderRadius: 10, color: '#ffffff', fontSize: 12, fontWeight: '900', height: 20, lineHeight: 20, textAlign: 'center', width: 20 },
  safetyText: { color: '#c2410c', flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 19 },
  priceRow: { flexDirection: 'row', gap: 10 },
  priceInput: { flex: 1 },
  unitSegment: { flexDirection: 'row', padding: 3, borderRadius: 13, backgroundColor: theme.colors.border },
  unitButton: { minWidth: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  unitButtonActive: { backgroundColor: theme.colors.surface },
  unitLabel: { color: theme.colors.textSoft, fontSize: 12, fontWeight: '700' },
  unitActive: { color: theme.colors.primary, fontSize: 12, fontWeight: '900' },
  error: { color: theme.colors.danger, fontSize: 13, lineHeight: 19 },
  existingPhotoNotice: { backgroundColor: theme.colors.primarySoft, borderRadius: 14, gap: 4, padding: 14 },
  existingPhotoText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  existingPhotoCount: { color: theme.colors.textSoft, fontSize: 11 },
  submit: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: theme.colors.primary },
  submitLabel: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },
});
