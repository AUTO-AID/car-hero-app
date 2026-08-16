// ============================================================
//  RedeemPointsScreen — ٣٢ · استبدال نقاط الوفاء
//
//  ما كانت الشاشة تقوله: «حوّل نقاط الوفاء إلى رصيد في محفظتك» — وهذا غير
//  صحيح. `RedeemLoyaltyPointsUseCase` يخصم النقاط ويسجّل حركة بـ
//  `balanceBefore === balanceAfter`؛ الرصيد لا يزداد إطلاقاً. القيمة الحقيقية
//  الوحيدة للنقاط هي **خصمها على طلب غير مدفوع** (`orderId`)، وعندها تُخفَّض
//  `payableAmount` بمقدار النقاط × قيمة النقطة.
//
//  لذلك أُعيد بناء الشاشة على المسار الوحيد الذي يُعطي المستخدم شيئاً فعلياً:
//  اختر طلباً مستحقّاً → شاهد الخصم والنتيجة → أكّد. والاستبدال بلا طلب لم
//  يعد ممكناً من الواجهة لأنه ببساطة يُبخّر النقاط.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle, Coins, Info, Receipt } from "phosphor-react-native";
import {
  AppHeader,
  AsyncContent,
  ConfirmSheet,
  EmptyState,
  ErrorBanner,
  PressableScale,
  PrimaryButton,
  SkeletonCard,
} from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import {
  CURRENCY,
  POINT_VALUE,
  currencyToPoints,
  fetchWallet,
  pointsToCurrency,
  redeemPoints,
} from "../../services/walletApi";
import { fetchOrders } from "../../services/ordersApi";
import { statusMeta } from "../../services/orderStatus";

const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");
// معادلة التحويل تُعرض بمقياس مفهوم: «١٠٠ نقطة = ٥ ل.س» أوضح من «٠٫٠٥ لكل نقطة»
const RATE_POINTS = 100;
const REDEEM_STEPS = [100, 250, 500, 1000];

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
};

