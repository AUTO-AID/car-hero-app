// ============================================================
//  HomeScreen — ١٣ · الشاشة الرئيسية  (القسم D)
//  مُوحّدة مع نظام التصميم الجديد (theme/theme.js)
//  props: { lang, theme, currentUser, onSelectService,
//           onOpenMapExplore, onOpenOffers, onOpenOrders }
//  ملاحظة: شريط التنقّل السفلي يُعرض من App.js (BottomTabBar)
// ============================================================

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  MapPin,
  CaretDown,
  Lightning,
  Truck,
  CarBattery,
  Tire,
  GasPump,
  Key,
  Gear,
  Drop,
  Funnel,
  Wrench,
  Cpu,
  Snowflake,
  SprayBottle,
} from "phosphor-react-native";
import { colors, radius, shadow } from "../../theme/theme";

// الخدمات — كل خدمة مرتبطة بـ id يفهمه ServiceDetailsScreen
const SERVICES = [
  { id: "battery", Icon: CarBattery, label: "شحن بطارية" },
  { id: "tire", Icon: Tire, label: "تبديل إطار" },
  { id: "fuel", Icon: GasPump, label: "توصيل وقود" },
  { id: "mechanic", Icon: Key, label: "فتح السيارة" },
  { id: "emergency", Icon: Gear, label: "ميكانيكي طوارئ" },
  { id: "mechanic", Icon: Lightning, label: "كهرباء سيارات" },
  { id: "mechanic", Icon: Drop, label: "غسيل سيارة" },
  { id: "mechanic", Icon: Funnel, label: "تغيير زيت" },
  { id: "mechanic", Icon: Wrench, label: "صيانة دورية" },
  { id: "mechanic", Icon: Cpu, label: "فحص كمبيوتر" },
  { id: "mechanic", Icon: Snowflake, label: "تكييف السيارة" },
  { id: "mechanic", Icon: SprayBottle, label: "دهان وسمكرة" },
];

