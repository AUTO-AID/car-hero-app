// ============================================================
//  AccountHubScreen — ٣٦ · مركز الحساب
//
//  الترتيب هنا بتكرار الاستخدام لا بالمنطق الإداري: «المحفظة» و«مركباتي»
//  و«الإشعارات» تُفتح كل أسبوع، و«الإعدادات» مرّة في العمر — فوضعها في
//  مجموعة واحدة اسمها «الحساب» ترتيبٌ منطقي للمصمّم لا للمستخدم.
//
//  والصفوف تحمل قيماً حيّة (الرصيد، عدد المركبات، الإشعارات غير المقروءة):
//  الصفّ الذي يحمل جوابه يوفّر على المستخدم رحلة كاملة إلى الشاشة وعودة.
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import {
  Bell,
  CarProfile,
  CaretLeft,
  Coins,
  CreditCard,
  Crown,
  GearSix,
  Headset,
  MapPin,
  PencilSimple,
  SignOut,
  Sparkle,
  Tag,
  User,
  Wallet,
} from "phosphor-react-native";
import { ConfirmSheet, PressableScale, SectionHeader, Skeleton } from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { CURRENCY, fetchWallet } from "../../services/walletApi";
import { fetchMyVehicles } from "../../services/vehiclesApi";
import { fetchUnreadCount } from "../../services/notificationsApi";

const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");
// رقم الإصدار ليس عدداً (١.٠.٠) فلا يمرّ عبر toLocaleString — نبدّل خاناته وحدها
const arDigits = (value) => String(value ?? "").replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
const profilePhone = (currentUser, user) =>
  currentUser?.phoneNumber || currentUser?.phone || user?.phoneNumber || user?.phone || "";

export default function AccountHubScreen({ navigation, currentUser }) {
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();
  const toast = useToast();

  const name = currentUser?.fullName || user?.fullName || "مستخدم";
  const phone = profilePhone(currentUser, user);
  const initial = name.trim().charAt(0) || "م";
  const premium = !!(currentUser?.isPremium || user?.isPremium);
  const loyaltyLevel = Number(currentUser?.loyaltyLevel ?? user?.loyaltyLevel ?? 0);

  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // القيم الحيّة تحسين لا شرط: فشل أيّها لا يجوز أن يمنع فتح أي صفّ،
  // فكل نداء يسقط وحده إلى null بدل أن يُسقط الشاشة.
  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    const [wallet, vehicles, unread] = await Promise.all([
      fetchWallet().catch(() => null),
      fetchMyVehicles().catch(() => null),
      fetchUnreadCount().catch(() => null),
    ]);
    setSummary({
      balance: wallet ? Number(wallet.balance || 0) : null,
      points: wallet ? Number(wallet.loyaltyPoints || 0) : null,
      vehicles: Array.isArray(vehicles) ? vehicles.length : null,
      unread: Number.isFinite(unread) ? unread : null,
    });
    setLoadingSummary(false);
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSummary();
    setRefreshing(false);
  }, [loadSummary]);

  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Alert.alert بأزرار لا تُستدعى دوالّه على الويب، فكان تسجيل الخروج غير
  // قابل للتنفيذ أصلاً من كلا مدخليه.
  const doLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
      toast.success("تم تسجيل الخروج بنجاح");
    } catch {
      toast.error("تعذر تسجيل الخروج، حاول مجدداً");
    } finally {
      setLoggingOut(false);
      setConfirmingLogout(false);
    }
  };

  const unreadValue = Number.isFinite(summary?.unread) && summary.unread > 0 ? arNum(summary.unread) : null;

  // المجموعة الأولى = ما يُفتح أسبوعياً. الترتيب داخلها بالتكرار أيضاً.
  const frequentRows = [
    {
      Icon: Wallet,
      label: "المحفظة",
      helper: "الرصيد وسجل العمليات",
      route: "Wallet",
      tone: "secondary",
      value: summary?.balance != null ? `${arNum(summary.balance)} ${CURRENCY}` : null,
    },
    {
      Icon: CarProfile,
      label: "مركباتي",
      helper: "إضافة وتعديل المركبات",
      route: "Vehicles",
      value: summary?.vehicles != null ? `${arNum(summary.vehicles)}` : null,
    },
    {
      Icon: Bell,
      label: "الإشعارات",
      helper: "تنبيهات الطلبات والتذكيرات",
      route: "Notifications",
      tone: "info",
      badge: unreadValue,
    },
    {
      Icon: MapPin,
      label: "العناوين المحفوظة",
      helper: "مواقع الخدمة المفضّلة",
      route: "Addresses",
      tone: "secondary",
    },
  ];

  const benefitRows = [
    {
      Icon: Crown,
      label: premium ? "اشتراكي" : "خطط الاشتراك",
      helper: premium ? "إدارة مزايا اشتراكك" : "قارن الخطط ومزاياها",
      route: premium ? "MySubscription" : "Plans",
      tone: "warning",
    },
    {
      Icon: Coins,
      label: "نقاط الوفاء",
      helper: "استبدلها كخصم على طلب",
      route: "RedeemPoints",
      tone: "warning",
      value: summary?.points != null ? `${arNum(summary.points)}` : null,
    },
    { Icon: Tag, label: "العروض والكوبونات", helper: "خصومات متاحة الآن", route: "Offers", tone: "warning" },
    { Icon: Sparkle, label: "خطط الغسيل", helper: "غسيل دوري مجدول", route: "WashPlans", tone: "secondary" },
  ];

  const accountRows = [
    { Icon: User, label: "الملف الشخصي", helper: "الاسم وبيانات الحساب", route: "EditProfile" },
    { Icon: CreditCard, label: "طرق الدفع", helper: "نقدي، محفظة، أو بطاقة", route: "PaymentMethods", tone: "info" },
    { Icon: Headset, label: "الدعم والمحادثات", helper: "تواصل مع فريق الدعم", route: "Conversations", tone: "secondary" },
    { Icon: GearSix, label: "الإعدادات", helper: "اللغة والخصوصية والتفضيلات", route: "Settings" },
  ];

  const version = Constants?.expoConfig?.version || Constants?.manifest?.version || "";

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`الملف الشخصي: ${name}، ${phone || "بلا رقم"} — تعديل`}
          onPress={() => navigation?.navigate?.("EditProfile")}
          style={styles.profile}
        >
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          <View style={styles.profileCopy}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.phone} numberOfLines={1}>{phone || "لا يوجد رقم محفوظ"}</Text>
            <View style={styles.profileMeta}>
              <View style={[styles.memberBadge, premium && styles.memberBadgePremium]}>
                <Crown size={12} weight="fill" color={premium ? colors.warning : colors.textMuted} />
                <Text style={[styles.memberText, premium && styles.memberTextPremium]}>
                  {premium ? "عضو مميّز" : "عضو عادي"}
                </Text>
              </View>
              {loyaltyLevel > 0 ? (
                <Text style={styles.loyalty}>مستوى الوفاء {arNum(loyaltyLevel)}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.editIcon}><PencilSimple size={16} color={colors.primary} /></View>
        </PressableScale>

        <MenuSection title="الأكثر استخداماً" rows={frequentRows} navigation={navigation} loading={loadingSummary} />
        <MenuSection title="المزايا والعروض" rows={benefitRows} navigation={navigation} loading={loadingSummary} />
        <MenuSection title="الحساب والدعم" rows={accountRows} navigation={navigation} />

        {/* الإجراء المدمّر مفصول تماماً في الأسفل */}
        <PressableScale
          style={styles.logout}
          onPress={() => setConfirmingLogout(true)}
          feedback="action"
          accessibilityRole="button"
          accessibilityLabel="تسجيل الخروج"
        >
          <SignOut size={19} color={colors.danger} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </PressableScale>

        {version ? <Text style={styles.version}>كار هيرو · الإصدار {arDigits(version)}</Text> : null}
      </ScrollView>

      <ConfirmSheet
        visible={confirmingLogout}
        title="تسجيل الخروج"
        message="ستحتاج إلى إدخال رقمك وكلمة المرور للدخول مجدداً. طلباتك وبياناتك تبقى محفوظة."
        confirmLabel="تسجيل الخروج"
        cancelLabel="تراجع"
        danger
        busy={loggingOut}
        onConfirm={doLogout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </View>
  );
}

