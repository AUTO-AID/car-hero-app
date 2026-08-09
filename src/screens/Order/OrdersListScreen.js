// ============================================================
//  OrdersListScreen — ٢٣ · قائمة الطلبات: نشطة/منتهية/ملغاة (G + L)
//  تُعرض كتبويب "الطلبات" — شريط التنقّل السفلي من App.js
// ============================================================

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CarBattery, Tire, Drop, GasPump, Key, CheckCircle, XCircle, Star, Info, Tray,
} from 'phosphor-react-native';
import { colors, shadow } from '../../theme/theme';

const TABS = ['نشطة', 'منتهية', 'ملغاة'];

const ACTIVE = [
  { Icon: CarBattery, title: 'شحن بطارية', ref: '#CH-24815 · اليوم ١٤:٣٠', status: 'في الطريق', warn: true, foot: 'أحمد خليل · يصل خلال ٨ د', track: true },
  { Icon: Tire, title: 'تبديل إطار', ref: '#CH-24790 · أمس ٠٩:١٠', status: 'قيد التنفيذ', warn: false },
];

const COMPLETED = [
  { Icon: CarBattery, title: 'شحن بطارية', ref: '#CH-24815 · اليوم ١٥:٠٢', rated: '٥.٠', action: 'إعادة الطلب ←' },
  { Icon: Tire, title: 'تبديل إطار', ref: '#CH-24790 · أمس ٠٩:١٠', foot: 'رامي عيسى · ٣٠٠٠٠ ل.س', action: 'التفاصيل ←' },
  { Icon: Drop, title: 'غسيل سيارة', ref: '#CH-24601 · ٢٨ حزيران', foot: 'مركز Car Hero — المزة · ٢٠٠٠٠ ل.س', action: 'التفاصيل ←' },
];

const CANCELLED = [
  { Icon: GasPump, title: 'توصيل وقود', ref: '#CH-24560 · ٢٦ حزيران', reason: 'أُلغي من قبلك' },
  { Icon: Key, title: 'فتح السيارة', ref: '#CH-24512 · ٢٤ حزيران', reason: 'لم يتوفّر فني متاح' },
];

export default function OrdersListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 24 }}>
        <Text style={s.title}>طلباتي</Text>

        {/* التبويبات */}
        <View style={s.tabs}>
          {TABS.map((t, i) => (
            <Pressable key={t} style={[s.tab, tab === i && s.tabOn]} onPress={() => setTab(i)}>
              <Text style={[s.tabText, tab === i && s.tabTextOn]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 0 ? (
          <>
            {ACTIVE.map((o, i) => (
              <Pressable key={i} style={s.card} onPress={() => navigation?.navigate?.('OrderDetail', { ref: o.ref })}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                  <View style={s.icon}><o.Icon size={24} weight="fill" color={colors.primary} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.cardTitle}>{o.title}</Text>
                    <Text style={s.cardRef}>{o.ref}</Text>
                  </View>
                  <View style={[s.badge, o.warn ? s.badgeWarn : s.badgeSoft]}>
                    {o.warn && <View style={s.badgeDot} />}
                    <Text style={[s.badgeText, { color: o.warn ? colors.warning : colors.primaryLight }]}>{o.status}</Text>
                  </View>
                </View>
                {o.track && (
                  <>
                    <View style={s.divider} />
                    <Pressable style={s.footRow} onPress={() => navigation?.navigate?.('Tracking')}>
                      <Text style={s.footText}>{o.foot}</Text>
                      <Text style={s.footLink}>تتبّع ←</Text>
                    </Pressable>
                  </>
                )}
              </Pressable>
            ))}
            <View style={s.empty}><Text style={s.emptyText}>لا توجد طلبات نشطة أخرى</Text></View>
          </>
        ) : tab === 1 ? (
          <>
            {COMPLETED.map((o, i) => (
              <Pressable key={i} style={s.card} onPress={() => navigation?.navigate?.('OrderDetail', { ref: o.ref })}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                  <View style={s.icon}><o.Icon size={24} weight="fill" color={colors.primary} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.cardTitle}>{o.title}</Text>
                    <Text style={s.cardRef}>{o.ref}</Text>
                  </View>
                  <View style={[s.badge, s.badgeDone]}>
                    <CheckCircle size={13} weight="fill" color={colors.success} />
                    <Text style={[s.badgeText, { color: colors.success }]}>مكتمل</Text>
                  </View>
                </View>
                <View style={s.divider} />
                <View style={s.footRow}>
                  {o.rated ? (
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
                      <Star size={13} weight="fill" color={colors.star} />
                      <Text style={[s.footText, { color: colors.star, fontWeight: '700' }]}>قيّمت {o.rated}</Text>
                    </View>
                  ) : (
                    <Text style={s.footText}>{o.foot}</Text>
                  )}
                  <Text style={s.footLink}>{o.action}</Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : (
          <>
            {CANCELLED.map((o, i) => (
              <Pressable key={i} style={[s.card, s.cardCancelled]} onPress={() => navigation?.navigate?.('Services')}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                  <View style={[s.icon, s.iconCancelled]}><o.Icon size={24} weight="fill" color={colors.danger} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.cardTitle}>{o.title}</Text>
                    <Text style={s.cardRef}>{o.ref}</Text>
                  </View>
                  <View style={[s.badge, s.badgeCancelled]}>
                    <XCircle size={13} weight="fill" color={colors.danger} />
                    <Text style={[s.badgeText, { color: colors.danger }]}>ملغى</Text>
                  </View>
                </View>
                <View style={s.divider} />
                <View style={s.footRow}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
                    <Info size={13} color={colors.danger} />
                    <Text style={s.footText}>{o.reason}</Text>
                  </View>
                  <Text style={s.footLink}>إعادة الطلب ←</Text>
                </View>
              </Pressable>
            ))}
            <View style={s.emptyBig}>
              <Tray size={34} color="#cfc4de" />
              <Text style={[s.emptyText, { marginTop: 8 }]}>لا مزيد من الطلبات الملغاة</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark, marginBottom: 16, textAlign: 'right' },

  tabs: { flexDirection: 'row-reverse', gap: 8, backgroundColor: '#eee6f6', borderRadius: 14, padding: 5, marginBottom: 18 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  tabOn: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextOn: { color: '#fff', fontWeight: '700' },

  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee3f7', borderRadius: 18, padding: 15, marginBottom: 12, ...shadow.soft, shadowOpacity: 0.12 },
  icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  cardRef: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'right', writingDirection: 'ltr' },
  badge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  badgeWarn: { backgroundColor: '#fff4e6' },
  badgeSoft: { backgroundColor: colors.tint },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning },
  badgeText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  footRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  footText: { fontSize: 13, color: colors.textBody },
  footLink: { fontSize: 13, fontWeight: '700', color: colors.primaryLight },

  empty: { alignItems: 'center', paddingVertical: 22 },
  emptyBig: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 12.5, color: '#a79fb3' },

  badgeDone: { backgroundColor: colors.successBg },
  badgeCancelled: { backgroundColor: colors.dangerBg },
  cardCancelled: { borderColor: '#f4dede' },
  iconCancelled: { backgroundColor: colors.dangerBg },
});
