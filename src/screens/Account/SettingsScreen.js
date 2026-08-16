// ============================================================
//  SettingsScreen — ٤٠ · الإعدادات
//
//  المفتاح الغامض يُطفأ احتياطاً — ومن يُطفئ «الإشعارات» ظنّاً أنها عروض
//  يفقد «الفني وصل». لذلك كل مفتاح هنا يقول **ما الذي يصل عبره بالضبط**،
//  ويُذكَر صراحةً أن تحديثات الطلب الحرجة تبقى داخل التطبيق مهما أُطفئ.
//
//  حدود ما يدعمه الخادم (مُتحقَّق منها): `preferences.notifications` يحوي
//  ثلاث قنوات فقط — `push` و`sms` و`email` — و`forbidNonWhitelisted` يردّ
//  أي مفتاح آخر. والدافع (`notifications.service`) يحترم `push` فعلياً.
//  الفصل بين «تحديثات الطلب» و«العروض» يحتاج حقلين جديدين + احترامهما في
//  الإرسال، فلا نعرض مفتاحاً يُخزَّن ولا يُطبَّق.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Switch, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import {
  CaretLeft,
  ChatText,
  CreditCard,
  DeviceMobile,
  EnvelopeSimple,
  Info,
  ShieldCheck,
  SignOut,
  Trash,
  UserCircleGear,
  WarningCircle,
} from "phosphor-react-native";
import {
  AppHeader,
  ConfirmSheet,
  ErrorBanner,
  OutlineButton,
  PressableScale,
  SectionHeader,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { deleteAccount, updateProfile } from "../../services/usersApi";
import { colors, font, layout, radius, spacing } from "../../theme/theme";

const DEFAULT_NOTIFICATIONS = { push: true, sms: true, email: false };
const arDigits = (value) => String(value ?? "").replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);

