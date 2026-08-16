// ============================================================
//  OrderDetailScreen — ٢٦ · تفاصيل الطلب
//
//  الشاشة مرجع كامل وسجلّ نزاع: ماذا طلبت، ممن، بكم، ومتى تغيّر كل شيء.
//  لذلك قاعدتها الأولى: **صفر قيم خام**. كانت طريقة الدفع وحالته تظهران
//  «cash · pending»، والشارة العليا خضراء دائماً فيبدو الطلب الملغى ناجحاً،
//  والمبالغ بأرقام لاتينية — ثلاثة أخطاء تقع في الموضع الذي يُحتكَم إليه.
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowClockwise,
  CalendarCheck,
  CaretLeft,
  ChatCircle,
  Check,
  MapPin,
  NavigationArrow,
  Car,
  Wallet,
  WarningCircle,
  Wrench,
  X,
} from "phosphor-react-native";
import {
  AppHeader,
  AsyncContent,
  ConfirmSheet,
  ErrorBanner,
  OutlineButton,
  PressableScale,
  PrimaryButton,
  SkeletonCard,
  StatusPill,
  TONE_PALETTE,
} from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { cancelOrder, fetchOrder, fetchOrderStatusHistory } from "../../services/ordersApi";
import { fetchProvider, providerInitials, providerRole } from "../../services/providersApi";
import { fetchVehicle, vehicleSub, vehicleTitle } from "../../services/vehiclesApi";
import { reverseGeocode } from "../../services/geocoding";
import {
  canCancel,
  cancelReasonLabel,
  canConfirmCompletion as canConfirm,
  canReview,
  isActive,
  paymentMethodLabel,
  paymentStatusMeta,
  statusMeta,
} from "../../services/orderStatus";
import { formatFullDate, formatTime } from "../../services/scheduling";

