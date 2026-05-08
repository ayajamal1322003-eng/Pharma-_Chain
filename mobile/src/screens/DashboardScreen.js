import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLang }    from '../context/LanguageContext';
import { useAuth }    from '../context/AuthContext';
import { getDrugs }   from '../services/api';
import { COLORS, ROLE_COLORS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState     from '../components/EmptyState';
import StatCard       from '../components/StatCard';

export default function DashboardScreen({ navigation }) {
  const { t, isRTL }  = useLang();
  const { user }      = useAuth();

  const [drugs,     setDrugs]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const res = await getDrugs();
      setDrugs(res.data || []);
    } catch (err) {
      setError(t('networkError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const today    = new Date();
  const expired  = drugs.filter((d) => new Date(d.expiryDate) < today).length;
  const lowStock = drugs.filter((d) => d.quantity < 50).length;
  const roleCol  = ROLE_COLORS[user?.role] || { bg: '#e5e7eb', text: '#374151' };

  const renderDrug = ({ item }) => {
    const isExpired = new Date(item.expiryDate) < today;
    const isLow     = item.quantity < 50;
    return (
      <TouchableOpacity
        style={styles.drugCard}
        onPress={() => navigation.navigate('DrugInfo', { drugId: item.id })}
        activeOpacity={0.8}
      >
        <View style={[styles.drugCardLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.drugIcon}>
            <Ionicons name="medical" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.drugName, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.drugBatch, { textAlign: isRTL ? 'right' : 'left' }]}>
              {item.batchNumber}
            </Text>
          </View>
        </View>
        <View style={styles.drugRight}>
          <Text style={[styles.drugQty, { color: isLow ? COLORS.warning : COLORS.success }]}>
            {item.quantity}
          </Text>
          {isExpired && (
            <View style={styles.expiredBadge}>
              <Text style={styles.expiredTxt}>{t('expired')}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingSpinner message={t('loading')} />;

  return (
    <View style={styles.container}>
      {/* Welcome banner */}
      <View style={styles.banner}>
        <View style={[styles.bannerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.rolePill, { backgroundColor: roleCol.bg }]}>
            <Text style={[styles.rolePillTxt, { color: roleCol.text }]}>{user?.role}</Text>
          </View>
          <Text style={styles.bannerName}>{user?.username}</Text>
        </View>
      </View>

      <FlatList
        data={drugs}
        keyExtractor={(d) => String(d.id)}
        renderItem={renderDrug}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[COLORS.primary]} />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            {/* Stats */}
            <View style={styles.statsGrid}>
              <StatCard label={t('totalDrugs')}  value={drugs.length} icon="medkit-outline"    color={COLORS.primary} bg="#d1fae5" />
              <StatCard label={t('expiredDrugs')} value={expired}      icon="warning-outline"   color={COLORS.error}   bg="#fee2e2" />
              <StatCard label={t('lowStock')}     value={lowStock}     icon="trending-down-outline" color={COLORS.warning} bg="#fef9c3" />
            </View>
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('drugList')}
            </Text>
            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorTxt}>{error}</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="medical-outline" message={t('noDrugs')} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* FAB — Add Drug */}
      {['Factory', 'Admin'].includes(user?.role) && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddDrug')}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.background },
  banner:     { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12 },
  bannerRow:  { alignItems: 'center', gap: 10 },
  rolePill:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  rolePillTxt:{ fontSize: 12, fontWeight: '700' },
  bannerName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  header:     { padding: 16, gap: 16 },
  statsGrid:  { gap: 10 },
  sectionTitle:{ fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  errorBox:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.errorBg, borderRadius: 8, padding: 10 },
  errorTxt:   { color: COLORS.error, fontSize: 13, flex: 1 },
  drugCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 14, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  drugCardLeft:{ flex: 1, alignItems: 'center', gap: 10 },
  drugIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center',
  },
  drugName:   { fontSize: 14, fontWeight: '600', color: COLORS.text },
  drugBatch:  { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  drugRight:  { alignItems: 'flex-end', gap: 4 },
  drugQty:    { fontSize: 16, fontWeight: 'bold' },
  expiredBadge:{ backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  expiredTxt: { color: COLORS.error, fontSize: 10, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
});
