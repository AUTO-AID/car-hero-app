// ============================================================
//  ReviewScreen — ٢٢ · تقييم الخدمة  (القسم F)
// ============================================================

import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Camera } from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';

const LABELS = ['', 'سيئ', 'مقبول', 'جيد', 'جيد جداً', 'ممتاز'];
const CRITERIA = [
  { key: 'quality', label: 'جودة الخدمة', value: 5 },
  { key: 'time',    label: 'الالتزام بالوقت', value: 4 },
  { key: 'prof',    label: 'الاحترافية', value: 5 },
  { key: 'value',   label: 'القيمة مقابل السعر', value: 3 },
];

/* صفّ نجوم قابل للنقر */
function StarRow({ value, onChange, size = 38 }) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? 10 : 4, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = <Star size={size} weight={filled ? 'fill' : 'regular'} color={filled ? colors.star : colors.dotInactive} />;
        return onChange
          ? <Pressable key={n} onPress={() => onChange(n)}>{star}</Pressable>
          : <View key={n}>{star}</View>;
      })}
    </View>
  );
}

export default function ReviewScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(4);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 26, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }}>
        {/* الرأس */}
        <View style={{ alignItems: 'center' }}>
          <View style={s.avatar}><Text style={s.initials}>أ خ</Text></View>
          <Text style={s.title}>قيّم خدمة أحمد خليل</Text>
          <Text style={s.sub}>رأيك يساعدنا في تحسين الخدمة</Text>
        </View>

        {/* النجوم الرئيسية */}
        <View style={{ marginTop: 22, marginBottom: 8 }}>
          <StarRow value={rating} onChange={setRating} />
        </View>
        <Text style={s.ratingLabel}>{LABELS[rating]}</Text>

        {/* المعايير */}
        <View style={{ gap: 12, marginBottom: 20 }}>
          {CRITERIA.map((c) => (
            <View key={c.key} style={s.critRow}>
              <Text style={s.critLabel}>{c.label}</Text>
              <StarRow value={c.value} size={18} />
            </View>
          ))}
        </View>

        {/* تعليق */}
        <Text style={s.label}>تعليقك (اختياري)</Text>
        <View style={s.textArea}>
          <TextInput placeholder="شاركنا تجربتك مع الفني…" placeholderTextColor={colors.textMuted2} multiline textAlign="right" style={s.textInput} />
        </View>

        {/* إضافة صور */}
        <View style={s.photo}>
          <Camera size={22} color={colors.primaryLight} />
          <Text style={s.photoText}>إضافة صور (اختياري)</Text>
        </View>

        {/* إرسال */}
        <Pressable onPress={() => navigation?.popToTop?.()} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
            <Text style={s.ctaText}>إرسال التقييم</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  avatar: { width: 70, height: 70, borderRadius: 20, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 20, fontWeight: '700', color: colors.primary },
  title: { marginTop: 16, fontSize: 21, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  sub: { marginTop: 8, fontSize: 13.5, color: colors.textBody, textAlign: 'center' },

  ratingLabel: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.star, marginBottom: 22 },

  critRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  critLabel: { fontSize: 13.5, color: '#4a4358', fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textAlign: 'right' },
  textArea: { backgroundColor: '#faf8fd', borderWidth: 1, borderColor: '#ece6f3', borderRadius: 16, padding: 13, height: 88, marginBottom: 16 },
  textInput: { flex: 1, fontSize: 13, color: '#2a2333', textAlignVertical: 'top', padding: 0 },

  photo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#faf8fd', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.dotInactive, borderRadius: 16, padding: 14, marginBottom: 20 },
  photoText: { fontSize: 13, color: colors.textMuted },

  cta: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
