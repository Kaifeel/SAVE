import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

export default function HomeScreen() {
  return <View style={styles.screen}><Text style={styles.title}>홈</Text></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.canvas, flex: 1, padding: 24 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '800' },
});
