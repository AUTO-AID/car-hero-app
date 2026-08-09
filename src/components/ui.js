// ============================================================
//  UI — مكوّنات مشتركة (حقول إدخال، أزرار، رمز OTP)
//  تُستخدم عبر شاشات الحساب والتحقّق وبقية الأقسام.
// ============================================================

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { colors, radius, shadow, gradients } from '../theme/theme';

/* ---------- حاوية شاشة موحّدة (SafeArea + لوحة مفاتيح آمنة + تمرير) ---------- */
export function ScreenContainer({ children, contentStyle, edgeToEdgeTop = false }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={ui.screenFlex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={ui.screenFlex}
        contentContainerStyle={[
          ui.screenContent,
          {
            paddingTop: edgeToEdgeTop ? 0 : insets.top + 12,
            paddingBottom: insets.bottom + 20,
          },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------- زر أساسي متدرّج ---------- */
export function PrimaryButton({ label, onPress, icon, style, height = 56, loading = false, disabled = false }) {
  const blocked = loading || disabled;
  return (
    <Pressable onPress={blocked ? undefined : onPress} disabled={blocked} style={({ pressed }) => [pressed && !blocked && ui.pressed, style]}>
      <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[ui.btn, { height }, shadow.button, blocked && ui.btnDisabled]}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            {icon}
            <Text style={ui.btnText}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

/* ---------- زر ثانوي (محدّد) ---------- */
export function OutlineButton({ label, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [ui.btnOutline, pressed && ui.pressed, style]}>
      <Text style={ui.btnOutlineText}>{label}</Text>
    </Pressable>
  );
}

/* ---------- حقل إدخال بأيقونة ---------- */
export function InputField({ label, icon, secure, maxLength, ...props }) {
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View>
      {label ? <Text style={ui.label}>{label}</Text> : null}
      <View style={ui.field}>
        {icon}
        <TextInput
          style={ui.input}
          placeholderTextColor={colors.textMuted2}
          secureTextEntry={hidden}
          textAlign="right"
          maxLength={maxLength ?? (secure ? 32 : 50)}
          autoCapitalize={secure ? 'none' : 'sentences'}
          autoCorrect={!secure}
          {...props}
        />
        {secure ? (
          <TouchableOpacity onPress={() => setHidden(h => !h)} hitSlop={8}>
            {hidden ? <Eye size={20} color={colors.textMuted2} /> : <EyeSlash size={20} color={colors.textMuted2} />}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

/* ---------- حقل الهاتف السوري (+963) ---------- */
export function PhoneField({ label = 'رقم الهاتف السوري', value, onChangeText, ...props }) {
  const [inner, setInner] = useState('');
  const val = value !== undefined ? value : inner;
  // قيد: أرقام فقط، وبحدّ أقصى 9 خانات (9XX XXX XXX)
  const handleChange = (t) => {
    const digits = t.replace(/[^0-9]/g, '').slice(0, 9);
    if (value === undefined) setInner(digits);
    onChangeText?.(digits);
  };
  return (
    <View>
      <Text style={ui.label}>{label}</Text>
      <View style={[ui.field, { paddingRight: 8 }]}>
        <View style={ui.cc}>
          <Text style={{ fontSize: 16 }}>🇸🇾</Text>
          <Text style={ui.ccText}>+963</Text>
        </View>
        <TextInput
          style={[ui.input, { letterSpacing: 1 }]}
          placeholder="9XX XXX XXX"
          placeholderTextColor={colors.textMuted2}
          keyboardType="phone-pad"
          textAlign="right"
          value={val}
          onChangeText={handleChange}
          maxLength={9}
          {...props}
        />
      </View>
    </View>
  );
}

/* ---------- خانات رمز التحقّق OTP ---------- */
export function OtpInput({ length = 6, value = '', onChange, error }) {
  const refs = useRef([]);
  const chars = value.split('');

  const setAt = (i, ch) => {
    const next = value.split('');
    next[i] = ch;
    const joined = next.join('').slice(0, length);
    onChange?.(joined);
    if (ch && i < length - 1) refs.current[i + 1]?.focus();
  };

  return (
    <View style={ui.otpRow}>
      {Array.from({ length }).map((_, i) => {
        const filled = !!chars[i];
        return (
          <TextInput
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={chars[i] || ''}
            onChangeText={(t) => setAt(i, t.replace(/[^0-9]/g, '').slice(-1))}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !chars[i] && i > 0) refs.current[i - 1]?.focus();
            }}
            keyboardType="number-pad"
            maxLength={1}
            style={[
              ui.otpBox,
              filled && !error && ui.otpBoxActive,
              error && ui.otpBoxError,
            ]}
          />
        );
      })}
    </View>
  );
}

/* ---------- رابط نصّي بنفسجي ---------- */
export function LinkText({ children, onPress, style }) {
  return (
    <Text onPress={onPress} style={[ui.link, style]}>{children}</Text>
  );
}

/* ---------- شريط رسالة خطأ ---------- */
export function ErrorBanner({ message, style }) {
  if (!message) return null;
  return (
    <View style={[ui.errBanner, style]}>
      <Text style={ui.errBannerText}>{message}</Text>
    </View>
  );
}

/* ---------- الأنماط ---------- */
const ui = StyleSheet.create({
  screenFlex: { flex: 1, backgroundColor: colors.surface },
  screenContent: { flexGrow: 1, paddingHorizontal: 26 },

  label: { fontSize: 13.5, fontWeight: '600', color: '#4a4358', marginBottom: 8, textAlign: 'right' },
  field: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10, height: 56, paddingHorizontal: 16,
    backgroundColor: '#faf8fd', borderWidth: 1.5, borderColor: '#ece6f3', borderRadius: radius.md,
  },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: '#2a2333', padding: 0, textAlign: 'right' },

  cc: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: colors.tint, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  ccText: { fontSize: 14, fontWeight: '700', color: colors.primary, writingDirection: 'ltr' },

  btn: { borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16.5, fontWeight: '600' },
  btnOutline: { height: 52, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.borderInput, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  btnOutlineText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  pressed: { transform: [{ scale: 0.97 }] },

  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', direction: 'ltr' },
  otpBox: {
    width: 48, height: 58, textAlign: 'center', fontSize: 22, fontWeight: '700', color: colors.textDark,
    borderWidth: 1.5, borderColor: colors.borderSoft, backgroundColor: '#fff', borderRadius: 15,
  },
  otpBoxActive: { borderColor: colors.primaryLight, backgroundColor: colors.tint },
  otpBoxError: { borderColor: '#e05561', backgroundColor: colors.dangerBg, color: '#e05561' },

  link: { color: colors.primary, fontWeight: '700' },

  errBanner: { backgroundColor: colors.dangerBg, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 14 },
  errBannerText: { color: '#e05561', fontSize: 13, fontWeight: '600', textAlign: 'right' },
});
