// ============================================================
//  WalletScreen — ٣٠ · المحفظة
//
//  شاشة مالية: معيارها الأول الدقة والثقة لا الجمال. كل غموض رقمي هنا
//  يُقرأ كخطأ في حقّ المستخدم، ولذلك:
//   • العملة «ل.س» صريحة ولا تُنسخ عن حقل الخادم (افتراضه `SAR` بينما كل
//     مبالغ التطبيق بالليرة — عرض «ر.س» على رصيد بالليرة يهدم الثقة).
//   • اتجاه كل حركة بإشارة ونصّ وأيقونة، لا باللون وحده.
//   • كل صفّ يعرض **الرصيد بعد الحركة** — وهو ما يُحتكم إليه عند الخلاف.
//   • عند فشل التحديث لا يُعرض رصيد قديم كأنه حالي، بل موسوماً بأنه غير محدَّث.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowDown, ArrowUp, Coins, Gift, Plus, Receipt, WarningCircle } from "phosphor-react-native";
import {
  AppHeader,
  AsyncContent,
  OutlineButton,
  PressableScale,
  SkeletonList,
  StatusPill,
} from "../../components/ui";
import { colors, font, gradients, layout, radius, spacing } from "../../theme/theme";
import {
  CURRENCY,
  fetchWallet,
  fetchWalletTransactions,
  pointsToCurrency,
  transactionMeta,
  transactionStatusMeta,
} from "../../services/walletApi";

const PAGE_SIZE = 15;
const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
};

const formatFullDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
};

/** مجموعات زمنية تُسهّل المسح البصري بدل قائمة مسطّحة طويلة */
function groupByDate(transactions) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  const groups = new Map();
  transactions.forEach((transaction) => {
    const at = new Date(transaction?.createdAt || 0).getTime();
    let key;
    if (at >= startOfToday.getTime()) key = "اليوم";
    else if (at >= startOfYesterday.getTime()) key = "أمس";
    else if (at >= startOfMonth.getTime()) key = "هذا الشهر";
    else key = formatFullDate(transaction?.createdAt) || "أقدم";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(transaction);
  });
  return [...groups.entries()];
}

