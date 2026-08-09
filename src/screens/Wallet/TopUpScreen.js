// ============================================================
//  TopUpScreen — ٣٠ · شحن الرصيد (Cham Cash)  (القسم I)
// ============================================================

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Wallet, Check } from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';

const AMOUNTS = [
  { label: '٥٬٠٠٠', value: '٥٬٠٠٠' },
  { label: '١٠٬٠٠٠', value: '١٠٬٠٠٠' },
  { label: '٢٥٬٠٠٠', value: '٢٥٬٠٠٠' },
];

export default function TopUpScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('١٠٬٠٠٠');

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 110 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <Text style={s.headTitle}>شحن الرصيد</Text>
        </View>

        {/* المبلغ */}
        <Text style={s.label}>المبلغ</Text>
        <View style={s.amountBox}>
          <Text style={s.amountVal}>{amount}</Text>
          <Text style={s.amountUnit}> ل.س</Text>
        </View>

        <View style={s.chips}>
          {AMOUNTS.map((a) => {
            const on = a.value === amount;
            return on ? (
              <Pressable key={a.value} onPress={() => setAmount(a.value)} style={{ flex: 1 }}>
                <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.chip}>
                  <Text style={[s.chipText, { color: '#fff' }]}>{a.label}</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable key={a.value} onPress={() => setAmount(a.value)} style={[s.chip, s.chipOff]}>
                <Text style={s.chipText}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* طريقة الدفع */}
        <Text style={s.label}>طريقة الدفع</Text>
        <View style={s.method}>
          <View style={s.methodIcon}><Wallet size={23} weight="fill" color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.methodTitle}>Cham Cash</Text>
            <Text style={s.methodSub}>محفظة إلكترونية</Text>
          </View>
          <View style={s.radioOn}><Check size={13} weight="bold" color="#fff" /></View>
        </View>
      </ScrollView>

      <View style={[s.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable onPress={() => navigation?.goBack?.()} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
            <Text style={s.ctaText}>متابعة الدفع</Text>
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

  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textAlign: 'right' },
  amountBox: { flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primaryLight, borderRadius: 16, paddingVertical: 18, marginBottom: 16 },
  amountVal: { fontSize: 30, fontWeight: '700', color: colors.textDark },
  amountUnit: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },

  chips: { flexDirection: 'row-reverse', gap: 9, marginBottom: 22 },
  chip: { borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  chipOff: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 13.5, fontWeight: '600', color: '#4a4358' },

  method: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primaryLight, borderRadius: 16, padding: 14 },
  methodIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  methodTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  methodSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'right' },
  radioOn: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, backgroundColor: '#f6f3fa' },
  cta: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
