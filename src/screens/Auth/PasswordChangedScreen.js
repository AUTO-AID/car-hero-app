// ============================================================
//  PasswordChangedScreen — 10 · نجاح استعادة كلمة المرور  (القسم C)
// ============================================================

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'phosphor-react-native';
import { colors, shadow } from '../../theme/theme';
import { PrimaryButton, ScreenContainer } from '../../components/ui';

export default function PasswordChangedScreen({ onDone }) {
  // أنيميشن ظهور الدائرة (pop) + الحلقة النابضة
  const pop = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(ring, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);

  const ringStyle = {
    opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
    transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
  };

  return (
    <ScreenContainer contentStyle={{ paddingHorizontal: 30 }}>
      <View style={s.center}>
        <View style={s.badgeWrap}>
          <View style={s.softDisc} />
          <Animated.View style={[s.pulseRing, ringStyle]} />
          <Animated.View style={[s.disc, { transform: [{ scale: pop }] }]}>
            <LinearGradient colors={['#3bb57e', '#2e9e6b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.discGrad}>
              <Check size={52} weight="fill" color="#fff" />
            </LinearGradient>
          </Animated.View>
        </View>

        <Text style={s.title}>تم تغيير كلمة المرور بنجاح</Text>
        <Text style={s.sub}>يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.</Text>
      </View>

      <PrimaryButton label="تسجيل الدخول" onPress={() => onDone?.()} />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 320 },

  badgeWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  softDisc: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: '#e3f5ec' },
  pulseRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: '#2e9e6b33' },
  disc: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', ...shadow.button, shadowColor: colors.success },
  discGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  title: { marginTop: 34, fontSize: 24, fontWeight: '700', color: colors.textDark, textAlign: 'center', lineHeight: 34 },
  sub: { marginTop: 14, fontSize: 15, color: colors.textBody, textAlign: 'center', lineHeight: 27, maxWidth: 280 },
});
