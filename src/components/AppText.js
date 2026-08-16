import React from "react";
import { StyleSheet, Text as NativeText } from "react-native";
import { font } from "../theme/theme";

function fontFamilyFor(style) {
  const flat = StyleSheet.flatten(style) || {};
  if (flat.fontFamily) return flat.fontFamily;

  const weight = Number.parseInt(String(flat.fontWeight || "400"), 10);
  if (weight >= 700) return font.familyBold;
  if (weight >= 600) return font.familySemiBold;
  if (weight >= 500) return font.familyMedium;
  return font.family;
}

export default function AppText({ style, ...props }) {
  return (
    <NativeText
      {...props}
      style={[style, { fontFamily: fontFamilyFor(style), fontWeight: "400", letterSpacing: 0 }]}
    />
  );
}
