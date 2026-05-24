import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, RefreshControl
} from 'react-native';
import { C } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../utils/i18n';
import { getInventorySummaryReport, getInventorySales } from '../utils/api';

const CAT_COLORS = {
  Antibiotic: C.cyan500, Painkiller: C.rose500,
  Supplement: C.emerald500, Vitamin: C.amber500,
  Antifungal: C.purple500, Analgesic: '#6366f1', Other: C.gray500,
};

function StatCard({ icon, label, value, sub, color, bg }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function InventoryReportsScreen({ navigation }) {
  const { role }  = useAuth();
  const { lang }  = useLang();

  const [overview,   setOverview]   = useState(null);
  const [topSelling, setTopSelling] = useState([]);
  const [leastSelling, setLeast]    = useState([]);
  const [catBreakdown, setCat]      = useState([]);
  const [recentSales,  setSales]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate,   setFromDate]   = useState('');
  const [toDate,     setToDate]     = useState('');

  const load = useCallback(async () => {
    try {
      const params = {};
      if (fromDate.trim()) params.fromDate = new Date(fromDate).toISOString();
      if (toDate.trim())   params.toDate   = new Date(toDate).toISOString();

      const [summaryRes, salesRes] = await Promise.all([
        getInventorySummaryReport(params),
        getInventorySales({ ...params, limit: 20 }),
      ]);

      if (summaryRes.ok) {
        setOverview(summaryRes.data.overview);
        setTopSelling(summaryRes.data.topSelling || []);
        setLeast(summaryRes.data.leastSelling || []);
        setCat(summaryRes.data.categoryBreakdown || []);
      }
      if (salesRes.ok) {
        setSales(salesRes.data.sales || []);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={C.teal700} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('inv_rep_title', lang)}</Text>
          <Text style={styles.headerSub}>{t('inv_rep_subtitle', lang)}</Text>
        </View>
        {role === 'LedgerAdmin' && (
          <View style={styles.readOnlyBadge}>
            <Text style={styles.readOnlyText}>Read Only</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[C.teal500]}
          />
        }
      >
        {/* Date filter */}
        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>📅 {t('inv_rep_filter', lang)}</Text>
          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterLabel}>{t('inv_rep_from', lang)}</Text>
              <TextInput style={styles.filterInput} value={fromDate} onChangeText={setFromDate}
                placeholder="YYYY-MM-DD" placeholderTextColor={C.gray400} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterLabel}>{t('inv_rep_to', lang)}</Text>
              <TextInput style={styles.filterInput} value={toDate} onChangeText={setToDate}
                placeholder="YYYY-MM-DD" placeholderTextColor={C.gray400} />
            </View>
            <TouchableOpacity style={styles.filterBtn} onPress={load}>
              <Text style={styles.filterBtnText}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={C.teal500} size="large" style={{ marginTop: 40 }} />
        ) : overview ? (
          <>
            {/* Overview stats */}
            <Text style={styles.sectionTitle}>{t('inv_rep_overview', lang)}</Text>
            <View style={styles.statsGrid}>
              <StatCard icon="📦" label={t('inv_rep_total_items', lang)}
                value={overview.totalItems} color={C.teal600} bg={C.teal50} />
              <StatCard icon="💰" label={t('inv_rep_stock_value', lang)}
                value={`${Number(overview.totalStockValue || 0).toFixed(0)} JD`}
                color={C.emerald600} bg={C.emerald50} />
              <StatCard icon="🛒" label={t('inv_rep_revenue', lang)}
                value={`${Number(overview.totalSalesValue || 0).toFixed(0)} JD`}
                sub={`${overview.totalUnitsSold} units`}
                color={C.purple600} bg={C.purple100} />
              <StatCard icon="🔁" label={t('inv_rep_total_sales', lang)}
                value={overview.totalTransactions} color={C.cyan500} bg='#ecfeff' />
            </View>

            {/* Alerts overview */}
            <View style={styles.alertsRow}>
              {overview.lowStock   > 0 && <View style={[styles.alertBubble, { backgroundColor: C.amber100 }]}>
                <Text style={[styles.alertBubbleText, { color: C.amber600 }]}>⚠ {overview.lowStock} {t('inv_low_stock', lang)}</Text>
              </View>}
              {overview.outOfStock > 0 && <View style={[styles.alertBubble, { backgroundColor: C.rose100 }]}>
                <Text style={[styles.alertBubbleText, { color: C.rose600 }]}>⚠ {overview.outOfStock} {t('inv_out_of_stock', lang)}</Text>
              </View>}
              {overview.expired    > 0 && <View style={[styles.alertBubble, { backgroundColor: C.rose100 }]}>
                <Text style={[styles.alertBubbleText, { color: C.rose700 }]}>⚠ {overview.expired} {t('status_expired', lang)}</Text>
              </View>}
              {overview.nearExpiry > 0 && <View style={[styles.alertBubble, { backgroundColor: C.amber50 }]}>
                <Text style={[styles.alertBubbleText, { color: C.amber500 }]}>⚠ {overview.nearExpiry} {t('inv_near_expiry', lang)}</Text>
              </View>}
            </View>

            {/* Top selling */}
            {topSelling.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🏆 {t('inv_rep_top_selling', lang)}</Text>
                {topSelling.map((item, i) => (
                  <View key={i} style={styles.rankRow}>
                    <View style={[styles.rankNum, { backgroundColor: i === 0 ? '#fbbf24' : i === 1 ? C.gray300 : '#cd7c3a22' }]}>
                      <Text style={styles.rankNumText}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rankName}>{item.name}</Text>
                      {item.category ? (
                        <Text style={[styles.rankCat, { color: CAT_COLORS[item.category] || C.gray400 }]}>
                          {item.category}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.rankStats}>
                      <Text style={styles.rankUnits}>{item.units} {t('inv_rep_units', lang)}</Text>
                      <Text style={styles.rankRevenue}>{Number(item.revenue || 0).toFixed(2)} JD</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Least selling */}
            {leastSelling.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📉 {t('inv_rep_least_selling', lang)}</Text>
                {leastSelling.map((item, i) => (
                  <View key={i} style={styles.rankRow}>
                    <View style={styles.rankNum}>
                      <Text style={styles.rankNumText}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rankName}>{item.name}</Text>
                    </View>
                    <View style={styles.rankStats}>
                      <Text style={styles.rankUnits}>{item.sold} sold</Text>
                      <Text style={[styles.rankRevenue, { color: C.gray400 }]}>{item.stock} in stock</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Category breakdown */}
            {catBreakdown.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🗂 {t('inv_rep_by_category', lang)}</Text>
                {catBreakdown.map((cat, i) => (
                  <View key={i} style={styles.catRow}>
                    <View style={[styles.catDot, { backgroundColor: CAT_COLORS[cat.category] || C.gray400 }]} />
                    <Text style={styles.catName}>{cat.category}</Text>
                    <Text style={styles.catCount}>{cat.count} items</Text>
                    <Text style={styles.catStock}>{cat.totalStock} units</Text>
                    <Text style={[styles.catRevenue, { color: C.teal600 }]}>
                      {Number(cat.revenue || 0).toFixed(0)} JD
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recent sales */}
            {recentSales.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🧾 {t('inv_rep_recent_sales', lang)}</Text>
                {recentSales.map(sale => (
                  <View key={sale.id} style={styles.saleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.saleName}>{sale.productName}</Text>
                      <Text style={styles.saleMeta}>
                        {sale.soldByUsername} · {new Date(sale.transactionDate).toLocaleDateString('en-GB')}
                      </Text>
                    </View>
                    <View style={styles.saleAmounts}>
                      <Text style={styles.saleQty}>×{sale.quantitySold}</Text>
                      <Text style={styles.saleTotal}>{Number(sale.totalPrice).toFixed(2)} JD</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.emptyText}>{t('empty_title', lang)}</Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },

  header:  { backgroundColor: C.teal700, flexDirection: 'row', alignItems: 'center',
             paddingHorizontal: 16, paddingVertical: 14, paddingTop: 18 },
  backBtn: { marginRight: 12 },
  backArrow:{ color: C.teal200, fontSize: 22, fontWeight: '700' },
  headerTitle:{ color: C.white, fontSize: 17, fontWeight: '800' },
  headerSub:{ color: C.teal300, fontSize: 11, marginTop: 1 },
  readOnlyBadge:{ backgroundColor: C.amber600, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  readOnlyText:{ color: C.white, fontSize: 10, fontWeight: '700' },

  scroll: { padding: 16 },

  filterCard: { backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 14,
                shadowColor:'#000', shadowOpacity:0.04, shadowRadius:4, elevation:1 },
  filterTitle:{ fontSize: 12, fontWeight: '700', color: C.gray600, marginBottom: 10 },
  filterRow:  { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  filterLabel:{ fontSize: 11, color: C.gray500, marginBottom: 4 },
  filterInput:{ backgroundColor: C.gray50, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
                fontSize: 13, color: C.gray800, borderWidth: 1, borderColor: C.gray200 },
  filterBtn:  { backgroundColor: C.teal600, borderRadius: 8, width: 40, height: 40,
                alignItems: 'center', justifyContent: 'center' },
  filterBtnText:{ fontSize: 16 },

  sectionTitle:{ fontSize: 14, fontWeight: '800', color: C.teal700, marginBottom: 10 },

  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  statCard:    { width: '47.5%', borderRadius: 12, padding: 14, alignItems: 'center' },
  statIcon:    { fontSize: 22, marginBottom: 4 },
  statValue:   { fontSize: 20, fontWeight: '900' },
  statSub:     { fontSize: 10, color: C.gray400, marginTop: 1 },
  statLabel:   { fontSize: 10, color: C.gray500, marginTop: 3, textAlign: 'center' },

  alertsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  alertBubble: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  alertBubbleText:{ fontSize: 11, fontWeight: '600' },

  card:       { backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 12,
                shadowColor:'#000', shadowOpacity:0.04, shadowRadius:4, elevation:1 },
  cardTitle:  { fontSize: 14, fontWeight: '800', color: C.gray800, marginBottom: 12 },

  rankRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
                borderBottomWidth: 1, borderBottomColor: C.gray100, gap: 10 },
  rankNum:    { width: 28, height: 28, borderRadius: 8, backgroundColor: C.gray100,
                alignItems: 'center', justifyContent: 'center' },
  rankNumText:{ fontSize: 12, fontWeight: '800', color: C.gray700 },
  rankName:   { fontSize: 13, fontWeight: '700', color: C.gray800 },
  rankCat:    { fontSize: 10, marginTop: 1 },
  rankStats:  { alignItems: 'flex-end' },
  rankUnits:  { fontSize: 13, fontWeight: '700', color: C.gray700 },
  rankRevenue:{ fontSize: 11, color: C.teal600, marginTop: 1 },

  catRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
                borderBottomWidth: 1, borderBottomColor: C.gray100, gap: 8 },
  catDot:     { width: 10, height: 10, borderRadius: 5 },
  catName:    { flex: 1, fontSize: 13, color: C.gray700, fontWeight: '600' },
  catCount:   { fontSize: 11, color: C.gray400, width: 54, textAlign: 'right' },
  catStock:   { fontSize: 11, color: C.gray500, width: 60, textAlign: 'right' },
  catRevenue: { fontSize: 12, fontWeight: '700', width: 64, textAlign: 'right' },

  saleRow:    { flexDirection: 'row', paddingVertical: 8,
                borderBottomWidth: 1, borderBottomColor: C.gray100 },
  saleName:   { fontSize: 13, fontWeight: '600', color: C.gray800 },
  saleMeta:   { fontSize: 10, color: C.gray400, marginTop: 2 },
  saleAmounts:{ alignItems: 'flex-end' },
  saleQty:    { fontSize: 12, color: C.gray500 },
  saleTotal:  { fontSize: 14, fontWeight: '800', color: C.teal600, marginTop: 1 },

  emptyText: { textAlign: 'center', color: C.gray400, marginTop: 40 },
});
