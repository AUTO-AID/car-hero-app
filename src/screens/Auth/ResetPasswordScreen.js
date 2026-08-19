// ============================================================
//  ResetPasswordScreen — ٨ · كلمة مرور جديدة
//
//  المستخدم يجب أن يرى تقدّمه نحو كلمة مرور صالحة **أثناء كتابتها**، لا أن
//  يتلقّى رفضاً عاماً بعد الإرسال. والقواعد الإلزامية وحدها تحجب — التوصيات
//  ترشد ولا تمنع (الخادم لا يطلبها أصلاً).
// ============================================================
import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Check, Key, LockSimple, WarningCircle } from "phosphor-react-native";
import Text from "../../components/AppText";
import {
  AppHeader,
  ErrorBanner,
  InputField,
  LinkText,
  PasswordStrength,
  PrimaryButton,
  ScreenContainer,
} from "../../components/ui";
import { colors, font, radius, spacing } from "../../theme/theme";
import {
  PASSWORD_RULES as RULES,
  collectErrors,
  validateConfirm,
  validatePasswordStrength,
} from "../../services/validators";

// انتهاء صلاحية الرمز حالة متوقّعة لا خطأ عام: تحتاج مخرجاً لا رسالة مسدودة
const isExpiredCode = (message) =>
  typeof message === "string" && /انتهت صلاحية|رمز غير صحيح|اطلب رمزاً/.test(message);

