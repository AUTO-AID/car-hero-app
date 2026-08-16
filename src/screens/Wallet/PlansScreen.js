// ============================================================
//  PlansScreen — ٣٣ · خطط الاشتراك
//
//  شاشة قرار شرائي — تُقاس بالتحويل، لكن **بلا نمط مظلم واحد**: لا مؤقّت
//  ضغط، ولا «الأكثر شعبية» مختلقة (لا نملك بيانات شعبية أصلاً)، ولا صياغة
//  تُخجل من يرفض. التوصية الوحيدة المعروضة مبنيّة على رقم يستطيع المستخدم
//  التحقّق منه بنفسه: أقلّ تكلفة شهرية مكافئة.
//
//  حقيقتان من الخادم تحكمان التصميم:
//   • `SubscribeUserUseCase` **يخصم السعر من رصيد المحفظة** ويرفض بـ
//     «Insufficient wallet balance» — فالرصيد يُعرض هنا، والنقص يقود إلى
//     الشحن بدل رسالة فشل بعد الضغط.
//   • من لديه اشتراك نشط يرفضه `subscribe` («already has an active
//     subscription») ويحتاج `upgrade` — فنقرّر المسار مسبقاً لا بالمحاولة والخطأ.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowSquareOut, Check, Crown, Info, Minus, Wallet } from "phosphor-react-native";
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
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import {
  durationLabel,
  fetchCurrentSubscription,
  fetchPlans,
  findPlan,
  monthlyEquivalent,
  planId as idOf,
  planList,
  savingsPercent,
  subscribe,
  tierLabel,
  upgradeSubscription,
} from "../../services/subscriptionsApi";
import { CURRENCY, fetchWallet } from "../../services/walletApi";
import { clearPaywallHistory } from "../../services/paywall";

const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");
const money = (value) => `${arNum(value)} ${CURRENCY}`;

