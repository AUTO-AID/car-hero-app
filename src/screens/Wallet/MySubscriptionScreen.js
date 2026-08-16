// ============================================================
//  MySubscriptionScreen — ٣٤ · اشتراكي
//
//  تحذير تقني مُلزم (مرصود في الخادم): `GET /subscriptions/status` يُرجع
//  `{ isActive, subscriptionId, planId, expiresAt, daysLeft }` فقط — **لا
//  حقل `status` نصّي، ولا كائن خطة مضمّن، ولا `autoRenew`**. أي شاشة تقرأ
//  `status` تعرض «لا يوجد اشتراك نشط» إلى الأبد، وأي شاشة تقرأ `autoRenew`
//  من هنا تعرض «يدوي» دائماً وإن كان التجديد مفعّلاً.
//
//  لذلك: الحالة من `isActive`، والخطة تُحلّ من `/subscriptions/plans` عبر
//  `planId`، وبقيّة الوثيقة (التجديد، المبلغ المدفوع، تاريخ البدء) من
//  `/subscriptions/history` بمطابقة `subscriptionId`.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowClockwise, Check, Crown, WarningCircle } from "phosphor-react-native";
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
  StatusPill,
} from "../../components/ui";
import { colors, font, gradients, layout, radius, spacing } from "../../theme/theme";
import {
  cancelSubscription,
  durationLabel,
  fetchCurrentSubscription,
  fetchPlans,
  findPlan,
  planList,
  tierLabel,
} from "../../services/subscriptionsApi";
import { CURRENCY } from "../../services/walletApi";

const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");
const money = (value) => `${arNum(value)} ${CURRENCY}`;
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
};