/** قنوات التسليم — الوصف يذكر المحتوى الفعلي لا اسم القناة */
const CHANNELS = [
  {
    key: "push",
    label: "إشعارات التطبيق",
    Icon: DeviceMobile,
    description: "وصول الفني، تغيّر حالة الطلب، ورسائل المحادثة — أسرع قناة وأهمّها.",
    warning: "إطفاؤها يعني ألا يصلك تنبيه لحظي عند وصول الفني.",
  },
  {
    key: "sms",
    label: "الرسائل النصية",
    Icon: ChatText,
    description: "رموز التحقّق وتأكيد الطلبات على رقم هاتفك، وتعمل بلا إنترنت.",
  },
  {
    key: "email",
    label: "البريد الإلكتروني",
    Icon: EnvelopeSimple,
    description: "ملخّصات الحساب والفواتير الشهرية.",
  },
];

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { signOut, updateUser, user } = useAuth();
  const toast = useToast();

  const [notifications, setNotifications] = useState({
    ...DEFAULT_NOTIFICATIONS,
    ...(user?.preferences?.notifications || {}),
  });
  const [savingKey, setSavingKey] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    setNotifications({ ...DEFAULT_NOTIFICATIONS, ...(user?.preferences?.notifications || {}) });
  }, [user?.preferences?.notifications]);

  // إذن النظام يعلو على أي مفتاح داخل التطبيق: إن كان مرفوضاً على مستوى
  // المتصفّح/الجهاز فالمفتاح المفعّل يكذب على المستخدم.
  const systemBlocked = useMemo(() => {
    if (Platform.OS !== "web") return false;
    try { return globalThis.Notification?.permission === "denied"; } catch { return false; }
  }, []);

  const setNotification = useCallback(async (key, value) => {
    const previous = notifications;
    const next = { ...notifications, [key]: value };
    setNotifications(next);
    setSavingKey(key);
    setActionError("");

    try {
      await updateProfile({
        preferences: { language: user?.preferences?.language || "ar", notifications: next },
      });
      await updateUser({
        preferences: {
          ...(user?.preferences || {}),
          language: user?.preferences?.language || "ar",
          notifications: next,
        },
      });
    } catch (saveError) {
      // التراجع البصري وحده يبدو كعطب — لا بدّ من قول السبب
      setNotifications(previous);
      setActionError(saveError?.message || "تعذّر حفظ التفضيل، حاول مجدداً");
    } finally {
      setSavingKey(null);
    }
  }, [notifications, updateUser, user?.preferences]);

  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const doLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
      toast.success("تم تسجيل الخروج بنجاح");
    } catch {
      toast.error("تعذر تسجيل الخروج، حاول مجددًا");
    } finally {
      setLoggingOut(false);
      setConfirmingLogout(false);
    }
  };

  // حذف الحساب: تأكيد مضاعف يشرح ما يُفقد — لا يُلغى بضغطة واحدة
  const [deleteStep, setDeleteStep] = useState(0); // 0 | 1 | 2
  const [deletingAccount, setDeletingAccount] = useState(false);

  const doDeleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    setActionError("");
    try {
      await deleteAccount();
      setDeleteStep(0);
      toast.success("حُذف حسابك");
      await signOut();
    } catch (deleteError) {
      setDeleteStep(0);
      setActionError(deleteError?.message || "تعذّر حذف الحساب، تواصل مع الدعم");
    } finally {
      setDeletingAccount(false);
    }
  };

  const version = Constants?.expoConfig?.version || Constants?.manifest?.version || "";

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <AppHeader title="الإعدادات" subtitle="التنبيهات والخصوصية والحساب" onBack={() => navigation?.goBack?.()} />

        <ErrorBanner message={actionError} style={styles.banner} />

        <SectionHeader title="الإشعارات" style={styles.sectionHeader} />

        {/* الفصل بين الحرج والتسويقي: يُقال صراحةً بدل مفتاح لا يُطبَّق */}
        <View style={styles.note}>
          <Info size={16} weight="fill" color={colors.info} />
          <Text style={styles.noteText}>
            تحديثات طلبك الجارية تظهر دائماً داخل التطبيق وفي شاشة الإشعارات مهما كانت المفاتيح — هذه المفاتيح
            تتحكّم بقنوات التنبيه خارج الشاشة فقط.
          </Text>
        </View>

        {systemBlocked ? (
          <View style={styles.systemWarning}>
            <WarningCircle size={17} weight="fill" color={colors.warning} />
            <Text style={styles.systemWarningText}>
              الإشعارات محظورة على مستوى المتصفّح لهذا الموقع، فلن تصلك تنبيهات مهما فعّلت المفتاح.
              اسمح بها من إعدادات الموقع في متصفّحك.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          {CHANNELS.map((channel, index) => (
            <View key={channel.key}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <PreferenceSwitch
                label={channel.label}
                description={channel.description}
                warning={!notifications[channel.key] ? channel.warning : ""}
                Icon={channel.Icon}
                value={!!notifications[channel.key]}
                saving={savingKey === channel.key}
                disabled={!!savingKey}
                onChange={(value) => setNotification(channel.key, value)}
              />
            </View>
          ))}
        </View>

        <SectionHeader title="الحساب والدعم" style={styles.sectionHeader} />
        <View style={styles.card}>
          <NavigationRow
            label="طرق الدفع"
            description="إدارة وسائل الدفع المحفوظة"
            Icon={CreditCard}
            onPress={() => navigation?.navigate?.("PaymentMethods")}
          />
          <View style={styles.divider} />
          <NavigationRow
            label="الدعم والمحادثات"
            description="راجع محادثاتك أو تواصل مع الدعم"
            Icon={ChatText}
            tone="secondary"
            onPress={() => navigation?.navigate?.("Conversations")}
          />
          <View style={styles.divider} />
          <NavigationRow
            label="إدارة الحساب"
            description="استعادة حساب معطّل أو متابعة حالته"
            Icon={UserCircleGear}
            onPress={() => navigation?.navigate?.("RestoreAccount")}
          />
        </View>

        <SectionHeader title="الخصوصية والبيانات" style={styles.sectionHeader} />
        <View style={styles.card}>
          <View style={styles.privacyRow}>
            <View style={styles.privacyIcon}><ShieldCheck size={20} weight="duotone" color={colors.success} /></View>
            <View style={styles.privacyCopy}>
              <Text style={styles.rowTitle}>ما نحفظه عنك</Text>
              <Text style={styles.rowDescription}>
                اسمك ورقمك ومركباتك وعناوينك وسجلّ طلباتك. موقعك يُستخدم لحظة الطلب لتحديد أقرب فني ولا يُتتبَّع في الخلفية.
              </Text>
            </View>
          </View>
        </View>

        <PressableScale
          onPress={() => setConfirmingLogout(true)}
          feedback="action"
          accessibilityRole="button"
          accessibilityLabel="تسجيل الخروج"
          style={styles.logoutButton}
        >
          <SignOut size={20} color={colors.danger} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </PressableScale>

        {/* منطقة الخطر: مفصولة مكانياً، وبتأكيد مضاعف يشرح ما يُفقد */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>حذف الحساب نهائياً</Text>
          <Text style={styles.dangerText}>
            يُزيل حسابك وبياناتك: المركبات، العناوين، سجلّ الطلبات، ورصيد محفظتك ونقاطك. لا يمكن التراجع ولا استرداد الرصيد.
          </Text>
          <OutlineButton
            danger
            label="حذف حسابي"
            icon={<Trash size={17} color={colors.danger} />}
            disabled={deletingAccount}
            onPress={() => { setActionError(""); setDeleteStep(1); }}
          />
        </View>

        {version ? <Text style={styles.version}>كار هيرو · الإصدار {arDigits(version)}</Text> : null}
      </ScrollView>

      <ConfirmSheet
        visible={confirmingLogout}
        title="تسجيل الخروج"
        message="ستحتاج إلى رقمك وكلمة المرور للدخول مجدداً. بياناتك تبقى محفوظة."
        confirmLabel="تسجيل الخروج"
        cancelLabel="تراجع"
        danger
        busy={loggingOut}
        onConfirm={doLogout}
        onCancel={() => setConfirmingLogout(false)}
      />

      <ConfirmSheet
        visible={deleteStep === 1}
        title="حذف الحساب نهائياً؟"
        message="ستفقد مركباتك وعناوينك وسجلّ طلباتك ورصيد محفظتك ونقاط الوفاء. لا يمكن استرجاع أي منها."
        confirmLabel="متابعة الحذف"
        cancelLabel="إلغاء"
        danger
        onConfirm={() => setDeleteStep(2)}
        onCancel={() => setDeleteStep(0)}
      />

      <ConfirmSheet
        visible={deleteStep === 2}
        title="تأكيد أخير"
        message="هذه آخر خطوة — سيُحذف الحساب فور التأكيد ولن نتمكّن من استعادته."
        confirmLabel="نعم، احذف حسابي"
        cancelLabel="تراجع"
        danger
        busy={deletingAccount}
        onConfirm={doDeleteAccount}
        onCancel={() => setDeleteStep(0)}
      />
    </View>
  );
}

/**
 * الصفّ كلّه هو المفتاح.
 *
 * مكوّن `Switch` على الويب يُرسم ٤٠×٢٠ بكسل — أصغر من الحدّ الأدنى لهدف
 * اللمس (٤٤)، ولا يُصدِر `aria-checked` مع `role="switch"` فلا تُعلَن حالته
 * لقارئ الشاشة. لذلك: الصفّ نفسه هو العنصر التفاعلي (٧٦ بكسل) ويحمل الدور
 * والحالة عبر `PressableScale` (الذي يُسقط الحالة إلى ARIA)، والمفتاح يبقى
 * تمثيلاً بصرياً فقط — مخفيّاً عن قارئ الشاشة ولا يلتقط النقر.
 */
function PreferenceSwitch({ label, description, warning, Icon, value, saving, disabled, onChange }) {
  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled, busy: saving }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={styles.preferenceRow}
    >
      <View style={styles.preferenceIcon}>
        <Icon size={20} color={colors.primary} weight="duotone" />
      </View>
      <View style={styles.preferenceCopy}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
        {warning ? <Text style={styles.rowWarning}>{warning}</Text> : null}
        {saving ? <Text style={styles.rowSaving}>جارٍ الحفظ…</Text> : null}
      </View>
      <View aria-hidden style={styles.switchWrap}>
        <Switch
          value={value}
          disabled={disabled}
          trackColor={{ false: colors.dotInactive, true: colors.primaryLight }}
          thumbColor={colors.surface}
          ios_backgroundColor={colors.dotInactive}
          style={styles.switch}
        />
      </View>
    </PressableScale>
  );
}