export default function PlansScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [autoRenew, setAutoRenew] = useState(true);
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [plansResponse, subscription, wallet] = await Promise.all([
        fetchPlans(true),
        fetchCurrentSubscription().catch(() => ({ isActive: false, status: null })),
        fetchWallet().catch(() => null),
      ]);
      setPlans(planList(plansResponse));
      setCurrent(subscription?.isActive ? subscription.status : null);
      setBalance(Number(wallet?.balance || 0));
    } catch (loadError) {
      setError(loadError?.message || "تعذّر جلب خطط الاشتراك");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(
    () => [...plans].sort((a, b) => Number(a.price || 0) - Number(b.price || 0)),
    [plans],
  );

  // التوصية برقم لا بادّعاء: أقلّ تكلفة شهرية مكافئة بين الخطط المدفوعة
  const recommendedId = useMemo(() => {
    const paid = sorted.filter((plan) => Number(plan.price) > 0);
    if (paid.length < 2) return null;
    const best = paid.reduce((a, b) => (monthlyEquivalent(a) <= monthlyEquivalent(b) ? a : b));
    return idOf(best);
  }, [sorted]);

  const currentPlanId = current?.planId || null;
  const currentPlan = findPlan(sorted, currentPlanId);

  // اتحاد المزايا: صفوف الجدول تُبنى من بيانات الخطط نفسها لا من قائمة مكتوبة يدوياً
  const featureRows = useMemo(() => {
    const all = [];
    sorted.forEach((plan) => {
      (plan.featuresAr || plan.features || []).forEach((feature) => {
        if (!all.includes(feature)) all.push(feature);
      });
    });
    return all;
  }, [sorted]);

  const target = confirming;
  const shortfall = target ? Math.max(0, Number(target.price || 0) - balance) : 0;

  const startPurchase = (plan) => {
    setActionError("");
    setConfirming(plan);
  };

  const confirmPurchase = async () => {
    if (busy || !target) return;
    setBusy(true);
    setActionError("");
    try {
      const id = idOf(target);
      if (currentPlanId) await upgradeSubscription(id, { autoRenew });
      else await subscribe(id, { autoRenew });
      clearPaywallHistory();
      setConfirming(null);
      navigation?.navigate?.("MySubscription");
    } catch (purchaseError) {
      setConfirming(null);
      setActionError(purchaseError?.message || "تعذّر إتمام الاشتراك، حاول مجدداً");
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
        <AppHeader title="خطط الاشتراك" subtitle="قارن ثم اختر ما يناسبك" onBack={() => navigation?.goBack?.()} />

        <AsyncContent
          loading={loading}
          error={error}
          hasData={sorted.length > 0}
          isEmpty={!loading && !error && sorted.length === 0}
          onRetry={load}
          errorTitle="تعذّر تحميل الخطط"
          skeleton={<View style={styles.skeleton}><SkeletonCard lines={3} /><SkeletonCard lines={3} /></View>}
          empty={{
            title: "لا توجد خطط متاحة حالياً",
            message: "أضِف الخطط من لوحة الإدارة أو عُد لاحقاً.",
            actionLabel: "إعادة المحاولة",
            onAction: load,
          }}
        >
          <View style={styles.walletRow}>
            <Wallet size={16} weight="fill" color={colors.primary} />
            <Text style={styles.walletText}>رصيد محفظتك {money(balance)} — يُخصم منه ثمن الاشتراك</Text>
          </View>

          <ErrorBanner message={actionError} style={styles.banner} />

          {/* جدول مقارنة: المقارنة بُعداً بُعد بلا تمرير ذهاباً وإياباً */}
          <Text style={styles.sectionTitle}>مقارنة سريعة</Text>
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.cell, styles.cellLabel, styles.headText]}>البند</Text>
              {sorted.map((plan) => (
                <Text key={idOf(plan)} style={[styles.cell, styles.headText]} numberOfLines={2}>
                  {plan.nameAr || plan.name}
                </Text>
              ))}
            </View>

            <TableRow label="السعر" cells={sorted.map((plan) => (Number(plan.price) > 0 ? money(plan.price) : "مجاناً"))} />
            <TableRow label="المدّة" cells={sorted.map((plan) => durationLabel(plan))} />
            <TableRow
              label="التكلفة الشهرية"
              cells={sorted.map((plan) => (Number(plan.price) > 0 ? money(monthlyEquivalent(plan)) : "—"))}
              strong
            />
            <TableRow
              label="التوفير"
              cells={sorted.map((plan) => {
                const percent = savingsPercent(plan, sorted);
                return percent > 0 ? `${arNum(percent)}٪` : "—";
              })}
            />
            {featureRows.map((feature) => (
              <TableRow
                key={feature}
                label={feature}
                cells={sorted.map((plan) => ((plan.featuresAr || plan.features || []).includes(feature) ? true : false))}
              />
            ))}
          </View>

          {/* شروط الشراء قبل الشراء لا بعده ولا داخل «الشروط والأحكام» */}
          <View style={styles.policy}>
            <Info size={16} weight="fill" color={colors.info} />
            <View style={styles.policyCopy}>
              <Text style={styles.policyText}>
                يُخصم ثمن الاشتراك من رصيد محفظتك فوراً، ويبدأ سريانه في الحال.
              </Text>
              <Text style={styles.policyText}>
                التجديد التلقائي {autoRenew ? "مفعّل" : "متوقّف"} — يمكنك تغييره الآن، أو إيقافه لاحقاً من «اشتراكي».
              </Text>
              <Text style={styles.policyText}>
                عند الإلغاء يبقى اشتراكك فعّالاً حتى نهاية المدّة المدفوعة، ولا يُسترد المبلغ المدفوع.
              </Text>
            </View>
          </View>

          <PressableScale
            accessibilityRole="checkbox"
            accessibilityLabel="التجديد التلقائي"
            accessibilityState={{ checked: autoRenew }}
            onPress={() => setAutoRenew((value) => !value)}
            style={styles.renewRow}
          >
            <View style={[styles.checkbox, !autoRenew && styles.checkboxOff]}>
              {autoRenew ? <Check size={14} weight="bold" color={colors.onPrimary} /> : null}
            </View>
            <View style={styles.renewCopy}>
              <Text style={styles.renewTitle}>تجديد تلقائي عند انتهاء المدّة</Text>
              <Text style={styles.renewHint}>يمكن إيقافه في أي وقت من شاشة «اشتراكي»</Text>
            </View>
          </PressableScale>

          <Text style={styles.sectionTitle}>الخطط</Text>
          {sorted.map((plan) => {
            const id = idOf(plan);
            const isCurrent = id === currentPlanId;
            const recommended = id === recommendedId && !isCurrent;
            const price = Number(plan.price) || 0;
            const insufficient = price > balance;
            return (
              <View key={id} style={[styles.card, recommended && styles.cardRecommended, isCurrent && styles.cardCurrent]}>
                <View style={styles.cardHead}>
                  <View style={styles.cardIcon}><Crown size={20} weight="fill" color={colors.primary} /></View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{plan.nameAr || plan.name}</Text>
                    <Text style={styles.cardSub}>
                      {[tierLabel(plan.tier), durationLabel(plan)].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  {isCurrent ? <StatusPill label="خطتك الحالية" tone="success" /> : null}
                  {recommended ? <StatusPill label="أقل تكلفة شهرية" tone="info" /> : null}
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.price}>{price > 0 ? money(price) : "مجاناً"}</Text>
                  {price > 0 ? (
                    <Text style={styles.priceSub}>≈ {money(monthlyEquivalent(plan))} شهرياً</Text>
                  ) : null}
                </View>

                <View style={styles.features}>
                  {(plan.featuresAr || plan.features || []).map((feature) => (
                    <View key={feature} style={styles.featureRow}>
                      <Check size={14} weight="bold" color={colors.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {isCurrent ? (
                  <OutlineButton label="خطتك الحالية" disabled onPress={() => {}} />
                ) : insufficient ? (
                  // النقص يقود إلى الشحن بدل رفض بعد الضغط: الخادم يرفض بلا رصيد كافٍ
                  <>
                    <OutlineButton
                      label={`اشحن ${money(price - balance)} لتشترك`}
                      icon={<ArrowSquareOut size={16} color={colors.primary} />}
                      onPress={() => navigation?.navigate?.("TopUp")}
                    />
                    <Text style={styles.cardHint}>رصيدك الحالي {money(balance)}</Text>
                  </>
                ) : (
                  <PrimaryButton
                    label={currentPlanId ? "الانتقال إلى هذه الخطة" : price > 0 ? `اشترك بـ ${money(price)}` : "ابدأ مجاناً"}
                    onPress={() => startPurchase(plan)}
                  />
                )}
              </View>
            );
          })}

          {currentPlan ? (
            <OutlineButton
              label="إدارة اشتراكي الحالي"
              onPress={() => navigation?.navigate?.("MySubscription")}
              style={styles.manage}
            />
          ) : null}
        </AsyncContent>
      </ScrollView>

      <ConfirmSheet
        visible={!!confirming}
        title={currentPlanId ? "تأكيد تغيير الخطة" : "تأكيد الاشتراك"}
        message={
          target
            ? `${target.nameAr || target.name} · ${durationLabel(target)}\n` +
              `${Number(target.price) > 0 ? `يُخصم ${money(target.price)} من محفظتك الآن` : "خطة مجانية — لا خصم"}` +
              `${shortfall > 0 ? `\nرصيدك لا يكفي (ينقص ${money(shortfall)})` : ""}` +
              `\nالتجديد التلقائي: ${autoRenew ? "مفعّل" : "متوقّف"}`
            : ""
        }
        confirmLabel="تأكيد"
        cancelLabel="تراجع"
        busy={busy}
        onConfirm={confirmPurchase}
        onCancel={() => setConfirming(null)}
      />
    </View>
  );
}

function TableRow({ label, cells, strong }) {
  return (
    <View style={styles.tableRow}>
      <Text style={[styles.cell, styles.cellLabel, strong && styles.cellStrong]} numberOfLines={3}>{label}</Text>
      {cells.map((cell, index) => (
        <View key={index} style={styles.cell}>
          {typeof cell === "boolean" ? (
            cell ? (
              <Check size={16} weight="bold" color={colors.success} />
            ) : (
              // «—» لا فراغ: الخانة الفارغة تُقرأ كخطأ عرض لا كغياب ميزة
              <Minus size={14} weight="bold" color={colors.textMuted2} />
            )
          ) : (
            <Text style={[styles.cellText, strong && styles.cellStrong]} numberOfLines={2}>{cell}</Text>
          )}
        </View>
      ))}
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

  walletRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: colors.tint,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  walletText: { flex: 1, fontSize: font.size.xs, color: colors.primary, textAlign: "right" },
  banner: { marginTop: spacing.md },

  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: font.size.md,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "right",
  },

  table: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  tableRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  cell: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center" },
  cellLabel: { flex: 1.5, alignItems: "flex-end" },
  cellText: { fontSize: font.size.xxs, color: colors.textBody, textAlign: "center" },
  cellStrong: { fontWeight: "700", color: colors.textDark },
  headText: { fontSize: font.size.xxs, fontWeight: "700", color: colors.textHeading, textAlign: "center" },

  policy: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.infoBg,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  policyCopy: { flex: 1, gap: 4 },
  policyText: { fontSize: font.size.xs, color: colors.info, textAlign: "right", lineHeight: 19 },

  renewRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 54,
    marginTop: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    flexShrink: 0,
    borderRadius: radius.xs,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOff: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderInput },
  renewCopy: { flex: 1, minWidth: 0 },
  renewTitle: { fontSize: font.size.sm, fontWeight: "600", color: colors.textDark, textAlign: "right" },
  renewHint: { fontSize: font.size.xxs, color: colors.textMuted, textAlign: "right", marginTop: 1 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  cardRecommended: { borderColor: colors.primary, borderWidth: 1.5 },
  cardCurrent: { borderColor: colors.success, borderWidth: 1.5 },
  cardHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
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
  cardSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, textAlign: "right" },
  priceRow: { flexDirection: "row-reverse", alignItems: "baseline", gap: spacing.sm },
  price: { fontSize: font.size.title, fontWeight: "700", color: colors.textDark },
  priceSub: { fontSize: font.size.xs, color: colors.textMuted },
  features: { gap: 6 },
  featureRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  featureText: { flex: 1, fontSize: font.size.xs, color: colors.textBody, textAlign: "right", lineHeight: 19 },
  cardHint: { fontSize: font.size.xxs, color: colors.textMuted, textAlign: "center" },

  manage: { marginTop: spacing.sm },
});
