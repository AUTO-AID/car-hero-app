// ============================================================
//  VehicleDetailScreen — ٢٩ · تفاصيل المركبة
//
//  التحرير موضعي داخل الشاشة بدل قفزة إلى نموذج منفصل: القفزة تُفقد السياق
//  وتضيف خطوتَي تنقّل لتغيير حقل واحد. والنموذج نفسه (`VehicleForm`) هو
//  المستخدم في الإضافة، فلا تتباعد القواعد بين المسارين.
//
//  الإجراءات مصنّفة بخطورتها: «تعيين كافتراضية» فوري وقابل للتراجع، والحذف
//  مدمّر — بلون `danger` ومفصول مكانياً وخلف `ConfirmSheet` (كان `Alert.alert`
//  يجعله غير قابل للتنفيذ على الويب أصلاً).
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BellRinging,
  CalendarBlank,
  CarProfile,
  Gauge,
  PencilSimple,
  Star,
  Trash,
  Wrench,
} from "phosphor-react-native";
import {
  AppHeader,
  AsyncContent,
  ConfirmSheet,
  ErrorBanner,
  OutlineButton,
  PressableScale,
  SkeletonCard,
  StatusPill,
} from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import {
  deleteVehicle,
  fetchVehicle,
  fetchVehicleMaintenance,
  fetchVehicleReminders,
  reminderFrequencyLabel,
  reminderTypeLabel,
  setDefaultVehicle,
  updateVehicle,
  vehicleSub,
  vehicleTitle,
} from "../../services/vehiclesApi";
import { fetchOrders } from "../../services/ordersApi";
import { ACTIVE_STATUSES } from "../../services/orderStatus";
import { colorHex } from "./vehicleData";
import VehicleForm from "./VehicleForm";

const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");
// السنة بلا فاصل آلاف: «٢٬٠٢١» ليست سنة
const arYear = (value) => Number(value || 0).toLocaleString("ar-EG", { useGrouping: false });
const money = (value) => `${arNum(value)} ل.س`;

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
};

