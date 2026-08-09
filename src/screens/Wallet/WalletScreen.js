// ============================================================
//  WalletScreen — ٢٩ · المحفظة والعمليات  (القسم I)
// ============================================================

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowRight,
  Coins,
  PlusCircle,
  Gift,
  ArrowUpLeft,
  ArrowDownRight,
} from "phosphor-react-native";
import { colors, shadow, gradients } from "../../theme/theme";

const TX = [
  {
    Icon: ArrowUpLeft,
    bg: colors.dangerBg,
    fg: colors.danger,
    title: "دفع خدمة شحن بطارية",
    time: "اليوم ١٥:٠٢",
    amount: "− ٤٥٠٠",
    pos: false,
  },
  {
    Icon: ArrowDownRight,
    bg: colors.successBg,
    fg: colors.success,
    title: "شحن عبر Cham Cash",
    time: "أمس ١٨:٤٠",
    amount: "+ ١٠٬٠٠٠",
    pos: true,
  },
  {
    Icon: Coins,
    bg: colors.tint,
    fg: colors.primaryLight,
    title: "استبدال نقاط وفاء",
    time: "٢ تموز",
    amount: "+ ٥٠٠",
    pos: true,
  },
];

export default function WalletScreen({ navigation }) {
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
          <Pressable style={s.back} onPress={() => navigation?.goBack?.()}>
            <ArrowRight size={20} color={colors.textHeading} />
          </Pressable>
          <Text style={s.headTitle}>محفظتي</Text>
        </View>

        {/* بطاقة الرصيد */}
        <LinearGradient
          colors={["#6a1b9a", "#8f5cb1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.balance}
        >
          <View style={s.balanceCircle} />
          <Text style={s.balanceLabel}>الرصيد الحالي</Text>
          <Text style={s.balanceVal}>
            ١٢٬٥٠٠ <Text style={s.balanceUnit}>ل.س</Text>
          </Text>
          <View style={s.pointsChip}>
            <Coins size={14} weight="fill" color="#fff" />
            <Text style={s.pointsText}>٣٤٠ نقطة وفاء</Text>
          </View>
        </LinearGradient>

        {/* الأزرار */}
        <View
          style={{ flexDirection: "row-reverse", gap: 10, marginBottom: 22 }}
        >
          <Pressable
            onPress={() => navigation?.navigate?.("TopUp")}
            style={({ pressed }) => [
              { flex: 1 },
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.actionFill}
            >
              <PlusCircle size={17} weight="fill" color="#fff" />
              <Text style={s.actionFillText}>شحن الرصيد</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={() => navigation?.navigate?.("RedeemPoints")}
            style={({ pressed }) => [
              s.actionOutline,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <Gift size={17} weight="fill" color={colors.primary} />
            <Text style={s.actionOutlineText}>استبدال نقاط</Text>
          </Pressable>
        </View>

        {/* آخر العمليات */}
        <Text style={s.sectionTitle}>آخر العمليات</Text>
        <View style={{ gap: 10 }}>
          {TX.map((t, i) => (
            <View key={i} style={s.tx}>
              <View style={[s.txIcon, { backgroundColor: t.bg }]}>
                <t.Icon size={19} weight="fill" color={t.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.txTitle}>{t.title}</Text>
                <Text style={s.txTime}>{t.time}</Text>
              </View>
              <Text
                style={[
                  s.txAmount,
                  { color: t.pos ? colors.success : colors.danger },
                ]}
              >
                {t.amount}
              </Text>
            </View>
          ))}
        </View>
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
  headTitle: { fontSize: 19, fontWeight: "700", color: colors.textDark },

  balance: {
    position: "relative",
    borderRadius: 24,
    overflow: "hidden",
    padding: 22,
    marginBottom: 14,
    ...shadow.button,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 40,
  },
  balanceCircle: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#ffffff1a",
    top: -50,
    left: -20,
  },
  balanceLabel: { fontSize: 12.5, color: "#eeddfa", textAlign: "right" },
  balanceVal: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginTop: 6,
    textAlign: "right",
  },
  balanceUnit: { fontSize: 16, fontWeight: "600" },
  pointsChip: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff26",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  pointsText: { fontSize: 12, fontWeight: "600", color: "#fff" },

  actionFill: {
    height: 50,
    borderRadius: 15,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  actionFillText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  actionOutline: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.borderInput,
    backgroundColor: "#fff",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  actionOutlineText: { color: colors.primary, fontSize: 14, fontWeight: "700" },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textDark,
    marginBottom: 12,
    textAlign: "right",
  },
  tx: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    padding: 13,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "right",
  },
  txTime: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "right",
  },
  txAmount: { fontSize: 13.5, fontWeight: "700", writingDirection: "ltr" },
});
