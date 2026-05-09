import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { verifyDrug, getDrugs } from '../utils/api';
import Header from '../components/Header';

const TABS = ['name', 'list', 'id'];

export default function VerifyScreen({ navigation }) {
  const { lang } = useLang();
  const T = (k) => t(k, lang);

  const [activeTab,  setActiveTab]  = useState('id');
  const [nameQuery,  setNameQuery]  = useState('');
  const [idQuery,    setIdQuery]    = useState('');
  const [drugs,      setDrugs]      = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);

  useEffect(() => {
    getDrugs().then(({ ok, data }) => { if (ok) setDrugs(data || []); });
  }, []);

  async function verify(id) {
    if (!id) { Alert.alert('', T('tr_select_drug')); return; }
    setLoading(true); setResult(null);
    const { ok, data } = await verifyDrug(id);
    if (ok) setResult(data);
    else    setResult({ error: data?.message || 'Not found' });
    setLoading(false);
  }

  function resultColor(r) {
    if (!r) return C.gray400;
    if (r.error) return C.rose600;
    if (r.status === 'Expired') return C.amber600;
    if (r.isValid !== false) return C.emerald600;
    return C.rose600;
  }

  function resultIcon(r) {
    if (!r || r.error) return '❓';
    if (r.status === 'Expired') return '⚠️';
    if (r.isValid !== false) return '✅';
    return '❌';
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={T('verify_title')} subtitle={T('verify_subtitle')} onMenuPress={() => navigation.navigate('MenuModal')} />
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Security badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🔐 {T('ver_badge') || 'مؤمّن بتقنية Blockchain'}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { key: 'name', label: T('ver_tab_name') },
            { key: 'list', label: T('ver_tab_list') },
            { key: 'id',   label: T('ver_tab_id') },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => { setActiveTab(tab.key); setResult(null); }}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          {/* Tab: by name */}
          {activeTab === 'name' && (
            <View>
              <TextInput style={styles.input}
                placeholder={T('ver_name_ph')} placeholderTextColor={C.gray400}
                value={nameQuery} onChangeText={v => { setNameQuery(v); setResult(null); }}
              />
              <Text style={styles.hint}>{T('ver_hint_name') || ''}</Text>
              {nameQuery.length > 1 && (
                <ScrollView style={{ maxHeight: 150 }}>
                  {drugs.filter(d => (d.name||'').toLowerCase().includes(nameQuery.toLowerCase())).map(d => (
                    <TouchableOpacity key={d.id} style={styles.suggItem} onPress={() => verify(d.id)}>
                      <Text style={styles.suggText}>💊 {d.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Tab: from list */}
          {activeTab === 'list' && (
            <View>
              <ScrollView style={{ maxHeight: 200 }}>
                {drugs.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.drugOpt, String(d.id) === String(selectedId) && styles.drugOptActive]}
                    onPress={() => setSelectedId(String(d.id))}
                  >
                    <Text style={[styles.drugOptText, String(d.id) === String(selectedId) && { color: C.white }]}>
                      💊 {d.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.verifyBtn} onPress={() => verify(selectedId)}>
                <Text style={styles.verifyBtnText}>✅ {T('ver_btn')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tab: by ID */}
          {activeTab === 'id' && (
            <View>
              <TextInput style={styles.input}
                placeholder={T('ver_id_ph')} placeholderTextColor={C.gray400}
                value={idQuery} onChangeText={v => { setIdQuery(v); setResult(null); }}
                keyboardType="numeric"
              />
              <Text style={styles.hint}>{T('ver_hint_id') || ''}</Text>
              <TouchableOpacity style={styles.verifyBtn} onPress={() => verify(idQuery)}>
                <Text style={styles.verifyBtnText}>🔍 {T('ver_btn')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={C.teal500} />
            <Text style={styles.loadingText}>{T('ver_loading')}</Text>
          </View>
        )}

        {/* Result */}
        {!loading && result && (
          <View style={[styles.resultCard, { borderColor: resultColor(result), borderWidth: 2 }]}>
            <Text style={styles.resultIcon}>{resultIcon(result)}</Text>
            <Text style={[styles.resultTitle, { color: resultColor(result) }]}>
              {result.error
                ? T('ver_result_unauth')
                : result.status === 'Expired'
                  ? T('ver_result_expired')
                  : T('ver_result_auth')}
            </Text>
            <Text style={styles.resultSub}>
              {result.error
                ? T('ver_result_unauth_sub')
                : result.status === 'Expired'
                  ? result.expiryDate?.split('T')[0]
                  : T('ver_result_auth_sub')}
            </Text>

            {/* Drug details */}
            {!result.error && (
              <View style={styles.drugDetails}>
                {[
                  { label: T('th_drug_name'),   value: result.name },
                  { label: T('th_manufacturer'), value: result.manufacturer },
                  { label: T('th_expiry'),       value: result.expiryDate?.split('T')[0] },
                  { label: T('th_quantity'),     value: String(result.quantity ?? '—') },
                ].map(row => (
                  <View key={row.label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{row.label}</Text>
                    <Text style={styles.detailValue}>{row.value || '—'}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Transfer history */}
            {result.transfers?.length > 0 && (
              <View style={styles.transfers}>
                <Text style={styles.transfersTitle}>📋 Transfer History</Text>
                {result.transfers.map((tr, i) => (
                  <View key={i} style={styles.transferRow}>
                    <Text style={styles.transferStep}>
                      {tr.fromUsername} → {tr.toUsername}
                    </Text>
                    <Text style={styles.transferDate}>{tr.timestamp?.split('T')[0]}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* AI links */}
            <View style={styles.aiLinks}>
              <TouchableOpacity style={styles.aiBtn} onPress={() => navigation.navigate('PatientChat')}>
                <Text style={styles.aiBtnText}>🤖 {T('ver_chat_link')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.aiBtn} onPress={() => navigation.navigate('DrugInfo')}>
                <Text style={styles.aiBtnText}>💊 {T('ver_info_link')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.newSearchBtn} onPress={() => setResult(null)}>
              <Text style={styles.newSearchText}>🔍 {T('ver_new_search')}</Text>
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
  badge: {
    margin: 12, backgroundColor: C.teal50,
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.teal200,
  },
  badgeText: { color: C.teal700, fontSize: 12, textAlign: 'center', fontWeight: '600' },
  tabs: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 8, gap: 6 },
  tab: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.gray200,
  },
  tabActive:     { backgroundColor: C.teal600, borderColor: C.teal600 },
  tabText:       { fontSize: 11, fontWeight: '600', color: C.gray600 },
  tabTextActive: { color: C.white },
  card: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 12, marginBottom: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  input: {
    borderWidth: 1.5, borderColor: C.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.gray900, backgroundColor: C.gray50, marginBottom: 6,
  },
  hint: { fontSize: 11, color: C.gray400, marginBottom: 10 },
  suggItem: {
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  suggText: { fontSize: 13, color: C.gray800 },
  drugOpt: {
    padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.gray200,
    marginBottom: 6, backgroundColor: C.gray50,
  },
  drugOptActive: { backgroundColor: C.teal600, borderColor: C.teal600 },
  drugOptText:   { fontSize: 13, fontWeight: '600', color: C.gray800 },
  verifyBtn: {
    marginTop: 10, backgroundColor: C.teal600,
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  verifyBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },
  loadingBox: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  loadingText: { fontSize: 13, color: C.gray500 },

  resultCard: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 12, marginBottom: 12, padding: 20,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  resultIcon:  { fontSize: 52, marginBottom: 10 },
  resultTitle: { fontSize: 20, fontWeight: '900', marginBottom: 4, textAlign: 'center' },
  resultSub:   { fontSize: 13, color: C.gray500, marginBottom: 14, textAlign: 'center' },
  drugDetails: { width: '100%', backgroundColor: C.gray50, borderRadius: 12, padding: 12, marginBottom: 12 },
  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  detailLabel: { fontSize: 12, color: C.gray500 },
  detailValue: { fontSize: 12, fontWeight: '600', color: C.gray800 },
  transfers:   { width: '100%', marginBottom: 12 },
  transfersTitle: { fontSize: 13, fontWeight: '700', color: C.gray700, marginBottom: 6 },
  transferRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  transferStep: { fontSize: 12, color: C.gray700 },
  transferDate: { fontSize: 11, color: C.gray400 },
  aiLinks: { flexDirection: 'row', gap: 8, marginBottom: 10, width: '100%' },
  aiBtn: {
    flex: 1, backgroundColor: C.teal50, borderRadius: 10,
    paddingVertical: 9, alignItems: 'center',
    borderWidth: 1, borderColor: C.teal200,
  },
  aiBtnText: { fontSize: 12, color: C.teal700, fontWeight: '600' },
  newSearchBtn: { marginTop: 4 },
  newSearchText: { fontSize: 13, color: C.teal600, fontWeight: '600' },
});
