import { useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

export function RentalDateTimeField({ label, value, disabled, minimumDate, onChange }: {
  label: string;
  value: Date;
  disabled: boolean;
  minimumDate?: Date;
  onChange: (value: Date) => void;
}) {
  const [androidMode, setAndroidMode] = useState<'date' | 'time' | null>(null);
  const formatted = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(value);

  const changed = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) { setAndroidMode(null); return; }
    if (Platform.OS === 'android' && androidMode === 'date') {
      const next = new Date(value);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      onChange(next);
      setAndroidMode('time');
      return;
    }
    if (Platform.OS === 'android' && androidMode === 'time') {
      const next = new Date(value);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(next);
      setAndroidMode(null);
      return;
    }
    onChange(selected);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          accessibilityLabel={label}
          disabled={disabled}
          display="compact"
          locale="ko-KR"
          minimumDate={minimumDate}
          mode="datetime"
          onChange={changed}
          value={value}
        />
      ) : (
        <>
          <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={() => setAndroidMode('date')} style={styles.button}>
            <Text style={styles.value}>{formatted}</Text>
          </Pressable>
          {androidMode ? (
            <DateTimePicker
              minimumDate={androidMode === 'date' ? minimumDate : undefined}
              mode={androidMode}
              onChange={changed}
              value={value}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: theme.colors.textSoft, fontSize: 12, fontWeight: '800' },
  button: { borderColor: theme.colors.border, borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 12 },
  value: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
});
