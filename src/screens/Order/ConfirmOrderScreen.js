import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  CalendarCheck,
  CarProfile,
  Check,
  Lightning,
  MapPin,
  Plus,
  SteeringWheel,
  Warning,
} from "phosphor-react-native";
import { AppHeader, EmptyState, PressableScale, PrimaryButton } from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { fetchMyVehicles, vehicleSub, vehicleTitle } from "../../services/vehiclesApi";
import { getDeviceCoords } from "../../services/location";

const formatNumber = (value) => (value == null ? "" : Number(value).toLocaleString("ar-EG"));
const formatDate = (date) => date.toLocaleString("ar-EG", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default function ConfirmOrderScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { serviceId, serviceName, servicePrice, coords: coordsParam } = route?.params || {};
  const [scheduled, setScheduled] = useState(false);
  const [when, setWhen] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState(Platform.OS === "android" ? "date" : "datetime");
  const [carState, setCarState] = useState("broken");
  const [notes, setNotes] = useState("");
  const [notesFocused, setNotesFocused] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState(null);
  const [coords, setCoords] = useState(coordsParam || null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [vehicleList, currentCoords] = await Promise.all([
        fetchMyVehicles(),
        coordsParam ? Promise.resolve(coordsParam) : getDeviceCoords(),
      ]);
      const list = Array.isArray(vehicleList) ? vehicleList : [];
      const defaultVehicle = list.find((vehicle) => vehicle.isDefault) || list[0];
      setVehicles(list);
      setVehicleId(defaultVehicle?.id || defaultVehicle?._id || null);
      setCoords(currentCoords);
    } catch (loadError) {
      setError(loadError?.message || "تعذر تحضير بيانات الطلب");
    } finally {
      setLoading(false);
    }
  }, [coordsParam]);

  useEffect(() => { load(); }, [load]);

  const refreshLocation = async () => {
    setLocationLoading(true);
    try {
      setCoords(await getDeviceCoords());
    } catch (locationError) {
      setError(locationError?.message || "تعذر تحديد الموقع الحالي");
    } finally {
      setLocationLoading(false);
    }
  };

  const canSubmit = !!serviceId && Number.isFinite(coords?.longitude) && Number.isFinite(coords?.latitude);
  const carStateLabel = carState === "broken" ? "السيارة متعطلة تماماً" : "السيارة قادرة على الحركة";

  const openSchedulePicker = () => {
    setPickerMode(Platform.OS === "android" ? "date" : "datetime");
    setShowPicker(true);
  };

  const handlePickerChange = (event, value) => {
    if (event?.type === "dismissed" || !value) {
      setShowPicker(false);
      return;
    }
    setWhen(value);
    if (Platform.OS === "android" && pickerMode === "date") {
      setShowPicker(false);
      setPickerMode("time");
      setTimeout(() => setShowPicker(true), 0);
      return;
    }
    if (Platform.OS !== "ios") setShowPicker(false);
  };

  // طلب مكرّر هنا يعني خصماً مزدوجاً وشكوى: الحارس المرجعي يمنع مرور نقرة
  // ثانية قبل أن تكتمل عملية التنقّل (تعطيل الزر وحده غير كافٍ لأنه يعتمد
  // على إعادة رسم غير متزامنة).
  const submittingRef = useRef(false);
  const submit = () => {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setTimeout(() => { submittingRef.current = false; }, 1500);
    const composedNotes = [carStateLabel, notes.trim()].filter(Boolean).join(" - ");
    navigation?.navigate?.("SearchingProvider", {
      serviceId,
      serviceName,
      vehicleId: vehicleId || undefined,
      notes: composedNotes || undefined,
      scheduleTime: scheduled ? when.toISOString() : undefined,
      longitude: coords.longitude,
      latitude: coords.latitude,
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 112 }]}
      >
        <AppHeader title="تأكيد الطلب" subtitle="راجع التفاصيل قبل الإرسال" onBack={() => navigation?.goBack?.()} />

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.stateText}>جاري تجهيز الطلب...</Text></View>
        ) : error && !coords ? (
          <EmptyState title="تعذر تجهيز الطلب" message={error} actionLabel="إعادة المحاولة" onAction={load} />
        ) : (
          <>
            <View style={styles.summary}>
              <View style={styles.summaryIcon}><Lightning size={23} weight="fill" color={colors.primary} /></View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>{serviceName || "الخدمة المطلوبة"}</Text>
                <Text style={styles.summaryPrice}>{servicePrice ? `يبدأ من ${formatNumber(servicePrice)} ل.س` : "السعر النهائي يحدد حسب الحالة"}</Text>
              </View>
            </View>

            {/* تفصيل السعر قبل التأكيد: المفاجأة السعرية بعد الالتزام أسوأ من
                سعر مرتفع معلن، وهي السبب الأول للإلغاء وفقدان الثقة. */}
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>سعر الخدمة الابتدائي</Text>
                <Text style={styles.priceValue}>
                  {servicePrice ? `${formatNumber(servicePrice)} ل.س` : "حسب الحالة"}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>رسوم الوصول</Text>
                <Text style={styles.priceValue}>تُحتسب حسب المسافة</Text>
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.priceTotalLabel}>الإجمالي المتوقّع</Text>
                <Text style={styles.priceTotalValue}>
                  {servicePrice ? `من ${formatNumber(servicePrice)} ل.س` : "يحدَّد بعد الفحص"}
                </Text>
              </View>
              <Text style={styles.priceNote}>
                قد يتغيّر الإجمالي إن لزمت قطع غيار أو تعذّر الإصلاح موقعياً. يبلغك الفني
                بأي فرق قبل تنفيذه.
              </Text>
            </View>

            <SectionLabel title="المركبة" helper="اختياري" />
            {vehicles.length === 0 ? (
              <PressableScale style={styles.addVehicle} onPress={() => navigation?.navigate?.("AddVehicle")} accessibilityRole="button">
                <Plus size={18} weight="bold" color={colors.primary} />
                <Text style={styles.addVehicleText}>إضافة مركبة لتسريع الطلب</Text>
              </PressableScale>
            ) : (
              <View style={styles.vehicleList}>
                {vehicles.map((vehicle) => {
                  const id = vehicle.id || vehicle._id;
                  const selected = id === vehicleId;
                  return (
                    <PressableScale
                      key={id}
                      onPress={() => setVehicleId(selected ? null : id)}
                      style={[styles.selectRow, selected && styles.selectRowActive]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                    >
                      <View style={styles.rowIcon}><CarProfile size={22} weight="fill" color={colors.primary} /></View>
                      <View style={styles.rowCopy}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{vehicleTitle(vehicle)}</Text>
                        <Text style={styles.rowSubtitle} numberOfLines={1}>{vehicleSub(vehicle)}</Text>
                      </View>
                      <View style={[styles.radio, selected && styles.radioActive]}>{selected ? <Check size={13} weight="bold" color={colors.onPrimary} /> : null}</View>
                    </PressableScale>
                  );
                })}
              </View>
            )}

            <SectionLabel title="موقع الخدمة" />
            <View style={styles.locationRow}>
              <View style={[styles.rowIcon, styles.locationIcon]}><MapPin size={22} weight="fill" color={colors.secondary} /></View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{coords ? "تم تحديد موقعك الحالي" : "الموقع غير متاح"}</Text>
                <Text style={styles.rowSubtitle}>{coords ? "سيُرسل الموقع الدقيق للفني عند التأكيد" : "فعّل إذن الموقع ثم أعد المحاولة"}</Text>
              </View>
              <PressableScale style={styles.refreshLocation} onPress={refreshLocation} disabled={locationLoading} accessibilityRole="button" accessibilityLabel="تحديث الموقع">
                {locationLoading ? <ActivityIndicator size="small" color={colors.secondary} /> : <Text style={styles.refreshText}>تحديث</Text>}
              </PressableScale>
            </View>
            {error ? <Text style={styles.inlineError}>{error}</Text> : null}

            <SectionLabel title="موعد الخدمة" />
            <View style={styles.toggleRow}>
              <View style={[styles.rowIcon, styles.scheduleIcon]}><CalendarCheck size={21} weight="fill" color={colors.info} /></View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>جدولة لوقت لاحق</Text>
                <Text style={styles.rowSubtitle}>{scheduled ? formatDate(when) : "طلب الخدمة الآن"}</Text>
              </View>
              <Switch
                value={scheduled}
                onValueChange={(value) => {
                  setScheduled(value);
                  if (value) openSchedulePicker();
                }}
                trackColor={{ false: colors.borderInput, true: colors.primarySoft }}
                thumbColor={scheduled ? colors.primary : colors.surface}
                accessibilityLabel="جدولة الخدمة لوقت لاحق"
              />
            </View>
            {scheduled ? (
              <PressableScale style={styles.dateButton} onPress={openSchedulePicker} accessibilityRole="button">
                <CalendarCheck size={18} color={colors.primary} />
                <Text style={styles.dateButtonText}>{formatDate(when)}</Text>
              </PressableScale>
            ) : null}
            {showPicker ? (
              <DateTimePicker
                value={when}
                mode={pickerMode}
                minimumDate={new Date()}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handlePickerChange}
              />
            ) : null}

            <SectionLabel title="حالة السيارة" />
            <View style={styles.stateOptions}>
              <StateOption selected={carState === "broken"} Icon={Warning} label="متعطلة تماماً" onPress={() => setCarState("broken")} />
              <StateOption selected={carState === "movable"} Icon={SteeringWheel} label="قادرة على الحركة" onPress={() => setCarState("movable")} />
            </View>

            <SectionLabel title="ملاحظات للفني" helper="اختياري" />
            <View style={[styles.notes, notesFocused && styles.notesFocused]}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                onFocus={() => setNotesFocused(true)}
                onBlur={() => setNotesFocused(false)}
                placeholder="صف المشكلة أو اذكر معلومة تساعد الفني..."
                placeholderTextColor={colors.textMuted2}
                multiline
                maxLength={500}
                textAlign="right"
                textAlignVertical="top"
                accessibilityLabel="ملاحظات للفني"
                style={styles.notesInput}
              />
              <Text style={styles.characterCount}>{notes.length} / 500</Text>
            </View>
          </>
        )}
      </ScrollView>

      {!loading && (!error || coords) ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {/* الزر يقول ما سيحدث وبكم: «تأكيد الطلب · ١٥٠ ل.س» لا «التالي».
              ذكر النتيجة والسعر في الزر يقلّل التردد والإلغاء اللاحق. */}
          <PrimaryButton
            label={
              scheduled
                ? "تأكيد الحجز"
                : servicePrice
                  ? `تأكيد الطلب · من ${formatNumber(servicePrice)} ل.س`
                  : "تأكيد الطلب"
            }
            icon={<Lightning size={18} weight="fill" color={colors.onPrimary} />}
            onPress={submit}
            disabled={!canSubmit}
            accessibilityHint={!canSubmit ? "حدّد موقع الخدمة أولاً لتفعيل التأكيد" : undefined}
          />
        </View>
      ) : null}
    </View>
  );
}

