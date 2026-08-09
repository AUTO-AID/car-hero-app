// ============================================================
//  OffersScreen — ٣٨ · العروض والكوبونات  (القسم J)
// ============================================================

import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Tag, SealPercent, Drop } from 'phosphor-react-native';
import { colors, shadow, gradients } from '../../theme/theme';

export default function OffersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <Text style={s.headTitle}>العروض والكوبونات</Text>
        </View>

        {/* إدخال الكوبون */}
        <View style={s.couponField}>
          <Tag size={19} color={colors.primaryLight} />
          <TextInput value={code} onChangeText={setCode} placeholder="أدخل رمز الكوبون" placeholderTextColor={colors.textMuted2} textAlign="right" style={s.couponInput} />
          <Pressable style={({ pressed }) => [s.applyBtn, pressed && { transform: [{ scale: 0.95 }] }]}>
            <Text style={s.applyText}>تطبيق</Text>
          </Pressable>
        </View>

        {/* بطاقة العرض الرئيسية */}
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.promo}>
          <View style={s.promoCircle} />
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={s.promoTitle}>خصم ٣٠٪</Text>
              <Text style={s.promoSub}>على أول طلب بنشر لك</Text>
            </View>
            <SealPercent size={52} weight="fill" color="#ffffff33" />
          </View>
          <View style={s.promoFoot}>
            <Text style={s.promoCode}>WELCOME30</Text>
            <Text style={s.promoExpiry}>ينتهي ٣١ تموز</Text>
          </View>
        </LinearGradient>

        {/* عرض إضافي */}
        <View style={s.offer}>
          <View style={s.offerIcon}><Drop size={24} weight="fill" color={colors.primaryLight} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.offerTitle}>غسيل سيارة بنصف السعر</Text>
            <Text style={s.offerSub}>صالح لكل الأعضاء · حتى ١٥ أغسطس</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 22 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14 },
  headTitle: { fontSize: 19, fontWeight: '700', color: colors.textDark },

  couponField: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, height: 52, paddingRight: 15, paddingLeft: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 15, marginBottom: 20 },
  couponInput: { flex: 1, minWidth: 0, fontSize: 13.5, color: '#2a2333', padding: 0, textAlign: 'right' },
  applyBtn: { height: 38, paddingHorizontal: 16, borderRadius: 11, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  promo: { position: 'relative', borderRadius: 20, overflow: 'hidden', padding: 18, marginBottom: 12, ...shadow.button, shadowOffset: { width: 0, height: 16 }, shadowRadius: 32 },
  promoCircle: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#ffffff14', top: -30, left: -20 },
  promoTitle: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'right' },
  promoSub: { fontSize: 12.5, color: '#eeddfa', marginTop: 4, textAlign: 'right' },
  promoFoot: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ffffff40', borderStyle: 'dashed' },
  promoCode: { fontSize: 12, color: '#eeddfa', letterSpacing: 1, writingDirection: 'ltr' },
  promoExpiry: { fontSize: 11.5, color: '#eeddfa' },

  offer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16, ...shadow.soft, shadowOpacity: 0.10 },
  offerIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  offerTitle: { fontSize: 14.5, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  offerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'right' },
});
