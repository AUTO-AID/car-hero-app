// ============================================================
//  VehicleForm — نموذج المركبة المشترك
//
//  تُستعمل في «إضافة مركبة» وفي التحرير الموضعي داخل تفاصيل المركبة.
//  نسختان منفصلتان كانتا ستتباعدان مع أول تعديل في القواعد أو القوائم.
//
//  المبدأ الحاكم: **الاختيار قبل الكتابة**. كل حقل له مجموعة قيم معروفة
//  يُملأ من قائمة (شركة/طراز/سنة/لون)، ولا يبقى إدخال حرّ إلا للوحة ورقم
//  الهيكل — وهما وحدهما ما لا يمكن حصره.
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { Car, IdentificationCard, Check } from "phosphor-react-native";
import {
  ErrorBanner,
  InputField,
  OutlineButton,
  PickerSheet,
  PressableScale,
  PrimaryButton,
  SelectField,
} from "../../components/ui";
import { colors, font, radius, spacing } from "../../theme/theme";
import { BRANDS, COLORS, colorHex, modelsFor, yearOptions } from "./vehicleData";
import { clearDraft, readDraft, saveDraft } from "../../services/draftStorage";
import {
  collectErrors,
  normalizeDigits,
  validatePlate,
  validateVehicleText,
  validateVehicleYear,
  validateVin,
} from "../../services/validators";

const arYear = (value) => (value ? Number(value).toLocaleString("ar-EG", { useGrouping: false }) : "");

const YEAR_OPTIONS = yearOptions().map((year) => ({ value: year, label: arYear(year) }));
const COLOR_OPTIONS = COLORS.map((item) => ({ value: item.value, swatch: item.hex }));

