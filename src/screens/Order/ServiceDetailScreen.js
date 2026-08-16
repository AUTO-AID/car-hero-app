import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Clock, MapPin, Star, UserFocus, Wrench } from "phosphor-react-native";
import { AppHeader, ErrorState, PressableScale, PrimaryButton, SkeletonCard } from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { fetchService, serviceDescription, serviceName, servicePrice } from "../../services/servicesApi";
import { fetchNearbyProviders, isProviderOnline, providerInitials } from "../../services/providersApi";
import { getDeviceCoords } from "../../services/location";

const formatNumber = (value) => (value == null ? "" : Number(value).toLocaleString("ar-EG"));
const formatDistance = (value) => (value == null ? "" : `${Number(value).toLocaleString("ar-EG", { maximumFractionDigits: 1 })} كم`);

export default function ServiceDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const serviceId = route?.params?.serviceId;
  const presetProviderId = route?.params?.providerId || null;
  const presetService = route?.params?.service || null;
  const [service, setService] = useState(presetService);
  const [coords, setCoords] = useState(null);
  const [providers, setProviders] = useState([]);
  const [selected, setSelected] = useState(presetProviderId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [providerError, setProviderError] = useState("");

  const [loadingProviders, setLoadingProviders] = useState(false);

  // تحميل الفنيين القريبين وحده — يتيح إعادة المحاولة دون إعادة تحميل الشاشة كلها
  const loadProviders = useCallback(async (category) => {
    setLoadingProviders(true);
    setProviderError("");
    try {
      const currentCoords = await getDeviceCoords();
      setCoords(currentCoords);
      const list = await fetchNearbyProviders({
        longitude: currentCoords.longitude,
        latitude: currentCoords.latitude,
        category,
        limit: 20,
      });
      const arr = Array.isArray(list) ? list : [];
      setProviders(arr);
      // لا نُبقي اختياراً لفني لم يعد موجوداً أو لم يعد متاحاً
      setSelected((prev) => (prev && arr.some((p) => (p.id || p._id) === prev && isProviderOnline(p)) ? prev : null));
    } catch (nearbyError) {
      setProviders([]);
      setProviderError(nearbyError?.message || "تعذر تحميل الفنيين القريبين");
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!serviceId) {
      setError("معرّف الخدمة غير متوفر");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setProviderError("");
    try {
      const loadedService = await fetchService(serviceId);
      setService(loadedService);
      setLoading(false);
      await loadProviders(loadedService?.category);
    } catch (loadError) {
      setError(loadError?.message || "تعذر تحميل تفاصيل الخدمة");
      setLoading(false);
    }
  }, [serviceId, loadProviders]);

  useEffect(() => { load(); }, [load]);

  const title = serviceName(service) || "تفاصيل الخدمة";
  const price = servicePrice(service);
  const onlineCount = providers.filter(isProviderOnline).length;

  // زمن وصول واقعي مبني على المزوّد المتاح الأقرب فعلاً، لا رقم ثابت.
  // تقدير محافظ: ٢.٥ دقيقة لكل كيلومتر داخل المدينة + ٥ دقائق تجهيز.
  const nearestKm = useMemo(() => {
    const distances = providers
      .filter((p) => isProviderOnline(p) && p.distance != null)
      .map((p) => Number(p.distance));
    return distances.length ? Math.min(...distances) : null;
  }, [providers]);
  const etaMinutes = nearestKm == null ? null : Math.max(5, Math.round(nearestKm * 2.5) + 5);

  // المتاحون أولاً ثم الأقرب: الفنيون غير المتاحين غير قابلين للاختيار،
  // فتصدّرهم القائمة كان يدفع الخيارات الفعلية للأسفل.
  const sortedProviders = useMemo(() => {
    return [...providers].sort((a, b) => {
      const onlineDiff = Number(isProviderOnline(b)) - Number(isProviderOnline(a));
      if (onlineDiff) return onlineDiff;
      return (a.distance ?? Infinity) - (b.distance ?? Infinity);
    });
  }, [providers]);

  const proceed = () => {
    navigation?.navigate?.("ConfirmOrder", {
      serviceId,
      serviceName: title,
      servicePrice: price,
      providerId: selected || undefined,
      coords,
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 104 }]}
      >
        <AppHeader title={title} onBack={() => navigation?.goBack?.()} />

        {loading ? (
          <View style={styles.skeletonWrap}><SkeletonCard lines={3} /><SkeletonCard lines={2} /></View>
        ) : error ? (
          // خطأ تحميل الخدمة منفصل تماماً عن غياب المزوّدين — الأول عطل والثاني واقع
          <ErrorState title="تعذر تحميل الخدمة" message={error} onRetry={load} />
        ) : (
          <>
            <View style={styles.serviceIntro}>
              <View style={styles.serviceIcon}><Wrench size={28} weight="fill" color={colors.primary} /></View>
              <Text style={styles.description}>{serviceDescription(service) || "خدمة متنقلة يقدمها فنيون محترفون في موقع سيارتك."}</Text>
            </View>

            <View style={styles.metrics}>
              <Metric label="السعر يبدأ من" value={price ? `${formatNumber(price)} ل.س` : "حسب الحالة"} />
              <View style={styles.metricDivider} />
              <Metric label="مدة العمل" value={service?.estimatedDuration ? `${formatNumber(service.estimatedDuration)} دقيقة` : "تحدد بعد الفحص"} />
              <View style={styles.metricDivider} />
              {/* وصول مبني على أقرب فني متاح فعلاً؛ وإن لم يوجد فلا نخترع رقماً */}
              <Metric
                label="وصول الفني"
                value={etaMinutes != null ? `≈ ${formatNumber(etaMinutes)} دقيقة` : "حسب التوفّر"}
              />
            </View>

            {/* صراحة السعر: المفاجأة السعرية بعد التأكيد أسوأ من سعر مرتفع
                معلن، وهي السبب الأول للإلغاء وفقدان الثقة. */}
            <View style={styles.priceNote}>
              <Text style={styles.priceNoteTitle}>ما الذي قد يغيّر السعر؟</Text>
              <Text style={styles.priceNoteText}>
                المسافة إلى موقعك، ووقت الطلب (ليلاً أو في العطل)، وقطع الغيار إن لزمت.
                يُعرض الإجمالي كاملاً في شاشة التأكيد قبل أن تلتزم بأي شيء.
              </Text>
            </View>

            {/* ما تشمله الخدمة وما لا تشمله: منع التوقّع الخاطئ أرخص من
                معالجة شكوى بعد وصول الفني. */}
            <View style={styles.scope}>
              <View style={styles.scopeCol}>
                <Text style={styles.scopeTitle}>تشمل</Text>
                <ScopeItem text="حضور الفني إلى موقعك" ok />
                <ScopeItem text="الفحص والتشخيص الميداني" ok />
                <ScopeItem text="أجرة العمل والمعالجة الأساسية" ok />
              </View>
              <View style={styles.scopeCol}>
                <Text style={styles.scopeTitle}>لا تشمل</Text>
                <ScopeItem text="قطع الغيار (تُسعَّر منفصلة)" />
                <ScopeItem text="السحب إن تعذّر الإصلاح موقعياً" />
                <ScopeItem text="أعمال الورشة الداخلية" />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>اختر فنياً قريباً</Text>
                <Text style={styles.sectionSubtitle}>يمكنك تخطي الاختيار ليتم الإسناد تلقائياً.</Text>
              </View>
              {onlineCount > 0 ? <Text style={styles.availableCount}>{formatNumber(onlineCount)} متاح</Text> : null}
            </View>

            {loadingProviders ? (
              <View style={styles.notice}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.noticeText}>جارٍ البحث عن فنيين قريبين…</Text>
              </View>
            ) : providerError ? (
              <View style={styles.notice}>
                <MapPin size={20} weight="fill" color={colors.warning} />
                <Text style={styles.noticeText}>{providerError}، وسيتم إسناد الطلب تلقائياً.</Text>
                {/* إعادة محاولة للقائمة وحدها بدل إعادة تحميل الشاشة بالكامل */}
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="إعادة محاولة تحميل الفنيين"
                  onPress={() => loadProviders(service?.category)}
                  style={styles.noticeRetry}
                >
                  <Text style={styles.noticeRetryText}>إعادة المحاولة</Text>
                </PressableScale>
              </View>
            ) : providers.length === 0 ? (
              <View style={styles.notice}>
                <UserFocus size={20} weight="fill" color={colors.secondary} />
                <Text style={styles.noticeText}>لا يوجد فنيون قريبون ظاهرون الآن. سيبحث النظام عن مزود عند تأكيد الطلب.</Text>
              </View>
            ) : (
              <View style={styles.providers} accessibilityRole="radiogroup">
                {sortedProviders.map((provider) => {
                  const id = provider.id || provider._id;
                  const isSelected = id === selected;
                  return (
                    <ProviderRow
                      key={id}
                      provider={provider}
                      selected={isSelected}
                      onPress={() => setSelected(isSelected ? null : id)}
                    />
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {!loading && !error ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {/* السعر بجوار الزر الثابت: القرار والثمن في مكان واحد، فلا يضطر
              المستخدم للتمرير لأعلى ليتذكّر ما سيدفعه. */}
          <View style={styles.footerPrice}>
            <Text style={styles.footerPriceLabel}>يبدأ من</Text>
            <Text style={styles.footerPriceValue}>
              {price ? `${formatNumber(price)} ل.س` : "حسب الحالة"}
            </Text>
          </View>
          <PrimaryButton
            label={selected ? "المتابعة مع الفني المختار" : "متابعة الطلب"}
            onPress={proceed}
            style={styles.footerBtn}
          />
        </View>
      ) : null}
    </View>
  );
}

function ScopeItem({ text, ok = false }) {
  return (
    <View style={styles.scopeItem}>
      {/* أيقونة مختلفة لا لون مختلف فقط: الاعتماد على اللون وحده يسقط
          لمن لا يميّزه */}
      {ok ? (
        <Check size={12} weight="bold" color={colors.success} />
      ) : (
        <Text style={styles.scopeDash}>—</Text>
      )}
      <Text style={styles.scopeText}>{text}</Text>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ProviderRow({ provider, selected, onPress }) {
  const online = isProviderOnline(provider);
  return (
    <PressableScale
      style={[styles.provider, !online && styles.providerUnavailable, selected && styles.providerSelected]}
      onPress={online ? onPress : undefined}
      disabled={!online}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !online }}
      accessibilityLabel={`${provider.businessName || "فني"}، ${online ? "متاح" : "غير متاح"}`}
    >
      <View style={styles.avatar}><Text style={styles.initials}>{providerInitials(provider)}</Text></View>
      <View style={styles.providerCopy}>
        <Text style={styles.providerName} numberOfLines={1}>{provider.businessName || "فني خدمة"}</Text>
        <View style={styles.ratingRow}>
          <Star size={13} weight="fill" color={colors.star} />
          <Text style={styles.rating}>{provider.averageRating != null ? Number(provider.averageRating).toFixed(1) : "جديد"}</Text>
          <Text style={styles.orderCount}>· {formatNumber(provider.totalOrders || 0)} طلب</Text>
        </View>
      </View>
      <View style={styles.providerMeta}>
        <View style={styles.availability}>
          <View style={[styles.availabilityDot, { backgroundColor: online ? colors.success : colors.textMuted2 }]} />
          <Text style={[styles.availabilityText, { color: online ? colors.success : colors.textMuted }]}>{online ? "متاح" : "غير متصل"}</Text>
        </View>
        {provider.distance != null ? <Text style={styles.distance}>{formatDistance(provider.distance)}</Text> : null}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <Check size={13} weight="bold" color={colors.onPrimary} /> : null}</View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
  content: { width: "100%", maxWidth: layout.contentMaxWidth, alignSelf: "center", paddingHorizontal: spacing.screenH },
  skeletonWrap: { marginTop: spacing.lg, gap: spacing.md },
  priceNote: {
    marginTop: spacing.md,
    backgroundColor: colors.warningBg,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  priceNoteTitle: { fontSize: font.size.sm, fontWeight: "700", color: colors.warning, textAlign: "right" },
  priceNoteText: { marginTop: 2, fontSize: font.size.xs, color: colors.textBody, lineHeight: 21, textAlign: "right" },
  scope: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.md },
  scopeCol: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 6,
  },
  scopeTitle: { fontSize: font.size.xs, fontWeight: "700", color: colors.textDark, textAlign: "right", marginBottom: 2 },
  scopeItem: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 6 },
  scopeDash: { fontSize: font.size.xxs, color: colors.textMuted2, lineHeight: 18 },
  scopeText: { flex: 1, fontSize: font.size.xxs, color: colors.textBody, lineHeight: 18, textAlign: "right" },
  footerPrice: { alignItems: "flex-end", marginBottom: spacing.sm },
  footerPriceLabel: { fontSize: font.size.xxs, color: colors.textMuted, textAlign: "right" },
  footerPriceValue: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  footerBtn: { width: "100%" },
  serviceIntro: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, marginTop: spacing.lg },
  serviceIcon: { width: 58, height: 58, flexShrink: 0, borderRadius: radius.md, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  description: { flex: 1, fontSize: font.size.sm, color: colors.textBody, lineHeight: 24, textAlign: "right" },
  metrics: { minHeight: 84, flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.card, marginTop: spacing.lg, paddingVertical: spacing.md },
  metric: { flex: 1, minWidth: 0, alignItems: "center", paddingHorizontal: spacing.sm },
  metricDivider: { width: 1, height: 44, backgroundColor: colors.border },
  metricLabel: { fontSize: font.size.xxs, color: colors.textMuted, textAlign: "center" },
  metricValue: { marginTop: 2, fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "center" },
  sectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  sectionSubtitle: { fontSize: font.size.xxs, color: colors.textMuted, marginTop: 1, textAlign: "right" },
  availableCount: { minHeight: 28, color: colors.success, backgroundColor: colors.successBg, borderRadius: radius.pill, paddingHorizontal: 9, lineHeight: 28, fontSize: font.size.xxs, fontWeight: "700" },
  notice: { minHeight: 68, flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.md },
  noticeText: { flex: 1, fontSize: font.size.xs, color: colors.textBody, lineHeight: 21, textAlign: "right" },
  noticeRetry: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: colors.tint },
  noticeRetryText: { fontSize: font.size.xs, fontWeight: "700", color: colors.primary },
  providers: { gap: spacing.sm },
  provider: { minHeight: 78, flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.card, padding: spacing.md },
  providerSelected: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: "#FCFAFD" },
  providerUnavailable: { opacity: 0.58 },
  avatar: { width: 44, height: 44, flexShrink: 0, borderRadius: radius.sm, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: font.size.sm, fontWeight: "700", color: colors.primary },
  providerCopy: { flex: 1, minWidth: 0 },
  providerName: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  ratingRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4, marginTop: 2 },
  rating: { fontSize: font.size.xxs, fontWeight: "700", color: colors.star },
  orderCount: { fontSize: font.size.xxs, color: colors.textMuted },
  providerMeta: { maxWidth: 76, alignItems: "flex-start" },
  availability: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  availabilityDot: { width: 6, height: 6, borderRadius: 3 },
  availabilityText: { fontSize: font.size.xxs, fontWeight: "700" },
  distance: { marginTop: 2, fontSize: font.size.xxs, color: colors.textMuted, writingDirection: "ltr" },
  radio: { width: 22, height: 22, flexShrink: 0, borderRadius: 11, borderWidth: 1.5, borderColor: colors.borderInput, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.screenH, paddingTop: spacing.md },
});
