// ============================================================
//  OffersScreen — ٤٣ · العروض
//
//  مهمّتها تحويل عرض إلى طلب. والعقد يفرض شكل ذلك التحويل:
//  `applyOffer` **بلا `orderId`** يُنشئ «حجزاً» (`status: 'reserved'`) لا
//  يخصم شيئاً ولا يظهر أثره في أي مكان — تماماً كعلّة استبدال النقاط.
//  الخصم الحقيقي لا يقع إلا بتمرير طلب غير مدفوع، فيُخفَّض `payableAmount`
//  ويُختم الطلب بـ `metadata.appliedOfferId`.
//
//  لذلك الشاشة تختار الطلب أولاً ثم تطبّق، وتعرض قيمة الخصم المحسوبة
//  بنفس معادلة الخادم (`percentage` بسقف قيمة الطلب، و`fixed` كما هو،
//  و`points_multiplier` **لا يخصم شيئاً** فيُقال ذلك صراحةً).
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle, Copy, Info, Receipt, SealPercent, Timer } from "phosphor-react-native";
import {
  AppHeader,
  AsyncContent,
  ConfirmSheet,
  EmptyState,
  ErrorBanner,
  OutlineButton,
  PressableScale,
  PrimaryButton,
  SkeletonList,
  StatusPill,
} from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { applyOffer, fetchOffers } from "../../services/customerApi";
import { fetchOrders } from "../../services/ordersApi";
import { statusMeta } from "../../services/orderStatus";
import { CURRENCY } from "../../services/walletApi";

const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");
const money = (value) => `${arNum(value)} ${CURRENCY}`;
const offerId = (offer) => offer?.id || offer?._id;

/** نفس معادلة `calculateOfferDiscount` على الخادم — أي فرق بينهما يعني وعداً يُخلَف */
function discountFor(offer, payable) {
  if (!offer || offer.type === "points_multiplier") return 0;
  const raw = offer.type === "percentage" ? (payable * Math.min(Number(offer.value) || 0, 100)) / 100 : Number(offer.value) || 0;
  return Math.round(Math.min(raw, payable) * 100) / 100;
}

function valueLabel(offer) {
  if (offer?.type === "percentage") return `${arNum(offer.value)}٪`;
  if (offer?.type === "points_multiplier") return `${arNum(offer.value)}×`;
  return money(offer?.value);
}

function valueCaption(offer) {
  if (offer?.type === "percentage") return "خصم على قيمة الطلب";
  if (offer?.type === "points_multiplier") return "مضاعِف نقاط الوفاء";
  return "خصم ثابت";
}

/** الوقت المتبقّي — بصدق فقط: يُعرض إن كان للعرض تاريخ انتهاء حقيقي */
function remaining(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return { text: `يتبقّى ${arNum(days)} يوم`, soon: days <= 3 };
  const hours = Math.max(1, Math.round(diff / 3600000));
  return { text: `يتبقّى ${arNum(hours)} ساعة`, soon: true };
}

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
};

