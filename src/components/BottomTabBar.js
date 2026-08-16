import React from "react";
import { View, StyleSheet } from "react-native";
import Text from "./AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CarProfile, ClipboardText, House, SquaresFour, User } from "phosphor-react-native";
import { colors, font, layout } from "../theme/theme";
import { PressableScale } from "./ui";

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
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {TABS.map(({ id, label, Icon }) => {
        const active = current === id;
        const tone = active ? colors.primary : colors.textMuted;
        return (
          <PressableScale
            key={id}
            style={styles.tab}
            onPress={() => !active && onChange?.(id)}
            feedback={active ? false : "selection"}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapOn]}>
              <Icon size={22} weight={active ? "fill" : "regular"} color={tone} />
            </View>
            <Text style={[styles.label, { color: tone, fontWeight: active ? "700" : "600" }]} numberOfLines={1}>
              {label}
            </Text>
            <View style={[styles.indicator, active && styles.indicatorOn]} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    minHeight: 64,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 6,
    paddingTop: 6,
    alignItems: "center",
  },
  tab: { flex: 1, minWidth: 0, minHeight: layout.touchTarget, alignItems: "center", justifyContent: "center", gap: 2 },
  indicator: { width: 20, height: 2, borderRadius: 1, backgroundColor: "transparent", marginTop: 2 },
  indicatorOn: { backgroundColor: colors.primaryLight },
  iconWrap: { width: 36, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  iconWrapOn: { backgroundColor: colors.tint },
  label: { fontSize: font.size.xxs, textAlign: "center" },
});
