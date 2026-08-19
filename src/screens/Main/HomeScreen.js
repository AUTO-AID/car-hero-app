import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  CarBattery,
  CaretLeft,
  Drop,
  GasPump,
  Gear,
  Key,
  Lightning,
  MapPin,
  Tag,
  Tire,
  Truck,
  Wrench,
} from "phosphor-react-native";
import {
  EmptyState,
  ErrorState,
  IconButton,
  PressableScale,
  SectionHeader,
  SkeletonList,
} from "../../components/ui";
import { colors, font, gradients, layout, radius, shadow, spacing } from "../../theme/theme";
import { fetchServices, serviceName, servicePrice } from "../../services/servicesApi";
import { fetchOrders } from "../../services/ordersApi";
import { ACTIVE_STATUSES, statusLabel } from "../../services/orderStatus";

const ICONS = {
  battery: CarBattery,
  tire: Tire,
  fuel: GasPump,
  lockout: Key,
  car_wash: Drop,
  towing: Truck,
  maintenance: Gear,
  emergency: Lightning,
};

// الاختصارات تحمل الوجهات التي لا يصلها الشريط السفلي.
//
// كانت أربعة، اثنتان منها تكرّران تبويبين دائمَي الظهور: «كل الخدمات» تفتح
// setStep("services") — وهو بالضبط ما يفعله تبويب «الخدمات» — و«طلباتي»
// تفتح setStep("orders") مثل تبويب «الطلبات». أي أن الصفّ الثاني كان
// يعرض طريقاً ثانياً إلى مكان يبعد ضغطة واحدة أصلاً.
const QUICK_ACTIONS = [
  { key: "providers", Icon: MapPin, label: "المزودون القريبون", tone: colors.secondary, bg: colors.secondarySoft },
  { key: "offers", Icon: Tag, label: "العروض", tone: colors.accent, bg: colors.accentSoft },
];

const iconFor = (service) => ICONS[service?.category] || Wrench;
const formatPrice = (value) => Number(value || 0).toLocaleString("ar-EG");

