// ============================================================
//  SplashScreen — شاشة إقلاع أثناء التحقّق من الجلسة (auto-login)
// ============================================================
import React from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, shadow } from '../theme/theme';

export default function SplashScreen() {
  return (
    <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.root}>
      <View style={s.logo}>
        <Image source={require('../../assets/logo.png')} style={{ width: 92, height: 92, resizeMode: 'contain' }} />
      </View>
      <ActivityIndicator color="#fff" style={{ marginTop: 34 }} />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 108, height: 108, borderRadius: 30, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', ...shadow.card, shadowOpacity: 0.28,
  },
});
