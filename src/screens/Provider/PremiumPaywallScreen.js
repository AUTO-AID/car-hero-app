// ============================================================
//  PremiumPaywallScreen — ٤٤ · نافذة Premium المنبثقة  (القسم K)
//  تُعرض كطبقة فوق الشاشة؛ الضغط على الخلفية يغلقها.
// ============================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, CheckCircle } from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';

const FEATURES = [
  'اختيار الفني الأعلى تقييماً',
  'أولوية وصول في الطوارئ',
  'نقاط مضاعفة وخدمة مجانية سنوياً',
];

export default function PremiumPaywallScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      {/* الخلفية المعتمة */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => navigation?.goBack?.()} />

      {/* الورقة السفلية */}
      <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={s.grabber} />
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.icon}>
          <Crown size={40} weight="fill" color="#fff" />
        </LinearGradient>
        <Text style={s.title}>ميزة حصرية لأعضاء Premium</Text>
        <Text style={s.sub}>طلب الفني الأعلى تقييماً متاح فقط في الخطة المدفوعة. اشترك الآن واستمتع بكل المزايا.</Text>

        <View style={s.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.featRow}>
              <CheckCircle size={17} weight="fill" color={colors.success} />
              <Text style={s.featText}>{f}</Text>
            </View>
          ))}
        </View>

        <Pressable onPress={() => navigation?.replace?.('Plans')} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
            <Text style={s.ctaText}>الاشتراك بـ $5 / شهرياً</Text>
          </LinearGradient>
        </Pressable>
        <Text style={s.later} onPress={() => navigation?.goBack?.()}>ربما لاحقاً</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2a1b3d66', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingTop: 14 },
  grabber: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#e2d7ef', alignSelf: 'center', marginBottom: 18 },
  icon: { width: 78, height: 78, borderRadius: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', ...shadow.button },
  title: { marginTop: 18, fontSize: 21, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  sub: { marginTop: 10, fontSize: 13.5, color: colors.textBody, lineHeight: 24, textAlign: 'center' },

  features: { backgroundColor: '#faf8fd', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, marginTop: 18, gap: 11 },
  featRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  featText: { flex: 1, fontSize: 13, color: '#4a4358', textAlign: 'right' },

  cta: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  later: { textAlign: 'center', fontSize: 14, color: colors.textMuted, fontWeight: '600', marginTop: 14 },
});
