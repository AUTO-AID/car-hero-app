// ============================================================
//  SearchingProviderScreen — ١٧ · البحث عن فني  (القسم E)
//  ينفّذ POST /orders (أو /bookings عند الجدولة) فعليًا.
//  نجاح: navigation.replace('ProviderFound',{ orderId: res.id })
//  خطأ «لا مزوّد»: حالة فارغة + إعادة المحاولة.
// ============================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MagnifyingGlass, Lightning, SmileySad, WarningCircle } from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../../theme/theme';
import { buildOrderBody, createOrder, createBooking, isNoProviderError } from '../../services/ordersApi';

export default function SearchingProviderScreen({ navigation, route }) {
  const p = route?.params || {};
  const serviceName = p.serviceName || 'الخدمة';
  const scheduled = !!p.scheduleTime;

  const ring = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState('searching'); // searching | noProvider | error
  const [errMsg, setErrMsg] = useState('');

  const submit = useCallback(async () => {
    setPhase('searching'); setErrMsg('');
    try {
      const body = buildOrderBody({
        serviceId: p.serviceId,
        longitude: p.longitude,
        latitude: p.latitude,
        vehicleId: p.vehicleId,
        providerId: p.providerId,
        scheduleTime: p.scheduleTime,
        notes: p.notes,
      });
      const res = scheduled ? await createBooking(body) : await createOrder(body);
      navigation?.replace?.('ProviderFound', { orderId: res.id });
    } catch (e) {
      if (isNoProviderError(e)) setPhase('noProvider');
      else { setErrMsg(e?.message || 'حدث خطأ أثناء إنشاء الطلب'); setPhase('error'); }
    }
  }, [navigation, p, scheduled]);

  useEffect(() => {
    Animated.loop(Animated.timing(ring, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true })).start();
    submit();
  }, []);

  const ringStyle = {
    opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] }) }],
  };

  if (phase === 'noProvider' || phase === 'error') {
    const noProv = phase === 'noProvider';
    return (
      <View style={s.root}>
        <View style={s.center}>
          <View style={[s.emptyIcon, { backgroundColor: noProv ? colors.tint : colors.dangerBg }]}>
            {noProv ? <SmileySad size={46} weight="fill" color={colors.primaryLight} /> : <WarningCircle size={46} weight="fill" color={colors.danger} />}
          </View>
          <Text style={s.title}>{noProv ? 'لا يوجد فني متاح' : 'تعذّر إنشاء الطلب'}</Text>
          <Text style={s.sub}>{noProv ? 'لم نعثر على فني متاح لخدمتك الآن. حاول مجددًا بعد قليل أو وسّع نطاق البحث.' : errMsg}</Text>
        </View>
        <View style={{ gap: 12 }}>
          <Pressable onPress={submit} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cta, shadow.button]}>
              <Text style={s.ctaText}>إعادة المحاولة</Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={({ pressed }) => [s.cancel, pressed && { transform: [{ scale: 0.97 }] }]} onPress={() => navigation?.goBack?.()}>
            <Text style={s.cancelText}>رجوع</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.center}>
        <View style={s.radar}>
          <View style={[s.disc, { backgroundColor: colors.tint }]} />
          <View style={[s.disc, { top: 26, left: 26, right: 26, bottom: 26, backgroundColor: colors.tint2 }]} />
          <Animated.View style={[s.ring, ringStyle]} />
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.core}>
            <MagnifyingGlass size={42} weight="bold" color="#fff" />
          </LinearGradient>
        </View>

        <Text style={s.title}>{scheduled ? 'نؤكّد حجزك…' : 'نبحث عن أقرب فني إليك…'}</Text>
        <Text style={s.sub}>يرجى الانتظار، نقوم بمطابقة طلبك مع الفنيين المتاحين في منطقتك.</Text>

        <View style={s.chip}>
          <Lightning size={16} weight="fill" color={colors.primaryLight} />
          <Text style={s.chipText}>{serviceName}</Text>
        </View>
      </View>

      <Pressable style={({ pressed }) => [s.cancel, pressed && { transform: [{ scale: 0.97 }] }]} onPress={() => navigation?.goBack?.()}>
        <Text style={s.cancelText}>إلغاء الطلب</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', paddingTop: 52, paddingHorizontal: 30, paddingBottom: 34 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  radar: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  disc: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 90 },
  ring: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 90, borderWidth: 2, borderColor: '#8f5cb14d' },
  core: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', ...shadow.button },

  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 34, fontSize: 22, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  sub: { marginTop: 12, fontSize: 14.5, color: colors.textBody, lineHeight: 25, textAlign: 'center' },
  chip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: colors.tint, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, marginTop: 20 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  cta: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancel: { height: 52, borderRadius: radius.lg, borderWidth: 1.5, borderColor: '#f0d4d7', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
