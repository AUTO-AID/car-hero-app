// ============================================================
//  SearchingProviderScreen — ١٨ · البحث عن مزوّد
//
//  أعلى لحظة قلق في التطبيق كله: المستخدم التزم بالفعل، والآن لا يعرف إن
//  كان أحد سيأتي. الانتظار الغامض يُدرَك أطول من المعلوم بنحو الضعف — لذلك
//  كل شيء هنا مصمّم ليحوّل الغموض إلى تقدّم مرئي: مراحل مسمّاة، وزمن
//  منقضٍ بالأرقام، ومهلة قصوى صريحة، ومخرج واضح في كل لحظة.
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Lightning, MagnifyingGlass } from "phosphor-react-native";
import Text from "../../components/AppText";
import { ConfirmSheet, EmptyState, OutlineButton, PrimaryButton } from "../../components/ui";
import useReducedMotion from "../../hooks/useReducedMotion";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { buildOrderBody, createBooking, createOrder, isNoProviderError } from "../../services/ordersApi";

const arNum = (value) => Number(value).toLocaleString("ar-EG");
// مهلة قصوى صريحة: بعدها ننتقل تلقائياً إلى حالة نهائية بمسارات حقيقية.
// الدوران الأبدي أسوأ من الفشل الصريح — الفشل له خطوة تالية، والدوران لا.
const MAX_WAIT_SECONDS = 90;

const STAGES = [
  { key: "search", label: "البحث عن الفنيين القريبين" },
  { key: "send", label: "إرسال طلبك إليهم" },
  { key: "await", label: "بانتظار القبول" },
];