export default function VehicleDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const vehicleId = route?.params?.vehicleId || route?.params?.vehicle?.id || route?.params?.vehicle?._id;

  const [vehicle, setVehicle] = useState(route?.params?.vehicle || null);
  const [maintenance, setMaintenance] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [linkedOrder, setLinkedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(!!route?.params?.edit);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!vehicleId) {
      setError("لم نتمكّن من تحديد المركبة المطلوبة");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [details, records, reminderList, orders] = await Promise.all([
        fetchVehicle(vehicleId),
        fetchVehicleMaintenance(vehicleId).catch(() => []),
        fetchVehicleReminders(vehicleId).catch(() => []),
        fetchOrders({ statuses: ACTIVE_STATUSES.join(","), limit: 50 }).catch(() => ({ orders: [] })),
      ]);
      setVehicle(details);
      setMaintenance(Array.isArray(records) ? records : []);
      setReminders(Array.isArray(reminderList) ? reminderList : []);
      setLinkedOrder(
        (orders?.orders || []).find((order) => String(order?.vehicleId) === String(vehicleId)) || null,
      );
    } catch (loadError) {
      setError(loadError?.message || "تعذّر جلب تفاصيل المركبة");
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { load(); }, [load]);

  const makeDefault = async () => {
    if (busy || vehicle?.isDefault) return;
    setBusy(true);
    setActionError("");
    try {
      const updated = await setDefaultVehicle(vehicleId);
      setVehicle(updated || { ...vehicle, isDefault: true });
      setNotice("صارت هذه مركبتك الافتراضية.");
    } catch (defaultError) {
      setActionError(defaultError?.message || "تعذّر تعيين المركبة كافتراضية");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (busy) return;
    setBusy(true);
    setActionError("");
    try {
      await deleteVehicle(vehicleId);
      setConfirmingDelete(false);
      navigation?.goBack?.();
    } catch (deleteError) {
      setConfirmingDelete(false);
      setActionError(deleteError?.message || "تعذّر حذف المركبة");
    } finally {
      setBusy(false);
    }
  };

  const saveEdits = async (body) => {
    const updated = await updateVehicle(vehicleId, body);
    setVehicle(updated || { ...vehicle, ...body });
    setEditing(false);
    setNotice("حُفظت التعديلات.");
    load();
  };

  const swatch = colorHex(vehicle?.color);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <AppHeader
          title={vehicle ? vehicleTitle(vehicle) : "تفاصيل المركبة"}
          subtitle={vehicle ? vehicleSub(vehicle) : ""}
          onBack={() => navigation?.goBack?.()}
        />

        <AsyncContent
          loading={loading}
          error={error}
          hasData={!!vehicle}
          onRetry={vehicleId ? load : undefined}
          errorTitle="تعذّر عرض المركبة"
          skeleton={<View style={styles.skeleton}><SkeletonCard lines={4} /><SkeletonCard lines={3} /></View>}
        >
          {vehicle ? (
            <>
              <View style={styles.hero}>
                <View style={styles.heroIcon}><CarProfile size={34} weight="fill" color={colors.primary} /></View>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle} numberOfLines={1}>{vehicleTitle(vehicle)}</Text>
                  <View style={styles.heroMeta}>
                    {swatch ? <View style={[styles.swatch, { backgroundColor: swatch }]} /> : null}
                    <Text style={styles.heroSub} numberOfLines={1}>{vehicle.color || "لون غير محدّد"}</Text>
                  </View>
                </View>
                {vehicle.isDefault ? <StatusPill label="الافتراضية" tone="warning" /> : null}
              </View>

              <View style={styles.plateCard}>
                <Text style={styles.plateLabel}>رقم اللوحة</Text>
                <Text style={styles.plateValue}>{vehicle.plateNumber || "—"}</Text>
              </View>

              {notice ? <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text> : null}
              <ErrorBanner message={actionError} style={styles.banner} />

              {linkedOrder ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="عرض الطلب الجاري المرتبط بهذه المركبة"
                  onPress={() => navigation?.navigate?.("OrderDetail", { orderId: linkedOrder.id || linkedOrder._id })}
                  style={styles.linkedCard}
                >
                  <Text style={styles.linkedText}>
                    هذه المركبة مرتبطة بطلب جارٍ — {linkedOrder.serviceName || "خدمة سيارة"}
                  </Text>
                  <Text style={styles.linkedAction}>عرض الطلب</Text>
                </PressableScale>
              ) : null}

              {editing ? (
                <View style={styles.editCard}>
                  <Text style={styles.sectionTitle}>تعديل البيانات</Text>
                  <VehicleForm
                    initial={vehicle}
                    submitLabel="حفظ التعديلات"
                    onSubmit={saveEdits}
                    onCancel={() => setEditing(false)}
                    cancelLabel="إلغاء"
                  />
                </View>
              ) : (
                <>
                  <View style={styles.card}>
                    <Row label="الشركة" value={vehicle.brand} />
                    <Row label="الطراز" value={vehicle.model} />
                    <Row label="سنة الصنع" value={vehicle.year ? arYear(vehicle.year) : "—"} />
                    <Row label="اللون" value={vehicle.color || "—"} />
                    {vehicle.vin ? <Row label="رقم الهيكل" value={vehicle.vin} last /> : null}
                  </View>

                  {/* الإجراء العادي أولاً، والمدمّر مفصول أسفل الشاشة بمسافة
                      وبلون تحذيري — لا يقعان في صفّ واحد متساويين. */}
                  <View style={styles.actions}>
                    <OutlineButton
                      label="تعديل البيانات"
                      icon={<PencilSimple size={17} color={colors.primary} />}
                      onPress={() => { setNotice(""); setEditing(true); }}
                    />
                    <OutlineButton
                      label={vehicle.isDefault ? "هذه مركبتك الافتراضية" : "تعيين كمركبة افتراضية"}
                      icon={<Star size={17} weight="fill" color={vehicle.isDefault ? colors.warning : colors.primary} />}
                      disabled={vehicle.isDefault || busy}
                      loading={busy && !confirmingDelete}
                      onPress={makeDefault}
                    />
                  </View>
                </>
              )}

              <Text style={styles.sectionTitle}>سجل الصيانة</Text>
              {maintenance.length === 0 ? (
                <Text style={styles.emptyLine}>لا يوجد سجل صيانة لهذه المركبة بعد.</Text>
              ) : (
                <View style={styles.list}>
                  {maintenance.map((item, index) => (
                    <View key={item.id || item._id || index} style={styles.item}>
                      <View style={styles.itemIcon}><Wrench size={19} weight="fill" color={colors.primary} /></View>
                      <View style={styles.itemCopy}>
                        <Text style={styles.itemTitle} numberOfLines={1}>{item.serviceType || "خدمة صيانة"}</Text>
                        <Text style={styles.itemMeta} numberOfLines={1}>
                          {[formatDate(item.date), item.mileage ? `${arNum(item.mileage)} كم` : ""]
                            .filter(Boolean).join(" · ") || item.description || "—"}
                        </Text>
                      </View>
                      {item.cost ? <Text style={styles.itemPrice}>{money(item.cost)}</Text> : null}
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.sectionTitle}>تذكيرات الصيانة</Text>
              {reminders.length === 0 ? (
                <Text style={styles.emptyLine}>لا توجد تذكيرات على هذه المركبة.</Text>
              ) : (
                <View style={styles.list}>
                  {reminders.map((item, index) => (
                    <View key={item.id || item._id || index} style={[styles.item, styles.itemWarning]}>
                      <View style={[styles.itemIcon, styles.itemIconWarning]}>
                        {item.mileageThreshold
                          ? <Gauge size={19} weight="fill" color={colors.warning} />
                          : <BellRinging size={19} weight="fill" color={colors.warning} />}
                      </View>
                      <View style={styles.itemCopy}>
                        {/* النوع enum إنجليزي على الخادم — يمرّ عبر خريطة تعريب */}
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.title || reminderTypeLabel(item.type)}
                        </Text>
                        <View style={styles.itemMetaRow}>
                          <CalendarBlank size={12} color={colors.textMuted} />
                          <Text style={styles.itemMeta} numberOfLines={1}>
                            {[
                              formatDate(item.reminderDate),
                              item.mileageThreshold ? `عند ${arNum(item.mileageThreshold)} كم` : "",
                              reminderFrequencyLabel(item.frequency),
                            ].filter(Boolean).join(" · ") || reminderTypeLabel(item.type)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>حذف المركبة</Text>
                <Text style={styles.dangerText}>
                  {linkedOrder
                    ? "هذه المركبة مرتبطة بطلب جارٍ — الحذف لن يُلغي الطلب لكن الفني لن يرى بياناتها."
                    : "يُزيل المركبة وبياناتها من حسابك نهائياً. لا يمكن التراجع."}
                </Text>
                <OutlineButton
                  danger
                  label="حذف المركبة"
                  icon={<Trash size={17} color={colors.danger} />}
                  disabled={busy}
                  onPress={() => { setActionError(""); setConfirmingDelete(true); }}
                />
              </View>
            </>
          ) : null}
        </AsyncContent>
      </ScrollView>

      <ConfirmSheet
        visible={confirmingDelete}
        title="حذف هذه المركبة؟"
        message={
          linkedOrder
            ? "المركبة مرتبطة بطلب جارٍ. الحذف لا يُلغي الطلب، لكن بيانات السيارة لن تكون متاحة للفني."
            : "لا يمكن التراجع بعد الحذف. إن كانت مركبتك الوحيدة فلن يسمح النظام بحذفها."
        }
        confirmLabel="نعم، احذف"
        cancelLabel="تراجع"
        danger
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </View>
  );
}

function Row({ label, value, last }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{String(value ?? "—")}</Text>
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

  hero: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  heroIcon: {
    width: 58,
    height: 58,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  heroMeta: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: 3 },
  heroSub: { flexShrink: 1, fontSize: font.size.xs, color: colors.textMuted, textAlign: "right" },
  swatch: {
    width: 14,
    height: 14,
    flexShrink: 0,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderInput,
  },

  plateCard: {
    marginTop: spacing.sm,
    alignItems: "center",
    gap: 2,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.md,
  },
  plateLabel: { fontSize: font.size.xxs, color: colors.textMuted },
  plateValue: { fontSize: font.size.title, fontWeight: "700", color: colors.textDark, letterSpacing: 1 },

  notice: { marginTop: spacing.md, fontSize: font.size.xs, color: colors.success, textAlign: "right" },
  banner: { marginTop: spacing.md },

  linkedCard: {
    marginTop: spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    minHeight: layout.touchTarget,
    borderRadius: radius.sm,
    backgroundColor: colors.infoBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkedText: { flex: 1, fontSize: font.size.xs, color: colors.info, textAlign: "right" },
  linkedAction: { flexShrink: 0, fontSize: font.size.xs, fontWeight: "700", color: colors.info },

  editCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { flexShrink: 0, fontSize: font.size.sm, color: colors.textMuted },
  rowValue: { flex: 1, fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "left" },

  actions: { marginTop: spacing.md, gap: spacing.sm },

  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: font.size.md,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "right",
  },
  emptyLine: { fontSize: font.size.sm, color: colors.textMuted, textAlign: "right", lineHeight: 22 },
  list: { gap: spacing.sm },
  item: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  itemWarning: { backgroundColor: colors.warningBg, borderColor: colors.warningBg },
  itemIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  itemIconWarning: { backgroundColor: colors.surface },
  itemCopy: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  itemMetaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 5, marginTop: 2 },
  itemMeta: { flexShrink: 1, fontSize: font.size.xs, color: colors.textMuted, textAlign: "right" },
  itemPrice: { flexShrink: 0, fontSize: font.size.sm, fontWeight: "700", color: colors.textHeading },

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
