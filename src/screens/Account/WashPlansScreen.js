// ============================================================
//  WashPlansScreen — ٤٤ · خطط الغسيل الدوري
//
//  اشتراك متكرّر يولّد حجوزات تلقائياً — فالتحكّم والشفافية أهمّ من الجمال:
//  المستخدم يجب أن يعرف دائماً **متى يأتي الفني القادم** وكيف يوقف ذلك.
//
//  عقد الخادم: `UpdateWashPlanDto` يقبل `isActive` — وهو **الإيقاف المؤقّت**
//  الذي يمنع الإلغاء الكامل عند أول ظرف طارئ. ولا يقبل `nextBookingAt`،
//  فتخطّي موعد واحد دون إيقاف الخطة غير مدعوم بعد (انظر التقرير).
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarCheck, CarProfile, Clock, Drop, MapPin, Plus } from "phosphor-react-native";
import {
  ActionSheet,
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
import {
  createWashPlan,
  deleteWashPlan,
  fetchAddresses,
  fetchWashPlans,
  generateWashPlanBooking,
  updateWashPlan,
} from "../../services/customerApi";
import { fetchMyVehicles, vehicleTitle } from "../../services/vehiclesApi";
import { formatFullDate, formatTime } from "../../services/scheduling";

const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");
const itemId = (item) => item?.id || item?._id;

const FREQUENCIES = [
  { value: 1, label: "مرّة شهرياً" },
  { value: 2, label: "مرّتان شهرياً" },
  { value: 4, label: "أسبوعياً" },
];
const TYPES = [
  { value: "external", label: "خارجي" },
  { value: "internal", label: "داخلي" },
  { value: "full", label: "شامل" },
];
const SLOTS = [
  { value: "morning", label: "صباحاً" },
  { value: "noon", label: "ظهراً" },
  { value: "evening", label: "مساءً" },
];

const labelOf = (list, value, fallback) => list.find((item) => item.value === value)?.label || fallback;

/** التاريخ العربي كاملاً مع الوقت — لا صيغة ISO ولا تاريخ بلا ساعة */
function formatMoment(value) {
  if (!value) return "غير محدّد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدّد";
  return `${formatFullDate(date)} · ${formatTime(date)}`;
}

function daysUntil(value) {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  if (diff <= 0) return "مستحقّ الآن";
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `بعد ${arNum(days)} يوم`;
  const hours = Math.max(1, Math.round(diff / 3600000));
  return `بعد ${arNum(hours)} ساعة`;
}

export default function WashPlansScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [plans, setPlans] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const [sheetPlan, setSheetPlan] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const [creating, setCreating] = useState(false);
  const [vehicleId, setVehicleId] = useState(null);
  const [addressId, setAddressId] = useState(null);
  const [frequency, setFrequency] = useState(4);
  const [washType, setWashType] = useState("full");
  const [slot, setSlot] = useState("morning");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [plansResult, vehiclesResult, addressesResult] = await Promise.all([
        fetchWashPlans(),
        fetchMyVehicles().catch(() => []),
        fetchAddresses().catch(() => []),
      ]);
      const vehicleList = Array.isArray(vehiclesResult) ? vehiclesResult : [];
      const addressList = Array.isArray(addressesResult) ? addressesResult : [];
      setPlans(Array.isArray(plansResult) ? plansResult : []);
      setVehicles(vehicleList);
      setAddresses(addressList);
      setVehicleId((current) => current || itemId(vehicleList.find((v) => v.isDefault) || vehicleList[0]) || null);
      setAddressId((current) => current || itemId(addressList.find((a) => a.isDefault) || addressList[0]) || null);
    } catch (loadError) {
      setError(loadError?.message || "تعذّر تحميل خطط الغسيل");
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

  const vehicleName = useCallback(
    (id) => vehicleTitle(vehicles.find((vehicle) => itemId(vehicle) === String(id))) || "مركبة محفوظة",
    [vehicles],
  );
  const addressName = useCallback(
    (id) => addresses.find((address) => itemId(address) === String(id))?.label || "العنوان الافتراضي",
    [addresses],
  );

  const missingPrerequisite = useMemo(() => {
    if (vehicles.length === 0) return { text: "أضف مركبة أولاً — الخطة تحتاجها لإنشاء الحجز.", route: "Vehicles", label: "إضافة مركبة" };
    if (addresses.length === 0) return { text: "أضف عنواناً محفوظاً أولاً — الفني يحتاجه للوصول.", route: "Addresses", label: "إضافة عنوان" };
    return null;
  }, [vehicles, addresses]);

  const createPlan = async () => {
    if (busy || missingPrerequisite) return;
    setBusy(true);
    setActionError("");
    try {
      await createWashPlan({
        vehicleId,
        addressId,
        visitsPerMonth: frequency,
        washType,
        preferredTimeSlot: slot,
        reminderEnabled: true,
      });
      setCreating(false);
      setNotice("أُنشئت الخطة — سيُحجز الموعد القادم تلقائياً.");
      await load({ silent: true });
    } catch (createError) {
      setActionError(createError?.message || "تعذّر إنشاء خطة الغسيل");
    } finally {
      setBusy(false);
    }
  };

  // الإيقاف المؤقّت لا يقلّ أهمية عن الإلغاء: غيابه يدفع للإلغاء الكامل
  const togglePlan = async (plan) => {
    setSheetPlan(null);
    setBusy(true);
    setActionError("");
    try {
      await updateWashPlan(itemId(plan), { isActive: !plan.isActive });
      setNotice(plan.isActive ? "أُوقفت الخطة مؤقّتاً — لن تُنشأ حجوزات جديدة." : "استُؤنفت الخطة.");
      await load({ silent: true });
    } catch (toggleError) {
      setActionError(toggleError?.message || "تعذّر تحديث الخطة");
    } finally {
      setBusy(false);
    }
  };

  const bookNow = async (plan) => {
    setSheetPlan(null);
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      await generateWashPlanBooking(itemId(plan));
      setNotice("أُنشئ حجز من الخطة — تابعه من «طلباتي».");
      await load({ silent: true });
    } catch (bookError) {
      setActionError(bookError?.message || "تعذّر إنشاء الحجز — تأكّد من عنوان الخطة");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    setActionError("");
    try {
      await deleteWashPlan(itemId(deleting));
      setDeleting(null);
      setNotice("حُذفت الخطة.");
      await load({ silent: true });
    } catch (deleteError) {
      setDeleting(null);
      setActionError(deleteError?.message || "تعذّر حذف الخطة");
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
          title="خطط الغسيل الدوري"
          subtitle="حجوزات تُنشأ تلقائياً بالوتيرة التي تختارها"
          onBack={() => (creating ? setCreating(false) : navigation?.goBack?.())}
        />

        {notice ? <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text> : null}
        <ErrorBanner message={actionError} style={styles.banner} />

        <AsyncContent
          loading={loading}
          error={error}
          hasData={plans.length > 0 || creating}
          isEmpty={!loading && !error && plans.length === 0 && !creating}
          onRetry={() => load()}
          errorTitle="تعذّر تحميل الخطط"
          skeleton={<SkeletonList count={2} lines={3} />}
          empty={{
            icon: <Drop size={32} color={colors.primary} />,
            title: "لا توجد خطة غسيل بعد",
            message: "الخطة تحجز غسيل سيارتك تلقائياً بالوتيرة التي تحدّدها، فلا تتذكّرها كل مرّة — ويمكنك إيقافها مؤقّتاً في أي وقت.",
            actionLabel: "إنشاء خطة",
            onAction: () => setCreating(true),
          }}
        >
          {creating ? (
            <View style={styles.form}>
              <Text style={styles.formTitle}>خطة جديدة</Text>

              {missingPrerequisite ? (
                <View style={styles.prereq}>
                  <Text style={styles.prereqText}>{missingPrerequisite.text}</Text>
                  <OutlineButton
                    label={missingPrerequisite.label}
                    onPress={() => navigation?.navigate?.(missingPrerequisite.route)}
                  />
                </View>
              ) : (
                <>
                  <Field label="المركبة">
                    <Choices
                      items={vehicles.map((vehicle) => ({ value: itemId(vehicle), label: vehicleTitle(vehicle) }))}
                      value={vehicleId}
                      onChange={setVehicleId}
                    />
                  </Field>

                  <Field label="عنوان الغسيل">
                    <Choices
                      items={addresses.map((address) => ({ value: itemId(address), label: address.label || "عنوان" }))}
                      value={addressId}
                      onChange={setAddressId}
                    />
                  </Field>

                  <Field label="الوتيرة">
                    <Choices items={FREQUENCIES} value={frequency} onChange={setFrequency} />
                  </Field>

                  <Field label="نوع الغسيل">
                    <Choices items={TYPES} value={washType} onChange={setWashType} />
                  </Field>

                  <Field label="الوقت المفضّل">
                    <Choices items={SLOTS} value={slot} onChange={setSlot} />
                  </Field>

                  <View style={styles.formActions}>
                    <PrimaryButton label="إنشاء الخطة" loading={busy} onPress={createPlan} style={styles.grow} />
                    <OutlineButton label="إلغاء" disabled={busy} onPress={() => setCreating(false)} style={styles.grow} />
                  </View>
                </>
              )}
            </View>
          ) : (
            <>
              <View style={styles.list}>
                {plans.map((plan) => (
                  <PlanCard
                    key={itemId(plan)}
                    plan={plan}
                    vehicleName={vehicleName(plan.vehicleId)}
                    addressName={addressName(plan.addressId)}
                    onMenu={() => { setActionError(""); setNotice(""); setSheetPlan(plan); }}
                  />
                ))}
              </View>

              <PrimaryButton
                label="إنشاء خطة أخرى"
                icon={<Plus size={18} weight="bold" color={colors.onPrimary} />}
                onPress={() => { setNotice(""); setActionError(""); setCreating(true); }}
                style={styles.add}
              />
            </>
          )}
        </AsyncContent>
      </ScrollView>

      <ActionSheet
        visible={!!sheetPlan}
        title={sheetPlan ? `غسيل ${labelOf(TYPES, sheetPlan.washType, "شامل")}` : ""}
        message={sheetPlan ? `الموعد القادم: ${formatMoment(sheetPlan.nextBookingAt)}` : ""}
        busy={busy}
        onCancel={() => setSheetPlan(null)}
        actions={[
          { key: "book", label: "احجز الآن من الخطة", onPress: () => bookNow(sheetPlan) },
          {
            key: "toggle",
            label: sheetPlan?.isActive ? "إيقاف مؤقّت" : "استئناف الخطة",
            onPress: () => togglePlan(sheetPlan),
          },
          {
            key: "delete",
            label: "حذف الخطة",
            danger: true,
            onPress: () => { const target = sheetPlan; setSheetPlan(null); setDeleting(target); },
          },
        ]}
      />

      <ConfirmSheet
        visible={!!deleting}
        title="حذف خطة الغسيل؟"
        message={
          deleting?.nextBookingAt
            ? `لن يُنشأ الحجز القادم (${formatMoment(deleting.nextBookingAt)}) ولا ما بعده. الحجوزات التي أُنشئت فعلاً تبقى كما هي في «طلباتي».\nإن كنت تريد التوقّف مؤقّتاً فقط، استخدم «إيقاف مؤقّت» بدل الحذف.`
            : "لن تُنشأ حجوزات جديدة من هذه الخطة. الحجوزات القائمة تبقى كما هي."
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

function PlanCard({ plan, vehicleName, addressName, onMenu }) {
  const active = plan.isActive !== false;
  const due = daysUntil(plan.nextBookingAt);

  return (
    <PressableScale
      onPress={onMenu}
      accessibilityRole="button"
      accessibilityLabel={`خطة غسيل ${labelOf(TYPES, plan.washType, "شامل")}، ${active ? "نشطة" : "متوقّفة"}، الموعد القادم ${formatMoment(plan.nextBookingAt)}`}
      accessibilityHint="خيارات الخطة"
      style={[styles.card, !active && styles.cardPaused]}
    >
      <View style={styles.cardHead}>
        <View style={[styles.icon, !active && styles.iconPaused]}>
          <Drop size={22} weight="fill" color={active ? colors.primary : colors.textMuted} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>غسيل {labelOf(TYPES, plan.washType, "شامل")}</Text>
          <Text style={styles.cardSub}>
            {labelOf(FREQUENCIES, plan.visitsPerMonth, `${arNum(plan.visitsPerMonth)} زيارة`)} · {labelOf(SLOTS, plan.preferredTimeSlot, "صباحاً")}
          </Text>
        </View>
        <StatusPill label={active ? "نشطة" : "متوقّفة مؤقّتاً"} tone={active ? "success" : "warning"} />
      </View>

      {/* الموعد القادم أبرز معلومة: عليه يبني المستخدم يومه */}
      <View style={[styles.next, !active && styles.nextPaused]}>
        <CalendarCheck size={18} weight="fill" color={active ? colors.primary : colors.textMuted} />
        <View style={styles.nextCopy}>
          <Text style={styles.nextLabel}>{active ? "الموعد القادم" : "الموعد متوقّف"}</Text>
          <Text style={styles.nextValue}>{formatMoment(plan.nextBookingAt)}</Text>
        </View>
        {active && due ? <Text style={styles.nextDue}>{due}</Text> : null}
      </View>

      <View style={styles.meta}>
        <MetaRow Icon={CarProfile} text={vehicleName} />
        <MetaRow Icon={MapPin} text={addressName} />
        {plan.lastBookingAt ? <MetaRow Icon={Clock} text={`آخر غسلة: ${formatMoment(plan.lastBookingAt)}`} /> : null}
      </View>
    </PressableScale>
  );
}

function MetaRow({ Icon, text }) {
  return (
    <View style={styles.metaRow}>
      <Icon size={14} color={colors.textMuted} />
      <Text style={styles.metaText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Choices({ items, value, onChange }) {
  if (!items.length) return <Text style={styles.emptyChoice}>لا خيارات متاحة</Text>;
  return (
    <View style={styles.choices}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <PressableScale
            key={String(item.value)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.value)}
            style={[styles.choice, active && styles.choiceActive]}
          >
            <Text style={[styles.choiceText, active && styles.choiceTextActive]} numberOfLines={1}>{item.label}</Text>
          </PressableScale>
        );
      })}
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
  notice: { marginTop: spacing.md, fontSize: font.size.xs, color: colors.success, textAlign: "right" },
  banner: { marginTop: spacing.md },

  list: { gap: spacing.md, marginTop: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardPaused: { backgroundColor: colors.surfaceAlt },
  cardHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  icon: {
    width: 46,
    height: 46,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPaused: { backgroundColor: colors.surface },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: font.size.md, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  cardSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, textAlign: "right" },

  next: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.tint,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  nextPaused: { backgroundColor: colors.surfaceAlt },
  nextCopy: { flex: 1, minWidth: 0 },
  nextLabel: { fontSize: font.size.xxs, color: colors.textMuted, textAlign: "right" },
  nextValue: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right", marginTop: 1 },
  nextDue: { flexShrink: 0, fontSize: font.size.xxs, fontWeight: "700", color: colors.primary },

  meta: { gap: 6 },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  metaText: { flex: 1, fontSize: font.size.xs, color: colors.textMuted, textAlign: "right" },

  add: { marginTop: spacing.lg },

  form: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  formTitle: { fontSize: font.size.md, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  prereq: { gap: spacing.sm },
  prereqText: { fontSize: font.size.sm, color: colors.textBody, textAlign: "right", lineHeight: 21 },
  field: { gap: spacing.sm },
  fieldLabel: { fontSize: font.size.label, fontWeight: "600", color: colors.textHeading, textAlign: "right" },
  choices: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  choice: {
    minHeight: layout.touchTarget,
    minWidth: "30%",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.surface,
  },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { fontSize: font.size.xs, fontWeight: "700", color: colors.textHeading },
  choiceTextActive: { color: colors.onPrimary },
  emptyChoice: { fontSize: font.size.xs, color: colors.textMuted, textAlign: "right" },
  formActions: { flexDirection: "row-reverse", gap: spacing.sm },
  grow: { flex: 1, width: "auto" },
});
