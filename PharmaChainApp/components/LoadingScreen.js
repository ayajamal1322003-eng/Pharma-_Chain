import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';

export default function LoadingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Logo placeholder — replace with your actual logo image */}
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>Rx</Text>
        </View>

        <Text style={styles.appName}>PharmaChain</Text>
        <Text style={styles.tagline}>Blockchain Drug Tracking System</Text>

        <ActivityIndicator
          size="large"
          color="#0d9488"
          style={styles.spinner}
        />
        <Text style={styles.loadingText}>Loading, please wait…</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoBox: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#134e4a',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 13,
    color: '#5eead4',
    letterSpacing: 0.3,
    marginBottom: 40,
    textAlign: 'center',
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
    letterSpacing: 0.2,
  },
});
