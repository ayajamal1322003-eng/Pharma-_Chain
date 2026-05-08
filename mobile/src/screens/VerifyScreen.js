import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { Camera }    from 'expo-camera';
import { Ionicons }  from '@expo/vector-icons';
import { useLang }   from '../context/LanguageContext';
import { verifyQR, getErrorMessage } from '../services/api';
import { COLORS }    from '../utils/constants';

export default function VerifyScreen() {
  const { t, isRTL } = useLang();

  const [mode,       setMode]      = useState('manual'); // 'scan' | 'manual'
  const [hasPermission, setHasPerm]= useState(null);
  const [scanned,    setScanned]   = useState(false);
  const [form,       setForm]      = useState({ drugId: '', prodDate: '', sig: '', seq: '' });
  const [loading,    setLoading]   = useState(false);
  const [result,     setResult]    = useState(null);
  const [error,      setError]     = useState('');

  useEffect(() => {
    if (mode === 'scan') {
      Camera.requestCameraPermissionsAsync().then(({ status }) => setHasPerm(status === 'granted'));
    }
  }, [mode]);

  const handleBarcode = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    // Parse verify URL: /verify.html?id=X&date=Y&sig=Z&seq=N
    try {
      const url    = new URL(data.includes('?') ? 'http://x.x' + data.substring(data.indexOf('?') - 100) : data);
      const params = url.searchParams;
      setForm({
        drugId:   params.get('id')   || '',
        prodDate: params.get('date') || '',
        sig:      params.get('sig')  || '',
        seq:      params.get('seq')  || '',
      });
      setMode('manual');
    } catch (_) {
      // Raw text scan fallback
      setForm((f) => ({ ...f, drugId: data }));
      setMode('manual');
    }
  };

  const handleVerify = async () => {
    const { drugId, prodDate, sig, seq } = form;
    if (!drugId || !prodDate || !sig || !seq) {
      setError('Please fill all fields');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await verifyQR({
        drugId:   parseInt(drugId, 10),
        prodDate,
        sig,
        seq:      parseInt(seq, 10),
      });
      setResult(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));
  const align = isRTL ? 'right' : 'left';

  // ── Camera scanner ─────────────────────────────────────────
  if (mode === 'scan') {
    if (hasPermission === null) return (
      <View style={styles.permContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.permTxt}>{t('loading')}</Text>
      </View>
    );
    if (hasPermission === false) return (
      <View style={styles.permContainer}>
        <Ionicons name="camera-off-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.permTxt}>{t('cameraPermission')}</Text>
        <TouchableOpacity style={styles.permBtn} onPress={() => Linking.openSettings()}>
          <Text style={styles.permBtnTxt}>{t('openSettings')}</Text>
        </TouchableOpacity>
      </View>
    );
    return (
      <View style={styles.cameraContainer}>
        <Camera
          style={StyleSheet.absoluteFillObject}
          onBarCodeScanned={handleBarcode}
          barCodeScannerSettings={{ barCodeTypes: ['qr'] }}
        />
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>{t('scanQR')}</Text>
          <TouchableOpacity style={styles.cancelScanBtn} onPress={() => setMode('manual')}>
            <Text style={styles.cancelScanTxt}>{t('manualVerify')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Manual form ─────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'scan' && styles.modeBtnActive]}
          onPress={() => { setScanned(false); setMode('scan'); }}
        >
          <Ionicons name="qr-code-outline" size={18} color={mode === 'scan' ? '#fff' : COLORS.primary} />
          <Text style={[styles.modeTxt, mode === 'scan' && { color: '#fff' }]}>{t('scanQR')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
          onPress={() => setMode('manual')}
        >
          <Ionicons name="create-outline" size={18} color={mode === 'manual' ? '#fff' : COLORS.primary} />
          <Text style={[styles.modeTxt, mode === 'manual' && { color: '#fff' }]}>{t('manualVerify')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.errorTxt}>{error}</Text>
          </View>
        )}

        {[
          { key: 'drugId',   label: t('drugId'),    keyboard: 'numeric' },
          { key: 'prodDate', label: t('prodDate'),  keyboard: 'default' },
          { key: 'sig',      label: t('signature'), keyboard: 'default' },
          { key: 'seq',      label: t('sequence'),  keyboard: 'numeric' },
        ].map(({ key, label, keyboard }) => (
          <View key={key} style={styles.fieldGroup}>
            <Text style={[styles.label, { textAlign: align }]}>{label}</Text>
            <TextInput
              style={[styles.input, { textAlign: align }]}
              value={form[key]}
              onChangeText={set(key)}
              placeholder={label}
              placeholderTextColor={COLORS.textMuted}
              keyboardType={keyboard}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.verifyBtn, loading && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
                <Text style={styles.verifyBtnTxt}>{t('verifyBtn')}</Text>
              </View>
            )}
        </TouchableOpacity>
      </View>

      {/* Result */}
      {result && (
        <View style={[styles.resultCard, { borderLeftColor: result.isValid ? COLORS.success : COLORS.error }]}>
          <View style={styles.resultHeader}>
            <Ionicons
              name={result.isValid ? 'checkmark-circle' : 'warning'}
              size={32}
              color={result.isValid ? COLORS.success : COLORS.error}
            />
            <Text style={[styles.resultTitle, { color: result.isValid ? COLORS.success : COLORS.error }]}>
              {result.isValid ? t('verifyValid') : t('verifyInvalid')}
            </Text>
          </View>
          <Text style={styles.resultMsg}>{result.message}</Text>
          {result.attackType && result.attackType !== 'NONE' && (
            <View style={styles.attackBadge}>
              <Ionicons name="bug-outline" size={14} color={COLORS.error} />
              <Text style={styles.attackTxt}>{t('attackType')}: {result.attackType}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  permContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
  permTxt:        { color: COLORS.textLight, fontSize: 15, textAlign: 'center' },
  permBtn:        { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  permBtnTxt:     { color: '#fff', fontWeight: '600' },
  cameraContainer:{ flex: 1 },
  scanOverlay:    { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', gap: 24 },
  scanFrame:      { width: 220, height: 220, borderWidth: 2, borderColor: '#fff', borderRadius: 16 },
  scanHint:       { color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  cancelScanBtn:  { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  cancelScanTxt:  { color: '#fff', fontWeight: '600' },
  modeRow:        { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modeBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, paddingVertical: 10 },
  modeBtnActive:  { backgroundColor: COLORS.primary },
  modeTxt:        { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  card:           { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  errorBox:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.errorBg, borderRadius: 8, padding: 10, marginBottom: 12 },
  errorTxt:       { color: COLORS.error, fontSize: 13, flex: 1 },
  fieldGroup:     { marginBottom: 14 },
  label:          { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 5 },
  input:          { backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.text },
  verifyBtn:      { backgroundColor: COLORS.primary, borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  verifyBtnTxt:   { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultCard:     { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginTop: 16, borderLeftWidth: 4 },
  resultHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  resultTitle:    { fontSize: 16, fontWeight: 'bold', flex: 1 },
  resultMsg:      { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  attackBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.errorBg, borderRadius: 8, padding: 8, marginTop: 10 },
  attackTxt:      { color: COLORS.error, fontSize: 12, fontWeight: '600' },
});
