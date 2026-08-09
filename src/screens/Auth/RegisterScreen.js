// ============================================================
//  RegisterScreen — 4 · إنشاء حساب  (القسم B)
// ============================================================

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { User, LockSimple, UserCirclePlus, Check, ShieldCheck } from 'phosphor-react-native';
import { colors, shadow, gradients } from '../../theme/theme';
import { InputField, PhoneField, PrimaryButton, LinkText, ErrorBanner } from '../../components/ui';
import { isStrongPassword } from '../../services/validators';

export default function RegisterScreen({ onSubmit, onLogin, loading = false, error = '' }) {
  const insets = useSafeAreaInsets();
  const [agree, setAgree] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');

  const submit = () => {
    if (fullName.trim().length < 3) return setLocalError('الاسم الكامل يجب أن لا يقل عن 3 أحرف');
    if (phone.length < 9) return setLocalError('يرجى إدخال رقم هاتف صحيح');
    if (!isStrongPassword(password))
      return setLocalError('كلمة المرور: 8 رموز على الأقل مع حرف كبير وصغير ورقم ورمز');
    if (password !== confirm) return setLocalError('كلمتا المرور غير متطابقتين');
    if (!agree) return setLocalError('يجب الموافقة على الشروط والأحكام');
    setLocalError('');
    onSubmit?.({ fullName: fullName.trim(), phone, password });
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 34 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ترويسة متدرّجة */}
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: insets.top + 20 }]}>
          <View style={[s.circle, { width: 130, height: 130, top: -40, left: -20, backgroundColor: '#ffffff22' }]} />
          <View style={[s.circle, { width: 80, height: 80, bottom: -10, right: 40, backgroundColor: '#ffffff1a' }]} />
          <View style={[s.headerIcon, { top: insets.top + 12 }]}><UserCirclePlus size={34} weight="fill" color="#fff" /></View>
          <View style={s.headerText}>
            <Text style={s.headerTitle}>إنشاء حساب</Text>
            <Text style={s.headerSub}>انضمّ إلى Car Hero في أقل من دقيقة</Text>
          </View>
        </LinearGradient>

        {/* النموذج */}
        <View style={s.form}>
          <InputField label="الاسم الكامل" placeholder="أدخل اسمك الكامل" value={fullName} onChangeText={(t) => { setFullName(t); setLocalError(''); }} icon={<User size={20} color={colors.primaryLight} />} />
          <PhoneField value={phone} onChangeText={(t) => { setPhone(t); setLocalError(''); }} />
          <InputField label="كلمة المرور" placeholder="••••••••" secure value={password} onChangeText={(t) => { setPassword(t); setLocalError(''); }} icon={<LockSimple size={20} color={colors.primaryLight} />} />
          <InputField label="تأكيد كلمة المرور" placeholder="••••••••" secure value={confirm} onChangeText={(t) => { setConfirm(t); setLocalError(''); }} icon={<LockSimple size={20} color={colors.primaryLight} />} />

          {/* الموافقة على الشروط */}
          <Pressable style={s.checkRow} onPress={() => setAgree(a => !a)}>
            <View style={[s.checkbox, !agree && s.checkboxOff]}>
              {agree ? <Check size={15} weight="bold" color="#fff" /> : null}
            </View>
            <Text style={s.checkText}>
              أوافق على <Text style={s.linkInline}>الشروط والأحكام</Text> و<Text style={s.linkInline}>سياسة الخصوصية</Text>
            </Text>
          </Pressable>

          <ErrorBanner message={localError || error} />

          <PrimaryButton label="إنشاء حساب" onPress={submit} loading={loading} style={{ marginTop: 6 }} />

          <View style={s.safeRow}>
            <ShieldCheck size={15} weight="fill" color={colors.success} />
            <Text style={s.safeText}>بياناتك آمنة معنا</Text>
          </View>
          <Text style={s.footNote}>
            لديك حساب؟ <LinkText onPress={() => onLogin?.()}>تسجيل الدخول</LinkText>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { minHeight: 150, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden', justifyContent: 'flex-end', paddingHorizontal: 26, paddingBottom: 22 },
  circle: { position: 'absolute', borderRadius: 999 },
  headerIcon: { position: 'absolute', left: 22, width: 60, height: 60, borderRadius: 20, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center' },
  headerText: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13.5, color: '#eeddfa', marginTop: 6 },

  form: { padding: 26, gap: 16 },
  checkRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11, marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.soft },
  checkboxOff: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.borderInput, shadowOpacity: 0, elevation: 0 },
  checkText: { flex: 1, fontSize: 13, color: colors.textBody, lineHeight: 21, textAlign: 'right' },
  linkInline: { color: colors.primary, fontWeight: '700' },

  safeRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },
  safeText: { color: colors.textMuted, fontSize: 12.5 },
  footNote: { textAlign: 'center', fontSize: 14, color: colors.textBody, marginTop: 2 },
});
