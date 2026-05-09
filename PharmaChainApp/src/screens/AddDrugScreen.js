import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { C } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { addDrug }  from '../utils/api';
import Header       from '../components/Header';

const DRUG_FORMS = ['أقراص / Tablets','كبسولات / Capsules','شراب / Syrup','حقن / Injection','مرهم / Cream','قطرات / Drops','بخاخ / Spray'];

export default function AddDrugScreen({ navigation }) {
  const { role }       = useAuth();
  const { lang }       = useLang();
  const T = (k) => t(k, lang);

  const [form, setForm] = useState({
    name: '', scientificName: '', batchNumber: '',
    manufacturer: '', countryOfOrigin: '', drugForm: '',
    productionDate: '', expiryDate: '', quantity: '',
    pricePerUnit: '', notes: '',
  });
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(null);
  const [errors,    setErrors]    = useState({});

  if (role !== 'Factory' && role !== 'Admin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title={T('add_title')} onMenuPress={() => navigation.navigate('MenuModal')} />
        <View style={styles.noAccess}>
          <Text style={styles.noAccessIcon}>🚫</Text>
          <Text style={styles.noAccessText}>{T('add_no_access')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  function update(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim())        e.name        = T('add_name_err');
    if (!form.batchNumber.trim()) e.batchNumber = T('add_batch_err');
    if (!form.manufacturer.trim())e.manufacturer= T('add_mfr_err');
    if (!form.expiryDate.trim())  e.expiryDate  = T('add_expiry_err');
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity = T('add_qty_err');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const { ok, data } = await addDrug({
        ...form,
        quantity: Number(form.quantity),
        pricePerUnit: form.pricePerUnit ? Number(form.pricePerUnit) : 0,
      });
      if (ok) {
        setSuccess(data);
      } else {
        Alert.alert('Error', data?.message || T('add_err_unexpected') || 'Error');
      }
    } catch {
      Alert.alert('Error', T('login_err_server'));
    } finally {
      setLoading(false);
    }
  }

  // Success screen
  if (success) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.successScroll}>
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.successTitle}>{T('add_ai_title')}</Text>
            <Text style={styles.successSub}>{T('add_ai_sub')}</Text>

            {[T('add_ai_step1'), T('add_ai_step2'), T('add_ai_step3'), T('add_ai_step4')].map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>{i + 1}</Text></View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}

            {success.aiToken && (
              <View style={styles.tokenBox}>
                <Text style={styles.tokenLabel}>AI Token</Text>
                <Text style={styles.tokenValue} numberOfLines={3}>{success.aiToken}</Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => {
                    Clipboard.setStringAsync(success.aiToken);
                    Alert.alert('', T('add_ai_copied'));
                  }}
                >
                  <Text style={styles.copyBtnText}>{T('add_ai_copy')}</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.dashBtn} onPress={() => navigation.navigate('Dashboard')}>
              <Text style={styles.dashBtnText}>🏠 {T('add_ai_dashboard')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={T('add_title')} subtitle={T('add_subtitle')} onMenuPress={() => navigation.navigate('MenuModal')} />
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Security notice */}
        <View style={styles.secNotice}>
          <Text style={styles.secNoticeText}>🔒 SHA-256 + Blockchain + Audit Log</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'💊 ' + (T('add_title') || 'Drug Info')}</Text>

          <Field label={T('add_name_lbl')} error={errors.name}>
            <TextInput style={[styles.input, errors.name && styles.inputError]}
              placeholder={T('add_name_lbl')} placeholderTextColor={C.gray400}
              value={form.name} onChangeText={v => update('name', v)} />
          </Field>

          <Field label={T('add_scientific')}>
            <TextInput style={styles.input}
              placeholder={T('add_scientific')} placeholderTextColor={C.gray400}
              value={form.scientificName} onChangeText={v => update('scientificName', v)} />
          </Field>

          <Field label={T('add_batch_lbl')} error={errors.batchNumber} hint={T('add_batch_hint')}>
            <TextInput style={[styles.input, errors.batchNumber && styles.inputError]}
              placeholder="e.g. BT-2024-001" placeholderTextColor={C.gray400}
              value={form.batchNumber} onChangeText={v => update('batchNumber', v)} />
          </Field>

          <Field label={T('add_mfr_lbl')} error={errors.manufacturer}>
            <TextInput style={[styles.input, errors.manufacturer && styles.inputError]}
              placeholder={T('add_mfr_lbl')} placeholderTextColor={C.gray400}
              value={form.manufacturer} onChangeText={v => update('manufacturer', v)} />
          </Field>

          <Field label={T('add_country_lbl')}>
            <TextInput style={styles.input}
              placeholder="Jordan / الأردن" placeholderTextColor={C.gray400}
              value={form.countryOfOrigin} onChangeText={v => update('countryOfOrigin', v)} />
          </Field>

          <Field label={T('add_form_lbl')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {DRUG_FORMS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, form.drugForm === f && styles.chipActive]}
                  onPress={() => update('drugForm', f)}
                >
                  <Text style={[styles.chipText, form.drugForm === f && { color: C.white }]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Field>

          <Field label={T('add_prod_date')}>
            <TextInput style={styles.input}
              placeholder="YYYY-MM-DD" placeholderTextColor={C.gray400}
              value={form.productionDate} onChangeText={v => update('productionDate', v)} />
          </Field>

          <Field label={T('add_expiry_lbl')} error={errors.expiryDate}>
            <TextInput style={[styles.input, errors.expiryDate && styles.inputError]}
              placeholder="YYYY-MM-DD" placeholderTextColor={C.gray400}
              value={form.expiryDate} onChangeText={v => update('expiryDate', v)} />
          </Field>

          <Field label={T('add_qty_lbl')} error={errors.quantity}>
            <TextInput style={[styles.input, errors.quantity && styles.inputError]}
              placeholder="100" placeholderTextColor={C.gray400}
              keyboardType="numeric"
              value={form.quantity} onChangeText={v => update('quantity', v)} />
          </Field>

          <Field label={T('add_price_lbl')}>
            <TextInput style={styles.input}
              placeholder="0.00" placeholderTextColor={C.gray400}
              keyboardType="decimal-pad"
              value={form.pricePerUnit} onChangeText={v => update('pricePerUnit', v)} />
          </Field>

          <Field label={T('add_notes_lbl')}>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder={T('add_notes_lbl')} placeholderTextColor={C.gray400}
              multiline value={form.notes} onChangeText={v => update('notes', v)} />
          </Field>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={submit} disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={styles.submitBtnText}>➕ {T('add_btn')}</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetBtn} onPress={() => {
            setForm({ name:'',scientificName:'',batchNumber:'',manufacturer:'',countryOfOrigin:'',drugForm:'',productionDate:'',expiryDate:'',quantity:'',pricePerUnit:'',notes:'' });
            setErrors({});
          }}>
            <Text style={styles.resetBtnText}>🔄 {T('add_reset')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: C.gray700, marginBottom: 6 }}>{label}</Text>
      {children}
      {error ? <Text style={{ fontSize: 11, color: C.rose600, marginTop: 3 }}>⚠️ {error}</Text> : null}
      {hint  ? <Text style={{ fontSize: 11, color: C.gray400, marginTop: 3 }}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  noAccess: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  noAccessIcon: { fontSize: 50 },
  noAccessText: { fontSize: 16, color: C.gray600, textAlign: 'center', paddingHorizontal: 30 },

  secNotice: {
    margin: 12, backgroundColor: C.emerald50,
    borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: C.emerald200,
  },
  secNoticeText: { color: C.emerald700, fontSize: 12, textAlign: 'center', fontWeight: '600' },

  section: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 12, marginBottom: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.gray900, marginBottom: 14 },

  input: {
    borderWidth: 1.5, borderColor: C.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.gray900, backgroundColor: C.gray50,
  },
  inputError: { borderColor: C.rose500 },

  chip: {
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12,
    backgroundColor: C.gray100, marginRight: 6, marginBottom: 4,
    borderWidth: 1, borderColor: C.gray200,
  },
  chipActive: { backgroundColor: C.teal600, borderColor: C.teal600 },
  chipText:   { fontSize: 11, color: C.gray700 },

  btnRow:     { paddingHorizontal: 12, gap: 8 },
  submitBtn: {
    backgroundColor: C.teal600, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: C.teal600, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: C.gray300 },
  submitBtnText:     { color: C.white, fontSize: 15, fontWeight: '700' },
  resetBtn: {
    backgroundColor: C.white, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.gray200,
  },
  resetBtnText: { color: C.gray600, fontSize: 14, fontWeight: '600' },

  // Success screen
  successScroll: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  successCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
    alignItems: 'center',
  },
  successIcon:  { fontSize: 56, marginBottom: 12 },
  successTitle: { fontSize: 22, fontWeight: '900', color: C.teal600, marginBottom: 6, textAlign: 'center' },
  successSub:   { fontSize: 13, color: C.gray500, marginBottom: 20, textAlign: 'center' },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, alignSelf: 'stretch' },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.teal100, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum:  { fontSize: 11, fontWeight: '700', color: C.teal600 },
  stepText: { flex: 1, fontSize: 13, color: C.gray700, lineHeight: 20 },

  tokenBox: {
    backgroundColor: C.teal50, borderRadius: 12,
    padding: 14, marginTop: 12, alignSelf: 'stretch',
    borderWidth: 1, borderColor: C.teal200,
  },
  tokenLabel: { fontSize: 11, color: C.teal600, fontWeight: '700', marginBottom: 6 },
  tokenValue: { fontSize: 12, color: C.gray700, fontFamily: 'monospace' },
  copyBtn: {
    marginTop: 10, backgroundColor: C.teal600,
    borderRadius: 8, paddingVertical: 8, alignItems: 'center',
  },
  copyBtnText: { color: C.white, fontSize: 13, fontWeight: '700' },

  dashBtn: {
    marginTop: 16, backgroundColor: C.teal600,
    borderRadius: 12, paddingVertical: 13, paddingHorizontal: 32,
  },
  dashBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },
});