const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");
const money = (value) => `${arNum(value)} ل.س`;

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export default function OrderDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const orderId = route?.params?.orderId || route?.params?.order?.id || route?.params?.order?._id;

  const [order, setOrder] = useState(route?.params?.order || null);
  const [history, setHistory] = useState([]);
  const [provider, setProvider] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    if (!orderId) {
      setError("رقم الطلب غير متوفّر");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setForbidden(false);
    try {
      const [details, statuses] = await Promise.all([
        fetchOrder(orderId),
        fetchOrderStatusHistory(orderId).catch(() => []),
      ]);
      setOrder(details);
      setHistory(Array.isArray(statuses) ? statuses : statuses?.data || []);

      // بيانات مرافقة: فشل أيّها لا يجوز أن يُسقط الشاشة كلها — التفاصيل
      // المالية والزمنية وصلت أصلاً، وهي جوهر الشاشة.
      if (details?.providerId) {
        fetchProvider(details.providerId).then(setProvider).catch(() => setProvider(null));
      } else {
        setProvider(null);
      }
      if (details?.vehicleId) {
        fetchVehicle(details.vehicleId).then(setVehicle).catch(() => setVehicle(null));
      } else {
        setVehicle(null);
      }
      const [longitude, latitude] = details?.userLocation?.coordinates || [];
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        reverseGeocode(latitude, longitude).then(setAddress).catch(() => setAddress(""));
      }
    } catch (loadError) {
      // «لا صلاحية» ليست عطلاً: إعادة المحاولة لن تُجدي، والمخرج الصحيح
      // هو العودة إلى القائمة لا زرّ يعيد الفشل نفسه.
      const denied = loadError?.statusCode === 403 || loadError?.statusCode === 404;
      setForbidden(denied);
      setError(loadError?.message || "تعذّر جلب تفاصيل الطلب");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const doCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setActionError("");
    try {
      const updated = await cancelOrder(orderId, "Cancelled by customer");
      setOrder(updated || { ...order, status: "cancelled" });
      setConfirmingCancel(false);
      load();
    } catch (cancelError) {
      setConfirmingCancel(false);
      setActionError(cancelError?.message || "تعذّر إلغاء الطلب، حاول مجدداً");
    } finally {
      setCancelling(false);
    }
  };

  const status = statusMeta(order?.status);
  const payment = paymentStatusMeta(order?.paymentStatus);
  const amount = order?.payableAmount ?? order?.totalAmount ?? order?.total ?? 0;
  const scheduledAt = order?.isScheduled && order?.scheduledAt ? new Date(order.scheduledAt) : null;

  const reorder = () => navigation?.navigate?.("ConfirmOrder", {
    serviceId: order?.serviceId,
    serviceName: order?.serviceName || order?.metadata?.serviceName,
    servicePrice: order?.servicePrice,
    providerId: order?.providerId,
  });

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <AppHeader
          title="تفاصيل الطلب"
          subtitle={order?.orderNumber || ""}
          onBack={() => navigation?.goBack?.()}
        />

        {forbidden ? (
          <View style={styles.denied}>
            <View style={styles.deniedIcon}><WarningCircle size={26} weight="fill" color={colors.danger} /></View>
            <Text style={styles.deniedTitle}>لا يمكن عرض هذا الطلب</Text>
            <Text style={styles.deniedText}>{error}</Text>
            <PrimaryButton label="العودة إلى طلباتي" onPress={() => navigation?.navigate?.("Orders")} />
          </View>
        ) : (
          <AsyncContent
            loading={loading}
            error={error}
            hasData={!!order}
            onRetry={load}
            errorTitle="تعذّر تحميل الطلب"
            skeleton={<View style={styles.skeleton}><SkeletonCard lines={2} /><SkeletonCard lines={4} /><SkeletonCard lines={3} /></View>}
          >
            {order ? (
              <>
                <View style={styles.card}>
                  <View style={styles.rowHead}>
                    <View style={styles.icon}><Wrench size={22} weight="fill" color={colors.primary} /></View>
                    <View style={styles.copy}>
                      <Text style={styles.cardTitle}>{order.serviceName || order?.metadata?.serviceName || "خدمة سيارة"}</Text>
                      <Text style={styles.cardSub}>{formatDateTime(order.createdAt)}</Text>
                    </View>
                    {/* الشارة تتبع نغمة الحالة: كانت خضراء دائماً فيبدو الملغى ناجحاً */}
                    <StatusPill label={status.label} tone={status.tone} />
                  </View>

                  {scheduledAt ? (
                    <View style={styles.scheduled}>
                      <CalendarCheck size={17} weight="fill" color={colors.primary} />
                      <Text style={styles.scheduledText}>
                        حجز مسبق · {formatFullDate(scheduledAt)} الساعة {formatTime(scheduledAt)}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {order.providerId ? (
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`عرض ملف ${provider?.businessName || "الفني المعيّن"}`}
                    style={[styles.card, styles.providerCard]}
                    onPress={() => navigation?.navigate?.("ProviderProfile", { providerId: order.providerId })}
                  >
                    <View style={styles.avatar}><Text style={styles.initials}>{providerInitials(provider) || "ف"}</Text></View>
                    <View style={styles.copy}>
                      <Text style={styles.cardTitle}>{provider?.businessName || "الفني المعيّن"}</Text>
                      <Text style={styles.cardSub} numberOfLines={1}>
                        {provider ? (providerRole(provider) || "فني معتمد") : "جارٍ تحميل بيانات الفني…"}
                      </Text>
                    </View>
                    <CaretLeft size={16} color={colors.textMuted2} />
                  </PressableScale>
                ) : null}

                {/* المركبة والموقع كما كانا وقت الطلب — لا الحاليّين */}
                {vehicle || address ? (
                  <View style={styles.card}>
                    {vehicle ? (
                      <View style={styles.rowHead}>
                        <View style={styles.iconSmall}><Car size={18} weight="fill" color={colors.primary} /></View>
                        <View style={styles.copy}>
                          <Text style={styles.metaLabel}>المركبة</Text>
                          <Text style={styles.metaValue}>{vehicleTitle(vehicle)}{vehicleSub(vehicle) ? ` · ${vehicleSub(vehicle)}` : ""}</Text>
                        </View>
                      </View>
                    ) : null}
                    {vehicle && address ? <View style={styles.divider} /> : null}
                    {address ? (
                      <View style={styles.rowHead}>
                        <View style={styles.iconSmall}><MapPin size={18} weight="fill" color={colors.primary} /></View>
                        <View style={styles.copy}>
                          <Text style={styles.metaLabel}>موقع الخدمة</Text>
                          <Text style={styles.metaValue} numberOfLines={2}>{address}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <Text style={styles.sectionTitle}>مسار الطلب</Text>
                <View style={styles.card}>
                  <Timeline history={history} order={order} />
                </View>

                <Text style={styles.sectionTitle}>التفصيل المالي</Text>
                <View style={styles.card}>
                  <PriceRow label="سعر الخدمة" value={money(order.servicePrice ?? order.total ?? amount)} />
                  {order.discountAmount ? <PriceRow label="الخصم" value={`- ${money(order.discountAmount)}`} tone="success" /> : null}
                  <View style={styles.divider} />
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>الإجمالي</Text>
                    <Text style={styles.totalValue}>{money(amount)}</Text>
                  </View>

                  <View style={styles.payRow}>
                    <View style={styles.iconSmall}><Wallet size={17} weight="fill" color={colors.primary} /></View>
                    <View style={styles.copy}>
                      <Text style={styles.metaLabel}>طريقة الدفع</Text>
                      {/* كانت تُعرض «cash · pending» خاماً في أهمّ سطر بالشاشة */}
                      <Text style={styles.metaValue}>{paymentMethodLabel(order.paymentMethod)}</Text>
                    </View>
                    <StatusPill label={payment.label} tone={payment.tone} />
                  </View>
                </View>

                {actionError ? <ErrorBanner message={actionError} style={styles.banner} /> : null}

                {/* الإجراءات مشتقّة من دوال orderStatus وحدها — لا شروط محلّية
                    تتباعد عنها مع أول تعديل في قواعد الحالات. */}
                <View style={styles.actions}>
                  {isActive(order.status) ? (
                    <View style={styles.actionRow}>
                      <PrimaryButton
                        label="تتبّع الطلب"
                        icon={<NavigationArrow size={17} weight="fill" color={colors.onPrimary} />}
                        onPress={() => navigation?.navigate?.("Tracking", { orderId })}
                        style={styles.grow}
                      />
                      {order.providerId ? (
                        <PressableScale
                          accessibilityRole="button"
                          accessibilityLabel="محادثة الفني"
                          onPress={() => navigation?.navigate?.("Chat", { orderId, providerId: order.providerId })}
                          style={styles.chatButton}
                        >
                          <ChatCircle size={20} color={colors.primary} />
                        </PressableScale>
                      ) : null}
                    </View>
                  ) : null}

                  {canConfirm(order.status) ? (
                    <OutlineButton
                      label="تأكيد إتمام الخدمة"
                      onPress={() => navigation?.navigate?.("ConfirmCompletion", { orderId, order })}
                    />
                  ) : null}

                  {canReview(order.status) ? (
                    <OutlineButton
                      label="تقييم الخدمة"
                      onPress={() => navigation?.navigate?.("Review", { orderId, order })}
                    />
                  ) : null}

                  {/* أعلى قيمة للمستخدم المتكرّر: كانت تنقله إلى قائمة الخدمات
                      فارغة اليدين، فيعيد اختيار كل شيء من الصفر. */}
                  <OutlineButton
                    label="اطلب هذه الخدمة مجدداً"
                    icon={<ArrowClockwise size={17} color={colors.primary} />}
                    onPress={reorder}
                  />

                  {canCancel(order.status) ? (
                    <OutlineButton
                      danger
                      label="إلغاء الطلب"
                      icon={<X size={16} color={colors.danger} />}
                      onPress={() => { setActionError(""); setConfirmingCancel(true); }}
                    />
                  ) : null}
                </View>
              </>
            ) : null}
          </AsyncContent>
        )}
      </ScrollView>

      {/* التأكيد بـ ConfirmSheet حصراً: Alert.alert لا تُستدعى دوالّ أزراره
          على الويب، فكان زر «إلغاء الطلب» بلا أي أثر. */}
      <ConfirmSheet
        visible={confirmingCancel}
        title="إلغاء هذا الطلب؟"
        message="لا يمكن التراجع عن الإلغاء بعد تنفيذه. إن كنت دفعت مسبقاً يُعاد المبلغ إلى محفظتك."
        confirmLabel="نعم، ألغِ الطلب"
        cancelLabel="تراجع"
        danger
        busy={cancelling}
        onConfirm={doCancel}
        onCancel={() => setConfirmingCancel(false)}
      />
    </View>
  );
}

/**
 * المسار الزمني الكامل — هذا ما يحسم النزاعات.
 * كل نقطة كانت خضراء بعلامة صح مهما كانت الحالة، فيبدو الرفض إنجازاً.
 */
function Timeline({ history, order }) {
  const steps = history.length ? history : [{ status: order.status, createdAt: order.createdAt }];
  return (
    <>
      {steps.map((step, index) => {
        const value = step.status || step.toStatus;
        const meta = statusMeta(value);
        const [, foreground] = TONE_PALETTE[meta.tone] || TONE_PALETTE.neutral;
        const failed = meta.tone === "danger";
        const last = index === steps.length - 1;
        return (
          <View key={step.id || step._id || index} style={styles.step}>
            <View style={styles.stepRail}>
              <View style={[styles.stepDot, { backgroundColor: foreground }]}>
                {failed
                  ? <X size={11} weight="bold" color={colors.onPrimary} />
                  : <Check size={11} weight="bold" color={colors.onPrimary} />}
              </View>
              {!last ? <View style={styles.stepLine} /> : null}
            </View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepTitle}>{meta.label}</Text>
              <Text style={styles.stepTime}>{formatDateTime(step.createdAt || step.changedAt || step.timestamp)}</Text>
              {step.reason && failed ? <Text style={styles.stepReason}>{cancelReasonLabel(step.reason)}</Text> : null}
            </View>
          </View>
        );
      })}
    </>
  );
}

function PriceRow({ label, value, tone }) {
  const color = tone === "success" ? colors.success : undefined;
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, color && { color }]}>{label}</Text>
      <Text style={[styles.priceValue, color && { color }]}>{value}</Text>
    </View>
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
  skeleton: { gap: spacing.md, marginTop: spacing.lg },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  rowHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSmall: {
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: radius.xs,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: font.size.md, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  cardSub: { marginTop: 2, fontSize: font.size.xs, color: colors.textMuted, textAlign: "right" },
  metaLabel: { fontSize: font.size.xxs, color: colors.textMuted, textAlign: "right" },
  metaValue: { marginTop: 1, fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },

  scheduled: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  scheduledText: { flex: 1, fontSize: font.size.xs, color: colors.textBody, textAlign: "right" },

  providerCard: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: font.size.md, fontWeight: "700", color: colors.onPrimary },

  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: -spacing.xs,
    fontSize: font.size.md,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "right",
  },

  step: { flexDirection: "row-reverse", gap: spacing.md },
  stepRail: { alignItems: "center" },
  stepDot: { width: 22, height: 22, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  stepLine: { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.border, marginVertical: 2 },
  stepCopy: { flex: 1, paddingBottom: spacing.md },
  stepTitle: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  stepTime: { marginTop: 1, fontSize: font.size.xxs, color: colors.textMuted, textAlign: "right" },
  stepReason: { marginTop: 2, fontSize: font.size.xs, color: colors.textBody, textAlign: "right" },

  priceRow: { flexDirection: "row-reverse", justifyContent: "space-between", gap: spacing.md, paddingVertical: 5 },
  priceLabel: { fontSize: font.size.sm, color: colors.textBody },
  priceValue: { fontSize: font.size.sm, fontWeight: "600", color: colors.textDark },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.sm },
  totalRow: { flexDirection: "row-reverse", justifyContent: "space-between", gap: spacing.md },
  totalLabel: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark },
  totalValue: { fontSize: font.size.body, fontWeight: "700", color: colors.primary },
  payRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },

  banner: { marginTop: spacing.md },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  actionRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  grow: { flex: 1, width: "auto" },
  chatButton: {
    width: layout.buttonHeight,
    height: layout.buttonHeight,
    flexShrink: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  denied: { marginTop: spacing.xxl, alignItems: "center", gap: spacing.md },
  deniedIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerBg,
    alignItems: "center",
    justifyContent: "center",
  },
  deniedTitle: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "center" },
  deniedText: { fontSize: font.size.sm, color: colors.textBody, textAlign: "center", lineHeight: 22 },
});
