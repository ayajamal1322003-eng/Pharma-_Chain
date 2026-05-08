import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth }  from '../context/AuthContext';
import { useLang }  from '../context/LanguageContext';
import { COLORS }   from '../utils/constants';
import { getErrorMessage } from '../services/api';

export default function LoginScreen() {
  const { login }             = useAuth();
  const { t, isRTL, switchLanguage, lang } = useLang();

  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError(t('loginError'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err) || t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  const align = isRTL ? 'right' : 'left';
  const flexDir = isRTL ? 'row-reverse' : 'row';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="medkit" size={40} color="#fff" />
          </View>
          <Text style={styles.appName}>{t('appName')}</Text>
          <Text style={styles.subtitle}>{t('loginWelcome')}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Language toggle */}
          <TouchableOpacity style={[styles.langRow, { flexDirection: flexDir }]} onPress={switchLanguage}>
            <Ionicons name="language-outline" size={16} color={COLORS.primary} />
            <Text style={styles.langTxt}>{lang === 'ar' ? 'English' : 'العربية'}</Text>
          </TouchableOpacity>

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          )}

          {/* Username */}
          <Text style={[styles.label, { textAlign: align }]}>{t('username')}</Text>
          <View style={[styles.inputRow, { flexDirection: flexDir }]}>
            <Ionicons name="person-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { textAlign: align }]}
              value={username}
              onChangeText={setUsername}
              placeholder={t('username')}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <Text style={[styles.label, { textAlign: align }]}>{t('password')}</Text>
          <View style={[styles.inputRow, { flexDirection: flexDir }]}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { textAlign: align }]}
              value={password}
              onChangeText={setPassword}
              placeholder={t('password')}
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPass((p) => !p)} style={styles.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.loginBtnTxt}>{t('loginBtn')}</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>PharmaChain v1.0 — Blockchain Drug Tracking</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: COLORS.primary },
  scroll:   { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header:   { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  appName:  { fontSize: 26, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12,
  },
  langRow:  { alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginBottom: 16 },
  langTxt:  { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.errorBg, borderRadius: 8, padding: 10, marginBottom: 12,
  },
  errorTxt: { color: COLORS.error, fontSize: 13, flex: 1 },
  label:    { fontSize: 13, color: COLORS.text, fontWeight: '600', marginBottom: 6 },
  inputRow: {
    alignItems: 'center', backgroundColor: COLORS.background,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, marginBottom: 16, height: 50,
  },
  inputIcon: { marginRight: 8 },
  input:    { flex: 1, color: COLORS.text, fontSize: 15 },
  eyeBtn:   { padding: 4 },
  loginBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer:   { color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'center', marginTop: 24 },
});