export default function OffersScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const presetOrderId = route?.params?.orderId || null;

  const [offers, setOffers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderId, setOrderId] = useState(presetOrderId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState("");
  const [result, setResult] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [offersResult, ordersResult] = await Promise.all([
        fetchOffers(),
        fetchOrders({ paymentStatus: "pending", limit: 50, sortBy: "createdAt", sortOrder: "desc" })
          .catch(() => ({ orders: [] })),
      ]);
      setOffers(Array.isArray(offersResult) ? offersResult : offersResult?.offers || []);
      // شروط أهلية الطلب كما يفحصها الخادم قبل تطبيق العرض
      const eligible = (ordersResult?.orders || []).filter(
        (order) =>
          !["completed", "cancelled", "rejected"].includes(order?.status) &&
          Number(order?.payableAmount ?? order?.totalAmount ?? order?.total ?? 0) > 0 &&
          !order?.metadata?.appliedOfferId,
      );
      setOrders(eligible);
      setOrderId((current) => current || (eligible[0] ? eligible[0].id || eligible[0]._id : null));
    } catch (loadError) {
      setError(loadError?.message || "تعذّر جلب العروض");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }, [load]);

  const order = useMemo(
    () => orders.find((item) => (item.id || item._id) === orderId) || null,
    [orders, orderId],
  );
  const payable = Number(order?.payableAmount ?? order?.totalAmount ?? order?.total ?? 0);

  const copyCode = async (code) => {
    try { await globalThis.navigator?.clipboard?.writeText?.(code); } catch { /* النسخ غير مدعوم */ }
    setCopied(code);
    setTimeout(() => setCopied((current) => (current === code ? "" : current)), 2000);
  };

  const submit = async () => {
    if (busy || !confirming || !order) return;
    setBusy(true);
    setActionError("");
    try {
      const response = await applyOffer(offerId(confirming), orderId);
      const discount = Number(response?.discountAmount ?? discountFor(confirming, payable));
      setResult({
        code: confirming.code,
        discount,
        payableAfter: Number(response?.payableAmount ?? Math.max(0, payable - discount)),
      });
      setConfirming(null);
      await load({ silent: true });
    } catch (applyError) {
      setConfirming(null);
      setActionError(applyError?.message || "تعذّر تطبيق العرض، حاول مجدداً");
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <AppHeader title="العروض والكوبونات" subtitle="خصومات تُطبَّق على طلب غير مدفوع" onBack={() => navigation?.goBack?.()} />

        <AsyncContent
          loading={loading}
          error={error}
          hasData={offers.length > 0}
          isEmpty={!loading && !error && offers.length === 0}
          onRetry={() => load()}
          errorTitle="تعذّر تحميل العروض"
          skeleton={<SkeletonList count={3} lines={3} />}
          empty={{
            icon: <SealPercent size={32} color={colors.primary} />,
            title: "لا توجد عروض متاحة الآن",
            message: "تصلك العروض الموسمية وخصومات الخدمات هنا. فعّل إشعارات التطبيق لتصلك فور نشرها.",
            actionLabel: "إعدادات الإشعارات",
            onAction: () => navigation?.navigate?.("Settings"),
          }}
        >
          {result ? (
            <View style={styles.resultCard}>
              <View style={styles.resultIcon}><CheckCircle size={32} weight="fill" color={colors.success} /></View>
              <Text style={styles.resultTitle}>طُبِّق العرض {result.code}</Text>
              <Text style={styles.resultText}>
                خُصم {money(result.discount)} — المتبقّي على الطلب {money(result.payableAfter)}.
              </Text>
              <PrimaryButton
                label="عرض الطلب"
                onPress={() => navigation?.navigate?.("OrderDetail", { orderId })}
                style={styles.resultAction}
              />
              <OutlineButton label="تصفّح عروضاً أخرى" onPress={() => setResult(null)} style={styles.resultAction} />
            </View>
          ) : (
            <>
              <ErrorBanner message={actionError} style={styles.banner} />

              {/* العرض بلا طلب لا يخصم شيئاً — يُقال قبل الضغط لا بعده */}
              {orders.length === 0 ? (
                <View style={styles.note}>
                  <Info size={16} weight="fill" color={colors.info} />
                  <Text style={styles.noteText}>
                    الخصم يُطبَّق على طلب غير مدفوع. اطلب خدمة أولاً ثم عُد لتطبيق العرض على قيمتها.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>الطلب الذي سيُطبَّق عليه</Text>
                  <View style={styles.orders}>
                    {orders.map((item) => {
                      const id = item.id || item._id;
                      const active = id === orderId;
                      const meta = statusMeta(item.status);
                      const amount = Number(item.payableAmount ?? item.totalAmount ?? item.total ?? 0);
                      return (
                        <PressableScale
                          key={id}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.serviceName || "طلب"}، ${arNum(amount)} ليرة، ${meta.label}`}
                          accessibilityState={{ selected: active }}
                          onPress={() => { setOrderId(id); setActionError(""); }}
                          style={[styles.orderCard, active && styles.orderCardActive]}
                        >
                          <View style={styles.orderCopy}>
                            <Text style={styles.orderTitle} numberOfLines={1}>
                              {item.serviceName || item?.metadata?.serviceName || "خدمة سيارة"}
                            </Text>
                            <Text style={styles.orderMeta} numberOfLines={1}>
                              {meta.label} · {item.orderNumber}
                            </Text>
                          </View>
                          <Text style={styles.orderAmount}>{money(amount)}</Text>
                        </PressableScale>
                      );
                    })}
                  </View>
                </>
              )}

              <Text style={styles.sectionTitle}>العروض المتاحة</Text>
              <View style={styles.list}>
                {offers.map((offer) => {
                  const id = offerId(offer);
                  const left = remaining(offer.expiresAt);
                  const discount = order ? discountFor(offer, payable) : 0;
                  const pointsOnly = offer.type === "points_multiplier";
                  const usable = !!order && (pointsOnly || discount > 0);

                  return (
                    <View key={id} style={[styles.card, left?.soon && styles.cardSoon]}>
                      {/* التسلسل: القيمة أبرز عنصر، ثم الخدمة، ثم الشرط، ثم الصلاحية */}
                      <View style={styles.cardHead}>
                        <View style={styles.valueBox}>
                          <Text style={styles.value}>{valueLabel(offer)}</Text>
                          <Text style={styles.valueCaption}>{valueCaption(offer)}</Text>
                        </View>
                        <View style={styles.cardCopy}>
                          <Text style={styles.cardTitle} numberOfLines={2}>{offer.title || offer.code}</Text>
                          {offer.description ? (
                            <Text style={styles.cardDesc} numberOfLines={3}>{offer.description}</Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.terms}>
                        <TermRow label="الصلاحية" value={offer.expiresAt ? `حتى ${formatDate(offer.expiresAt)}` : "بلا تاريخ انتهاء"} />
                        <TermRow
                          label="الأثر"
                          value={pointsOnly
                            ? "يضاعف نقاط الوفاء ولا يخفّض قيمة الطلب"
                            : order
                              ? `يخصم ${money(discount)} من هذا الطلب`
                              : "يُحسب الخصم بعد اختيار الطلب"}
                        />
                      </View>

                      {left ? (
                        <View style={[styles.timer, left.soon && styles.timerSoon]}>
                          <Timer size={14} weight="fill" color={left.soon ? colors.warning : colors.textMuted} />
                          <Text style={[styles.timerText, left.soon && styles.timerTextSoon]}>{left.text}</Text>
                        </View>
                      ) : null}

                      <View style={styles.cardActions}>
                        <PressableScale
                          accessibilityRole="button"
                          accessibilityLabel={`نسخ رمز العرض ${offer.code}`}
                          onPress={() => copyCode(offer.code)}
                          style={styles.codeBox}
                        >
                          <Copy size={14} color={colors.textMuted} />
                          <Text style={styles.code} numberOfLines={1}>{offer.code}</Text>
                          {copied === offer.code ? <StatusPill label="نُسخ" tone="success" /> : null}
                        </PressableScale>

                        {usable ? (
                          <PrimaryButton
                            label="استخدم العرض"
                            height={44}
                            onPress={() => { setActionError(""); setConfirming(offer); }}
                            style={styles.useButton}
                          />
                        ) : (
                          // غير المؤهّل يُبيَّن بسببه لا يُخفى
                          <Text style={styles.blocked}>
                            {!order ? "اختر طلباً غير مدفوع لتطبيقه" : "لا ينتج خصماً على هذا الطلب"}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </AsyncContent>
      </ScrollView>

      <ConfirmSheet
        visible={!!confirming}
        title="تطبيق العرض؟"
        message={
          confirming
            ? `${confirming.title || confirming.code}\n` +
              `${confirming.type === "points_multiplier"
                ? "يضاعف نقاط الوفاء على هذا الطلب"
                : `يخصم ${money(discountFor(confirming, payable))} من ${money(payable)}`}\n` +
              "لا يمكن تطبيق أكثر من عرض واحد على الطلب."
            : ""
        }
        confirmLabel="نعم، طبّق"
        cancelLabel="تراجع"
        busy={busy}
        onConfirm={submit}
        onCancel={() => setConfirming(null)}
      />
    </View>
  );
}

function TermRow({ label, value }) {
  return (
    <View style={styles.termRow}>
      <Text style={styles.termLabel}>{label}</Text>
      <Text style={styles.termValue} numberOfLines={2}>{value}</Text>
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
  banner: { marginTop: spacing.md },

  note: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.infoBg,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.lg,
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
  orders: { gap: spacing.sm },
  orderCard: {
    minHeight: 60,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
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

  list: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardSoon: { borderColor: colors.warningBg, borderWidth: 1.5 },
  cardHead: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.md },
  valueBox: {
    minWidth: 92,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: colors.tint,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  value: { fontSize: font.size.h1, fontWeight: "700", color: colors.primary },
  valueCaption: { fontSize: font.size.xxs, color: colors.primary, textAlign: "center" },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: font.size.md, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  cardDesc: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 4, textAlign: "right", lineHeight: 19 },

  terms: { gap: 4 },
  termRow: { flexDirection: "row-reverse", justifyContent: "space-between", gap: spacing.md },
  termLabel: { flexShrink: 0, fontSize: font.size.xs, color: colors.textMuted },
  termValue: { flex: 1, fontSize: font.size.xs, fontWeight: "600", color: colors.textBody, textAlign: "left" },

  timer: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  timerSoon: { backgroundColor: colors.warningBg },
  timerText: { fontSize: font.size.xxs, fontWeight: "700", color: colors.textMuted },
  timerTextSoon: { color: colors.warning },

  cardActions: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  codeBox: {
    flex: 1,
    minHeight: layout.touchTarget,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
  },
  code: { flexShrink: 1, fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, letterSpacing: 1 },
  useButton: { flexShrink: 0, width: "auto", minWidth: 140 },
  blocked: { flexShrink: 1, maxWidth: 150, fontSize: font.size.xxs, color: colors.textMuted, textAlign: "center" },

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
  resultAction: { alignSelf: "stretch", marginTop: spacing.xs },
});
