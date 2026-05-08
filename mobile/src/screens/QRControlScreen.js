import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons }  from '@expo/vector-icons';
import QRCode        from 'react-native-qrcode-svg';
import { useLang }   from '../context/LanguageContext';
import { useAuth }   from '../context/AuthContext';
import { getDrugs, generateQR, getQuotaStatus, getErrorMessage } from '../services/api';
import { COLORS }    from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState    from '../components/EmptyState';

export default function QRControlScreen() {
  const { t, isRTL } = useLang();
  const { user }     = useAuth();

  const [drugs,     setDrugs]    = useState([]);
  const [quotas,    setQuotas]   = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [refreshing,setRefresh]  = useState(false);
  const [qrModal,   setQrModal]  = useState(null); // { drug, qrData }
  const [generating,setGenerating]= useState(null); // drugId being generated
  const [error,     setError]    = useState('');

  const load = async (refresh = false) => {
    if (refresh) setRefresh(true); else setLoading(true);
    setError('');
    try {
      const [drugsRes, quotaRes] = await Promise.all([getDrugs(), getQuotaStatus()]);
      setDrugs(drugsRes.data   || []);
      setQuotas(quotaRes.data  || []);
    } catch (_) {
      setError(t('networkError'));
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGenerateQR = async (drug) => {
    setGenerating(drug.id);
    try {
      const res = await generateQR(drug.id, user.token);
      setQrModal({
        drug,
        qrUrl:     res.data.verificationUrl || res.data.qrCodeUrl || '',
        qrBase64:  res.data.qrCodeBase64    || '',
        sequence:  res.data.sequenceNumber,
        signature: res.data.signature,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(null);
    }
  };

  const renderDrug = ({ item }) => {
    const isGen = generating === item.id;
    return (
      <View style={styles.drugCard}>
        <View style={[styles.drugInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.drugIconBox}>
            <Ionicons name="medical" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.drugName, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.drugBatch, { textAlign: isRTL ? 'right' : 'left' }]}>{item.batchNumber}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.genBtn, isGen && { opacity: 0.7 }]}
          onPress={() => handleGenerateQR(item)}
          disabled={!!generating}
        >
          {isGen
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="qr-code" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    );
  };

  const renderQuota = ({ item }) => {
    const pct = item.quotaLimit > 0 ? (item.issuedCount / item.quotaLimit) * 100 : 0;
    const barColor = pct >= 90 ? COLORS.error : pct >= 70 ? COLORS.warning : COLORS.success;
    return (
      <View style={styles.quotaCard}>
        <View style={[styles.quotaHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.quotaRole}>{item.role || item.username || 'Global'}</Text>
          <Text style={styles.quotaType}>{item.periodType}</Text>
        </View>
        <View style={styles.quotaBar}>
          <View style={[styles.quotaFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
        </View>
        <View style={[styles.quotaNums, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.quotaNum}>{t('issuedCount')}: <Text style={{ fontWeight: 'bold' }}>{item.issuedCount}</Text></Text>
          <Text style={styles.quotaNum}>{t('quotaLimit')}: <Text style={{ fontWeight: 'bold' }}>{item.quotaLimit}</Text></Text>
          <Text style={[styles.quotaNum, { color: barColor }]}>{t('remaining')}: <Text style={{ fontWeight: 'bold' }}>{item.quotaLimit - item.issuedCount}</Text></Text>
        </View>
      </View>
    );
  };

  if (loading) return <LoadingSpinner message={t('loading')} />;

  return (
    <View style={styles.container}>
      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={COLORS.error} />
          <Text style={styles.errorTxt}>{error}</Text>
        </View>
      )}

      <FlatList
        data={drugs}
        keyExtractor={(d) => String(d.id)}
        renderItem={renderDrug}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[COLORS.primary]} />}
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('qrControlTitle')}</Text>
            {quotas.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left', fontSize: 14, marginTop: 8 }]}>{t('quotaLimit')}</Text>
                {quotas.map((q) => <View key={q.id}>{renderQuota({ item: q })}</View>)}
                <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left', fontSize: 14, marginTop: 8 }]}>{t('selectDrugQR')}</Text>
              </>
            )}
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="medical-outline" message={t('noDrugs')} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      />

      {/* QR Modal */}
      <Modal visible={!!qrModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('qrGenerated')}</Text>
              <TouchableOpacity onPress={() => setQrModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {qrModal && (
              <>
                <Text style={styles.modalDrug} numberOfLines={1}>{qrModal.drug?.name}</Text>
                <View style={styles.qrBox}>
                  {qrModal.qrUrl ? (
                    <QRCode value={qrModal.qrUrl} size={200} color={COLORS.accent} />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Ionicons name="qr-code" size={80} color={COLORS.textMuted} />
                    </View>
                  )}
                </View>
                {qrModal.sequence && (
                  <Text style={styles.qrSeq}>Sequence #{qrModal.sequence}</Text>
                )}
                <Text style={styles.qrUrl} numberOfLines={3}>{qrModal.qrUrl}</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setQrModal(null)}>
                  <Text style={styles.closeBtnTxt}>{t('close')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  errorBox:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.errorBg, margin: 16, borderRadius: 8, padding: 10 },
  errorTxt:     { color: COLORS.error, fontSize: 13, flex: 1 },
  listHeader:   { marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  drugCard:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1 },
  drugInfo:     { flex: 1, alignItems: 'center', gap: 10 },
  drugIconBox:  { width: 38, height: 38, borderRadius: 19, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
  drugName:     { fontSize: 14, fontWeight: '600', color: COLORS.text },
  drugBatch:    { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  genBtn:       { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  quotaCard:    { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 8, elevation: 1 },
  quotaHeader:  { justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  quotaRole:    { fontSize: 13, fontWeight: '700', color: COLORS.text },
  quotaType:    { fontSize: 11, color: COLORS.textLight, backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  quotaBar:     { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  quotaFill:    { height: '100%', borderRadius: 3 },
  quotaNums:    { justifyContent: 'space-between' },
  quotaNum:     { fontSize: 11, color: COLORS.textLight },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center', paddingBottom: 40 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 },
  modalTitle:   { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  modalDrug:    { fontSize: 15, color: COLORS.primary, fontWeight: '600', marginBottom: 20 },
  qrBox:        { padding: 16, backgroundColor: '#fff', borderRadius: 16, elevation: 4, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  qrPlaceholder:{ width: 200, height: 200, justifyContent: 'center', alignItems: 'center' },
  qrSeq:        { fontSize: 13, color: COLORS.textLight, marginBottom: 8 },
  qrUrl:        { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', marginBottom: 20, paddingHorizontal: 16 },
  closeBtn:     { backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 12, borderRadius: 12 },
  closeBtnTxt:  { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
