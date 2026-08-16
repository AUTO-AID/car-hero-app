// ============================================================
//  VehiclesListScreen — ٢٧ · مركباتي
//
//  المركبة الافتراضية هي التي ستُستخدم في الطلب السريع، فمعرفتها بنظرة
//  وتبديلها بضغطة هما وظيفة الشاشة الأولى — لا مجرد عرض قائمة.
//
//  تنبيه من انحدار معروف: كانت المركبة المضافة حديثاً تبقى غير مرئية بسبب
//  تخزين مؤقّت لا تعمل آلية إبطاله. أُصلح في الخادم — فإن عادت مركبة جديدة
//  للاختفاء، ابدأ التحقيق من هناك لا من هنا.
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Car, CaretLeft, DotsThreeVertical, Plus, Star } from "phosphor-react-native";
import {
  ActionSheet,
  AsyncContent,
  ConfirmSheet,
  ErrorBanner,
  PressableScale,
  PrimaryButton,
  SkeletonList,
} from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import {
  MAX_VEHICLES,
  deleteVehicle,
  fetchMyVehicles,
  setDefaultVehicle,
  vehicleSub,
  vehicleTitle,
} from "../../services/vehiclesApi";
import { fetchOrders } from "../../services/ordersApi";
import { ACTIVE_STATUSES } from "../../services/orderStatus";
import { colorHex } from "./vehicleData";

const arNum = (value) => Number(value || 0).toLocaleString("ar-EG");
const idOf = (vehicle) => vehicle?.id || vehicle?._id;

