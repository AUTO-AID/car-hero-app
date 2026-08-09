// ============================================================
//  NotificationsScreen — ٣٩ · الإشعارات  (القسم J)
// ============================================================

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, CheckCircle, BellRinging, SealPercent, Star } from 'phosphor-react-native';
import { colors, shadow } from '../../theme/theme';

const NOTIFS = [
  { Icon: CheckCircle, bg: colors.tint, fg: colors.success, title: 'تم قبول طلبك', body: 'أحمد خليل في الطريق إليك، يصل خلال ٨ دقائق.', time: 'قبل ٥ دقائق', unread: true },
  { Icon: BellRinging, bg: '#fff4e6', fg: colors.warning, title: 'تذكير صيانة', body: 'موعد تغيير زيت هوا سيراتو خلال ٢٠ يوماً.', time: 'قبل ساعتين', unread: true },
  { Icon: SealPercent, bg: colors.tint, fg: colors.primaryLight, title: 'عرض جديد لك!', body: 'خصم ٣٠٪ على أول طلب بنشر. استخدم WELCOME30.', time: 'أمس', unread: false },
  { Icon: Star, bg: colors.successBg, fg: colors.success, title: 'قيّم خدمتك الأخيرة', body: 'شاركنا رأيك بخدمة تبديل الإطار.', time: 'قبل يومين', unread: false },
];

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <Text style={s.title}>الإشعارات</Text>
          <View style={{ flex: 1 }} />
          <Text style={s.markAll}>تحديد الكل كمقروء</Text>
        </View>

        {NOTIFS.map((n, i) => (
          <View key={i} style={[s.item, !n.unread && { opacity: 0.72 }]}>
            <View style={[s.icon, { backgroundColor: n.bg }]}><n.Icon size={21} weight="fill" color={n.fg} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.itemTitle}>{n.title}</Text>
              <Text style={s.itemBody}>{n.body}</Text>
              <Text style={s.itemTime}>{n.time}</Text>
            </View>
            {n.unread && <View style={s.dot} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 20 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textDark },
  markAll: { fontSize: 12, fontWeight: '700', color: colors.primaryLight },

  item: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eadcf6', borderRadius: 16, padding: 14, marginBottom: 10, ...shadow.soft, shadowOpacity: 0.10 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 13.5, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  itemBody: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 19, textAlign: 'right' },
  itemTime: { fontSize: 11, color: '#b7afc4', marginTop: 5, textAlign: 'right' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryLight, marginTop: 6 },
});
