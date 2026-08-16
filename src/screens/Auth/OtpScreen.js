// ============================================================
//  OtpScreen — ٦ · رمز التحقّق
//
//  لحظة عالية القلق: المستخدم ينتظر رسالة قد لا تصل. معظم الفشل هنا سببه
//  تصميم لا تقنية — رمز يصل ولا يُملأ تلقائياً، أو مؤقّت لا يُرى، أو طريق
//  مسدود بعد محاولتين. الشاشة تُقاس بمعدل إتمام التحقّق لا بجمالها.
//
//  ملاحظة: قد يكون تخطّي OTP مفعّلاً في الخادم (تطوير). لا نبني أي منطق على
//  وجوده — نتفاعل مع شكل الرد لا مع علم داخلي.
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ChatCircleDots, ShieldCheck } from "phosphor-react-native";
import Text from "../../components/AppText";
import {
  ActionSheet,
  AppHeader,
  ErrorBanner,
  LinkText,
  OtpInput,
  PrimaryButton,
  ScreenContainer,
} from "../../components/ui";
import { colors, font, radius, spacing } from "../../theme/theme";

const RESEND_SECONDS = 120;
const CODE_LENGTH = 6;
const arNum = (value) => Number(value).toLocaleString("ar-EG");

const COPY = {
  verify: {
    title: "تأكيد رقم الهاتف",
    body: "أدخل رمز التحقق المرسل إلى رقمك لتفعيل الحساب.",
    button: "تأكيد الرقم",
    Icon: ChatCircleDots,
  },
  recovery: {
    title: "رمز استعادة كلمة المرور",
    body: "أدخل الرمز المرسل إلى رقمك للانتقال إلى إنشاء كلمة مرور جديدة.",
    button: "متابعة",
    Icon: ShieldCheck,
  },
  restore: {
    title: "استعادة الحساب",
    body: "أدخل رمز التحقق المرسل إلى رقمك لإعادة تفعيل الحساب.",
    button: "استعادة الحساب",
    Icon: ShieldCheck,
  },
};

