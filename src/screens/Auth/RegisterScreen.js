// ============================================================
//  RegisterScreen — ٥ · إنشاء حساب
//
//  أعلى نقطة تسرّب في أي تطبيق: كل حقل إضافي يكلّف مستخدمين، وكل رسالة خطأ
//  متأخّرة تكلّف أكثر. لذلك التحقّق هنا إرشادي لا عقابي — يظهر عند مغادرة
//  الحقل لا عند أول حرف، ويعرض التقدّم نحو كلمة مرور صالحة بدل رفضها.
//
//  props: { onSubmit, onLogin, loading, error, serverFieldErrors }
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, LockSimple, ShieldCheck, User, X } from "phosphor-react-native";
import Text from "../../components/AppText";
import {
  ErrorBanner,
  InputField,
  LinkText,
  PhoneField,
  PressableScale,
  PrimaryButton,
} from "../../components/ui";
import { colors, font, layout, radius, shadow, spacing } from "../../theme/theme";
import {
  PASSWORD_RULES,
  collectErrors,
  validateConfirm,
  validateFullName,
  validatePasswordStrength,
  validatePhone,
} from "../../services/validators";

// ترتيب الحقول في الشاشة — يحدّد أي حقل يستقبل التركيز أولاً عند رفض الخادم
const FIELD_ORDER = ["fullName", "phone", "password", "confirm", "terms"];

// ملخّص ما يفعله التطبيق بالبيانات. الرابط يجب أن يفتح نصاً حقيقياً — رابط
// لا يفتح شيئاً يجعل الموافقة بلا معنى قانوني ولا أخلاقي.
const TERMS_SECTIONS = [
  {
    title: "ما الذي نجمعه",
    body: "اسمك ورقم هاتفك لإنشاء الحساب والتواصل معك، وموقعك أثناء تنفيذ الطلب فقط.",
  },
  {
    title: "فيمَ نستخدمه",
    body: "لمطابقة طلبك مع أقرب فني متاح، ولتمكينه من الوصول إليك، وللتواصل بشأن الطلب.",
  },
  {
    title: "ما الذي لا نفعله",
    body: "لا نبيع بياناتك لأي طرف ثالث، ولا نقرأ موقعك خارج أوقات الطلبات النشطة.",
  },
  {
    title: "حقوقك",
    body: "يمكنك تعطيل حسابك أو حذفه في أي وقت من «الحساب»، وتُحذف بياناتك وفق المدّة المعلنة.",
  },
];

