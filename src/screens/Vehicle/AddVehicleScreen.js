// ============================================================
//  AddVehicleScreen — ٢٨ · إضافة مركبة
//
//  نموذج إدخال يُقاس بمعدّل الإكمال وزمنه ونسبة أخطائه — لا بشكله. لذلك
//  الشاشة صارت غلافاً رقيقاً حول `VehicleForm` المشترك، وكل حقل له مجموعة
//  قيم معروفة يُملأ باختيار لا بكتابة.
//
//  ما كان قبلها: ستة حقول نصّية حرّة (شركة، طراز، سنة، لون…) تُنتج بيانات
//  متباعدة، وبطاقة CTA متدرّجة مرسومة يدوياً بألوان خارج `theme.js`.
// ============================================================

import React, { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader, AsyncContent, EmptyState, SkeletonCard } from "../../components/ui";
import { colors, font, layout, radius, spacing } from "../../theme/theme";
import { MAX_VEHICLES, createVehicle, fetchMyVehicles, updateVehicle } from "../../services/vehiclesApi";
import VehicleForm from "./VehicleForm";

const DRAFT_KEY = "vehicle-new";

export default function AddVehicleScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const vehicle = route?.params?.vehicle || null;
  const editing = !!vehicle;

  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(!editing);
  const [error, setError] = useState("");

  // عدد المركبات يقرّر أمرين: هل بلغ المستخدم الحدّ (فيُمنع مبكراً بدل رفض
  // بعد ملء النموذج كاملاً)، وهل هذه أوّل مركبة (فتصير افتراضية تلقائياً).
  const load = useCallback(async () => {
    if (editing) return;
    setLoading(true);
    setError("");
    try {
      const list = await fetchMyVehicles();
      setCount(Array.isArray(list) ? list.length : 0);
    } catch (loadError) {
      setError(loadError?.message || "تعذّر تحضير النموذج");
    } finally {
      setLoading(false);
    }
  }, [editing]);

  useEffect(() => { load(); }, [load]);

  const save = async (body) => {
    if (editing) await updateVehicle(vehicle.id || vehicle._id, body);
    else await createVehicle(body);
    navigation?.goBack?.();
  };

  const atLimit = !editing && count != null && count >= MAX_VEHICLES;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <AppHeader
          title={editing ? "تعديل المركبة" : "إضافة مركبة"}
          subtitle={editing ? vehicle.plateNumber || "" : "الاختيار من القوائم أسرع من الكتابة"}
          onBack={() => navigation?.goBack?.()}
        />

        <AsyncContent
          loading={loading}
          error={error}
          hasData={editing || count != null}
          onRetry={load}
          errorTitle="تعذّر تحضير النموذج"
          skeleton={<View style={styles.skeleton}><SkeletonCard lines={3} /><SkeletonCard lines={3} /></View>}
        >
          {atLimit ? (
            <EmptyState
              title="وصلت إلى الحد الأقصى"
              message={`يمكن حفظ ${MAX_VEHICLES.toLocaleString("ar-EG")} مركبات كحد أقصى. احذف مركبة لم تعد تستخدمها لتتمكّن من إضافة أخرى.`}
              actionLabel="إدارة مركباتي"
              onAction={() => navigation?.goBack?.()}
            />
          ) : (
            <View style={styles.formWrap}>
              <VehicleForm
                initial={vehicle}
                // المسوّدة للإضافة فقط: استعادة «مسوّدة» فوق مركبة قائمة أثناء
                // التعديل تعني الكتابة على بياناتها الحقيقية بلا طلب المستخدم.
                draftKey={editing ? null : DRAFT_KEY}
                isFirstVehicle={!editing && count === 0}
                submitLabel={editing ? "حفظ التعديلات" : "حفظ المركبة"}
                onSubmit={save}
              />
              <Text style={styles.hint}>
                {editing
                  ? "التعديل يسري فوراً على الطلبات الجديدة، ولا يغيّر بيانات طلبات سابقة."
                  : "البيانات تُستخدم لتحديد سيارتك عند وصول الفني — كلّما دقّت، أسرع التعرّف عليها."}
              </Text>
            </View>
          )}
        </AsyncContent>
      </ScrollView>
    </KeyboardAvoidingView>
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
  formWrap: { marginTop: spacing.lg, gap: spacing.md },
  hint: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
});
