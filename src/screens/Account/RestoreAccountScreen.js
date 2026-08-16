// ============================================================
//  RestoreAccountScreen — ١٠ · استعادة الحساب
//
//  مسار نادر لكنه عالي الأثر العاطفي: مستخدم يظنّ أنه فقد بياناته. الوضوح
//  هنا أهم من الجمال — أن يعرف **بالضبط** ما سيعود إليه قبل أن يبدأ، وأن
//  يجد خطوة تالية في كل مسار فشل بدل إعادة محاولة بلا جدوى.
// ============================================================
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ClockCountdown,
  Headset,
  ListChecks,
  UserCircleCheck,
  WhatsappLogo,
} from "phosphor-react-native";
import Text from "../../components/AppText";
import {
  AppHeader,
  ErrorBanner,
  LinkText,
  OutlineButton,
  PhoneField,
  PrimaryButton,
  ScreenContainer,
} from "../../components/ui";
import { colors, font, radius, spacing } from "../../theme/theme";
import { validatePhone } from "../../services/validators";

const RETRY_SECONDS = 60;
const arNum = (value) => Number(value).toLocaleString("ar-EG");

// ما الذي يعود مع الحساب. الغموض هنا يولّد شكوى دعم مباشرة، والتصريح به
// قبل البدء أرخص من شرحه بعد الاستعادة.
const RESTORED = [
  "طلباتك السابقة وسجلّها كاملاً",
  "مركباتك المحفوظة وبياناتها",
  "رصيد محفظتك ونقاط الوفاء",
  "عناوينك وطرق الدفع المحفوظة",
];

// فشل نهائي لا تنفع معه إعادة المحاولة → يحتاج مساراً مختلفاً لا رسالة خطأ
const UNRECOVERABLE = /انتهت مهلة|غير قابل للاستعادة|لا يوجد حساب|محذوف نهائ|not found|expired/i;

