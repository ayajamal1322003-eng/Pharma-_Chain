import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

import { useAuth }  from '../context/AuthContext';
import { useLang }  from '../context/LanguageContext';
import { COLORS, ROLES, ADMIN_ROLES } from '../utils/constants';

// ── Screens ─────────────────────────────────────────────────
import LoginScreen    from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AddDrugScreen  from '../screens/AddDrugScreen';
import TransferScreen from '../screens/TransferScreen';
import BlockchainScreen from '../screens/BlockchainScreen';
import VerifyScreen   from '../screens/VerifyScreen';
import QRControlScreen from '../screens/QRControlScreen';
import AuditScreen    from '../screens/AuditScreen';
import DrugInfoScreen from '../screens/DrugInfoScreen';

const Stack  = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// ── Custom Drawer Content ────────────────────────────────────
function CustomDrawer(props) {
  const { user, logout } = useAuth();
  const { t, isRTL, switchLanguage, lang } = useLang();

  const handleLogout = () => {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const isAdmin = user && ADMIN_ROLES.includes(user.role);
  const canAddDrug = user && [ROLES.FACTORY, ROLES.ADMIN].includes(user.role);
  const canTransfer = user && [ROLES.FACTORY, ROLES.DISTRIBUTOR, ROLES.PHARMACY].includes(user.role);

  const navItem = (label, screen, icon) => (
    <DrawerItem
      key={screen}
      label={label}
      icon={({ color, size }) => <Ionicons name={icon} size={size} color={color} />}
      onPress={() => props.navigation.navigate(screen)}
      activeTintColor={COLORS.primary}
      inactiveTintColor={COLORS.text}
      labelStyle={[styles.drawerLabel, isRTL && styles.rtlText]}
    />
  );

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContainer}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        <View style={styles.avatarCircle}>
          <Ionicons name="medkit" size={28} color="#fff" />
        </View>
        <Text style={styles.drawerTitle}>{t('appName')}</Text>
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.drawerUsername}>{user.username}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user.role}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Navigation Items */}
      <View style={styles.drawerItems}>
        {navItem(t('dashboard'),  'Dashboard',  'home-outline')}
        {navItem(t('drugInfo'),   'DrugInfo',   'medical-outline')}
        {canAddDrug  && navItem(t('addDrug'),   'AddDrug',    'add-circle-outline')}
        {canTransfer && navItem(t('transfer'),  'Transfer',   'swap-horizontal-outline')}
        {navItem(t('blockchain'), 'Blockchain', 'git-network-outline')}
        {navItem(t('verifyQR'),   'Verify',     'qr-code-outline')}
        {isAdmin && navItem(t('qrControl'), 'QRControl', 'settings-outline')}
        {isAdmin && navItem(t('auditLog'),  'Audit',     'document-text-outline')}
      </View>

      {/* Footer */}
      <View style={styles.drawerFooter}>
        {/* Language Toggle */}
        <TouchableOpacity style={styles.langBtn} onPress={switchLanguage}>
          <Ionicons name="language-outline" size={18} color={COLORS.primary} />
          <Text style={styles.langText}>{lang === 'ar' ? 'English' : 'العربية'}</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

// ── Main Drawer Navigator ─────────────────────────────────────
function MainDrawer() {
  const { t, isRTL } = useLang();

  const screenOpts = (title) => ({
    title,
    headerStyle:     { backgroundColor: COLORS.primary },
    headerTintColor: '#fff',
    headerTitleStyle:{ fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' },
    drawerPosition:  isRTL ? 'right' : 'left',
  });

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        drawerStyle:      { backgroundColor: COLORS.background },
        drawerActiveBackgroundColor: '#d1fae5',
        headerStyle:      { backgroundColor: COLORS.primary },
        headerTintColor:  '#fff',
      }}
    >
      <Drawer.Screen name="Dashboard"  component={DashboardScreen}  options={screenOpts(t('dashboard'))} />
      <Drawer.Screen name="DrugInfo"   component={DrugInfoScreen}   options={screenOpts(t('drugInfo'))} />
      <Drawer.Screen name="AddDrug"    component={AddDrugScreen}    options={screenOpts(t('addDrug'))} />
      <Drawer.Screen name="Transfer"   component={TransferScreen}   options={screenOpts(t('transfer'))} />
      <Drawer.Screen name="Blockchain" component={BlockchainScreen} options={screenOpts(t('blockchain'))} />
      <Drawer.Screen name="Verify"     component={VerifyScreen}     options={screenOpts(t('verifyQR'))} />
      <Drawer.Screen name="QRControl"  component={QRControlScreen}  options={screenOpts(t('qrControl'))} />
      <Drawer.Screen name="Audit"      component={AuditScreen}      options={screenOpts(t('auditLog'))} />
    </Drawer.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null; // splash handles this

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainDrawer} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  drawerContainer: { flex: 1 },
  drawerHeader: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  drawerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userInfo:    { alignItems: 'center', marginTop: 6 },
  drawerUsername: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 12, marginTop: 4,
  },
  roleText:    { color: '#fff', fontSize: 11, fontWeight: '600' },
  drawerItems: { flex: 1, paddingTop: 8 },
  drawerLabel: { fontSize: 14 },
  rtlText:     { textAlign: 'right' },
  drawerFooter:{ borderTopWidth: 1, borderTopColor: COLORS.border, padding: 12, gap: 8 },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: '#f0fdf4', borderRadius: 8,
  },
  langText:    { color: COLORS.primary, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: COLORS.errorBg, borderRadius: 8,
  },
  logoutText:  { color: COLORS.error, fontWeight: '600' },
});
