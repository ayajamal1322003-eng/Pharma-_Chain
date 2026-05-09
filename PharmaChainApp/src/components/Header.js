import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../theme/colors';

export default function Header({ title, subtitle, onMenuPress, rightAction }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress}>
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>
      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {rightAction ? (
        <TouchableOpacity style={styles.rightBtn} onPress={rightAction.onPress}>
          <Text style={styles.rightBtnText}>{rightAction.label}</Text>
        </TouchableOpacity>
      ) : <View style={{ width: 40 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.teal50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon:   { fontSize: 18, color: C.teal600 },
  titleBlock: { flex: 1 },
  title:      { fontSize: 17, fontWeight: '800', color: C.gray900 },
  subtitle:   { fontSize: 12, color: C.gray500, marginTop: 1 },
  rightBtn: {
    backgroundColor: C.teal600,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  rightBtnText: { color: C.white, fontSize: 12, fontWeight: '700' },
});