export default function RestoreAccountScreen({
  onSubmit,
  onBack,
  onCreateNew,
  onSupport,
  navigation,
  initialPhone = "",
  restoreWindowDays,
  daysRemaining,
  loading = false,
  error = "",
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [phoneError, setPhoneError] = useState("");
  const [touched, setTouched] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const cooldown = Math.max(0, Math.ceil((deadline - now) / 1000));
  const submitRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const back = () => (onBack ? onBack() : navigation?.goBack?.());

  const submit = () => {
    if (loading || submitRef.current || cooldown > 0) return;
    const message = validatePhone(phone);
    setTouched(true);
    setPhoneError(message);
    if (message) return;
    submitRef.current = true;
    setDeadline(Date.now() + RETRY_SECONDS * 1000);
    onSubmit?.({ phone });
    setTimeout(() => {
      submitRef.current = false;
    }, 0);
  };

  const blocked = UNRECOVERABLE.test(error || "");

  return (
    <ScreenContainer contentStyle={styles.content}>
      <AppHeader title="استعادة الحساب" onBack={back} />

      <View style={styles.badge} aria-hidden>
        <UserCircleCheck size={48} weight="fill" color={blocked ? colors.danger : colors.primary} />
      </View>

      {blocked ? (
        // مسار الفشل النهائي: لا نُبقي المستخدم يعيد إدخال الرقم بلا جدوى —
        // نقول الحقيقة ونعرض الخطوتين الوحيدتين المتاحتين فعلاً.
        <>
          <Text style={styles.title} accessibilityRole="header">تعذّرت استعادة هذا الحساب</Text>
          <Text style={styles.sub}>
            انتهت مهلة الاستعادة أو أن الحساب لم يعد قابلاً للإرجاع. لا تُعاد المحاولة بلا
            جدوى — أمامك مساران:
          </Text>
          <ErrorBanner message={error} style={styles.banner} />
          <View style={styles.blockedActions}>
            <PrimaryButton label="إنشاء حساب جديد" onPress={() => onCreateNew?.()} />
            <OutlineButton
              label="تواصل مع الدعم"
              icon={<Headset size={18} weight="fill" color={colors.primary} />}
              onPress={() => onSupport?.()}
            />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title} accessibilityRole="header">استعادة حسابك</Text>
          <Text style={styles.sub}>
            حسابك معطّل حالياً ولم يُحذف. أدخل رقمك وسنرسل رمز تحقّق لإعادة تفعيله.
          </Text>

          {/* ما يُستعاد بدقة — قبل أن يبدأ لا بعد أن ينتهي */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <ListChecks size={17} weight="fill" color={colors.success} />
              <Text style={styles.cardTitle}>ما الذي يعود إليك</Text>
            </View>
            {RESTORED.map((item) => (
              <View key={item} style={styles.itemRow}>
                <View style={styles.dot} />
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
            <Text style={styles.cardNote}>
              يعود الحساب كما تركته. الجلسات المفتوحة سابقاً على أجهزتك تبقى منتهية،
              فستحتاج تسجيل الدخول من جديد.
            </Text>
          </View>

          {/* المهلة تُعرض فقط إن كانت معلومة — اختراع رقم هنا وعدٌ قد يُخلَف */}
          {daysRemaining != null || restoreWindowDays != null ? (
            <View style={styles.deadlineRow}>
              <ClockCountdown size={16} weight="fill" color={colors.warning} />
              <Text style={styles.deadlineText}>
                {daysRemaining != null
                  ? `يتبقّى ${arNum(daysRemaining)} يوماً على انتهاء مهلة الاستعادة.`
                  : `يمكن استعادة الحساب خلال ${arNum(restoreWindowDays)} يوماً من التعطيل.`}
              </Text>
            </View>
          ) : null}

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
            <View style={styles.channel}>
              <WhatsappLogo size={15} weight="fill" color={colors.success} />
              <Text style={styles.channelText}>يصل رمز التحقّق عبر واتساب</Text>
            </View>
            <ErrorBanner message={error} />
          </View>

          <View style={styles.flex} />

          <PrimaryButton
            label={cooldown > 0 ? `إعادة الإرسال خلال ${arNum(cooldown)} ثانية` : "إرسال رمز الاستعادة"}
            onPress={submit}
            loading={loading}
            disabled={cooldown > 0}
          />
        </>
      )}

      {/* مخرج للدعم ظاهر في كل الحالات — لا في حالة الفشل وحدها */}
      {onSupport ? (
        <LinkText onPress={onSupport} style={styles.supportLink}>
          تحتاج مساعدة؟ تواصل مع الدعم
        </LinkText>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { minHeight: "100%" },
  badge: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: spacing.lg,
  },
  title: {
    marginTop: spacing.lg,
    textAlign: "center",
    fontSize: font.size.title,
    fontWeight: "700",
    color: colors.textDark,
  },
  sub: {
    maxWidth: 400,
    alignSelf: "center",
    marginTop: spacing.sm,
    textAlign: "center",
    fontSize: font.size.sm,
    color: colors.textBody,
    lineHeight: 24,
  },

  card: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  cardTitle: { fontSize: font.size.md, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  itemRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  dot: { width: 5, height: 5, borderRadius: radius.pill, backgroundColor: colors.success },
  itemText: { flex: 1, fontSize: font.size.sm, color: colors.textBody, lineHeight: 22, textAlign: "right" },
  cardNote: {
    marginTop: spacing.xs,
    fontSize: font.size.xs,
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: "right",
  },

  deadlineRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    backgroundColor: colors.warningBg,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  deadlineText: { flex: 1, fontSize: font.size.xs, color: colors.warning, lineHeight: 20, textAlign: "right" },

  form: { marginTop: spacing.xl, gap: spacing.md },
  channel: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs },
  channelText: { fontSize: font.size.xs, color: colors.textMuted },
  banner: { marginTop: spacing.lg },
  blockedActions: { marginTop: spacing.xl, gap: spacing.md },
  flex: { flex: 1, minHeight: spacing.xl },
  supportLink: { marginTop: spacing.lg, textAlign: "center", fontSize: font.size.sm },
});
