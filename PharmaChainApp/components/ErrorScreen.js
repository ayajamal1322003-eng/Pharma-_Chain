import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

export default function ErrorScreen({ error, onRetry, siteUrl }) {
  const isNetworkError =
    !error ||
    error.description?.toLowerCase().includes('net::err') ||
    error.description?.toLowerCase().includes('failed to connect') ||
    error.code === -2;

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>⚠️</Text>
      </View>

      <Text style={styles.title}>
        {isNetworkError ? 'Connection Error' : 'Something Went Wrong'}
      </Text>

      <Text style={styles.subtitle}>
        {isNetworkError
          ? 'Could not reach the PharmaChain server.\nMake sure your backend is running and ngrok is active.'
          : 'An unexpected error occurred while loading the page.'}
      </Text>

      {/* Technical details (collapsible) */}
      {error && (
        <ScrollView style={styles.detailBox} nestedScrollEnabled>
          <Text style={styles.detailTitle}>Technical details</Text>
          <Text style={styles.detailText}>URL: {error.url ?? siteUrl}</Text>
          {error.code != null && (
            <Text style={styles.detailText}>Code: {error.code}</Text>
          )}
          {error.description && (
            <Text style={styles.detailText}>Reason: {error.description}</Text>
          )}
        </ScrollView>
      )}

      {/* Checklist for users */}
      <View style={styles.checkList}>
        <Text style={styles.checkTitle}>Quick checklist:</Text>
        {[
          'Run: dotnet run  in your PharmaChain folder',
          'Run: ngrok http https://localhost:7xxx  in a separate terminal',
          'Copy the new https://…ngrok-free.app URL into App.js',
          'Save App.js and press  r  in the Expo terminal to reload',
          'Make sure your phone and PC are on the same Wi-Fi (or use tunnel mode)',
        ].map((item, i) => (
          <Text key={i} style={styles.checkItem}>
            {'  '}{i + 1}. {item}
          </Text>
        ))}
      </View>

      {/* Retry button */}
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  iconText: {
    fontSize: 38,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#c2410c',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#7c2d12',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  detailBox: {
    maxHeight: 90,
    width: '100%',
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  detailTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 11,
    color: '#7f1d1d',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
  checkList: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    borderLeftWidth: 3,
    borderLeftColor: '#0d9488',
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#134e4a',
    marginBottom: 8,
  },
  checkItem: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
