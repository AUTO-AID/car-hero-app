// ============================================================
//  PaymentMethodsScreen — ٣٧ · طرق الدفع  (القسم J)
// ============================================================

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Wallet, CreditCard, Money, DotsThreeVertical, PlusCircle } from 'phosphor-react-native';
import { colors, shadow } from '../../theme/theme';

export default function PaymentMethodsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <Text style={s.headTitle}>طرق الدفع</Text>
        </View>

        <View style={[s.card, s.cardOn]}>
          <View style={s.icon}><Wallet size={22} weight="fill" color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 7 }}>
              <Text style={s.title}>Cham Cash</Text>
              <View style={s.defBadge}><Text style={s.defBadgeText}>افتراضي</Text></View>
            </View>
            <Text style={s.sub}>محفظة إلكترونية</Text>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.icon}><CreditCard size={22} weight="fill" color={colors.primaryLight} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Visa •••• 4821</Text>
            <Text style={s.sub}>تنتهي ٠٨/٢٧</Text>
          </View>
          <DotsThreeVertical size={18} color="#a79fb3" />
        </View>

        <View style={[s.card, { marginBottom: 20 }]}>
          <View style={[s.icon, { backgroundColor: colors.successBg }]}><Money size={22} weight="fill" color={colors.success} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>نقداً عند الوصول</Text>
            <Text style={s.sub}>ادفع للفني مباشرة</Text>
          </View>
        </View>

        <Pressable style={({ pressed }) => [s.add, pressed && { transform: [{ scale: 0.97 }] }]}>
          <PlusCircle size={20} color={colors.primary} />
          <Text style={s.addText}>إضافة بطاقة</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 22 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14 },
  headTitle: { fontSize: 19, fontWeight: '700', color: colors.textDark },

  card: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 15, marginBottom: 12, ...shadow.soft, shadowOpacity: 0.10 },
  cardOn: { borderWidth: 1.5, borderColor: colors.primaryLight },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14.5, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  defBadge: { backgroundColor: colors.tint, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 },
  defBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primaryLight },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'right' },

  add: { height: 54, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primarySoft, backgroundColor: '#faf6fd', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addText: { fontSize: 15, fontWeight: '700', color: colors.primary },
});
