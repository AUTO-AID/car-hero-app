import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChatCircle,
  Check,
  Clock,
  FlagCheckered,
  MapPin,
  NavigationArrow,
  Phone,
  SealCheck,
  Truck,
  Wrench,
} from "phosphor-react-native";
import { AppHeader, ConfirmSheet, EmptyState, OutlineButton, PrimaryButton } from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { cancelOrder, fetchTracking } from "../../services/ordersApi";
import { canCancel, statusLabel } from "../../services/orderStatus";
import { createOrdersSocket } from "../../services/realtime";

const STEPS = [
  { label: "تم استلام الطلب", Icon: Check },
  { label: "تم تعيين الفني", Icon: Truck },
  { label: "الفني في الطريق", Icon: NavigationArrow },
  { label: "تنفيذ الخدمة", Icon: Wrench },
];

const STATUS_INDEX = {
  pending: 0,
  accepted: 1,
  provider_assigned: 1,
  provider_en_route: 2,
  provider_arrived: 2,
  in_progress: 3,
  awaiting_customer_confirmation: 3,
  completed: 3,
};

const arNum = (value) => Number(value).toLocaleString("ar-EG");
const orderIdOf = (value) => value?.id || value?._id || value;
const providerIdOf = (tracking) => orderIdOf(tracking?.providerId || tracking?.provider?._id || tracking?.provider?.id);
const providerName = (tracking) => tracking?.provider?.businessName || tracking?.provider?.fullName || "الفني المسؤول";
const providerPhone = (tracking) => tracking?.provider?.phoneNumber || tracking?.provider?.phone || "";

