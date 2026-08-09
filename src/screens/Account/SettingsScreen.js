// ============================================================
//  SettingsScreen — ٤٥ · الإعدادات  (القسم K)
// ============================================================

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight, Translate, CreditCard, Moon, Headset, FileText, SignOut, CaretLeft, UserCircleGear,
} from 'phosphor-react-native';
import { colors, shadow } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

function Toggle({ value, onChange }) {
  return (
    <Pressable onPress={() => onChange?.(!value)} style={[s.track, value ? s.on : s.off]}>
      <View style={[s.knob, value ? s.knobOn : s.knobOff]} />
    </Pressable>
  );
}

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const toast = useToast();
  const [orderNotif, setOrderNotif] = useState(true);
  const [offerNotif, setOfferNotif] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد فعلاً تسجيل الخروج من حسابك؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            toast.success('تم تسجيل الخروج بنجاح');
          } catch {
            toast.error('تعذّر تسجيل الخروج، حاول مجدداً');
          }
        },
      },
    ]);
  };

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <Text style={s.headTitle}>الإعدادات</Text>
        </View>

        <Text style={s.sectionLabel}>الإشعارات</Text>
        <View style={s.card}>
          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>إشعارات الطلبات</Text>
            <Toggle value={orderNotif} onChange={setOrderNotif} />
          </View>
          <View style={[s.toggleRow, s.rowBorder]}>
            <Text style={s.toggleLabel}>إشعارات العروض</Text>
            <Toggle value={offerNotif} onChange={setOfferNotif} />
          </View>
        </View>

        <Text style={s.sectionLabel}>عام</Text>
        <View style={s.card}>
          <Pressable style={[s.linkRow, s.rowBorder]}>
            <View style={s.icon}><Translate size={19} weight="fill" color={colors.primaryLight} /></View>
            <Text style={s.linkLabel}>اللغة</Text>
            <Text style={s.linkValue}>العربية</Text>
            <CaretLeft size={16} color="#c3bace" />
          </Pressable>
          <Pressable onPress={() => navigation?.navigate?.('PaymentMethods')} style={[s.linkRow, s.rowBorder]}>
            <View style={s.icon}><CreditCard size={19} weight="fill" color={colors.primaryLight} /></View>
            <Text style={s.linkLabel}>طرق الدفع</Text>
            <CaretLeft size={16} color="#c3bace" />
          </Pressable>
          <View style={s.linkRow}>
            <View style={s.icon}><Moon size={19} weight="fill" color={colors.primaryLight} /></View>
            <Text style={s.linkLabel}>الوضع الليلي</Text>
            <Toggle value={darkMode} onChange={setDarkMode} />
          </View>
        </View>

        <Text style={s.sectionLabel}>المزيد</Text>
        <View style={s.card}>
          <Pressable style={[s.linkRow, s.rowBorder]}>
            <View style={s.icon}><Headset size={19} weight="fill" color={colors.primaryLight} /></View>
            <Text style={s.linkLabel}>مركز المساعدة</Text>
            <CaretLeft size={16} color="#c3bace" />
          </Pressable>
          <Pressable style={[s.linkRow, s.rowBorder]}>
            <View style={s.icon}><FileText size={19} weight="fill" color={colors.primaryLight} /></View>
            <Text style={s.linkLabel}>الشروط والأحكام</Text>
            <CaretLeft size={16} color="#c3bace" />
          </Pressable>
          <Pressable onPress={() => navigation?.navigate?.('RestoreAccount')} style={[s.linkRow, s.rowBorder]}>
            <View style={s.icon}><UserCircleGear size={19} weight="fill" color={colors.primaryLight} /></View>
            <Text style={s.linkLabel}>استعادة / إلغاء تنشيط الحساب</Text>
            <CaretLeft size={16} color="#c3bace" />
          </Pressable>
          <Pressable style={s.linkRow} onPress={handleLogout}>
            <View style={[s.icon, { backgroundColor: colors.dangerBg }]}><SignOut size={19} weight="fill" color={colors.danger} /></View>
            <Text style={[s.linkLabel, { color: colors.danger }]}>تسجيل الخروج</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 22 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14 },
  headTitle: { fontSize: 19, fontWeight: '700', color: colors.textDark },

  sectionLabel: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted, marginBottom: 10, textAlign: 'right' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  toggleRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f4eff9' },
  toggleLabel: { fontSize: 13.5, fontWeight: '600', color: '#4a4358' },

  linkRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 13, padding: 15 },
  icon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textDark, textAlign: 'right' },
  linkValue: { fontSize: 13, color: colors.textMuted },

  track: { width: 44, height: 26, borderRadius: 999, justifyContent: 'center' },
  on: { backgroundColor: colors.primaryLight }, off: { backgroundColor: '#e2d7ef' },
  knob: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  knobOn: { left: 3 }, knobOff: { right: 3 },
});
