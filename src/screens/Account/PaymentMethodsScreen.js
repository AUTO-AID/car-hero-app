// ============================================================
//  PaymentMethodsScreen — ٣٩ · طرق الدفع
//
//  شاشة مالية: الثقة قبل الجمال. ثلاث حقائق من عقد الخادم تحكمها:
//   • **الطرق الفعّالة ثلاث لا أكثر**: نقداً، ونقاط الولاء، وشام كاش. والنقاط
//     ليست طريقة تُحفظ هنا بل خصمٌ يُطبَّق على الطلب نفسه، فيبقى في هذا
//     الدفتر خياران.
//   • **النقد لا يُحذف** (`Cash payment method cannot be deleted`) وهو الأنسب
//     لسياق السوق هنا، فيُعرض كخيار من الدرجة الأولى لا كبديل ثانوي.
//   • **البطاقة المصرفية غير مدعومة**: لا بوّابة بطاقات مربوطة، والخيار
//     يُعرض معطّلاً بسببه لا يُخفى — إخفاؤه يجعل المستخدم يبحث عنه.
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CreditCard,
  DotsThreeVertical,
  Lock,
  Money,
  Plus,
  Wallet,
} from "phosphor-react-native";
import {
  ActionSheet,
  AppHeader,
  AsyncContent,
  ConfirmSheet,
  ErrorBanner,
  OutlineButton,
  PressableScale,
  SkeletonList,
  StatusPill,
} from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import {
  createPaymentMethod,
  deletePaymentMethod,
  fetchPaymentMethods,
  setDefaultPaymentMethod,
} from "../../services/customerApi";

const idOf = (method) => method?.id || method?._id;

const TYPE_META = {
  cash: { label: "الدفع نقداً", Icon: Money, hint: "تدفع للفني عند إتمام الخدمة", tone: "success" },
  cham_cash: { label: "شام كاش", Icon: Wallet, hint: "تُحوَّل إلى بوّابة شام كاش عند الدفع", tone: "primary" },
  // متقاعدتان: تبقيان لعرض ما حُفظ سابقاً، ولا تُضافان من جديد
  wallet: { label: "محفظة إلكترونية", Icon: Wallet, hint: "طريقة قديمة — استُبدلت بشام كاش", tone: "primary" },
  card: { label: "بطاقة مصرفية", Icon: CreditCard, hint: "طريقة قديمة — غير مدعومة", tone: "info" },
};

const metaOf = (type) => TYPE_META[type] || TYPE_META.cash;

