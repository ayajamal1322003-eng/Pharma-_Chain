import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LangProvider }          from './src/context/LangContext';

import LoginScreen         from './src/screens/LoginScreen';
import DashboardScreen     from './src/screens/DashboardScreen';
import AddDrugScreen       from './src/screens/AddDrugScreen';
import TransferScreen      from './src/screens/TransferScreen';
import BlockchainScreen    from './src/screens/BlockchainScreen';
import VerifyScreen        from './src/screens/VerifyScreen';
import AuditScreen         from './src/screens/AuditScreen';
import AttackDemoScreen    from './src/screens/AttackDemoScreen';
import RiskAnalystScreen   from './src/screens/RiskAnalystScreen';
import SupplyAdvisorScreen from './src/screens/SupplyAdvisorScreen';
import QRControlScreen     from './src/screens/QRControlScreen';
import DrugInfoScreen      from './src/screens/DrugInfoScreen';
import PatientChatScreen   from './src/screens/PatientChatScreen';
import SettingsScreen      from './src/screens/SettingsScreen';
import MenuModal           from './src/components/MenuModal';

import { C } from './src/theme/colors';

const Stack = createStackNavigator();

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard"     component={DashboardScreen} />
      <Stack.Screen name="AddDrug"       component={AddDrugScreen} />
      <Stack.Screen name="Transfer"      component={TransferScreen} />
      <Stack.Screen name="Blockchain"    component={BlockchainScreen} />
      <Stack.Screen name="Verify"        component={VerifyScreen} />
      <Stack.Screen name="AttackDemo"    component={AttackDemoScreen} />
      <Stack.Screen name="Audit"         component={AuditScreen} />
      <Stack.Screen name="RiskAnalyst"   component={RiskAnalystScreen} />
      <Stack.Screen name="SupplyAdvisor" component={SupplyAdvisorScreen} />
      <Stack.Screen name="QRControl"     component={QRControlScreen} />
      <Stack.Screen name="DrugInfo"      component={DrugInfoScreen} />
      <Stack.Screen name="PatientChat"   component={PatientChatScreen} />
      <Stack.Screen name="Settings"      component={SettingsScreen} />
      <Stack.Screen
        name="MenuModal"
        component={MenuModal}
        options={{
          headerShown: false,
          cardStyle: { backgroundColor: 'transparent' },
          cardOverlayEnabled: true,
          presentation: 'transparentModal',
        }}
      />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={C.teal500} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        <Stack.Screen name="App" component={AppStack} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LangProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" backgroundColor={C.teal600} />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: C.teal50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
