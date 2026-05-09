import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { API_BASE } from '../config';
import Header from '../components/Header';

export default function SettingsScreen({ navigation }) {
  const { username, role, signOut } = useAuth();
  const { lang, toggle }            = useLang();
  const T = (k) => t(k, lang);

  const [apiUrl,  setApiUrl]  = useState('');
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('api_base').then(v => setApiUrl(v || API_BASE));
  }, []);

  async function saveApiUrl() {
    const url = apiUrl.trim();
    if (!url) { Alert.alert('', 'Please enter a valid URL'); return; }
    await AsyncStorage.setItem('api_base', url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={T('settings_title')} onMenuPress={() => navigation.navigate('MenuModal')} />
      <ScrollView style={styles.scroll}>

        {/* User info */}
        <View style={styles.userCard}>
          <View style={styles.avatarBox}><Text style={{ fontSize: 28 }}>👤</Text></View>
          <View>
            <Text style={styles.usernameText}>{username}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{role}</Text>
            </View>
          </View>
        </View>

        {/* Language */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{T('settings_lang')}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'ar' && styles.langBtnActive]}
              onPress={() => lang !== 'ar' && toggle()}
            >
              <Text style={[styles.langBtnText, lang === 'ar' && { color: C.white }]}>🇸🇦 {T('settings_lang_ar')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
              onPress={() => lang !== 'en' && toggle()}
            >
              <Text style={[styles.langBtnText, lang === 'en' && { color: C.white }]}>🇬🇧 {T('settings_lang_en')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* API URL */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{T('settings_api_url')}</Text>
          <Text style={styles.cardSub}>
            {lang === 'ar'
              ? 'أدخل عنوان السيرفر. مثال: http://192.168.1.X:7036 أو رابط ngrok'
              : 'Enter server address. Example: http://192.168.1.X:7036 or ngrok URL'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="http://192.168.1.X:7036"
            placeholderTextColor={C.gray400}
            value={apiUrl}
            onChangeText={v => { setApiUrl(v); setSaved(false); }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveApiUrl}>
            <Text style={styles.saveBtnText}>
              {saved ? `✅ ${T('settings_saved')}` : `💾 ${T('settings_save')}`}
            </Text>
          </TouchableOpacity>

          {/* Quick presets */}
          <Text style={[styles.cardSub, { marginTop: 14 }]}>
            {lang === 'ar' ? 'اختصارات سريعة:' : 'Quick presets:'}
          </Text>
          {[
            { label: 'Android Emulator', url: 'http://10.0.2.2:7036' },
            { label: 'iOS Simulator',    url: 'http://localhost:7036' },
          ].map(p => (
            <TouchableOpacity
              key={p.label}
              style={styles.presetBtn}
              onPress={() => { setApiUrl(p.url); setSaved(false); }}
            >
              <Text style={styles.presetLabel}>{p.label}</Text>
              <Text style={styles.presetUrl}>{p.url}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PharmaChain v2.0</Text>
          <Text style={styles.aboutText}>
            {lang === 'ar'
              ? 'نظام تتبع الأدوية المبني على Blockchain + AI\nحماية بـ JWT + HMAC-SHA256'
              : 'Blockchain + AI Drug Tracking System\nSecured with JWT + HMAC-SHA256'}
          </Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutText}>🚪 {T('btn_logout')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.white, margin: 12, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  avatarBox: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.teal100, alignItems: 'center', justifyContent: 'center',
  },
  usernameText: { fontSize: 18, fontWeight: '900', color: C.gray900 },
  roleBadge: {
    marginTop: 4, backgroundColor: C.teal600,
    borderRadius: 12, paddingVertical: 2, paddingHorizontal: 10, alignSelf: 'flex-start',
  },
  roleText: { color: C.white, fontSize: 11, fontWeight: '700' },

  card: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 12, marginBottom: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.gray900, marginBottom: 6 },
  cardSub:   { fontSize: 12, color: C.gray500, marginBottom: 10 },

  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: C.gray100, borderWidth: 1.5, borderColor: C.gray200,
  },
  langBtnActive: { backgroundColor: C.teal600, borderColor: C.teal600 },
  langBtnText:   { fontSize: 13, fontWeight: '600', color: C.gray700 },

  input: {
    borderWidth: 1.5, borderColor: C.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: C.gray900, backgroundColor: C.gray50, marginBottom: 12,
    fontFamily: 'monospace',
  },
  saveBtn:     { backgroundColor: C.teal600, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },

  presetBtn: {
    backgroundColor: C.gray50, borderRadius: 10, padding: 10, marginTop: 6,
    borderWidth: 1, borderColor: C.gray200,
  },
  presetLabel: { fontSize: 12, fontWeight: '700', color: C.gray700 },
  presetUrl:   { fontSize: 11, color: C.gray400, fontFamily: 'monospace', marginTop: 2 },

  aboutText: { fontSize: 13, color: C.gray600, lineHeight: 20 },

  logoutBtn: {
    marginHorizontal: 12, marginBottom: 12, backgroundColor: C.rose50,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.rose200,
  },
  logoutText: { color: C.rose700, fontSize: 15, fontWeight: '700' },
});