export default function PaymentMethodsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState("");

  const [sheetItem, setSheetItem] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const data = await fetchPaymentMethods();
      setItems(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError?.message || "تعذّر تحميل طرق الدفع");
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

  const hasCash = items.some((item) => item.type === "cash");
  const hasChamCash = items.some((item) => item.type === "cham_cash");

  const addMethod = async (type) => {
    setBusy(true);
    setActionError("");
    try {
      await createPaymentMethod(
        type === "cash"
          ? { type: "cash", displayName: "الدفع نقداً", isDefault: items.length === 0 }
          : { type: "cham_cash", displayName: "شام كاش", brand: "Cham Cash", isDefault: items.length === 0 },
      );
      await load({ silent: true });
    } catch (addError) {
      setActionError(addError?.message || "تعذّر إضافة طريقة الدفع");
    } finally {
      setBusy(false);
    }
  };

  const applyDefault = async (method) => {
    setSheetItem(null);
    setBusy(true);
    setActionError("");
    try {
      await setDefaultPaymentMethod(idOf(method));
      setItems((current) => current.map((item) => ({ ...item, isDefault: idOf(item) === idOf(method) })));
      await load({ silent: true });
    } catch (defaultError) {
      setActionError(defaultError?.message || "تعذّر تعيين الطريقة الافتراضية");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    setActionError("");
    try {
      await deletePaymentMethod(idOf(deleting));
      setDeleting(null);
      await load({ silent: true });
    } catch (deleteError) {
      setDeleting(null);
      setActionError(deleteError?.message || "تعذّر حذف طريقة الدفع");
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
        <AppHeader
          title="طرق الدفع"
          subtitle="الطريقة الافتراضية تُقترح عند كل طلب"
          onBack={() => navigation?.goBack?.()}
        />

        {/* إشارة أمان صريحة: الغموض في شاشة مالية يوقف الاستخدام */}
        <View style={styles.security}>
          <Lock size={16} weight="fill" color={colors.success} />
          <Text style={styles.securityText}>
            لا نحفظ أي بيانات مالية في التطبيق — الدفع الإلكتروني يتم داخل بوّابة شام كاش نفسها، والتطبيق لا يرى سوى نتيجة العملية.
          </Text>
        </View>

        <ErrorBanner message={actionError} style={styles.banner} />

        <AsyncContent
          loading={loading}
          error={error}
          hasData={items.length > 0}
          isEmpty={!loading && !error && items.length === 0}
          onRetry={() => load()}
          errorTitle="تعذّر تحميل طرق الدفع"
          skeleton={<SkeletonList count={3} lines={1} />}
          empty={{
            icon: <Money size={32} color={colors.success} />,
            title: "لا توجد طرق دفع محفوظة",
            message: "أضف طريقة دفع لتُختار تلقائياً عند الطلب بدل اختيارها في كل مرّة. الدفع نقداً متاح دائماً.",
            actionLabel: "إضافة الدفع نقداً",
            onAction: () => addMethod("cash"),
          }}
        >
          <View style={styles.list}>
            {items.map((method) => (
              <MethodCard
                key={idOf(method)}
                method={method}
                onMenu={() => { setActionError(""); setSheetItem(method); }}
              />
            ))}
          </View>

          <View style={styles.addBlock}>
            {!hasCash ? (
              <OutlineButton
                label="إضافة الدفع نقداً"
                icon={<Money size={17} color={colors.primary} />}
                loading={busy}
                onPress={() => addMethod("cash")}
              />
            ) : null}
            {!hasChamCash ? (
              <OutlineButton
                label="إضافة شام كاش"
                icon={<Wallet size={17} color={colors.primary} />}
                loading={busy}
                onPress={() => addMethod("cham_cash")}
              />
            ) : null}

            {/* الخيار غير المتاح يُعرض بسببه: إخفاؤه يجعل المستخدم يبحث عنه */}
            <View style={styles.disabledOption}>
              <View style={styles.disabledIcon}><CreditCard size={18} color={colors.textMuted2} /></View>
              <View style={styles.disabledCopy}>
                <Text style={styles.disabledTitle}>إضافة بطاقة مصرفية</Text>
                <Text style={styles.disabledHint}>
                  غير مدعومة — لا توجد بوّابة بطاقات مربوطة. طرق الدفع المتاحة: نقداً، شام كاش، ونقاط الولاء التي تُخصم من قيمة الطلب.
                </Text>
              </View>
            </View>
          </View>
        </AsyncContent>
      </ScrollView>

      <ActionSheet
        visible={!!sheetItem}
        title={sheetItem?.displayName || metaOf(sheetItem?.type).label}
        message={sheetItem?.last4 ? `البطاقة المنتهية بـ ${sheetItem.last4}` : metaOf(sheetItem?.type).hint}
        busy={busy}
        onCancel={() => setSheetItem(null)}
        actions={[
          ...(sheetItem && !sheetItem.isDefault
            ? [{ key: "default", label: "تعيين كطريقة افتراضية", onPress: () => applyDefault(sheetItem) }]
            : []),
          // النقد لا يُحذف على الخادم — عرض الإجراء ثم رفضه يُربك بلا فائدة
          ...(sheetItem && sheetItem.type !== "cash"
            ? [{
                key: "delete",
                label: "حذف الطريقة",
                danger: true,
                onPress: () => { const target = sheetItem; setSheetItem(null); setDeleting(target); },
              }]
            : []),
        ]}
      />

      <ConfirmSheet
        visible={!!deleting}
        title="حذف طريقة الدفع؟"
        message={
          items.length <= 1
            ? "هذه طريقتك الوحيدة — بعد حذفها ستحتاج إلى اختيار طريقة دفع يدوياً في كل طلب."
            : deleting?.isDefault
              ? "هذه طريقتك الافتراضية — سيحلّ محلّها غيرها تلقائياً. لا يمكن التراجع."
              : "لا يمكن التراجع بعد الحذف."
        }
        confirmLabel="نعم، احذف"
        cancelLabel="تراجع"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </View>
  );
}

function MethodCard({ method, onMenu }) {
  const meta = metaOf(method.type);
  const palette = {
    success: [colors.successBg, colors.success],
    primary: [colors.tint, colors.primary],
    info: [colors.infoBg, colors.info],
  }[meta.tone];

  return (
    <View style={[styles.card, method.isDefault && styles.cardDefault]}>
      <View style={[styles.icon, { backgroundColor: palette[0] }]}>
        <meta.Icon size={22} weight="fill" color={palette[1]} />
      </View>

      <View style={styles.cardCopy}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{method.displayName || meta.label}</Text>
          {method.isDefault ? <StatusPill label="الافتراضية" tone="success" /> : null}
        </View>
        <Text style={styles.cardHint} numberOfLines={1}>
          {/* آخر أربعة أرقام فقط — ولا شيء غيرها */}
          {method.last4 ? `•••• ${method.last4}${method.brand ? ` · ${method.brand}` : ""}` : meta.hint}
        </Text>
      </View>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`خيارات ${method.displayName || meta.label}`}
        onPress={onMenu}
        style={styles.menuButton}
      >
        <DotsThreeVertical size={20} weight="bold" color={colors.textMuted} />
      </PressableScale>
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

  security: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  securityText: { flex: 1, fontSize: font.size.xs, color: colors.success, textAlign: "right", lineHeight: 19 },
  banner: { marginTop: spacing.md },

  list: { gap: spacing.sm, marginTop: spacing.lg },
  card: {
    minHeight: 76,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: spacing.xs,
  },
  cardDefault: { borderColor: colors.primarySoft, borderWidth: 1.5 },
  icon: {
    width: 46,
    height: 46,
    flexShrink: 0,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  cardTitle: { flexShrink: 1, fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  cardHint: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, textAlign: "right" },
  menuButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },

  addBlock: { marginTop: spacing.lg, gap: spacing.sm },
  disabledOption: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  disabledIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledCopy: { flex: 1, minWidth: 0 },
  disabledTitle: { fontSize: font.size.sm, fontWeight: "700", color: colors.textMuted, textAlign: "right" },
  disabledHint: { fontSize: font.size.xxs, color: colors.textMuted2, marginTop: 2, textAlign: "right", lineHeight: 17 },
});
