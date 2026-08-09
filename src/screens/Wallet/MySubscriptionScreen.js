// ============================================================
//  MySubscriptionScreen — ٣٣ · تفاصيل اشتراكي  (القسم I)
// ============================================================

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Crown, ArrowsClockwise, CheckCircle } from 'phosphor-react-native';
import { colors, shadow, gradients } from '../../theme/theme';

const BENEFITS = [
  'كل الخدمات (صيانة، غسيل، فتح قفل…)',
  'نقاط مضاعفة قابلة للتحويل وخصومات',
  'دردشة متقدمة (نص + صور) لسيارات غير محدودة',
  'خدمة مجانية سنوية وأولوية وصول',
];

/* مفتاح تبديل */
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

export default function MySubscriptionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [autoRenew, setAutoRenew] = useState(true);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <Text style={s.headTitle}>اشتراكي</Text>
        </View>

        {/* بطاقة الباقة */}
        <LinearGradient colors={['#6a1b9a', '#8f5cb1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
          <View style={s.cardCircle} />
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
            <Crown size={24} weight="fill" color="#fff" />
            <Text style={s.cardTitle}>الخطة المدفوعة Premium</Text>
          </View>
          <Text style={s.cardPrice}>$5 شهرياً</Text>
          <View style={s.statusChip}><View style={s.statusDot} /><Text style={s.statusText}>نشط</Text></View>
          <View style={s.cardMeta}>
            <View>
              <Text style={s.metaLabel}>تاريخ التجديد</Text>
              <Text style={s.metaVal}>٧ أغسطس ٢٠٢٦</Text>
            </View>
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={s.metaLabel}>متبقٍّ</Text>
              <Text style={s.metaVal}>٢٤ يوماً</Text>
            </View>
          </View>
        </LinearGradient>

        {/* التجديد التلقائي */}
        <View style={s.autoRow}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
            <ArrowsClockwise size={20} weight="fill" color={colors.primaryLight} />
            <Text style={s.autoLabel}>التجديد التلقائي</Text>
          </View>
          <Toggle value={autoRenew} onChange={setAutoRenew} />
        </View>

        {/* المزايا */}
        <Text style={s.sectionTitle}>مزايا باقتك</Text>
        <View style={s.benefits}>
          {BENEFITS.map((b, i) => (
            <View key={i} style={s.benefitRow}>
              <CheckCircle size={17} weight="fill" color={colors.success} />
              <Text style={s.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        {/* الأزرار */}
        <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 18 }}>
          <Pressable onPress={() => navigation?.navigate?.('Plans')} style={({ pressed }) => [{ flex: 1 }, pressed && { transform: [{ scale: 0.96 }] }]}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.upgrade}>
              <Text style={s.upgradeText}>ترقية الباقة</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => Alert.alert('إلغاء الاشتراك', 'هل تريد إلغاء تجديد الاشتراك؟ ستبقى المزايا فعّالة حتى نهاية الفترة الحالية.')}
            style={({ pressed }) => [s.cancel, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Text style={s.cancelText}>إلغاء الاشتراك</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 20 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14 },
  headTitle: { fontSize: 19, fontWeight: '700', color: colors.textDark },

  card: { position: 'relative', borderRadius: 22, padding: 22, overflow: 'hidden', marginBottom: 16, ...shadow.button, shadowOffset: { width: 0, height: 20 }, shadowRadius: 40 },
  cardCircle: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: '#ffffff1a', top: -40, left: -20 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  cardPrice: { fontSize: 13, color: '#eeddfa', marginTop: 6, textAlign: 'right' },
  statusChip: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: '#ffffff26', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, marginTop: 10 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#7ee0a9' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  cardMeta: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 16 },
  metaLabel: { fontSize: 11, color: '#eeddfa', textAlign: 'right' },
  metaVal: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2, textAlign: 'right' },

  autoRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 14, marginBottom: 10 },
  autoLabel: { fontSize: 14, fontWeight: '600', color: '#4a4358' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark, marginVertical: 12, textAlign: 'right' },
  benefits: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, gap: 10 },
  benefitRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  benefitText: { flex: 1, fontSize: 13, color: '#4a4358', textAlign: 'right' },

  upgrade: { height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  upgradeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cancel: { flex: 1, height: 50, borderRadius: 15, borderWidth: 1.5, borderColor: '#f0d4d7', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
});
