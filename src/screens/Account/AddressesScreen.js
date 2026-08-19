// ============================================================
//  AddressesScreen — ٣٨ · العناوين المحفوظة
//
//  أثمن ما في العنوان ليس سطره — بل **ملاحظة الوصول** («البناء الأزرق،
//  الطابق الثاني، بجانب الصيدلية»). عقد الخادم يحوي الحقل (`note` ≤ ٢٤٠)
//  منذ البداية، لكن الشاشة لم تكن تكتبه ولا تعرضه، فكان الفني يصل إلى
//  الشارع ثم يتّصل ليسأل.
//
//  والعنوان يُضاف بنفس تجربة الخريطة القائمة (`InteractiveMapScreen`) لا
//  بتجربة ثانية مخترعة: الشاشة تفتحها وتستعيد ما اختاره المستخدم من
//  `locationService` (المصدر الوحيد للموقع).
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Briefcase,
  Crosshair,
  DotsThreeVertical,
  House,
  MapPin,
  MapTrifold,
  Plus,
} from "phosphor-react-native";
import {
  ActionSheet,
  AppHeader,
  AsyncContent,
  ConfirmSheet,
  ErrorBanner,
  InputField,
  OutlineButton,
  PressableScale,
  PrimaryButton,
  SkeletonList,
  StatusPill,
} from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from "../../services/customerApi";
import { getCachedCoords, getCoords } from "../../services/locationService";
import { reverseGeocode, tileUrlFor } from "../../services/geocoding";

const idOf = (address) => address?.id || address?._id;

/** تسميات جاهزة: الاختيار أسرع من الكتابة، ويجعل الأيقونة صحيحة دائماً */
const PRESETS = [
  { value: "المنزل", Icon: House },
  { value: "العمل", Icon: Briefcase },
  { value: "مخصّص", Icon: MapPin },
];

function iconFor(label) {
  if (/عمل|work|office|مكتب/i.test(label || "")) return Briefcase;
  if (/منزل|بيت|home/i.test(label || "")) return House;
  return MapPin;
}

/** الخادم يخزّن الموقع GeoJSON: location.coordinates = [lng, lat] */
function coordsOf(address) {
  const pair = address?.location?.coordinates;
  if (Array.isArray(pair) && pair.length === 2) {
    return { longitude: Number(pair[0]), latitude: Number(pair[1]) };
  }
  if (address?.coordinates) return address.coordinates;
  return null;
}

