// ============================================================
//  VehicleDetailScreen — ٢٨ · تفاصيل المركبة والصيانة  (القسم H)
// ============================================================

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowRight,
  CarProfile,
  Drop,
  Tire,
  BellRinging,
} from "phosphor-react-native";
import { colors, shadow, gradients } from "../../theme/theme";

const HISTORY = [
  {
    Icon: Drop,
    title: "تغيير زيت وفلتر",
    meta: "١٥ كانون٢ ٢٠٢٦ · ٦٢٬٠٠٠ كم",
    price: "٨٠٠٠٠ ل.س",
  },
  {
    Icon: Tire,
    title: "تبديل إطارات",
    meta: "٢ آذار ٢٠٢٦ · ٥٨٬٠٠٠ كم",
    price: "٤٥٠٠٠٠ ل.س",
  },
];

export default function VehicleDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const car = route?.params?.car || "هوا سيراتو";

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
      >
        {/* الترويسة المتدرّجة */}
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.header, { paddingTop: insets.top + 14 }]}
        >
          <View style={s.headerRow}>
            <Pressable style={s.back} onPress={() => navigation?.goBack?.()}>
              <ArrowRight size={20} color="#fff" />
            </Pressable>
            <View>
              <Text style={s.headerTitle}>{car}</Text>
              <Text style={s.headerSub}>٢٠٢٠ · فضّي · دمشق ١٢٣٤٥٦</Text>
            </View>
          </View>
          <CarProfile
            size={120}
            weight="fill"
            color="#ffffff26"
            style={{ position: "absolute", left: 6, bottom: -14 }}
          />
        </LinearGradient>

        <View style={{ padding: 20 }}>
          {/* سجلّ الصيانة */}
          <View style={s.secHead}>
            <Text style={s.secTitle}>سجلّ الصيانة</Text>
            <Text style={s.secAdd}>إضافة +</Text>
          </View>
          {HISTORY.map((h, i) => (
            <View key={i} style={s.item}>
              <View style={s.itemIcon}>
                <h.Icon size={21} weight="fill" color={colors.primaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle}>{h.title}</Text>
                <Text style={s.itemMeta}>{h.meta}</Text>
              </View>
              <Text style={s.itemPrice}>{h.price}</Text>
            </View>
          ))}

          {/* التذكيرات */}
          <View style={[s.secHead, { marginTop: 20 }]}>
            <Text style={s.secTitle}>التذكيرات</Text>
            <Text style={s.secAdd}>إضافة +</Text>
          </View>
          <View style={s.reminder}>
            <View style={s.reminderIcon}>
              <BellRinging size={21} weight="fill" color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.itemTitle}>تغيير الزيت القادم</Text>
              <Text style={s.reminderMeta}>خلال ٢٠ يوماً · عند ٦٧٬٠٠٠ كم</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f6f3fa" },
  header: { height: 180, paddingHorizontal: 20, overflow: "hidden" },
  headerRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  back: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#ffffff2b",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "right",
  },
  headerSub: {
    fontSize: 12.5,
    color: "#eeddfa",
    marginTop: 2,
    textAlign: "right",
  },

  secHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  secTitle: { fontSize: 15, fontWeight: "700", color: colors.textDark },
  secAdd: { fontSize: 12.5, fontWeight: "700", color: colors.primaryLight },

  item: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    ...shadow.soft,
    shadowOpacity: 0.1,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "right",
  },
  itemMeta: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "right",
  },
  itemPrice: { fontSize: 13, fontWeight: "700", color: colors.textDark },

  reminder: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff4e6",
    borderWidth: 1,
    borderColor: "#f7e6cd",
    borderRadius: 16,
    padding: 14,
  },
  reminderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  reminderMeta: {
    fontSize: 11.5,
    color: "#b07b28",
    marginTop: 2,
    textAlign: "right",
  },
});