function formatUpdatedAt(value) {
  if (!value) return "لا يوجد تحديث للموقع بعد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "لا يوجد تحديث للموقع بعد";
  return `آخر تحديث ${date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function OrderTrackingScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const orderId = route?.params?.orderId || orderIdOf(route?.params?.order);
  const [tracking, setTracking] = useState(route?.params?.tracking || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  // انقطاع الـ socket يجمّد الشاشة بصمت: المستخدم يظن أن الفني توقّف بينما
  // البيانات هي التي توقّفت. نُظهر الانقطاع صراحةً مع آخر تحديث معروف.
  const [live, setLive] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) {
      setError("رقم الطلب غير متوفر");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setTracking(await fetchTracking(orderId));
    } catch (loadError) {
      setError(loadError?.message || "تعذر تحميل التتبع");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!orderId) return undefined;
    let mounted = true;
    createOrdersSocket().then((socket) => {
      if (!mounted) {
        socket.disconnect();
        return;
      }
      socketRef.current = socket;
      setLive(!!socket.connected);
      socket.on("connect", () => setLive(true));
      socket.on("disconnect", () => setLive(false));
      socket.on("connect_error", () => setLive(false));
      socket.emit("join_order", { orderId });
      const merge = (patch) => setTracking((previous) => ({ ...(previous || {}), ...(patch || {}) }));
      socket.on("order_location_updated", merge);
      socket.on("order_status_updated", merge);
      socket.on("provider_location_updated", (payload) => merge({
        providerLocation: payload?.location || payload?.providerLocation || payload,
        providerLocationUpdatedAt: payload?.recordedAt || payload?.updatedAt || new Date().toISOString(),
        isLive: true,
      }));
    }).catch(() => {});
    return () => {
      mounted = false;
      socketRef.current?.emit?.("leave_order", { orderId });
      socketRef.current?.disconnect?.();
      socketRef.current = null;
    };
  }, [orderId]);

  const status = String(tracking?.status || "pending").toLowerCase();
  const currentStep = STATUS_INDEX[status] ?? 0;
  const providerId = providerIdOf(tracking);
  const phone = providerPhone(tracking);
  const etaLabel = useMemo(() => {
    if (tracking?.etaMinutes != null) return `الوصول المتوقع خلال ${arNum(tracking.etaMinutes)} دقيقة`;
    if (status === "provider_arrived") return "وصل الفني إلى موقعك";
    if (status === "in_progress") return "الخدمة قيد التنفيذ";
    if (status === "awaiting_customer_confirmation") return "بانتظار تأكيد إتمام الخدمة";
    if (status === "completed") return "تم إكمال الخدمة";
    return "سيظهر وقت الوصول عند تحديث موقع الفني";
  }, [status, tracking?.etaMinutes]);

  // الإلغاء عبر ConfirmSheet لا Alert.alert: الأخير لا يعمل على الويب،
  // فكان زر الإلغاء يبدو مستجيباً ولا يفعل شيئاً إطلاقاً.
  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await cancelOrder(orderId, "إلغاء من المستخدم");
      setCancelOpen(false);
      navigation?.navigate?.("Orders");
    } catch (e) {
      setCancelOpen(false);
      setError(e?.message || "تعذّر إلغاء الطلب");
    } finally {
      setCancelling(false);
    }
  };

  const callProvider = () => {
    const sanitized = String(phone).replace(/[^+\d]/g, "");
    if (sanitized) Linking.openURL(`tel:${sanitized}`).catch(() => {});
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl }]}
      >
        <AppHeader title="تتبع الطلب" subtitle={tracking?.orderNumber || ""} onBack={() => navigation?.goBack?.()} />

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.stateText}>جاري تحميل التتبع...</Text></View>
        ) : error ? (
          <EmptyState title="تعذر تحميل التتبع" message={error} actionLabel="إعادة المحاولة" onAction={load} />
        ) : (
          <>
            <View style={styles.statusPanel}>
              <View style={styles.statusIcon}><NavigationArrow size={27} weight="fill" color={colors.primary} /></View>
              <View style={styles.statusCopy}>
                <View style={styles.liveRow}>
                  {/* الحالة تُقرأ من الـ socket نفسه: «تتبع مباشر» بينما
                      الاتصال ساقط وعدٌ كاذب يجعل المستخدم يظنّ الفني متوقّفاً. */}
                  <View style={[styles.liveDot, !live && styles.liveDotStale]} />
                  <Text style={[styles.liveText, !live && styles.liveTextStale]}>
                    {live ? "تتبع مباشر" : "انقطع التحديث المباشر"}
                  </Text>
                </View>
                {/* الحالة المعرّبة حصراً عبر statusLabel — ممنوع provider_en_route خاماً */}
                <Text style={styles.statusName}>{statusLabel(tracking?.status)}</Text>
                <Text style={styles.eta}>{etaLabel}</Text>
                <Text style={styles.updated}>{formatUpdatedAt(tracking?.providerLocationUpdatedAt)}</Text>
              </View>
            </View>

            <View style={styles.metrics}>
              <Metric Icon={MapPin} label="المسافة" value={tracking?.distanceKm != null ? `${arNum(tracking.distanceKm)} كم` : "غير متاحة"} />
              <View style={styles.metricDivider} />
              <Metric Icon={Clock} label="الوقت المتوقع" value={tracking?.etaMinutes != null ? `${arNum(tracking.etaMinutes)} دقيقة` : "غير متاح"} />
            </View>

            <Text style={styles.sectionTitle}>حالة الطلب</Text>
            <View style={styles.timeline}>
              {STEPS.map((step, index) => {
                const done = index < currentStep || status === "completed";
                const active = index === currentStep && status !== "completed";
                return (
                  <View key={step.label} style={styles.stepRow}>
                    <View style={styles.stepRail}>
                      <View style={[styles.stepDot, done && styles.stepDone, active && styles.stepActive]}>
                        <step.Icon size={15} weight={done || active ? "fill" : "regular"} color={done || active ? colors.onPrimary : colors.textMuted2} />
                      </View>
                      {index < STEPS.length - 1 ? <View style={[styles.stepLine, index < currentStep && styles.stepLineDone]} /> : null}
                    </View>
                    <View style={styles.stepCopy}>
                      <Text style={[styles.stepLabel, (done || active) && styles.stepLabelActive]}>{step.label}</Text>
                      {active ? <Text style={styles.stepNow}>الحالة الحالية</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>الفني المسؤول</Text>
            <View style={styles.providerCard}>
              <View style={styles.avatar}><Text style={styles.initials}>{providerName(tracking).trim().slice(0, 2)}</Text></View>
              <View style={styles.providerCopy}>
                <Text style={styles.providerName} numberOfLines={1}>{providerName(tracking)}</Text>
                <Text style={styles.providerMeta}>{tracking?.isLive ? "متصل الآن" : "التتبع غير مباشر حالياً"}</Text>
              </View>
            </View>
            <View style={styles.contactActions}>
              <OutlineButton
                label="اتصال"
                icon={<Phone size={18} weight="fill" color={phone ? colors.primary : colors.textMuted2} />}
                onPress={callProvider}
                disabled={!phone}
                style={styles.contactButton}
              />
              <OutlineButton
                label="محادثة"
                icon={<ChatCircle size={18} weight="fill" color={providerId ? colors.primary : colors.textMuted2} />}
                onPress={() => navigation?.navigate?.("Chat", { orderId, providerId, providerName: providerName(tracking) })}
                disabled={!providerId}
                style={styles.contactButton}
              />
            </View>

            {/* الإلغاء متاح فقط في الحالات التي يسمح بها canCancel — عرضه بعد
                وصول الفني وعدٌ لا يمكن الوفاء به */}
            {canCancel(status) ? (
              <OutlineButton
                label="إلغاء الطلب"
                danger
                onPress={() => setCancelOpen(true)}
                style={styles.finalAction}
              />
            ) : null}

            {status === "awaiting_customer_confirmation" ? (
              <PrimaryButton
                label="تأكيد إتمام الخدمة"
                icon={<SealCheck size={18} weight="fill" color={colors.onPrimary} />}
                onPress={() => navigation?.navigate?.("ConfirmCompletion", { orderId })}
                style={styles.finalAction}
              />
            ) : null}
            {status === "completed" ? (
              <PrimaryButton
                label="تقييم الخدمة"
                icon={<FlagCheckered size={18} weight="fill" color={colors.onPrimary} />}
                onPress={() => navigation?.navigate?.("Review", { orderId })}
                style={styles.finalAction}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      <ConfirmSheet
        visible={cancelOpen}
        title="إلغاء الطلب؟"
        message="سيتوقّف الفني عن التوجّه إليك. إن كنت قد دفعت، تُعاد المبالغ حسب سياسة الإلغاء."
        confirmLabel="نعم، ألغِ الطلب"
        cancelLabel="تراجع"
        danger
        busy={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </View>
  );
}

function Metric({ Icon, label, value }) {
  return (
    <View style={styles.metric}>
      <Icon size={18} weight="fill" color={colors.secondary} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
  content: { width: "100%", maxWidth: layout.contentMaxWidth, alignSelf: "center", paddingHorizontal: spacing.screenH },
  loading: { minHeight: 300, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  stateText: { color: colors.textMuted, fontSize: font.size.sm, textAlign: "center" },
  statusPanel: { minHeight: 116, flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.card, padding: spacing.lg, marginTop: spacing.lg },
  statusIcon: { width: 54, height: 54, flexShrink: 0, borderRadius: radius.sm, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  statusCopy: { flex: 1, minWidth: 0 },
  liveRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  liveDotStale: { backgroundColor: colors.warning },
  liveText: { color: colors.success, fontSize: font.size.xxs, fontWeight: "700" },
  liveTextStale: { color: colors.warning },
  statusName: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "right", marginTop: 2 },
  eta: { marginTop: spacing.xs, color: colors.textDark, fontSize: font.size.body, fontWeight: "700", textAlign: "right" },
  updated: { marginTop: 2, color: colors.textMuted, fontSize: font.size.xxs, textAlign: "right" },
  metrics: { minHeight: 84, flexDirection: "row-reverse", alignItems: "center", backgroundColor: colors.secondarySoft, borderRadius: radius.card, marginTop: spacing.sm, paddingVertical: spacing.md },
  metric: { flex: 1, minWidth: 0, alignItems: "center", gap: 2 },
  metricDivider: { width: 1, height: 44, backgroundColor: "#CBE3E0" },
  metricLabel: { fontSize: font.size.xxs, color: colors.textMuted },
  metricValue: { maxWidth: "92%", fontSize: font.size.xs, fontWeight: "700", color: colors.secondary, textAlign: "center" },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm, fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  timeline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  stepRow: { minHeight: 62, flexDirection: "row-reverse", gap: spacing.md },
  stepRail: { width: 30, alignItems: "center" },
  stepDot: { width: 30, height: 30, zIndex: 1, borderRadius: 15, borderWidth: 1, borderColor: colors.borderInput, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  stepDone: { borderColor: colors.success, backgroundColor: colors.success },
  stepActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  stepLine: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: -1 },
  stepLineDone: { backgroundColor: colors.success },
  stepCopy: { flex: 1, minWidth: 0, paddingTop: 4 },
  stepLabel: { fontSize: font.size.sm, fontWeight: "600", color: colors.textMuted, textAlign: "right" },
  stepLabelActive: { color: colors.textDark, fontWeight: "700" },
  stepNow: { fontSize: font.size.xxs, color: colors.primary, marginTop: 1, textAlign: "right" },
  providerCard: { minHeight: 72, flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.card, padding: spacing.md },
  avatar: { width: 46, height: 46, flexShrink: 0, borderRadius: radius.sm, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: font.size.sm, fontWeight: "700", color: colors.primary },
  providerCopy: { flex: 1, minWidth: 0 },
  providerName: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  providerMeta: { fontSize: font.size.xxs, color: colors.textMuted, marginTop: 1, textAlign: "right" },
  contactActions: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.sm },
  contactButton: { flex: 1 },
  finalAction: { marginTop: spacing.xl },
});
