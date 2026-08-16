// ============================================================
//  TopUpScreen — ٣١ · شحن الرصيد
//
//  معاملة مالية: أسوأ ما يمكن أن يحدث هنا ليس الفشل، بل **الحالة المعلّقة
//  الغامضة** — أن يدفع المستخدم ولا يعرف هل وصل ماله أم لا.
//
//  حقيقة الخادم التي بُني عليها التصميم: `/payments/initialize` يُنشئ نيّة
//  دفع ويعيد `referenceId` ورابط بوابة شام كاش، والرصيد لا يزداد إلا بعد أن
//  تصل البوابةُ الخادمَ عبر webhook. أي أن التطبيق **لا يعرف** لحظة النجاح.
//  لذلك: رقم مرجعي ظاهر، وحالة «قيد المعالجة» صريحة، وزر تحقّق يقارن الرصيد
//  بما كان قبل الشحن ويحسم النتيجة بدل تركها معلّقة.
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle, Copy, Info, Wallet } from "phosphor-react-native";
import {
  AppHeader,
  AsyncContent,
  ErrorBanner,
  InputField,
  OutlineButton,
  PressableScale,
  PrimaryButton,
  SkeletonCard,
} from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { CURRENCY, MIN_TOPUP, fetchWallet } from "../../services/walletApi";
import { initializePayment } from "../../services/paymentsApi";
import { normalizeDigits } from "../../services/validators";

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000];
const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");

