import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLang }  from '../context/LanguageContext';
import { useAuth }  from '../context/AuthContext';
import { getDrugs, transferDrug, getErrorMessage } from '../services/api';
import { COLORS, ROLES } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';

const NEXT_ROLE = {
  [ROLES.FACTORY]:     ROLES.DISTRIBUTOR,
  [ROLES.DISTRIBUTOR]: ROLES.PHARMACY,
  [ROLES.PHARMACY]:    ROLES.CUSTOMER,
};

export default function TransferScreen() {
  const { t, isRTL } = useLang();
  const { user }     = useAuth();

  const [drugs,       setDrugs]      = useState([]);
  const [selectedDrug,setSelected]   = useState(null);
  const [toUsername,  setToUsername] = useState('');
  const [loading,     setLoading]    = useState(true);
  const [submitting,  setSubmitting] = useState(false);
  const [error,       setError]      = useState('');
  const [showPicker,  setShowPicker] = useState(false);
  const [result,      setResult]     = useState(null);

  const nextRole = NEXT_ROLE[user?.role];
  const canTransfer = !!nextRole;

  useEffect(() => {
    getDrugs()
      .then((r) => setDrugs(r.data || []))
      .catch(() => setError(t('networkError')))
      .finally(() => setLoading(false));
  }, []);

  const handleTransfer = async () => {
    if (!selectedDrug) { setError(t('selectDrug')); return; }
    if (!toUsername.trim()) { setError(t('toUser')); return; }
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const res = await transferDrug({ drugId: selectedDrug.id, toUsername: toUsername.trim() });
      setResult(res.data);
      setToUsername('');
      setSelected(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message={t('loading')} />;

  if (!canTransfer) {
    return (
      <View style={styles.centerMsg}>
        <Ionicons name="lock-closed" size={48} color={COLORS.textMuted} />
        <Text style={styles.centerTxt}>{t('noPermission')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

      {/* Chain flow banner */}
      <View style={styles.chainBanner}>
        <Text style={styles.chainRole}>{user?.role}</Text>
        <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
        <Text style={[styles.chainRole, { color: COLORS.primaryDark }]}>{nextRole}</Text>
      </View>

      <View style={styles.card}>
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.errorTxt}>{error}</Text>
          </View>
        )}

        {/* Drug picker */}
        <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('selectDrug')}</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowPicker(true)}>
          <Text style={[styles.pickerTxt, !selectedDrug && { color: COLORS.textMuted }]}>
            {selectedDrug ? `${selectedDrug.name} — ${selectedDrug.batchNumber}` : t('selectDrug')}
          </Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* To username */}
        <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('toUser')}</Text>
        <TextInput
          style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
          value={toUsername}
          onChangeText={setToUsername}
          placeholder={t('toUser')}
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleTransfer}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="swap-horizontal" size={20} color="#fff" />
                <Text style={styles.submitTxt}>{t('transferBtn')}</Text>
              </View>
            )}
        </TouchableOpacity>
      </View>

      {/* Success result */}
      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.resultTitle}>{t('transferSuccess')}</Text>
          </View>
          {[
            ['Block #', result.blockNumber],
            ['Hash',    result.blockHash],
            ['Nonce',   result.nonce],
            ['Merkle',  result.merkleRoot],
          ].map(([k, v]) => (
            <View key={k} style={styles.resultRow}>
              <Text style={styles.resultKey}>{k}</Text>
              <Text style={styles.resultVal} numberOfLines={1}>{v}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Drug picker modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectDrug')}</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={drugs}
              keyExtractor={(d) => String(d.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => { setSelected(item); setShowPicker(false); }}
                >
                  <Text style={styles.modalItemName}>{item.name}</Text>
                  <Text style={styles.modalItemSub}>{item.batchNumber} · {t('quantity')}: {item.quantity}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  centerMsg:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  centerTxt:   { fontSize: 16, color: COLORS.textLight, textAlign: 'center' },
  chainBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#d1fae5', borderRadius: 12, padding: 14, marginBottom: 16 },
  chainRole:   { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  card:        { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  errorBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.errorBg, borderRadius: 8, padding: 10, marginBottom: 12 },
  errorTxt:    { color: COLORS.error, fontSize: 13, flex: 1 },
  label:       { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  picker:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 16 },
  pickerTxt:   { fontSize: 14, color: COLORS.text, flex: 1 },
  input:       { backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, marginBottom: 16 },
  submitBtn:   { backgroundColor: COLORS.primary, borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center' },
  submitTxt:   { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultCard:  { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginTop: 16, borderLeftWidth: 4, borderLeftColor: COLORS.success },
  resultHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  resultTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.success },
  resultRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  resultKey:   { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  resultVal:   { fontSize: 12, color: COLORS.text, flex: 1, textAlign: 'right' },
  modalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:  { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle:  { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  modalItem:   { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalItemName:{ fontSize: 14, fontWeight: '600', color: COLORS.text },
  modalItemSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
});
