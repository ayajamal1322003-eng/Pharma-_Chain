import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TextInput,
  TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { getDrugs } from '../utils/api';
import Header       from '../components/Header';
import StatCard     from '../components/StatCard';

function statusColor(s) {
  if (s === 'Expired') return C.rose600;
  if (s === 'Soon')    return C.amber600;
  return C.emerald600;
}

function statusLabel(s, lang) {
  if (s === 'Expired') return t('status_expired', lang);
  if (s === 'Soon')    return t('status_soon', lang);
  return t('status_valid', lang);
}

export default function DashboardScreen({ navigation }) {
  const { role }         = useAuth();
  const { lang }         = useLang();
  const T = (k) => t(k, lang);

  const [drugs,     setDrugs]     = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [search,    setSearch]    = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [stats, setStats] = useState({ total: 0, expired: 0, soon: 0, low: 0 });

  const load = useCallback(async () => {
    try {
      const { ok, data } = await getDrugs();
      if (ok && Array.isArray(data)) {
        setDrugs(data);
        const expired = data.filter(d => d.status === 'Expired').length;
        const soon    = data.filter(d => d.status === 'Soon').length;
        const low     = data.filter(d => (d.quantity ?? 0) <= 10).length;
        setStats({ total: data.length, expired, soon, low });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let list = drugs;
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.manufacturer || '').toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [drugs, search, statusFilter]);

  function onRefresh() { setRefreshing(true); load(); }

  function renderDrug({ item }) {
    const sc = statusColor(item.status);
    return (
      <View style={styles.drugRow}>
        <View style={styles.drugLeft}>
          <Text style={styles.drugName}>{item.name}</Text>
          <Text style={styles.drugMfr}>{item.manufacturer}</Text>
          <Text style={styles.drugExpiry}>
            {T('th_expiry')}: {item.expiryDate?.split('T')[0] || '—'}
          </Text>
        </View>
        <View style={styles.drugRight}>
          <View style={[styles.statusBadge, { backgroundColor: sc + '22', borderColor: sc }]}>
            <Text style={[styles.statusText, { color: sc }]}>
              {statusLabel(item.status, lang)}
            </Text>
          </View>
          <Text style={styles.qtyText}>
            {T('th_quantity')}: <Text style={{ fontWeight: '700' }}>{item.quantity}</Text>
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title={T('dash_title')}
        subtitle={T('dash_subtitle')}
        onMenuPress={() => navigation.navigate('MenuModal')}
        rightAction={
          role === 'Factory' || role === 'Admin'
            ? { label: T('btn_add_drug'), onPress: () => navigation.navigate('AddDrug') }
            : null
        }
      />

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal500} />}
      >
        {/* Stat cards */}
        <View style={styles.statsGrid}>
          <StatCard icon="💊" value={stats.total}   label={T('dash_total')}    color={C.teal600}    onPress={() => setStatus('all')} />
          <StatCard icon="❌" value={stats.expired} label={T('dash_expired')}  color={C.rose600}    onPress={() => setStatus('Expired')} />
          <StatCard icon="⚠️" value={stats.soon}    label={T('dash_soon')}     color={C.amber600}   onPress={() => setStatus('Soon')} />
          <StatCard icon="📦" value={stats.low}     label={T('dash_low_stock')} color={C.purple600} onPress={() => setStatus('all')} />
        </View>

        {/* Search + filter */}
        <View style={styles.controls}>
          <TextInput
            style={styles.searchInput}
            placeholder={T('search_ph')}
            placeholderTextColor={C.gray400}
            value={search}
            onChangeText={setSearch}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {[
              { key: 'all',     label: '🔵 ' + T('filter_all_status') ?? 'All' },
              { key: 'Valid',   label: T('status_valid') },
              { key: 'Soon',    label: T('status_soon') },
              { key: 'Expired', label: T('status_expired') },
            ].map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterBtn, statusFilter === f.key && styles.filterBtnActive]}
                onPress={() => setStatus(f.key)}
              >
                <Text style={[styles.filterBtnText, statusFilter === f.key && { color: C.white }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Drugs list */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{T('dash_card_title')}</Text>
          {loading ? (
            <ActivityIndicator color={C.teal500} style={{ marginVertical: 20 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{T('empty_title')}</Text>
              <Text style={styles.emptySub}>{T('empty_sub')}</Text>
            </View>
          ) : (
            filtered.map((item) => (
              <View key={item.id}>
                {renderDrug({ item })}
              </View>
            ))
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

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: 10, paddingBottom: 4,
  },

  controls: { paddingHorizontal: 12, marginBottom: 8 },
  searchInput: {
    backgroundColor: C.white, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.gray200,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: C.gray800,
    marginBottom: 8,
  },
  filterRow: { flexDirection: 'row' },
  filterBtn: {
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.gray200,
    marginRight: 6,
  },
  filterBtnActive: { backgroundColor: C.teal600, borderColor: C.teal600 },
  filterBtnText:   { fontSize: 12, color: C.gray600, fontWeight: '600' },

  card: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.gray900, marginBottom: 12 },

  drugRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  drugLeft:   { flex: 1, paddingRight: 8 },
  drugName:   { fontSize: 14, fontWeight: '700', color: C.gray900 },
  drugMfr:    { fontSize: 12, color: C.gray500, marginTop: 2 },
  drugExpiry: { fontSize: 11, color: C.gray400, marginTop: 3 },
  drugRight:  { alignItems: 'flex-end', gap: 4 },

  statusBadge: {
    borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  qtyText:    { fontSize: 11, color: C.gray500 },

  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: C.gray600 },
  emptySub:   { fontSize: 12, color: C.gray400, marginTop: 4 },
});
