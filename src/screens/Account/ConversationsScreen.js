// ============================================================
//  ConversationsScreen — ٤٢ · قائمة المحادثات  (القسم K)
// ============================================================

import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, MagnifyingGlass, Headset } from 'phosphor-react-native';
import { colors, shadow, gradients } from '../../theme/theme';

const CHATS = [
  { initials: 'أ خ', name: 'أحمد خليل', time: '١٤:٣٨', preview: 'وصلت تقريباً، جهّز مفاتيح السيارة…', unread: 2, online: true },
  { initials: 'ر ع', name: 'رامي عيسى', time: 'أمس', preview: 'شكراً لك، تم إنجاز الخدمة بنجاح ✓', unread: 0, online: false },
  { name: 'دعم Car Hero', time: '٢ تموز', preview: 'كيف يمكننا مساعدتك اليوم؟', unread: 0, support: true },
];

export default function ConversationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <Text style={s.title}>المحادثات</Text>
        </View>

        <View style={s.search}>
          <MagnifyingGlass size={18} color={colors.primaryLight} />
          <TextInput value={q} onChangeText={setQ} placeholder="ابحث في المحادثات" placeholderTextColor={colors.textMuted2} textAlign="right" style={s.searchInput} />
        </View>

        {CHATS.filter(c => c.name.includes(q)).map((c, i) => (
          <Pressable key={i} style={s.chat} onPress={() => navigation?.navigate?.('Chat')}>
            {c.support ? (
              <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar}>
                <Headset size={24} weight="fill" color="#fff" />
              </LinearGradient>
            ) : (
              <View style={{ position: 'relative' }}>
                <View style={s.avatarLight}><Text style={s.initials}>{c.initials}</Text></View>
                {c.online && <View style={s.onlineDot} />}
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={s.name}>{c.name}</Text>
                <Text style={s.time}>{c.time}</Text>
              </View>
              <Text style={[s.preview, c.unread > 0 && { color: '#6b6577' }]} numberOfLines={1}>{c.preview}</Text>
            </View>
            {c.unread > 0 && <View style={s.unreadBadge}><Text style={s.unreadText}>{c.unread}</Text></View>}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 16 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  search: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 15, marginBottom: 16 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 13.5, color: '#2a2333', padding: 0, textAlign: 'right' },

  chat: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eadcf6', borderRadius: 16, padding: 13, marginBottom: 10, ...shadow.soft, shadowOpacity: 0.10 },
  avatar: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarLight: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '700', color: colors.primary },
  onlineDot: { position: 'absolute', bottom: -2, left: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.success, borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 14.5, fontWeight: '700', color: colors.textDark },
  time: { fontSize: 11, color: colors.textMuted },
  preview: { fontSize: 12.5, color: colors.textMuted, marginTop: 3, textAlign: 'right' },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