export default function RedeemPointsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const [wallet, setWallet] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [orderId, setOrderId] = useState(null);
  const [points, setPoints] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [loadedWallet, ordersResult] = await Promise.all([
        fetchWallet(),
        fetchOrders({ paymentStatus: "pending", limit: 50, sortBy: "createdAt", sortOrder: "desc" }).catch(() => ({ orders: [] })),
      ]);
      setWallet(loadedWallet);
      // شروط الخادم نفسها: طلب غير مدفوع، غير منتهٍ، ولم يُخصم عليه من قبل
      const eligible = (ordersResult?.orders || []).filter(
        (order) =>
          !["completed", "cancelled", "rejected"].includes(order?.status) &&
          Number(order?.payableAmount ?? order?.totalAmount ?? order?.total ?? 0) > 0 &&
          !order?.metadata?.pointsRedemptionTransactionId,
      );
      setOrders(eligible);
      setOrderId((current) => current || (eligible[0] ? eligible[0].id || eligible[0]._id : null));
    } catch (loadError) {
      setError(loadError?.message || "تعذّر تحميل نقاطك");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const balance = Number(wallet?.loyaltyPoints ?? route?.params?.points ?? 0);
  const order = useMemo(
    () => orders.find((item) => (item.id || item._id) === orderId) || null,
    [orders, orderId],
  );
  const payable = Number(order?.payableAmount ?? order?.totalAmount ?? order?.total ?? 0);

  // الحدّ الأعلى المفيد: نقاط تفوق قيمةَ الطلب تُهدر بلا مقابل لأن الخادم
  // يقصّ الخصم عند `payableAmount` ولا يعيد الفائض.
  const maxUsefulPoints = useMemo(
    () => (payable > 0 ? Math.min(balance, currencyToPoints(payable)) : balance),
    [balance, payable],
  );

  const options = useMemo(() => {
    // العتبات المتاحة، **ومعها أوّل عتبة غير متاحة**: إخفاء الهدف يجعل البرنامج
    // يبدو مغلقاً، بينما رؤيته مع سبب التعطيل تحفّز على بلوغه.
    const affordable = REDEEM_STEPS.filter((step) => step <= balance);
    const nextGoal = REDEEM_STEPS.find((step) => step > balance);
    const steps = nextGoal ? [...affordable, nextGoal] : [...affordable];
    if (!steps.length) steps.push(REDEEM_STEPS[0]);
    if (maxUsefulPoints > 0 && !steps.includes(maxUsefulPoints)) steps.push(maxUsefulPoints);
    return [...new Set(steps)].sort((a, b) => a - b).map((value) => ({
      value,
      // العتبة غير المتاحة تبقى ظاهرة معطّلة بسببها: رؤية الهدف تحفّز، وإخفاؤه
      // يجعل البرنامج يبدو فارغاً
      disabled: value > balance,
      reason: value > balance ? `تحتاج ${arNum(value - balance)} نقطة إضافية` : "",
    }));
  }, [balance, maxUsefulPoints]);

  const selectedPoints = points ?? (maxUsefulPoints > 0 ? Math.min(maxUsefulPoints, options.find((o) => !o.disabled)?.value || 0) : 0);
  const discount = Math.min(pointsToCurrency(selectedPoints), payable || Infinity);
  const nextStep = REDEEM_STEPS.find((step) => step > balance) || null;
  const progress = nextStep ? Math.min(1, balance / nextStep) : 1;

  const canRedeem = !!order && selectedPoints > 0 && selectedPoints <= balance && payable > 0;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setActionError("");
    try {
      const response = await redeemPoints(selectedPoints, orderId);
      setConfirming(false);
      setResult({
        points: response?.redeemedPoints ?? selectedPoints,
        discount: response?.discountAmount ?? discount,
        payableAfter: response?.payableAmount ?? Math.max(0, payable - discount),
        remaining: response?.loyaltyPoints ?? Math.max(0, balance - selectedPoints),
      });
    } catch (redeemError) {
      setConfirming(false);
      setActionError(redeemError?.message || "تعذّر استبدال النقاط، حاول مجدداً");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <AppHeader title="نقاط الوفاء" subtitle="استخدم نقاطك كخصم على طلب" onBack={() => navigation?.goBack?.()} />

        <AsyncContent
          loading={loading}
          error={error}
          hasData={!!wallet}
          onRetry={load}
          errorTitle="تعذّر تحميل النقاط"
          skeleton={<View style={styles.skeleton}><SkeletonCard lines={2} /><SkeletonCard lines={3} /></View>}
        >
          {result ? (
            <View style={styles.resultCard}>
              <View style={styles.resultIcon}><CheckCircle size={34} weight="fill" color={colors.success} /></View>
              <Text style={styles.resultTitle}>طُبِّق الخصم</Text>
              <Text style={styles.resultText}>
                استُبدلت {arNum(result.points)} نقطة بخصم {arNum(result.discount)} {CURRENCY}. المتبقّي على الطلب{" "}
                {arNum(result.payableAfter)} {CURRENCY}، ورصيد نقاطك {arNum(result.remaining)} نقطة.
              </Text>
              <PrimaryButton
                label="عرض الطلب"
                onPress={() => navigation?.navigate?.("OrderDetail", { orderId })}
                style={styles.resultAction}
              />
            </View>
          ) : (
            <>
              {/* معادلة التحويل دائمة الظهور: نقاط بلا قيمة معلومة نقاط بلا معنى */}
              <View style={styles.rateCard}>
                <View style={styles.rateIcon}><Coins size={24} weight="fill" color={colors.accent} /></View>
                <View style={styles.rateCopy}>
                  <Text style={styles.rateTitle}>
                    {arNum(RATE_POINTS)} نقطة = {arNum(pointsToCurrency(RATE_POINTS))} {CURRENCY}
                  </Text>
                  <Text style={styles.rateSub}>قيمة النقطة الواحدة {arNum(POINT_VALUE)} {CURRENCY}</Text>
                </View>
              </View>

              <View style={styles.balanceCard}>
                <View style={styles.balanceCol}>
                  <Text style={styles.balanceLabel}>نقاطك</Text>
                  <Text style={styles.balanceValue}>{arNum(balance)}</Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceCol}>
                  <Text style={styles.balanceLabel}>قيمتها</Text>
                  <Text style={styles.balanceValue}>{arNum(pointsToCurrency(balance))} {CURRENCY}</Text>
                </View>
              </View>

              {nextStep ? (
                <View style={styles.progressBox}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    تبقّى {arNum(nextStep - balance)} نقطة للوصول إلى {arNum(nextStep)} نقطة
                    ({arNum(pointsToCurrency(nextStep))} {CURRENCY})
                  </Text>
                </View>
              ) : null}

              <View style={styles.note}>
                <Info size={16} weight="fill" color={colors.info} />
                <Text style={styles.noteText}>
                  النقاط تُستخدم كخصم على طلب غير مدفوع — لا تُحوَّل إلى رصيد نقدي في المحفظة.
                </Text>
              </View>

              {orders.length === 0 ? (
                <EmptyState
                  icon={<Receipt size={32} color={colors.textMuted2} />}
                  title="لا يوجد طلب مستحقّ الآن"
                  message="يُطبَّق خصم النقاط على طلب لم يُدفع بعد. اطلب خدمة، ثم عُد إلى هنا لخصم نقاطك من قيمتها."
                  actionLabel="تصفّح الخدمات"
                  onAction={() => navigation?.navigate?.("Services")}
                />
              ) : (
                <>
                  <Text style={styles.sectionTitle}>اختر الطلب</Text>
                  <View style={styles.list}>
                    {orders.map((item) => {
                      const id = item.id || item._id;
                      const active = id === orderId;
                      const meta = statusMeta(item.status);
                      const amount = Number(item.payableAmount ?? item.totalAmount ?? item.total ?? 0);
                      return (
                        <PressableScale
                          key={id}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.serviceName || "خدمة سيارة"}، ${arNum(amount)} ليرة، ${meta.label}`}
                          accessibilityState={{ selected: active }}
                          onPress={() => { setOrderId(id); setPoints(null); setActionError(""); }}
                          style={[styles.orderCard, active && styles.orderCardActive]}
                        >
                          <View style={styles.orderCopy}>
                            <Text style={styles.orderTitle} numberOfLines={1}>
                              {item.serviceName || item?.metadata?.serviceName || "خدمة سيارة"}
                            </Text>
                            <Text style={styles.orderMeta} numberOfLines={1}>
                              {meta.label} · {formatDate(item.createdAt)}
                            </Text>
                          </View>
                          <Text style={styles.orderAmount}>{arNum(amount)} {CURRENCY}</Text>
                        </PressableScale>
                      );
                    })}
                  </View>

                  <Text style={styles.sectionTitle}>عدد النقاط</Text>
                  <View style={styles.options}>
                    {options.map((option) => {
                      const active = !option.disabled && option.value === selectedPoints;
                      return (
                        <PressableScale
                          key={option.value}
                          accessibilityRole="button"
                          accessibilityLabel={
                            option.disabled
                              ? `${arNum(option.value)} نقطة، غير متاح: ${option.reason}`
                              : `${arNum(option.value)} نقطة، خصم ${arNum(pointsToCurrency(option.value))} ليرة`
                          }
                          accessibilityState={{ selected: active, disabled: option.disabled }}
                          disabled={option.disabled}
                          onPress={() => { setPoints(option.value); setActionError(""); }}
                          style={[styles.option, active && styles.optionActive, option.disabled && styles.optionDisabled]}
                        >
                          <Text style={[styles.optionValue, active && styles.optionValueActive, option.disabled && styles.optionTextDisabled]}>
                            {arNum(option.value)} نقطة
                          </Text>
                          <Text style={[styles.optionHint, active && styles.optionHintActive, option.disabled && styles.optionTextDisabled]}>
                            {option.disabled ? option.reason : `${arNum(pointsToCurrency(option.value))} ${CURRENCY}`}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </View>

                  {/* معاينة النتيجة قبل الالتزام — العملية لا تُلغى بعد تنفيذها */}
                  {canRedeem ? (
                    <View style={styles.preview}>
                      <PreviewRow label="النقاط المستخدمة" value={`${arNum(selectedPoints)} نقطة`} />
                      <PreviewRow label="قيمة الخصم" value={`${arNum(discount)} ${CURRENCY}`} tone="success" />
                      <View style={styles.divider} />
                      <PreviewRow label="المتبقّي على الطلب" value={`${arNum(Math.max(0, payable - discount))} ${CURRENCY}`} strong />
                      <PreviewRow label="نقاطك بعد الاستبدال" value={`${arNum(balance - selectedPoints)} نقطة`} />
                    </View>
                  ) : null}

                  <ErrorBanner message={actionError} style={styles.banner} />

                  <PrimaryButton
                    label={canRedeem ? `استبدل ${arNum(selectedPoints)} نقطة` : "اختر طلباً ونقاطاً"}
                    disabled={!canRedeem}
                    onPress={() => setConfirming(true)}
                    style={styles.cta}
                  />
                  {!canRedeem ? (
                    <Text style={styles.ctaHint}>
                      {balance === 0
                        ? "لا توجد نقاط في رصيدك بعد."
                        : !order
                          ? "اختر الطلب الذي تريد خصم النقاط منه."
                          : "اختر عدد النقاط المراد استبدالها."}
                    </Text>
                  ) : null}
                </>
              )}
            </>
          )}
        </AsyncContent>
      </ScrollView>

      <ConfirmSheet
        visible={confirming}
        title="تأكيد استبدال النقاط"
        message={`سيُخصم ${arNum(selectedPoints)} نقطة مقابل ${arNum(discount)} ${CURRENCY} من قيمة الطلب.\nلا يمكن التراجع بعد التنفيذ.`}
        confirmLabel="نعم، استبدل"
        cancelLabel="تراجع"
        busy={busy}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

function PreviewRow({ label, value, tone, strong }) {
  return (
    <View style={styles.previewRow}>
      <Text style={[styles.previewLabel, strong && styles.previewStrong]}>{label}</Text>
      <Text style={[styles.previewValue, strong && styles.previewStrong, tone === "success" && { color: colors.success }]}>
        {value}
      </Text>
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

  rateCard: {
    marginTop: spacing.lg,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  rateIcon: {
    width: 46,
    height: 46,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  rateCopy: { flex: 1, minWidth: 0 },
  rateTitle: { fontSize: font.size.md, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  rateSub: { fontSize: font.size.xs, color: colors.textBody, marginTop: 2, textAlign: "right" },

  balanceCard: {
    marginTop: spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
  },
  balanceCol: { flex: 1, alignItems: "center", gap: 2 },
  balanceDivider: { width: 1, alignSelf: "stretch", backgroundColor: colors.borderSoft },
  balanceLabel: { fontSize: font.size.xs, color: colors.textMuted },
  balanceValue: { fontSize: font.size.title, fontWeight: "700", color: colors.primary },

  progressBox: { marginTop: spacing.md, gap: 6 },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.accent },
  progressText: { fontSize: font.size.xs, color: colors.textMuted, textAlign: "right" },

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

  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: font.size.md,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "right",
  },
  list: { gap: spacing.sm },
  orderCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 60,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
  },
  orderCardActive: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.tint },
  orderCopy: { flex: 1, minWidth: 0 },
  orderTitle: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  orderMeta: { fontSize: font.size.xxs, color: colors.textMuted, marginTop: 2, textAlign: "right" },
  orderAmount: { flexShrink: 0, fontSize: font.size.sm, fontWeight: "700", color: colors.textHeading },

  options: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  option: {
    minWidth: "47%",
    flexGrow: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
  },
  optionActive: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.tint },
  optionDisabled: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderSoft },
  optionValue: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark },
  optionValueActive: { color: colors.primary },
  optionHint: { fontSize: font.size.xxs, color: colors.textMuted },
  optionHintActive: { color: colors.primary },
  optionTextDisabled: { color: colors.textMuted2 },

  preview: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  previewRow: { flexDirection: "row-reverse", justifyContent: "space-between", gap: spacing.md, paddingVertical: 5 },
  previewLabel: { fontSize: font.size.sm, color: colors.textMuted },
  previewValue: { fontSize: font.size.sm, fontWeight: "600", color: colors.textDark },
  previewStrong: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.sm },

  banner: { marginTop: spacing.md },
  cta: { marginTop: spacing.lg },
  ctaHint: { marginTop: 6, fontSize: font.size.xs, color: colors.textMuted, textAlign: "center" },

  resultCard: {
    marginTop: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.xl,
  },
  resultIcon: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    backgroundColor: colors.successBg,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "center" },
  resultText: { fontSize: font.size.sm, color: colors.textBody, textAlign: "center", lineHeight: 23 },
  resultAction: { alignSelf: "stretch", marginTop: spacing.sm },
});
