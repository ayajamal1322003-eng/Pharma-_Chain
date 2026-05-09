import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Animated, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { login }   from '../utils/api';

export default function LoginScreen() {
  const { signIn }         = useAuth();
  const { lang, toggle }   = useLang();
  const T = (key) => t(key, lang);

  const [username,      setUsername]      = useState('');
  const [password,      setPassword]      = useState('');
  const [showPwd,       setShowPwd]       = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [btnLabel,      setBtnLabel]      = useState('');
  const [error,         setError]         = useState('');
  const [warning,       setWarning]       = useState('');
  const [attempts,      setAttempts]      = useState(0);
  const [blocked,       setBlocked]       = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function doLogin() {
    if (blocked) return;
    setError(''); setWarning('');

    if (!username.trim() || !password) {
      setError(T('login_err_fields')); shake(); return;
    }

    setLoading(true);
    setBtnLabel(T('login_verifying'));

    try {
      const { ok, status, data } = await login(username.trim(), password);

      if (ok) {
        setBtnLabel(T('login_success'));
        await signIn(data.token, data.username, data.role);
      } else if (status === 429) {
        setBlocked(true);
        setError(T('login_err_locked'));
        setTimeout(() => setBlocked(false), 300000);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        const rem = data.remainingAttempts ?? Math.max(0, 5 - newAttempts);
        setError(`${T('login_err_creds')}\n${T('login_attempts')}: ${rem} / 5`);
        if (rem <= 2) setWarning(`⚠️ ${T('login_warn')} ${rem} ${T('login_warn2')}`);
        shake();
        setLoading(false);
        setBtnLabel('');
      }
    } catch {
      setError(T('login_err_server'));
      shake();
      setLoading(false);
      setBtnLabel('');
    }
  }

  const attemptsPct = `${(attempts / 5) * 100}%`;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Language toggle */}
      <TouchableOpacity style={styles.langBtn} onPress={toggle}>
        <Text style={styles.langBtnText}>{lang === 'ar' ? '🇬🇧 EN' : '🇸🇦 AR'}</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Supply chain background decoration */}
          <View style={styles.bgRow}>
            {['🏭','💊','📋','🚚','🏪','💉','👤'].map((emoji, i) => (
              <View key={i} style={styles.bgNode}>
                <Text style={styles.bgEmoji}>{emoji}</Text>
              </View>
            ))}
          </View>

          {/* Card */}
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
            {/* Logo */}
            <View style={styles.logoArea}>
              <View style={styles.logoBox}>
                <Text style={{ fontSize: 26 }}>🔗</Text>
              </View>
              <Text style={styles.logoText}>
                <Text style={styles.logoPharma}>Pharma</Text>
                <Text style={styles.logoChain}>Chain</Text>
              </Text>
              <Text style={styles.logoSub}>{T('login_subtitle')}</Text>
            </View>

            {/* Username */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{T('login_username')}</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  placeholder={T('login_username_ph')}
                  placeholderTextColor={C.gray400}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  textAlign={lang === 'ar' ? 'right' : 'left'}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{T('login_password')}</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder={T('login_password_ph')}
                  placeholderTextColor={C.gray400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPwd}
                  returnKeyType="go"
                  onSubmitEditing={doLogin}
                  textAlign={lang === 'ar' ? 'right' : 'left'}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPwd(v => !v)}>
                  <Text style={{ fontSize: 16 }}>{showPwd ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.pwdHint}>{T('login_pwd_hint')}</Text>
            </View>

            {/* Attempts bar */}
            {attempts > 0 && (
              <View style={styles.attemptsBar}>
                <View style={[styles.attemptsFill, { width: attemptsPct }]} />
              </View>
            )}

            {/* Login button */}
            <TouchableOpacity
              style={[styles.loginBtn, (loading || blocked) && styles.loginBtnDisabled]}
              onPress={doLogin}
              disabled={loading || blocked}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={C.white} size="small" />
                : <Text style={styles.loginBtnText}>
                    {blocked ? T('login_blocked') : btnLabel || T('login_btn')}
                  </Text>
              }
            </TouchableOpacity>

            {/* Error box */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Warning box */}
            {!!warning && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            )}

            {/* Security strip */}
            <View style={styles.secStrip}>
              <View style={styles.secDot} />
              <Text style={styles.secText}>{T('login_security')}</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#e8f8f4' },
  langBtn: {
    position: 'absolute', top: 56, left: 18, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1.5, borderColor: 'rgba(20,184,166,0.35)',
    borderRadius: 50, paddingVertical: 7, paddingHorizontal: 14,
  },
  langBtnText: { color: C.teal600, fontSize: 13, fontWeight: '600' },

  scroll: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, paddingHorizontal: 20,
  },

  // Background nodes
  bgRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 8, marginBottom: 20, opacity: 0.35,
  },
  bgNode: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.teal200,
  },
  bgEmoji: { fontSize: 20 },

  // Card
  card: {
    width: '100%', maxWidth: 420,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 24, padding: 32,
    shadowColor: C.teal600, shadowOpacity: 0.15,
    shadowRadius: 20, elevation: 8,
  },

  // Logo
  logoArea:  { alignItems: 'center', marginBottom: 28 },
  logoBox: {
    width: 62, height: 62, borderRadius: 18,
    backgroundColor: C.teal600, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: C.teal600, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  logoText:   { fontSize: 26, fontWeight: '900' },
  logoPharma: { color: C.gray900 },
  logoChain:  { color: C.teal600 },
  logoSub:    { fontSize: 13, color: C.gray500, marginTop: 5 },

  // Form
  formGroup:  { marginBottom: 16 },
  label:      { fontSize: 13, fontWeight: '600', color: C.gray700, marginBottom: 7 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.gray200,
    borderRadius: 12, backgroundColor: C.gray50,
  },
  inputIcon:  { paddingHorizontal: 12, fontSize: 15 },
  input: {
    flex: 1, paddingVertical: 12, paddingRight: 12,
    fontSize: 14, color: C.gray900,
  },
  eyeBtn:     { paddingHorizontal: 12 },
  pwdHint:    { fontSize: 11, color: C.gray400, marginTop: 5 },

  // Attempts bar
  attemptsBar: {
    height: 4, backgroundColor: C.gray200, borderRadius: 2,
    marginBottom: 12, overflow: 'hidden',
  },
  attemptsFill: {
    height: '100%',
    backgroundColor: C.rose500,
    borderRadius: 2,
  },

  // Login button
  loginBtn: {
    backgroundColor: C.teal600,
    borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
    shadowColor: C.teal600, shadowOpacity: 0.35,
    shadowRadius: 8, elevation: 4,
  },
  loginBtnDisabled: { backgroundColor: C.gray300, shadowOpacity: 0 },
  loginBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },

  // Messages
  errorBox: {
    marginTop: 12, backgroundColor: C.rose50,
    borderWidth: 1.5, borderColor: C.rose200,
    borderRadius: 10, padding: 12,
  },
  errorText: { color: C.rose700, fontSize: 13, lineHeight: 20 },
  warningBox: {
    marginTop: 8, backgroundColor: C.amber50,
    borderWidth: 1.5, borderColor: C.amber200,
    borderRadius: 10, padding: 12,
  },
  warningText: { color: C.amber600, fontSize: 13 },

  // Security strip
  secStrip: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 20,
    paddingTop: 16, borderTopWidth: 1, borderTopColor: C.gray100,
    gap: 8,
  },
  secDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: C.emerald500,
  },
  secText: { fontSize: 11, color: C.gray400, flex: 1, textAlign: 'center' },
});
