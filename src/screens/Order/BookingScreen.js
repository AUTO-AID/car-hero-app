// ============================================================
//  BookingScreen — ٢٤ · حجز موعد مسبق
//
//  مسار مختلف جوهرياً عن الطلب الفوري: المستخدم غير مستعجل، لكنه يحتاج
//  **يقيناً بالتوفّر**. الوعد بموعد غير متاح فعلاً أسوأ من عدم عرضه، لذلك
//  كل فتحة معروضة هنا مبنيّة على قواعد الخادم نفسها (ساعات العمل + مدّة
//  الخدمة + المستقبل)، وكل فتحة معطّلة تحمل سبب تعطيلها مكتوباً.
//
//  ما كان قبل هذه النسخة: أيام وأوقات ثابتة في الكود، ومركز خدمة وهمي،
//  و«تأكيد الحجز» يستدعي goBack — أي شاشة تعرض وعداً ولا تنشئ حجزاً.
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CalendarCheck,
  CaretLeft,
  CaretRight,
  Clock,
  Info,
  WarningCircle,
} from "phosphor-react-native";
import {
  AppHeader,
  AsyncContent,
  ConfirmSheet,
  EmptyState,
  ErrorBanner,
  OutlineButton,
  PressableScale,
  PrimaryButton,
  SkeletonCard,
} from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { fetchService, serviceName as serviceNameOf, servicePrice } from "../../services/servicesApi";
import { buildOrderBody, createBooking, fetchBookings, isNoProviderError, isSlotConflictError } from "../../services/ordersApi";
import { ACTIVE_STATUSES } from "../../services/orderStatus";
import { getCoords } from "../../services/locationService";
import { qaParams } from "../../services/qa";
import {
  buildDays,
  buildSlots,
  formatDuration,
  nextFreeSlot,
} from "../../services/scheduling";

const DAYS_AHEAD = 14;
const DAYS_PER_PAGE = 7;
const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");