function MenuSection({ title, rows, navigation, loading }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} style={styles.sectionHeader} />
      <View style={styles.menu}>
        {rows.map((row, index) => (
          <MenuRow
            key={row.label}
            {...row}
            loading={loading && (row.value !== undefined || row.badge !== undefined)}
            last={index === rows.length - 1}
            onPress={() => navigation?.navigate?.(row.route)}
          />
        ))}
      </View>
    </View>
  );
}

function MenuRow({ Icon, label, helper, onPress, tone = "primary", last, value, badge, loading }) {
  const palette = {
    primary: [colors.tint, colors.primary],
    secondary: [colors.secondarySoft, colors.secondary],
    info: [colors.infoBg, colors.info],
    warning: [colors.warningBg, colors.warning],
  }[tone];

  return (
    <PressableScale
      style={[styles.row, last && styles.rowLast]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[label, value, badge ? `${badge} غير مقروء` : ""].filter(Boolean).join("، ")}
      accessibilityHint={helper}
    >
      <View style={[styles.rowIcon, { backgroundColor: palette[0] }]}>
        <Icon size={19} weight="fill" color={palette[1]} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.rowHelper} numberOfLines={1}>{helper}</Text>
      </View>

      {loading ? (
        <Skeleton width={54} height={14} />
      ) : badge ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
      ) : value ? (
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
      ) : null}

      <CaretLeft size={16} color={colors.textMuted2} />
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
    paddingBottom: spacing.xxl,
  },

  profile: {
    minHeight: 96,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  avatar: {
    width: 58,
    height: 58,
    flexShrink: 0,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: colors.onPrimary },
  profileCopy: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  phone: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, textAlign: "right" },
  profileMeta: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, marginTop: 6 },
  memberBadge: {
    minHeight: 24,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
  },
  memberBadgePremium: { backgroundColor: colors.warningBg },
  memberText: { fontSize: font.size.xxs, fontWeight: "700", color: colors.textMuted },
  memberTextPremium: { color: colors.warning },
  loyalty: { fontSize: font.size.xxs, color: colors.textMuted },
  editIcon: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },

  section: { marginTop: spacing.xl },
  sectionHeader: { marginBottom: spacing.sm },
  menu: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  row: {
    minHeight: 68,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  rowHelper: { fontSize: font.size.xxs, color: colors.textMuted, marginTop: 1, textAlign: "right" },
  rowValue: { flexShrink: 0, maxWidth: 130, fontSize: font.size.xs, fontWeight: "700", color: colors.textHeading },
  badge: {
    flexShrink: 0,
    minWidth: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: font.size.xxs, fontWeight: "700", color: colors.onPrimary },

  logout: {
    minHeight: 52,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "#F0CBD2",
    borderRadius: radius.card,
    backgroundColor: colors.dangerBg,
    marginTop: spacing.xxl,
  },
  logoutText: { fontSize: font.size.sm, fontWeight: "700", color: colors.danger },
  version: { marginTop: spacing.md, fontSize: font.size.xxs, color: colors.textMuted2, textAlign: "center" },
});
