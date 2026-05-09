import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { getAuditLogs } from '../utils/api';
import Header from '../components/Header';

const ACTION_COLORS = {
  Login:        C.emerald600,
  FailedLogin:  C.rose600,
  AddDrug:      C.teal600,
  Transfer:     C.purple600,
  TamperDetected: C.rose700,
  DeleteDrug:   C.amber600,
};

function actionColor(a) { return ACTION_COLORS[a] || C.gray500; }

function actionIcon(a) {
  const map = {
    Login: '✅', FailedLogin: '❌', AddDrug: '💊',
    Transfer: '🔄', TamperDetected: '🚨', DeleteDrug: '🗑️',
  };
  return map[a] || '📋';
}

export default function AuditScreen({ navigation }) {
  const { lang }        = useLang();
  const T = (k) => t(k, lang);

  const [logs,      setLogs]      = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [filter,    setFilter]    = useState('all');
  const [stats,     setStats]     = useState({ total: 0, logins: 0, failed: 0, tamper: 0 });

  const load = useCallback(async () => {
    const { ok, data } = await getAuditLogs();
    if (ok && Array.isArray(data)) {
      setLogs(data);
      setStats({
        total:  data.length,
        logins: data.filter(l => l.action === 'Login').length,
        failed: data.filter(l => l.action === 'FailedLogin').length,
        tamper: data.filter(l => l.action === 'TamperDetected').length,
      });
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setFiltered(filter === 'all' ? logs : logs.filter(l => l.action === filter));
  }, [logs, filter]);

  const FILTERS = [
    { key: 'all',           label: T('audit_filter_all') },
    { key: 'Login',         label: '✅ ' + T('audit_logins') },
    { key: 'FailedLogin',   label: '❌ ' + T('audit_failed') },
    { key: 'TamperDetected',label: '🚨 ' + T('audit_tamper') },
    { key: 'AddDrug',       label: '💊 Add Drug' },
    { key: 'Transfer',      label: '🔄 Transfer' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={T('audit_title')} subtitle={T('audit_subtitle')} onMenuPress={() => navigation.navigate('MenuModal')} />
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.teal500} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: T('audit_total'),   value: stats.total,  color: C.teal600 },
            { label: T('audit_logins'),  value: stats.logins, color: C.emerald600 },
            { label: T('audit_failed'),  value: stats.failed, color: C.rose600 },
            { label: T('audit_tamper'),  value: stats.tamper, color: C.amber600 },
          ].map(s => (
            <View key={s.label} style={[styles.statBox, { borderTopColor: s.color }]}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterBtnText, filter === f.key && { color: C.white }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Logs */}
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator color={C.teal500} style={{ marginVertical: 20 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{T('empty_title')}</Text>
            </View>
          ) : (
            filtered.map((log, i) => {
              const ac = actionColor(log.action);
              return (
                <View key={i} style={styles.logRow}>
                  <View style={[styles.logIcon, { backgroundColor: ac + '22', borderColor: ac }]}>
                    <Text style={{ fontSize: 16 }}>{actionIcon(log.action)}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.logTop}>
                      <Text style={[styles.logAction, { color: ac }]}>{log.action}</Text>
                      <Text style={styles.logTime}>{log.timestamp?.split('T')[0]}</Text>
                    </View>
                    <Text style={styles.logUser}>👤 {log.username}</Text>
                    {log.details ? <Text style={styles.logDetails} numberOfLines={2}>{log.details}</Text> : null}
                    {log.ipAddress ? <Text style={styles.logIp}>IP: {log.ipAddress}</Text> : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  statsRow: { flexDirection: 'row', padding: 12, gap: 6 },
  statBox: {
    flex: 1, backgroundColor: C.white, borderRadius: 10, padding: 10,
    alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLbl: { fontSize: 9, color: C.gray500, textAlign: 'center', marginTop: 2 },
  filterRow: { paddingHorizontal: 12, marginBottom: 10 },
  filterBtn: {
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.gray200,
    marginRight: 6,
  },
  filterBtnActive: { backgroundColor: C.teal600, borderColor: C.teal600 },
  filterBtnText:   { fontSize: 12, color: C.gray600, fontWeight: '600' },
  card: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 12, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  logRow: {
    flexDirection: 'row', gap: 10, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  logIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, flexShrink: 0,
  },
  logTop:     { flexDirection: 'row', justifyContent: 'space-between' },
  logAction:  { fontSize: 13, fontWeight: '700' },
  logTime:    { fontSize: 11, color: C.gray400 },
  logUser:    { fontSize: 12, color: C.gray600 },
  logDetails: { fontSize: 11, color: C.gray500, marginTop: 1 },
  logIp:      { fontSize: 10, color: C.gray400 },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { fontSize: 14, color: C.gray500 },
});
