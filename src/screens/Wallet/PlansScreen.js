// ============================================================
//  PlansScreen — ٣٢ · باقات الاشتراك  (القسم I)
// ============================================================

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Car, Crown, CheckCircle, Check } from 'phosphor-react-native';
import { colors, shadow, gradients } from '../../theme/theme';

const FREE = [
  'الخدمات الأساسية فقط',
  'نقاط أقل عن كل طلب',
  'دردشة نصية فقط',
  'توصية ذكية حسب المسافة فقط',
  'سيارة واحدة فقط',
  'لا خدمات مجانية سنوية',
  'انتظار أطول في الخدمة',
];
const PREMIUM = [
  'كل الخدمات (صيانة، غسيل، فتح قفل…)',
  'نقاط مضاعفة قابلة للتحويل وخصومات',
  'دردشة متقدمة (نص + صور)',
  'توصية ذكية حسب التقييمات والأداء',
  'عدد غير محدود من السيارات',
  'خدمة مجانية واحدة سنوياً',
  'أولوية وصول من أقرب فني متاح',
];

export default function PlansScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [yearly, setYearly] = useState(false);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <Text style={s.headTitle}>خطط المستخدمين</Text>
        </View>
        <Text style={s.intro}>قارن بين الخطة المجانية والمدفوعة واختر ما يناسبك.</Text>

        {/* التبديل شهري / سنوي */}
        <View style={s.toggle}>
          <Pressable style={[s.toggleTab, !yearly && s.toggleTabOn]} onPress={() => setYearly(false)}>
            <Text style={[s.toggleText, !yearly && s.toggleTextOn]}>شهري · $5</Text>
          </Pressable>
          <Pressable style={[s.toggleTab, yearly && s.toggleTabOn]} onPress={() => setYearly(true)}>
            <Text style={[s.toggleText, yearly && s.toggleTextOn]}>سنوي · $50 <Text style={s.save}>يوفّر ١٧٪</Text></Text>
          </Pressable>
        </View>

        {/* الخطة المجانية */}
        <View style={s.freeCard}>
          <View style={s.planHead}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
              <View style={s.freeIcon}><Car size={21} weight="fill" color={colors.primaryLight} /></View>
              <View>
                <Text style={s.planTitle}>الخطة المجانية</Text>
                <Text style={s.planSub}>Free</Text>
              </View>
            </View>
            <Text style={s.freePrice}>مجانية</Text>
          </View>
          <View style={{ gap: 9 }}>
            {FREE.map((f, i) => (
              <View key={i} style={s.featRow}>
                <CheckCircle size={16} weight="fill" color={colors.success} />
                <Text style={s.featText}>{f}</Text>
              </View>
            ))}
          </View>
          <View style={s.current}>
            <Check size={16} weight="bold" color={colors.success} />
            <Text style={s.currentText}>خطتك الحالية</Text>
          </View>
        </View>

        {/* الخطة المدفوعة */}
        <LinearGradient colors={['#6a1b9a', '#8f5cb1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.premiumCard}>
          <View style={s.premiumCircle} />
          <View style={s.recommended}><Text style={s.recommendedText}>موصى بها</Text></View>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={s.premiumIcon}><Crown size={21} weight="fill" color="#fff" /></View>
            <View>
              <Text style={s.premiumTitle}>الخطة المدفوعة</Text>
              <Text style={s.premiumSub}>Premium</Text>
            </View>
          </View>
          <View style={{ marginBottom: 14, flexDirection: 'row-reverse', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <Text style={s.premiumPrice}>{yearly ? '$50' : '$5'}</Text>
            <Text style={s.premiumUnit}> / {yearly ? 'سنوياً' : 'شهرياً — أو $50 سنوياً'}</Text>
          </View>
          <View style={{ gap: 9 }}>
            {PREMIUM.map((f, i) => (
              <View key={i} style={s.featRow}>
                <CheckCircle size={16} weight="fill" color="#fff" />
                <Text style={s.featTextLight}>{f}</Text>
              </View>
            ))}
          </View>
          <Pressable onPress={() => navigation?.navigate?.('MySubscription')} style={({ pressed }) => [s.upgrade, pressed && { transform: [{ scale: 0.97 }] }]}>
            <Text style={s.upgradeText}>الترقية إلى Premium</Text>
          </Pressable>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 8 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14 },
  headTitle: { fontSize: 19, fontWeight: '700', color: colors.textDark },
  intro: { fontSize: 13.5, color: colors.textBody, marginBottom: 16, textAlign: 'right', lineHeight: 22 },

  toggle: { flexDirection: 'row-reverse', gap: 6, backgroundColor: '#eee6f6', borderRadius: 14, padding: 5, marginBottom: 16 },
  toggleTab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  toggleTabOn: { backgroundColor: colors.primary },
  toggleText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  toggleTextOn: { color: '#fff', fontWeight: '700' },
  save: { fontSize: 10, color: colors.success, fontWeight: '700' },

  freeCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18, marginBottom: 12, ...shadow.soft, shadowOpacity: 0.10 },
  planHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  freeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  planTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  planSub: { fontSize: 11.5, color: colors.textMuted, textAlign: 'right' },
  freePrice: { fontSize: 18, fontWeight: '700', color: colors.textDark },
  featRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  featText: { flex: 1, fontSize: 12.5, color: colors.textBody, textAlign: 'right' },
  featTextLight: { flex: 1, fontSize: 12.5, color: '#f0e6f8', textAlign: 'right' },
  current: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: colors.borderInput, backgroundColor: '#faf8fd', marginTop: 16 },
  currentText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },

  premiumCard: { position: 'relative', borderRadius: 20, padding: 18, overflow: 'hidden', ...shadow.button, shadowOffset: { width: 0, height: 18 } },
  premiumCircle: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#ffffff14', top: -40, left: -20 },
  recommended: { position: 'absolute', top: 16, left: 16, backgroundColor: '#fff', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  recommendedText: { fontSize: 10.5, fontWeight: '700', color: colors.primary },
  premiumIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ffffff2b', alignItems: 'center', justifyContent: 'center' },
  premiumTitle: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'right' },
  premiumSub: { fontSize: 11.5, color: '#eeddfa', textAlign: 'right' },
  premiumPrice: { fontSize: 26, fontWeight: '700', color: '#fff' },
  premiumUnit: { fontSize: 12.5, color: '#eeddfa' },
  upgrade: { height: 48, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  upgradeText: { fontSize: 14.5, fontWeight: '700', color: colors.primary },
});
