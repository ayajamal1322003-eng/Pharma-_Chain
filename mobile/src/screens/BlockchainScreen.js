import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLang }  from '../context/LanguageContext';
import { getChain, verifyChain } from '../services/api';
import { COLORS }   from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState   from '../components/EmptyState';

export default function BlockchainScreen() {
  const { t, isRTL } = useLang();

  const [chain,     setChain]     = useState([]);
  const [meta,      setMeta]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [verifying, setVerifying] = useState(false);
  const [chainStatus, setStatus]  = useState(null); // null | {valid, message}

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getChain();
      setChain(res.data.chain || []);
      setMeta({ totalBlocks: res.data.totalBlocks, difficulty: res.data.difficulty });
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await verifyChain();
      setStatus(res.data);
    } catch (_) {
      setStatus({ valid: false, message: t('networkError') });
    } finally {
      setVerifying(false);
    }
  };

  const renderBlock = ({ item, index }) => (
    <View style={[styles.block, index === 0 && styles.genesisBlock]}>
      {/* Block header */}
      <View style={[styles.blockHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.blockNumBadge}>
          <Text style={styles.blockNumTxt}># {item.blockNumber}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.drugNameTxt, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {item.drugName}
          </Text>
          <Text style={[styles.timestampTxt, { textAlign: isRTL ? 'right' : 'left' }]}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Transfer chain */}
      <View style={[styles.transferRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.roleChip, { backgroundColor: '#dbeafe' }]}>
          <Text style={{ color: '#1d4ed8', fontSize: 11, fontWeight: '700' }}>{item.fromRole}</Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color={COLORS.textLight} />
        <View style={[styles.roleChip, { backgroundColor: '#dcfce7' }]}>
          <Text style={{ color: '#166534', fontSize: 11, fontWeight: '700' }}>{item.toRole}</Text>
        </View>
        <Text style={styles.usernameTxt}>{item.toUsername}</Text>
      </View>

      {/* Hashes */}
      <View style={styles.hashSection}>
        {[
          { label: 'Hash',    value: item.blockHash,     color: COLORS.success },
          { label: 'Prev',    value: item.previousHash,  color: COLORS.textLight },
          { label: 'Merkle',  value: item.merkleRoot,    color: COLORS.info },
        ].map(({ label, value, color }) => (
          <View key={label} style={styles.hashRow}>
            <Text style={[styles.hashLabel, { color }]}>{label}</Text>
            <Text style={styles.hashValue} numberOfLines={1}>{value}</Text>
          </View>
        ))}
        <View style={styles.hashRow}>
          <Text style={styles.hashLabel}>Nonce</Text>
          <Text style={styles.hashValue}>{item.nonce}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) return <LoadingSpinner message={t('loading')} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={chain}
        keyExtractor={(b) => String(b.id)}
        renderItem={renderBlock}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[COLORS.primary]} />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            {/* Meta cards */}
            {meta && (
              <View style={styles.metaRow}>
                <View style={styles.metaCard}>
                  <Ionicons name="git-network-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.metaVal}>{meta.totalBlocks}</Text>
                  <Text style={styles.metaLabel}>{t('totalBlocks')}</Text>
                </View>
                <View style={styles.metaCard}>
                  <Ionicons name="flash-outline" size={20} color={COLORS.warning} />
                  <Text style={styles.metaVal}>{meta.difficulty}</Text>
                  <Text style={styles.metaLabel}>{t('difficulty')}</Text>
                </View>
              </View>
            )}

            {/* Verify button */}
            <TouchableOpacity
              style={[styles.verifyBtn, verifying && { opacity: 0.7 }]}
              onPress={handleVerify}
              disabled={verifying}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
              <Text style={styles.verifyBtnTxt}>{t('verifyChain')}</Text>
            </TouchableOpacity>

            {/* Chain status */}
            {chainStatus && (
              <View style={[styles.statusBox, { borderLeftColor: chainStatus.valid ? COLORS.success : COLORS.error }]}>
                <Ionicons
                  name={chainStatus.valid ? 'checkmark-circle' : 'warning'}
                  size={20}
                  color={chainStatus.valid ? COLORS.success : COLORS.error}
                />
                <Text style={[styles.statusTxt, { color: chainStatus.valid ? COLORS.success : COLORS.error }]}>
                  {chainStatus.message}
                </Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="git-network-outline" message={t('noBlocks')} sub="Make a transfer to create the first block" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ItemSeparatorComponent={() => (
          <View style={styles.chainConnector}>
            <Ionicons name="link-outline" size={16} color={COLORS.textMuted} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header:       { gap: 12, marginBottom: 8 },
  metaRow:      { flexDirection: 'row', gap: 12 },
  metaCard:     { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, elevation: 1 },
  metaVal:      { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  metaLabel:    { fontSize: 11, color: COLORS.textLight },
  verifyBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, height: 48 },
  verifyBtnTxt: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  statusBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, borderLeftWidth: 4 },
  statusTxt:    { fontSize: 14, fontWeight: '600', flex: 1 },
  block: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  genesisBlock: { borderLeftColor: COLORS.warning },
  blockHeader:  { alignItems: 'center', gap: 10, marginBottom: 10 },
  blockNumBadge:{ backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  blockNumTxt:  { color: COLORS.primaryDark, fontSize: 13, fontWeight: 'bold' },
  drugNameTxt:  { fontSize: 14, fontWeight: '600', color: COLORS.text },
  timestampTxt: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  transferRow:  { alignItems: 'center', gap: 6, marginBottom: 10 },
  roleChip:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  usernameTxt:  { fontSize: 12, color: COLORS.textLight, flex: 1 },
  hashSection:  { backgroundColor: COLORS.background, borderRadius: 8, padding: 10, gap: 4 },
  hashRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hashLabel:    { fontSize: 10, fontWeight: '700', color: COLORS.textLight, width: 50 },
  hashValue:    { fontSize: 11, color: COLORS.text, fontFamily: 'monospace', flex: 1, textAlign: 'right' },
  chainConnector:{ alignItems: 'center', paddingVertical: 4 },
});