export default function RegisterScreen({
  onSubmit,
  onLogin,
  loading = false,
  error = "",
  serverFieldErrors = {},
}) {
  const insets = useSafeAreaInsets();
  const [agree, setAgree] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [attempted, setAttempted] = useState(false);
  const [passwordActive, setPasswordActive] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const scrollRef = useRef(null);
  const inputRefs = useRef({});
  const fieldTops = useRef({});
  const submitRef = useRef(false);

  const validateAll = useCallback(
    () => ({
      fullName: validateFullName(fullName),
      phone: validatePhone(phone),
      password: validatePasswordStrength(password),
      confirm: validateConfirm(confirm, password),
    }),
    [fullName, phone, password, confirm]
  );

  // إعادة التحقّق أثناء الكتابة تحدث فقط بعد أن لمس المستخدم الحقل أو حاول
  // الإرسال: إظهار الخطأ عند أول حرف يشعر المستخدم بالمعاقبة على الكتابة.
  const revalidate = (key, nextValues = {}) => {
    if (!touched[key] && !attempted) return;
    const values = { fullName, phone, password, confirm, ...nextValues };
    const rules = {
      fullName: () => validateFullName(values.fullName),
      phone: () => validatePhone(values.phone),
      password: () => validatePasswordStrength(values.password),
      confirm: () => validateConfirm(values.confirm, values.password),
    };
    setFieldErrors((prev) => ({ ...prev, [key]: rules[key]() }));
  };

  const onBlurField = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setFieldErrors((prev) => ({ ...prev, [key]: validateAll()[key] }));
  };

  const clearError = () => setLocalError("");

  // ينقل التركيز والتمرير إلى أول حقل مرفوض — بدونه قد يكون الحقل الخاطئ
  // خارج الشاشة تماماً فيبدو الرفض بلا سبب
  const focusField = useCallback((key) => {
    const top = fieldTops.current[key];
    if (typeof top === "number") {
      scrollRef.current?.scrollTo({ y: Math.max(top - spacing.xxl, 0), animated: true });
    }
    inputRefs.current[key]?.focus?.();
  }, []);

  // أخطاء الخادم: تُوزَّع على حقولها بدل رسالة واحدة عامة أعلى النموذج
  useEffect(() => {
    const keys = Object.keys(serverFieldErrors || {});
    if (!keys.length) return;
    setFieldErrors((prev) => ({ ...prev, ...serverFieldErrors }));
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(keys.map((key) => [key, true])) }));
    const first = FIELD_ORDER.find((key) => keys.includes(key));
    if (first) focusField(first);
  }, [serverFieldErrors, focusField]);

  const rulesState = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(password) })),
    [password]
  );
  const metRequired = rulesState.filter((rule) => rule.required && rule.met).length;
  const totalRequired = rulesState.filter((rule) => rule.required).length;
  const confirmMatches = confirm.length > 0 && confirm === password;

  const submit = () => {
    // حارس مزدوج: تعطيل الزر يعتمد على setState غير المتزامن، فالنقر المزدوج
    // السريع قد يمرّ قبل إعادة الرسم
    if (loading || submitRef.current) return;
    setAttempted(true);
    const { errors, valid } = collectErrors(validateAll());
    setTouched({ fullName: true, phone: true, password: true, confirm: true });
    setFieldErrors(errors);

    if (!valid) {
      const first = FIELD_ORDER.find((key) => errors[key]);
      setLocalError("");
      if (first) focusField(first);
      return;
    }
    // رسالة صريحة بدل زر معطّل صامت: التعطيل بلا تفسير يترك المستخدم يضغط
    // بلا نتيجة ولا يعرف السبب
    if (!agree) {
      setLocalError("للمتابعة، وافق على الشروط وسياسة الخصوصية.");
      focusField("terms");
      return;
    }
    clearError();
    submitRef.current = true;
    onSubmit?.({
      fullName: fullName.trim(),
      phone,
      password,
      isTermsAccepted: agree,
    });
    // نُحرّر الحارس بعد دورة الحدث: الحماية الفعلية أثناء الطلب من loading
    setTimeout(() => {
      submitRef.current = false;
    }, 0);
  };

  const showRules = passwordActive || password.length > 0;
  const termsError = attempted && !agree;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <View style={styles.brand}>
          <Image
            source={require("../../../assets/carhero-app-icon.png")}
            style={styles.logo}
            alt=""
            aria-hidden
          />
          <Text style={styles.brandName}>Car Hero</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.title} accessibilityRole="header">إنشاء حساب</Text>
          <Text style={styles.subtitle}>
            أربعة حقول فقط، ثم تصبح جاهزاً لطلب المساعدة في أي وقت.
          </Text>
        </View>

        <View style={styles.form}>
          <InputField
            ref={(node) => { inputRefs.current.fullName = node; }}
            onLayout={(event) => { fieldTops.current.fullName = event.nativeEvent.layout.y; }}
            label="الاسم الكامل"
            placeholder="مثال: أحمد محمد"
            value={fullName}
            onChangeText={(value) => {
              setFullName(value);
              clearError();
              revalidate("fullName", { fullName: value });
            }}
            onBlur={() => onBlurField("fullName")}
            error={fieldErrors.fullName}
            textContentType="name"
            autoComplete="name"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => inputRefs.current.phone?.focus?.()}
            icon={<User size={20} color={colors.primary} />}
          />

          <PhoneField
            ref={(node) => { inputRefs.current.phone = node; }}
            onLayout={(event) => { fieldTops.current.phone = event.nativeEvent.layout.y; }}
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              clearError();
              revalidate("phone", { phone: value });
            }}
            onBlur={() => onBlurField("phone")}
            error={fieldErrors.phone}
            // الصيغة المتوقّعة تُشرح قبل الخطأ لا بعده
            helper="٩ أرقام تبدأ بـ ٩ — مثال: 991234567"
            textContentType="telephoneNumber"
            autoComplete="tel"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => inputRefs.current.password?.focus?.()}
          />

          <View>
            <InputField
              ref={(node) => { inputRefs.current.password = node; }}
              onLayout={(event) => { fieldTops.current.password = event.nativeEvent.layout.y; }}
              label="كلمة المرور"
              placeholder="٨ رموز على الأقل"
              secure
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                clearError();
                revalidate("password", { password: value });
                revalidate("confirm", { password: value });
              }}
              onFocus={() => setPasswordActive(true)}
              onBlur={() => {
                setPasswordActive(false);
                onBlurField("password");
              }}
              error={fieldErrors.password}
              textContentType="newPassword"
              autoComplete="new-password"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => inputRefs.current.confirm?.focus?.()}
              icon={<LockSimple size={20} color={colors.primary} />}
            />

            {/* قائمة حيّة تُشطب مع الكتابة: ترشد نحو كلمة مرور صالحة أثناء
                تأليفها، بدل رسالة رفض عامة تصل بعد فوات الأوان. */}
            {showRules ? (
              <View
                style={styles.rules}
                accessibilityLiveRegion="polite"
                accessibilityLabel={`استوفيت ${metRequired} من ${totalRequired} شروط إلزامية`}
              >
                {rulesState.map((rule) => (
                  <View key={rule.key} style={styles.ruleRow}>
                    <View style={[styles.ruleMark, rule.met && styles.ruleMarkMet]}>
                      {rule.met ? <Check size={11} weight="bold" color={colors.onPrimary} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.ruleText,
                        rule.met && styles.ruleTextMet,
                        !rule.required && styles.ruleTextOptional,
                      ]}
                    >
                      {rule.required ? rule.label : `${rule.label} — يزيد الأمان`}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View>
            <InputField
              ref={(node) => { inputRefs.current.confirm = node; }}
              onLayout={(event) => { fieldTops.current.confirm = event.nativeEvent.layout.y; }}
              label="تأكيد كلمة المرور"
              placeholder="أعد إدخال كلمة المرور"
              secure
              value={confirm}
              onChangeText={(value) => {
                setConfirm(value);
                clearError();
                revalidate("confirm", { confirm: value });
              }}
              onBlur={() => onBlurField("confirm")}
              error={fieldErrors.confirm}
              textContentType="newPassword"
              autoComplete="new-password"
              onSubmitEditing={submit}
              returnKeyType="done"
              icon={<LockSimple size={20} color={colors.primary} />}
            />
            {/* التطابق يُؤكَّد لحظياً: انتظار الإرسال ليقول «غير متطابقتين»
                يجعل المستخدم يعيد كتابة الحقلين معاً بلا داعٍ. */}
            {confirmMatches ? (
              <View style={styles.matchRow} accessibilityLiveRegion="polite">
                <Check size={13} weight="bold" color={colors.success} />
                <Text style={styles.matchText}>كلمتا المرور متطابقتان</Text>
              </View>
            ) : null}
          </View>

          <View
            onLayout={(event) => { fieldTops.current.terms = event.nativeEvent.layout.y; }}
          >
            <View style={styles.consentRow}>
              {/* المربّع وحده هو مفتاح التبديل (هدف لمس ٤٤)، والنص يحمل رابطاً
                  حقيقياً — دمجهما كان يجعل فتح الشروط مستحيلاً بلا تبديل. */}
              <PressableScale
                onPress={() => {
                  setAgree((value) => !value);
                  clearError();
                }}
                style={styles.checkboxTarget}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agree }}
                accessibilityLabel="الموافقة على الشروط وسياسة الخصوصية"
              >
                <View style={[styles.checkbox, agree && styles.checkboxChecked, termsError && styles.checkboxError]}>
                  {agree ? <Check size={15} weight="bold" color={colors.onPrimary} /> : null}
                </View>
              </PressableScale>
              <Text style={styles.consentText}>
                أوافق على{" "}
                <LinkText onPress={() => setShowTerms(true)}>الشروط وسياسة الخصوصية</LinkText>
              </Text>
            </View>
            {termsError ? (
              <Text style={styles.consentError} accessibilityRole="alert">
                يجب الموافقة على الشروط للمتابعة
              </Text>
            ) : null}
          </View>

          <ErrorBanner message={localError || error} />
          <PrimaryButton label="إنشاء الحساب" onPress={submit} loading={loading} />

          <View style={styles.secureRow}>
            <ShieldCheck size={16} weight="fill" color={colors.success} />
            <Text style={styles.secureText}>بياناتك مشفّرة ومحفوظة بأمان</Text>
          </View>
          <Text style={styles.loginPrompt}>
            لديك حساب؟ <LinkText onPress={onLogin}>تسجيل الدخول</LinkText>
          </Text>
        </View>
      </ScrollView>

      {/* لوحة الشروط داخل الشاشة: Alert.alert ميت على الويب، وفتح متصفّح
          خارجي في منتصف التسجيل يفقد المستخدم ما كتبه. */}
      {showTerms ? (
        <View style={styles.sheetOverlay} accessibilityViewIsModal>
          <Pressable
            style={styles.sheetBackdrop}
            accessibilityRole="button"
            accessibilityLabel="إغلاق"
            onPress={() => setShowTerms(false)}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} accessibilityRole="header">
                ملخّص الشروط وسياسة الخصوصية
              </Text>
              <PressableScale
                onPress={() => setShowTerms(false)}
                style={styles.sheetClose}
                accessibilityRole="button"
                accessibilityLabel="إغلاق"
              >
                <X size={18} weight="bold" color={colors.textBody} />
              </PressableScale>
            </View>
            <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
              {TERMS_SECTIONS.map((section) => (
                <View key={section.title} style={styles.termsSection}>
                  <Text style={styles.termsTitle}>{section.title}</Text>
                  <Text style={styles.termsBody}>{section.body}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
  content: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.screenH,
  },
  brand: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  logo: { width: 54, height: 54, borderRadius: radius.md },
  brandName: { fontSize: font.size.title, fontWeight: "700", color: colors.primary },
  intro: { alignItems: "flex-end", marginTop: spacing.xxl },
  title: { fontSize: font.size.h1, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  subtitle: {
    maxWidth: 380,
    marginTop: spacing.xs,
    fontSize: font.size.sm,
    color: colors.textMuted,
    lineHeight: 23,
    textAlign: "right",
  },
  form: { gap: spacing.lg, marginTop: spacing.xl },

  rules: { marginTop: spacing.sm, gap: 6 },
  ruleRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  ruleMark: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderInput,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleMarkMet: { backgroundColor: colors.success, borderColor: colors.success },
  ruleText: { fontSize: font.size.xs, color: colors.textBody, textAlign: "right" },
  // الشطب + الأيقونة + اللون: ثلاث إشارات، فلا تعتمد الحالة على اللون وحده
  ruleTextMet: { color: colors.textMuted2, textDecorationLine: "line-through" },
  ruleTextOptional: { color: colors.textMuted2 },

  matchRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 6,
  },
  matchText: { fontSize: font.size.xs, color: colors.success, fontWeight: "600" },

  consentRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  checkboxTarget: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkboxError: { borderColor: colors.danger },
  consentText: {
    flex: 1,
    fontSize: font.size.sm,
    color: colors.textBody,
    lineHeight: 22,
    textAlign: "right",
  },
  consentError: {
    marginTop: 2,
    fontSize: font.size.xs,
    color: colors.danger,
    textAlign: "right",
  },

  secureRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  secureText: { color: colors.textMuted, fontSize: font.size.xs },
  loginPrompt: { color: colors.textBody, fontSize: font.size.sm, textAlign: "center" },

  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    zIndex: 100,
  },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheetCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "80%",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.card,
  },
  sheetHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sheetTitle: { flex: 1, fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  sheetClose: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: { flexGrow: 0 },
  termsSection: { marginBottom: spacing.md },
  termsTitle: { fontSize: font.size.md, fontWeight: "700", color: colors.textHeading, textAlign: "right" },
  termsBody: {
    marginTop: 2,
    fontSize: font.size.sm,
    color: colors.textBody,
    lineHeight: 22,
    textAlign: "right",
  },
});
