import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  RefreshControl, StyleSheet, SafeAreaView, StatusBar, Alert
} from 'react-native';
import { C } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../utils/i18n';
import { getInventoryItems, getInventoryAlerts } from '../utils/api';

const CATEGORIES = ['Antibiotic','Painkiller','Supplement','Vitamin','Antifungal','Analgesic','Other'];

const CAT_COLORS = {
  Antibiotic: C.cyan500,
  Painkiller: C.rose500,
  Supplement: C.emerald500,
  Vitamin:    C.amber500,
  Antifungal: C.purple500,
  Analgesic:  '#6366f1',
  Other:      C.gray500,
};

function StatCard({ label, value, color, bg }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ItemCard({ item, onPress, lang }) {
  const now        = new Date();
  const expiry     = new Date(item.expiryDate);
  const daysLeft   = Math.ceil((expiry - now) / 86400000);
  const isExpired  = daysLeft < 0;
  const isNear     = daysLeft >= 0 && daysLeft <= 30;
  const isLow      = item.currentStock > 0 && item.currentStock <= item.lowStockThreshold;
  const isOut      = item.currentStock === 0;

  const stockColor = isOut ? C.rose600 : isLow ? C.amber600 : C.emerald600;

  return (
    <TouchableOpacity style={styles.itemCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.itemHeader}>
        <View style={styles.itemNameRow}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {item.category ? (
            <View style={[styles.catBadge, { backgroundColor: CAT_COLORS[item.category] || C.gray500 }]}>
              <Text style={styles.catBadgeText}>{item.category}</Text>
            </View>
          ) : null}
        </View>
        {item.batchNumber ? (
          <Text style={styles.itemBatch}>#{item.batchNumber}</Text>
        ) : null}
      </View>

      <View style={styles.itemFooter}>
        <View style={styles.itemStat}>
          <Text style={styles.itemStatLabel}>{t('inv_stock_label', lang)}</Text>
          <Text style={[styles.itemStatValue, { color: stockColor }]}>
            {isOut ? t('inv_out_of_stock', lang) : item.currentStock}
          </Text>
        </View>
        <View style={styles.itemStat}>
          <Text style={styles.itemStatLabel}>{t('inv_price_label', lang)}</Text>
          <Text style={[styles.itemStatValue, { color: C.teal600 }]}>
            {item.sellingPrice?.toFixed(2)} JD
          </Text>
        </View>
        <View style={styles.itemStat}>
          <Text style={styles.itemStatLabel}>{t('th_expiry', lang)}</Text>
          <Text style={[styles.itemStatValue, { color: isExpired ? C.rose600 : isNear ? C.amber600 : C.gray600 }]}>
            {isExpired
              ? t('status_expired', lang)
              : isNear
              ? `${daysLeft}d`
              : expiry.toLocaleDateString('en-GB')}
          </Text>
        </View>
      </View>

      {(isLow || isOut || isExpired || isNear) && (
        <View style={styles.alertBar}>
          {isOut     && <Text style={[styles.alertText, { color: C.rose600 }]}>⚠ {t('inv_out_of_stock', lang)}</Text>}
          {isLow     && !isOut && <Text style={[styles.alertText, { color: C.amber600 }]}>⚠ {t('inv_low_stock', lang)}</Text>}
          {isExpired && <Text style={[styles.alertText, { color: C.rose600 }]}>⚠ {t('status_expired', lang)}</Text>}
          {isNear && !isExpired && <Text style={[styles.alertText, { color: C.amber600 }]}>⚠ {t('inv_near_expiry', lang)}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function InventoryScreen({ navigation }) {
  const { role }    = useAuth();
  const { lang }    = useLang();

  const [items,        setItems]       = useState([]);
  const [filtered,     setFiltered]    = useState([]);
  const [stats,        setStats]       = useState({ total:0, lowStock:0, outOfStock:0, expired:0, nearExpiry:0 });
  const [alerts,       setAlerts]      = useState({ totalAlerts: 0 });
  const [loading,      setLoading]     = useState(true);
  const [refreshing,   setRefreshing]  = useState(false);
  const [search,       setSearch]      = useState('');
  const [activeFilter, setFilter]      = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await getInventoryItems({});
      if (res.ok) {
        setItems(res.data.items || []);
        setStats(res.data.stats || {});
      }
      if (role === 'Admin') {
        const ar = await getInventoryAlerts();
        if (ar.ok) setAlerts(ar.data);
      }
    } catch (e) {
      console.warn('InventoryScreen load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const now = new Date();
    let result = [...items];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.name?.toLowerCase().includes(q) || i.batchNumber?.toLowerCase().includes(q)
      );
    }

    switch (activeFilter) {
      case 'low':
        result = result.filter(i => i.currentStock > 0 && i.currentStock <= i.lowStockThreshold);
        break;
      case 'out':
        result = result.filter(i => i.currentStock === 0);
        break;
      case 'expired':
        result = result.filter(i => new Date(i.expiryDate) < now);
        break;
      case 'near':
        result = result.filter(i => {
          const d = new Date(i.expiryDate);
          return d >= now && d <= new Date(now.getTime() + 30*86400000);
        });
        break;
    }
    setFiltered(result);
  }, [items, search, activeFilter]);

  const FILTERS = [
    { key: 'all',     label: t('inv_filter_all', lang) },
    { key: 'low',     label: t('inv_filter_low', lang) },
    { key: 'out',     label: t('inv_filter_out', lang) },
    { key: 'expired', label: t('inv_filter_expired', lang) },
    { key: 'near',    label: t('inv_filter_near', lang) },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={C.teal700} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('inv_title', lang)}</Text>
          <Text style={styles.headerSub}>{t('inv_subtitle', lang)}</Text>
        </View>
        {alerts.totalAlerts > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>{alerts.totalAlerts}</Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label={t('inv_total', lang)}      value={stats.total      || 0} color={C.teal600}    bg={C.teal50}    />
        <StatCard label={t('inv_low_stock', lang)}  value={stats.lowStock   || 0} color={C.amber600}   bg={C.amber50}   />
        <StatCard label={t('inv_expired', lang)}    value={stats.expired    || 0} color={C.rose600}    bg={C.rose50}    />
        <StatCard label={t('inv_near_expiry', lang)}value={stats.nearExpiry || 0} color={C.amber500}   bg={C.amber100}  />
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={t('inv_search_ph', lang)}
          placeholderTextColor={C.gray400}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter chips */}
      <View style={styles.filtersRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[C.teal500]}
          />
        }
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            lang={lang}
            onPress={() => navigation.navigate('InventoryDetail', { item })}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.emptyText}>{t('loading', lang)}</Text>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>{t('empty_title', lang)}</Text>
              <Text style={styles.emptySub}>{t('empty_sub', lang)}</Text>
            </View>
          )
        }
      />

      {/* FAB — Admin only */}
      {role === 'Admin' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddInventoryItem')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },

  header:     { backgroundColor: C.teal700, flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingVertical: 14, paddingTop: 18 },
  menuBtn:    { marginRight: 12 },
  menuIcon:   { color: C.teal200, fontSize: 22 },
  headerCenter:{ flex: 1 },
  headerTitle:{ color: C.white, fontSize: 18, fontWeight: '800' },
  headerSub:  { color: C.teal300, fontSize: 11, marginTop: 1 },
  alertBadge: { backgroundColor: C.rose500, borderRadius: 12, minWidth: 24, height: 24,
                alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  alertBadgeText: { color: C.white, fontSize: 12, fontWeight: '700' },

  statsRow:   { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  statCard:   { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  statValue:  { fontSize: 20, fontWeight: '800' },
  statLabel:  { fontSize: 10, color: C.gray500, marginTop: 2, textAlign: 'center' },

  searchBar:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
                marginHorizontal: 12, borderRadius: 10, paddingHorizontal: 12,
                marginBottom: 8, borderWidth: 1, borderColor: C.gray200 },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput:{ flex: 1, height: 40, color: C.gray800, fontSize: 14 },
  clearIcon:  { color: C.gray400, fontSize: 16, paddingLeft: 8 },

  filtersRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200 },
  filterChipActive:     { backgroundColor: C.teal600, borderColor: C.teal600 },
  filterChipText:       { fontSize: 12, color: C.gray600 },
  filterChipTextActive: { color: C.white, fontWeight: '700' },

  list: { paddingHorizontal: 12, paddingBottom: 90 },

  itemCard:   { backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 10,
                shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  itemHeader: { marginBottom: 10 },
  itemNameRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemName:   { flex: 1, fontSize: 15, fontWeight: '700', color: C.gray800 },
  catBadge:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  catBadgeText:{ color: C.white, fontSize: 10, fontWeight: '700' },
  itemBatch:  { fontSize: 11, color: C.gray400, marginTop: 2 },

  itemFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  itemStat:   { alignItems: 'center' },
  itemStatLabel:{ fontSize: 10, color: C.gray400 },
  itemStatValue:{ fontSize: 13, fontWeight: '700', marginTop: 2 },

  alertBar:   { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.gray100,
                flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  alertText:  { fontSize: 11, fontWeight: '600' },

  emptyText:  { textAlign: 'center', color: C.gray400, marginTop: 40 },
  emptyBox:   { alignItems: 'center', marginTop: 60 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.gray600 },
  emptySub:   { fontSize: 13, color: C.gray400, marginTop: 4 },

  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56,
         borderRadius: 28, backgroundColor: C.teal600, alignItems: 'center',
         justifyContent: 'center', elevation: 6,
         shadowColor: C.teal600, shadowOpacity: 0.5, shadowRadius: 10 },
  fabText: { color: C.white, fontSize: 28, fontWeight: '300', lineHeight: 34 },
});