export default function AddressesScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState("");

  const [sheetItem, setSheetItem] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  // النموذج داخل الشاشة: إضافة عنوان لا تستحقّ قفزة إلى شاشة ثالثة
  const [editing, setEditing] = useState(null); // null | {} | address
  const [label, setLabel] = useState("المنزل");
  const [customLabel, setCustomLabel] = useState("");
  const [line, setLine] = useState("");
  const [note, setNote] = useState("");
  const [coords, setCoords] = useState(null);
  const [tileFailed, setTileFailed] = useState(false);
  const tileUri = coords ? tileUrlFor(coords.latitude, coords.longitude) : null;
  const [locating, setLocating] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const data = await fetchAddresses();
      setItems(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError?.message || "تعذّر تحميل العناوين");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // العودة من الخريطة: الموقع المختار يُودَع في مصدر الموقع الوحيد، فنلتقطه
  // ونفتح النموذج مباشرةً بدل أن يضيع اختيار المستخدم.
  useEffect(() => {
    const cached = getCachedCoords();
    if (cached?.source === "manual" && !editing) {
      setEditing({});
      setCoords({ latitude: cached.latitude, longitude: cached.longitude });
      reverseGeocode(cached.latitude, cached.longitude).then((place) => {
        if (place) setLine((current) => current || place);
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }, [load]);

  const openForm = (address = null) => {
    setActionError("");
    setFormError("");
    if (address) {
      const preset = PRESETS.find((item) => item.value === address.label);
      setLabel(preset ? preset.value : "مخصّص");
      setCustomLabel(preset ? "" : address.label || "");
      setLine(address.addressLine || "");
      setNote(address.note || "");
      setCoords(coordsOf(address));
      setTileFailed(false);
      setEditing(address);
      return;
    }
    setLabel(items.length === 0 ? "المنزل" : "العمل");
    setCustomLabel("");
    setLine("");
    setNote("");
    setCoords(null);
    setEditing({});
  };

  const closeForm = () => { setEditing(null); setFormError(""); };

  const useCurrentLocation = async () => {
    setLocating(true);
    setFormError("");
    try {
      // إيماءة صريحة من المستخدم — وحدها يُسمح لها بإظهار حوار الإذن
      const position = await getCoords({ allowRequest: true, force: true });
      setCoords({ latitude: position.latitude, longitude: position.longitude });
      const place = await reverseGeocode(position.latitude, position.longitude).catch(() => "");
      if (place) setLine(place);
    } catch (locationError) {
      setFormError(locationError?.message || "تعذّر تحديد موقعك الحالي");
    } finally {
      setLocating(false);
    }
  };

  const finalLabel = label === "مخصّص" ? customLabel.trim() : label;
  const canSave = !!finalLabel && !!line.trim() && !!coords;

  const submit = async () => {
    if (busy || !canSave) return;
    setBusy(true);
    setFormError("");
    try {
      const body = {
        label: finalLabel.slice(0, 60),
        addressLine: line.trim().slice(0, 240),
        note: note.trim().slice(0, 240) || undefined,
        coordinates: { latitude: coords.latitude, longitude: coords.longitude },
      };
      if (idOf(editing)) await updateAddress(idOf(editing), body);
      else await createAddress({ ...body, isDefault: items.length === 0 });
      closeForm();
      await load({ silent: true });
    } catch (saveError) {
      setFormError(saveError?.message || "تعذّر حفظ العنوان، حاول مجدداً");
    } finally {
      setBusy(false);
    }
  };

  const applyDefault = async (address) => {
    setSheetItem(null);
    setBusy(true);
    setActionError("");
    try {
      await setDefaultAddress(idOf(address));
      setItems((current) => current.map((item) => ({ ...item, isDefault: idOf(item) === idOf(address) })));
      await load({ silent: true });
    } catch (defaultError) {
      setActionError(defaultError?.message || "تعذّر تعيين العنوان الافتراضي");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    setActionError("");
    try {
      await deleteAddress(idOf(deleting));
      setDeleting(null);
      await load({ silent: true });
    } catch (deleteError) {
      setDeleting(null);
      setActionError(deleteError?.message || "تعذّر حذف العنوان");
    } finally {
      setBusy(false);
    }
  };

  const formTitle = useMemo(() => (idOf(editing) ? "تعديل العنوان" : "عنوان جديد"), [editing]);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <AppHeader
          title="العناوين المحفوظة"
          subtitle="العنوان الافتراضي يُقترح تلقائياً عند الطلب"
          onBack={() => (editing ? closeForm() : navigation?.goBack?.())}
        />

        <ErrorBanner message={actionError} style={styles.banner} />

        {editing ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>{formTitle}</Text>

            <Text style={styles.fieldLabel}>التسمية</Text>
            <View style={styles.presets}>
              {PRESETS.map((preset) => {
                const active = preset.value === label;
                return (
                  <PressableScale
                    key={preset.value}
                    accessibilityRole="button"
                    accessibilityLabel={preset.value}
                    accessibilityState={{ selected: active }}
                    onPress={() => setLabel(preset.value)}
                    style={[styles.preset, active && styles.presetActive]}
                  >
                    <preset.Icon size={16} weight="fill" color={active ? colors.onPrimary : colors.primary} />
                    <Text style={[styles.presetText, active && styles.presetTextActive]}>{preset.value}</Text>
                  </PressableScale>
                );
              })}
            </View>

            {label === "مخصّص" ? (
              <InputField
                label="اسم العنوان"
                value={customLabel}
                onChangeText={setCustomLabel}
                placeholder="مثال: منزل العائلة"
                maxLength={60}
                containerStyle={styles.field}
              />
            ) : null}

            <InputField
              label="العنوان"
              value={line}
              onChangeText={setLine}
              placeholder="الشارع والحي والمدينة"
              maxLength={240}
              containerStyle={styles.field}
            />

            {/* ملاحظة الوصول: الحقل الأثمن عملياً — يمنع مكالمة «أين أنت؟» */}
            <InputField
              label="ملاحظة للوصول (اختياري)"
              value={note}
              onChangeText={setNote}
              placeholder="البناء الأزرق، الطابق الثاني، بجانب الصيدلية"
              helper="تصل إلى الفني مع الطلب وتختصر عليه البحث"
              maxLength={240}
              multiline
              containerStyle={styles.field}
            />

            <Text style={styles.fieldLabel}>الموقع على الخريطة</Text>
            {coords ? (
              <View style={styles.mapPreview}>
                {/* المعاينة تحسين لا شرط: إن تعذّرت البلاطة نعرض بديلاً من
                    نظامنا بدل ترك صورة الخادم الأجنبية تظهر داخل الشاشة */}
                {tileUri && !tileFailed ? (
                  <Image
                    source={{ uri: tileUri }}
                    style={styles.mapImage}
                    onError={() => setTileFailed(true)}
                    alt=""
                  />
                ) : (
                  <View style={[styles.mapImage, styles.mapFallback]}>
                    <Text style={styles.mapFallbackText}>
                      {`${coords.latitude.toFixed(5)}، ${coords.longitude.toFixed(5)}`}
                    </Text>
                  </View>
                )}
                <View style={styles.mapPin}><MapPin size={20} weight="fill" color={colors.primary} /></View>
              </View>
            ) : (
              <Text style={styles.mapEmpty}>لم يُحدَّد موقع بعد — اختر من الخريطة أو استخدم موقعك الحالي.</Text>
            )}

            <View style={styles.locationActions}>
              <OutlineButton
                label="اختر من الخريطة"
                icon={<MapTrifold size={17} color={colors.primary} />}
                onPress={() => navigation?.navigate?.("InteractiveMap", { from: "addresses" })}
                style={styles.grow}
              />
              <OutlineButton
                label="موقعي الحالي"
                icon={<Crosshair size={17} color={colors.primary} />}
                loading={locating}
                onPress={useCurrentLocation}
                style={styles.grow}
              />
            </View>

            <ErrorBanner message={formError} style={styles.banner} />

            <View style={styles.formActions}>
              <PrimaryButton
                label={idOf(editing) ? "حفظ التعديلات" : "حفظ العنوان"}
                disabled={!canSave}
                loading={busy}
                onPress={submit}
                style={styles.grow}
              />
              <OutlineButton label="إلغاء" onPress={closeForm} disabled={busy} style={styles.grow} />
            </View>
            {!canSave ? (
              <Text style={styles.formHint}>
                {!finalLabel ? "أدخل اسماً للعنوان" : !line.trim() ? "أدخل تفاصيل العنوان" : "حدّد الموقع على الخريطة"}
              </Text>
            ) : null}
          </View>
        ) : (
          <AsyncContent
            loading={loading}
            error={error}
            hasData={items.length > 0}
            isEmpty={!loading && !error && items.length === 0}
            onRetry={() => load()}
            errorTitle="تعذّر تحميل العناوين"
            skeleton={<SkeletonList count={3} lines={2} />}
            empty={{
              icon: <MapPin size={32} color={colors.primary} />,
              title: "لا توجد عناوين محفوظة",
              message: "احفظ عناوينك المتكرّرة (المنزل، العمل) ليصل الفني أسرع، ولتطلب بضغطة بلا تحديد الموقع في كل مرّة.",
              actionLabel: "إضافة عنوان",
              onAction: () => openForm(),
            }}
          >
            <View style={styles.list}>
              {items.map((address) => (
                <AddressCard
                  key={idOf(address)}
                  address={address}
                  onPress={() => openForm(address)}
                  onMenu={() => { setActionError(""); setSheetItem(address); }}
                />
              ))}
            </View>

            <PrimaryButton
              label="إضافة عنوان"
              icon={<Plus size={18} weight="bold" color={colors.onPrimary} />}
              onPress={() => openForm()}
              style={styles.add}
            />
          </AsyncContent>
        )}
      </ScrollView>

      <ActionSheet
        visible={!!sheetItem}
        title={sheetItem?.label || "عنوان محفوظ"}
        message={sheetItem?.addressLine || ""}
        busy={busy}
        onCancel={() => setSheetItem(null)}
        actions={[
          ...(sheetItem && !sheetItem.isDefault
            ? [{ key: "default", label: "تعيين كعنوان افتراضي", onPress: () => applyDefault(sheetItem) }]
            : []),
          {
            key: "edit",
            label: "تعديل العنوان",
            onPress: () => { const target = sheetItem; setSheetItem(null); openForm(target); },
          },
          {
            key: "delete",
            label: "حذف العنوان",
            danger: true,
            onPress: () => { const target = sheetItem; setSheetItem(null); setDeleting(target); },
          },
        ]}
      />

      <ConfirmSheet
        visible={!!deleting}
        title="حذف هذا العنوان؟"
        message={
          deleting?.isDefault
            ? `${deleting?.label || "العنوان"} هو عنوانك الافتراضي — سيحلّ محلّه عنوان آخر تلقائياً. لا يمكن التراجع.`
            : `${deleting?.label || "العنوان"} — لا يمكن التراجع بعد الحذف.`
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

function AddressCard({ address, onPress, onMenu }) {
  const Icon = iconFor(address.label);
  const coords = coordsOf(address);
  const tile = coords ? tileUrlFor(coords.latitude, coords.longitude) : null;
  const [thumbFailed, setThumbFailed] = useState(false);

  return (
    <View style={[styles.card, address.isDefault && styles.cardDefault]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${address.label || "عنوان"}، ${address.addressLine || ""}${address.isDefault ? "، العنوان الافتراضي" : ""}`}
        accessibilityHint="تعديل العنوان"
        onPress={onPress}
        style={styles.cardMain}
      >
        {/* معاينة مصغّرة: التعرّف البصري أسرع من قراءة سطر عنوان */}
        {tile && !thumbFailed ? (
          <View style={styles.thumb}>
            <Image
              source={{ uri: tile }}
              style={styles.thumbImage}
              onError={() => setThumbFailed(true)}
              alt=""
            />
            <View style={styles.thumbPin}><Icon size={14} weight="fill" color={colors.onPrimary} /></View>
          </View>
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}><Icon size={20} weight="fill" color={colors.primary} /></View>
        )}

        <View style={styles.cardCopy}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{address.label || "عنوان"}</Text>
            {address.isDefault ? <StatusPill label="الافتراضي" tone="success" /> : null}
          </View>
          <Text style={styles.cardLine} numberOfLines={2}>{address.addressLine || "بدون تفاصيل"}</Text>
          {address.note ? (
            <Text style={styles.cardNote} numberOfLines={2}>ملاحظة الوصول: {address.note}</Text>
          ) : null}
        </View>
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`خيارات ${address.label || "العنوان"}`}
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
  banner: { marginTop: spacing.md },

  list: { gap: spacing.sm, marginTop: spacing.lg },
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
  thumb: {
    width: 56,
    height: 56,
    flexShrink: 0,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmpty: { backgroundColor: colors.tint },
  thumbImage: { ...StyleSheet.absoluteFillObject },
  thumbPin: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  cardTitle: { flexShrink: 1, fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  cardLine: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, textAlign: "right", lineHeight: 18 },
  cardNote: { fontSize: font.size.xxs, color: colors.secondary, marginTop: 4, textAlign: "right", lineHeight: 17 },
  menuButton: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  add: { marginTop: spacing.lg },

  form: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  formTitle: { fontSize: font.size.md, fontWeight: "700", color: colors.textDark, textAlign: "right", marginBottom: spacing.md },
  fieldLabel: { fontSize: font.size.label, fontWeight: "600", color: colors.textHeading, marginBottom: 7, textAlign: "right" },
  presets: { flexDirection: "row-reverse", gap: spacing.sm, marginBottom: spacing.md },
  preset: {
    flex: 1,
    minHeight: layout.touchTarget,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.surface,
  },
  presetActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetText: { fontSize: font.size.xs, fontWeight: "700", color: colors.primary },
  presetTextActive: { color: colors.onPrimary },
  field: { marginBottom: spacing.md },

  mapPreview: {
    height: 132,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  mapImage: { ...StyleSheet.absoluteFillObject },
  mapFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt || colors.tint },
  mapFallbackText: { fontSize: font.size.xs, color: colors.textMuted2, fontVariant: ["tabular-nums"] },
  mapPin: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  mapEmpty: { fontSize: font.size.xs, color: colors.textMuted, textAlign: "right", lineHeight: 19 },
  locationActions: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.md },
  formActions: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.md },
  formHint: { marginTop: 6, fontSize: font.size.xs, color: colors.textMuted, textAlign: "center" },
  grow: { flex: 1, width: "auto" },
});
