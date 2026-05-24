import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar, Alert, ActivityIndicator
} from 'react-native';
import { C } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { t } from '../utils/i18n';
import { addInventoryItem } from '../utils/api';

const CATEGORIES = ['Antibiotic','Painkiller','Supplement','Vitamin','Antifungal','Analgesic','Other'];

const CAT_COLORS = {
  Antibiotic: C.cyan500,  Painkiller: C.rose500,
  Supplement: C.emerald500, Vitamin: C.amber500,
  Antifungal: C.purple500,  Analgesic: '#6366f1', Other: C.gray500,
};

function Field({ label, required, error, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}{required && <Text style={styles.req}> *</Text>}
      </Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function Input({ value, onChangeText, placeholder, keyboardType, multiline, ...props }) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.inputMulti]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.gray400}
      keyboardType={keyboardType || 'default'}
      multiline={multiline}
      {...props}
    />
  );
}

export default function AddInventoryItemScreen({ navigation }) {
  const { role } = useAuth();
  const { lang } = useLang();

  const [form, setForm] = useState({
    name: '', description: '', category: '', batchNumber: '',
    expiryDate: '', purchasePrice: '', sellingPrice: '',
    initialStock: '', lowStockThreshold: '10', qrCode: '',
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (role !== 'Admin') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.noAccess}>
          <Text style={styles.noAccessIcon}>🚫</Text>
          <Text style={styles.noAccessText}>{t('inv_no_access', lang)}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>{t('btn_cancel', lang)}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim())         e.name         = t('add_inv_name_err', lang);
    if (!form.expiryDate.trim())   e.expiryDate   = t('add_inv_expiry_err', lang);
    if (!form.sellingPrice.trim()) e.sellingPrice = t('add_inv_selling_err', lang);
    if (form.expiryDate.trim()) {
      const d = new Date(form.expiryDate);
      if (isNaN(d.getTime()) || d <= new Date()) e.expiryDate = t('add_expiry_err', lang);
    }
    if (Number(form.sellingPrice) <= 0) e.sellingPrice = t('add_inv_selling_err', lang);
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      const body = {
        name:              form.name.trim(),
        description:       form.description.trim(),
        category:          form.category,
        batchNumber:       form.batchNumber.trim(),
        expiryDate:        new Date(form.expiryDate).toISOString(),
        purchasePrice:     parseFloat(form.purchasePrice) || 0,
        sellingPrice:      parseFloat(form.sellingPrice),
        initialStock:      parseInt(form.initialStock) || 0,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 10,
        qrCode:            form.qrCode.trim() || null,
      };
      const res = await addInventoryItem(body);
      if (res.ok) {
        setSuccess(true);
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to add item');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm({ name:'',description:'',category:'',batchNumber:'',expiryDate:'',
              purchasePrice:'',sellingPrice:'',initialStock:'',lowStockThreshold:'10',qrCode:'' });
    setErrors({});
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successBox}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>{t('add_inv_success', lang)}</Text>
          <TouchableOpacity style={styles.successBtn}
            onPress={() => { setSuccess(false); reset(); navigation.navigate('Inventory'); }}>
            <Text style={styles.successBtnText}>{t('inv_title', lang)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.successBtn, styles.successBtnSecondary]}
            onPress={() => { setSuccess(false); reset(); }}>
            <Text style={[styles.successBtnText, { color: C.teal600 }]}>{t('add_inv_btn', lang)}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={C.teal700} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnHeader}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t('add_inv_title', lang)}</Text>
          <Text style={styles.headerSub}>{t('add_inv_subtitle', lang)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Section: Product Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 {t('add_inv_info_section', lang)}</Text>

          <Field label={t('add_inv_name', lang)} required error={errors.name}>
            <Input value={form.name} onChangeText={v => set('name', v)}
              placeholder={t('add_inv_name', lang)} />
          </Field>

          <Field label={t('add_inv_desc', lang)}>
            <Input value={form.description} onChangeText={v => set('description', v)}
              placeholder={t('add_inv_desc', lang)} multiline />
          </Field>

          <Field label={t('add_inv_cat', lang)}>
            <View style={styles.chips}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip,
                    form.category === cat && { backgroundColor: CAT_COLORS[cat] || C.teal600, borderColor: 'transparent' }
                  ]}
                  onPress={() => set('category', form.category === cat ? '' : cat)}
                >
                  <Text style={[styles.chipText, form.category === cat && { color: C.white }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>
        </View>

        {/* Section: Batch & Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 {t('add_inv_batch_section', lang)}</Text>

          <Field label={t('add_inv_batch', lang)}>
            <Input value={form.batchNumber} onChangeText={v => set('batchNumber', v)}
              placeholder="e.g. BATCH-2024-001" />
          </Field>

          <Field label={t('add_inv_expiry', lang)} required error={errors.expiryDate}>
            <Input value={form.expiryDate} onChangeText={v => set('expiryDate', v)}
              placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
          </Field>
        </View>

        {/* Section: Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 {t('add_inv_price_section', lang)}</Text>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label={t('add_inv_purchase_price', lang)}>
                <Input value={form.purchasePrice} onChangeText={v => set('purchasePrice', v)}
                  placeholder="0.00" keyboardType="decimal-pad" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('add_inv_selling_price', lang)} required error={errors.sellingPrice}>
                <Input value={form.sellingPrice} onChangeText={v => set('sellingPrice', v)}
                  placeholder="0.00" keyboardType="decimal-pad" />
              </Field>
            </View>
          </View>
        </View>

        {/* Section: Stock */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 {t('add_inv_stock_section', lang)}</Text>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label={t('add_inv_initial_stock', lang)}>
                <Input value={form.initialStock} onChangeText={v => set('initialStock', v)}
                  placeholder="0" keyboardType="number-pad" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('add_inv_low_threshold', lang)}>
                <Input value={form.lowStockThreshold} onChangeText={v => set('lowStockThreshold', v)}
                  placeholder="10" keyboardType="number-pad" />
              </Field>
            </View>
          </View>
        </View>

        {/* Section: Optional */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔗 {t('add_inv_optional_section', lang)}</Text>
          <Field label={t('add_inv_qr', lang)}>
            <Input value={form.qrCode} onChangeText={v => set('qrCode', v)}
              placeholder={t('add_inv_qr', lang)} />
          </Field>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={C.white} />
            : <Text style={styles.submitBtnText}>{t('add_inv_btn', lang)}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBtn} onPress={reset}>
          <Text style={styles.resetBtnText}>{t('add_reset', lang)}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },

  header: { backgroundColor: C.teal700, flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 16, paddingVertical: 14, paddingTop: 18 },
  backBtnHeader:{ marginRight: 12 },
  backArrow:{ color: C.teal200, fontSize: 22, fontWeight: '700' },
  headerTitle:{ color: C.white, fontSize: 17, fontWeight: '800' },
  headerSub:{ color: C.teal300, fontSize: 11, marginTop: 1 },

  scroll: { padding: 16 },

  section:      { backgroundColor: C.white, borderRadius: 12, padding: 16, marginBottom: 12,
                  shadowColor:'#000', shadowOpacity:0.04, shadowRadius:4, elevation:1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.teal700, marginBottom: 12 },

  field:      { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.gray600, marginBottom: 5 },
  req:        { color: C.rose500 },
  fieldError: { fontSize: 11, color: C.rose500, marginTop: 3 },

  input:      { backgroundColor: C.gray50, borderRadius: 8, paddingHorizontal: 12,
                paddingVertical: 10, fontSize: 14, color: C.gray800,
                borderWidth: 1, borderColor: C.gray200 },
  inputMulti: { height: 72, textAlignVertical: 'top' },

  chips:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
            borderWidth: 1, borderColor: C.gray300, backgroundColor: C.white },
  chipText:{ fontSize: 12, color: C.gray600 },

  row2: { flexDirection: 'row', gap: 10 },

  submitBtn:{ backgroundColor: C.teal600, borderRadius: 12, paddingVertical: 14,
              alignItems: 'center', marginBottom: 10 },
  submitBtnDisabled:{ backgroundColor: C.gray300 },
  submitBtnText:{ color: C.white, fontSize: 15, fontWeight: '700' },

  resetBtn:{ backgroundColor: C.white, borderRadius: 12, paddingVertical: 12,
             alignItems: 'center', borderWidth: 1, borderColor: C.gray200 },
  resetBtnText:{ color: C.gray600, fontSize: 14 },

  noAccess:     { flex:1, alignItems:'center', justifyContent:'center' },
  noAccessIcon: { fontSize: 48, marginBottom: 12 },
  noAccessText: { fontSize: 16, color: C.gray600, marginBottom: 20 },
  backBtn:      { backgroundColor: C.teal600, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  backBtnText:  { color: C.white, fontWeight: '700' },

  successBox:   { flex:1, alignItems:'center', justifyContent:'center', padding: 32 },
  successIcon:  { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '800', color: C.teal700, marginBottom: 24 },
  successBtn:   { backgroundColor: C.teal600, paddingHorizontal: 32, paddingVertical: 12,
                  borderRadius: 10, marginBottom: 10, width: '100%', alignItems:'center' },
  successBtnSecondary:{ backgroundColor: C.teal50, borderWidth: 1, borderColor: C.teal300 },
  successBtnText:{ color: C.white, fontWeight: '700', fontSize: 15 },
});
