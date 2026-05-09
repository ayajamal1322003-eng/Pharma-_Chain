import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { useLang } from '../context/LangContext';
import { t }       from '../utils/i18n';
import { sendChat, verifyDrug } from '../utils/api';
import Header from '../components/Header';

const SUGGESTED = ['هل دوائي أصلي?', 'ما هي الجرعة الصحيحة?', 'ما هي الآثار الجانبية?'];

export default function PatientChatScreen({ navigation }) {
  const { lang } = useLang();
  const T = (k) => t(k, lang);

  const flatRef = useRef(null);
  const [messages, setMessages] = useState([
    { id: '0', role: 'bot', text: T('pc_welcome'), time: new Date() },
  ]);
  const [input,    setInput]    = useState('');
  const [drugId,   setDrugId]   = useState('');
  const [drugInfo, setDrugInfo] = useState(null);
  const [sending,  setSending]  = useState(false);
  const [lookingUp,setLookingUp]= useState(false);

  function addMsg(role, text) {
    const msg = { id: String(Date.now()), role, text, time: new Date() };
    setMessages(prev => [...prev, msg]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    return msg;
  }

  async function lookupDrug() {
    if (!drugId.trim()) return;
    setLookingUp(true);
    const { ok, data } = await verifyDrug(drugId.trim());
    if (ok && data.name) {
      setDrugInfo(data);
      addMsg('bot', `✅ ${lang === 'ar' ? 'تم العثور على الدواء' : 'Drug found'}: ${data.name} (${data.manufacturer}). ${lang === 'ar' ? 'الحالة' : 'Status'}: ${data.status}`);
    } else {
      addMsg('bot', `⚠️ ${lang === 'ar' ? 'لم يتم العثور على الدواء — تأكد من الرقم' : 'Drug not found — check the ID'}`);
    }
    setLookingUp(false);
  }

  async function sendMessage(text) {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');
    addMsg('user', msg);
    setSending(true);
    try {
      const { ok, data } = await sendChat(msg, drugInfo?.id);
      addMsg('bot', ok ? (data.reply || data.message || 'OK') : `⚠️ ${T('login_err_server')}`);
    } catch {
      addMsg('bot', `⚠️ ${T('login_err_server')}`);
    } finally {
      setSending(false);
    }
  }

  function renderMsg({ item }) {
    const isBot = item.role === 'bot';
    return (
      <View style={[styles.msgRow, isBot ? styles.msgRowBot : styles.msgRowUser]}>
        {isBot && <View style={styles.botAvatar}><Text style={{ fontSize: 14 }}>🤖</Text></View>}
        <View style={[styles.bubble, isBot ? styles.bubbleBot : styles.bubbleUser]}>
          <Text style={[styles.bubbleText, isBot ? styles.bubbleTextBot : styles.bubbleTextUser]}>
            {item.text}
          </Text>
          <Text style={styles.msgTime}>
            {item.time.getHours()}:{String(item.time.getMinutes()).padStart(2, '0')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={T('pc_title')} subtitle={T('pc_sub')} onMenuPress={() => navigation.navigate('MenuModal')} />

      {/* Bot status */}
      <View style={styles.botStatus}>
        <View style={styles.botStatusDot} />
        <Text style={styles.botStatusText}>🤖 {T('pc_bot_name')} · {T('pc_bot_status')}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {/* Drug lookup */}
        <View style={styles.lookupBar}>
          <TextInput
            style={styles.lookupInput}
            placeholder={T('pc_lookup_ph')}
            placeholderTextColor={C.gray400}
            value={drugId} onChangeText={setDrugId}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[styles.lookupBtn, lookingUp && styles.lookupBtnDisabled]}
            onPress={lookupDrug} disabled={lookingUp}
          >
            {lookingUp
              ? <ActivityIndicator color={C.white} size="small" />
              : <Text style={styles.lookupBtnText}>{T('pc_lookup_btn')}</Text>
            }
          </TouchableOpacity>
        </View>

        {drugInfo && (
          <View style={styles.drugInfoBadge}>
            <Text style={styles.drugInfoBadgeText}>
              💊 {drugInfo.name} · {drugInfo.status}
            </Text>
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatRef}
          data={messages}
          renderItem={renderMsg}
          keyExtractor={m => m.id}
          style={styles.messagesList}
          contentContainerStyle={{ padding: 12 }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Sending indicator */}
        {sending && (
          <View style={styles.typingBox}>
            <ActivityIndicator color={C.teal500} size="small" />
            <Text style={styles.typingText}>
              {lang === 'ar' ? 'المساعد يكتب...' : 'Assistant is typing...'}
            </Text>
          </View>
        )}

        {/* Suggested questions */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsRow}>
          {SUGGESTED.map((s, i) => (
            <TouchableOpacity key={i} style={styles.suggestChip} onPress={() => sendMessage(s)}>
              <Text style={styles.suggestText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder={T('pc_msg_ph')}
            placeholderTextColor={C.gray400}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()} disabled={!input.trim() || sending}
          >
            <Text style={styles.sendBtnIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  botStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.teal50, paddingVertical: 8, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.teal200,
  },
  botStatusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.emerald500 },
  botStatusText: { fontSize: 12, color: C.teal700, fontWeight: '600' },

  lookupBar: {
    flexDirection: 'row', gap: 8, padding: 10,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.gray200,
  },
  lookupInput: {
    flex: 1, borderWidth: 1.5, borderColor: C.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: C.gray900,
    backgroundColor: C.gray50,
  },
  lookupBtn: {
    backgroundColor: C.teal600, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center',
  },
  lookupBtnDisabled: { backgroundColor: C.gray300 },
  lookupBtnText:     { color: C.white, fontSize: 13, fontWeight: '700' },

  drugInfoBadge: {
    backgroundColor: C.teal50, paddingVertical: 6, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.teal100,
  },
  drugInfoBadgeText: { fontSize: 12, color: C.teal700, fontWeight: '600' },

  messagesList: { flex: 1 },

  msgRow:     { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  msgRowBot:  { justifyContent: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },
  botAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.teal100, alignItems: 'center', justifyContent: 'center',
    marginRight: 6, flexShrink: 0,
  },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 12 },
  bubbleBot:  { backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: C.teal600, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextBot:  { color: C.gray800 },
  bubbleTextUser: { color: C.white },
  msgTime: { fontSize: 10, color: C.gray400, marginTop: 4, textAlign: 'right' },

  typingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  typingText: { fontSize: 12, color: C.gray500 },

  suggestionsRow: { paddingHorizontal: 12, paddingVertical: 6 },
  suggestChip: {
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12,
    backgroundColor: C.teal50, marginRight: 6,
    borderWidth: 1, borderColor: C.teal200,
  },
  suggestText: { fontSize: 12, color: C.teal700 },

  inputBar: {
    flexDirection: 'row', gap: 8, padding: 10,
    backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.gray200,
    alignItems: 'flex-end',
  },
  chatInput: {
    flex: 1, borderWidth: 1.5, borderColor: C.gray200, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: C.gray900, backgroundColor: C.gray50,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.teal600, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: C.gray300 },
  sendBtnIcon: { color: C.white, fontSize: 16 },
});
