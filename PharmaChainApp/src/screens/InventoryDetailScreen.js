import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  Modal, StyleSheet, SafeAreaView, StatusBar, Alert, ActivityIndicator
} from 'react-native';
import { C } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../utils/i18n';
import { getInventoryItem, restockInventoryItem, processInventorySale, deleteInventoryItem } from '../utils/api';

const CAT_COLORS = {
  Antibiotic: C.cyan500,  Painkiller: C.rose500,
  Supplement: C.emerald500, Vitamin: C.amber500,
  Antifungal: C.purple500,  Analgesic: '#6366f1', Other: C.gray500,
};

const MOVEMENT_ICONS = { INITIAL:'🌱', RESTOCK:'📥', SALE:'🛒', CORRECTION:'✏️' };
const MOVEMENT_COLORS = { INITIAL: C.teal600, RESTOCK: C.emerald600, SALE: C.rose500, CORRECTION: C.amber600 };

export default function InventoryDetailScreen({ route, navigation }) {
  const { item: routeItem } = route.params;
  const { role }  = useAuth();
  const { lang }  = useLang();

  const [item,       setItem]       = useState(routeItem);
  const [movements,  setMovements]  = useState([]);
  const [salesStats, setSalesStats] = useState({ salesCount:0, totalSold:0, totalRevenue:0 });
  const [loading,    setLoading]    = useState(true);

  // Modals
  const [restockModal, setRestockModal] = useState(false);
  const [sellModal,    setSellModal]    = useState(false);
  const [editModal,    setEditModal]    = useState(false);

  // Restock form
  const [rQty,   setRQty]   = useState('');
  const [rNotes, setRNotes] = useState('');
  const [rBusy,  setRBusy]  = useState(false);

  // Sell form
  const [sQty,    setSQty]   = useState('');
  const [sPrice,  setSPrice] = useState('');
  const [sNotes,  setSNotes] = useState('');
  const [sBusy,   setSBusy]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInventoryItem(item.id);
      if (res.ok) {
        setItem(res.data.item);
        setMovements(res.data.movements || []);
        setSalesStats(res.data.salesStats || {});
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [item.id]);

  useEffect(() => { load(); }, [load]);

  const now      = new Date();
  const expiry   = new Date(item.expiryDate);
  const daysLeft = Math.ceil((expiry - now) / 86400000);
  const isExpired= daysLeft < 0;
  const isNear   = daysLeft >= 0 && daysLeft <= 30;
  const isLow    = item.currentStock > 0 && item.currentStock <= item.lowStockThreshold;
  const isOut    = item.currentStock === 0;

  // ── Restock ──────────────────────────────────────────────────────────────
  async function handleRestock() {
    const qty = parseInt(rQty);
    if (!qty || qty <= 0) { Alert.alert('Error', 'Enter a valid quantity'); return; }
    setRBusy(true);
    try {
      const res = await restockInventoryItem(item.id, { quantity: qty, notes: rNotes });
      if (res.ok) {
        setRestockModal(false);
        setRQty(''); setRNotes('');
        load();
      } else {
        Alert.alert('Error', res.data?.message || 'Failed');
      }
    } catch { Alert.alert('Error', 'Network error'); }
    finally { setRBusy(false); }
  }

  // ── Sell ─────────────────────────────────────────────────────────────────
  async function handleSell() {
    const qty   = parseInt(sQty);
    const price = parseFloat(sPrice) || item.sellingPrice;
    if (!qty || qty <= 0) { Alert.alert('Error', 'Enter a valid quantity'); return; }
    if (qty > item.currentStock) {
      Alert.alert('Error', `Insufficient stock (available: ${item.currentStock})`);
      return;
    }
    setSBusy(true);
    try {
      const res = await processInventorySale({
        inventoryItemId: item.id, quantity: qty, unitPrice: price, notes: sNotes
      });
      if (res.ok) {
        setSellModal(false);
        setSQty(''); setSPrice(''); setSNotes('');
        load();
      } else {
        Alert.alert('Error', res.data?.message || 'Failed');
      }
    } catch { Alert.alert('Error', 'Network error'); }
    finally { setSBusy(false); }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  function handleDelete() {
    Alert.alert(
      t('inv_delete_btn', lang),
      `${t('inv_delete_confirm', lang)}: "${item.name}"?`,
      [
        { text: t('btn_cancel', lang), style: 'cancel' },
        {
          text: t('inv_delete_btn', lang), style: 'destructive',
          onPress: async () => {
            const res = await deleteInventoryItem(item.id);
            if (res.ok) navigation.navigate('Inventory');
            else Alert.alert('Error', res.data?.message || 'Failed');
          }
        }
      ]
    );
  }

  // ── Sell total preview ────────────────────────────────────────────────────
  const sellTotal = (parseFloat(sPrice) || item.sellingPrice) * (parseInt(sQty) || 0);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={C.teal700} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{item.name}</Text>
          {item.category ? (
            <View style={[styles.catBadge, { backgroundColor: CAT_COLORS[item.category] || C.gray500 }]}>
              <Text style={styles.catBadgeText}>{item.category}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.stockBig, { backgroundColor: isOut ? C.rose50 : isLow ? C.amber50 : C.emerald50 }]}>
              <Text style={[styles.stockBigValue, { color: isOut ? C.rose600 : isLow ? C.amber600 : C.emerald600 }]}>
                {item.currentStock}
              </Text>
              <Text style={styles.stockBigLabel}>{t('inv_stock_label', lang)}</Text>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('add_inv_selling_price', lang)}</Text>
                <Text style={styles.infoValue}>{item.sellingPrice?.toFixed(2)} JD</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('add_inv_purchase_price', lang)}</Text>
                <Text style={styles.infoValue}>{item.purchasePrice?.toFixed(2)} JD</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('th_expiry', lang)}</Text>
                <Text style={[styles.infoValue, { color: isExpired ? C.rose600 : isNear ? C.amber600 : C.gray700 }]}>
                  {expiry.toLocaleDateString('en-GB')}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('add_inv_batch', lang)}</Text>
                <Text style={styles.infoValue}>{item.batchNumber || '—'}</Text>
              </View>
            </View>
          </View>

          {(isOut || isLow || isExpired || isNear) && (
            <View style={styles.alertRow}>
              {isOut     && <Text style={[styles.alertChip, { backgroundColor: C.rose100, color: C.rose700 }]}>⚠ {t('inv_out_of_stock', lang)}</Text>}
              {isLow && !isOut && <Text style={[styles.alertChip, { backgroundColor: C.amber100, color: C.amber600 }]}>⚠ {t('inv_low_stock', lang)}</Text>}
              {isExpired && <Text style={[styles.alertChip, { backgroundColor: C.rose100, color: C.rose700 }]}>⚠ {t('status_expired', lang)}</Text>}
              {isNear && !isExpired && <Text style={[styles.alertChip, { backgroundColor: C.amber100, color: C.amber600 }]}>⚠ {t('inv_near_expiry', lang)} ({daysLeft}d)</Text>}
            </View>
          )}
        </View>

        {/* Admin action buttons */}
        {role === 'Admin' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.emerald600 }]}
              onPress={() => setRestockModal(true)}>
              <Text style={styles.actionBtnText}>📥 {t('inv_restock_btn', lang)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.teal600 }]}
              onPress={() => { setSPrice(String(item.sellingPrice)); setSellModal(true); }}
              disabled={item.currentStock === 0}>
              <Text style={[styles.actionBtnText, item.currentStock === 0 && { opacity: 0.5 }]}>
                🛒 {t('inv_sell_btn', lang)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.rose600 }]}
              onPress={handleDelete}>
              <Text style={styles.actionBtnText}>🗑 {t('inv_delete_btn', lang)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sales stats */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>📊 {t('inv_sales_stats', lang)}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{salesStats.salesCount}</Text>
              <Text style={styles.statLbl}>{t('inv_sales_count', lang)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{salesStats.totalSold}</Text>
              <Text style={styles.statLbl}>{t('inv_total_sold', lang)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: C.teal600 }]}>
                {Number(salesStats.totalRevenue || 0).toFixed(2)} JD
              </Text>
              <Text style={styles.statLbl}>{t('inv_total_revenue', lang)}</Text>
            </View>
          </View>
        </View>

        {/* Movement history */}
        <View style={styles.movementsCard}>
          <Text style={styles.cardTitle}>📋 {t('inv_movements_title', lang)}</Text>
          {loading ? (
            <ActivityIndicator color={C.teal500} style={{ marginTop: 20 }} />
          ) : movements.length === 0 ? (
            <Text style={styles.emptyText}>{t('inv_no_movements', lang)}</Text>
          ) : (
            movements.map(m => (
              <View key={m.id} style={styles.movementRow}>
                <View style={[styles.movementIcon, { backgroundColor: `${MOVEMENT_COLORS[m.actionType]}22` }]}>
                  <Text style={styles.movementIconText}>{MOVEMENT_ICONS[m.actionType] || '•'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.movementHeader}>
                    <Text style={[styles.movementType, { color: MOVEMENT_COLORS[m.actionType] || C.gray600 }]}>
                      {t(`inv_movement_${m.actionType?.toLowerCase()}`, lang)}
                    </Text>
                    <Text style={[styles.movementQty,
                      { color: m.quantityChanged > 0 ? C.emerald600 : C.rose500 }]}>
                      {m.quantityChanged > 0 ? '+' : ''}{m.quantityChanged}
                    </Text>
                  </View>
                  <Text style={styles.movementStock}>
                    {m.stockBefore} → {m.stockAfter}
                  </Text>
                  {m.notes ? <Text style={styles.movementNotes}>{m.notes}</Text> : null}
                  <Text style={styles.movementMeta}>
                    {m.performedByUsername} · {new Date(m.timestamp).toLocaleString('en-GB')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Restock Modal ────────────────────────────────────────────────────── */}
      <Modal visible={restockModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>📥 {t('inv_restock_modal_title', lang)}</Text>
            <Text style={styles.modalSub}>{item.name}</Text>

            <Text style={styles.modalLabel}>{t('inv_restock_qty', lang)} *</Text>
            <TextInput style={styles.modalInput} value={rQty} onChangeText={setRQty}
              placeholder="0" keyboardType="number-pad" placeholderTextColor={C.gray400} />

            <Text style={styles.modalLabel}>{t('inv_restock_notes', lang)}</Text>
            <TextInput style={[styles.modalInput, { height: 72 }]}
              value={rNotes} onChangeText={setRNotes}
              placeholder={t('inv_restock_notes', lang)}
              multiline placeholderTextColor={C.gray400} />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setRestockModal(false)}>
                <Text style={styles.modalBtnCancelText}>{t('btn_cancel', lang)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleRestock} disabled={rBusy}>
                {rBusy ? <ActivityIndicator color={C.white} /> :
                  <Text style={styles.modalBtnConfirmText}>{t('inv_restock_confirm', lang)}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Sell Modal ───────────────────────────────────────────────────────── */}
      <Modal visible={sellModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🛒 {t('inv_sell_modal_title', lang)}</Text>
            <Text style={styles.modalSub}>{item.name} · {t('inv_stock_label', lang)}: {item.currentStock}</Text>

            <Text style={styles.modalLabel}>{t('inv_sell_qty', lang)} *</Text>
            <TextInput style={styles.modalInput} value={sQty} onChangeText={setSQty}
              placeholder="0" keyboardType="number-pad" placeholderTextColor={C.gray400} />

            <Text style={styles.modalLabel}>{t('inv_sell_unit_price', lang)}</Text>
            <TextInput style={styles.modalInput} value={sPrice} onChangeText={setSPrice}
              placeholder={String(item.sellingPrice)} keyboardType="decimal-pad"
              placeholderTextColor={C.gray400} />

            {sQty ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('inv_sell_total', lang)}</Text>
                <Text style={styles.totalValue}>{sellTotal.toFixed(2)} JD</Text>
              </View>
            ) : null}

            <Text style={styles.modalLabel}>{t('add_notes_lbl', lang)}</Text>
            <TextInput style={[styles.modalInput, { height: 56 }]}
              value={sNotes} onChangeText={setSNotes}
              placeholder={t('add_notes_lbl', lang)}
              multiline placeholderTextColor={C.gray400} />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setSellModal(false)}>
                <Text style={styles.modalBtnCancelText}>{t('btn_cancel', lang)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnConfirm, { backgroundColor: C.teal600 }]}
                onPress={handleSell} disabled={sBusy}>
                {sBusy ? <ActivityIndicator color={C.white} /> :
                  <Text style={styles.modalBtnConfirmText}>{t('inv_sell_confirm', lang)}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },

  header: { backgroundColor: C.teal700, flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 16, paddingVertical: 14, paddingTop: 18 },
  backBtn:  { marginRight: 12 },
  backArrow:{ color: C.teal200, fontSize: 22, fontWeight: '700' },
  headerTitle: { color: C.white, fontSize: 17, fontWeight: '800' },
  catBadge:{ alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3 },
  catBadgeText:{ color: C.white, fontSize: 10, fontWeight: '700' },

  scroll: { padding: 16 },

  statusCard: { backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 10,
                shadowColor:'#000', shadowOpacity:0.05, shadowRadius:5, elevation:2 },
  statusRow:  { flexDirection: 'row', gap: 12 },
  stockBig:   { width: 90, height: 90, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stockBigValue:{ fontSize: 28, fontWeight: '900' },
  stockBigLabel:{ fontSize: 11, color: C.gray500, marginTop: 2 },
  infoGrid:   { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoItem:   { width: '46%' },
  infoLabel:  { fontSize: 10, color: C.gray400 },
  infoValue:  { fontSize: 13, fontWeight: '700', color: C.gray700, marginTop: 1 },
  alertRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  alertChip:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 11, fontWeight: '600' },

  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  actionBtn:  { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  actionBtnText:{ color: C.white, fontSize: 12, fontWeight: '700' },

  statsCard:  { backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 10,
                shadowColor:'#000', shadowOpacity:0.04, shadowRadius:4, elevation:1 },
  cardTitle:  { fontSize: 13, fontWeight: '700', color: C.teal700, marginBottom: 12 },
  statsRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  statItem:   { alignItems: 'center', flex: 1 },
  statVal:    { fontSize: 18, fontWeight: '800', color: C.gray800 },
  statLbl:    { fontSize: 10, color: C.gray400, marginTop: 2, textAlign: 'center' },

  movementsCard:{ backgroundColor: C.white, borderRadius: 12, padding: 16,
                  shadowColor:'#000', shadowOpacity:0.04, shadowRadius:4, elevation:1 },
  movementRow:  { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.gray100, gap: 10 },
  movementIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  movementIconText:{ fontSize: 16 },
  movementHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  movementType: { fontSize: 13, fontWeight: '700' },
  movementQty:  { fontSize: 14, fontWeight: '800' },
  movementStock:{ fontSize: 11, color: C.gray400, marginTop: 2 },
  movementNotes:{ fontSize: 11, color: C.gray500, marginTop: 2, fontStyle: 'italic' },
  movementMeta: { fontSize: 10, color: C.gray400, marginTop: 3 },
  emptyText:    { color: C.gray400, textAlign: 'center', marginTop: 20, marginBottom: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
                  padding: 24, paddingBottom: 36 },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: C.gray800, marginBottom: 4 },
  modalSub:     { fontSize: 13, color: C.gray500, marginBottom: 16 },
  modalLabel:   { fontSize: 12, fontWeight: '600', color: C.gray600, marginBottom: 5 },
  modalInput:   { backgroundColor: C.gray50, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                  fontSize: 14, color: C.gray800, borderWidth: 1, borderColor: C.gray200, marginBottom: 12 },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  backgroundColor: C.teal50, borderRadius: 8, padding: 10, marginBottom: 12 },
  totalLabel:   { fontSize: 13, color: C.teal700, fontWeight: '600' },
  totalValue:   { fontSize: 18, fontWeight: '900', color: C.teal600 },
  modalBtns:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtnCancel:{ flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
                   backgroundColor: C.gray100 },
  modalBtnCancelText:{ color: C.gray600, fontWeight: '600' },
  modalBtnConfirm:{ flex: 2, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
                    backgroundColor: C.emerald600 },
  modalBtnConfirmText:{ color: C.white, fontWeight: '700', fontSize: 15 },
});
