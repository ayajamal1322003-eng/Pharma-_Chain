import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { useLang } from '../context/LangContext';
import { t } from '../utils/i18n';
import { getDrugs, verifyQR, getChain, getAttackScenarios, getInventoryStatus } from '../utils/api';
import Header from '../components/Header';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function InfoRow({ label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

function SectionHeader({ icon, title, subtitle, color = C.rose600 }) {
  return (
    <View style={[styles.scenarioHeader, { borderLeftColor: color }]}>
      <Text style={[styles.scenarioIcon]}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.scenarioTitle, { color }]}>{title}</Text>
        <Text style={styles.scenarioType}>{subtitle}</Text>
      </View>
    </View>
  );
}

function InventoryBar({ issued, total, consumed }) {
  const issuedPct  = total > 0 ? Math.min(100, (issued / total) * 100)   : 0;
  const consumedPct= total > 0 ? Math.min(100, (consumed / total) * 100) : 0;
  const isLocked   = issued >= total && total > 0;

  return (
    <View style={styles.barWrap}>
      {/* Track */}
      <View style={styles.barTrack}>
        {/* consumed (green) */}
        <View style={[styles.barFill, { width: `${consumedPct}%`, backgroundColor: C.emerald400 }]} />
        {/* issued-not-consumed (amber) */}
        <View style={[styles.barFill, {
          width: `${Math.max(0, issuedPct - consumedPct)}%`,
          backgroundColor: isLocked ? C.rose400 : C.amber400,
        }]} />
      </View>
      <View style={styles.barLabels}>
        <Text style={styles.barLabelLeft}>0</Text>
        <Text style={[styles.barLabelCenter, { color: isLocked ? C.rose600 : C.teal700 }]}>
          {issuedPct.toFixed(0)}% {isLocked ? '🔒 LOCKED' : '✅ Available'}
        </Text>
        <Text style={styles.barLabelRight}>{total}</Text>
      </View>
      <View style={styles.barLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: C.emerald400 }]} />
          <Text style={styles.legendText}>Dispensed (Customer Scan)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: isLocked ? C.rose400 : C.amber400 }]} />
          <Text style={styles.legendText}>{isLocked ? 'Issued — Not Dispensed (LOCKED)' : 'Issued — Pending Dispensing'}</Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function AttackDemoScreen({ navigation }) {
  const { lang } = useLang();
  const T = useCallback((k) => t(k, lang), [lang]);

  // Scenario 1 state
  const [qrInput,   setQrInput]   = useState('');
  const [qrResult,  setQrResult]  = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Scenario 2 state
  const [drugs,      setDrugs]      = useState([]);
  const [selectedDrug, setSelected] = useState(null);
  const [invStatus,  setInvStatus]  = useState(null);
  const [invLoading, setInvLoading] = useState(false);

  // Attack log state
  const [attackLog,     setAttackLog]     = useState(null);
  const [logLoading,    setLogLoading]    = useState(false);

  // Chain inspector state
  const [chainId,     setChainId]    = useState('');
  const [chainResult, setChainResult]= useState(null);
  const [chainLoading,setChainLoad]  = useState(false);

  useEffect(() => {
    getDrugs().then(({ ok, data }) => { if (ok) setDrugs(data || []); });
    loadAttackLog();
  }, []);

  async function loadAttackLog() {
    setLogLoading(true);
    const { ok, data } = await getAttackScenarios();
    if (ok) setAttackLog(data);
    setLogLoading(false);
  }

  // ── Scenario 1: Duplicate QR ─────────────────────────────────
  async function inspectQR() {
    if (!qrInput.trim()) return;
    setQrLoading(true); setQrResult(null);
    const { ok, data } = await verifyQR(qrInput.trim());
    setQrResult({ ok, ...data });
    setQrLoading(false);
    // Refresh attack log to show new ATTACK_DETECTED entry
    if (data?.attackType === 'DUPLICATE_QR') loadAttackLog();
  }

  // ── Scenario 2: Inventory check ──────────────────────────────
  async function checkInventory() {
    if (!selectedDrug) return;
    setInvLoading(true); setInvStatus(null);
    const { ok, data } = await getInventoryStatus(selectedDrug.id);
    if (ok) setInvStatus(data);
    setInvLoading(false);
  }

  // ── Chain inspector ──────────────────────────────────────────
  async function inspectChain() {
    if (!chainId.trim()) return;
    setChainLoad(true); setChainResult(null);
    const { ok, data } = await getChain(chainId.trim());
    const blocks = Array.isArray(data) ? data : (data?.blocks || data?.chain || []);
    let valid = true;
    for (let i = 1; i < blocks.length; i++) {
      if (blocks[i].previousHash !== blocks[i - 1].blockHash &&
          blocks[i].previousHash !== blocks[i - 1].hash) { valid = false; break; }
    }
    const attackBlocks = blocks.filter(b => b.actionType === 'ATTACK_DETECTED').length;
    setChainResult({ ok, blocks: blocks.length, valid, attackBlocks });
    setChainLoad(false);
  }

  const ATTACK_TYPES = [
    { icon: '🔁', label: 'DUPLICATE_QR',       desc: 'QR Code reused after first dispensing' },
    { icon: '📦', label: 'INVENTORY_EXCEEDED',  desc: 'QR issuance exceeds registered quantity' },
    { icon: '❌', label: 'SIGNATURE_MISMATCH',  desc: 'QR copied from another drug (label swap)' },
    { icon: '📅', label: 'DATE_MISMATCH',       desc: 'Manufacture/expiry date altered in QR' },
    { icon: '👻', label: 'DRUG_NOT_FOUND',      desc: 'Fake drug ID in QR (counterfeit)' },
    { icon: '⏰', label: 'QR_EXPIRED',          desc: 'QR older than 1 year' },
    { icon: '🚫', label: 'QUOTA_EXCEEDED',      desc: 'Over monthly generation limit' },
    { icon: '✅', label: 'NONE',                desc: 'All checks passed — legitimate scan' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title={T('attack_title')}
        subtitle={T('attack_subtitle')}
        onMenuPress={() => navigation.navigate('MenuModal')}
      />
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ══════════════════════════════════════════════
            ATTACK SCENARIO 1 — Duplicate QR (Replay)
        ══════════════════════════════════════════════ */}
        <View style={[styles.card, styles.attackCard]}>
          <SectionHeader
            icon="🔁"
            title={T('atk_s1_title')}
            subtitle={T('atk_s1_type')}
            color={C.rose600}
          />

          {/* Description */}
          <View style={styles.descBox}>
            <Text style={styles.descText}>{T('atk_s1_desc')}</Text>
          </View>

          {/* Detection mechanism */}
          <View style={styles.howBox}>
            <Text style={styles.howLabel}>آلية الكشف / Detection Method</Text>
            <Text style={styles.howText}>{T('atk_s1_how')}</Text>
          </View>

          {/* QR Inspector */}
          <Text style={styles.fieldLabel}>{T('attack_qr_title')}</Text>
          <Text style={styles.fieldSub}>{T('attack_qr_sub')}</Text>
          <TextInput
            style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
            placeholder={T('atk_s1_scan_ph')}
            placeholderTextColor={C.gray400}
            value={qrInput}
            onChangeText={v => { setQrInput(v); setQrResult(null); }}
            multiline
          />
          <TouchableOpacity
            style={[styles.btn, styles.btnRed, qrLoading && styles.btnDisabled]}
            onPress={inspectQR}
            disabled={qrLoading}
          >
            {qrLoading
              ? <ActivityIndicator color={C.white} size="small" />
              : <Text style={styles.btnText}>🔍 {T('attack_btn')}</Text>
            }
          </TouchableOpacity>

          {qrResult && (
            <View style={[styles.resultBox, {
              backgroundColor: qrResult.isValid ? C.emerald50 : C.rose50,
              borderColor:     qrResult.isValid ? C.emerald300 : C.rose400,
            }]}>
              <Text style={[styles.resultTitle, { color: qrResult.isValid ? C.emerald700 : C.rose700 }]}>
                {qrResult.isValid ? T('attack_result_ok') : T('attack_result_fail')}
              </Text>
              {qrResult.attackType && qrResult.attackType !== 'NONE' && (
                <View style={styles.attackTypeBadge}>
                  <Text style={styles.attackTypeBadgeText}>{qrResult.attackType}</Text>
                </View>
              )}
              {qrResult.message && (
                <Text style={styles.resultMsg}>{qrResult.message}</Text>
              )}
              {qrResult.attackType === 'DUPLICATE_QR' && (
                <>
                  {qrResult.firstScanned && (
                    <InfoRow label={T('atk_s1_first_scan')} value={qrResult.firstScanned} valueColor={C.rose700} />
                  )}
                  <View style={styles.ledgerBadge}>
                    <Text style={styles.ledgerBadgeText}>⛓️ {T('atk_s1_ledger')}</Text>
                  </View>
                </>
              )}
              {qrResult.detail && (
                <Text style={styles.resultDetail}>{qrResult.detail}</Text>
              )}
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════════
            ATTACK SCENARIO 2 — Inventory Manipulation
        ══════════════════════════════════════════════ */}
        <View style={[styles.card, styles.attackCard]}>
          <SectionHeader
            icon="📦"
            title={T('atk_s2_title')}
            subtitle={T('atk_s2_type')}
            color={C.amber600}
          />

          <View style={styles.descBox}>
            <Text style={styles.descText}>{T('atk_s2_desc')}</Text>
          </View>

          <View style={styles.howBox}>
            <Text style={styles.howLabel}>آلية الكشف / Detection Method</Text>
            <Text style={styles.howText}>{T('atk_s2_how')}</Text>
          </View>

          {/* Drug selector */}
          <Text style={styles.fieldLabel}>{T('atk_s2_drug_lbl')}</Text>
          <ScrollView style={styles.drugList} nestedScrollEnabled>
            {drugs.length === 0
              ? <Text style={styles.emptyHint}>جاري تحميل الأدوية...</Text>
              : drugs.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.drugOpt, selectedDrug?.id === d.id && styles.drugOptActive]}
                  onPress={() => { setSelected(d); setInvStatus(null); }}
                >
                  <Text style={[styles.drugOptText, selectedDrug?.id === d.id && { color: C.white }]}>
                    💊 {d.name}
                    <Text style={styles.drugQtyText}> ({d.quantity} وحدة)</Text>
                  </Text>
                </TouchableOpacity>
              ))
            }
          </ScrollView>

          <TouchableOpacity
            style={[styles.btn, styles.btnAmber, (!selectedDrug || invLoading) && styles.btnDisabled]}
            onPress={checkInventory}
            disabled={!selectedDrug || invLoading}
          >
            {invLoading
              ? <ActivityIndicator color={C.white} size="small" />
              : <Text style={styles.btnText}>📊 {T('atk_s2_check_btn')}</Text>
            }
          </TouchableOpacity>

          {invStatus && (
            <View style={[styles.invResult, {
              borderColor: invStatus.isLocked ? C.rose400 : C.emerald400,
              backgroundColor: invStatus.isLocked ? C.rose50 : C.emerald50,
            }]}>
              {/* Status badge */}
              <View style={[styles.invStatusBadge, {
                backgroundColor: invStatus.isLocked ? C.rose600 : C.emerald600,
              }]}>
                <Text style={styles.invStatusText}>
                  {invStatus.isLocked ? `🔒 ${T('atk_s2_locked')}` : `✅ ${T('atk_s2_available')}`}
                </Text>
              </View>

              {/* Inventory bar */}
              <InventoryBar
                issued={invStatus.qrIssued}
                total={invStatus.registeredQty}
                consumed={invStatus.customerScans}
              />

              {/* Numbers */}
              <View style={styles.invGrid}>
                <View style={styles.invCell}>
                  <Text style={styles.invNum}>{invStatus.registeredQty}</Text>
                  <Text style={styles.invNumLabel}>{T('atk_s2_reg_qty')}</Text>
                </View>
                <View style={styles.invCell}>
                  <Text style={[styles.invNum, { color: C.amber700 }]}>{invStatus.qrIssued}</Text>
                  <Text style={styles.invNumLabel}>{T('atk_s2_issued')}</Text>
                </View>
                <View style={styles.invCell}>
                  <Text style={[styles.invNum, { color: C.emerald700 }]}>{invStatus.customerScans}</Text>
                  <Text style={styles.invNumLabel}>{T('atk_s2_consumed')}</Text>
                </View>
                <View style={styles.invCell}>
                  <Text style={[styles.invNum, { color: C.rose700 }]}>{invStatus.unconsumed}</Text>
                  <Text style={styles.invNumLabel}>{T('atk_s2_unconsumed')}</Text>
                </View>
              </View>

              {/* Explanation */}
              <Text style={[styles.invMessage, { color: invStatus.isLocked ? C.rose800 : C.emerald800 }]}>
                {invStatus.message}
              </Text>

              {invStatus.isLocked && (
                <View style={styles.ledgerBadge}>
                  <Text style={styles.ledgerBadgeText}>⛓️ أي محاولة إصدار QR ستُسجَّل كـ ATTACK_DETECTED في الـ Ledger</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════════
            ATTACK LOG — BLOCKCHAIN ENTRIES
        ══════════════════════════════════════════════ */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>⛓️ {T('atk_log_title')}</Text>
            <TouchableOpacity onPress={loadAttackLog} style={styles.refreshBtn}>
              <Text style={styles.refreshBtnText}>↻</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSub}>{T('atk_log_sub')}</Text>

          {logLoading
            ? <ActivityIndicator color={C.teal500} style={{ marginTop: 12 }} />
            : attackLog
            ? (
              <>
                {/* Summary chips */}
                <View style={styles.summaryRow}>
                  <View style={[styles.summaryChip, { backgroundColor: C.rose100 }]}>
                    <Text style={[styles.summaryNum, { color: C.rose700 }]}>
                      {attackLog.summary?.totalAttackBlocks ?? 0}
                    </Text>
                    <Text style={styles.summaryLabel}>{T('atk_log_total')}</Text>
                  </View>
                  <View style={[styles.summaryChip, { backgroundColor: C.purple100 }]}>
                    <Text style={[styles.summaryNum, { color: C.purple700 }]}>
                      {attackLog.summary?.duplicateQrAttempts ?? 0}
                    </Text>
                    <Text style={styles.summaryLabel}>{T('atk_log_duplicate')}</Text>
                  </View>
                  <View style={[styles.summaryChip, { backgroundColor: C.amber100 }]}>
                    <Text style={[styles.summaryNum, { color: C.amber700 }]}>
                      {attackLog.summary?.inventoryViolations ?? 0}
                    </Text>
                    <Text style={styles.summaryLabel}>{T('atk_log_inventory')}</Text>
                  </View>
                </View>

                {/* Attack entries */}
                {attackLog.recentAttacks?.length === 0
                  ? <Text style={styles.emptyHint}>{T('atk_log_empty')}</Text>
                  : attackLog.recentAttacks?.map((a, i) => (
                    <View key={i} style={styles.attackEntry}>
                      <View style={styles.attackEntryHeader}>
                        <Text style={styles.attackEntryBlock}>⛓️ Block #{a.blockNumber}</Text>
                        <Text style={styles.attackEntryBadge}>
                          {a.toUsername === 'INVENTORY_GUARD' ? '📦 INVENTORY' : '🔁 DUPLICATE'}
                        </Text>
                      </View>
                      <Text style={styles.attackEntryDrug}>💊 {a.drugName} (ID: {a.drugId})</Text>
                      <Text style={styles.attackEntryFrom}>
                        From: {a.fromRole} / {a.fromUsername}
                      </Text>
                      <Text style={styles.attackEntryTime}>
                        {a.timestamp ? new Date(a.timestamp).toLocaleString() : '—'}
                      </Text>
                      <Text style={styles.attackEntryHash} numberOfLines={1}>
                        Hash: {a.blockHash}
                      </Text>
                    </View>
                  ))
                }
              </>
            )
            : <Text style={styles.emptyHint}>{T('atk_log_empty')}</Text>
          }
        </View>

        {/* ══════════════════════════════════════════════
            ATTACK TYPES REFERENCE
        ══════════════════════════════════════════════ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛡️ جميع أنواع الهجمات المكتشفة</Text>
          <Text style={styles.cardSub}>Attack Types Detected by PharmaChain</Text>
          {ATTACK_TYPES.map((a, i) => (
            <View key={i} style={styles.attackRow}>
              <Text style={styles.attackIcon}>{a.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.attackLabel}>{a.label}</Text>
                <Text style={styles.attackDesc}>{a.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════════════════
            CHAIN INSPECTOR
        ══════════════════════════════════════════════ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{T('attack_chain_title')}</Text>
          <Text style={styles.cardSub}>{T('attack_chain_sub')}</Text>
          <TextInput
            style={styles.input}
            placeholder={T('attack_chain_ph')}
            placeholderTextColor={C.gray400}
            keyboardType="numeric"
            value={chainId}
            onChangeText={v => { setChainId(v); setChainResult(null); }}
          />
          <TouchableOpacity
            style={[styles.btn, chainLoading && styles.btnDisabled]}
            onPress={inspectChain}
            disabled={chainLoading}
          >
            {chainLoading
              ? <ActivityIndicator color={C.white} size="small" />
              : <Text style={styles.btnText}>⛓️ {T('attack_chain_btn')}</Text>
            }
          </TouchableOpacity>

          {chainResult && (
            <View style={[styles.resultBox, {
              backgroundColor: chainResult.valid ? C.emerald50 : C.rose50,
              borderColor:     chainResult.valid ? C.emerald300 : C.rose300,
            }]}>
              <Text style={[styles.resultTitle, { color: chainResult.valid ? C.emerald700 : C.rose700 }]}>
                {chainResult.valid ? '✅ Chain Intact' : '🚨 Chain Tampered!'}
              </Text>
              <InfoRow label="Total Blocks" value={chainResult.blocks} />
              {chainResult.attackBlocks > 0 && (
                <InfoRow
                  label="ATTACK_DETECTED Blocks"
                  value={chainResult.attackBlocks}
                  valueColor={C.rose600}
                />
              )}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  card: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 12, marginVertical: 6, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  attackCard: {
    borderLeftWidth: 4, borderLeftColor: C.rose300,
  },
  cardTitle:    { fontSize: 14, fontWeight: '800', color: C.gray900, marginBottom: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardSub:      { fontSize: 11, color: C.gray500, marginBottom: 12 },
  refreshBtn:   { padding: 4 },
  refreshBtnText: { fontSize: 18, color: C.teal600, fontWeight: '700' },

  // Scenario header
  scenarioHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderLeftWidth: 4, paddingLeft: 10, marginBottom: 12,
  },
  scenarioIcon:  { fontSize: 24, marginTop: 2 },
  scenarioTitle: { fontSize: 15, fontWeight: '900', marginBottom: 2 },
  scenarioType:  { fontSize: 12, color: C.gray600, fontStyle: 'italic' },

  // Description / how boxes
  descBox: {
    backgroundColor: C.gray50, borderRadius: 10, padding: 12, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: C.rose300,
  },
  descText: { fontSize: 12, color: C.gray700, lineHeight: 18 },
  howBox: {
    backgroundColor: C.teal50 || '#f0fdfa', borderRadius: 10, padding: 12, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: C.teal400,
  },
  howLabel: { fontSize: 11, fontWeight: '700', color: C.teal700, marginBottom: 4 },
  howText:  { fontSize: 11, color: C.gray700, lineHeight: 17 },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: C.gray800, marginBottom: 4 },
  fieldSub:   { fontSize: 11, color: C.gray500, marginBottom: 8 },

  // Input
  input: {
    borderWidth: 1.5, borderColor: C.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: C.gray900, backgroundColor: C.gray50, marginBottom: 10,
  },

  // Buttons
  btn: {
    backgroundColor: C.teal600, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginBottom: 4,
  },
  btnRed:     { backgroundColor: C.rose600 },
  btnAmber:   { backgroundColor: C.amber600 },
  btnDisabled:{ backgroundColor: C.gray300 },
  btnText:    { color: C.white, fontSize: 14, fontWeight: '700' },

  // Result boxes
  resultBox: {
    marginTop: 10, borderRadius: 12, padding: 14, borderWidth: 1.5,
  },
  resultTitle:  { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  resultMsg:    { fontSize: 12, color: C.gray700, marginTop: 4, lineHeight: 17 },
  resultDetail: { fontSize: 11, color: C.gray500, marginTop: 6, fontStyle: 'italic' },

  attackTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.rose600, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6,
  },
  attackTypeBadgeText: { color: C.white, fontSize: 11, fontWeight: '800', fontFamily: 'monospace' },

  // Info rows
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  infoLabel: { fontSize: 11, color: C.gray500 },
  infoValue: { fontSize: 11, color: C.gray800, fontWeight: '600' },

  // Ledger badge
  ledgerBadge: {
    marginTop: 8, backgroundColor: C.purple100 || '#f3e8ff', borderRadius: 8,
    padding: 8, borderLeftWidth: 3, borderLeftColor: C.purple600 || '#9333ea',
  },
  ledgerBadgeText: { fontSize: 11, color: C.purple700 || '#7e22ce', fontWeight: '600' },

  // Inventory result
  invResult: { marginTop: 12, borderRadius: 14, padding: 14, borderWidth: 1.5 },
  invStatusBadge: {
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'stretch', alignItems: 'center', marginBottom: 12,
  },
  invStatusText: { color: C.white, fontSize: 13, fontWeight: '800' },

  // Inventory bar
  barWrap:   { marginBottom: 12 },
  barTrack: {
    height: 18, backgroundColor: C.gray200, borderRadius: 9,
    overflow: 'hidden', flexDirection: 'row',
  },
  barFill:     { height: '100%' },
  barLabels:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  barLabelLeft:   { fontSize: 10, color: C.gray500 },
  barLabelCenter: { fontSize: 10, fontWeight: '700' },
  barLabelRight:  { fontSize: 10, color: C.gray500 },
  barLegend:   { flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontSize: 10, color: C.gray600 },

  // Inventory grid
  invGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10,
  },
  invCell: {
    flex: 1, minWidth: '40%', backgroundColor: C.white,
    borderRadius: 10, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: C.gray200,
  },
  invNum:      { fontSize: 22, fontWeight: '900', color: C.gray900 },
  invNumLabel: { fontSize: 10, color: C.gray500, marginTop: 2, textAlign: 'center' },
  invMessage:  { fontSize: 12, lineHeight: 18, marginTop: 4 },

  // Attack log
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryChip: {
    flex: 1, borderRadius: 10, padding: 10, alignItems: 'center',
  },
  summaryNum:   { fontSize: 22, fontWeight: '900' },
  summaryLabel: { fontSize: 9, color: C.gray600, marginTop: 2, textAlign: 'center' },

  attackEntry: {
    borderWidth: 1.5, borderColor: C.rose200, borderRadius: 12,
    padding: 10, marginBottom: 8, backgroundColor: C.rose50,
  },
  attackEntryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  attackEntryBlock:  { fontSize: 12, fontWeight: '700', color: C.rose700 },
  attackEntryBadge:  { fontSize: 10, fontWeight: '700', color: C.rose600 },
  attackEntryDrug:   { fontSize: 12, color: C.gray800, marginBottom: 2 },
  attackEntryFrom:   { fontSize: 10, color: C.gray600 },
  attackEntryTime:   { fontSize: 10, color: C.gray500, marginTop: 2 },
  attackEntryHash:   { fontSize: 9, color: C.gray400, fontFamily: 'monospace', marginTop: 2 },

  // Attack types reference
  attackRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  attackIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
  attackLabel: { fontSize: 12, fontWeight: '700', color: C.gray800 },
  attackDesc:  { fontSize: 10, color: C.gray500, marginTop: 1 },

  // Drug selector
  drugList:    { maxHeight: 130, marginBottom: 10 },
  drugOpt: {
    padding: 9, borderRadius: 8, borderWidth: 1.5, borderColor: C.gray200,
    marginBottom: 5, backgroundColor: C.gray50,
  },
  drugOptActive: { backgroundColor: C.amber600, borderColor: C.amber600 },
  drugOptText:   { fontSize: 12, fontWeight: '600', color: C.gray800 },
  drugQtyText:   { fontSize: 11, color: C.gray500 },
  emptyHint:     { fontSize: 12, color: C.gray400, textAlign: 'center', paddingVertical: 8 },
});