export default function SearchingProviderScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const params = route?.params || {};
  const scheduled = !!params.scheduleTime;
  const nearbyCount = params.nearbyCount ?? null;

  const [phase, setPhase] = useState("searching");
  const [errorMessage, setErrorMessage] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const mountedRef = useRef(true);
  const submittedRef = useRef(false);

  // الزمن مشتقّ من لحظة البدء بالساعة الحقيقية، فلا يتأثّر بخنق المؤقّتات
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const elapsed = Math.floor((now - startedAt) / 1000);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // مرحلة معروضة مشتقّة من الزمن: المستخدم يرى أين وصل بدل مؤشّر واحد ساكن
  const stageIndex = phase !== "searching" ? STAGES.length - 1 : elapsed < 4 ? 0 : elapsed < 10 ? 1 : 2;

  const submit = useCallback(async ({ force = false } = {}) => {
    if (submittedRef.current && !force) return;
    submittedRef.current = true;
    setPhase("searching");
    setErrorMessage("");
    try {
      const body = buildOrderBody({
        serviceId: params.serviceId,
        longitude: params.longitude,
        latitude: params.latitude,
        vehicleId: params.vehicleId,
        providerId: params.providerId,
        scheduleTime: params.scheduleTime,
        notes: params.notes,
      });
      const result = scheduled ? await createBooking(body) : await createOrder(body);
      if (mountedRef.current) {
        navigation?.replace?.("ProviderFound", { orderId: result.id || result._id, scheduled });
      }
    } catch (submitError) {
      if (!mountedRef.current) return;
      if (isNoProviderError(submitError)) {
        setPhase("noProvider");
      } else {
        setErrorMessage(submitError?.message || "حدث خطأ أثناء إنشاء الطلب");
        setPhase("error");
      }
    }
  }, [navigation, params.latitude, params.longitude, params.notes, params.providerId, params.scheduleTime, params.serviceId, params.vehicleId, scheduled]);

  useEffect(() => {
    mountedRef.current = true;
    submit();
    return () => { mountedRef.current = false; };
  }, [submit]);

  // انتهاء المهلة → حالة نهائية، لا انتظار مفتوح
  useEffect(() => {
    if (phase !== "searching" || elapsed < MAX_WAIT_SECONDS) return;
    setPhase("timeout");
  }, [phase, elapsed]);

  const retry = () => submit({ force: true });
  const leave = () => { mountedRef.current = false; navigation?.goBack?.(); };

  if (phase === "searching") {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.searching}>
          <View style={styles.searchIcon}>
            <MagnifyingGlass size={38} weight="bold" color={colors.primary} />
          </View>
          {/* المؤشّر الدوّار يُستبدل بنصّ ساكن عند تفعيل تقليل الحركة */}
          {reduceMotion ? null : <ActivityIndicator color={colors.primary} style={styles.spinner} />}

          <Text style={styles.title} accessibilityRole="header">
            {scheduled ? "نؤكد حجزك" : "نبحث عن فني مناسب"}
          </Text>

          {/* رقم حقيقي متغيّر يطمئن أكثر من أي رسم متحرك */}
          <Text style={styles.body}>
            {nearbyCount != null
              ? `${arNum(nearbyCount)} فنيين ضمن نطاقك — جارٍ التواصل معهم.`
              : "نطابق طلبك مع الفنيين المتاحين بالقرب من موقعك."}
          </Text>

          <View style={styles.stages} accessibilityLiveRegion="polite">
            {STAGES.map((stage, index) => {
              const done = index < stageIndex;
              const current = index === stageIndex;
              return (
                <View key={stage.key} style={styles.stageRow}>
                  <View style={[styles.stageMark, done && styles.stageMarkDone, current && styles.stageMarkCurrent]}>
                    {done ? <Check size={11} weight="bold" color={colors.onPrimary} /> : null}
                  </View>
                  <Text style={[styles.stageText, (done || current) && styles.stageTextActive]}>
                    {stage.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.serviceChip}>
            <Lightning size={16} weight="fill" color={colors.primary} />
            <Text style={styles.serviceText} numberOfLines={1}>{params.serviceName || "الخدمة المطلوبة"}</Text>
          </View>

          {/* الزمن المنقضي بالأرقام العربية: انتظار معلوم أقصر إدراكاً */}
          <Text style={styles.elapsed}>
            مضى {arNum(Math.floor(elapsed / 60))}:{arNum(elapsed % 60).padStart(2, "٠")} — نبحث حتى{" "}
            {arNum(Math.round(MAX_WAIT_SECONDS / 60))} دقيقة كحد أقصى
          </Text>

          {/* الإلغاء ظاهر منذ اللحظة الأولى ومطمئن: إخفاؤه يزيد القلق ولا
              يزيد الإتمام، والتأكيد يوضّح النتيجة قبل التنفيذ. */}
          <OutlineButton label="إلغاء البحث" onPress={() => setShowCancel(true)} style={styles.abortButton} />
        </View>

        <ConfirmSheet
          visible={showCancel}
          title="إلغاء البحث عن فني؟"
          message="لن يُنشأ طلب ولن يُخصم منك شيء. يمكنك إعادة الطلب في أي وقت."
          confirmLabel="نعم، ألغِ البحث"
          cancelLabel="متابعة البحث"
          danger
          onConfirm={() => { setShowCancel(false); leave(); }}
          onCancel={() => setShowCancel(false)}
        />
      </View>
    );
  }

  // ---- الحالات النهائية: لكل واحدة مسارات حقيقية لا رسالة مسدودة ----
  const isNoProvider = phase === "noProvider" || phase === "timeout";
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.failure}>
        <EmptyState
          title={
            phase === "timeout"
              ? "لم يستجب أي فني حتى الآن"
              : isNoProvider
                ? "لا يوجد فني متاح الآن"
                : "تعذر إنشاء الطلب"
          }
          message={
            isNoProvider
              ? "قد يكون الفنيون القريبون مشغولين أو غير متصلين. أمامك عدّة خيارات بدل الانتظار."
              : errorMessage
          }
        />
        <View style={styles.actions}>
          <PrimaryButton label="إعادة البحث الآن" onPress={retry} />
          {isNoProvider ? (
            <>
              <OutlineButton
                label="توسيع نطاق البحث"
                onPress={() => navigation?.navigate?.("ProvidersMap")}
              />
              <OutlineButton
                label="جدولة الخدمة لاحقاً"
                onPress={() => navigation?.navigate?.("Booking", params)}
              />
            </>
          ) : null}
          <OutlineButton label="الرجوع إلى الطلب" onPress={leave} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: "100%", maxWidth: layout.contentMaxWidth, alignSelf: "center", backgroundColor: colors.screenBg, paddingHorizontal: spacing.screenH },
  searching: { flex: 1, alignItems: "center", justifyContent: "center" },
  searchIcon: { width: 92, height: 92, borderRadius: radius.lg, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  spinner: { marginTop: spacing.lg },
  title: { marginTop: spacing.lg, fontSize: font.size.title, fontWeight: "700", color: colors.textDark, textAlign: "center" },
  body: { maxWidth: 360, marginTop: spacing.sm, fontSize: font.size.sm, color: colors.textBody, lineHeight: 24, textAlign: "center" },

  stages: { alignSelf: "stretch", marginTop: spacing.xl, gap: spacing.sm },
  stageRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  stageMark: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderInput,
    alignItems: "center",
    justifyContent: "center",
  },
  stageMarkDone: { backgroundColor: colors.success, borderColor: colors.success },
  stageMarkCurrent: { borderColor: colors.primary, borderWidth: 3 },
  stageText: { flex: 1, fontSize: font.size.sm, color: colors.textMuted2, textAlign: "right" },
  stageTextActive: { color: colors.textDark, fontWeight: "600" },

  serviceChip: { maxWidth: "90%", minHeight: 36, flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, marginTop: spacing.xl },
  serviceText: { flexShrink: 1, fontSize: font.size.xs, fontWeight: "700", color: colors.primary },
  elapsed: { marginTop: spacing.lg, fontSize: font.size.xs, color: colors.textMuted, textAlign: "center" },
  abortButton: { alignSelf: "stretch", marginTop: spacing.xl },

  failure: { flex: 1, justifyContent: "center" },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
