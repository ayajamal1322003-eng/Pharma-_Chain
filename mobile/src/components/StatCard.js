import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

export default function StatCard({ label, value, icon, color = COLORS.primary, bg = '#d1fae5' }) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={[styles.iconBox, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderLeftWidth: 4, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  iconBox:  { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  info:     { flex: 1 },
  value:    { fontSize: 22, fontWeight: 'bold' },
  label:    { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
});