export default function HomeScreen({
  lang = "ar",
  theme = "light",
  currentUser,
  onSelectService,
  onOpenMapExplore,
  onOpenOffers,
  onOpenOrders,
  onOpenCatalog,
  onOpenNotifications,
}) {
  const insets = useSafeAreaInsets();
  const fullName = currentUser?.fullName || "مستخدم";
  const firstName = fullName.trim().split(/\s+/)[0];
  const initial = firstName.charAt(0) || "م";

  const pick = (svc) =>
    onSelectService?.({
      id: svc.id,
      title: svc.label,
      description: svc.label,
      icon: "🛠️",
    });

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingTop: insets.top + 16,
          paddingBottom: 28,
        }}
      >
        {/* الشريط العلوي */}
        <View style={s.top}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.hello}>مرحباً، {firstName} 👋</Text>
            <Text style={s.helloSub}>كيف يمكننا مساعدتك اليوم؟</Text>
          </View>
          <Pressable
            style={({ pressed }) => [s.bell, pressed && { transform: [{ scale: 0.92 }] }]}
            onPress={() => onOpenNotifications?.()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="الإشعارات"
          >
            <Bell size={21} color="#4a4358" />
            <View style={s.badge} />
          </Pressable>
        </View>

        {/* شريحة الموقع */}
        <Pressable style={s.locChip} onPress={() => onOpenMapExplore?.()}>
          <MapPin size={16} weight="fill" color={colors.primaryLight} />
          <Text style={s.locText}>دمشق، المزة</Text>
          <CaretDown size={13} color={colors.primaryLight} />
        </Pressable>

        {/* البطاقة الرئيسية */}
        <LinearGradient
          colors={["#6a1b9a", "#8f5cb1", "#a06fc4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View
            style={[
              s.heroCircle,
              { width: 160, height: 160, top: -60, left: -30 },
            ]}
          />
          <View
            style={[
              s.heroCircle,
              {
                width: 120,
                height: 120,
                bottom: -50,
                left: 60,
                backgroundColor: "#ffffff12",
              },
            ]}
          />
          <Truck
            size={104}
            weight="fill"
            color="#ffffff2e"
            style={{ position: "absolute", left: -6, bottom: -8 }}
          />
          <View
            style={{
              maxWidth: 210,
              alignSelf: "flex-end",
              alignItems: "flex-end",
            }}
          >
            <View style={s.heroPill}>
              <View style={s.heroDot} />
              <Text style={s.heroPillText}>خدمة الطوارئ متاحة الآن</Text>
            </View>
            <Text style={s.heroTitle}>تعطّلت سيارتك؟</Text>
            <Text style={s.heroSub}>
              اطلب المساعدة الآن وسيصل أقرب فني بأسرع وقت.
            </Text>
            <Pressable
              style={s.heroBtn}
              onPress={() => pick({ id: "emergency", label: "ميكانيكي طوارئ" })}
            >
              <Lightning size={17} weight="fill" color={colors.primary} />
              <Text style={s.heroBtnText}>طلب مساعدة الآن</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* الطلب النشط */}
        <View style={s.active}>
          <View style={s.activeIcon}>
            <CarBattery size={24} weight="fill" color={colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.activeStatusRow}>
              <View
                style={[s.activeDot, { backgroundColor: colors.warning }]}
              />
              <Text style={s.activeStatus}>طلب قيد التنفيذ</Text>
            </View>
            <Text style={s.activeTitle}>فني بطاريات في الطريق</Text>
            <Text style={s.activeEta}>يصل خلال 12 دقيقة</Text>
          </View>
          <Pressable style={s.activeBtn} onPress={() => onOpenOrders?.()}>
            <Text style={s.activeBtnText}>تتبّع الطلب</Text>
          </Pressable>
        </View>

        {/* الخدمات */}
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>الخدمات</Text>
          <Text style={s.sectionMore} onPress={() => (onOpenCatalog || onOpenOffers)?.()}>
            عرض الكل
          </Text>
        </View>
        <View style={s.grid}>
          {SERVICES.map((svc, i) => (
            <Pressable key={i} style={s.cell} onPress={() => pick(svc)}>
              <View style={s.cellTile}>
                <svc.Icon size={26} weight="fill" color={colors.primaryLight} />
              </View>
              <Text style={s.cellLabel}>{svc.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f6f3fa" },

  top: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  hello: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "right",
  },
  helloSub: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 1,
    textAlign: "right",
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
  },
  badge: {
    position: "absolute",
    top: 9,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: "#fff",
  },

  locChip: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: "#e8dcf5",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginTop: 16,
  },
  locText: { fontSize: 13, fontWeight: "600", color: colors.primary },

  hero: {
    position: "relative",
    marginTop: 16,
    borderRadius: 26,
    overflow: "hidden",
    padding: 22,
    ...shadow.button,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 40,
  },
  heroCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#ffffff1a",
  },
  heroPill: {
    flexDirection: "row-reverse",
    alignSelf: "flex-end",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff26",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    marginBottom: 12,
  },
  heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#7ee0a9" },
  heroPillText: { fontSize: 11.5, fontWeight: "600", color: "#fff" },
  heroTitle: {
    fontSize: 23,
    fontWeight: "700",
    color: "#fff",
    textAlign: "right",
  },
  heroSub: {
    marginTop: 9,
    fontSize: 13.5,
    color: "#f0e6f8",
    lineHeight: 22,
    textAlign: "right",
  },
  heroBtn: {
    alignSelf: "flex-end",
    marginTop: 16,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 15,
    backgroundColor: "#fff",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  heroBtnText: { color: colors.primary, fontSize: 14.5, fontWeight: "700" },

  active: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee3f7",
    borderRadius: 20,
    padding: 15,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    ...shadow.soft,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
  },
  activeIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  activeStatusRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  activeDot: { width: 7, height: 7, borderRadius: 4 },
  activeStatus: { fontSize: 11.5, fontWeight: "700", color: colors.warning },
  activeTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.textDark,
    marginTop: 3,
    textAlign: "right",
  },
  activeEta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "right",
  },
  activeBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBtnText: { color: colors.primary, fontSize: 13, fontWeight: "700" },

  sectionHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.textDark },
  sectionMore: { fontSize: 13, fontWeight: "600", color: colors.primaryLight },

  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 18,
  },
  cell: { width: "22%", alignItems: "center", gap: 7 },
  cellTile: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 17,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4a4358",
    textAlign: "center",
  },
});