export default function VehicleForm({
  initial = null,
  draftKey = null,
  isFirstVehicle = false,
  submitLabel = "حفظ المركبة",
  onSubmit,
  onCancel,
  cancelLabel = "إلغاء",
}) {
  const draft = useMemo(() => (draftKey ? readDraft(draftKey) : null), [draftKey]);
  const source = initial || draft || {};

  const [brand, setBrand] = useState(source.brand || "");
  const [model, setModel] = useState(source.model || "");
  const [year, setYear] = useState(source.year ? String(source.year) : "");
  const [color, setColor] = useState(source.color || "");
  const [plate, setPlate] = useState(source.plateNumber || "");
  const [vin, setVin] = useState(source.vin || "");
  const [isDefault, setIsDefault] = useState(!!source.isDefault);

  const [picker, setPicker] = useState(null); // brand | model | year | color
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState(!!draft && !initial);

  const vinRef = useRef(null);

  // حفظ المسوّدة عند كل تغيير: الخروج العرضي من نموذج نصف ممتلئ سبب رئيسي
  // للتخلّي، واستعادته أرخص من إعادة كتابته.
  useEffect(() => {
    if (!draftKey) return;
    const hasContent = brand || model || year || color || plate || vin;
    if (hasContent) saveDraft(draftKey, { brand, model, year, color, plateNumber: plate, vin, isDefault });
  }, [draftKey, brand, model, year, color, plate, vin, isDefault]);

  const validateAll = () => ({
    brand: validateVehicleText(brand, "الشركة المصنعة"),
    model: validateVehicleText(model, "الطراز"),
    year: validateVehicleYear(year),
    color: validateVehicleText(color, "اللون"),
    plate: validatePlate(plate),
    vin: validateVin(vin),
  });

  const markTouched = (key) => setTouched((prev) => ({ ...prev, [key]: true }));

  // مصدر واحد لأخطاء الحقول: تُشتقّ من القيم الحالية للحقول التي غادرها
  // المستخدم. حسابها داخل المعالِجات كان يقرأ حالة قديمة (الاختيار من قائمة
  // ثم الإغلاق يقعان في نفس الدورة)، فيظهر «أدخل الشركة المصنعة» بعد اختيارها.
  useEffect(() => {
    const all = validateAll();
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(all).forEach((key) => { next[key] = touched[key] ? all[key] : ""; });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, model, year, color, plate, vin, touched]);

  // فتح القائمة ليس مغادرةً للحقل — التحقّق عند إغلاقها، وإلا ظهر الخطأ
  // في وجه المستخدم قبل أن يُتاح له الاختيار أصلاً.
  const closePicker = () => {
    const key = picker;
    setPicker(null);
    if (key) markTouched(key);
  };

  const pickBrand = (value) => {
    setBrand(value);
    setError("");
    // الطراز تابع للشركة: إبقاء طراز شركة أخرى يُنتج مركبة غير موجودة
    if (value !== brand) { setModel(""); setTouched((prev) => ({ ...prev, model: false })); }
  };

  // حارس مرجعي: تعطيل الزر يعتمد على إعادة رسم غير متزامنة، فقد تمرّ نقرة
  // ثانية وتُنشئ مركبة مكرّرة.
  const submittingRef = useRef(false);
  const submit = async () => {
    if (submittingRef.current) return;
    const { errors, firstError, valid } = collectErrors(validateAll());
    if (!valid) {
      setTouched({ brand: true, model: true, year: true, color: true, plate: true, vin: true });
      setFieldErrors(errors);
      setError(firstError);
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await onSubmit?.({
        brand: brand.trim(),
        model: model.trim(),
        year: Number(normalizeDigits(year)),
        color: color.trim(),
        plateNumber: plate.trim(),
        vin: vin.trim() || undefined,
        isDefault: isFirstVehicle ? true : isDefault,
      });
      if (draftKey) clearDraft(draftKey);
    } catch (submitError) {
      setError(submitError?.message || "تعذّر حفظ المركبة");
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const discardDraft = () => {
    if (draftKey) clearDraft(draftKey);
    setBrand(""); setModel(""); setYear(""); setColor(""); setPlate(""); setVin("");
    setFieldErrors({}); setTouched({}); setError(""); setRestored(false);
  };

  return (
    <View style={styles.form}>
      {/* المسوّدة المستعادة تُعلَن صراحةً: قيم تظهر بلا تفسير تُربك أكثر ممّا تفيد */}
      {restored ? (
        <View style={styles.restored}>
          <Text style={styles.restoredText}>استعدنا ما كتبته سابقاً.</Text>
          <OutlineButton label="ابدأ من جديد" onPress={discardDraft} style={styles.restoredBtn} />
        </View>
      ) : null}

      <SelectField
        label="الشركة المصنعة"
        icon={<Car size={19} color={colors.primary} />}
        value={brand}
        placeholder="اختر الشركة"
        error={fieldErrors.brand}
        onPress={() => setPicker("brand")}
      />

      <SelectField
        label="الطراز"
        value={model}
        placeholder={brand ? "اختر الطراز" : "اختر الشركة أولاً"}
        disabled={!brand}
        helper={!brand ? "قائمة الطُرُز تعتمد على الشركة المختارة" : undefined}
        error={fieldErrors.model}
        onPress={() => setPicker("model")}
      />

      <View style={styles.row}>
        <SelectField
          containerStyle={styles.rowItem}
          label="سنة الصنع"
          value={arYear(year)}
          placeholder="اختر السنة"
          error={fieldErrors.year}
          onPress={() => setPicker("year")}
        />
        <SelectField
          containerStyle={styles.rowItem}
          label="اللون"
          icon={<View style={[styles.swatch, { backgroundColor: colorHex(color) || colors.surfaceAlt }]} />}
          value={color}
          placeholder="اختر اللون"
          error={fieldErrors.color}
          onPress={() => setPicker("color")}
        />
      </View>

      <InputField
        label="رقم اللوحة"
        icon={<IdentificationCard size={19} color={colors.primary} />}
        value={plate}
        onChangeText={(value) => { setPlate(value); setError(""); }}
        onBlur={() => markTouched("plate")}
        placeholder="دمشق ١٢٣٤٥٦"
        helper={fieldErrors.plate ? undefined : "كما هو مكتوب على اللوحة: المحافظة ثم الرقم"}
        error={fieldErrors.plate}
        returnKeyType="next"
        onSubmitEditing={() => vinRef.current?.focus?.()}
        maxLength={20}
      />

      <InputField
        ref={vinRef}
        label="رقم الهيكل VIN (اختياري)"
        value={vin}
        onChangeText={(value) => { setVin(value.toUpperCase()); setError(""); }}
        onBlur={() => markTouched("vin")}
        placeholder="١٧ خانة"
        helper={fieldErrors.vin ? undefined : "اتركه فارغاً إن لم يكن متوفّراً"}
        error={fieldErrors.vin}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={17}
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      {/* أول مركبة تصبح افتراضية على الخادم تلقائياً — نُعلم المستخدم بدل
          أن نعرض مفتاحاً لا أثر لتغييره. */}
      {isFirstVehicle ? (
        <View style={styles.notice}>
          <Check size={16} weight="bold" color={colors.success} />
          <Text style={styles.noticeText}>ستكون هذه مركبتك الافتراضية في الطلب السريع.</Text>
        </View>
      ) : (
        <PressableScale
          accessibilityRole="checkbox"
          accessibilityLabel="تعيين كمركبة افتراضية"
          accessibilityState={{ checked: isDefault }}
          onPress={() => setIsDefault((value) => !value)}
          style={styles.checkRow}
        >
          <View style={[styles.checkbox, !isDefault && styles.checkboxOff]}>
            {isDefault ? <Check size={14} weight="bold" color={colors.onPrimary} /> : null}
          </View>
          <View style={styles.checkCopy}>
            <Text style={styles.checkText}>تعيين كمركبة افتراضية</Text>
            <Text style={styles.checkHint}>تُختار تلقائياً عند طلب أي خدمة</Text>
          </View>
        </PressableScale>
      )}

      <ErrorBanner message={error} />

      <View style={styles.actions}>
        <PrimaryButton label={submitLabel} loading={saving} onPress={submit} style={styles.grow} />
        {onCancel ? <OutlineButton label={cancelLabel} onPress={onCancel} disabled={saving} style={styles.grow} /> : null}
      </View>

      <PickerSheet
        visible={picker === "brand"}
        title="اختر الشركة المصنعة"
        options={BRANDS}
        value={brand}
        onSelect={pickBrand}
        onClose={() => closePicker()}
        allowCustom
        customLabel="شركة أخرى"
      />
      <PickerSheet
        visible={picker === "model"}
        title={`طُرُز ${brand}`}
        options={modelsFor(brand)}
        value={model}
        onSelect={(value) => { setModel(value); setError(""); }}
        onClose={() => closePicker()}
        allowCustom
        customLabel="طراز آخر"
        emptyMessage="لا طُرُز محفوظة لهذه الشركة — أدخل الطراز يدوياً"
      />
      <PickerSheet
        visible={picker === "year"}
        title="اختر سنة الصنع"
        options={YEAR_OPTIONS}
        value={year}
        onSelect={(value) => { setYear(value); setError(""); }}
        onClose={() => closePicker()}
        allowCustom
        customLabel="سنة أقدم"
      />
      <PickerSheet
        visible={picker === "color"}
        title="اختر اللون"
        options={COLOR_OPTIONS}
        value={color}
        onSelect={(value) => { setColor(value); setError(""); }}
        onClose={() => closePicker()}
        searchable={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  row: { flexDirection: "row-reverse", gap: spacing.md },
  rowItem: { flex: 1, minWidth: 0 },
  swatch: {
    width: 20,
    height: 20,
    flexShrink: 0,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderInput,
  },
  restored: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.infoBg,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  restoredText: { flex: 1, fontSize: font.size.xs, color: colors.info, textAlign: "right" },
  restoredBtn: { flexShrink: 0, minHeight: 40, paddingHorizontal: spacing.md },
  notice: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  noticeText: { flex: 1, fontSize: font.size.xs, color: colors.success, textAlign: "right" },
  checkRow: {
    minHeight: 52,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    flexShrink: 0,
    borderRadius: radius.xs,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOff: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderInput },
  checkCopy: { flex: 1, minWidth: 0 },
  checkText: { fontSize: font.size.sm, fontWeight: "600", color: colors.textDark, textAlign: "right" },
  checkHint: { fontSize: font.size.xxs, color: colors.textMuted, textAlign: "right", marginTop: 1 },
  actions: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.xs },
  grow: { flex: 1, width: "auto" },
});