export default function HomeScreen({
  currentUser,
  location,
  onOpenMapExplore,
  onPickLocation,
  onOpenOffers,
  onOpenCatalog,
  onOpenNotifications,
  onSelectService,
  onTrackOrder,
  unreadCount = 0,
}) {
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  // خطأ التحميل منفصل عن «لا توجد خدمات»: كان الفشل يُعرض كقائمة فارغة
  // برسالة «تحقق من الاتصال» حتى عندما يردّ الخادم بنجاح بقائمة فارغة.
  const [servicesError, setServicesError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fullName = currentUser?.fullName || "مستخدم";
  const firstName = fullName.trim().split(/\s+/)[0] || "صديقنا";
  const initial = firstName.charAt(0) || "م";

  const loadServices = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingServices(true);
    setServicesError("");
    try {
      const data = await fetchServices();
      setServices(Array.isArray(data) ? data.slice(0, 6) : []);
    } catch (e) {
      setServices([]);
      setServicesError(e?.message || "تعذر تحميل الخدمات");
    } finally {
      setLoadingServices(false);
    }
  }, []);

  // الطلب الجاري: صاحبه لا يريد تصفّح خدمات — يريد أن يعرف أين الفني.
  // فشل جلبه لا يُعرض كخطأ: الشاشة تظلّ صالحة بدونه، وإزعاج المستخدم
  // برسالة خطأ عن شيء لم يطلبه ضريبة بلا مقابل.
  const [activeOrder, setActiveOrder] = useState(null);
  const loadActiveOrder = useCallback(async () => {
    try {
      const { orders } = await fetchOrders({ limit: 5 });
      const list = Array.isArray(orders) ? orders : [];
      setActiveOrder(list.find((order) => ACTIVE_STATUSES.includes(order?.status)) || null);
    } catch {
      setActiveOrder(null);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // السحب للتحديث يحدّث كل المصادر لا الخدمات وحدها
    await Promise.all([loadServices({ silent: true }), loadActiveOrder()]);
    setRefreshing(false);
  }, [loadServices, loadActiveOrder]);

  useEffect(() => { loadServices(); }, [loadServices]);
  useEffect(() => { loadActiveOrder(); }, [loadActiveOrder]);

  const locationLabel = useMemo(() => {
    if (location?.address || location?.label) return location.address || location.label;
    if (location?.latitude && location?.longitude) return "تم تحديد موقعك الحالي";
    return "حدد موقع الخدمة";
  }, [location]);

  const quickHandlers = {
    providers: onOpenMapExplore,
    offers: onOpenOffers,
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={styles.top}>
          <View style={styles.avatar} accessibilityLabel={`حساب ${firstName}`}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.greeting}>
            <Text style={styles.hello}>مرحباً، {firstName}</Text>
            <Text style={styles.helloSub}>كيف يمكننا مساعدة سيارتك اليوم؟</Text>
          </View>
          {/* الشارة تُقرأ كجزء من اسم الزر، فلا تضيع على قارئ الشاشة */}
          <View>
            <IconButton
              label={unreadCount > 0 ? `الإشعارات، ${unreadCount} غير مقروء` : "الإشعارات"}
              onPress={onOpenNotifications}
              icon={<Bell size={21} color={colors.textHeading} />}
            />
            {unreadCount > 0 && (
              <View style={styles.badge} pointerEvents="none">
                <Text style={styles.badgeText} numberOfLines={1}>
                  {unreadCount > 99 ? "٩٩+" : unreadCount.toLocaleString("ar-EG")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* الأولوية المطلقة: من له طلب جارٍ لا يريد تصفّح خدمات — يريد أن
            يعرف أين الفني ومتى يصل. لذلك تتصدّر البطاقة كل شيء، فوق شريط
            الموقع والإجراء الأساسي معاً. */}
        {activeOrder ? (
          <ActiveOrderCard order={activeOrder} onTrack={() => onTrackOrder?.(activeOrder)} />
        ) : null}

        {/* كان يفتح خريطة المزوّدين رغم أن نصّه يَعِد بتحديد موقع الخدمة */}
        <PressableScale
          style={styles.locationBar}
          onPress={onPickLocation || onOpenMapExplore}
          accessibilityRole="button"
          accessibilityLabel={`موقع الخدمة: ${locationLabel}`}
          accessibilityHint="يفتح الخريطة لتحديد موقع الخدمة"
        >
          <View style={styles.locationIcon}>
            <MapPin size={18} weight="fill" color={colors.secondary} />
          </View>
          <View style={styles.locationCopy}>
            <Text style={styles.locationLabel}>موقع الخدمة</Text>
            <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
          </View>
          <CaretLeft size={17} color={colors.textMuted} />
        </PressableScale>

        <LinearGradient {...gradients.primaryDiag} style={styles.hero}>
          <Truck size={124} weight="fill" color="#FFFFFF1F" style={styles.heroTruck} />
          <View style={styles.heroContent}>
            <View style={styles.heroStatus}>
              <View style={styles.liveDot} />
              <Text style={styles.heroStatusText}>مساعدة الطريق متاحة</Text>
            </View>
            <Text style={styles.heroTitle}>خدمة سريعة عندما تحتاجها</Text>
            <Text style={styles.heroSub}>اختر المشكلة، ثبّت موقعك، وتابع وصول الفني خطوة بخطوة.</Text>
            <PressableScale
              style={styles.heroButton}
              onPress={onOpenCatalog}
              feedback="action"
              accessibilityRole="button"
              accessibilityLabel="اطلب خدمة الآن"
            >
              <Lightning size={17} weight="fill" color={colors.primary} />
              <Text style={styles.heroButtonText}>اطلب خدمة الآن</Text>
            </PressableScale>
          </View>
        </LinearGradient>

        <View style={styles.quickGrid}>
          {/* نستخرج key من العنصر قبل النشر: تمريرها ضمن {...item} يجعل React
              يحذّر «key prop is being spread into JSX» في كل رسم. */}
          {QUICK_ACTIONS.map(({ key, ...action }) => (
            <QuickAction key={key} {...action} onPress={quickHandlers[key]} />
          ))}
        </View>

        <SectionHeader
          title="الخدمات الأكثر طلباً"
          actionLabel="عرض الكل"
          onAction={onOpenCatalog}
          style={styles.sectionHeader}
        />

        {loadingServices ? (
          <SkeletonList count={2} lines={1} />
        ) : servicesError ? (
          <ErrorState
            title="تعذر تحميل الخدمات"
            message={servicesError}
            onRetry={() => loadServices()}
          />
        ) : services.length === 0 ? (
          <EmptyState
            title="لا توجد خدمات متاحة حالياً"
            message="سنضيف خدمات جديدة قريباً. يمكنك تصفّح كل الخدمات."
            actionLabel="تحديث"
            onAction={() => loadServices()}
            style={styles.emptyState}
          />
        ) : (
          <View style={styles.serviceGrid}>
            {services.map((service) => {
              const Icon = iconFor(service);
              const price = servicePrice(service);
              return (
                <PressableScale
                  key={service.id || service._id}
                  style={styles.serviceCard}
                  onPress={() => onSelectService?.(service)}
                  accessibilityRole="button"
                  accessibilityLabel={`${serviceName(service)}، ${price ? `من ${formatPrice(price)} ليرة` : "السعر حسب الخدمة"}`}
                >
                  <View style={styles.serviceIcon}><Icon size={24} weight="fill" color={colors.primary} /></View>
                  <Text style={styles.serviceTitle} numberOfLines={2}>{serviceName(service)}</Text>
                  <View style={styles.serviceFoot}>
                    <Text style={styles.servicePrice}>{price ? `من ${formatPrice(price)} ل.س` : "حسب الخدمة"}</Text>
                    <CaretLeft size={14} color={colors.textMuted2} />
                  </View>
                  {/* المدة التقديرية عنصر قرار كالسعر: غيابها يترك سؤالاً مفتوحاً */}
                  {service?.estimatedDuration ? (
                    <Text style={styles.serviceDuration}>
                      ≈ {formatPrice(service.estimatedDuration)} دقيقة
                    </Text>
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ActiveOrderCard({ order, onTrack }) {
  // الحالة معرّبة حصراً عبر statusLabel — ممنوع provider_en_route خاماً
  const label = statusLabel(order?.status);
  const service = serviceName(order?.service) || order?.serviceName || "طلب جارٍ";
  const eta = order?.estimatedArrivalTime ?? order?.eta ?? null;

  return (
    <PressableScale
      style={styles.activeCard}
      onPress={onTrack}
      feedback="action"
      accessibilityRole="button"
      accessibilityLabel={`طلب جارٍ: ${service}، الحالة ${label}. اضغط للتتبّع`}
    >
      <View style={styles.activeTop}>
        <View style={styles.activePulse} />
        <Text style={styles.activeStatus}>{label}</Text>
        <Text style={styles.activeTag}>طلب جارٍ</Text>
      </View>
      <Text style={styles.activeService} numberOfLines={1}>{service}</Text>
      <View style={styles.activeFoot}>
        <Text style={styles.activeEta}>
          {eta != null ? `الوصول المتوقّع خلال ${formatPrice(eta)} دقيقة` : "جارٍ تحديث وقت الوصول"}
        </Text>
        <View style={styles.activeBtn}>
          <Text style={styles.activeBtnText}>تتبّع الطلب</Text>
          <CaretLeft size={14} weight="bold" color={colors.onPrimary} />
        </View>
      </View>
    </PressableScale>
  );
}

function QuickAction({ Icon, label, tone, bg, onPress }) {
  return (
    <PressableScale style={styles.quick} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.quickIcon, { backgroundColor: bg }]}><Icon size={21} weight="fill" color={tone} /></View>
      <Text style={styles.quickText} numberOfLines={1}>{label}</Text>
      <CaretLeft size={15} color={colors.textMuted2} />
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
  top: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  badge: {
    position: "absolute",
    top: -2,
    left: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 9.5, fontWeight: "700", color: "#fff", lineHeight: 13 },
  avatar: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.onPrimary, fontWeight: "700", fontSize: 17 },
  greeting: { flex: 1, minWidth: 0 },
  hello: { fontSize: 17, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  helloSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1, textAlign: "right" },

  locationBar: {
    minHeight: 62,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  locationIcon: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.secondarySoft, alignItems: "center", justifyContent: "center" },
  locationCopy: { flex: 1, minWidth: 0 },
  locationLabel: { fontSize: font.size.xxs, color: colors.textMuted, textAlign: "right" },
  locationText: { fontSize: font.size.sm, fontWeight: "700", color: colors.textHeading, textAlign: "right" },

  hero: { minHeight: 206, borderRadius: radius.lg, overflow: "hidden", padding: spacing.xl, marginTop: spacing.md, ...shadow.button },
  heroTruck: { position: "absolute", left: -12, bottom: -12 },
  heroContent: { width: "78%", alignSelf: "flex-end", alignItems: "flex-end" },
  heroStatus: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#7EE0B7" },
  heroStatusText: { color: "#F5ECFA", fontSize: font.size.xs, fontWeight: "600" },
  heroTitle: { color: colors.onPrimary, fontSize: 22, fontWeight: "700", textAlign: "right", lineHeight: 32 },
  heroSub: { color: "#EDE3F2", fontSize: font.size.sm, lineHeight: 22, marginTop: spacing.xs, textAlign: "right" },
  heroButton: { minHeight: 46, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.md },
  heroButtonText: { color: colors.primary, fontWeight: "700", fontSize: font.size.sm },

  quickGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  quick: { width: "48%", minHeight: 58, flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 10 },
  quickIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  quickText: { flex: 1, minWidth: 0, color: colors.textHeading, fontSize: font.size.xs, fontWeight: "700", textAlign: "right" },

  sectionHeader: { marginTop: spacing.xxl, marginBottom: spacing.md },
  emptyState: { minHeight: 170 },

  activeCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.button,
  },
  activeTop: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  activePulse: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.successBg },
  activeStatus: { flex: 1, color: colors.onPrimary, fontSize: font.size.sm, fontWeight: "700", textAlign: "right" },
  activeTag: {
    color: colors.primary,
    backgroundColor: colors.onPrimary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    fontSize: font.size.xxs,
    fontWeight: "700",
  },
  activeService: { color: colors.onPrimary, fontSize: font.size.body, fontWeight: "700", textAlign: "right" },
  activeFoot: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  activeEta: { flex: 1, color: colors.tint, fontSize: font.size.xs, textAlign: "right" },
  activeBtn: {
    minHeight: 36,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.onPrimary,
    paddingHorizontal: spacing.md,
  },
  activeBtnText: { color: colors.onPrimary, fontSize: font.size.xs, fontWeight: "700" },
  serviceDuration: { width: "100%", color: colors.textMuted2, fontSize: font.size.xxs, textAlign: "right", marginTop: 1 },
  serviceGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  serviceCard: { width: "48%", minHeight: 132, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.card, padding: spacing.md, alignItems: "flex-end" },
  serviceIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  serviceTitle: { minHeight: 40, color: colors.textDark, fontSize: font.size.sm, fontWeight: "700", textAlign: "right" },
  serviceFoot: { width: "100%", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: spacing.xs, marginTop: spacing.xs },
  servicePrice: { flex: 1, color: colors.textMuted, fontSize: font.size.xxs, fontWeight: "600", textAlign: "right" },
});
