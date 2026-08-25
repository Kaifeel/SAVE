import { StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '@/theme';

function inputValue(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function RentalDateTimeField({ label, value, disabled, onChange }: {
  label: string;
  value: Date;
  disabled: boolean;
  minimumDate?: Date;
  onChange: (value: Date) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={!disabled}
        onChangeText={text => {
          const parsed = new Date(text.replace(' ', 'T'));
          if (!Number.isNaN(parsed.getTime())) onChange(parsed);
        }}
        style={styles.input}
        value={inputValue(value)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: theme.colors.textSoft, fontSize: 12, fontWeight: '800' },
  input: { borderColor: theme.colors.border, borderRadius: 10, borderWidth: 1, color: theme.colors.text, minHeight: 48, paddingHorizontal: 12 },
});
