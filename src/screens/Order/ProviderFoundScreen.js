import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatCircle, CheckCircle, NavigationArrow, Phone, Star } from "phosphor-react-native";
import { EmptyState, OutlineButton, PrimaryButton } from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { fetchTracking } from "../../services/ordersApi";
import { fetchProvider, providerInitials, providerRole } from "../../services/providersApi";

const formatNumber = (value) => (value == null ? "" : Number(value).toLocaleString("ar-EG"));

export default function ProviderFoundScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const orderId = route?.params?.orderId;
  const scheduled = !!route?.params?.scheduled;
  const [tracking, setTracking] = useState(null);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!orderId) {
      setError("رقم الطلب غير متوفر");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await fetchTracking(orderId);
      setTracking(result);
      const providerId = result?.provider?.id || result?.provider?._id || result?.providerId;
      if (providerId) {
        try { setProvider(await fetchProvider(providerId)); } catch { setProvider(null); }
      }
    } catch (loadError) {
      setError(loadError?.message || "تعذر جلب حالة الطلب");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const embeddedProvider = tracking?.provider || {};
  const providerId = embeddedProvider.id || embeddedProvider._id || provider?.id || provider?._id || tracking?.providerId;
  const name = embeddedProvider.businessName || provider?.businessName || (scheduled ? "سيتم تعيين الفني قبل الموعد" : "جارٍ تعيين الفني");
  const phone = embeddedProvider.phoneNumber || embeddedProvider.phone || provider?.phoneNumber || provider?.phone || "";
  const rating = provider?.averageRating ?? embeddedProvider.averageRating;
  const role = providerRole(provider) || embeddedProvider.city || "";
  const initials = providerInitials(provider || embeddedProvider) || "CH";
  // المركبة ولوحتها: التعرّف البصري على ما سيصل يخفض القلق أكثر من أي عنصر آخر
  const vehicle = embeddedProvider.vehicle || provider?.vehicle || {};
  const vehicleLabel = [vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(" ");
  const plate = vehicle.plateNumber || vehicle.plate || "";
  // انسحاب المزوّد ليس خطأ شبكة: يحتاج شرحاً ومساراً لإعادة البحث لا رسالة عطل
  const withdrawn = ["cancelled", "rejected"].includes(tracking?.status);

  const call = () => {
    const sanitized = String(phone).replace(/[^+\d]/g, "");
    if (sanitized) Linking.openURL(`tel:${sanitized}`).catch(() => {});
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}
      >
        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.stateText}>جاري تأكيد الطلب...</Text></View>
        ) : error ? (
          <View style={styles.recovery}>
            <EmptyState title="تعذر تأكيد الطلب" message={error} />
            {/* مسار استرداد حقيقي: إعادة المحاولة قد لا تُجدي إن سقط الطلب،
                فنعرض معها البحث عن فني آخر بدل ترك المستخدم في طريق مسدود. */}
            <PrimaryButton label="إعادة المحاولة" onPress={load} />
            <OutlineButton
              label="البحث عن فني آخر"
              onPress={() => navigation?.replace?.("SearchingProvider", route?.params || {})}
            />
          </View>
        ) : withdrawn ? (
          <View style={styles.recovery}>
            <EmptyState
              title="انسحب الفني من الطلب"
              message="يحدث هذا أحياناً إذا تعذّر على الفني الوصول. طلبك لم يُنفّذ ولم يُخصم منك شيء — سنبحث لك عن بديل فوراً."
            />
            <PrimaryButton
              label="ابحث عن فني بديل"
              onPress={() => navigation?.replace?.("SearchingProvider", route?.params || {})}
            />
            <OutlineButton label="العودة إلى طلباتي" onPress={() => navigation?.navigate?.("Orders")} />
          </View>
        ) : (
          <>
            <View style={styles.successIcon}><CheckCircle size={48} weight="fill" color={colors.success} /></View>
            <Text style={styles.title}>{scheduled ? "تم تأكيد حجزك" : "تم قبول طلبك"}</Text>
            <Text style={styles.subtitle}>{scheduled ? "ستتمكن من متابعة التفاصيل من شاشة الطلبات." : "يمكنك الآن متابعة حالة الفني وتحديثات الوصول."}</Text>

            <View style={styles.providerCard}>
              <View style={styles.providerTop}>
                <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
                <View style={styles.providerCopy}>
                  <Text style={styles.providerName} numberOfLines={2}>{name}</Text>
                  <View style={styles.ratingRow}>
                    {rating != null ? <><Star size={13} weight="fill" color={colors.star} /><Text style={styles.rating}>{Number(rating).toFixed(1)}</Text></> : null}
                    {role ? <Text style={styles.role} numberOfLines={1}>{role}</Text> : null}
                  </View>
                  {/* المركبة ولوحتها تحت الاسم مباشرةً: بها يتعرّف المستخدم
                      على من يصل قبل أن يقترب */}
                  {vehicleLabel || plate ? (
                    <Text style={styles.vehicle} numberOfLines={1}>
                      {[vehicleLabel, plate ? `لوحة ${plate}` : ""].filter(Boolean).join(" · ")}
                    </Text>
                  ) : null}
                </View>
              </View>
              {providerId ? (
                <View style={styles.contactActions}>
                  {/* الاتصال يأخذ وزن الإجراء الأساسي: على الطريق المكالمة
                      أسرع وأوثق من محادثة قد لا تُقرأ فوراً. */}
                  <PrimaryButton
                    label="اتصال"
                    icon={<Phone size={17} weight="fill" color={colors.onPrimary} />}
                    onPress={call}
                    disabled={!phone}
                    style={styles.contactButton}
                  />
                  <OutlineButton label="محادثة" icon={<ChatCircle size={17} weight="fill" color={colors.primary} />} onPress={() => navigation?.navigate?.("Chat", { orderId, providerId, providerName: name })} style={styles.contactButton} />
                </View>
              ) : null}
            </View>

            {/* وقت الوصول هو السؤال الأول بعد «من هو» — يُعرض بارزاً لا كخانة
                في صف إحصاءات متساوية الوزن. */}
            <View style={styles.etaCard}>
              <Text style={styles.etaLabel}>الوصول المتوقّع</Text>
              <Text style={styles.etaValue}>
                {tracking?.etaMinutes != null ? `${formatNumber(tracking.etaMinutes)} دقيقة` : "جارٍ التقدير"}
              </Text>
              {tracking?.distanceKm != null ? (
                <Text style={styles.etaDistance}>يبعد {formatNumber(tracking.distanceKm)} كم عنك</Text>
              ) : null}
            </View>

            <View style={styles.flex} />
            <PrimaryButton
              label={scheduled ? "عرض تفاصيل الحجز" : "متابعة الطلب"}
              icon={<NavigationArrow size={18} weight="fill" color={colors.onPrimary} />}
              onPress={() => scheduled
                ? navigation?.replace?.("OrderDetail", { orderId })
                : navigation?.replace?.("Tracking", { orderId })}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
  content: { flexGrow: 1, width: "100%", maxWidth: layout.contentMaxWidth, alignSelf: "center", paddingHorizontal: spacing.screenH },
  loading: { flex: 1, minHeight: 360, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  stateText: { fontSize: font.size.sm, color: colors.textMuted, textAlign: "center" },
  successIcon: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.successBg, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  title: { marginTop: spacing.xl, fontSize: font.size.title, fontWeight: "700", color: colors.textDark, textAlign: "center" },
  subtitle: { maxWidth: 380, alignSelf: "center", marginTop: spacing.sm, fontSize: font.size.sm, color: colors.textBody, lineHeight: 24, textAlign: "center" },
  providerCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.card, padding: spacing.lg, marginTop: spacing.xxl },
  providerTop: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  avatar: { width: 56, height: 56, flexShrink: 0, borderRadius: radius.md, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: font.size.body, fontWeight: "700", color: colors.primary },
  providerCopy: { flex: 1, minWidth: 0 },
  providerName: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  ratingRow: { flexDirection: "row-reverse", alignItems: "center", gap: 5, marginTop: 2 },
  rating: { fontSize: font.size.xs, color: colors.star, fontWeight: "700" },
  role: { flexShrink: 1, fontSize: font.size.xs, color: colors.textMuted },
  contactActions: { flexDirection: "row-reverse", gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: spacing.md, marginTop: spacing.md },
  contactButton: { flex: 1 },
  vehicle: { fontSize: font.size.xs, color: colors.textBody, marginTop: 3, textAlign: "right" },
  etaCard: {
    alignItems: "center",
    backgroundColor: colors.secondarySoft,
    borderRadius: radius.card,
    marginTop: spacing.md,
    paddingVertical: spacing.lg,
  },
  etaLabel: { fontSize: font.size.xs, color: colors.textBody },
  etaValue: { marginTop: 2, fontSize: font.size.h1, fontWeight: "700", color: colors.secondary, textAlign: "center" },
  etaDistance: { marginTop: 2, fontSize: font.size.xs, color: colors.textMuted },
  recovery: { flex: 1, justifyContent: "center", gap: spacing.sm },
  flex: { flex: 1, minHeight: spacing.xxl },
});
