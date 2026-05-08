import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLang }  from '../context/LanguageContext';
import { getDrugs, getDrug, getHistory } from '../services/api';
import { COLORS }   from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState   from '../components/EmptyState';

export default function DrugInfoScreen({ route, navigation }) {
  const { t, isRTL }   = useLang();
  const routeDrugId    = route?.params?.drugId;

  const [drugs,   setDrugs]   = useState([]);
  const [drug,    setDrug]    = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [histLoading, setHistLoad] = useState(false);
  const [search,  setSearch]  = useState('');
  const [view,    setView]    = useState(routeDrugId ? 'detail' : 'list');

  useEffect(() => {
    if (routeDrugId) {
      loadDrug(routeDrugId);
    } else {
      getDrugs()
        .then((r) => setDrugs(r.data || []))
        .finally(() => setLoading(false));
    }
  }, [routeDrugId]);

  const loadDrug = async (id) => {
    setLoading(true);
    try {
      const [drugRes, histRes] = await Promise.all([getDrug(id), getHistory(id)]);
      setDrug(drugRes.data);
      setHistory(histRes.data || []);
      setView('detail');
    } catch (_) {}
    finally { setLoading(false); }
  };

  const filtered = drugs.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.batchNumber.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner message={t('loading')} />;

  // ── Detail view ──────────────────────────────────────────
  if (view === 'detail' && drug) {
    const isExpired = new Date(drug.expiryDate) < new Date();
    const isLow     = drug.quantity < 50;

    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Back button if navigated from list */}
        {!routeDrugId && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setView('list')}>
            <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
            <Text style={styles.backTxt}>{t('back')}</Text>
          </TouchableOpacity>
        )}

        {/* Drug header */}
        <View style={styles.drugHeader}>
          <View style={styles.drugHeaderIcon}>
            <Ionicons name="medical" size={32} color="#fff" />
          </View>
          <Text style={styles.drugHeaderName}>{drug.name}</Text>
          <Text style={styles.drugHeaderBatch}>{drug.batchNumber}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <View style={[styles.badge, { backgroundColor: isExpired ? '#fee2e2' : '#dcfce7' }]}>
              <Text style={[styles.badgeTxt, { color: isExpired ? COLORS.error : COLORS.success }]}>
                {isExpired ? t('expired') : t('valid')}
              </Text>
            </View>
            {isLow && (
              <View style={[styles.badge, { backgroundColor: '#fef9c3' }]}>
                <Text style={[styles.badgeTxt, { color: COLORS.warning }]}>{t('lowStock')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          {[
            { label: t('drugName'),    value: drug.name,         icon: 'medical-outline' },
            { label: t('batchNumber'), value: drug.batchNumber,  icon: 'barcode-outline' },
            { label: t('expiryDate'),  value: drug.expiryDate,   icon: 'calendar-outline' },
            { label: t('manufacturer'),value: drug.manufacturer, icon: 'business-outline' },
            { label: t('quantity'),    value: String(drug.quantity), icon: 'cube-outline' },
            { label: t('aiToken'),     value: drug.aiToken?.substring(0, 16) + '...', icon: 'key-outline' },
            { label: t('createdAt'),   value: new Date(drug.createdAt).toLocaleDateString(), icon: 'time-outline' },
          ].map(({ label, value, icon }) => (
            <View key={label} style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name={icon} size={16} color={COLORS.primary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{value || '—'}</Text>
            </View>
          ))}
        </View>

        {/* Transfer history */}
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('blockchain')}</Text>
        {history.length === 0
          ? <EmptyState icon="git-network-outline" message={t('noBlocks')} />
          : history.map((h) => (
            <View key={h.id} style={styles.histCard}>
              <View style={[styles.histHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.blockBadge}><Text style={styles.blockBadgeTxt}>#{h.blockNumber}</Text></View>
                <View style={[styles.transferChain, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.histRole}>{h.fromRole}</Text>
                  <Ionicons name="arrow-forward" size={12} color={COLORS.textLight} />
                  <Text style={styles.histRole}>{h.toRole}</Text>
                </View>
              </View>
              <Text style={[styles.histHash, { textAlign: isRTL ? 'right' : 'left' }]}>
                Hash: {h.blockHash}
              </Text>
            </View>
          ))}
      </ScrollView>
    );
  }

  // ── List view ────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={COLORS.textLight} />
        <Text
          style={styles.searchInput}
          onPress={() => {}} // placeholder — use TextInput below
        />
      </View>
      {/* Simple text search via state */}
      <View style={styles.searchBoxReal}>
        <Ionicons name="search-outline" size={16} color={COLORS.textLight} />
        <Text>{search}</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(d) => String(d.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.listCard} onPress={() => loadDrug(item.id)}>
            <View style={[styles.listRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.listIcon}>
                <Ionicons name="medical" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.listName, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.listBatch, { textAlign: isRTL ? 'right' : 'left' }]}>{item.batchNumber}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="medical-outline" message={t('noDrugs')} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  backBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backTxt:        { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  drugHeader:     { alignItems: 'center', marginBottom: 20 },
  drugHeaderIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  drugHeaderName: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  drugHeaderBatch:{ fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  badge:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTxt:       { fontSize: 12, fontWeight: '700' },
  infoCard:       { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  infoRow:        { alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8 },
  infoIcon:       { width: 20 },
  infoLabel:      { fontSize: 13, color: COLORS.textLight, width: 100 },
  infoValue:      { fontSize: 13, color: COLORS.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  sectionTitle:   { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  histCard:       { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  histHeader:     { alignItems: 'center', gap: 8, marginBottom: 6 },
  blockBadge:     { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  blockBadgeTxt:  { color: COLORS.primaryDark, fontSize: 12, fontWeight: '700' },
  transferChain:  { alignItems: 'center', gap: 4 },
  histRole:       { fontSize: 12, fontWeight: '600', color: COLORS.text },
  histHash:       { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace' },
  searchBox:      { display: 'none' },
  searchBoxReal:  { display: 'none' },
  listCard:       { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1 },
  listRow:        { alignItems: 'center', gap: 10 },
  listIcon:       { width: 40, height: 40, borderRadius: 20, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
  listName:       { fontSize: 14, fontWeight: '600', color: COLORS.text },
  listBatch:      { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
});
