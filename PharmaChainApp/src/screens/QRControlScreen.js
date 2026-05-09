import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { C } from '../theme/colors';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { getDrugs, generateQR, getQRQuotas, getQRIssuances, getQRScanLogs, setQRQuota } from '../utils/api';
import Header from '../components/Header';

const TABS = ['quotas', 'generate', 'issuances', 'scanlogs', 'settings'];

export default function QRControlScreen({ navigation }) {
  const { lang } = useLang();
  const T = (k) => t(k, lang);

  const [activeTab, setActiveTab] = useState('quotas');
  const [drugs,     setDrugs]     = useState([]);
  const [selectedId,setSelected]  = useState('');
  const [quotas,    setQuotas]    = useState([]);
  const [issuances, setIssuances] = useState([]);
  const [scanlogs,  setScanlogs]  = useState([]);
  const [qrImage,   setQrImage]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [generating,setGenerating]= useState(false);
  // Settings form
  const [settRole,  setSettRole]  = useState('Factory');
  const [settLimit, setSettLimit] = useState('');

  useEffect(() => {
    getDrugs().then(({ ok, data }) => { if (ok) setDrugs(data || []); });
    loadTabData('quotas');
  }, []);

  async function loadTabData(tab) {
    setLoading(true);
    if (tab === 'quotas')    { const r = await getQRQuotas();    if (r.ok) setQuotas(r.data || []); }
    if (tab === 'issuances') { const r = await getQRIssuances(); if (r.ok) setIssuances(r.data || []); }
    if (tab === 'scanlogs')  { const r = await getQRScanLogs();  if (r.ok) setScanlogs(r.data || []); }
    setLoading(false);
  }

  function switchTab(tab) { setActiveTab(tab); loadTabData(tab); }

  async function doGenerate() {
    if (!selectedId) { Alert.alert('', T('qr_select_warn')); return; }
    setGenerating(true); setQrImage(null);
    const { ok, data } = await generateQR(selectedId);
    if (ok && data.qrImageBase64) {
      setQrImage('data:image/png;base64,' + data.qrImageBase64);
    } else if (ok && data.qrUrl) {
      setQrImage(data.qrUrl);
    } else {
      Alert.alert('Error', data?.message || T('qr_err_gen'));
    }
    setGenerating(false);
  }

  async function saveSettings() {
    if (!settLimit || isNaN(Number(settLimit))) { Alert.alert('', T('qr_invalid_limit')); return; }
    setLoading(true);
    const { ok, data } = await setQRQuota({ role: settRole, limitPerPeriod: Number(settLimit), period: 'Monthly' });
    if (ok) Alert.alert('✅', T('settings_saved'));
    else Alert.alert('Error', data?.message || 'Save failed');
    setLoading(false);
  }

  const ROLES = ['Factory', 'Distributor', 'Pharmacy', 'Admin'];

  function attackBadge(type) {
    const map = {
      None:         { color: C.emerald600, label: '✅ Valid' },
      SignatureMismatch: { color: C.rose600, label: '❌ Sig Mismatch' },
      DateMismatch: { color: C.amber600, label: '📅 Date Mismatch' },
      DrugNotFound: { color: C.gray600, label: '👻 Not Found' },
      Expired:      { color: C.amber700, label: '⏰ Expired' },
      QuotaExceeded:{ color: C.rose600, label: '🚫 Quota' },
    };
    return map[type] || { color: C.gray500, label: type };
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={T('qr_page_title')} subtitle={T('qr_page_sub')} onMenuPress={() => navigation.navigate('MenuModal')} />

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
        {[
          { key: 'quotas',    label: T('qr_tab_quotas') },
          { key: 'generate',  label: T('qr_tab_generate') },
          { key: 'issuances', label: T('qr_tab_issuances') },
          { key: 'scanlogs',  label: T('qr_tab_scanlogs') },
          { key: 'settings',  label: T('qr_tab_settings') },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => switchTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll}>
        {loading && <ActivityIndicator color={C.teal500} style={{ marginTop: 20 }} />}

        {/* ── Quotas ── */}
        {!loading && activeTab === 'quotas' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{T('qr_quotas_title')}</Text>
            {quotas.length === 0 ? (
              <Text style={styles.emptyText}>{T('qr_no_quotas')}</Text>
            ) : quotas.map((q, i) => {
              const pct = q.limitPerPeriod > 0 ? (q.issuedCount / q.limitPerPeriod) * 100 : 0;
              const qColor = pct >= 100 ? C.rose600 : pct >= 80 ? C.amber600 : C.emerald600;
              return (
                <View key={i} style={styles.quotaRow}>
                  <View style={styles.quotaLeft}>
                    <Text style={styles.quotaRole}>{q.role}</Text>
                    <Text style={styles.quotaMeta}>{q.issuedCount} / {q.limitPerPeriod}</Text>
                  </View>
                  <View style={styles.quotaRight}>
                    <View style={styles.quotaBar}>
                      <View style={[styles.quotaFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: qColor }]} />
                    </View>
                    <Text style={[styles.quotaPct, { color: qColor }]}>{Math.round(pct)}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Generate ── */}
        {!loading && activeTab === 'generate' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{T('qr_gen_title') || 'Generate QR'}</Text>
            <Text style={styles.cardSub}>{T('qr_gen_sub') || ''}</Text>

            <Text style={styles.fieldLabel}>{T('qr_gen_drug_label')}</Text>
            <ScrollView style={{ maxHeight: 160, marginBottom: 12 }}>
              {drugs.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.drugOpt, String(d.id) === String(selectedId) && styles.drugOptActive]}
                  onPress={() => setSelected(String(d.id))}
                >
                  <Text style={[styles.drugOptText, String(d.id) === String(selectedId) && { color: C.white }]}>
                    💊 {d.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.genBtn, generating && styles.genBtnDisabled]}
              onPress={doGenerate} disabled={generating}
            >
              {generating
                ? <ActivityIndicator color={C.white} size="small" />
                : <Text style={styles.genBtnText}>🖨️ {T('qr_gen_btn')}</Text>
              }
            </TouchableOpacity>

            {qrImage && (
              <View style={styles.qrBox}>
                <Image source={{ uri: qrImage }} style={styles.qrImage} resizeMode="contain" />
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={async () => {
                    const canShare = await Sharing.isAvailableAsync();
                    if (canShare) Alert.alert('', T('qr_download'));
                  }}
                >
                  <Text style={styles.shareBtnText}>⬇️ {T('qr_download')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Issuances ── */}
        {!loading && activeTab === 'issuances' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{T('qr_issuances_title')}</Text>
            {issuances.length === 0 ? <Text style={styles.emptyText}>{T('qr_no_issuances')}</Text>
            : issuances.map((iss, i) => (
              <View key={i} style={styles.issRow}>
                <Text style={styles.issDrug}>💊 {iss.drugName || 'Drug #' + iss.drugId}</Text>
                <Text style={styles.issUser}>👤 {iss.username} · {iss.role}</Text>
                <Text style={styles.issDate}>{iss.issuedAt?.split('T')[0]}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Scan logs ── */}
        {!loading && activeTab === 'scanlogs' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{T('qr_scanlogs_title')}</Text>
            {scanlogs.length === 0 ? <Text style={styles.emptyText}>{T('qr_no_scanlogs')}</Text>
            : scanlogs.map((log, i) => {
              const { color, label } = attackBadge(log.attackType);
              return (
                <View key={i} style={styles.scanRow}>
                  <View style={[styles.scanBadge, { backgroundColor: color + '22', borderColor: color }]}>
                    <Text style={[styles.scanBadgeText, { color }]}>{label}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scanDrug}>{log.drugName || '—'}</Text>
                    <Text style={styles.scanMeta}>{log.scannedBy} · {log.scannedAt?.split('T')[0]}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Settings ── */}
        {!loading && activeTab === 'settings' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{T('qr_settings_title')}</Text>
            <Text style={styles.cardSub}>{T('qr_settings_sub') || ''}</Text>

            <Text style={styles.fieldLabel}>{T('qr_role_label')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, settRole === r && styles.chipActive]}
                  onPress={() => setSettRole(r)}
                >
                  <Text style={[styles.chipText, settRole === r && { color: C.white }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>{T('qr_limit_label')}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500"
              placeholderTextColor={C.gray400}
              keyboardType="numeric"
              value={settLimit} onChangeText={setSettLimit}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
              <Text style={styles.saveBtnText}>💾 {T('qr_save_btn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  tabsRow: { backgroundColor: C.white, paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.gray200 },
  tab: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    marginRight: 6, backgroundColor: C.gray100,
  },
  tabActive:     { backgroundColor: C.teal600 },
  tabText:       { fontSize: 12, fontWeight: '600', color: C.gray600 },
  tabTextActive: { color: C.white },
  card: {
    backgroundColor: C.white, borderRadius: 16,
    margin: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardTitle:  { fontSize: 15, fontWeight: '800', color: C.gray900, marginBottom: 6 },
  cardSub:    { fontSize: 12, color: C.gray500, marginBottom: 12 },
  emptyText:  { fontSize: 13, color: C.gray400, textAlign: 'center', paddingVertical: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.gray700, marginBottom: 6 },

  quotaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  quotaLeft:  { flex: 1 },
  quotaRole:  { fontSize: 13, fontWeight: '700', color: C.gray800 },
  quotaMeta:  { fontSize: 11, color: C.gray500, marginTop: 2 },
  quotaRight: { alignItems: 'flex-end', gap: 4, width: 80 },
  quotaBar:   { width: 70, height: 6, backgroundColor: C.gray200, borderRadius: 3, overflow: 'hidden' },
  quotaFill:  { height: '100%', borderRadius: 3 },
  quotaPct:   { fontSize: 11, fontWeight: '700' },

  drugOpt: {
    padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.gray200,
    marginBottom: 6, backgroundColor: C.gray50,
  },
  drugOptActive: { backgroundColor: C.teal600, borderColor: C.teal600 },
  drugOptText:   { fontSize: 13, fontWeight: '600', color: C.gray800 },

  genBtn: {
    backgroundColor: C.teal600, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  genBtnDisabled: { backgroundColor: C.gray300 },
  genBtnText:     { color: C.white, fontSize: 14, fontWeight: '700' },

  qrBox:    { alignItems: 'center', marginTop: 16 },
  qrImage:  { width: 200, height: 200, marginBottom: 12 },
  shareBtn: { backgroundColor: C.teal50, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1, borderColor: C.teal300 },
  shareBtnText: { color: C.teal700, fontWeight: '700' },

  issRow:   { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  issDrug:  { fontSize: 13, fontWeight: '700', color: C.gray800 },
  issUser:  { fontSize: 11, color: C.gray500, marginTop: 2 },
  issDate:  { fontSize: 10, color: C.gray400, marginTop: 1 },

  scanRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  scanBadge: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 1, flexShrink: 0 },
  scanBadgeText: { fontSize: 10, fontWeight: '700' },
  scanDrug:  { fontSize: 13, fontWeight: '600', color: C.gray800 },
  scanMeta:  { fontSize: 11, color: C.gray500, marginTop: 2 },

  chip: {
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: C.gray100, marginRight: 6, borderWidth: 1, borderColor: C.gray200,
  },
  chipActive: { backgroundColor: C.teal600, borderColor: C.teal600 },
  chipText:   { fontSize: 12, color: C.gray700, fontWeight: '600' },

  input: {
    borderWidth: 1.5, borderColor: C.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.gray900, backgroundColor: C.gray50, marginBottom: 14,
  },
  saveBtn:     { backgroundColor: C.teal600, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },
});