export default function TopUpScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [amount, setAmount] = useState("10000");
  const [custom, setCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [intent, setIntent] = useState(null); // { referenceId, gatewayUrl, amount, balanceBefore }
  const [checking, setChecking] = useState(false);
  const [settled, setSettled] = useState(null); // { balance, added }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setWallet(await fetchWallet());
    } catch (loadError) {
      setError(loadError?.message || "تعذّر تحميل بيانات المحفظة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const numericAmount = Number(normalizeDigits(amount)) || 0;
  const balance = Number(wallet?.balance || 0);

  const amountError = useMemo(() => {
    if (!numericAmount) return "أدخل المبلغ المراد شحنه";
    if (numericAmount < MIN_TOPUP) return `أقل مبلغ للشحن ${arNum(MIN_TOPUP)} ${CURRENCY}`;
    if (!Number.isInteger(numericAmount)) return "أدخل مبلغاً صحيحاً بلا كسور";
    return "";
  }, [numericAmount]);

  // حارس مرجعي: الشحن المزدوج مشكلة مالية حقيقية لا مجرّد إزعاج بصري،
  // وتعطيل الزر وحده يعتمد على إعادة رسم غير متزامنة قد تمرّ نقرة قبلها.
  const submittingRef = useRef(false);
  const submit = async () => {
    if (submittingRef.current || amountError) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payment = await initializePayment({ amount: numericAmount, purpose: "wallet_topup" });
      setIntent({
        referenceId: payment?.referenceId || payment?.paymentIntentId || "",
        gatewayUrl: payment?.gatewayUrl || "",
        amount: numericAmount,
        balanceBefore: balance,
      });
      if (payment?.gatewayUrl) {
        Linking.openURL(payment.gatewayUrl).catch(() => {});
      }
    } catch (paymentError) {
      setSubmitError(paymentError?.message || "تعذّر بدء عملية الشحن، حاول مجدداً");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // النتيجة تُحسم بمقارنة الرصيد بما كان قبل الشحن: الخادم لا يخبر التطبيق
  // بنجاح البوابة، وترك المستخدم يخمّن هو أسوأ سيناريو في شاشة مالية.
  const checkResult = async () => {
    if (checking) return;
    setChecking(true);
    setSubmitError("");
    try {
      const fresh = await fetchWallet();
      setWallet(fresh);
      const added = Number(fresh?.balance || 0) - Number(intent.balanceBefore || 0);
      if (added > 0) setSettled({ balance: Number(fresh?.balance || 0), added });
    } catch (checkError) {
      setSubmitError(checkError?.message || "تعذّر التحقّق من الرصيد الآن");
    } finally {
      setChecking(false);
    }
  };

  const reset = () => { setIntent(null); setSettled(null); setSubmitError(""); };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + (intent ? spacing.xxl : 120) },
        ]}
      >
        <AppHeader title="شحن الرصيد" subtitle="عبر بوابة شام كاش" onBack={() => navigation?.goBack?.()} />

        <AsyncContent
          loading={loading}
          error={error}
          hasData={!!wallet}
          onRetry={load}
          errorTitle="تعذّر تحضير الشحن"
          skeleton={<View style={styles.skeleton}><SkeletonCard lines={2} /><SkeletonCard lines={3} /></View>}
        >
          {settled ? (
            <View style={styles.resultCard}>
              <View style={styles.resultIcon}><CheckCircle size={34} weight="fill" color={colors.success} /></View>
              <Text style={styles.resultTitle}>تم شحن رصيدك</Text>
              <Text style={styles.resultText}>
                أُضيف {arNum(settled.added)} {CURRENCY} — رصيدك الآن {arNum(settled.balance)} {CURRENCY}.
              </Text>
              <Text style={styles.reference}>الرقم المرجعي: {intent?.referenceId || "—"}</Text>
              <PrimaryButton label="العودة إلى المحفظة" onPress={() => navigation?.goBack?.()} style={styles.resultAction} />
              <OutlineButton label="شحن مبلغ آخر" onPress={reset} style={styles.resultAction} />
            </View>
          ) : intent ? (
            <View style={styles.resultCard}>
              <View style={[styles.resultIcon, styles.resultIconPending]}>
                <Wallet size={30} weight="fill" color={colors.warning} />
              </View>
              <Text style={styles.resultTitle}>العملية قيد المعالجة</Text>
              <Text style={styles.resultText}>
                فتحنا صفحة الدفع لمبلغ {arNum(intent.amount)} {CURRENCY}. أكمل الدفع في صفحة شام كاش، ثم عُد إلى هنا واضغط
                «تحقّق من الرصيد». لا يُخصم منك شيء قبل إتمام الدفع.
              </Text>

              {/* الرقم المرجعي هو ما يُحتكم إليه إن اختلفت النتيجة — يجب أن
                  يكون ظاهراً وقابلاً للنسخ لا مدفوناً في سجلّ. */}
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`نسخ الرقم المرجعي ${intent.referenceId}`}
                onPress={() => { try { globalThis.navigator?.clipboard?.writeText?.(intent.referenceId); } catch {} }}
                style={styles.referenceBox}
              >
                <Copy size={15} color={colors.textMuted} />
                <Text style={styles.reference} numberOfLines={1}>الرقم المرجعي: {intent.referenceId || "—"}</Text>
              </PressableScale>

              <ErrorBanner message={submitError} style={styles.banner} />

              <PrimaryButton label="تحقّق من الرصيد" loading={checking} onPress={checkResult} style={styles.resultAction} />
              {intent.gatewayUrl ? (
                <OutlineButton
                  label="إعادة فتح صفحة الدفع"
                  onPress={() => Linking.openURL(intent.gatewayUrl).catch(() => {})}
                  style={styles.resultAction}
                />
              ) : null}
              <OutlineButton label="إلغاء والعودة" onPress={reset} style={styles.resultAction} />
            </View>
          ) : (
            <>
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>رصيدك الحالي</Text>
                <Text style={styles.balanceValue}>{arNum(balance)} {CURRENCY}</Text>
              </View>

              <Text style={styles.label}>اختر المبلغ</Text>
              <View style={styles.chips}>
                {QUICK_AMOUNTS.map((value) => {
                  const active = !custom && numericAmount === value;
                  return (
                    <PressableScale
                      key={value}
                      accessibilityRole="button"
                      accessibilityLabel={`${arNum(value)} ${CURRENCY}`}
                      accessibilityState={{ selected: active }}
                      onPress={() => { setCustom(false); setAmount(String(value)); }}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{arNum(value)}</Text>
                    </PressableScale>
                  );
                })}
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="مبلغ آخر"
                  accessibilityState={{ selected: custom }}
                  onPress={() => { setCustom(true); setAmount(""); }}
                  style={[styles.chip, custom && styles.chipActive]}
                >
                  <Text style={[styles.chipText, custom && styles.chipTextActive]}>مبلغ آخر</Text>
                </PressableScale>
              </View>

              {custom ? (
                <InputField
                  label={`المبلغ (${CURRENCY})`}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder={arNum(MIN_TOPUP)}
                  error={amount ? amountError : ""}
                  helper={`الحد الأدنى ${arNum(MIN_TOPUP)} ${CURRENCY} · لا حد أقصى`}
                  containerStyle={styles.customField}
                />
              ) : null}

              {/* إزالة عدم اليقين قبل الالتزام: المستخدم يرى النتيجة لا يحسبها */}
              <View style={styles.summary}>
                <SummaryRow label="المبلغ" value={`${arNum(numericAmount)} ${CURRENCY}`} />
                <SummaryRow label="رسوم الخدمة" value="بلا رسوم" tone="success" />
                <View style={styles.divider} />
                <SummaryRow
                  label="رصيدك بعد الشحن"
                  value={`${arNum(balance + (amountError ? 0 : numericAmount))} ${CURRENCY}`}
                  strong
                />
              </View>

              <View style={styles.note}>
                <Info size={16} weight="fill" color={colors.info} />
                <Text style={styles.noteText}>
                  يتم الدفع عبر بوابة شام كاش خارج التطبيق. لا نحفظ أي بيانات دفع، ويُضاف الرصيد فور تأكيد البوابة.
                </Text>
              </View>

              <Text style={styles.label}>طريقة الدفع</Text>
              <View style={styles.method}>
                <View style={styles.methodIcon}><Wallet size={22} weight="fill" color={colors.primary} /></View>
                <View style={styles.methodCopy}>
                  <Text style={styles.methodTitle}>شام كاش</Text>
                  <Text style={styles.methodSub}>الطريقة المتاحة حالياً للشحن</Text>
                </View>
                <CheckCircle size={20} weight="fill" color={colors.primary} />
              </View>

              <ErrorBanner message={submitError} style={styles.banner} />
            </>
          )}
        </AsyncContent>
      </ScrollView>

      {!loading && !error && !intent && !settled ? (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
          <PrimaryButton
            label={amountError ? "أدخل مبلغاً صالحاً" : `شحن ${arNum(numericAmount)} ${CURRENCY}`}
            disabled={!!amountError}
            loading={submitting}
            onPress={submit}
            style={styles.cta}
          />
          {amountError ? <Text style={styles.bottomHint}>{amountError}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function SummaryRow({ label, value, tone, strong }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong && styles.summaryStrong]}>{label}</Text>
      <Text
        style={[
          styles.summaryValue,
          strong && styles.summaryStrong,
          tone === "success" && { color: colors.success },
        ]}
      >
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

  balanceCard: {
    marginTop: spacing.lg,
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
  },
  balanceLabel: { fontSize: font.size.xs, color: colors.textMuted },
  balanceValue: { fontSize: font.size.title, fontWeight: "700", color: colors.textDark },

  label: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: font.size.md,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "right",
  },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minWidth: "31%",
    flexGrow: 1,
    minHeight: layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.size.sm, fontWeight: "700", color: colors.textHeading },
  chipTextActive: { color: colors.onPrimary },
  customField: { marginTop: spacing.md },

  summary: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  summaryRow: { flexDirection: "row-reverse", justifyContent: "space-between", gap: spacing.md, paddingVertical: 5 },
  summaryLabel: { fontSize: font.size.sm, color: colors.textMuted },
  summaryValue: { fontSize: font.size.sm, fontWeight: "600", color: colors.textDark },
  summaryStrong: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.sm },

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

  method: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  methodIcon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  methodCopy: { flex: 1, minWidth: 0 },
  methodTitle: { fontSize: font.size.md, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  methodSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, textAlign: "right" },

  banner: { marginTop: spacing.md },

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
  resultIconPending: { backgroundColor: colors.warningBg },
  resultTitle: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "center" },
  resultText: { fontSize: font.size.sm, color: colors.textBody, textAlign: "center", lineHeight: 23 },
  referenceBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    minHeight: layout.touchTarget,
    alignSelf: "stretch",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
  },
  reference: { fontSize: font.size.xs, fontWeight: "700", color: colors.textMuted },
  resultAction: { alignSelf: "stretch", marginTop: spacing.xs },

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
