import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../theme/colors';

export default function StatCard({ icon, value, label, color = C.teal600, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={[styles.icon, { color }]}>{icon}</Text>
      <Text style={[styles.value, { color }]}>{value ?? '—'}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    margin: 6,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'flex-start',
  },
  icon:  { fontSize: 26, marginBottom: 8 },
  value: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  label: { fontSize: 12, color: C.gray500, flexWrap: 'wrap' },
});