export default function WalletScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [loadedWallet, result] = await Promise.all([
        fetchWallet(),
        fetchWalletTransactions({ page: 1, limit: PAGE_SIZE }),
      ]);
      setWallet(loadedWallet);
      setTransactions(Array.isArray(result.transactions) ? result.transactions : []);
      setHasMore(!!result.hasMore);
      setPage(1);
    } catch (loadError) {
      setError(loadError?.message || "تعذّر تحميل المحفظة");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const result = await fetchWalletTransactions({ page: next, limit: PAGE_SIZE });
      setTransactions((current) => [...current, ...(result.transactions || [])]);
      setHasMore(!!result.hasMore);
      setPage(next);
    } catch (moreError) {
      setError(moreError?.message || "تعذّر جلب المزيد من العمليات");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, page]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }, [load]);

  const groups = useMemo(() => groupByDate(transactions), [transactions]);
  // رصيد معروض مع خطأ تحديث = رصيد غير محدَّث، ويجب أن يُقال ذلك صراحةً
  const stale = !!error && !!wallet;
  const points = Number(wallet?.loyaltyPoints || 0);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <AppHeader title="المحفظة" subtitle="الرصيد وسجل العمليات" onBack={() => navigation?.goBack?.()} />

        <AsyncContent
          loading={loading}
          error={error}
          hasData={!!wallet}
          onRetry={() => load()}
          errorTitle="تعذّر تحميل المحفظة"
          skeleton={<View style={styles.skeleton}><SkeletonList count={4} lines={2} /></View>}
        >
          {wallet ? (
            <>
              <LinearGradient {...gradients.primaryDiag} style={styles.balance}>
                <View style={styles.balanceHead}>
                  <Text style={styles.balanceLabel}>الرصيد المتاح</Text>
                  {stale ? (
                    <View style={styles.staleChip}>
                      <WarningCircle size={13} weight="fill" color={colors.warning} />
                      <Text style={styles.staleText}>غير محدَّث</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.balanceRow}>
                  {/* بلا تقريب: إخفاء الكسور في شاشة مالية يصنع فروقاً لا يفهمها المستخدم */}
                  <Text style={styles.balanceValue}>{arNum(wallet.balance)}</Text>
                  <Text style={styles.currency}>{CURRENCY}</Text>
                </View>

                {Number(wallet.pendingBalance) > 0 ? (
                  <Text style={styles.pending}>
                    قيد التسوية: {arNum(wallet.pendingBalance)} {CURRENCY}
                  </Text>
                ) : null}

                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`${arNum(points)} نقطة وفاء، تعادل ${arNum(pointsToCurrency(points))} ليرة — استبدالها`}
                  onPress={() => navigation?.navigate?.("RedeemPoints", { points })}
                  style={styles.points}
                >
                  <Coins size={15} weight="fill" color={colors.accent} />
                  <Text style={styles.pointsText}>
                    {arNum(points)} نقطة وفاء · {arNum(pointsToCurrency(points))} {CURRENCY}
                  </Text>
                </PressableScale>
              </LinearGradient>

              <View style={styles.actions}>
                <WalletAction primary label="شحن الرصيد" Icon={Plus} onPress={() => navigation?.navigate?.("TopUp")} />
                <WalletAction
                  label="استبدال النقاط"
                  Icon={Gift}
                  onPress={() => navigation?.navigate?.("RedeemPoints", { points })}
                />
              </View>

              <Text style={styles.sectionTitle}>سجل العمليات</Text>

              {transactions.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Receipt size={30} color={colors.textMuted2} />
                  <Text style={styles.emptyTitle}>لا توجد عمليات بعد</Text>
                  <Text style={styles.emptyText}>ستظهر هنا كل عمليات الشحن والدفع والاسترداد بتاريخها ورصيدها.</Text>
                  <OutlineButton label="شحن الرصيد" onPress={() => navigation?.navigate?.("TopUp")} style={styles.emptyAction} />
                </View>
              ) : (
                <>
                  {groups.map(([label, rows]) => (
                    <View key={label} style={styles.group}>
                      <Text style={styles.groupLabel}>{label}</Text>
                      <View style={styles.groupRows}>
                        {rows.map((transaction, index) => (
                          <TransactionRow key={transaction.id || transaction._id || `${label}-${index}`} transaction={transaction} />
                        ))}
                      </View>
                    </View>
                  ))}

                  {hasMore ? (
                    <OutlineButton
                      label="عرض عمليات أقدم"
                      loading={loadingMore}
                      onPress={loadMore}
                      style={styles.more}
                    />
                  ) : (
                    <Text style={styles.end}>عرضنا كل العمليات</Text>
                  )}
                </>
              )}
            </>
          ) : null}
        </AsyncContent>
      </ScrollView>
    </View>
  );
}

function WalletAction({ label, Icon, onPress, primary = false }) {
  return (
    <PressableScale
      style={[styles.action, primary && styles.actionPrimary]}
      onPress={onPress}
      feedback="action"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon size={18} weight="bold" color={primary ? colors.onPrimary : colors.primary} />
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]} numberOfLines={1}>{label}</Text>
    </PressableScale>
  );
}

