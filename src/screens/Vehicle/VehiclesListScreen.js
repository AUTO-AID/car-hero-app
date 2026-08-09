// ============================================================
//  VehiclesListScreen — ٢٦ · قائمة المركبات  (القسم H)
// ============================================================

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowRight,
  Star,
  CarProfile,
  Car,
  PlusCircle,
} from "phosphor-react-native";
import { colors, shadow } from "../../theme/theme";

const CARS = [
  {
    name: "هوا سيراتو",
    meta: "٢٠٢٠ · فضّي",
    plate: "دمشق ١٢٣٤٥٦",
    grad: ["#8f5cb1", "#6a1b9a"],
    Icon: CarProfile,
    size: 88,
    def: true,
  },
  {
    name: "هيونداي أكسنت",
    meta: "٢٠١٨ · أبيض",
    plate: "دمشق ٧٨٩٠١٢",
    grad: ["#a06fc4", "#8f5cb1"],
    Icon: Car,
    size: 80,
    def: false,
  },
];

export default function VehiclesListScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 30,
        }}
      >
        <View style={s.head}>
          <Text style={s.title}>مركباتي</Text>
          <View style={{ flex: 1 }} />
          <Text style={s.count}>٢ من ١٠</Text>
        </View>

        {CARS.map((c, i) => (
          <Pressable
            key={i}
            style={s.card}
            onPress={() =>
              navigation?.navigate?.("VehicleDetail", { car: c.name })
            }
          >
            <LinearGradient
              colors={c.grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.cardTop}
            >
              {c.def && (
                <View style={s.defBadge}>
                  <Star size={12} weight="fill" color="#fff" />
                  <Text style={s.defBadgeText}>افتراضية</Text>
                </View>
              )}
              <c.Icon
                size={c.size}
                weight="fill"
                color="#ffffff2e"
                style={{ position: "absolute", left: 12, bottom: -10 }}
              />
            </LinearGradient>
            <View style={s.cardBody}>
              <View>
                <Text style={s.carName}>{c.name}</Text>
                <Text style={s.carMeta}>{c.meta}</Text>
              </View>
              <View style={{ alignItems: "flex-start" }}>
                <Text style={s.plateLabel}>رقم اللوحة</Text>
                <Text style={s.plate}>{c.plate}</Text>
              </View>
            </View>
          </Pressable>
        ))}

        <Pressable
          style={({ pressed }) => [
            s.add,
            pressed && { transform: [{ scale: 0.97 }] },
          ]}
          onPress={() => navigation?.navigate?.("AddVehicle")}
        >
          <PlusCircle size={20} color={colors.primary} />
          <Text style={s.addText}>إضافة مركبة</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f6f3fa" },
  head: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
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
  title: { fontSize: 22, fontWeight: "700", color: colors.textDark },
  count: { fontSize: 12, color: colors.textMuted },

  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 14,
    ...shadow.soft,
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 10 },
  },
  cardTop: { height: 120, padding: 16, overflow: "hidden" },
  defBadge: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ffffff2b",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 11,
  },
  defBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  cardBody: {
    backgroundColor: "#fff",
    padding: 15,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  carName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "right",
  },
  carMeta: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "right",
  },
  plateLabel: { fontSize: 11, color: colors.textMuted, textAlign: "left" },
  plate: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    writingDirection: "ltr",
  },

  add: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primarySoft,
    backgroundColor: "#faf6fd",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  addText: { fontSize: 15, fontWeight: "700", color: colors.primary },
});