export default function MySubscriptionScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState(null);
  const [record, setRecord] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [confirming, setConfirming] = useState(null); // 'renew' | 'immediate'
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const subscription = await fetchCurrentSubscription();
      setStatus(subscription.status);
      setRecord(subscription.record);
      if (subscription.isActive && subscription.status?.planId) {
        try {
          const plans = planList(await fetchPlans(false));
          setPlan(findPlan(plans, subscription.status.planId));
        } catch {
          setPlan(null); // اسم الخطة تحسين — الحالة والتاريخ وصلا وهما الأهم
        }
      } else {
        setPlan(null);
      }
    } catch (loadError) {
      setError(loadError?.message || "تعذّر جلب بيانات اشتراكك");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isActive = status?.isActive === true;
  const daysLeft = Number(status?.daysLeft ?? 0);
  const autoRenew = record?.autoRenew !== false && !!record;
  const features = plan?.featuresAr || plan?.features || [];

  // تحذير تدريجي: التخويف المبكر يُنفّر، والصمت حتى آخر يوم يُفاجئ
  const expiry = useMemo(() => {
    if (!isActive) return null;
    if (daysLeft <= 0) return { tone: "warning", text: "ينتهي اشتراكك اليوم." };
    if (daysLeft <= 3) return { tone: "warning", text: `يتبقّى ${arNum(daysLeft)} أيام على انتهاء اشتراكك.` };
    if (daysLeft <= 7) return { tone: "info", text: `يتبقّى ${arNum(daysLeft)} أيام — جدّد قبل الانتهاء لتبقى المزايا فعّالة.` };
    return null;
  }, [isActive, daysLeft]);

  const doCancel = async () => {
    if (busy) return;
    const immediate = confirming === "immediate";
    setBusy(true);
    setActionError("");
    try {
      await cancelSubscription({ reason: "Cancelled by customer", cancelImmediately: immediate });
      setConfirming(null);
      setNotice(
        immediate
          ? "أُلغي اشتراكك فوراً."
          : "أُوقف التجديد التلقائي — يبقى اشتراكك فعّالاً حتى نهاية المدّة.",
      );
      await load();
    } catch (cancelError) {
      setConfirming(null);
      setActionError(cancelError?.message || "تعذّر تنفيذ الإلغاء، حاول مجدداً");
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
        <AppHeader title="اشتراكي" subtitle={isActive ? "تفاصيل خطتك الحالية" : ""} onBack={() => navigation?.goBack?.()} />

        <AsyncContent
          loading={loading}
          error={error}
          hasData={!!status}
          onRetry={load}
          errorTitle="تعذّر تحميل الاشتراك"
          skeleton={<View style={styles.skeleton}><SkeletonCard lines={3} /><SkeletonCard lines={3} /></View>}
        >
          {!isActive ? (
            // الفراغ هنا فرصة عرض قيمة لا رسالة جافّة
            <EmptyState
              icon={<Crown size={34} color={colors.primary} />}
              title="لا يوجد اشتراك نشط"
              message="الاشتراك يمنحك أولوية في الطلبات ودعماً أسرع وخصومات على الخدمات. تصفّح الخطط وقارنها قبل أن تقرّر."
              actionLabel="عرض الخطط"
              onAction={() => navigation?.navigate?.("Plans")}
            />
          ) : (
            <>
              <LinearGradient {...gradients.primaryDiag} style={styles.card}>
                <View style={styles.cardHead}>
                  <Crown size={22} weight="fill" color={colors.onPrimary} />
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {plan?.nameAr || plan?.name || "خطتك الحالية"}
                  </Text>
                  <View style={styles.activeChip}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>نشط</Text>
                  </View>
                </View>

                {plan ? (
                  <Text style={styles.cardSub}>
                    {[tierLabel(plan.tier), durationLabel(plan)].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}

                <View style={styles.cardMeta}>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>ينتهي في</Text>
                    <Text style={styles.metaValue}>{formatDate(status.expiresAt)}</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>المتبقّي</Text>
                    <Text style={styles.metaValue}>
                      {daysLeft > 0 ? `${arNum(daysLeft)} يوماً` : "ينتهي اليوم"}
                    </Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={styles.metaLabel}>التجديد</Text>
                    {/* تُقرأ من سجلّ الاشتراك لا من /status — لا يعيده أصلاً */}
                    <Text style={styles.metaValue}>{record ? (autoRenew ? "تلقائي" : "متوقّف") : "غير معروف"}</Text>
                  </View>
                </View>
              </LinearGradient>

              {expiry ? (
                <View style={[styles.expiry, expiry.tone === "warning" && styles.expiryWarning]}>
                  <WarningCircle
                    size={17}
                    weight="fill"
                    color={expiry.tone === "warning" ? colors.warning : colors.info}
                  />
                  <Text style={[styles.expiryText, expiry.tone === "warning" && styles.expiryTextWarning]}>
                    {expiry.text}
                  </Text>
                </View>
              ) : null}

              {notice ? <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text> : null}
              <ErrorBanner message={actionError} style={styles.banner} />

              {/* ما دفعه وما استفاده: أصدق مبرّر للتجديد هو رقم يعرفه المستخدم */}
              {record ? (
                <View style={styles.summary}>
                  <SummaryRow label="بدأ في" value={formatDate(record.startDate)} />
                  <SummaryRow label="المبلغ المدفوع" value={record.amountPaid ? money(record.amountPaid) : "مجاناً"} />
                  {plan?.price ? (
                    <SummaryRow
                      label="التكلفة اليومية"
                      value={money(Math.round(Number(plan.price) / Math.max(1, Number(plan.durationDays) || 1)))}
                    />
                  ) : null}
                  <SummaryRow
                    label="أيام استفدت منها"
                    value={`${arNum(Math.max(0, (Number(plan?.durationDays) || 0) - daysLeft))} يوماً`}
                  />
                </View>
              ) : null}

              <Text style={styles.sectionTitle}>مزايا خطتك</Text>
              {features.length === 0 ? (
                <Text style={styles.emptyLine}>لا توجد مزايا مفصّلة لهذه الخطة.</Text>
              ) : (
                <View style={styles.features}>
                  {features.map((feature) => (
                    <View key={feature} style={styles.featureRow}>
                      <Check size={15} weight="bold" color={colors.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.actions}>
                <PrimaryButton
                  label="تغيير الخطة"
                  icon={<ArrowClockwise size={17} color={colors.onPrimary} />}
                  onPress={() => navigation?.navigate?.("Plans")}
                />
                {autoRenew ? (
                  <OutlineButton
                    label="إيقاف التجديد التلقائي"
                    disabled={busy}
                    onPress={() => { setActionError(""); setNotice(""); setConfirming("renew"); }}
                  />
                ) : null}
              </View>

              {/* الإجراء المدمّر مفصول مكانياً وبلون تحذيري */}
              <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>إنهاء الاشتراك فوراً</Text>
                <Text style={styles.dangerText}>
                  تفقد المزايا في الحال ولا يُسترد المبلغ المدفوع عن المدّة المتبقّية
                  ({arNum(daysLeft)} يوماً). إن أردت الاحتفاظ بها حتى نهاية المدّة، أوقف التجديد التلقائي بدلاً من ذلك.
                </Text>
                <OutlineButton
                  danger
                  label="إنهاء الاشتراك الآن"
                  disabled={busy}
                  onPress={() => { setActionError(""); setNotice(""); setConfirming("immediate"); }}
                />
              </View>
            </>
          )}
        </AsyncContent>
      </ScrollView>

      <ConfirmSheet
        visible={!!confirming}
        title={confirming === "immediate" ? "إنهاء الاشتراك فوراً؟" : "إيقاف التجديد التلقائي؟"}
        message={
          confirming === "immediate"
            ? `ستفقد مزايا الخطة الآن، وتسقط ${arNum(daysLeft)} يوماً متبقّية بلا استرداد.`
            : `يبقى اشتراكك فعّالاً حتى ${formatDate(status?.expiresAt)}، ثم ينتهي بلا تجديد. يمكنك إعادة تفعيله في أي وقت.`
        }
        confirmLabel={confirming === "immediate" ? "نعم، أنهِ الآن" : "نعم، أوقف التجديد"}
        cancelLabel="تراجع"
        danger={confirming === "immediate"}
        busy={busy}
        onConfirm={doCancel}
        onCancel={() => setConfirming(null)}
      />
    </View>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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

  card: { borderRadius: radius.lg, padding: spacing.xl, marginTop: spacing.lg },
  cardHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  cardTitle: { flex: 1, fontSize: font.size.body, fontWeight: "700", color: colors.onPrimary, textAlign: "right" },
  activeChip: {
    flexShrink: 0,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: "#FFFFFF26",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#7EE0A9" },
  activeText: { fontSize: font.size.xxs, fontWeight: "700", color: colors.onPrimary },
  cardSub: { marginTop: 4, fontSize: font.size.xs, color: "#EDE3F2", textAlign: "right" },
  cardMeta: { flexDirection: "row-reverse", gap: spacing.md, marginTop: spacing.lg },
  metaCol: { flex: 1, minWidth: 0 },
  metaLabel: { fontSize: font.size.xxs, color: "#EDE3F2", textAlign: "right" },
  metaValue: { marginTop: 2, fontSize: font.size.sm, fontWeight: "700", color: colors.onPrimary, textAlign: "right" },

  expiry: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.infoBg,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  expiryWarning: { backgroundColor: colors.warningBg },
  expiryText: { flex: 1, fontSize: font.size.xs, color: colors.info, textAlign: "right", lineHeight: 19 },
  expiryTextWarning: { color: colors.warning },

  notice: { marginTop: spacing.md, fontSize: font.size.xs, color: colors.success, textAlign: "right" },
  banner: { marginTop: spacing.md },

  summary: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  summaryRow: { flexDirection: "row-reverse", justifyContent: "space-between", gap: spacing.md, paddingVertical: 5 },
  summaryLabel: { fontSize: font.size.sm, color: colors.textMuted },
  summaryValue: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark },

  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: font.size.md,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "right",
  },
  emptyLine: { fontSize: font.size.sm, color: colors.textMuted, textAlign: "right" },
  features: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  featureRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  featureText: { flex: 1, fontSize: font.size.sm, color: colors.textBody, textAlign: "right", lineHeight: 21 },

  actions: { marginTop: spacing.lg, gap: spacing.sm },

  dangerZone: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingTop: spacing.lg,
  },
  dangerTitle: { fontSize: font.size.sm, fontWeight: "700", color: colors.danger, textAlign: "right" },
  dangerText: { fontSize: font.size.xs, color: colors.textMuted, textAlign: "right", lineHeight: 20 },
});
