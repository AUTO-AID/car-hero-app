// ============================================================
//  LoginScreen — 5 · تسجيل الدخول  (القسم B)
// ============================================================

import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LockSimple } from 'phosphor-react-native';
import { colors, shadow, gradients } from '../../theme/theme';
import { InputField, PhoneField, PrimaryButton, LinkText, ErrorBanner } from '../../components/ui';

export default function LoginScreen({ onSubmit, onForgotPassword, onRegister, loading = false, error = '' }) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const submit = () => {
    if (phone.length < 9 || !password) {
      setLocalError('يرجى إدخال رقم الهاتف وكلمة المرور');
      return;
    }
    setLocalError('');
    onSubmit?.({ phone, password });
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.root}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ترويسة متدرّجة مع الشعار */}
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
          <View style={[s.circle, { width: 160, height: 160, top: -50, right: -40, backgroundColor: '#ffffff1f' }]} />
          <View style={[s.circle, { width: 100, height: 100, bottom: -20, left: 20, backgroundColor: '#ffffff15' }]} />
          <View style={s.logo}>
            <Image source={require('../../../assets/logo.png')} style={{ width: 86, height: 86, resizeMode: 'contain' }} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.title}>مرحباً بعودتك</Text>
            <Text style={s.sub}>سجّل الدخول لمتابعة رحلتك بأمان</Text>
          </View>
        </LinearGradient>

        {/* النموذج */}
        <View style={s.form}>
          <PhoneField value={phone} onChangeText={(t) => { setPhone(t); setLocalError(''); }} />
          <View>
            <InputField
              label="كلمة المرور" placeholder="••••••••" secure
              value={password} onChangeText={(t) => { setPassword(t); setLocalError(''); }}
              icon={<LockSimple size={20} color={colors.primaryLight} />}
            />
            <Text style={s.forgot}>
              <LinkText onPress={() => onForgotPassword?.()} style={{ color: colors.primaryLight, fontWeight: '600' }}>نسيت كلمة المرور؟</LinkText>
            </Text>
          </View>

          <ErrorBanner message={localError || error} />

          <PrimaryButton label="تسجيل الدخول" onPress={submit} loading={loading} style={{ marginTop: 2 }} />

          <View style={s.divider}>
            <View style={s.line} />
            <Text style={s.or}>أو</Text>
            <View style={s.line} />
          </View>

          <View style={{ flex: 1, minHeight: 20 }} />
          <Text style={s.footNote}>
            لا تملك حساباً؟ <LinkText onPress={() => onRegister?.()}>إنشاء حساب</LinkText>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { minHeight: 230, borderBottomLeftRadius: 38, borderBottomRightRadius: 38, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 24 },
  circle: { position: 'absolute', borderRadius: 999 },
  logo: { width: 92, height: 92, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.card, shadowOpacity: 0.28 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  sub: { fontSize: 13.5, color: '#eeddfa', marginTop: 5 },

  form: { flex: 1, padding: 26, paddingTop: 30, gap: 18 },
  forgot: { textAlign: 'left', marginTop: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  line: { flex: 1, height: 1, backgroundColor: '#ece6f3' },
  or: { color: '#b7afc4', fontSize: 12.5 },
  footNote: { textAlign: 'center', fontSize: 14, color: colors.textBody },
});
