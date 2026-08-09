// ============================================================
//  ForgotPasswordScreen — 7 · نسيت كلمة المرور  (القسم C)
// ============================================================

import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  ArrowRight,
  LockKey,
  PaperPlaneTilt,
  Info,
} from "phosphor-react-native";
import { colors } from "../../theme/theme";
import {
  PhoneField,
  PrimaryButton,
  ScreenContainer,
  ErrorBanner,
} from "../../components/ui";

export default function ForgotPasswordScreen({ onSubmit, onBack, onLogin, loading = false, error = "" }) {
  const [phone, setPhone] = useState("");
  const [localError, setLocalError] = useState("");

  const submit = () => {
    if (phone.length < 9) {
      setLocalError("يرجى إدخال رقم هاتف صحيح");
      return;
    }
    setLocalError("");
    onSubmit?.({ phone });
  };

  return (
    <ScreenContainer>
      <Pressable style={s.back} onPress={() => onBack?.()}>
        <ArrowRight size={20} color={colors.primary} />
      </Pressable>

      <View style={s.badge}>
        <LockKey size={56} weight="fill" color={colors.primary} />
      </View>

      <Text style={s.title}>نسيت كلمة المرور؟</Text>
      <Text style={s.sub}>
        أدخل رقم هاتفك المسجّل وسنرسل لك رمز تحقّق لإعادة تعيين كلمة المرور.
      </Text>

      <View style={{ marginTop: 26 }}>
        <PhoneField value={phone} onChangeText={(t) => { setPhone(t); setLocalError(""); }} />
        <View style={s.infoRow}>
          <Info size={15} color={colors.primaryLight} />
          <Text style={s.infoText}>سنستخدم هذا الرقم فقط للتحقّق من حسابك</Text>
        </View>
        <ErrorBanner message={localError || error} style={{ marginTop: 14 }} />
      </View>

      <View style={{ flex: 1, minHeight: 24 }} />

      <PrimaryButton
        label="إرسال رمز التحقّق"
        icon={<PaperPlaneTilt size={18} weight="fill" color="#fff" />}
        onPress={submit}
        loading={loading}
      />
      <Text style={s.backLink} onPress={() => onLogin?.()}>
        العودة لتسجيل الدخول
      </Text>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  badge: {
    width: 120,
    height: 120,
    borderRadius: 34,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 26,
  },
  title: {
    marginTop: 26,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    color: colors.textDark,
  },
  sub: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 14.5,
    color: colors.textBody,
    lineHeight: 25,
  },
  infoRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  infoText: { color: colors.textMuted, fontSize: 12 },
  backLink: {
    textAlign: "center",
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
    marginTop: 18,
  },
});