export default function VehiclesListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [vehicles, setVehicles] = useState([]);
  const [activeVehicleIds, setActiveVehicleIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [sheetVehicle, setSheetVehicle] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      // الطلبات الجارية تُجلب معها لأن الحذف يجب أن يحذّر من فقد مركبة
      // مرتبطة بطلب قيد التنفيذ — والخادم لا يفحص هذا الارتباط إطلاقاً.
      const [list, orders] = await Promise.all([
        fetchMyVehicles(),
        fetchOrders({ statuses: ACTIVE_STATUSES.join(","), limit: 50 }).catch(() => ({ orders: [] })),
      ]);
      setVehicles(Array.isArray(list) ? list : []);
      setActiveVehicleIds(
        (orders?.orders || []).map((order) => order?.vehicleId).filter(Boolean).map(String),
      );
    } catch (loadError) {
      setError(loadError?.message || "تعذّر جلب المركبات");
    } finally {
      setLoading(false);
    }
  }, []);

  // نظام التنقّل يدوي بلا addListener: الشاشة تُعاد تركيبها عند العودة إليها
  // فتُحدَّث تلقائياً بعد الإضافة، ويبقى السحب للتحديث للحالات الأخرى.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load(); }, [load]);

  const makeDefault = async (vehicle) => {
    setBusy(true);
    setActionError("");
    try {
      await setDefaultVehicle(idOf(vehicle));
      // تحديث محلّي فوري: انتظار جولة شبكة كاملة لتغيير علامة واحدة يجعل
      // الضغطة تبدو بلا أثر.
      setVehicles((current) => current.map((item) => ({ ...item, isDefault: idOf(item) === idOf(vehicle) })));
      setSheetVehicle(null);
    } catch (defaultError) {
      setActionError(defaultError?.message || "تعذّر تعيين المركبة الافتراضية");
      setSheetVehicle(null);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    setActionError("");
    try {
      await deleteVehicle(idOf(deleting));
      setDeleting(null);
      await load({ silent: true });
    } catch (deleteError) {
      setActionError(deleteError?.message || "تعذّر حذف المركبة");
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const linkedToActiveOrder = (vehicle) => activeVehicleIds.includes(String(idOf(vehicle)));
  const atLimit = vehicles.length >= MAX_VEHICLES;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title} accessibilityRole="header">مركباتي</Text>
            <Text style={styles.subtitle}>المركبة الافتراضية تُختار تلقائياً عند طلب الخدمة</Text>
          </View>
          <Text style={styles.counter} accessibilityLabel={`${arNum(vehicles.length)} من ${arNum(MAX_VEHICLES)}`}>
            {arNum(vehicles.length)} / {arNum(MAX_VEHICLES)}
          </Text>
        </View>

        <ErrorBanner message={actionError} style={styles.banner} />

        <AsyncContent
          loading={loading}
          error={error}
          hasData={vehicles.length > 0}
          isEmpty={!loading && !error && vehicles.length === 0}
          onRetry={() => load()}
          errorTitle="تعذّر تحميل المركبات"
          skeleton={<SkeletonList count={3} lines={2} />}
          empty={{
            icon: <Car size={34} color={colors.primary} />,
            title: "أضف مركبتك الأولى",
            message: "حفظ بيانات سيارتك يجعل طلب الخدمة أسرع، ويساعد الفني على التعرّف عليها فور وصوله.",
            actionLabel: "إضافة مركبة",
            onAction: () => navigation?.navigate?.("AddVehicle"),
          }}
        >
          <View style={styles.list}>
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={idOf(vehicle)}
                vehicle={vehicle}
                linked={linkedToActiveOrder(vehicle)}
                onPress={() => navigation?.navigate?.("VehicleDetail", { vehicleId: idOf(vehicle), vehicle })}
                onMenu={() => { setActionError(""); setSheetVehicle(vehicle); }}
              />
            ))}
          </View>

          {atLimit ? (
            // زر مختفٍ بلا تفسير يُقرأ كعطل: نُبقي السبب مكتوباً مكان الزر
            <Text style={styles.limitNote}>
              وصلت إلى الحد الأقصى ({arNum(MAX_VEHICLES)} مركبات). احذف مركبة لإضافة أخرى.
            </Text>
          ) : (
            <PrimaryButton
              label="إضافة مركبة"
              icon={<Plus size={18} weight="bold" color={colors.onPrimary} />}
              onPress={() => navigation?.navigate?.("AddVehicle")}
              style={styles.addButton}
            />
          )}
        </AsyncContent>
      </ScrollView>

      {/* الإجراءات السريعة داخل القائمة: تبديل الافتراضية أو الحذف بلا
          الدخول إلى التفاصيل والعودة منها. */}
      <ActionSheet
        visible={!!sheetVehicle}
        title={sheetVehicle ? vehicleTitle(sheetVehicle) : ""}
        message={sheetVehicle?.plateNumber || ""}
        busy={busy}
        onCancel={() => setSheetVehicle(null)}
        actions={[
          ...(sheetVehicle && !sheetVehicle.isDefault
            ? [{ key: "default", label: "تعيين كمركبة افتراضية", onPress: () => makeDefault(sheetVehicle) }]
            : []),
          {
            key: "edit",
            label: "تعديل البيانات",
            onPress: () => {
              const target = sheetVehicle;
              setSheetVehicle(null);
              navigation?.navigate?.("VehicleDetail", { vehicleId: idOf(target), vehicle: target, edit: true });
            },
          },
          {
            key: "delete",
            label: "حذف المركبة",
            danger: true,
            onPress: () => { const target = sheetVehicle; setSheetVehicle(null); setDeleting(target); },
          },
        ]}
      />

      <ConfirmSheet
        visible={!!deleting}
        title="حذف هذه المركبة؟"
        message={
          deleting && linkedToActiveOrder(deleting)
            ? `${vehicleTitle(deleting)} مرتبطة بطلب جارٍ الآن. حذفها لن يُلغي الطلب، لكن الفني لن يرى بيانات السيارة عند وصوله.`
            : `${deleting ? vehicleTitle(deleting) : ""} — لا يمكن التراجع بعد الحذف.`
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

function VehicleCard({ vehicle, linked, onPress, onMenu }) {
  const swatch = colorHex(vehicle.color);
  return (
    <View style={[styles.card, vehicle.isDefault && styles.cardDefault]}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${vehicleTitle(vehicle)}، اللوحة ${vehicle.plateNumber || "غير محددة"}${vehicle.isDefault ? "، المركبة الافتراضية" : ""}`}
        accessibilityHint="عرض تفاصيل المركبة"
        style={styles.cardMain}
      >
        <View style={[styles.icon, vehicle.isDefault && styles.iconDefault]}>
          <Car size={24} weight="fill" color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{vehicleTitle(vehicle)}</Text>
            {vehicle.isDefault ? (
              <View style={styles.defaultBadge}>
                <Star size={11} weight="fill" color={colors.warning} />
                <Text style={styles.defaultText}>الافتراضية</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            {/* عيّنة اللون: التعرّف البصري على السيارة أسرع من قراءة اسم لونها */}
            {swatch ? <View style={[styles.swatch, { backgroundColor: swatch }]} /> : null}
            <Text style={styles.meta} numberOfLines={1}>{vehicleSub(vehicle) || "بيانات ناقصة"}</Text>
          </View>
          <View style={styles.plateBox}>
            <Text style={styles.plateLabel}>اللوحة</Text>
            <Text style={styles.plate} numberOfLines={1}>{vehicle.plateNumber || "—"}</Text>
          </View>
          {linked ? <Text style={styles.linked}>مرتبطة بطلب جارٍ</Text> : null}
        </View>
        <CaretLeft size={16} color={colors.textMuted2} />
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`خيارات ${vehicleTitle(vehicle)}`}
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
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: font.size.title, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  subtitle: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1, textAlign: "right" },
  counter: {
    flexShrink: 0,
    minWidth: 56,
    height: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    color: colors.textMuted,
    fontSize: font.size.xs,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 30,
  },
  banner: { marginBottom: spacing.md },

  list: { gap: spacing.sm },
  card: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: spacing.xs,
  },
  cardDefault: { borderColor: colors.primarySoft, borderWidth: 1.5 },
  cardMain: { flex: 1, minWidth: 0, flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  icon: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDefault: { backgroundColor: colors.tint2 },
  copy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  name: { flexShrink: 1, fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  defaultBadge: {
    flexShrink: 0,
    minHeight: 22,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.warningBg,
    paddingHorizontal: 7,
  },
  defaultText: { fontSize: font.size.xxs, fontWeight: "700", color: colors.warning },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: 3 },
  swatch: {
    width: 12,
    height: 12,
    flexShrink: 0,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderInput,
  },
  meta: { flexShrink: 1, fontSize: font.size.xs, color: colors.textMuted, textAlign: "right" },
  plateBox: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  plateLabel: { fontSize: font.size.xxs, color: colors.textMuted },
  plate: { flexShrink: 1, fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, letterSpacing: 0.5 },
  linked: { marginTop: 6, fontSize: font.size.xxs, color: colors.info, textAlign: "right" },
  menuButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },

  addButton: { marginTop: spacing.lg },
  limitNote: {
    marginTop: spacing.lg,
    fontSize: font.size.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
});
