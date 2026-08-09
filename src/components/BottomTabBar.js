// ============================================================
//  BottomTabBar — شريط التنقّل السفلي (بطاقة عائمة)
//  مُوحّد مع نظام التصميم الحديث (theme/theme.js + أيقونات phosphor)
//  التابات الخمسة الحديثة (تطابق isTabStep في App.js):
//    home · services · orders · vehicles · account
//  عقد الـ props: { current, onChange }
//    current: "home" | "services" | "orders" | "vehicles" | "account"
//    onChange: (id) => void   ← يستدعيها App.js لتبديل الـ step
// ============================================================

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { House, SquaresFour, ClipboardText, CarProfile, User } from "phosphor-react-native";
import { colors, shadow } from "../theme/theme";

// الترتيب منطقيّ من اليمين لليسار (RTL) عبر flexDirection: row-reverse بالأسفل
const TABS = [
  { id: "home", label: "الرئيسية", Icon: House },
  { id: "services", label: "الخدمات", Icon: SquaresFour },
  { id: "orders", label: "الطلبات", Icon: ClipboardText },
  { id: "vehicles", label: "المركبات", Icon: CarProfile },
  { id: "account", label: "الحساب", Icon: User },
];

export default function BottomTabBar({ current, onChange }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { marginBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map(({ id, label, Icon }) => {
        const active = current === id;
        const tone = active ? colors.primaryLight : "#a79fb3";
        return (
          <Pressable
            key={id}
            style={({ pressed }) => [styles.tab, pressed && !active && { opacity: 0.6 }]}
            onPress={() => onChange?.(id)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            {/* مؤشّر التبويب النشط أعلى العنصر */}
            <View style={[styles.indicator, active && styles.indicatorOn]} />
            <View style={[styles.iconWrap, active && styles.iconWrapOn]}>
              <Icon size={22} weight={active ? "fill" : "regular"} color={tone} />
            </View>
            <Text
              style={[styles.label, { color: tone, fontWeight: active ? "700" : "600" }]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // بطاقة عائمة ضمن التدفّق العادي — لا تُغطّي محتوى الشاشات
  container: {
    flexDirection: "row-reverse",
    marginHorizontal: 14,
    marginTop: 6,
    height: 66,
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingTop: 4,
    alignItems: "center",
    ...shadow.soft,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 26,
    elevation: 12,
  },
  // كل تبويب يأخذ حصّة متساوية → توزيع متناسق دائماً
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  indicator: {
    width: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: "transparent",
    marginBottom: 2,
  },
  indicatorOn: { backgroundColor: colors.primaryLight },
  iconWrap: { width: 46, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconWrapOn: { backgroundColor: colors.tint },
  label: { fontSize: 10.5 },
});
