// ============================================================
//  WashPlansScreen — ٤٠ · خطط الغسيل الدورية  (القسم J)
// ============================================================

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Drop, PlusCircle } from 'phosphor-react-native';
import { colors, shadow, gradients } from '../../theme/theme';

const FREQ = [
  { label: 'مرة', value: 1 },
  { label: 'مرتان', value: 2 },
  { label: '٤ مرات', value: 4 },
];

export default function WashPlansScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [freq, setFreq] = useState(4);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <Text style={s.headTitle}>خطط الغسيل الدورية</Text>
        </View>

        {/* بطاقة الخطة النشطة */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <View style={s.icon}><Drop size={24} weight="fill" color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.planTitle}>غسيل هوا سيراتو</Text>
              <Text style={s.planSub}>غسيل خارجي وداخلي</Text>
            </View>
            <View style={s.activeBadge}><Text style={s.activeBadgeText}>نشط</Text></View>
          </View>
          <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
            <View style={s.stat}><Text style={s.statLabel}>التكرار</Text><Text style={s.statVal}>{freq} / شهر</Text></View>
            <View style={s.stat}><Text style={s.statLabel}>الغسلة القادمة</Text><Text style={[s.statVal, { color: colors.textDark }]}>٩ تموز</Text></View>
          </View>
        </View>

        <Text style={s.label}>عدد الزيارات شهرياً</Text>
        <View style={s.freqGrid}>
          {FREQ.map((f) => {
            const on = f.value === freq;
            return on ? (
              <Pressable key={f.value} onPress={() => setFreq(f.value)} style={{ flex: 1 }}>
                <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.freqCell}>
                  <Text style={[s.freqText, { color: '#fff', fontWeight: '700' }]}>{f.label}</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable key={f.value} onPress={() => setFreq(f.value)} style={[s.freqCell, s.freqCellOff]}>
                <Text style={s.freqText}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={({ pressed }) => [s.add, pressed && { transform: [{ scale: 0.97 }] }]}>
          <PlusCircle size={20} color={colors.primary} />
          <Text style={s.addText}>خطة غسيل جديدة</Text>
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

  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16, marginBottom: 16, ...shadow.soft, shadowOpacity: 0.10 },
  icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  planTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  planSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'right' },
  activeBadge: { backgroundColor: colors.successBg, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: colors.success },
  stat: { flex: 1, backgroundColor: '#faf8fd', borderRadius: 12, padding: 11, alignItems: 'center' },
  statLabel: { fontSize: 11, color: colors.textMuted },
  statVal: { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 2 },

  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textAlign: 'right' },
  freqGrid: { flexDirection: 'row-reverse', gap: 9, marginBottom: 20 },
  freqCell: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  freqCellOff: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  freqText: { fontSize: 13.5, fontWeight: '600', color: '#4a4358' },

  add: { height: 54, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primarySoft, backgroundColor: '#faf6fd', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addText: { fontSize: 15, fontWeight: '700', color: colors.primary },
});
