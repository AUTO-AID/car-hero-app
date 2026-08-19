// ============================================================
//  ForgotPasswordScreen — ٧ · استعادة كلمة المرور
//
//  المستخدم هنا محبط بالفعل (فشل دخوله). كل احتكاك إضافي يضاعف الإحباط،
//  وأول احتكاك يمكن إلغاؤه هو إجباره على إعادة كتابة رقم كتبه قبل ثانية.
// ============================================================
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { LockKey, PaperPlaneTilt, WhatsappLogo } from "phosphor-react-native";
import Text from "../../components/AppText";
import {
  AppHeader,
  ErrorBanner,
  LinkText,
  PhoneField,
  PrimaryButton,
  ScreenContainer,
} from "../../components/ui";
import { colors, font, radius, spacing } from "../../theme/theme";
import { validatePhone } from "../../services/validators";

const RETRY_SECONDS = 60;
const arNum = (value) => Number(value).toLocaleString("ar-EG");

// أي رسالة تكشف وجود الحساب من عدمه تُسقَط بالكامل، ولا تُستبدل بصياغة
// محايدة: البديل المحايد يقول ما تقوله ملاحظة الخصوصية الثابتة أسفل الشاشة
// حرفياً، فيظهر النصّ نفسه مرّتين — ومرّةً منهما داخل شريط أحمر دوره الإنذار،
// فيُقرأ «تمّ الإرسال» على أنه فشل. الإسقاط يجعل مسار «رقم غير مسجّل» مطابقاً
// تماماً لمسار النجاح (عدّاد تنازلي بلا إنذار)، وهو المطلوب أمنياً أصلاً.
// تمرّ بقيّة الأخطاء (انقطاع الشبكة، تجاوز الحدّ، عطل الخادم) كما هي — إخفاؤها
// يترك المستخدم أمام زر لا يستجيب بلا سبب.
const REVEALS_ACCOUNT = /لا يوجد حساب|غير مسجّل|غير مسجل|not found/i;
const withoutAccountReveal = (message) =>
  message && REVEALS_ACCOUNT.test(message) ? "" : message;

export default function ForgotPasswordScreen({
  onSubmit,
  onBack,
  onLogin,
  initialPhone = "",
  loading = false,
  error = "",
}) {
  // استمرارية السياق: الرقم المكتوب في شاشة الدخول يصل مملوءاً مسبقاً.
  // إجباره على إعادة الكتابة إهدار متعمّد لجهده في أسوأ لحظة.
  const [phone, setPhone] = useState(initialPhone);
  const [phoneError, setPhoneError] = useState("");
  const [touched, setTouched] = useState(false);
  // موعد نهائي بالساعة الحقيقية لا سلسلة setTimeout: الأخيرة تتسارع إن
  // تعدّدت المؤقّتات وتتجمّد في الخلفية (رُصد فعلياً في شاشة الرمز).
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const cooldown = Math.max(0, Math.ceil((deadline - now) / 1000));
  const submitRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const visibleError = withoutAccountReveal(error);

  const submit = () => {
    if (loading || submitRef.current || cooldown > 0) return;
    const message = validatePhone(phone);
    setTouched(true);
    setPhoneError(message);
    // الخطأ يبقى تحت الحقل ولا يُكرَّر في الشريط العلوي
    if (message) return;
    submitRef.current = true;
    setDeadline(Date.now() + RETRY_SECONDS * 1000);
    onSubmit?.({ phone });
    setTimeout(() => {
      submitRef.current = false;
    }, 0);
  };

  return (
    <ScreenContainer contentStyle={styles.content}>
      <AppHeader title="استعادة كلمة المرور" onBack={onBack} />
      <View style={styles.iconWrap} aria-hidden>
        <LockKey size={34} weight="fill" color={colors.primary} />
      </View>
      <Text style={styles.title} accessibilityRole="header">نسيت كلمة المرور؟</Text>

      {/* التوقّع يُشرح قبل الضغط لا بعده: معرفة القناة والوجهة تمنع القلق
          («هل وصل؟ إلى أين؟») وتقلّل الضغط المتكرر على الزر. */}
      <Text style={styles.body}>
        أدخل رقمك المسجّل وسنرسل رمزاً مكوّناً من {arNum(6)} أرقام عبر واتساب.
      </Text>

      <View style={styles.channel}>
        <WhatsappLogo size={16} weight="fill" color={colors.success} />
        <Text style={styles.channelText}>يصل الرمز عبر واتساب خلال دقيقة عادةً</Text>
      </View>

      <View style={styles.form}>
        <PhoneField
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            if (touched) setPhoneError(validatePhone(value));
          }}
          onBlur={() => { setTouched(true); setPhoneError(validatePhone(phone)); }}
          error={phoneError}
          textContentType="telephoneNumber"
          autoComplete="tel"
          onSubmitEditing={submit}
          returnKeyType="send"
        />
        {/* لا نعرض رسالة «لا يوجد حساب» حتى لو أرسلها الخادم: عرضها يحوّل
            الشاشة إلى أداة تعداد حسابات مجانية. والإصلاح الجذري في الخادم
            بأن يردّ ٢٠٠ محايداً دائماً. */}
        <ErrorBanner message={visibleError} />
      </View>

      <View style={styles.flex} />

      <PrimaryButton
        label={cooldown > 0 ? `إعادة الإرسال خلال ${arNum(cooldown)} ثانية` : "إرسال رمز التحقق"}
        icon={cooldown > 0 ? null : <PaperPlaneTilt size={18} weight="fill" color={colors.onPrimary} />}
        onPress={submit}
        loading={loading}
        disabled={cooldown > 0}
        // التعطيل مصحوب بسببه دائماً: العدّ التنازلي في نصّ الزر نفسه
        accessibilityHint={cooldown > 0 ? "أُرسل الرمز بالفعل، انتظر انتهاء العدّ" : undefined}
      />

      {/* صياغة محايدة لا تكشف إن كان الرقم مسجّلاً — تعداد الحسابات ثغرة
          أمنية، والرسالة الصريحة «لا يوجد حساب» تمنح المهاجم تأكيداً مجانياً. */}
      <Text style={styles.privacyNote}>
        إن كان الرقم مسجّلاً لدينا فسيصلك الرمز. لا نكشف حالة أي رقم.
      </Text>

      <LinkText onPress={onLogin} style={styles.loginLink}>العودة لتسجيل الدخول</LinkText>
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
    marginTop: spacing.xxl,
  },
  title: { marginTop: spacing.xl, textAlign: "center", fontSize: font.size.title, fontWeight: "700", color: colors.textDark },
  body: { maxWidth: 370, alignSelf: "center", marginTop: spacing.sm, textAlign: "center", fontSize: font.size.sm, color: colors.textBody, lineHeight: 24 },
  channel: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  channelText: { fontSize: font.size.xs, color: colors.textMuted },
  form: { marginTop: spacing.xl, gap: spacing.md },
  flex: { flex: 1, minHeight: spacing.xl },
  privacyNote: {
    marginTop: spacing.md,
    textAlign: "center",
    fontSize: font.size.xs,
    color: colors.textMuted,
    lineHeight: 20,
  },
  loginLink: { marginTop: spacing.sm, textAlign: "center", fontSize: font.size.sm },
});
