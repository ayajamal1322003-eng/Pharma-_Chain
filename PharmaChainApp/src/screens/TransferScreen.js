import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { getDrugs, transferDrug, getRecentTrans } from '../utils/api';
import Header from '../components/Header';

const ALLOWED_ROLES = ['Factory', 'Distributor', 'Pharmacy', 'Admin'];

export default function TransferScreen({ navigation }) {
  const { role, username } = useAuth();
  const { lang }           = useLang();
  const T = (k) => t(k, lang);

  const [drugs,      setDrugs]      = useState([]);
  const [recent,     setRecent]     = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [recipient,  setRecipient]  = useState('');
  const [notes,      setNotes]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [loadingData,setLoadingData]= useState(true);
  const [errors,     setErrors]     = useState({});

  useEffect(() => {
    Promise.all([getDrugs(), getRecentTrans()]).then(([d, r]) => {
      if (d.ok) setDrugs(d.data || []);
      if (r.ok) setRecent((r.data || []).slice(0, 5));
      setLoadingData(false);
    });
  }, []);

  if (!ALLOWED_ROLES.includes(role)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={T('transfer_title')} onMenuPress={() => navigation.navigate('MenuModal')} />
        <View style={styles.noAccess}>
          <Text style={{ fontSize: 48 }}>⛔</Text>
          <Text style={styles.noAccessText}>{T('tr_no_access')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedDrug = drugs.find(d => String(d.id) === String(selectedId));

  async function submit() {
    const e = {};
    if (!selectedId)        e.drug      = T('tr_select_drug');
    if (!recipient.trim())  e.recipient = T('tr_recipient_err');
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      const { ok, data } = await transferDrug({ drugId: selectedId, toUsername: recipient.trim(), notes });
      if (ok) {
        Alert.alert('✅', T('tr_success'), [{ text: 'OK', onPress: () => {
          setSelectedId(''); setRecipient(''); setNotes('');
          setErrors({});
        }}]);
      } else {
        Alert.alert('Error', data?.message || 'Transfer failed');
      }
    } catch { Alert.alert('Error', T('login_err_server')); }
    finally  { setLoading(false); }
  }

  const supplyPath = [
    { icon: '🏭', label: T('tr_role_factory'),  role: 'Factory' },
    { icon: '🚚', label: T('tr_role_dist'),      role: 'Distributor' },
    { icon: '🏪', label: T('tr_role_pharm'),     role: 'Pharmacy' },
    { icon: '👤', label: T('tr_role_cust'),      role: 'Customer' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={T('transfer_title')} subtitle={T('transfer_subtitle')} onMenuPress={() => navigation.navigate('MenuModal')} />
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Blockchain badge */}
        <View style={styles.bcBadge}>
          <Text style={styles.bcBadgeText}>⛓️ Blockchain Protection — نشط</Text>
        </View>

        {/* Drug selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{T('tr_drug_lbl')}</Text>
          {loadingData ? <ActivityIndicator color={C.teal500} /> : (
            <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator>
              {drugs.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.drugOption, String(d.id) === String(selectedId) && styles.drugOptionActive]}
                  onPress={() => { setSelectedId(String(d.id)); setErrors(e => ({ ...e, drug: '' })); }}
                >
                  <Text style={[styles.drugOptionName, String(d.id) === String(selectedId) && { color: C.white }]}>
                    💊 {d.name}
                  </Text>
                  <Text style={[styles.drugOptionQty, String(d.id) === String(selectedId) && { color: C.teal200 }]}>
                    {T('tr_qty_avail')}: {d.quantity}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {errors.drug ? <Text style={styles.errText}>⚠️ {errors.drug}</Text> : null}
          {selectedDrug && (
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedInfoText}>ID: {selectedDrug.id} • {selectedDrug.manufacturer}</Text>
            </View>
          )}
        </View>

        {/* Transfer details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{T('tr_details') || 'تفاصيل النقل'}</Text>

          {/* Sender → Recipient */}
          <View style={styles.transferArrow}>
            <View style={styles.arrowBox}>
              <Text style={styles.arrowLabel}>{T('tr_sender') || 'المرسل'}</Text>
              <Text style={styles.arrowName}>👤 {username}</Text>
              <Text style={styles.arrowRole}>{role}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
            <View style={styles.arrowBox}>
              <Text style={styles.arrowLabel}>{T('tr_recipient') || 'المستلم'}</Text>
              <Text style={styles.arrowName}>👤 {recipient || '—'}</Text>
            </View>
          </View>

          <View style={{ marginTop: 14 }}>
            <Text style={styles.fieldLabel}>{T('tr_recipient_lbl')}</Text>
            <TextInput
              style={[styles.input, errors.recipient && styles.inputError]}
              placeholder={T('tr_recipient_ph')}
              placeholderTextColor={C.gray400}
              value={recipient}
              onChangeText={v => { setRecipient(v); setErrors(e => ({ ...e, recipient: '' })); }}
              autoCapitalize="none"
            />
            {errors.recipient ? <Text style={styles.errText}>⚠️ {errors.recipient}</Text> : null}
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.fieldLabel}>{T('tr_notes_lbl')}</Text>
            <TextInput
              style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
              placeholder={T('tr_notes_ph')}
              placeholderTextColor={C.gray400}
              value={notes} onChangeText={setNotes}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={submit} disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={styles.submitBtnText}>🔄 {T('tr_btn')}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Supply path */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{T('tr_supply_path')}</Text>
          <View style={styles.supplyPath}>
            {supplyPath.map((step, i) => (
              <React.Fragment key={step.role}>
                <View style={[styles.supplyStep, step.role === role && styles.supplyStepActive]}>
                  <Text style={styles.supplyIcon}>{step.icon}</Text>
                  <Text style={[styles.supplyLabel, step.role === role && { color: C.teal600, fontWeight: '700' }]}>
                    {step.label}
                  </Text>
                </View>
                {i < supplyPath.length - 1 && <Text style={styles.supplyArrow}>→</Text>}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Recent transfers */}
        {recent.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{T('tr_recent')}</Text>
            {recent.map((tr, i) => (
              <View key={i} style={styles.recentRow}>
                <Text style={styles.recentDrug}>💊 {tr.drugName || 'Drug #' + tr.drugId}</Text>
                <Text style={styles.recentMeta}>{tr.fromUsername} → {tr.toUsername}</Text>
                <Text style={styles.recentDate}>{tr.timestamp?.split('T')[0] || ''}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  noAccess: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  noAccessText: { fontSize: 15, color: C.gray600, textAlign: 'center', paddingHorizontal: 30 },

  bcBadge: {
    margin: 12, backgroundColor: C.teal50,
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.teal200,
  },
  bcBadgeText: { color: C.teal700, fontSize: 12, textAlign: 'center', fontWeight: '600' },

  card: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 12, marginBottom: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.gray900, marginBottom: 12 },

  drugOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1, borderColor: C.gray200,
    marginBottom: 6, backgroundColor: C.gray50,
  },
  drugOptionActive:  { backgroundColor: C.teal600, borderColor: C.teal600 },
  drugOptionName:    { fontSize: 13, fontWeight: '600', color: C.gray800 },
  drugOptionQty:     { fontSize: 12, color: C.gray500 },
  selectedInfo: { marginTop: 8, padding: 8, backgroundColor: C.teal50, borderRadius: 8 },
  selectedInfoText: { fontSize: 12, color: C.teal700 },

  transferArrow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 12 },
  arrowBox:   { alignItems: 'center', gap: 3 },
  arrowLabel: { fontSize: 11, color: C.gray500 },
  arrowName:  { fontSize: 13, fontWeight: '700', color: C.gray900 },
  arrowRole:  { fontSize: 10, color: C.teal600, fontWeight: '600' },
  arrow:      { fontSize: 22, color: C.teal500, fontWeight: '900' },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.gray700, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: C.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.gray900, backgroundColor: C.gray50,
  },
  inputError: { borderColor: C.rose500 },
  errText:    { fontSize: 11, color: C.rose600, marginTop: 3 },

  submitBtn: {
    marginTop: 14, backgroundColor: C.teal600,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    shadowColor: C.teal600, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: C.gray300 },
  submitBtnText:     { color: C.white, fontSize: 14, fontWeight: '700' },

  supplyPath: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  supplyStep: { alignItems: 'center', gap: 4, padding: 8, borderRadius: 10 },
  supplyStepActive: { backgroundColor: C.teal50 },
  supplyIcon:  { fontSize: 22 },
  supplyLabel: { fontSize: 10, color: C.gray600, textAlign: 'center' },
  supplyArrow: { fontSize: 16, color: C.teal400, fontWeight: '700' },

  recentRow: {
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  recentDrug: { fontSize: 13, fontWeight: '600', color: C.gray800 },
  recentMeta: { fontSize: 12, color: C.gray500, marginTop: 2 },
  recentDate: { fontSize: 11, color: C.gray400, marginTop: 1 },
});
