import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLang }  from '../context/LanguageContext';
import { addDrug, getErrorMessage } from '../services/api';
import { COLORS }   from '../utils/constants';

const Field = ({ label, value, onChangeText, placeholder, keyboardType = 'default', isRTL }) => (
  <View style={styles.fieldGroup}>
    <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
    <TextInput
      style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      keyboardType={keyboardType}
      autoCapitalize="none"
    />
  </View>
);

export default function AddDrugScreen({ navigation }) {
  const { t, isRTL } = useLang();

  const [form, setForm] = useState({
    name: '', batchNumber: '', expiryDate: '',
    manufacturer: '', quantity: '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async () => {
    const { name, batchNumber, expiryDate, manufacturer, quantity } = form;
    if (!name || !batchNumber || !expiryDate || !manufacturer || !quantity) {
      setError('Please fill all fields');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) { setError('Quantity must be a positive number'); return; }

    setLoading(true);
    setError('');
    try {
      await addDrug({ name, batchNumber, expiryDate, manufacturer, quantity: qty });
      Alert.alert(t('success'), t('addDrugSuccess'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(getErrorMessage(err) || t('addDrugError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Icon header */}
        <View style={styles.iconHeader}>
          <Ionicons name="add-circle" size={48} color={COLORS.primary} />
          <Text style={styles.screenTitle}>{t('addDrugTitle')}</Text>
        </View>

        <View style={styles.card}>
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          )}

          <Field label={t('drugName')}    value={form.name}         onChangeText={set('name')}         placeholder="e.g. Paracetamol 500mg"   isRTL={isRTL} />
          <Field label={t('batchNumber')} value={form.batchNumber}  onChangeText={set('batchNumber')}  placeholder="e.g. BATCH-2024-001"       isRTL={isRTL} />
          <Field label={`${t('expiryDate')} (${t('expiryFormat')})`}
                               value={form.expiryDate}  onChangeText={set('expiryDate')}  placeholder="2027-12-31"               isRTL={isRTL} />
          <Field label={t('manufacturer')} value={form.manufacturer} onChangeText={set('manufacturer')} placeholder="e.g. Pfizer"              isRTL={isRTL} />
          <Field label={t('quantity')}    value={form.quantity}     onChangeText={set('quantity')}     placeholder="e.g. 500"    keyboardType="numeric" isRTL={isRTL} />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.info} />
            <Text style={styles.infoTxt}>
              {isRTL
                ? 'سيتم توليد رمز تحقق AI تلقائياً عند الإضافة'
                : 'An AI verification token will be generated automatically'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.submitTxt}>{t('addDrugBtn')}</Text>
                </View>
              )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.background },
  scroll:      { padding: 16, paddingBottom: 40 },
  iconHeader:  { alignItems: 'center', paddingVertical: 20, gap: 8 },
  screenTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
  },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.errorBg, borderRadius: 8, padding: 10, marginBottom: 12 },
  errorTxt: { color: COLORS.error, fontSize: 13, flex: 1 },
  fieldGroup:  { marginBottom: 16 },
  label:       { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.text,
  },
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.infoBg, borderRadius: 8, padding: 10, marginBottom: 16,
  },
  infoTxt:  { color: COLORS.info, fontSize: 12, flex: 1 },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12, height: 52,
    justifyContent: 'center', alignItems: 'center',
  },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
