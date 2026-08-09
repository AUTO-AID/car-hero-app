// ============================================================
//  OrderDetailScreen — ٢٤ · تفاصيل الطلب ومساره  (القسم G)
// ============================================================

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight, CarBattery, Star, CaretLeft, Check, Wallet,
  CheckCircle, ArrowClockwise, DownloadSimple, WarningCircle,
} from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';

const TIMELINE = [
  { title: 'تم إنشاء الطلب', time: '١٤:٣٠' },
  { title: 'قبل الفني الطلب', time: '١٤:٣٢ · أحمد خليل' },
  { title: 'وصل الفني وبدأ العمل', time: '١٤:٤١' },
  { title: 'اكتملت الخدمة', time: '١٥:٠٢', last: true },
];

export default function OrderDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const ref = route?.params?.ref || '#CH-24815';

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }}>
        {/* الترويسة */}
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <View>
            <Text style={s.headTitle}>تفاصيل الطلب</Text>
            <Text style={s.headRef}>{ref}</Text>
          </View>
        </View>

        {/* بطاقة الخدمة */}
        <View style={[s.card, { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }]}>
          <View style={s.svcIcon}><CarBattery size={24} weight="fill" color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.svcTitle}>شحن بطارية</Text>
            <Text style={s.svcSub}>هوا سيراتو ٢٠٢٠ · دمشق، المزة</Text>
          </View>
          <View style={s.doneBadge}><Text style={s.doneBadgeText}>مكتمل</Text></View>
        </View>

        {/* بطاقة الفني */}
        <Pressable
          style={({ pressed }) => [s.card, s.provCard, pressed && { transform: [{ scale: 0.98 }] }]}
          onPress={() => Alert.alert('ملف الفني', 'الملف الكامل للفني سيتوفّر قريباً.')}
        >
          <View style={s.provAvatar}><Text style={s.provInitials}>أ خ</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.provName}>أحمد خليل</Text>
            <View style={s.ratingRow}>
              <Star size={12} weight="fill" color={colors.star} />
              <Text style={s.ratingText}>4.9 · فني بطاريات وكهرباء</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <Text style={s.provLink}>عرض الفني</Text>
            <CaretLeft size={15} color="#b7a8ca" />
          </View>
        </Pressable>

        {/* مسار الطلب */}
        <Text style={s.sectionTitle}>مسار الطلب</Text>
        <View style={s.card}>
          {TIMELINE.map((step, i) => (
            <View key={i} style={{ flexDirection: 'row-reverse', gap: 12, marginBottom: step.last ? 0 : 14 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={s.tlDot}><Check size={12} weight="bold" color="#fff" /></View>
                {!step.last && <View style={s.tlLine} />}
              </View>
              <View style={{ paddingBottom: step.last ? 0 : 6 }}>
                <Text style={s.tlTitle}>{step.title}</Text>
                <Text style={s.tlTime}>{step.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* السعر */}
        <View style={s.card}>
          <Row label="سعر الخدمة" val="٤٠٠٠٠ ل.س" />
          <Row label="رسوم الوصول" val="١٠٠٠٠ ل.س" />
          <Row label="خصم نقاط الوفاء" val="− ٥٠٠ ل.س" green />
          <View style={s.priceDivider} />
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>المدفوع</Text>
            <Text style={s.totalVal}>٤٩٥٠٠ ل.س</Text>
          </View>
          <View style={s.payRow}>
            <View style={s.payIcon}><Wallet size={17} weight="fill" color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.payLabel}>طريقة الدفع</Text>
              <Text style={s.payVal}>محفظة Car Hero</Text>
            </View>
            <CheckCircle size={18} weight="fill" color={colors.success} />
          </View>
        </View>

        {/* الأزرار */}
        <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 16 }}>
          <Pressable onPress={() => navigation?.navigate?.('Services')} style={({ pressed }) => [{ flex: 1 }, pressed && { transform: [{ scale: 0.97 }] }]}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.reorder, shadow.button]}>
              <ArrowClockwise size={17} weight="fill" color="#fff" />
              <Text style={s.reorderText}>اطلب مرة أخرى</Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={({ pressed }) => [s.iconBtn, pressed && { transform: [{ scale: 0.95 }] }]}>
            <DownloadSimple size={19} color={colors.primary} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => Alert.alert('الإبلاغ عن مشكلة', 'تم استلام بلاغك، وسيتواصل معك فريق الدعم قريباً.')}
          style={({ pressed }) => [s.report, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <WarningCircle size={17} color={colors.danger} />
          <Text style={s.reportText}>الإبلاغ عن مشكلة</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Row({ label, val, green }) {
  return (
    <View style={s.priceRow}>
      <Text style={[s.priceLabel, green && { color: colors.success }]}>{label}</Text>
      <Text style={[s.priceVal, green && { color: colors.success }]}>{val}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 20 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14 },
  headTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  headRef: { fontSize: 12, color: colors.textMuted, writingDirection: 'ltr', textAlign: 'right' },

  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, marginBottom: 14, ...shadow.soft, shadowOpacity: 0.10 },
  svcIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  svcTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  svcSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'right' },
  doneBadge: { backgroundColor: colors.successBg, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  doneBadgeText: { fontSize: 11, fontWeight: '700', color: colors.success },

  provCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 13 },
  provAvatar: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  provInitials: { fontSize: 15, fontWeight: '700', color: '#fff' },
  provName: { fontSize: 14.5, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 3 },
  ratingText: { fontSize: 12, color: colors.textMuted },
  provLink: { fontSize: 12, fontWeight: '700', color: colors.primary },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark, marginBottom: 12, textAlign: 'right' },
  tlDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  tlLine: { width: 2, flex: 1, backgroundColor: colors.success, marginTop: 2 },
  tlTitle: { fontSize: 13.5, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  tlTime: { fontSize: 11.5, color: colors.textMuted, marginTop: 1, textAlign: 'right' },

  priceRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 9 },
  priceLabel: { fontSize: 13.5, color: colors.textBody },
  priceVal: { fontSize: 13.5, fontWeight: '600', color: colors.textDark },
  priceDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 5 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  totalVal: { fontSize: 15, fontWeight: '700', color: colors.primary },
  payRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, marginTop: 13, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border },
  payIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  payLabel: { fontSize: 11.5, color: colors.textMuted, textAlign: 'right' },
  payVal: { fontSize: 13.5, fontWeight: '700', color: colors.textDark, textAlign: 'right' },

  reorder: { height: 50, borderRadius: 15, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  reorderText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  iconBtn: { width: 50, height: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.borderRow, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  report: { height: 46, borderRadius: 14, backgroundColor: colors.dangerBg, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10 },
  reportText: { color: colors.danger, fontSize: 13.5, fontWeight: '700' },
});
