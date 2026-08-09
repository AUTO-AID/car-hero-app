// ============================================================
//  BookingScreen — ٢٥ · حجز موعد وجدولة  (القسم G)
// ============================================================

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Buildings, CaretLeft, CalendarCheck, ArrowsClockwise } from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';

const DAYS = [
  { d: 'أحد', n: '٦' }, { d: 'إثن', n: '٧' }, { d: 'ثلا', n: '٨' },
  { d: 'أرب', n: '٩' }, { d: 'خمي', n: '١٠' },
];
const TIMES = ['٠٩:٠٠', '١١:٠٠', '١٣:٠٠', '١٥:٠٠', '١٧:٠٠', '١٩:٠٠'];
const DISABLED = ['١٧:٠٠'];

/* مفتاح تبديل */
function Toggle({ value, onChange }) {
  return (
    <Pressable onPress={() => onChange?.(!value)} style={[tg.track, value ? tg.on : tg.off]}>
      <View style={[tg.knob, value ? tg.knobOn : tg.knobOff]} />
    </Pressable>
  );
}
const tg = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: 999, justifyContent: 'center' },
  on: { backgroundColor: colors.primaryLight }, off: { backgroundColor: '#e2d7ef' },
  knob: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  knobOn: { left: 3 }, knobOff: { right: 3 },
});

export default function BookingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [day, setDay] = useState(1);
  const [time, setTime] = useState('١١:٠٠');
  const [remind, setRemind] = useState(true);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 110 }}>
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}><ArrowRight size={20} color={colors.textHeading} /></Pressable>
          <Text style={s.headTitle}>حجز موعد صيانة</Text>
        </View>

        {/* مركز الخدمة */}
        <Text style={s.label}>مركز الخدمة</Text>
        <View style={s.centerCard}>
          <View style={s.centerIcon}><Buildings size={22} weight="fill" color={colors.primaryLight} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.centerTitle}>مركز Car Hero — المزة</Text>
            <Text style={s.centerSub}>دمشق، شارع الجلاء · ٢.١ كم</Text>
          </View>
          <CaretLeft size={16} color="#a79fb3" />
        </View>

        {/* اليوم */}
        <Text style={s.label}>اختر اليوم</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }} contentContainerStyle={{ gap: 8, flexDirection: 'row-reverse' }}>
          {DAYS.map((it, i) => {
            const on = i === day;
            return on ? (
              <Pressable key={i} onPress={() => setDay(i)}>
                <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.dayCell}>
                  <Text style={[s.dayName, { color: '#eeddfa' }]}>{it.d}</Text>
                  <Text style={[s.dayNum, { color: '#fff' }]}>{it.n}</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable key={i} onPress={() => setDay(i)} style={[s.dayCell, s.dayCellOff]}>
                <Text style={s.dayName}>{it.d}</Text>
                <Text style={s.dayNum}>{it.n}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* الوقت */}
        <Text style={s.label}>اختر الوقت</Text>
        <View style={s.timeGrid}>
          {TIMES.map((t) => {
            const disabled = DISABLED.includes(t);
            const on = t === time && !disabled;
            return on ? (
              <Pressable key={t} onPress={() => setTime(t)} style={s.timeCellWrap}>
                <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.timeCell}>
                  <Text style={[s.timeText, { color: '#fff' }]}>{t}</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable key={t} disabled={disabled} onPress={() => setTime(t)} style={[s.timeCellWrap, s.timeCellPlain, disabled && s.timeCellDisabled]}>
                <Text style={[s.timeText, disabled && { color: '#c3bace' }]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* الموعد المختار */}
        <View style={s.summary}>
          <View style={s.summaryHead}>
            <CalendarCheck size={20} weight="fill" color={colors.primaryLight} />
            <Text style={s.summaryTitle}>موعدك المختار</Text>
          </View>
          <Text style={s.summarySub}>الإثنين {DAYS[day].n} تموز · الساعة {time}</Text>
        </View>

        {/* تذكير دوري */}
        <View style={s.remind}>
          <View style={s.remindIcon}><ArrowsClockwise size={22} weight="fill" color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.remindTitle}>تذكير دوري كل ٣ أشهر</Text>
            <Text style={s.remindSub}>نذكّرك تلقائياً بموعد الصيانة القادم</Text>
          </View>
          <Toggle value={remind} onChange={setRemind} />
        </View>
      </ScrollView>

      <View style={[s.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable onPress={() => navigation?.goBack?.()} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
            <Text style={s.ctaText}>تأكيد الحجز</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f3fa' },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 20 },
  back: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14 },
  headTitle: { fontSize: 19, fontWeight: '700', color: colors.textDark },

  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textAlign: 'right' },
  centerCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 13, marginBottom: 18 },
  centerIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  centerTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  centerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'right' },

  dayCell: { width: 58, alignItems: 'center', borderRadius: 14, paddingVertical: 11 },
  dayCellOff: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  dayName: { fontSize: 11, color: colors.textMuted },
  dayNum: { fontSize: 17, fontWeight: '700', color: colors.textDark, marginTop: 2 },

  timeGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 20 },
  timeCellWrap: { width: '31.5%' },
  timeCell: { borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  timeCellPlain: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  timeCellDisabled: { backgroundColor: '#f3eff8' },
  timeText: { fontSize: 13, fontWeight: '600', color: '#4a4358' },

  summary: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, ...shadow.soft, shadowOpacity: 0.10 },
  summaryHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  summarySub: { fontSize: 13, color: colors.textBody, textAlign: 'right' },

  remind: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.tint, borderWidth: 1, borderColor: '#e8dcf5', borderRadius: 16, padding: 14, marginTop: 12 },
  remindIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  remindTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  remindSub: { fontSize: 12, color: colors.textBody, marginTop: 2, textAlign: 'right' },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, backgroundColor: '#f6f3fa' },
  cta: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
