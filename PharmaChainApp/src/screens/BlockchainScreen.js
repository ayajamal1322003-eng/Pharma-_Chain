import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { getDrugs, getChain, tamperChain, restoreChain } from '../utils/api';
import Header from '../components/Header';

export default function BlockchainScreen({ navigation }) {
  const { role }   = useAuth();
  const { lang }   = useLang();
  const T = (k) => t(k, lang);

  const [drugs,      setDrugs]      = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [chain,      setChain]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [loadingDrugs, setLD]       = useState(true);
  const [integrity,  setIntegrity]  = useState(null);

  useEffect(() => {
    getDrugs().then(({ ok, data }) => { if (ok) setDrugs(data || []); setLD(false); });
  }, []);

  async function loadChain(drugId) {
    setSelectedId(drugId); setChain([]); setIntegrity(null); setLoading(true);
    const { ok, data } = await getChain(drugId);
    if (ok) setChain(Array.isArray(data) ? data : (data?.blocks || []));
    setLoading(false);
  }

  function checkIntegrity() {
    if (!chain.length) return;
    let ok = true;
    for (let i = 1; i < chain.length; i++) {
      if (chain[i].previousHash !== chain[i - 1].hash) { ok = false; break; }
    }
    setIntegrity(ok);
    Alert.alert(ok ? '✅' : '🚨', ok ? T('bc_valid') : T('bc_tampered'));
  }

  const stats = {
    blocks: chain.length,
    nonce:  chain.at(-1)?.nonce ?? '—',
    merkle: chain.at(-1)?.merkleRoot ? chain.at(-1).merkleRoot.slice(0, 16) + '...' : '—',
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={T('chain_title')} subtitle={T('chain_subtitle')} onMenuPress={() => navigation.navigate('MenuModal')} />
      <ScrollView style={styles.scroll}>

        {/* Drug selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{T('bc_select_drug')}</Text>
          {loadingDrugs ? <ActivityIndicator color={C.teal500} /> : (
            <ScrollView style={{ maxHeight: 150 }}>
              {drugs.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.drugOpt, String(d.id) === String(selectedId) && styles.drugOptActive]}
                  onPress={() => loadChain(d.id)}
                >
                  <Text style={[styles.drugOptText, String(d.id) === String(selectedId) && { color: C.white }]}>
                    💊 {d.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Stats */}
        {chain.length > 0 && (
          <View style={styles.statsRow}>
            <StatBox label={T('bc_stat_blocks')} value={stats.blocks} color={C.teal600} />
            <StatBox label={T('bc_stat_nonce')}  value={stats.nonce}  color={C.purple600} />
            <StatBox label={T('bc_stat_chain')}
              value={integrity === null ? T('bc_stat_ok') : integrity ? '✅' : '🚨'}
              color={integrity === false ? C.rose600 : C.emerald600}
            />
          </View>
        )}

        {/* Verify button */}
        {chain.length > 0 && (
          <View style={styles.verifyRow}>
            <TouchableOpacity style={styles.verifyBtn} onPress={checkIntegrity}>
              <Text style={styles.verifyBtnText}>🔍 {T('bc_verify_btn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Admin controls */}
        {role === 'Admin' && chain.length > 0 && (
          <View style={[styles.card, { borderWidth: 1, borderColor: C.amber200 }]}>
            <Text style={[styles.cardTitle, { color: C.amber600 }]}>⚙️ {T('bc_demo_title')}</Text>
            <View style={styles.adminBtns}>
              <TouchableOpacity
                style={[styles.adminBtn, { backgroundColor: C.rose50, borderColor: C.rose300 }]}
                onPress={() => Alert.alert('⚠️', 'Tamper chain?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Tamper', style: 'destructive', onPress: () => tamperChain(selectedId).then(() => loadChain(selectedId)) },
                ])}
              >
                <Text style={{ color: C.rose700, fontWeight: '700' }}>🔓 {T('bc_demo_tamper')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adminBtn, { backgroundColor: C.emerald50, borderColor: C.emerald300 }]}
                onPress={() => restoreChain(selectedId).then(() => { loadChain(selectedId); setIntegrity(null); })}
              >
                <Text style={{ color: C.emerald700, fontWeight: '700' }}>🔒 {T('bc_demo_restore')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Chain blocks */}
        {loading ? (
          <ActivityIndicator color={C.teal500} style={{ marginTop: 30 }} size="large" />
        ) : chain.length === 0 && selectedId ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 36 }}>⛓️</Text>
            <Text style={styles.emptyTitle}>{T('bc_empty_title')}</Text>
          </View>
        ) : chain.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>⛓️</Text>
            <Text style={styles.emptyTitle}>{T('bc_empty_title')}</Text>
            <Text style={styles.emptySub}>{T('bc_empty_sub')}</Text>
          </View>
        ) : (
          chain.map((block, i) => <BlockCard key={i} block={block} index={i} isLast={i === chain.length - 1} />)
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ACTION_META = {
  DRUG_REGISTERED:  { icon: '💊', color: C.teal600,    label: 'DRUG_REGISTERED'  },
  QR_GENERATED:     { icon: '🔷', color: C.purple600,  label: 'QR_GENERATED'    },
  TRANSFER:         { icon: '🚛', color: C.amber600,   label: 'TRANSFER'        },
  CUSTOMER_SCAN:    { icon: '✅', color: C.emerald600, label: 'CUSTOMER_SCAN'   },
  ATTACK_DETECTED:  { icon: '🚨', color: C.rose600,    label: 'ATTACK_DETECTED' },
};

function BlockCard({ block, index, isLast }) {
  const [expanded, setExpanded] = useState(index === 0);
  const isGenesis   = index === 0;
  const isAttack    = block.actionType === 'ATTACK_DETECTED';
  const meta        = ACTION_META[block.actionType] ?? ACTION_META['TRANSFER'];
  const numBg       = isAttack ? C.rose600 : isGenesis ? C.teal600 : meta.color;
  const cardBorder  = isAttack ? { borderLeftWidth: 3, borderLeftColor: C.rose500 } : {};

  return (
    <TouchableOpacity
      style={[styles.blockCard, isAttack && styles.blockCardAttack]}
      onPress={() => setExpanded(v => !v)}
      activeOpacity={0.8}
    >
      <View style={styles.blockHeader}>
        <View style={[styles.blockNum, { backgroundColor: numBg }]}>
          <Text style={styles.blockNumText}>{isAttack ? '🚨' : `#${index}`}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.blockTitleRow}>
            <Text style={[styles.blockTitle, isAttack && { color: C.rose700 }]}>
              {isGenesis ? '🌱 Genesis Block' : `Block #${block.blockNumber ?? index}`}
            </Text>
            {/* Action type badge */}
            <View style={[styles.actionBadge, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
              <Text style={[styles.actionBadgeText, { color: meta.color }]}>
                {meta.icon} {meta.label}
              </Text>
            </View>
          </View>
          <Text style={styles.blockMeta} numberOfLines={1}>
            Hash: {(block.hash || block.blockHash)?.slice(0, 20)}...
          </Text>
        </View>
        <Text style={{ color: C.gray400, fontSize: 16 }}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {isAttack && !expanded && (
        <View style={styles.attackWarning}>
          <Text style={styles.attackWarningText}>
            ⚠️ {block.toUsername === 'INVENTORY_GUARD' ? 'Inventory Manipulation Attempt' : 'QR Replay/Duplicate Attempt'} — Blocked &amp; Recorded
          </Text>
        </View>
      )}

      {expanded && (
        <View style={styles.blockDetails}>
          {[
            { label: 'Action',      value: block.actionType },
            { label: 'From',        value: block.fromUsername || 'System' },
            { label: 'To',          value: block.toUsername || '—' },
            { label: 'Status',      value: block.status },
            { label: 'Timestamp',   value: block.timestamp?.split('T')[0] || '—' },
            { label: 'Nonce',       value: String(block.nonce ?? '—') },
            { label: 'Hash',        value: block.hash || block.blockHash },
            { label: 'Prev. Hash',  value: block.previousHash },
            { label: 'Merkle Root', value: block.merkleRoot },
          ].map(row => (
            <View key={row.label} style={styles.blockRow}>
              <Text style={styles.blockLabel}>{row.label}</Text>
              <Text style={[
                styles.blockValue,
                row.label === 'Action' && isAttack && { color: C.rose600, fontWeight: '700' },
              ]} numberOfLines={2}>{row.value || '—'}</Text>
            </View>
          ))}
        </View>
      )}
      {!isLast && <View style={[styles.chainLine, isAttack && { backgroundColor: C.rose300 }]} />}
    </TouchableOpacity>
  );
}

function StatBox({ label, value, color }) {
  return (
    <View style={[styles.statBox, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  card: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 12, marginVertical: 6, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.gray900, marginBottom: 12 },
  drugOpt: {
    padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.gray200,
    marginBottom: 6, backgroundColor: C.gray50,
  },
  drugOptActive:  { backgroundColor: C.teal600, borderColor: C.teal600 },
  drugOptText:    { fontSize: 13, fontWeight: '600', color: C.gray800 },

  statsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 12, marginVertical: 6 },
  statBox: {
    flex: 1, backgroundColor: C.white, borderRadius: 12,
    padding: 12, alignItems: 'center',
    borderTopWidth: 3, borderTopColor: C.teal600,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 10, color: C.gray500, textAlign: 'center' },

  verifyRow: { paddingHorizontal: 12, marginBottom: 8 },
  verifyBtn: {
    backgroundColor: C.teal600, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  verifyBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },

  adminBtns: { flexDirection: 'row', gap: 8 },
  adminBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1.5,
  },

  blockCard: {
    backgroundColor: C.white, borderRadius: 14,
    marginHorizontal: 12, marginBottom: 4, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  blockCardAttack: {
    backgroundColor: '#fff5f5', borderLeftWidth: 3, borderLeftColor: C.rose500,
  },
  blockHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 },
  blockNum: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  blockNumText: { color: C.white, fontSize: 12, fontWeight: '900' },
  blockTitle:   { fontSize: 13, fontWeight: '700', color: C.gray900 },
  blockMeta:    { fontSize: 10, color: C.gray400, marginTop: 2, fontFamily: 'monospace' },

  actionBadge: {
    borderRadius: 5, borderWidth: 1,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  actionBadgeText: { fontSize: 9, fontWeight: '700', fontFamily: 'monospace' },

  attackWarning: {
    marginTop: 6, backgroundColor: '#fef2f2', borderRadius: 6, padding: 6,
  },
  attackWarningText: { fontSize: 10, color: C.rose700, fontWeight: '600' },

  blockDetails: { marginTop: 12, gap: 6 },
  blockRow:     { flexDirection: 'row', gap: 8 },
  blockLabel:   { fontSize: 11, color: C.gray500, width: 80, flexShrink: 0 },
  blockValue:   { flex: 1, fontSize: 11, color: C.gray800, fontFamily: 'monospace' },
  chainLine: {
    width: 2, height: 16, backgroundColor: C.teal300,
    alignSelf: 'center', marginTop: 4,
  },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.gray600, textAlign: 'center' },
  emptySub:   { fontSize: 12, color: C.gray400, textAlign: 'center' },
});
