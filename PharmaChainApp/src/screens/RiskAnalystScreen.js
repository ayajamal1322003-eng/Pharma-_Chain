import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { C } from '../theme/colors';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { getDrugs, getRiskAnalysis } from '../utils/api';
import Header from '../components/Header';

function riskColor(level) {
  if (!level) return C.gray400;
  const l = level.toLowerCase();
  if (l.includes('high'))   return C.rose600;
  if (l.includes('medium')) return C.amber600;
  if (l.includes('low'))    return C.teal600;
  return C.emerald600;
}

function riskIcon(level) {
  if (!level) return '🔵';
  const l = level.toLowerCase();
  if (l.includes('high'))   return '🔴';
  if (l.includes('medium')) return '🟡';
  if (l.includes('low'))    return '🟢';
  return '✅';
}

export default function RiskAnalystScreen({ navigation }) {
  const { lang } = useLang();
  const T = (k) => t(k, lang);

  const [drugs,      setDrugs]     = useState([]);
  const [selectedId, setSelected]  = useState('');
  const [result,     setResult]    = useState(null);
  const [loading,    setLoading]   = useState(false);
  const [loadingD,   setLoadingD]  = useState(true);

  useEffect(() => {
    getDrugs().then(({ ok, data }) => { if (ok) setDrugs(data || []); setLoadingD(false); });
  }, []);

  async function analyze() {
    if (!selectedId) { Alert.alert('', T('tr_select_drug')); return; }
    setLoading(true); setResult(null);
    const { ok, data } = await getRiskAnalysis(selectedId);
    if (ok) setResult(data);
    else Alert.alert('Error', data?.message || 'Analysis failed');
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={T('risk_title')} subtitle={T('risk_subtitle')} onMenuPress={() => navigation.navigate('MenuModal')} />
      <ScrollView style={styles.scroll}>

        {/* AI badge */}
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>🤖 Powered by Claude AI · Blockchain Analysis</Text>
        </View>

        {/* Drug selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{T('risk_drug_lbl')}</Text>
          {loadingD ? <ActivityIndicator color={C.teal500} /> : (
            <ScrollView style={{ maxHeight: 160 }}>
              {drugs.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.drugOpt, String(d.id) === String(selectedId) && styles.drugOptActive]}
                  onPress={() => { setSelected(String(d.id)); setResult(null); }}
                >
                  <Text style={[styles.drugOptText, String(d.id) === String(selectedId) && { color: C.white }]}>
                    💊 {d.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
            onPress={analyze} disabled={loading}
          >
            {loading
              ? <><ActivityIndicator color={C.white} size="small" /><Text style={styles.analyzeBtnText}>  {T('risk_analyzing')}</Text></>
              : <Text style={styles.analyzeBtnText}>🤖 {T('risk_btn')}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Result */}
        {result && (
          <View style={styles.card}>
            <View style={styles.riskHeader}>
              <Text style={styles.riskHeaderIcon}>{riskIcon(result.riskLevel)}</Text>
              <View>
                <Text style={styles.cardTitle}>{T('risk_result_title')}</Text>
                <Text style={[styles.riskLevel, { color: riskColor(result.riskLevel) }]}>
                  {result.riskLevel}
                </Text>
              </View>
            </View>

            {/* Risk indicators */}
            {result.indicators && result.indicators.length > 0 && (
              <View style={styles.indicatorsBox}>
                <Text style={styles.indicatorsTitle}>⚠️ Risk Indicators</Text>
                {result.indicators.map((ind, i) => (
                  <View key={i} style={styles.indicatorRow}>
                    <Text style={styles.indicatorDot}>•</Text>
                    <Text style={styles.indicatorText}>{ind}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Full analysis */}
            {result.analysis && (
              <View style={styles.analysisBox}>
                <Text style={styles.analysisText}>{result.analysis}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => {
                const report = `Risk Level: ${result.riskLevel}\n\n${result.analysis || ''}`;
                Clipboard.setStringAsync(report);
                Alert.alert('', T('add_ai_copied'));
              }}
            >
              <Text style={styles.copyBtnText}>📋 {T('risk_copy')}</Text>
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
  aiBadge: {
    margin: 12, backgroundColor: C.purple50,
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.purple200,
  },
  aiBadgeText: { color: C.purple600, fontSize: 12, textAlign: 'center', fontWeight: '600' },
  card: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 12, marginBottom: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.gray900, marginBottom: 12 },
  drugOpt: {
    padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.gray200,
    marginBottom: 6, backgroundColor: C.gray50,
  },
  drugOptActive: { backgroundColor: C.teal600, borderColor: C.teal600 },
  drugOptText:   { fontSize: 13, fontWeight: '600', color: C.gray800 },
  analyzeBtn: {
    marginTop: 12, backgroundColor: C.purple600,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  analyzeBtnDisabled: { backgroundColor: C.gray300 },
  analyzeBtnText:     { color: C.white, fontSize: 14, fontWeight: '700' },
  riskHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  riskHeaderIcon: { fontSize: 42 },
  riskLevel: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  indicatorsBox: {
    backgroundColor: C.amber50, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.amber200, marginBottom: 12,
  },
  indicatorsTitle: { fontSize: 13, fontWeight: '700', color: C.amber700, marginBottom: 6 },
  indicatorRow:    { flexDirection: 'row', gap: 6, marginBottom: 3 },
  indicatorDot:    { color: C.amber600, fontWeight: '700' },
  indicatorText:   { flex: 1, fontSize: 12, color: C.amber800 },
  analysisBox: {
    backgroundColor: C.gray50, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.gray200, marginBottom: 12,
  },
  analysisText: { fontSize: 13, color: C.gray700, lineHeight: 20 },
  copyBtn: {
    backgroundColor: C.gray100, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: C.gray200,
  },
  copyBtnText: { color: C.gray700, fontSize: 13, fontWeight: '600' },
});