function TransactionRow({ transaction }) {
  const meta = transactionMeta(transaction);
  const status = transactionStatusMeta(transaction.status);
  const amount = Math.abs(Number(transaction.amount || 0));
  const incoming = meta.direction === "in";
  const outgoing = meta.direction === "out";
  const tone = incoming ? colors.success : outgoing ? colors.danger : colors.textHeading;
  const Icon = incoming ? ArrowDown : outgoing ? ArrowUp : Coins;
  // الاتجاه يُنقل بثلاث إشارات معاً (رمز + أيقونة + نصّ) لأن اللون وحده
  // لا يصل إلى من لا يميّزه، ولأن خطأ الاتجاه في شاشة مالية غير مقبول
  const sign = incoming ? "+" : outgoing ? "−" : "";

  return (
    <View style={styles.transaction}>
      <View style={[styles.transactionIcon, { backgroundColor: incoming ? colors.successBg : outgoing ? colors.dangerBg : colors.surfaceAlt }]}>
        <Icon size={18} weight="bold" color={tone} />
      </View>

      <View style={styles.transactionCopy}>
        <Text style={styles.transactionTitle} numberOfLines={1}>
          {transaction.description || meta.label}
        </Text>
        <Text style={styles.transactionMeta} numberOfLines={1}>
          {meta.label} · {formatTime(transaction.createdAt)}
        </Text>
        {/* الرصيد بعد الحركة: هو ما يُحتكم إليه عند أي خلاف على السجل */}
        <Text style={styles.transactionBalance} numberOfLines={1}>
          الرصيد بعدها {arNum(transaction.balanceAfter)} {CURRENCY}
        </Text>
      </View>

      <View style={styles.transactionSide}>
        <Text style={[styles.transactionAmount, { color: tone }]} numberOfLines={1}>
          {sign} {arNum(amount)} {CURRENCY}
        </Text>
        {transaction.status && transaction.status !== "completed" ? (
          <StatusPill label={status.label} tone={status.tone} style={styles.transactionStatus} />
        ) : null}
      </View>
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
  skeleton: { marginTop: spacing.lg },

  balance: { borderRadius: radius.lg, padding: spacing.xl, marginTop: spacing.lg },
  balanceHead: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  balanceLabel: { fontSize: font.size.xs, color: "#EDE3F2", textAlign: "right" },
  staleChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  staleText: { fontSize: font.size.xxs, fontWeight: "700", color: colors.warning },
  balanceRow: { flexDirection: "row-reverse", alignItems: "baseline", gap: spacing.sm, marginTop: spacing.xs },
  balanceValue: { fontSize: 32, fontWeight: "700", color: colors.onPrimary, textAlign: "right" },
  currency: { fontSize: font.size.body, fontWeight: "600", color: "#EDE3F2" },
  pending: { marginTop: 6, fontSize: font.size.xs, color: "#EDE3F2", textAlign: "right" },
  points: {
    alignSelf: "flex-end",
    minHeight: layout.touchTarget,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: "#FFFFFF24",
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  pointsText: { fontSize: font.size.xs, fontWeight: "700", color: colors.onPrimary },

  actions: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.md },
  action: {
    flex: 1,
    minHeight: 52,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
  },
  actionPrimary: { borderColor: colors.primary, backgroundColor: colors.primary },
  actionText: { flexShrink: 1, color: colors.primary, fontSize: font.size.sm, fontWeight: "700", textAlign: "center" },
  actionTextPrimary: { color: colors.onPrimary },

  sectionTitle: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    fontSize: font.size.body,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "right",
  },
  group: { marginBottom: spacing.md },
  groupLabel: { marginBottom: spacing.sm, fontSize: font.size.xs, fontWeight: "700", color: colors.textMuted, textAlign: "right" },
  groupRows: { gap: spacing.sm },

  transaction: {
    minHeight: 76,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  transactionIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionCopy: { flex: 1, minWidth: 0 },
  transactionTitle: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  transactionMeta: { fontSize: font.size.xxs, color: colors.textMuted, marginTop: 1, textAlign: "right" },
  transactionBalance: { fontSize: font.size.xxs, color: colors.textMuted2, marginTop: 2, textAlign: "right" },
  transactionSide: { flexShrink: 0, alignItems: "flex-start", gap: 4 },
  transactionAmount: { fontSize: font.size.sm, fontWeight: "700", textAlign: "left" },
  // الشارة داخل عمود ضيّق: بلا حدّ أعلى صريح تُبتر إلى «قيد ا…»
  transactionStatus: { alignSelf: "flex-start", maxWidth: 120 },

  emptyBox: {
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.xl,
  },
  emptyTitle: { fontSize: font.size.md, fontWeight: "700", color: colors.textDark, textAlign: "center" },
  emptyText: { fontSize: font.size.xs, color: colors.textMuted, textAlign: "center", lineHeight: 20 },
  emptyAction: { marginTop: spacing.sm, alignSelf: "stretch" },

  more: { marginTop: spacing.sm },
  end: { marginTop: spacing.sm, fontSize: font.size.xs, color: colors.textMuted2, textAlign: "center" },
});
