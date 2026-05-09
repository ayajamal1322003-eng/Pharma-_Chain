import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { getDrugInfo } from '../utils/api';
import Header from '../components/Header';

const POPULAR = ['Paracetamol', 'Amoxicillin', 'Ibuprofen', 'Omeprazole', 'Metformin', 'Aspirin'];
const LEVELS  = ['patient', 'pharmacist', 'medical'];

export default function DrugInfoScreen({ navigation }) {
  const { lang } = useLang();
  const T = (k) => t(k, lang);

  const [query,   setQuery]   = useState('');
  const [level,   setLevel]   = useState('patient');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  async function search(drugName) {
    const name = (drugName || query).trim();
    if (!name) return;
    setLoading(true); setResult(null);
    const { ok, data } = await getDrugInfo(name, level);
    if (ok) setResult({ name, ...data });
    else setResult({ error: data?.message || 'Not found' });
    setLoading(false);
  }

  const LEVEL_LABELS = {
    patient:     `👤 ${T('di_lvl_patient')}`,
    pharmacist:  `🏥 ${T('di_lvl_pharmacist')}`,
    medical:     `🩺 ${T('di_lvl_medical')}`,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={T('di_title')} subtitle={T('di_sub')} onMenuPress={() => navigation.navigate('MenuModal')} />
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>🤖 {T('di_ai_tag') || 'AI-Powered'}</Text>
        </View>

        <View style={styles.card}>
          {/* Search input */}
          <Text style={styles.fieldLabel}>{T('di_name_label')}</Text>
          <TextInput
            style={styles.input}
            placeholder={T('di_name_ph')}
            placeholderTextColor={C.gray400}
            value={query}
            onChangeText={v => { setQuery(v); setResult(null); }}
          />

          {/* Level selector */}
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{T('di_level_label')}</Text>
          <View style={styles.levelRow}>
            {LEVELS.map(l => (
              <TouchableOpacity
                key={l}
                style={[styles.levelBtn, level === l && styles.levelBtnActive]}
                onPress={() => setLevel(l)}
              >
                <Text style={[styles.levelBtnText, level === l && { color: C.white }]}>
                  {LEVEL_LABELS[l]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Popular drugs */}
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{T('di_popular')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {POPULAR.map(d => (
              <TouchableOpacity
                key={d}
                style={styles.popChip}
                onPress={() => { setQuery(d); search(d); }}
              >
                <Text style={styles.popChipText}>💊 {d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
            onPress={() => search()} disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={C.white} size="small" />
              : <Text style={styles.searchBtnText}>🔬 {T('di_btn')}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={C.teal500} size="large" />
            <Text style={styles.loadingText}>{T('di_loading')}</Text>
          </View>
        )}

        {/* Result */}
        {!loading && result && (
          <View style={styles.card}>
            {result.error ? (
              <Text style={styles.errText}>⚠️ {result.error}</Text>
            ) : (
              <>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultIcon}>💊</Text>
                  <View>
                    <Text style={styles.resultName}>{result.name}</Text>
                    <View style={[styles.levelTag, { backgroundColor: C.teal100 }]}>
                      <Text style={styles.levelTagText}>{LEVEL_LABELS[level]}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>{result.information || result.info || ''}</Text>
                </View>
                <View style={styles.disclaimer}>
                  <Text style={styles.disclaimerText}>⚠️ {T('di_disclaimer')}</Text>
                </View>
                <TouchableOpacity style={styles.newSearchBtn} onPress={() => { setResult(null); setQuery(''); }}>
                  <Text style={styles.newSearchBtnText}>🔍 {T('di_new_search')}</Text>
                </TouchableOpacity>
              </>
            )}
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
  aiBadge: {
    margin: 12, backgroundColor: C.teal50,
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.teal200,
  },
  aiBadgeText: { color: C.teal700, fontSize: 12, textAlign: 'center', fontWeight: '600' },
  card: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 12, marginBottom: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.gray700, marginBottom: 7 },
  input: {
    borderWidth: 1.5, borderColor: C.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.gray900, backgroundColor: C.gray50,
  },
  levelRow: { flexDirection: 'row', gap: 6 },
  levelBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: C.gray100, borderWidth: 1.5, borderColor: C.gray200,
  },
  levelBtnActive: { backgroundColor: C.teal600, borderColor: C.teal600 },
  levelBtnText:   { fontSize: 11, fontWeight: '600', color: C.gray600 },
  popChip: {
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: C.teal50, marginRight: 6,
    borderWidth: 1, borderColor: C.teal200,
  },
  popChipText: { fontSize: 12, color: C.teal700, fontWeight: '600' },
  searchBtn: {
    marginTop: 14, backgroundColor: C.teal600,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  searchBtnDisabled: { backgroundColor: C.gray300 },
  searchBtnText:     { color: C.white, fontSize: 14, fontWeight: '700' },
  loadingBox: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  loadingText: { fontSize: 13, color: C.gray500 },
  errText:     { color: C.rose600, fontSize: 14, textAlign: 'center', padding: 10 },
  resultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  resultIcon:   { fontSize: 40 },
  resultName:   { fontSize: 18, fontWeight: '900', color: C.gray900, marginBottom: 4 },
  levelTag:     { borderRadius: 20, paddingVertical: 2, paddingHorizontal: 10, alignSelf: 'flex-start' },
  levelTagText: { fontSize: 11, fontWeight: '700', color: C.teal700 },
  infoBox:      { backgroundColor: C.gray50, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.gray200 },
  infoText:     { fontSize: 14, color: C.gray800, lineHeight: 22 },
  disclaimer:   { backgroundColor: C.amber50, borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: C.amber200 },
  disclaimerText: { fontSize: 11, color: C.amber700, lineHeight: 18 },
  newSearchBtn: { backgroundColor: C.teal50, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.teal200 },
  newSearchBtnText: { color: C.teal700, fontSize: 13, fontWeight: '600' },
});
