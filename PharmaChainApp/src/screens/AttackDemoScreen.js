import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { verifyQR, getChain } from '../utils/api';
import Header from '../components/Header';

export default function AttackDemoScreen({ navigation }) {
  const { lang } = useLang();
  const T = (k) => t(k, lang);

  const [qrInput,    setQrInput]    = useState('');
  const [qrResult,   setQrResult]   = useState(null);
  const [qrLoading,  setQrLoading]  = useState(false);
  const [chainId,    setChainId]    = useState('');
  const [chainResult,setChainResult]= useState(null);
  const [chainLoading,setChainLoad] = useState(false);

  async function inspectQR() {
    if (!qrInput.trim()) return;
    setQrLoading(true); setQrResult(null);
    const { ok, data } = await verifyQR(qrInput.trim());
    setQrResult({ ok, ...data });
    setQrLoading(false);
  }

  async function inspectChain() {
    if (!chainId.trim()) return;
    setChainLoad(true); setChainResult(null);
    const { ok, data } = await getChain(chainId.trim());
    const blocks = Array.isArray(data) ? data : (data?.blocks || []);
    let valid = true;
    for (let i = 1; i < blocks.length; i++) {
      if (blocks[i].previousHash !== blocks[i - 1].hash) { valid = false; break; }
    }
    setChainResult({ ok, blocks: blocks.length, valid });
    setChainLoad(false);
  }

  const ATTACK_TYPES = [
    { icon: '❌', label: 'Signature Mismatch',  desc: 'QR copied from another drug' },
    { icon: '📅', label: 'Date Mismatch',       desc: 'QR created on different date' },
    { icon: '👻', label: 'Drug Not Found',      desc: 'Fake drug ID in QR' },
    { icon: '⏰', label: 'QR Expired',           desc: 'QR older than 1 year' },
    { icon: '🚫', label: 'Quota Exceeded',      desc: 'Over monthly generation limit' },
    { icon: '✅', label: 'Legitimate Scan',     desc: 'All checks pass' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={T('attack_title')} subtitle={T('attack_subtitle')} onMenuPress={() => navigation.navigate('MenuModal')} />
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Attack types reference */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛡️ QR Attack Types</Text>
          {ATTACK_TYPES.map((a, i) => (
            <View key={i} style={styles.attackRow}>
              <Text style={styles.attackIcon}>{a.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.attackLabel}>{a.label}</Text>
                <Text style={styles.attackDesc}>{a.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* QR inspector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{T('attack_qr_title')}</Text>
          <Text style={styles.cardSub}>{T('attack_qr_sub')}</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder={T('attack_qr_ph')}
            placeholderTextColor={C.gray400}
            value={qrInput} onChangeText={v => { setQrInput(v); setQrResult(null); }}
            multiline
          />
          <TouchableOpacity
            style={[styles.btn, qrLoading && styles.btnDisabled]}
            onPress={inspectQR} disabled={qrLoading}
          >
            {qrLoading
              ? <ActivityIndicator color={C.white} size="small" />
              : <Text style={styles.btnText}>🔍 {T('attack_btn')}</Text>
            }
          </TouchableOpacity>

          {qrResult && (
            <View style={[styles.resultBox, {
              backgroundColor: qrResult.attackType === 'None' ? C.emerald50 : C.rose50,
              borderColor: qrResult.attackType === 'None' ? C.emerald300 : C.rose300,
            }]}>
              <Text style={[styles.resultTitle, { color: qrResult.attackType === 'None' ? C.emerald700 : C.rose700 }]}>
                {qrResult.attackType === 'None' ? T('attack_result_ok') : T('attack_result_fail')}
              </Text>
              {qrResult.attackType && qrResult.attackType !== 'None' && (
                <Text style={styles.resultDetail}>Attack: {qrResult.attackType}</Text>
              )}
              {qrResult.message && <Text style={styles.resultMsg}>{qrResult.message}</Text>}
            </View>
          )}
        </View>

        {/* Chain inspector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{T('attack_chain_title')}</Text>
          <Text style={styles.cardSub}>{T('attack_chain_sub')}</Text>
          <TextInput
            style={styles.input}
            placeholder={T('attack_chain_ph')}
            placeholderTextColor={C.gray400}
            keyboardType="numeric"
            value={chainId} onChangeText={v => { setChainId(v); setChainResult(null); }}
          />
          <TouchableOpacity
            style={[styles.btn, chainLoading && styles.btnDisabled]}
            onPress={inspectChain} disabled={chainLoading}
          >
            {chainLoading
              ? <ActivityIndicator color={C.white} size="small" />
              : <Text style={styles.btnText}>⛓️ {T('attack_chain_btn')}</Text>
            }
          </TouchableOpacity>

          {chainResult && (
            <View style={[styles.resultBox, {
              backgroundColor: chainResult.valid ? C.emerald50 : C.rose50,
              borderColor: chainResult.valid ? C.emerald300 : C.rose300,
            }]}>
              <Text style={[styles.resultTitle, { color: chainResult.valid ? C.emerald700 : C.rose700 }]}>
                {chainResult.valid ? '✅ Chain Intact' : '🚨 Chain Tampered!'}
              </Text>
              <Text style={styles.resultDetail}>Blocks: {chainResult.blocks}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  card: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 12, marginVertical: 6, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.gray900, marginBottom: 4 },
  cardSub:   { fontSize: 12, color: C.gray500, marginBottom: 12 },
  attackRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  attackIcon:  { fontSize: 20, width: 26, textAlign: 'center' },
  attackLabel: { fontSize: 13, fontWeight: '700', color: C.gray800 },
  attackDesc:  { fontSize: 11, color: C.gray500, marginTop: 1 },
  input: {
    borderWidth: 1.5, borderColor: C.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.gray900, backgroundColor: C.gray50, marginBottom: 10,
  },
  btn: {
    backgroundColor: C.teal600, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  btnDisabled: { backgroundColor: C.gray300 },
  btnText:     { color: C.white, fontSize: 14, fontWeight: '700' },
  resultBox: {
    marginTop: 12, borderRadius: 12, padding: 14,
    borderWidth: 1.5,
  },
  resultTitle:  { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  resultDetail: { fontSize: 12, color: C.gray700, marginTop: 2 },
  resultMsg:    { fontSize: 12, color: C.gray600, marginTop: 4 },
});
