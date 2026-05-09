import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { C } from '../theme/colors';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { getSupplyAdvisor } from '../utils/api';
import Header from '../components/Header';

export default function SupplyAdvisorScreen({ navigation }) {
  const { lang } = useLang();
  const T = (k) => t(k, lang);

  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true); setResult(null);
    const { ok, data } = await getSupplyAdvisor();
    if (ok) setResult(data);
    else Alert.alert('Error', data?.message || 'Analysis failed');
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={T('advisor_title')} subtitle={T('advisor_subtitle')} onMenuPress={() => navigation.navigate('MenuModal')} />
      <ScrollView style={styles.scroll}>

        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>📈 AI Supply Chain Analytics · Powered by Claude AI</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{T('advisor_title')}</Text>
          <Text style={styles.cardSub}>{T('advisor_subtitle')}</Text>
          <TouchableOpacity
            style={[styles.analyzeBtn, loading && styles.analyzeBtnDisabled]}
            onPress={analyze} disabled={loading}
          >
            {loading
              ? <><ActivityIndicator color={C.white} size="small" /><Text style={styles.analyzeBtnText}>  {T('advisor_analyzing')}</Text></>
              : <Text style={styles.analyzeBtnText}>📈 {T('advisor_btn')}</Text>
            }
          </TouchableOpacity>
        </View>

        {result && (
          <>
            {/* Distributor performance table */}
            {result.distributors?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📊 Distributor Performance</Text>
                {result.distributors.map((d, i) => {
                  const perfColor = d.rating === 'Good' ? C.emerald600 : d.rating === 'Average' ? C.amber600 : C.rose600;
                  return (
                    <View key={i} style={styles.distRow}>
                      <View style={styles.distLeft}>
                        <Text style={styles.distName}>{d.username}</Text>
                        <Text style={styles.distTx}>{d.transactions} transactions</Text>
                      </View>
                      <View style={[styles.distBadge, { backgroundColor: perfColor + '22', borderColor: perfColor }]}>
                        <Text style={[styles.distBadgeText, { color: perfColor }]}>{d.rating}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Alerts */}
            {result.alerts?.length > 0 && (
              <View style={[styles.card, { borderWidth: 1, borderColor: C.rose200 }]}>
                <Text style={[styles.cardTitle, { color: C.rose700 }]}>🚨 Alerts</Text>
                {result.alerts.map((a, i) => (
                  <View key={i} style={styles.alertRow}>
                    <Text style={styles.alertText}>• {a}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations */}
            {result.recommendations?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>💡 Recommendations</Text>
                {result.recommendations.map((r, i) => (
                  <View key={i} style={styles.recoRow}>
                    <Text style={styles.recoNum}>{i + 1}</Text>
                    <Text style={styles.recoText}>{r}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Full analysis */}
            {result.analysis && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{T('advisor_result')}</Text>
                <View style={styles.analysisBox}>
                  <Text style={styles.analysisText}>{result.analysis}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => { Clipboard.setStringAsync(result.analysis); Alert.alert('', T('add_ai_copied')); }}
                >
                  <Text style={styles.copyBtnText}>📋 {T('advisor_copy')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
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
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.gray900, marginBottom: 6 },
  cardSub:   { fontSize: 12, color: C.gray500, marginBottom: 14 },
  analyzeBtn: {
    backgroundColor: C.teal600, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  analyzeBtnDisabled: { backgroundColor: C.gray300 },
  analyzeBtnText:     { color: C.white, fontSize: 14, fontWeight: '700' },
  distRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  distLeft: { flex: 1 },
  distName: { fontSize: 13, fontWeight: '700', color: C.gray800 },
  distTx:   { fontSize: 11, color: C.gray500, marginTop: 2 },
  distBadge: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, borderWidth: 1 },
  distBadgeText: { fontSize: 11, fontWeight: '700' },
  alertRow:   { paddingVertical: 4 },
  alertText:  { fontSize: 13, color: C.rose700 },
  recoRow:    { flexDirection: 'row', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  recoNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.teal100, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  recoText:     { flex: 1, fontSize: 13, color: C.gray700 },
  analysisBox:  { backgroundColor: C.gray50, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.gray200 },
  analysisText: { fontSize: 13, color: C.gray700, lineHeight: 20 },
  copyBtn:      { backgroundColor: C.gray100, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.gray200 },
  copyBtnText:  { color: C.gray700, fontSize: 13, fontWeight: '600' },
});