function NavigationRow({ label, description, Icon, tone = "primary", onPress }) {
  const toneColor = tone === "secondary" ? colors.secondary : tone === "danger" ? colors.danger : colors.primary;
  const toneBackground = tone === "secondary" ? colors.secondarySoft : tone === "danger" ? colors.dangerBg : colors.tint;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      style={styles.navigationRow}
    >
      <View style={[styles.navigationIcon, { backgroundColor: toneBackground }]}>
        <Icon size={20} color={toneColor} weight="duotone" />
      </View>
      <View style={styles.navigationCopy}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <CaretLeft size={18} color={colors.textMuted2} />
    </PressableScale>
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
  banner: { marginTop: spacing.md },
  sectionHeader: { marginTop: spacing.xl, marginBottom: spacing.sm },

  note: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.infoBg,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  noteText: { flex: 1, fontSize: font.size.xs, color: colors.info, textAlign: "right", lineHeight: 19 },
  systemWarning: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  systemWarningText: { flex: 1, fontSize: font.size.xs, color: colors.warning, textAlign: "right", lineHeight: 19 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: colors.borderSoft },

  preferenceRow: {
    minHeight: 76,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  preferenceIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  preferenceCopy: { flex: 1, minWidth: 0 },
  switchWrap: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    // props.pointerEvents مهجورة في RN 0.81 — تُضبط في النمط
    pointerEvents: "none",
  },
  switch: { flexShrink: 0 },
  rowTitle: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  rowDescription: { fontSize: font.size.xxs, color: colors.textMuted, marginTop: 2, textAlign: "right", lineHeight: 17 },
  rowWarning: { fontSize: font.size.xxs, color: colors.warning, marginTop: 4, textAlign: "right", lineHeight: 17 },
  rowSaving: { fontSize: font.size.xxs, color: colors.primary, marginTop: 4, textAlign: "right" },

  navigationRow: {
    minHeight: 68,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  navigationIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  navigationCopy: { flex: 1, minWidth: 0 },

  privacyRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.md, padding: spacing.md },
  privacyIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.successBg,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyCopy: { flex: 1, minWidth: 0 },

  logoutButton: {
    minHeight: 52,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "#F0CBD2",
    borderRadius: radius.card,
    backgroundColor: colors.dangerBg,
    marginTop: spacing.xl,
  },
  logoutText: { fontSize: font.size.sm, fontWeight: "700", color: colors.danger },

  dangerZone: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.lg,
  },
  dangerTitle: { fontSize: font.size.sm, fontWeight: "700", color: colors.danger, textAlign: "right" },
  dangerText: { fontSize: font.size.xs, color: colors.textMuted, textAlign: "right", lineHeight: 20 },

  version: { marginTop: spacing.lg, fontSize: font.size.xxs, color: colors.textMuted2, textAlign: "center" },
});
