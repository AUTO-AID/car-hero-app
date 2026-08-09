// ============================================================
//  EditProfileScreen — ٣٥ · تعديل الملف الشخصي  (القسم J)
// ============================================================

import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, User, Envelope, Phone, LockSimple, Camera } from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';

function Toggle({ value, onChange }) {
  return (
    <Pressable onPress={() => onChange?.(!value)} style={[tg.track, value ? tg.on : tg.off]}>
      <View style={[tg.knob, value ? tg.knobOn : tg.knobOff]} />
    </Pressable>
  );
}
const tg = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: 999, justifyContent: 'center' },
  on: { backgroundColor: colors.primaryLight }, off: { backgroundColor: '#e2d7ef' },
  knob: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  knobOn: { left: 3 }, knobOff: { right: 3 },
});

export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('محمد العلي');
  const [email, setEmail] = useState('');
  const [orderNotif, setOrderNotif] = useState(true);
  const [offerNotif, setOfferNotif] = useState(false);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 110 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <Text style={s.headTitle}>تعديل الملف</Text>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <View>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar}>
              <Text style={s.avatarText}>م</Text>
            </LinearGradient>
            <View style={s.camBadge}><Camera size={16} weight="fill" color={colors.primaryLight} /></View>
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <View>
            <Text style={s.label}>الاسم الكامل</Text>
            <View style={s.field}>
              <User size={19} color={colors.primaryLight} />
              <TextInput value={name} onChangeText={setName} placeholder="الاسم الكامل" placeholderTextColor={colors.textMuted2} textAlign="right" style={s.input} />
            </View>
          </View>

          <View>
            <Text style={s.label}>رقم الهاتف</Text>
            <View style={[s.field, s.fieldLocked]}>
              <Phone size={19} color="#a79fb3" />
              <Text style={s.lockedText}>+963 991 234 567</Text>
              <LockSimple size={15} weight="fill" color="#a79fb3" />
            </View>
          </View>

          <View>
            <Text style={s.label}>البريد الإلكتروني (اختياري)</Text>
            <View style={s.field}>
              <Envelope size={19} color={colors.primaryLight} />
              <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="example@mail.com" placeholderTextColor={colors.textMuted2} textAlign="left" style={[s.input, { textAlign: 'left', writingDirection: 'ltr' }]} />
            </View>
          </View>

          <View style={s.togglesCard}>
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>إشعارات الطلبات</Text>
              <Toggle value={orderNotif} onChange={setOrderNotif} />
            </View>
            <View style={[s.toggleRow, { borderTopWidth: 1, borderTopColor: '#f4eff9' }]}>
              <Text style={s.toggleLabel}>إشعارات العروض</Text>
              <Toggle value={offerNotif} onChange={setOfferNotif} />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[s.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable onPress={() => navigation?.goBack?.()} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
            <Text style={s.ctaText}>حفظ التغييرات</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 22 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14 },
  headTitle: { fontSize: 19, fontWeight: '700', color: colors.textDark },

  avatar: { width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  camBadge: { position: 'absolute', bottom: -4, left: -4, width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  label: { fontSize: 13.5, fontWeight: '600', color: '#4a4358', marginBottom: 8, textAlign: 'right' },
  field: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, height: 54, paddingHorizontal: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ece6f3', borderRadius: 15 },
  fieldLocked: { backgroundColor: '#f3eff8' },
  lockedText: { flex: 1, fontSize: 14.5, color: '#a79fb3', writingDirection: 'ltr', textAlign: 'right' },
  input: { flex: 1, minWidth: 0, fontSize: 14.5, color: '#2a2333', padding: 0, textAlign: 'right' },

  togglesCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 4 },
  toggleRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  toggleLabel: { fontSize: 13.5, fontWeight: '600', color: '#4a4358' },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, backgroundColor: 'transparent' },
  cta: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
