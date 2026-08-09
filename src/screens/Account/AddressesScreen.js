// ============================================================
//  AddressesScreen — ٣٦ · العناوين المحفوظة  (القسم J)
// ============================================================

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, House, Briefcase, DotsThreeVertical, PlusCircle } from 'phosphor-react-native';
import { colors, shadow } from '../../theme/theme';

const ADDRESSES = [
  { Icon: House, title: 'المنزل', def: true, addr: 'دمشق، المزة، شارع الجلاء، بناء ١٢' },
  { Icon: Briefcase, title: 'العمل', def: false, addr: 'دمشق، أبو رمانة، شارع المتنبي' },
];

export default function AddressesScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <Text style={s.headTitle}>العناوين المحفوظة</Text>
        </View>

        {ADDRESSES.map((a, i) => (
          <View key={i} style={[s.card, a.def && s.cardOn, { marginBottom: i === ADDRESSES.length - 1 ? 20 : 12 }]}>
            <View style={s.icon}><a.Icon size={22} weight="fill" color={a.def ? colors.primary : colors.primaryLight} /></View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 7 }}>
                <Text style={s.title}>{a.title}</Text>
                {a.def && <View style={s.defBadge}><Text style={s.defBadgeText}>افتراضي</Text></View>}
              </View>
              <Text style={s.addr}>{a.addr}</Text>
            </View>
            <DotsThreeVertical size={18} color="#a79fb3" />
          </View>
        ))}

        <Pressable style={({ pressed }) => [s.add, pressed && { transform: [{ scale: 0.97 }] }]} onPress={() => navigation?.navigate?.('ProvidersMap')}>
          <PlusCircle size={20} color={colors.primary} />
          <Text style={s.addText}>إضافة عنوان جديد</Text>
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

  card: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 15, ...shadow.soft, shadowOpacity: 0.10 },
  cardOn: { borderWidth: 1.5, borderColor: colors.primaryLight },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14.5, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  defBadge: { backgroundColor: colors.tint, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 },
  defBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primaryLight },
  addr: { fontSize: 12.5, color: colors.textMuted, marginTop: 3, lineHeight: 20, textAlign: 'right' },

  add: { height: 54, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primarySoft, backgroundColor: '#faf6fd', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addText: { fontSize: 15, fontWeight: '700', color: colors.primary },
});
