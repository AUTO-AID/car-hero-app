// ============================================================
//  LoginScreen — ٤ · تسجيل الدخول
//
//  بوابة قد يقف عندها مستخدم في حالة طوارئ: كل احتكاك هنا يُترجَم مباشرة
//  إلى مستخدم لم يحصل على المساعدة. لذلك المسار كلّه قابل للإنجاز بلوحة
//  المفاتيح وحدها، ومدير كلمات المرور مُفعَّل، والخطأ يقول ما يجب فعله.
//
//  props: { onSubmit, onForgotPassword, onRegister, loading, error, errorKind }
// ============================================================
import React, { useCallback, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LockSimple } from "phosphor-react-native";
import Text from "../../components/AppText";
import {
  ErrorBanner,
  InputField,
  LinkText,
  OutlineButton,
  PhoneField,
  PrimaryButton,
} from "../../components/ui";
import { colors, font, layout, spacing } from "../../theme/theme";
import { collectErrors, validatePasswordPresent, validatePhone } from "../../services/validators";

export default function LoginScreen({
  onSubmit,
  onForgotPassword,
  onRegister,
  loading = false,
  error = "",
  errorKind = "",
}) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [attempted, setAttempted] = useState(false);

  const inputRefs = useRef({});
  const submitRef = useRef(false);

  const validateAll = useCallback(
    () => ({ phone: validatePhone(phone), password: validatePasswordPresent(password) }),
    [phone, password]
  );

  const revalidate = (key, nextValues = {}) => {
    if (!touched[key] && !attempted) return;
    const values = { phone, password, ...nextValues };
    const message =
      key === "phone" ? validatePhone(values.phone) : validatePasswordPresent(values.password);
    setFieldErrors((prev) => ({ ...prev, [key]: message }));
  };

  const onBlurField = (key) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setFieldErrors((prev) => ({ ...prev, [key]: validateAll()[key] }));
  };

  const submit = useCallback(() => {
    // الحارس المرجعي لا يكفيه تعطيل الزر: `loading` حالة غير متزامنة، والنقر
    // المتكرر السريع يمرّ قبل إعادة الرسم فيُطلق طلبات متعدّدة.
    if (loading || submitRef.current) return;
    setAttempted(true);
    const { errors, valid } = collectErrors(validateAll());
    setTouched({ phone: true, password: true });
    setFieldErrors(errors);
    if (!valid) {
      // الخطأ يبقى تحت حقله ولا يُكرَّر في الشريط العلوي: تكراره يجعل
      // المستخدم يبحث عن خطأين بينما الخطأ واحد.
      inputRefs.current[errors.phone ? "phone" : "password"]?.focus?.();
      return;
    }
    submitRef.current = true;
    onSubmit?.({ phone, password });
    setTimeout(() => {
      submitRef.current = false;
    }, 0);
  }, [loading, validateAll, onSubmit, phone, password]);

  const isNetworkError = errorKind === "network";

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <Image
            source={require("../../../assets/carhero-logo.png")}
            style={styles.logo}
            accessibilityLabel="Car Hero"
          />
        </View>

        <View style={styles.intro}>
          <Text style={styles.title} accessibilityRole="header">مرحباً بعودتك</Text>
          <Text style={styles.subtitle}>سجّل الدخول للوصول إلى خدمات سيارتك وطلباتك.</Text>
        </View>

        <View style={styles.form}>
          <PhoneField
            ref={(node) => { inputRefs.current.phone = node; }}
            value={phone}
            onChangeText={(value) => { setPhone(value); revalidate("phone", { phone: value }); }}
            onBlur={() => onBlurField("phone")}
            error={fieldErrors.phone}
            textContentType="telephoneNumber"
            autoComplete="tel"
            // التسلسل بلوحة المفاتيح: «التالي» ينقل إلى كلمة المرور بدل إغلاق
            // اللوحة. blurOnSubmit=false يمنع وميض إغلاقها ثم فتحها.
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => inputRefs.current.password?.focus?.()}
          />

          <View>
            <InputField
              ref={(node) => { inputRefs.current.password = node; }}
              label="كلمة المرور"
              placeholder="أدخل كلمة المرور"
              secure
              value={password}
              onChangeText={(value) => { setPassword(value); revalidate("password", { password: value }); }}
              onBlur={() => onBlurField("password")}
              error={fieldErrors.password}
              // autoComplete="password" يجعل مدير كلمات المرور يعرض الملء
              // ويقترح الحفظ بعد نجاح الدخول
              textContentType="password"
              autoComplete="password"
              // "go" لا "done": تُرسل النموذج مباشرة من اللوحة
              returnKeyType="go"
              onSubmitEditing={submit}
              icon={<LockSimple size={20} color={colors.primary} />}
            />
            <View style={styles.forgotRow}>
              {/* الرقم المكتوب يُمرَّر معه: شاشة الاستعادة تستقبله مملوءاً
                  بدل أن تطلبه من جديد بعد سطر واحد من كتابته. */}
              <LinkText onPress={() => onForgotPassword?.(phone)} style={styles.forgot}>
                نسيت كلمة المرور؟
              </LinkText>
            </View>
          </View>

          {/* خطأ الخادم وحده هنا. وصياغته لا تكشف أي الحقلين خاطئ (تعداد
              الحسابات ثغرة)، لكنها تفصل بوضوح بين «بيانات خاطئة» و«شبكة
              مقطوعة» — وإلا شكّ المستخدم في نفسه بينما المشكلة في الاتصال. */}
          <View>
            <ErrorBanner message={error} />
            {isNetworkError ? (
              <View style={styles.retryRow}>
                <LinkText onPress={submit} style={styles.retry}>إعادة المحاولة</LinkText>
              </View>
            ) : null}
          </View>

          <PrimaryButton label="تسجيل الدخول" onPress={submit} loading={loading} />

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.or}>أو</Text>
            <View style={styles.line} />
          </View>

          <OutlineButton label="إنشاء حساب جديد" onPress={onRegister} disabled={loading} />
        </View>

        <Text style={styles.privacy}>بالمتابعة أنت توافق على شروط الاستخدام وسياسة الخصوصية.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.screenH,
  },
  brand: { alignItems: "center" },
  // الشعار الأفقي يضمّ العلامة والاسم معاً؛ الارتفاع مشتقّ من نسبته الأصلية
  // فلا ينضغط الاسم ولا تتمدّد العلامة.
  logo: {
    width: layout.logoBrand,
    height: layout.logoBrand / layout.logoAspect,
    resizeMode: "contain",
  },
  intro: { marginTop: spacing.xxl, alignItems: "flex-end" },
  title: { fontSize: font.size.h1, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  subtitle: {
    maxWidth: 360,
    marginTop: spacing.sm,
    fontSize: font.size.sm,
    color: colors.textMuted,
    lineHeight: 23,
    textAlign: "right",
  },
  form: { marginTop: spacing.xxl, gap: spacing.lg },
  // minHeight 44 = الحد الأدنى لهدف اللمس؛ الرابط يملأ الصف رأسياً
  forgotRow: { alignItems: "flex-start", justifyContent: "center", minHeight: layout.touchTarget },
  forgot: { fontSize: font.size.sm },
  retryRow: { alignItems: "center", minHeight: layout.touchTarget, justifyContent: "center" },
  retry: { fontSize: font.size.sm },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.textMuted, fontSize: font.size.xs },
  privacy: {
    marginTop: "auto",
    paddingTop: spacing.xxl,
    color: colors.textMuted,
    fontSize: font.size.xxs,
    lineHeight: 19,
    textAlign: "center",
  },
});
