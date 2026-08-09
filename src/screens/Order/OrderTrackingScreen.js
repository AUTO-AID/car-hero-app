// ============================================================
//  OrderTrackingScreen — ١٩ · تتبّع الطلب على الخريطة  (القسم F)
//  طبقة الخريطة مبنية بالـ Views؛ للإنتاج استبدلها بـ react-native-maps
//  مع نفس التراكب (البطاقة السفلية + المؤشرات).
// ============================================================

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { ArrowRight, Truck, Check, NavigationArrow, Wrench, FlagCheckered, Phone, ChatCircle, SealCheck } from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';

const STEPS = [
  { key: 'accepted', label: 'تم القبول',   Icon: Check },
  { key: 'enroute',  label: 'في الطريق',   Icon: NavigationArrow },
  { key: 'working',  label: 'قيد التنفيذ', Icon: Wrench },
  { key: 'done',     label: 'مكتمل',       Icon: FlagCheckered },
];

const ETA = [
  'تم قبول طلبك · بانتظار انطلاق الفني',
  'الفني في الطريق · يصل خلال ٨ دقائق',
  'الفني يعمل على سيارتك الآن',
  'اكتملت الخدمة · بانتظار تأكيدك',
];

export default function OrderTrackingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(1); // الخطوة النشطة الحالية

  const onStepPress = (i) => {
    if (i === STEPS.length - 1) {
      setCurrent(i);
      navigation?.navigate?.('ConfirmCompletion');
    } else {
      setCurrent(i);
    }
  };
  return (
    <View style={s.root}>
      {/* ----- الخريطة ----- */}
      <LinearGradient colors={['#f2ecf8', '#e7ddf3']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill}>
        <View style={[s.road, { top: 150, left: -30, right: -30, height: 24, transform: [{ rotate: '-8deg' }] }]} />
        <View style={[s.road, { top: 280, left: -30, right: -20, height: 20, transform: [{ rotate: '5deg' }] }]} />
        {/* مسار متقطّع */}
        <Svg viewBox="0 0 384 500" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 500 }}>
          <Path d="M120 380 C 160 320, 220 300, 250 220 S 280 130, 300 110" fill="none" stroke={colors.primary} strokeWidth={5} strokeLinecap="round" strokeDasharray="12 10" />
        </Svg>
        {/* مؤشّر الفني */}
        <View style={s.provMarker}>
          <Truck size={20} weight="fill" color="#fff" style={{ transform: [{ rotate: '-45deg' }] }} />
        </View>
        {/* مؤشّر المستخدم */}
        <View style={s.userMarker}>
          <View style={s.userHalo} />
          <View style={s.userDot}><View style={s.userCore} /></View>
        </View>
      </LinearGradient>

      {/* ----- الشريط العلوي ----- */}
      <View style={[s.topBar, { top: insets.top + 12 }]}>
        <Pressable style={s.backBtn} onPress={() => navigation?.goBack?.()}>
          <ArrowRight size={20} color={colors.textHeading} />
        </Pressable>
        <View style={s.topTitle}><Text style={s.topTitleText}>تتبّع الطلب</Text></View>
      </View>

      {/* ----- البطاقة السفلية ----- */}
      <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={s.grabber} />
        <View style={s.etaPill}>
          <View style={s.etaDot} />
          <Text style={s.etaText}>{ETA[current]}</Text>
        </View>

        {/* شريط الحالة (اضغط خطوة لتحديث الحالة) */}
        <View style={s.timeline}>
          {STEPS.map((st, i) => {
            const state = i < current ? 'done' : i === current ? 'active' : 'todo';
            return (
              <React.Fragment key={st.key}>
                <Pressable style={s.step} onPress={() => onStepPress(i)}>
                  <View style={[
                    s.stepDot,
                    state === 'done' && { backgroundColor: colors.success },
                    state === 'active' && { backgroundColor: colors.primaryLight },
                    state === 'todo' && { backgroundColor: '#eee6f6' },
                  ]}>
                    <st.Icon size={13} weight={state === 'todo' ? 'regular' : 'fill'} color={state === 'todo' ? '#a79fb3' : '#fff'} />
                  </View>
                  <Text style={[
                    s.stepLabel,
                    state === 'done' && { color: colors.success, fontWeight: '700' },
                    state === 'active' && { color: colors.primary, fontWeight: '700' },
                    state === 'todo' && { color: '#a79fb3' },
                  ]}>{st.label}</Text>
                </Pressable>
                {i < STEPS.length - 1 && (
                  <View style={[s.stepLine, { backgroundColor: i < current ? colors.success : '#e2d7ef' }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
        <View style={s.divider} />

        {/* الفني */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
          <View style={s.avatar}><Text style={s.initials}>أ خ</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.name}>أحمد خليل</Text>
            <Text style={s.role}>فني بطاريات · ٤.٩ ★</Text>
          </View>
          <Pressable style={({ pressed }) => [s.iconCall, pressed && { transform: [{ scale: 0.94 }] }]}>
            <Phone size={19} weight="fill" color="#fff" />
          </Pressable>
          <Pressable onPress={() => navigation?.navigate?.('Chat')} style={({ pressed }) => [s.iconChat, pressed && { transform: [{ scale: 0.94 }] }]}>
            <ChatCircle size={19} weight="fill" color={colors.primary} />
          </Pressable>
        </View>

        {/* زر إتمام الخدمة */}
        <Pressable onPress={() => navigation?.navigate?.('ConfirmCompletion')} style={({ pressed }) => [{ marginTop: 16 }, pressed && { transform: [{ scale: 0.97 }] }]}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
            <SealCheck size={18} weight="fill" color="#fff" />
            <Text style={s.ctaText}>تأكيد إتمام الخدمة</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eee6f6', overflow: 'hidden' },
  road: { position: 'absolute', backgroundColor: '#ffffffcc', borderRadius: 999 },

  provMarker: { position: 'absolute', top: 96, left: 288, width: 44, height: 44, borderRadius: 22, borderBottomLeftRadius: 4, transform: [{ rotate: '45deg' }], backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.button, shadowOffset: { width: 0, height: 10 } },
  userMarker: { position: 'absolute', top: 360, left: 104, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  userHalo: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: '#6a1b9a2e' },
  userDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  userCore: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },

  topBar: { position: 'absolute', left: 22, right: 22, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, zIndex: 4 },
  backBtn: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 6 } },
  topTitle: { flex: 1, height: 48, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.soft, shadowOffset: { width: 0, height: 6 } },
  topTitleText: { fontSize: 14, fontWeight: '700', color: colors.textDark },

  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, zIndex: 5, shadowColor: '#140a28', shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 20 },
  grabber: { width: 44, height: 5, borderRadius: 999, backgroundColor: colors.borderInput, alignSelf: 'center', marginBottom: 14 },
  etaPill: { alignSelf: 'flex-start', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: '#fff4e6', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 14 },
  etaDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.warning },
  etaText: { fontSize: 12, fontWeight: '700', color: colors.warning },

  timeline: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  step: { alignItems: 'center', gap: 5, flex: 1 },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 10, textAlign: 'center' },
  stepLine: { width: 22, height: 2, marginTop: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 14 },

  avatar: { width: 52, height: 52, borderRadius: 15, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 15, fontWeight: '700', color: colors.primary },
  name: { fontSize: 15, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
  role: { fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'right' },
  iconCall: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  iconChat: { width: 46, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: colors.borderInput, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  cta: { height: 54, borderRadius: radius.lg, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { color: '#fff', fontSize: 15.5, fontWeight: '600' },
});
