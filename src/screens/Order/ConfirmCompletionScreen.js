// ============================================================
//  ConfirmCompletionScreen — ٢١ · تأكيد إتمام الخدمة  (القسم F)
// ============================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, SealCheck, CarBattery, CheckCircle } from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';

export default function ConfirmCompletionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <Pressable style={s.back} onPress={() => navigation?.goBack?.()}>
        <ArrowRight size={20} color={colors.primary} />
      </Pressable>

      <View style={s.badge}><SealCheck size={50} weight="fill" color={colors.primary} /></View>
      <Text style={s.title}>هل تم إنجاز الخدمة؟</Text>
      <Text style={s.sub}>أبلغ الفني أنه أنهى الخدمة. يرجى تأكيد الإتمام لإنهاء الطلب.</Text>

      {/* بطاقة الطلب */}
      <View style={s.card}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <View style={s.cardIcon}><CarBattery size={24} weight="fill" color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>شحن بطارية</Text>
            <Text style={s.cardSub}>الفني: أحمد خليل</Text>
          </View>
        </View>
        <View style={s.row}>
          <Text style={s.rowLabel}>رقم الطلب</Text>
          <Text style={s.rowVal}>#CH-24815</Text>
        </View>
        <View style={[s.row, { marginTop: 8 }]}>
          <Text style={s.totalLabel}>الإجمالي</Text>
          <Text style={s.totalVal}>٥٠٠٠٠ ل.س</Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <Pressable onPress={() => navigation?.replace?.('Review')} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
          <CheckCircle size={18} weight="fill" color="#fff" />
          <Text style={s.ctaText}>تأكيد إتمام الخدمة</Text>
        </LinearGradient>
      </Pressable>
      <Pressable
        onPress={() =>
          Alert.alert('الإبلاغ عن مشكلة', 'تم استلام بلاغك، وسيتواصل معك فريق الدعم في أقرب وقت.')
        }
        style={({ pressed }) => [s.report, pressed && { transform: [{ scale: 0.97 }] }]}
      >
        <Text style={s.reportText}>الإبلاغ عن مشكلة</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 26 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  badge: { width: 96, height: 96, borderRadius: 28, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 26 },
  title: { marginTop: 22, fontSize: 22, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  sub: { marginTop: 11, fontSize: 14, color: colors.textBody, lineHeight: 24, textAlign: 'center' },

  card: { marginTop: 24, backgroundColor: '#faf8fd', borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16 },
  cardIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'right' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 13.5, color: colors.textBody },
  rowVal: { fontSize: 13.5, fontWeight: '600', color: colors.textDark, writingDirection: 'ltr' },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  totalVal: { fontSize: 15, fontWeight: '700', color: colors.primary },

  cta: { height: 56, borderRadius: radius.lg, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  report: { marginTop: 12, height: 50, borderRadius: radius.lg, borderWidth: 1.5, borderColor: '#f0d4d7', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  reportText: { color: colors.danger, fontSize: 14.5, fontWeight: '700' },
});