export default function ResetPasswordScreen({
  onSubmit,
  onBack,
  onLogin,
  onRequestNewCode,
  loading = false,
  error = "",
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [attempted, setAttempted] = useState(false);
  const submitRef = useRef(false);

  const rulesState = useMemo(
    () => RULES.map((rule) => ({ ...rule, met: rule.test(password) })),
    [password]
  );
  const required = rulesState.filter((rule) => rule.required);
  const metRequired = required.filter((rule) => rule.met).length;
  const allRequiredMet = metRequired === required.length;
  const confirmMatches = confirm.length > 0 && confirm === password;
  const canSubmit = allRequiredMet && confirmMatches;

  const validateAll = () => ({
    password: validatePasswordStrength(password),
    confirm: validateConfirm(confirm, password),
  });

  const revalidate = (key, nextValues = {}) => {
    if (!touched[key] && !attempted) return;
    const values = { password, confirm, ...nextValues };
    const message =
      key === "password"
        ? validatePasswordStrength(values.password)
        : validateConfirm(values.confirm, values.password);
    setFieldErrors((prev) => ({ ...prev, [key]: message }));
  };

  const onBlurField = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setFieldErrors((prev) => ({ ...prev, [key]: validateAll()[key] }));
  };

  const submit = () => {
    if (loading || submitRef.current) return;
    setAttempted(true);
    const { errors, valid } = collectErrors(validateAll());
    setTouched({ password: true, confirm: true });
    setFieldErrors(errors);
    if (!valid) return;
    submitRef.current = true;
    onSubmit?.({ password });
    setTimeout(() => {
      submitRef.current = false;
    }, 0);
  };

  const expired = isExpiredCode(error);

  return (
    <ScreenContainer>
      <AppHeader title="كلمة مرور جديدة" onBack={onBack} />
      <View style={styles.iconWrap} aria-hidden>
        <Key size={34} weight="fill" color={colors.primary} />
      </View>
      <Text style={styles.title} accessibilityRole="header">أنشئ كلمة مرور قوية</Text>
      <Text style={styles.body}>استخدم كلمة مختلفة عن كلمات المرور السابقة لحماية حسابك.</Text>

      <View style={styles.form}>
        <InputField
          label="كلمة المرور الجديدة"
          placeholder="أدخل كلمة المرور"
          secure
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            revalidate("password", { password: value });
            revalidate("confirm", { password: value });
          }}
          onBlur={() => onBlurField("password")}
          error={fieldErrors.password}
          textContentType="newPassword"
          autoComplete="new-password"
          icon={<LockSimple size={20} color={colors.primary} />}
        />

        {/* كان الشريط المقسّم والقائمة الخمسية يظهران معاً فيقولان الشيء
            نفسه مرّتين. المكوّن المشترك يجمعهما في سطرين. */}
        <PasswordStrength rules={rulesState} optionalNote="اختياري" />

        <InputField
          label="تأكيد كلمة المرور"
          placeholder="أعد إدخال كلمة المرور"
          secure
          value={confirm}
          onChangeText={(value) => { setConfirm(value); revalidate("confirm", { confirm: value }); }}
          onBlur={() => onBlurField("confirm")}
          error={fieldErrors.confirm}
          textContentType="newPassword"
          autoComplete="new-password"
          onSubmitEditing={submit}
          returnKeyType="done"
          icon={<LockSimple size={20} color={colors.primary} />}
        />
        {confirmMatches ? (
          <View style={styles.matchRow} accessibilityLiveRegion="polite">
            <Check size={13} weight="bold" color={colors.success} />
            <Text style={styles.matchText}>كلمتا المرور متطابقتان</Text>
          </View>
        ) : null}

        <ErrorBanner message={error} />

        {/* انتهاء صلاحية الرمز له مخرج، لا رسالة خطأ مسدودة */}
        {expired && onRequestNewCode ? (
          <LinkText onPress={onRequestNewCode} style={styles.newCodeLink}>
            طلب رمز جديد
          </LinkText>
        ) : null}

        {/* نتيجة الحفظ تُعلَن قبله لا بعده */}
        <View style={styles.noticeRow}>
          <WarningCircle size={15} weight="fill" color={colors.warning} />
          <Text style={styles.noticeText}>
            بعد الحفظ ستُنهى جلساتك المفتوحة على الأجهزة الأخرى.
          </Text>
        </View>
      </View>

      <PrimaryButton
        label="حفظ كلمة المرور"
        onPress={submit}
        loading={loading}
        disabled={!canSubmit}
        style={styles.button}
        // التعطيل لا يكون صامتاً أبداً: السبب معلن نصّاً ومرئي في القائمة أعلاه
        accessibilityHint={
          !canSubmit
            ? !allRequiredMet
              ? "استوفِ الشروط الإلزامية أولاً"
              : "أعد إدخال كلمة المرور نفسها في حقل التأكيد"
            : undefined
        }
      />
      {!canSubmit ? (
        <Text style={styles.blockedReason}>
          {!allRequiredMet
            ? "أكمل الشروط الإلزامية أعلاه لتفعيل الحفظ."
            : "أدخل التأكيد المطابق لتفعيل الحفظ."}
        </Text>
      ) : null}

      <LinkText onPress={onLogin} style={styles.loginLink}>العودة لتسجيل الدخول</LinkText>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: spacing.xl,
  },
  title: { marginTop: spacing.xl, textAlign: "center", fontSize: font.size.title, fontWeight: "700", color: colors.textDark },
  body: { maxWidth: 380, alignSelf: "center", marginTop: spacing.sm, textAlign: "center", fontSize: font.size.sm, color: colors.textBody, lineHeight: 24 },
  form: { marginTop: spacing.xxl, gap: spacing.lg },
  matchRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginTop: -spacing.sm },
  matchText: { fontSize: font.size.xs, color: colors.success, fontWeight: "600" },
  newCodeLink: { textAlign: "center", fontSize: font.size.sm },
  noticeRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs },
  noticeText: { flex: 1, fontSize: font.size.xs, color: colors.textMuted, lineHeight: 20, textAlign: "right" },
  button: { marginTop: spacing.xl },
  blockedReason: { marginTop: spacing.sm, textAlign: "center", fontSize: font.size.xs, color: colors.textMuted },
  loginLink: { textAlign: "center", marginTop: spacing.lg, fontSize: font.size.sm },
});
