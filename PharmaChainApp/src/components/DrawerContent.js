import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { C } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../utils/i18n';

const NAV_ITEMS = [
  { key: 'Dashboard',        icon: '📊', i18nKey: 'nav_dashboard',   roles: ['all'] },
  { key: 'AddDrug',          icon: '💊', i18nKey: 'nav_add_drug',    roles: ['Factory', 'Admin'] },
  { key: 'Transfer',         icon: '🔄', i18nKey: 'nav_transfer',    roles: ['Factory', 'Distributor', 'Pharmacy', 'Admin'] },
  { key: 'Blockchain',       icon: '⛓️',  i18nKey: 'nav_blockchain',  roles: ['all'] },
  { key: 'Verify',           icon: '✅', i18nKey: 'nav_verify',      roles: ['all'] },
  { key: 'AttackDemo',       icon: '🛡️',  i18nKey: 'nav_tamper',     roles: ['Admin'] },
  { key: 'Audit',            icon: '📋', i18nKey: 'nav_audit',       roles: ['Admin', 'LedgerAdmin'] },
  { key: 'Inventory',        icon: '📦', i18nKey: 'nav_inventory',   roles: ['Admin'] },
  { key: 'InventoryReports', icon: '📊', i18nKey: 'nav_inv_reports', roles: ['Admin', 'LedgerAdmin'] },
];

const AI_ITEMS = [
  { key: 'RiskAnalyst',   icon: '🤖', i18nKey: 'nav_risk',       roles: ['Admin'] },
  { key: 'SupplyAdvisor', icon: '📈', i18nKey: 'nav_advisor',    roles: ['Admin'] },
];

const EXTRA_ITEMS = [
  { key: 'QRControl',     icon: '🔐', i18nKey: 'nav_qr_control', roles: ['all'] },
  { key: 'DrugInfo',      icon: '🔬', i18nKey: 'nav_drug_info',  roles: ['all'] },
  { key: 'PatientChat',   icon: '💬', i18nKey: 'nav_patient_chat', roles: ['all'] },
];

function canAccess(roles, userRole) {
  if (roles.includes('all')) return true;
  return roles.includes(userRole);
}

function NavItem({ item, active, onPress, lang }) {
  return (
    <TouchableOpacity
      style={[styles.navItem, active && styles.navItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.navIcon}>{item.icon}</Text>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
        {t(item.i18nKey, lang)}
      </Text>
    </TouchableOpacity>
  );
}

export default function DrawerContent(props) {
  const { navigation, state } = props;
  const { username, role, signOut } = useAuth();
  const { lang, toggle, isRTL }     = useLang();

  const activeRoute = state.routes[state.index]?.name || 'Dashboard';

  function roleLabel(r) {
    const map = {
      Factory: t('role_factory', lang),
      Distributor: t('role_distributor', lang),
      Pharmacy: t('role_pharmacy', lang),
      Admin: t('role_admin', lang),
      LedgerAdmin: t('role_ledger', lang),
    };
    return map[r] || r;
  }

  function roleBg(r) {
    const map = { Factory: C.teal600, Distributor: C.cyan600, Pharmacy: C.emerald600, Admin: C.purple600, LedgerAdmin: C.amber600 };
    return map[r] || C.teal600;
  }

  return (
    <DrawerContentScrollView
      {...props}
      style={styles.container}
      contentContainerStyle={{ paddingTop: 0 }}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🔗</Text>
        </View>
        <Text style={styles.logoText}>
          <Text style={styles.logoPharma}>Pharma</Text>
          <Text style={styles.logoChain}>Chain</Text>
        </Text>
        <Text style={styles.logoSub}>{t('sidebar_sub', lang)}</Text>

        {/* Language toggle */}
        <TouchableOpacity style={styles.langBtn} onPress={toggle}>
          <Text style={styles.langBtnText}>{lang === 'ar' ? '🇬🇧 EN' : '🇸🇦 AR'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── User badge ── */}
      <View style={styles.userBadge}>
        <View style={[styles.roleTag, { backgroundColor: roleBg(role) }]}>
          <Text style={styles.roleTagText}>{roleLabel(role)}</Text>
        </View>
        <Text style={styles.usernameText}>👤 {username}</Text>
      </View>

      <View style={styles.divider} />

      {/* ── Main nav ── */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>MAIN</Text>
        {NAV_ITEMS.filter(i => canAccess(i.roles, role)).map(item => (
          <NavItem
            key={item.key}
            item={item}
            active={activeRoute === item.key}
            lang={lang}
            onPress={() => navigation.navigate(item.key)}
          />
        ))}

        {/* AI section */}
        {AI_ITEMS.some(i => canAccess(i.roles, role)) && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>{t('nav_ai_section', lang)}</Text>
            {AI_ITEMS.filter(i => canAccess(i.roles, role)).map(item => (
              <NavItem
                key={item.key}
                item={item}
                active={activeRoute === item.key}
                lang={lang}
                onPress={() => navigation.navigate(item.key)}
              />
            ))}
          </>
        )}

        {/* Extra */}
        <Text style={[styles.sectionLabel, { marginTop: 12 }]}>OTHER</Text>
        {EXTRA_ITEMS.filter(i => canAccess(i.roles, role)).map(item => (
          <NavItem
            key={item.key}
            item={item}
            active={activeRoute === item.key}
            lang={lang}
            onPress={() => navigation.navigate(item.key)}
          />
        ))}

        {/* Settings */}
        <NavItem
          item={{ key: 'Settings', icon: '⚙️', i18nKey: 'settings_title' }}
          active={activeRoute === 'Settings'}
          lang={lang}
          onPress={() => navigation.navigate('Settings')}
        />
      </ScrollView>

      {/* ── Logout ── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutText}>🚪 {t('btn_logout', lang)}</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.teal800,
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.teal600,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: C.teal400,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  logoEmoji:  { fontSize: 26 },
  logoText:   { fontSize: 22, fontWeight: '900' },
  logoPharma: { color: C.white },
  logoChain:  { color: C.teal400 },
  logoSub:    { fontSize: 11, color: C.teal300, marginTop: 3 },
  langBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  langBtnText: { color: C.teal200, fontSize: 12, fontWeight: '600' },

  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  roleTag: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleTagText:  { color: C.white, fontSize: 11, fontWeight: '700' },
  usernameText: { color: C.teal200, fontSize: 13, flex: 1 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 16, marginVertical: 6 },

  sectionLabel: {
    color: C.teal400,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 2,
  },

  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginHorizontal: 8,
    borderRadius: 10,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(20,184,166,0.25)',
    borderLeftWidth: 3,
    borderLeftColor: C.teal400,
  },
  navIcon:       { fontSize: 17 },
  navLabel:      { color: C.teal200, fontSize: 14 },
  navLabelActive:{ color: C.white, fontWeight: '700' },

  logoutBtn: {
    margin: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    marginBottom: 24,
  },
  logoutText: { color: '#fca5a5', fontSize: 14, fontWeight: '600' },
});