export default function OtpScreen({
  mode = "verify",
  phone,
  onConfirm,
  onBack,
  onResend,
  onChangePhone,
  onSupport,
  loading = false,
  serverError = "",
}) {
  const [code, setCode] = useState("");
  // العدّ يُشتقّ من موعد نهائي بالساعة الحقيقية، لا من سلسلة setTimeout
  // تنقص عدّاداً: السلسلة تتسارع إن تعدّدت المؤقّتات (وهو ما حدث فعلاً —
  // نزل العدّاد أسرع من الزمن الحقيقي)، وتتجمّد إن ذهب التطبيق للخلفية.
  // الاشتقاق من الوقت مناعة ضد الحالتين معاً.
  const [deadline, setDeadline] = useState(() => Date.now() + RESEND_SECONDS * 1000);
  const [now, setNow] = useState(() => Date.now());
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  const [failures, setFailures] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const copy = COPY[mode] || COPY.verify;
  const Icon = copy.Icon;

  // العدّاد بالأرقام العربية كبقية أرقام التطبيق
  const minutes = Math.floor(seconds / 60);
  const timer = `${arNum(minutes)}:${arNum(seconds % 60).padStart(2, "٠")}`;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // كل خطأ خادم جديد = محاولة فاشلة. بعد محاولتين نفتح مساراً بديلاً بدل
  // ترك المستخدم يعيد الإدخال بلا أفق.
  const lastError = useRef("");
  useEffect(() => {
    if (serverError && serverError !== lastError.current) {
      lastError.current = serverError;
      setFailures((value) => value + 1);
    }
    if (!serverError) lastError.current = "";
  }, [serverError]);

  // تحقّق تلقائي عند اكتمال الخانات الست: الزر الإضافي خطوة بلا فائدة —
  // الرمز مكتمل يعني نيّة مؤكّدة. الحارس يمنع إطلاق طلبين لنفس الرمز.
  const submittedFor = useRef("");
  const confirm = useCallback(
    (value) => {
      if (loading || value.length !== CODE_LENGTH) return;
      if (submittedFor.current === value) return;
      submittedFor.current = value;
      onConfirm?.(value);
    },
    [loading, onConfirm]
  );

  useEffect(() => {
    if (code.length === CODE_LENGTH) confirm(code);
  }, [code, confirm]);

  const resend = () => {
    if (seconds > 0 || loading) return;
    setDeadline(Date.now() + RESEND_SECONDS * 1000);
    setCode("");
    submittedFor.current = "";
    onResend?.();
  };

  const helpActions = [
    { key: "resend", label: "إعادة إرسال الرمز", onPress: () => { setShowHelp(false); setDeadline(Date.now()); } },
    { key: "change", label: "تغيير رقم الهاتف", onPress: () => { setShowHelp(false); (onChangePhone || onBack)?.(); } },
  ];
  if (onSupport) {
    helpActions.push({ key: "support", label: "تواصل مع الدعم", onPress: () => { setShowHelp(false); onSupport(); } });
  }

  return (
    <ScreenContainer contentStyle={styles.content}>
      <AppHeader title="التحقق" onBack={onBack} />

      <View style={styles.iconWrap} aria-hidden>
        <Icon size={34} weight="fill" color={colors.primary} />
      </View>
      <Text style={styles.title} accessibilityRole="header">{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>

      {/* الوجهة صريحة ومعها مخرج فوري: الخطأ في الرقم سبب شائع جداً لعدم
          وصول الرمز، وإخفاء المخرج يحوّله إلى طريق مسدود. */}
      <Text style={styles.phone}>{phone ? `+963 ${phone}` : "+963 9XX XXX XXX"}</Text>
      <LinkText onPress={onChangePhone || onBack} style={styles.changeNumber}>
        تعديل الرقم
      </LinkText>

      <View style={styles.otpWrap}>
        <OtpInput value={code} onChange={setCode} error={!!serverError} />
      </View>
      <ErrorBanner message={serverError} style={styles.error} />

      <View style={styles.resendRow}>
        <Text style={styles.resendPrompt}>لم يصلك الرمز؟</Text>
        {seconds > 0 ? (
          // المؤقّت مرئي دائماً: زر معطّل بلا عدّ تنازلي يبدو معطوباً
          <Text style={styles.timer} accessibilityLabel={`إعادة الإرسال متاحة بعد ${timer}`}>
            إعادة الإرسال خلال {timer}
          </Text>
        ) : (
          <LinkText onPress={resend} style={styles.resendLink}>إعادة إرسال الرمز</LinkText>
        )}
      </View>

      {failures >= 2 ? (
        <View style={styles.helpRow}>
          <LinkText onPress={() => setShowHelp(true)} style={styles.helpLink}>
            ما زال الرمز لا يصل؟ خيارات أخرى
          </LinkText>
        </View>
      ) : null}

      <View style={styles.flex} />

      <View style={styles.securityNote}>
        <ShieldCheck size={17} weight="fill" color={colors.secondary} />
        <Text style={styles.securityText}>لا تشارك رمز التحقق مع أي شخص.</Text>
      </View>

      {/* الزر يبقى للتأكيد اليدوي (وللوصول بلوحة المفاتيح)، لكن المسار
          الطبيعي صار تلقائياً عند اكتمال الرمز. */}
      <PrimaryButton
        label={copy.button}
        onPress={() => confirm(code)}
        loading={loading}
        disabled={code.length !== CODE_LENGTH}
        accessibilityHint={
          code.length !== CODE_LENGTH ? `أدخل ${arNum(CODE_LENGTH)} أرقام لتفعيل الزر` : undefined
        }
      />

      <ActionSheet
        visible={showHelp}
        title="لم يصلك الرمز؟"
        message="جرّب أحد هذه الخيارات — لا داعي لإعادة المحاولة بلا جدوى."
        actions={helpActions}
        onCancel={() => setShowHelp(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { minHeight: "100%" },
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
  phone: { marginTop: spacing.sm, color: colors.primary, fontSize: font.size.body, fontWeight: "700", textAlign: "center", writingDirection: "ltr" },
  changeNumber: { fontSize: font.size.sm, textAlign: "center" },
  otpWrap: { marginTop: spacing.lg },
  error: { marginTop: spacing.md },
  resendRow: {
    minHeight: 48,
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  resendPrompt: { fontSize: font.size.xs, color: colors.textBody },
  timer: { fontSize: font.size.xs, color: colors.textMuted },
  resendLink: { fontSize: font.size.xs },
  helpRow: { alignItems: "center" },
  helpLink: { fontSize: font.size.xs },
  flex: { flex: 1, minHeight: spacing.xxl },
  securityNote: { minHeight: 44, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: spacing.md },
  securityText: { fontSize: font.size.xs, color: colors.textMuted },
});
