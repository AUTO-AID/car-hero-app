// ============================================================
//  RedeemPointsScreen — ٣١ · استبدال نقاط الوفاء  (القسم I)
// ============================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Coins } from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';

export default function RedeemPointsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <Pressable style={s.back} onPress={() => navigation?.goBack?.()}>
        <ArrowRight size={20} color={colors.primary} />
      </Pressable>

      <View style={s.badge}><Coins size={50} weight="fill" color={colors.primary} /></View>
      <Text style={s.title}>استبدال نقاط الوفاء</Text>
      <Text style={s.sub}>كل نقطة تساوي ٠٫٠٥ ل.س في رصيدك أو خصماً على طلبك.</Text>

      {/* رصيد النقاط */}
      <View style={s.balance}>
        <Text style={s.balanceLabel}>رصيد نقاطك</Text>
        <Text style={s.balanceVal}>٣٤٠ نقطة</Text>
        <Text style={s.balanceEq}>≈ ١٧ ل.س</Text>
      </View>

      {/* عدد النقاط */}
      <View style={{ marginTop: 18 }}>
        <Text style={s.label}>عدد النقاط للاستبدال</Text>
        <View style={s.field}>
          <Coins size={20} weight="fill" color={colors.primaryLight} />
          <Text style={s.fieldVal}>٣٠٠</Text>
          <Text style={s.fieldEq}>= ١٥ ل.س</Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <Pressable onPress={() => navigation?.goBack?.()} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
          <Text style={s.ctaText}>استبدال النقاط</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 26 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  badge: { width: 96, height: 96, borderRadius: 28, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 24 },
  title: { marginTop: 20, fontSize: 22, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  sub: { marginTop: 10, fontSize: 14, color: colors.textBody, lineHeight: 24, textAlign: 'center' },

  balance: { marginTop: 22, backgroundColor: '#faf8fd', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, alignItems: 'center' },
  balanceLabel: { fontSize: 12.5, color: colors.textMuted },
  balanceVal: { fontSize: 26, fontWeight: '700', color: colors.primary, marginTop: 4 },
  balanceEq: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  label: { fontSize: 13.5, fontWeight: '600', color: '#4a4358', marginBottom: 8, textAlign: 'right' },
  field: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, height: 56, paddingHorizontal: 16, backgroundColor: '#faf8fd', borderWidth: 1.5, borderColor: '#ece6f3', borderRadius: 16 },
  fieldVal: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  fieldEq: { fontSize: 13, color: colors.textMuted },

  cta: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
