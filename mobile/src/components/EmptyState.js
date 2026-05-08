import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

export default function EmptyState({ icon = 'document-outline', message, sub = '' }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={COLORS.textMuted} />
      <Text style={styles.message}>{message}</Text>
      {!!sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  message:   { fontSize: 16, color: COLORS.textLight, textAlign: 'center', fontWeight: '500' },
  sub:       { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
});