export default function BookingScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  // qaParams تُرجع {} خارج التطوير — تسمح بفحص الشاشة عبر ?qa=bookingNew
  const params = { ...qaParams(["serviceId"]), ...(route?.params || {}) };
  const { serviceId } = params;

  // إحداثيات الطلب تصل مع المعطيات من مسار الطلب؛ وإن غابت نستهلك المخزَّن
  // دون أن نسأل النظام — شاشة التمهيد وحدها تملك حقّ إظهار حوار الإذن.
  const paramCoords = useMemo(
    () =>
      Number.isFinite(params.longitude) && Number.isFinite(params.latitude)
        ? { longitude: params.longitude, latitude: params.latitude }
        : null,
    [params.longitude, params.latitude],
  );

  const [service, setService] = useState(null);
  const [busy, setBusy] = useState([]);
  const [coords, setCoords] = useState(paramCoords);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dayKey, setDayKey] = useState(null);
  const [slotKey, setSlotKey] = useState(null);
  const [page, setPage] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [suggestion, setSuggestion] = useState(null);

  // اللحظة الحالية تُثبَّت عند التحميل ثم تُحدَّث كل دقيقة: بدونها تبقى فتحة
  // مضت معروضة كمتاحة حتى يعيد المستخدم فتح الشاشة.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [serviceDoc, bookingsResult, currentCoords] = await Promise.all([
        serviceId ? fetchService(serviceId) : Promise.resolve(null),
        // حجوزات المستخدم نفسه: تعارضها معروف لنا مسبقاً فلا داعي لاكتشافه بالرفض
        fetchBookings({ statuses: ACTIVE_STATUSES.join(","), limit: 50 }).catch(() => ({ bookings: [] })),
        paramCoords ? Promise.resolve(paramCoords) : getCoords().catch(() => null),
      ]);
      setService(serviceDoc);
      setBusy(
        (bookingsResult?.bookings || [])
          .filter((booking) => booking?.scheduledAt)
          .map((booking) => ({
            startsAt: new Date(booking.scheduledAt),
            durationMinutes: booking?.metadata?.scheduledDurationMinutes || 60,
          })),
      );
      if (currentCoords) setCoords(currentCoords);
    } catch (loadError) {
      setError(loadError?.message || "تعذّر تحضير مواعيد الحجز");
    } finally {
      setLoading(false);
    }
  }, [serviceId, paramCoords]);

  useEffect(() => { load(); }, [load]);

  const duration = Number(service?.estimatedDuration) || 60;
  const days = useMemo(() => buildDays({ now, count: DAYS_AHEAD }), [now]);
  const day = useMemo(() => days.find((item) => item.key === dayKey) || days[0], [days, dayKey]);

  // لا مركز مختاراً: الحجز لا يوجَّه إلى فنّي بعينه، فالنافذة الزمنية عامّة
  // والتوفّر يُحسم على الخادم لحظة الحجز. لذلك كل فتحة هنا **تقديرية**، وهذا
  // معلن صراحة أدناه بدل ادّعاء يقين لا نملكه.
  const { slots, closed } = useMemo(
    () => buildSlots({ day, hours: null, duration, now, busy, assumed: true }),
    [day, duration, now, busy],
  );

  const slot = slots.find((item) => item.key === slotKey) || null;
  const availableCount = slots.filter((item) => !item.disabled).length;

  // اختيار اليوم يُبطل اختيار وقت لم يعد موجوداً — إبقاؤه يجعل الملخّص يكذب
  useEffect(() => {
    if (slotKey && !slots.some((item) => item.key === slotKey)) setSlotKey(null);
  }, [slots, slotKey]);

  const pages = Math.ceil(days.length / DAYS_PER_PAGE);
  const pageDays = days.slice(page * DAYS_PER_PAGE, page * DAYS_PER_PAGE + DAYS_PER_PAGE);

  const canSubmit = !!slot && !slot.disabled && !!serviceId && Number.isFinite(coords?.longitude);

  // نقرة ثانية قبل اكتمال الإنشاء = حجزان متطابقان وشكوى: الحارس المرجعي
  // يمنعها لأن تعطيل الزر وحده يعتمد على إعادة رسم غير متزامنة.
  const submittingRef = useRef(false);
  const submit = async () => {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    setSuggestion(null);
    try {
      const body = buildOrderBody({
        serviceId,
        longitude: coords.longitude,
        latitude: coords.latitude,
        vehicleId: params.vehicleId,
        scheduleTime: slot.startsAt.toISOString(),
        notes: params.notes,
      });
      const result = await createBooking(body);
      setConfirming(false);
      navigation?.replace?.("ProviderFound", {
        ...params,
        orderId: result?.id || result?._id,
        scheduled: true,
        scheduleTime: slot.startsAt.toISOString(),
      });
    } catch (bookingError) {
      setConfirming(false);
      // التعارض ونفاد الفنيين ليسا «خطأ»: لكل منهما بديل فوري، وعرضهما
      // برسالة عامة يحوّل خطوة قابلة للإنقاذ إلى طريق مسدود.
      if (isSlotConflictError(bookingError) || isNoProviderError(bookingError)) {
        setSuggestion(nextFreeSlot(slots, slot.key));
      }
      setSubmitError(bookingError?.message || "تعذّر إتمام الحجز، حاول مجدداً");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const useSuggestion = () => {
    setSlotKey(suggestion.key);
    setSuggestion(null);
    setSubmitError("");
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 120 },
        ]}
      >
        <AppHeader
          title="حجز موعد مسبق"
          subtitle="اختر اليوم والوقت المناسبين"
          onBack={() => navigation?.goBack?.()}
        />

        <AsyncContent
          loading={loading}
          error={error}
          hasData={!loading && !error}
          onRetry={load}
          errorTitle="تعذّر تحضير المواعيد"
          skeleton={
            <View style={styles.skeleton}>
              <SkeletonCard lines={2} />
              <SkeletonCard lines={3} />
              <SkeletonCard lines={3} />
            </View>
          }
        >
          <>
              {/* الخدمة والمدّة: النافذة الزمنية لا نقطة البداية — من يحجز
                  الساعة ١١ يحتاج أن يعرف متى يتحرّر، لا متى يبدأ فقط. */}
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.cardIcon}><CalendarCheck size={21} weight="fill" color={colors.primary} /></View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{serviceNameOf(service) || params.serviceName || "الخدمة المطلوبة"}</Text>
                    <Text style={styles.cardSub}>
                      مدّة تقديرية {formatDuration(duration)}
                      {servicePrice(service) ? ` · من ${arNum(servicePrice(service))} ل.س` : ""}
                    </Text>
                  </View>
                </View>
              </View>

              {/* إفصاح صريح عن حدود ما نعرفه: ادّعاء يقين لا نملكه يُنتج وعداً
                  يُخلَف عند التأكيد، وهو أسوأ من الاعتراف المسبق. */}
              <View style={styles.note} accessibilityRole="alert">
                <Info size={17} weight="fill" color={colors.info} />
                <Text style={styles.noteText}>
                  المواعيد المعروضة تقديرية — يُسنَد الحجز تلقائياً إلى أقرب فني متاح ويُؤكَّد التوفّر لحظة الحجز.
                </Text>
              </View>

              {/* الأيام: شبكة لا شريط أفقي — الشريط الأفقي لا يُسحب بالفأرة
                  على الويب، فتبقى أيامه الأخيرة غير قابلة للوصول أصلاً. */}
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>اختر اليوم</Text>
                <View style={styles.pager}>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel="الأسبوع السابق"
                    accessibilityState={{ disabled: page === 0 }}
                    disabled={page === 0}
                    onPress={() => setPage((value) => Math.max(0, value - 1))}
                    style={[styles.pagerBtn, page === 0 && styles.pagerBtnOff]}
                  >
                    <CaretRight size={15} weight="bold" color={page === 0 ? colors.textMuted2 : colors.primary} />
                  </PressableScale>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel="الأسبوع التالي"
                    accessibilityState={{ disabled: page >= pages - 1 }}
                    disabled={page >= pages - 1}
                    onPress={() => setPage((value) => Math.min(pages - 1, value + 1))}
                    style={[styles.pagerBtn, page >= pages - 1 && styles.pagerBtnOff]}
                  >
                    <CaretLeft size={15} weight="bold" color={page >= pages - 1 ? colors.textMuted2 : colors.primary} />
                  </PressableScale>
                </View>
              </View>

              <View style={styles.dayGrid}>
                {pageDays.map((item) => {
                  const active = item.key === day?.key;
                  return (
                    <PressableScale
                      key={item.key}
                      accessibilityRole="button"
                      accessibilityLabel={item.fullLabel}
                      accessibilityState={{ selected: active }}
                      onPress={() => { setDayKey(item.key); setSlotKey(null); }}
                      style={[styles.dayCell, active && styles.dayCellActive]}
                    >
                      <Text style={[styles.dayName, active && styles.dayNameActive]} numberOfLines={1}>{item.dayLabel}</Text>
                      <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>{item.numberLabel}</Text>
                      <Text style={[styles.dayMonth, active && styles.dayNameActive]} numberOfLines={1}>{item.monthLabel}</Text>
                    </PressableScale>
                  );
                })}
              </View>

              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>اختر الوقت</Text>
                <Text style={styles.sectionMeta}>
                  {closed ? "" : `${arNum(availableCount)} من ${arNum(slots.length)} متاح`}
                </Text>
              </View>

              {closed || !slots.length ? (
                <EmptyState
                  icon={<Clock size={30} color={colors.textMuted2} />}
                  title={closed ? "المركز مغلق في هذا اليوم" : "لا مواعيد تتّسع في هذا اليوم"}
                  message={
                    closed
                      ? "اختر يوماً آخر من الأيام المفتوحة أعلاه."
                      : `مدّة الخدمة ${formatDuration(duration)} ولا تتّسع ضمن ساعات العمل المتبقّية.`
                  }
                />
              ) : (
                <View style={styles.timeGrid}>
                  {slots.map((item) => {
                    const active = item.key === slotKey;
                    return (
                      <PressableScale
                        key={item.key}
                        accessibilityRole="button"
                        accessibilityLabel={
                          item.disabled
                            ? `${item.label}، غير متاح: ${item.reason}`
                            : `${item.label} حتى ${item.endLabel}`
                        }
                        accessibilityState={{ selected: active, disabled: item.disabled }}
                        disabled={item.disabled}
                        onPress={() => { setSlotKey(item.key); setSubmitError(""); setSuggestion(null); }}
                        style={[styles.timeCell, active && styles.timeCellActive, item.disabled && styles.cellDisabled]}
                      >
                        <Text style={[styles.timeText, active && styles.timeTextActive, item.disabled && styles.textDisabled]}>
                          {item.label}
                        </Text>
                        {/* سبب التعطيل مكتوب داخل الفتحة: زرّ باهت بلا تفسير
                            يُقرأ كعطل في التطبيق لا كقيد في الواقع. */}
                        {item.disabled ? <Text style={styles.timeReason}>{item.reason}</Text> : null}
                      </PressableScale>
                    );
                  })}
                </View>
              )}

              {slot ? (
                <View style={styles.summary}>
                  <Text style={styles.summaryTitle}>ملخّص الحجز</Text>
                  <SummaryRow label="اليوم" value={day.fullLabel} />
                  <SummaryRow label="الوقت" value={`${slot.label} — ${slot.endLabel}`} />
                  <SummaryRow label="المدّة" value={formatDuration(duration)} />
                  <SummaryRow label="الخدمة" value={serviceNameOf(service) || params.serviceName || "—"} />
                  <SummaryRow label="الفني" value="يُسنَد تلقائياً — الأقرب المتاح" />
                  <SummaryRow
                    label="السعر التقديري"
                    value={servicePrice(service) ? `${arNum(servicePrice(service))} ل.س` : "يُحدَّد بعد المعاينة"}
                  />
                  {slot.soon ? (
                    <View style={styles.warn}>
                      <WarningCircle size={16} weight="fill" color={colors.warning} />
                      <Text style={styles.warnText}>
                        الموعد خلال أقل من ساعتين — قد لا يكفي الوقت لوصول الفني. اختر موعداً أبعد إن أمكن.
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {submitError ? <ErrorBanner message={submitError} style={styles.banner} /> : null}
              {suggestion ? (
                <OutlineButton
                  label={`احجز ${suggestion.label} بدلاً منه`}
                  onPress={useSuggestion}
                  style={styles.suggestion}
                />
              ) : null}

              {!Number.isFinite(coords?.longitude) ? (
                <OutlineButton
                  label="تحديد موقعي لإتمام الحجز"
                  onPress={async () => {
                    // إيماءة صريحة من المستخدم — وحدها يُسمح لها بإظهار حوار الإذن
                    try { setCoords(await getCoords({ allowRequest: true, force: true })); }
                    catch (locationError) { setSubmitError(locationError?.message || "تعذّر تحديد الموقع"); }
                  }}
                  style={styles.suggestion}
                />
              ) : null}
          </>
        </AsyncContent>
      </ScrollView>

      {!loading && !error ? (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
          <PrimaryButton
            label={slot ? `تأكيد الحجز · ${slot.label}` : "اختر موعداً أولاً"}
            disabled={!canSubmit}
            loading={submitting}
            style={styles.cta}
            onPress={() => setConfirming(true)}
            accessibilityHint={
              !slot
                ? "اختر يوماً ووقتاً من الشبكة أعلاه"
                : !Number.isFinite(coords?.longitude)
                  ? "يلزم تحديد الموقع قبل إتمام الحجز"
                  : undefined
            }
          />
          {/* سبب التعطيل مكتوب لا مُستنتَج: زر معطّل صامت يوقف المستخدم بلا مخرج */}
          {!canSubmit ? (
            <Text style={styles.bottomHint}>
              {!slot ? "اختر يوماً ووقتاً لإتمام الحجز" : "يلزم تحديد موقعك لإتمام الحجز"}
            </Text>
          ) : null}
        </View>
      ) : null}

      <ConfirmSheet
        visible={confirming}
        title="تأكيد الحجز"
        message={
          slot
            ? `${day.fullLabel} · ${slot.label} حتى ${slot.endLabel}\n${serviceNameOf(service) || params.serviceName || ""}`
            : ""
        }
        confirmLabel="نعم، احجز"
        cancelLabel="تراجع"
        busy={submitting}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2}>{value}</Text>
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
  cardHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  cardIcon: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: font.size.md, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  cardSub: { marginTop: 2, fontSize: font.size.xs, color: colors.textMuted, textAlign: "right" },

  note: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.infoBg,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noteText: { flex: 1, fontSize: font.size.xs, color: colors.info, textAlign: "right", lineHeight: 19 },

  sectionHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: font.size.md, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  sectionMeta: { fontSize: font.size.xs, color: colors.textMuted },
  pager: { flexDirection: "row-reverse", gap: spacing.sm },
  pagerBtn: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerBtnOff: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft },

  dayGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  dayCell: {
    width: "22.4%",
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.surface,
  },
  dayCellActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayName: { fontSize: font.size.xxs, color: colors.textMuted },
  dayNameActive: { color: colors.primarySoft },
  dayNumber: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark },
  dayNumberActive: { color: colors.onPrimary },
  dayMonth: { fontSize: font.size.xxs, color: colors.textMuted2 },

  timeGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  timeCell: {
    width: "31.5%",
    minHeight: layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.surface,
  },
  timeCellActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeText: { fontSize: font.size.sm, fontWeight: "600", color: colors.textHeading },
  timeTextActive: { color: colors.onPrimary },
  timeReason: { marginTop: 1, fontSize: font.size.xxs, color: colors.textMuted2 },
  cellDisabled: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft },
  textDisabled: { color: colors.textMuted2 },

  summary: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  summaryTitle: { fontSize: font.size.md, fontWeight: "700", color: colors.textDark, textAlign: "right", marginBottom: spacing.sm },
  summaryRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 5,
  },
  summaryLabel: { flexShrink: 0, fontSize: font.size.sm, color: colors.textMuted },
  summaryValue: { flex: 1, fontSize: font.size.sm, fontWeight: "600", color: colors.textDark, textAlign: "left" },
  warn: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  warnText: { flex: 1, fontSize: font.size.xs, color: colors.warning, textAlign: "right", lineHeight: 19 },

  banner: { marginTop: spacing.md },
  suggestion: { marginTop: spacing.sm },

  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.md,
    backgroundColor: colors.screenBg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  cta: { maxWidth: layout.contentMaxWidth },
  bottomHint: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    marginTop: 6,
    fontSize: font.size.xs,
    color: colors.textMuted,
    textAlign: "center",
  },
});
