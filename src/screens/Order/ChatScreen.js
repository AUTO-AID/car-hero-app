// ============================================================
//  ChatScreen — ٢٠ · المحادثة مع الفني  (القسم F)
// ============================================================

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Phone, Paperclip, PaperPlaneTilt } from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';

const INITIAL = [
  { id: 1, from: 'them', text: 'مرحباً، أنا في الطريق إليك الآن، سأصل خلال ٨ دقائق تقريباً.', time: '١٤:٣٢' },
  { id: 2, from: 'me',   text: 'تمام، السيارة بيضاء اللون قرب مدخل البناء.', time: '١٤:٣٣', read: true },
  { id: 3, from: 'them', text: 'ممتاز، وصلت تقريباً. جهّز مفاتيح السيارة لو سمحت.', time: '١٤:٣٨' },
];

export default function ChatScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState(INITIAL);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    setMessages(m => [...m, { id: Date.now(), from: 'me', text: t, time: 'الآن', read: false }]);
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* الترويسة */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={s.back} onPress={() => navigation?.goBack?.()}>
          <ArrowRight size={20} color={colors.textHeading} />
        </Pressable>
        <View style={s.avatar}><Text style={s.initials}>أ خ</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>أحمد خليل</Text>
          <View style={s.onlineRow}><View style={s.onlineDot} /><Text style={s.online}>متصل الآن</Text></View>
        </View>
        <Phone size={20} weight="fill" color={colors.primaryLight} />
      </View>

      {/* الرسائل */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={s.log} showsVerticalScrollIndicator={false}>
        <View style={s.dayWrap}><Text style={s.day}>اليوم ١٤:٣٢</Text></View>
        {messages.map((m) => (
          m.from === 'them' ? (
            <View key={m.id} style={s.themBubble}>
              <Text style={s.themText}>{m.text}</Text>
              <Text style={s.themTime}>{m.time}</Text>
            </View>
          ) : (
            <LinearGradient key={m.id} colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.meBubble}>
              <Text style={s.meText}>{m.text}</Text>
              <Text style={s.meTime}>{m.time} {m.read ? '✓✓' : '✓'}</Text>
            </LinearGradient>
          )
        ))}
      </ScrollView>

      {/* الإدخال */}
      <View style={[s.inputBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.attach}><Paperclip size={20} color={colors.primaryLight} /></View>
        <View style={s.inputWrap}>
          <TextInput
            value={text} onChangeText={setText} placeholder="اكتب رسالة…"
            placeholderTextColor={colors.textMuted2} textAlign="right" style={s.input}
            onSubmitEditing={send} returnKeyType="send"
          />
        </View>
        <Pressable onPress={send} style={({ pressed }) => [s.sendBtn, pressed && { transform: [{ scale: 0.94 }] }]}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.sendGrad}>
            <PaperPlaneTilt size={19} weight="fill" color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },

  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 14, fontWeight: '700', color: colors.primary },
  name: { fontSize: 15, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  onlineRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  online: { fontSize: 11.5, color: colors.success, fontWeight: '600' },

  log: { padding: 18, gap: 12 },
  dayWrap: { alignItems: 'center' },
  day: { fontSize: 11, color: '#a79fb3', backgroundColor: '#eee6f6', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, overflow: 'hidden' },

  themBubble: { alignSelf: 'flex-start', maxWidth: '75%', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, borderBottomLeftRadius: 5, paddingVertical: 11, paddingHorizontal: 14 },
  themText: { fontSize: 13.5, color: colors.textDark, lineHeight: 21, textAlign: 'right' },
  themTime: { fontSize: 10, color: '#a79fb3', marginTop: 4, textAlign: 'right' },
  meBubble: { alignSelf: 'flex-end', maxWidth: '75%', borderRadius: 16, borderBottomRightRadius: 5, paddingVertical: 11, paddingHorizontal: 14 },
  meText: { fontSize: 13.5, color: '#fff', lineHeight: 21, textAlign: 'right' },
  meTime: { fontSize: 10, color: '#e6d6f2', marginTop: 4, textAlign: 'left' },

  inputBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
  attach: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, height: 46, borderRadius: 14, backgroundColor: '#faf8fd', borderWidth: 1, borderColor: '#ece6f3', justifyContent: 'center', paddingHorizontal: 15 },
  input: { fontSize: 13.5, color: '#2a2333', padding: 0 },
  sendBtn: { width: 46, height: 46 },
  sendGrad: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
