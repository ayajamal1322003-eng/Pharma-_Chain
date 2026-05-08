import 'react-native-gesture-handler'; // must be first import
import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider }     from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator         from './src/navigation/AppNavigator';
import { COLORS }           from './src/utils/constants';

// Keep splash visible until we're ready
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Simulate a tiny init delay so context providers can mount
    const timer = setTimeout(async () => {
      setReady(true);
      await SplashScreen.hideAsync();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
