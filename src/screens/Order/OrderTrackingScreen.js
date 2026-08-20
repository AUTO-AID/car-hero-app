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
import TrackingMap from "../../components/TrackingMap";

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

// نفس مجموعة الحالات التي يسمح فيها الخادم بتحديث الموقع
// (UpdateProviderLocationUseCase). عرض خريطة حيّة خارجها وعدٌ لا يُوفى.
const TRACKABLE_STATUSES = new Set([
  "accepted",
  "provider_assigned",
  "provider_en_route",
  "provider_arrived",
  "in_progress",
]);

const arNum = (value) => Number(value).toLocaleString("ar-EG");
const oneDecimal = (value) => Math.round(Number(value) * 10) / 10;
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
  // معلومات المسار القادمة من الخريطة (مسافة طريق حقيقية عند نجاح التوجيه)
  const [routeInfo, setRouteInfo] = useState(null);
  // تنبيه غير قاتل: الشاشة تبقى تعمل لكن التحديث المباشر قد لا يصل
  const [notice, setNotice] = useState("");

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

  // أسماء الأحداث يجب أن تطابق ClientEvents/ServerEvents في البوّابة حرفياً.
  // كانت الشاشة تنضمّ بـ "join_order" وتُصغي إلى "order_location_updated"
  // بينما البوّابة تستعمل "join:order" و"order:location:updated" — فلم ينضمّ
  // العميل إلى غرفة الطلب قطّ ولم يصله أي تحديث. التتبّع المباشر لم يكن
  // يعمل إطلاقاً، وكان يبدو كأنّ الفني لا يتحرّك.
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

      // الانضمام محروس بالصلاحية على الخادم؛ فشله بصمت = شاشة لا تتحدّث أبداً.
      // ويُعاد بعد كل إعادة اتصال وإلا خرجنا من الغرفة دون أن يظهر ذلك.
      const joinRoom = () => {
        socket.emit("join:order", { orderId }, (response) => {
          if (response && response.success === false) {
            setNotice("تعذّر الاشتراك بتحديثات هذا الطلب مباشرةً");
          } else {
            setNotice("");
          }
        });
      };

      socket.on("connect", () => { setLive(true); joinRoom(); });
      socket.on("disconnect", () => setLive(false));
      socket.on("connect_error", () => setLive(false));
      if (socket.connected) joinRoom();

      // القيم غير المعرّفة تُتجاهل: دمجها الخام كان يمسح حقولاً موجودة حين
      // لا يحملها الحدث (مثل status في حدث الموقع).
      const merge = (patch) => setTracking((previous) => {
        const next = { ...(previous || {}) };
        Object.keys(patch || {}).forEach((key) => {
          if (patch[key] !== undefined) next[key] = patch[key];
        });
        return next;
      });

      socket.on("order:status:updated", (payload) => merge({ status: payload?.status }));

      // شكل الحمولة يختلف عن شكل ردّ /tracking: الموقع تحت location لا
      // providerLocation، والوقت تحت timestamp. الدمج الخام كان يضع location
      // في الكائن ويترك providerLocation الذي تقرؤه الشاشة على قيمته القديمة.
      const applyLocation = (payload) => merge({
        providerLocation: payload?.location || payload?.providerLocation || null,
        providerLocationUpdatedAt:
          payload?.timestamp || payload?.recordedAt || payload?.updatedAt || new Date().toISOString(),
        providerHeading: typeof payload?.heading === "number" ? payload.heading : undefined,
        // السرعة اللحظية في الحدث (م/ث) لا تُستعمل في تقدير الوصول: قراءة
        // واحدة عند إشارة مرور تُنزل التقدير إلى الصفر ثم تُقفز به. الخادم
        // يحسب سرعة ممزوجة من المسار، وهي التي نعتمدها — تُجدَّد أدناه.
        isLive: true,
      });
      socket.on("order:location:updated", applyLocation);
      socket.on("provider:location:updated", applyLocation);
    }).catch(() => {});
    return () => {
      mounted = false;
      socketRef.current?.emit?.("leave:order", { orderId });
      socketRef.current?.disconnect?.();
      socketRef.current = null;
    };
  }, [orderId]);

  const status = String(tracking?.status || "pending").toLowerCase();
  const currentStep = STATUS_INDEX[status] ?? 0;
  const providerId = providerIdOf(tracking);
  const phone = providerPhone(tracking);
  const trackable = TRACKABLE_STATUSES.has(status);

  // قِدَم الإشارة يتغيّر بمرور الوقت لا بوصول بيانات جديدة؛ بلا نبضة دورية
  // يبقى «آخر تحديث» يبدو حديثاً إلى الأبد بعد انقطاع الفني.
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const updatedAtMs = tracking?.providerLocationUpdatedAt
    ? new Date(tracking.providerLocationUpdatedAt).getTime()
    : null;
  const stale = !updatedAtMs || nowTs - updatedAtMs > 120000;

  // الموقع يصل لحظياً عبر الـ socket، أمّا السرعة الممزوجة والمسافة فتُحسبان
  // على الخادم من سجلّ المسار ولا تُبَثّان. بلا تجديد دوري يبقى تقدير الوصول
  // مبنياً على سرعة لحظة فتح الشاشة طوال الرحلة.
  useEffect(() => {
    if (!orderId || !trackable) return undefined;
    const timer = setInterval(async () => {
      try {
        const fresh = await fetchTracking(orderId);
        setTracking((previous) => ({
          ...(previous || {}),
          // الموقع الأحدث يأتي من الـ socket؛ لا نتراجع عنه إلى قراءة الخادم
          speedKmH: fresh?.speedKmH,
          etaMinutes: fresh?.etaMinutes,
          distanceKm: fresh?.distanceKm,
          etaBasis: fresh?.etaBasis,
          status: fresh?.status ?? previous?.status,
        }));
      } catch {
        // فشل التجديد لا يُفسد الشاشة: القيم السابقة تبقى معروضة
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [orderId, trackable]);

  // الخريطة تقرأ الاتجاه من كائن الموقع نفسه
  const providerPoint = useMemo(() => {
    const location = tracking?.providerLocation;
    if (!location || !Array.isArray(location.coordinates)) return null;
    return {
      coordinates: location.coordinates,
      heading: typeof tracking?.providerHeading === "number" ? tracking.providerHeading : undefined,
    };
  }, [tracking?.providerLocation, tracking?.providerHeading]);

  // الخادم يقدّر المسافة هوائياً × معامل التفاف. فإن نجح توجيه الطرق في
  // الخريطة صارت لدينا مسافة طريق حقيقية وهي أدقّ — لكن الزمن يُحسب
  // بالسرعة المرصودة للفني لا بسرعة OSRM النظرية، لأن الأولى تعكس الازدحام.
  const distanceKm = routeInfo?.source === "osrm" && routeInfo.distanceKm != null
    ? routeInfo.distanceKm
    : tracking?.distanceKm;

  const etaMinutes = useMemo(() => {
    const speed = tracking?.speedKmH;
    if (routeInfo?.source === "osrm" && routeInfo.distanceKm != null && speed > 0) {
      return Math.max(1, Math.ceil((routeInfo.distanceKm / speed) * 60) + 1);
    }
    if (routeInfo?.durationMin != null) return Math.max(1, Math.ceil(routeInfo.durationMin));
    return tracking?.etaMinutes ?? null;
  }, [routeInfo, tracking?.speedKmH, tracking?.etaMinutes]);

  const etaLabel = useMemo(() => {
    if (status === "provider_arrived") return "وصل الفني إلى موقعك";
    if (status === "in_progress") return "الخدمة قيد التنفيذ";
    if (status === "awaiting_customer_confirmation") return "بانتظار تأكيد إتمام الخدمة";
    if (status === "completed") return "تم إكمال الخدمة";
    if (etaMinutes != null) return `الوصول المتوقع خلال ${arNum(etaMinutes)} دقيقة`;
    return "سيظهر وقت الوصول عند تحديث موقع الفني";
  }, [status, etaMinutes]);

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
                {notice ? (
                  <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text>
                ) : null}
              </View>
            </View>

            {/* الخريطة في حالات التتبّع فقط: خريطة ساكنة بعد انتهاء الخدمة
                توحي بتتبّع لم يعد قائماً. */}
            {trackable ? (
              <View style={styles.mapBlock}>
                <TrackingMap
                  provider={providerPoint}
                  destination={tracking?.destination}
                  traveled={tracking?.route}
                  updatedAt={tracking?.providerLocationUpdatedAt}
                  active={trackable}
                  stale={stale}
                  height={300}
                  onRouteInfo={setRouteInfo}
                />
              </View>
            ) : null}

            <View style={styles.metrics}>
              <Metric Icon={MapPin} label="المسافة" value={distanceKm != null ? `${arNum(oneDecimal(distanceKm))} كم` : "غير متاحة"} />
              <View style={styles.metricDivider} />
              <Metric Icon={Clock} label="الوقت المتوقع" value={etaMinutes != null ? `${arNum(etaMinutes)} دقيقة` : "غير متاح"} />
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
  notice: { marginTop: 4, color: colors.warning, fontSize: font.size.xxs, textAlign: "right" },
  mapBlock: { marginTop: spacing.sm },
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
