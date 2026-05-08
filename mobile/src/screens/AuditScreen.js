import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLang }  from '../context/LanguageContext';
import { getAuditLogs } from '../services/api';
import { COLORS }   from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState   from '../components/EmptyState';

const ACTION_COLORS = {
  Register:    { bg: '#dbeafe', text: '#1d4ed8', icon: 'person-add-outline' },
  Login:       { bg: '#dcfce7', text: '#166534', icon: 'log-in-outline' },
  FailedLogin: { bg: '#fee2e2', text: '#991b1b', icon: 'warning-outline' },
  TransferDrug:{ bg: '#fef9c3', text: '#a16207', icon: 'swap-horizontal-outline' },
  AddDrug:     { bg: '#f3e8ff', text: '#7e22ce', icon: 'add-circle-outline' },
  GenerateQR:  { bg: '#e0f2fe', text: '#0369a1', icon: 'qr-code-outline' },
};

const getActionStyle = (action = '') => {
  for (const [key, val] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return val;
  }
  return { bg: '#f3f4f6', text: '#374151', icon: 'document-outline' };
};

export default function AuditScreen() {
  const { t, isRTL } = useLang();

  const [logs,      setLogs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState('');
  const [expanded,  setExpanded]  = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const res = await getAuditLogs();
      setLogs(res.data || []);
    } catch (_) {
      setError(t('networkError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const renderLog = ({ item }) => {
    const style  = getActionStyle(item.action);
    const isOpen = expanded === item.id;
    return (
      <TouchableOpacity
        style={styles.logCard}
        onPress={() => setExpanded(isOpen ? null : item.id)}
        activeOpacity={0.85}
      >
        <View style={[styles.logHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.actionIcon, { backgroundColor: style.bg }]}>
            <Ionicons name={style.icon} size={18} color={style.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTxt, { color: style.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {item.action}
            </Text>
            <Text style={[styles.usernameTxt, { textAlign: isRTL ? 'right' : 'left' }]}>
              {item.username}
            </Text>
          </View>
          <View style={styles.logRight}>
            <Text style={styles.timeTxt}>{new Date(item.timestamp).toLocaleDateString()}</Text>
            <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.textLight} />
          </View>
        </View>

        {isOpen && (
          <View style={styles.logDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>{t('details')}</Text>
              <Text style={styles.detailVal}>{item.details || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>{t('ipAddress')}</Text>
              <Text style={styles.detailVal}>{item.ipAddress || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>{t('timestamp')}</Text>
              <Text style={styles.detailVal}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingSpinner message={t('loading')} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={logs}
        keyExtractor={(l) => String(l.id)}
        renderItem={renderLog}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[COLORS.primary]} />}
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            <View style={[styles.countBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
              <Text style={styles.countTxt}>{logs.length} {t('auditTitle')}</Text>
            </View>
            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorTxt}>{error}</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="document-text-outline" message={t('noAuditLogs')} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  listHeader:  { marginBottom: 12, gap: 8 },
  countBadge:  { alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#d1fae5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  countTxt:    { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  errorBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.errorBg, borderRadius: 8, padding: 10 },
  errorTxt:    { color: COLORS.error, fontSize: 13, flex: 1 },
  logCard:     { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  logHeader:   { alignItems: 'center', gap: 10 },
  actionIcon:  { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  actionTxt:   { fontSize: 13, fontWeight: '700' },
  usernameTxt: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  logRight:    { alignItems: 'flex-end', gap: 4 },
  timeTxt:     { fontSize: 11, color: COLORS.textMuted },
  logDetails:  { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 10, paddingTop: 10, gap: 6 },
  detailRow:   { gap: 2 },
  detailKey:   { fontSize: 11, color: COLORS.textLight, fontWeight: '700', textTransform: 'uppercase' },
  detailVal:   { fontSize: 12, color: COLORS.text, lineHeight: 18 },
});