function SectionLabel({ title, helper }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {helper ? <Text style={styles.sectionHelper}>{helper}</Text> : null}
    </View>
  );
}

function StateOption({ selected, Icon, label, onPress }) {
  return (
    <PressableScale
      onPress={onPress}
      feedback={selected ? false : "selection"}
      style={[styles.stateOption, selected && styles.stateOptionActive]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
    >
      <Icon size={21} weight="fill" color={selected ? colors.primary : colors.textMuted} />
      <Text style={[styles.stateOptionText, selected && styles.stateOptionTextActive]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
  content: { width: "100%", maxWidth: layout.contentMaxWidth, alignSelf: "center", paddingHorizontal: spacing.screenH },
  loading: { minHeight: 300, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  stateText: { color: colors.textMuted, fontSize: font.size.sm, textAlign: "center" },
  summary: { minHeight: 76, flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.card, padding: spacing.md, marginTop: spacing.lg },
  summaryIcon: { width: 44, height: 44, flexShrink: 0, borderRadius: radius.sm, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryTitle: { fontSize: font.size.body, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  summaryPrice: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 1, textAlign: "right" },
  sectionLabel: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { fontSize: font.size.xs, fontWeight: "700", color: colors.textHeading, textAlign: "right" },
  sectionHelper: { fontSize: font.size.xxs, color: colors.textMuted },
  vehicleList: { gap: spacing.sm },
  selectRow: { minHeight: 68, flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.card, padding: spacing.md },
  selectRowActive: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: "#FCFAFD" },
  rowIcon: { width: 40, height: 40, flexShrink: 0, borderRadius: radius.sm, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark, textAlign: "right" },
  rowSubtitle: { fontSize: font.size.xxs, color: colors.textMuted, marginTop: 1, textAlign: "right" },
  radio: { width: 22, height: 22, flexShrink: 0, borderRadius: 11, borderWidth: 1.5, borderColor: colors.borderInput, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  addVehicle: { minHeight: 52, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderWidth: 1, borderStyle: "dashed", borderColor: colors.primarySoft, borderRadius: radius.card, backgroundColor: colors.tint },
  addVehicleText: { fontSize: font.size.sm, fontWeight: "700", color: colors.primary },
  locationRow: { minHeight: 74, flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.card, padding: spacing.md },
  locationIcon: { backgroundColor: colors.secondarySoft },
  // 44 = الحد الأدنى لهدف اللمس (كان 38)
  refreshLocation: { minHeight: layout.touchTarget, minWidth: 64, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: colors.secondarySoft },
  refreshText: { fontSize: font.size.xxs, fontWeight: "700", color: colors.secondary },
  inlineError: { marginTop: spacing.xs, color: colors.danger, fontSize: font.size.xxs, textAlign: "right" },
  toggleRow: { minHeight: 74, flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard, borderRadius: radius.card, padding: spacing.md },
  scheduleIcon: { backgroundColor: colors.infoBg },
  dateButton: { minHeight: 48, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderWidth: 1, borderColor: colors.primarySoft, borderRadius: radius.card, backgroundColor: colors.tint, marginTop: spacing.sm },
  dateButtonText: { fontSize: font.size.xs, fontWeight: "700", color: colors.primary, textAlign: "center" },
  stateOptions: { flexDirection: "row-reverse", gap: spacing.sm },
  stateOption: { flex: 1, minHeight: 60, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderWidth: 1, borderColor: colors.borderInput, borderRadius: radius.card, backgroundColor: colors.surface, paddingHorizontal: spacing.sm },
  stateOptionActive: { borderColor: colors.primary, backgroundColor: colors.tint },
  stateOptionText: { flexShrink: 1, fontSize: font.size.xs, fontWeight: "600", color: colors.textMuted, textAlign: "center" },
  stateOptionTextActive: { color: colors.primary, fontWeight: "700" },
  notes: { minHeight: 116, borderWidth: 1, borderColor: colors.borderInput, borderRadius: radius.card, backgroundColor: colors.surface, padding: spacing.md },
  notesFocused: { borderColor: colors.primary, borderWidth: 1.5 },
  notesInput: { minHeight: 72, fontFamily: font.family, fontSize: font.size.sm, color: colors.textDark, padding: 0, outlineStyle: "none" },
  characterCount: { alignSelf: "flex-start", fontSize: font.size.xxs, color: colors.textMuted },
  priceBreakdown: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  priceRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  priceLabel: { fontSize: font.size.sm, color: colors.textBody, textAlign: "right" },
  priceValue: { fontSize: font.size.sm, color: colors.textDark, fontWeight: "600" },
  priceDivider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 2 },
  priceTotalLabel: { fontSize: font.size.sm, fontWeight: "700", color: colors.textDark },
  priceTotalValue: { fontSize: font.size.body, fontWeight: "700", color: colors.primary },
  priceNote: { fontSize: font.size.xxs, color: colors.textMuted, lineHeight: 18, textAlign: "right" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.screenH, paddingTop: spacing.md },
});
