// ============================================================
//  PremiumPaywallScreen — ٣٥ · جدار الاشتراك المدفوع
//
//  لحظة حسّاسة: المستخدم أراد شيئاً فمُنع منه. التنفيذ السيّئ هنا لا يفقد
//  بيعاً فحسب — يفقد مستخدماً. لذلك القواعد هنا صارمة:
//   • **السعر حقيقي من `/subscriptions/plans`** — كان مكتوباً «$5 / شهرياً»:
//     عملة خاطئة وسعر لا وجود له في أي خطة.
//   • **العرض مربوط بما حاول فعله بالضبط** عبر `route.params.feature`.
//   • **الإغلاق بضغطة واحدة سهلة**: زر ٤٤px ظاهر أعلى الورقة، والخلفية،
//     ونصّ محايد أسفلها — بلا صياغة تُخجل («لا، أفضّل دفع المزيد»).
//   • **بديل مجاني معروض** حتى لا يخرج المستخدم بخُفَّي حُنين.
//   • **حدّ تكرار** عبر `services/paywall` — لا يُعاد العرض بعد الرفض.
//   • ممنوع أي مؤقّت ضغط زائف.
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Crown, X } from "phosphor-react-native";
import { IconButton, OutlineButton, PressableScale, PrimaryButton, Skeleton } from "../../components/ui";
import { colors, font, gradients, layout, radius, shadow, spacing } from "../../theme/theme";
import {
  durationLabel,
  fetchPlans,
  monthlyEquivalent,
  planList,
} from "../../services/subscriptionsApi";
import { CURRENCY } from "../../services/walletApi";
import { markPaywallDismissed } from "../../services/paywall";
import { qaParams } from "../../services/qa";

const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");
const money = (value) => `${arNum(value)} ${CURRENCY}`;

/**
 * نصّ مربوط بالنيّة: العرض العام («اشترك للمزايا») أضعف بكثير من العرض
 * المرتبط بما حاول المستخدم فعله قبل لحظة.
 */
const CONTEXTS = {
  booking: {
    title: "الحجز المسبق متاح لأعضاء الاشتراك",
    message: "احجز موعد الصيانة في الوقت الذي يناسبك بدل انتظار توفّر فني.",
    freeAlternative: "يمكنك طلب الخدمة فوراً بلا اشتراك.",
  },
  topRated: {
    title: "اختيار الفني الأعلى تقييماً متاح للمشتركين",
    message: "اختر الفني بنفسك بدل الإسناد التلقائي لأقرب متاح.",
    freeAlternative: "الطلب الفوري يُسند لك أقرب فني متاح مجاناً.",
  },
  priority: {
    title: "أولوية الطوارئ متاحة للمشتركين",
    message: "طلبك يتقدّم في الصفّ عند الازدحام، ودعمك يُجاب أولاً.",
    freeAlternative: "الطلب العادي يبقى متاحاً لك في أي وقت.",
  },
  default: {
    title: "هذه الميزة متاحة للمشتركين",
    message: "الاشتراك يفتح مزايا إضافية على طلباتك ودعمك.",
    freeAlternative: "يمكنك متابعة استخدام التطبيق مجاناً بلا اشتراك.",
  },
};

export default function PremiumPaywallScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  // qaParams تُرجع {} خارج التطوير — تسمح بفحص كل سياق عبر ?qa=premiumPaywall&feature=
  const feature = route?.params?.feature || qaParams(["feature"]).feature || "default";
  const context = CONTEXTS[feature] || CONTEXTS.default;

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const plans = planList(await fetchPlans(true)).filter((item) => Number(item.price) > 0);
      // أقلّ **مبلغ يُدفع فعلاً** لفتح الميزة — لا أقلّ تكلفة شهرية مكافئة:
      // عرض سعر خطة سنوية في جدار اشتراك يضخّم الحاجز بلا داعٍ، والمقارنة
      // الكاملة مكانها شاشة الخطط لا هنا.
      const cheapest = plans.length
        ? plans.reduce((a, b) => (Number(a.price) <= Number(b.price) ? a : b))
        : null;
      setPlan(cheapest);
    } catch {
      setPlan(null); // تعذّر جلب السعر لا يمنع الإغلاق ولا البديل المجاني
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // أي خروج يُسجَّل: لا يُعاد العرض لهذه الميزة قبل انتهاء فترة التهدئة
  const dismiss = () => {
    markPaywallDismissed(feature);
    navigation?.goBack?.();
  };

  const features = (plan?.featuresAr || plan?.features || []).slice(0, 3);

  return (
    <View style={styles.root}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="إغلاق"
        onPress={dismiss}
        feedback={false}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
        {/* زر الإغلاق أوّل عنصر وأوضحه: إخفاؤه أو تصغيره يولّد عداءً */}
        <View style={styles.sheetHead}>
          <IconButton label="إغلاق" onPress={dismiss} icon={<X size={20} color={colors.textHeading} />} />
          <View style={styles.grabber} />
          <View style={styles.headSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
          <LinearGradient {...gradients.primaryDiag} style={styles.icon}>
            <Crown size={34} weight="fill" color={colors.onPrimary} />
          </LinearGradient>

          <Text style={styles.title}>{context.title}</Text>
          <Text style={styles.message}>{context.message}</Text>

          {loading ? (
            <View style={styles.priceSkeleton}><Skeleton width="60%" height={22} /></View>
          ) : plan ? (
            <View style={styles.priceBox}>
              <Text style={styles.price}>{money(plan.price)}</Text>
              <Text style={styles.priceSub}>
                {durationLabel(plan)} · ≈ {money(monthlyEquivalent(plan))} شهرياً · يُخصم من محفظتك
              </Text>
            </View>
          ) : null}

          {features.length ? (
            <View style={styles.features}>
              {features.map((item) => (
                <View key={item} style={styles.featureRow}>
                  <Check size={15} weight="bold" color={colors.success} />
                  <Text style={styles.featureText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <PrimaryButton
            label={plan ? `اشترك بـ ${money(plan.price)}` : "عرض خطط الاشتراك"}
            onPress={() => {
              markPaywallDismissed(feature);
              navigation?.replace?.("Plans");
            }}
            style={styles.cta}
          />

          {/* البديل المجاني صريح: الخروج بلا اشتراك ليس طريقاً مسدوداً */}
          <Text style={styles.alternative}>{context.freeAlternative}</Text>
          <OutlineButton label="المتابعة بدون اشتراك" onPress={dismiss} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    maxHeight: "92%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    ...shadow.card,
  },
  sheetHead: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  grabber: { width: 44, height: 5, borderRadius: radius.pill, backgroundColor: colors.borderInput },
  headSpacer: { width: layout.touchTarget, height: layout.touchTarget },
  sheetContent: { paddingTop: spacing.sm, gap: spacing.md },

  icon: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: { fontSize: font.size.title, fontWeight: "700", color: colors.textDark, textAlign: "center" },
  message: { fontSize: font.size.sm, color: colors.textBody, textAlign: "center", lineHeight: 23 },

  priceSkeleton: { alignItems: "center" },
  priceBox: { alignItems: "center", gap: 2 },
  price: { fontSize: font.size.h1, fontWeight: "700", color: colors.primary },
  priceSub: { fontSize: font.size.xs, color: colors.textMuted, textAlign: "center" },

  features: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  featureRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  featureText: { flex: 1, fontSize: font.size.sm, color: colors.textBody, textAlign: "right", lineHeight: 21 },

  cta: { marginTop: spacing.xs },
  alternative: { fontSize: font.size.xs, color: colors.textMuted, textAlign: "center" },
});
