// ============================================================
//  AddVehicleScreen — ٢٧ · إضافة / تعديل مركبة  (القسم H)
// ============================================================

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowRight,
  Car,
  CaretDown,
  IdentificationCard,
  Check,
} from "phosphor-react-native";
import { colors, radius, shadow, gradients } from "../../theme/theme";

/* حقل عام */
function Field({ label, children }) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <View style={s.field}>{children}</View>
    </View>
  );
}

export default function AddVehicleScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [make, setMake] = useState("هوا");
  const [model, setModel] = useState("سيراتو");
  const [year, setYear] = useState("٢٠٢٠");
  const [color, setColor] = useState("فضّي");
  const [plate, setPlate] = useState("دمشق ١٢٣٤٥٦");
  const [vin, setVin] = useState("");
  const [isDefault, setIsDefault] = useState(true);

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 110,
        }}
      >
        <View style={s.head}>
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}>
            <ArrowRight size={20} color={colors.textHeading} />
          </Pressable>
          <Text style={s.headTitle}>إضافة مركبة</Text>
        </View>

        <View style={{ gap: 16 }}>
          <Field label="الشركة المصنّعة">
            <Car size={19} color={colors.primaryLight} />
            <TextInput
              value={make}
              onChangeText={setMake}
              placeholder="الشركة"
              placeholderTextColor={colors.textMuted2}
              textAlign="right"
              style={s.input}
            />
            <CaretDown size={15} color="#a79fb3" />
          </Field>

          <Field label="الطراز">
            <TextInput
              value={model}
              onChangeText={setModel}
              placeholder="الطراز"
              placeholderTextColor={colors.textMuted2}
              textAlign="right"
              style={s.input}
            />
          </Field>

          <View style={{ flexDirection: "row-reverse", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="سنة الصنع">
                <TextInput
                  value={year}
                  onChangeText={setYear}
                  keyboardType="numeric"
                  placeholder="السنة"
                  placeholderTextColor={colors.textMuted2}
                  textAlign="right"
                  style={s.input}
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="اللون">
                <View style={s.swatch} />
                <TextInput
                  value={color}
                  onChangeText={setColor}
                  placeholder="اللون"
                  placeholderTextColor={colors.textMuted2}
                  textAlign="right"
                  style={s.input}
                />
              </Field>
            </View>
          </View>

          <Field label="رقم اللوحة">
            <IdentificationCard size={19} color={colors.primaryLight} />
            <TextInput
              value={plate}
              onChangeText={setPlate}
              placeholder="رقم اللوحة"
              placeholderTextColor={colors.textMuted2}
              textAlign="right"
              style={s.input}
            />
          </Field>

          <Field label="رقم الهيكل VIN (اختياري)">
            <TextInput
              value={vin}
              onChangeText={setVin}
              placeholder="١٧ خانة"
              placeholderTextColor={colors.textMuted2}
              textAlign="right"
              style={[s.input, { fontSize: 13 }]}
            />
          </Field>

          {/* مركبة افتراضية */}
          <Pressable style={s.checkRow} onPress={() => setIsDefault((v) => !v)}>
            <View style={[s.checkbox, !isDefault && s.checkboxOff]}>
              {isDefault ? (
                <Check size={15} weight="bold" color="#fff" />
              ) : null}
            </View>
            <Text style={s.checkText}>تعيين كمركبة افتراضية</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[s.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={() => navigation?.goBack?.()}
          style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}
        >
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.cta, shadow.button]}
          >
            <Text style={s.ctaText}>حفظ المركبة</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f6f3fa" },
  head: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
  },
  headTitle: { fontSize: 19, fontWeight: "700", color: colors.textDark },

  label: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#4a4358",
    marginBottom: 8,
    textAlign: "right",
  },
  field: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    height: 54,
    paddingHorizontal: 15,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ece6f3",
    borderRadius: 15,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 14.5,
    color: "#2a2333",
    padding: 0,
    textAlign: "right",
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#c0c4cc",
    borderWidth: 1,
    borderColor: colors.dotInactive,
  },

  checkRow: { flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOff: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.borderInput,
  },
  checkText: { fontSize: 13.5, color: "#4a4358" },

  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: "#f6f3fa",
  },
  cta: {
    height: 56,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
