// ============================================================
//  InteractiveMapScreen — ١٢ · تحديد الموقع على الخريطة (القسم D)
//  خريطة Leaflet حقيقية + تصميم موحّد جديد.
//  تعمل على الموبايل (react-native-webview) وعلى الويب (<iframe>).
//  الدبوس المركزي ثابت في المنتصف، ويُلتقط مركز الخريطة عند التحريك.
//  props: { lang, theme, userLocation, onBack, onConfirm, fromStep }
// ============================================================

import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, MagnifyingGlass, Crosshair, MapPin, Info } from "phosphor-react-native";
import { colors, radius, shadow, gradients } from "../../theme/theme";

// react-native-webview غير مدعوم على الويب — نُحمّله فقط على الأجهزة
let WebView = null;
if (Platform.OS !== "web") {
  WebView = require("react-native-webview").WebView;
}

export default function InteractiveMapScreen({
  lang = "ar",
  theme = "light",
  userLocation,
  onBack,
  onConfirm,
  fromStep,
}) {
  const webRef = useRef(null);
  const iframeRef = useRef(null);
  const insets = useSafeAreaInsets();

  const startLat = userLocation?.latitude ?? 33.5138; // دمشق افتراضياً
  const startLng = userLocation?.longitude ?? 36.2765;

  const [picked, setPicked] = useState({ latitude: startLat, longitude: startLng });

  const html = useMemo(
    () => `
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height:100%; margin:0; padding:0; background:#eee6f6; }
    .leaflet-control-attribution { font-size:9px; opacity:.6; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var start = { lat: ${startLat}, lng: ${startLng} };
    var map = L.map('map', { zoomControl: false }).setView([start.lat, start.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    function post(obj){
      var msg = JSON.stringify(obj);
      if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(msg); }
      else if (window.parent) { window.parent.postMessage(msg, '*'); }
    }
    function sendCenter(){ var c = map.getCenter(); post({ lat: c.lat, lng: c.lng }); }

    map.on('moveend', sendCenter);
    map.whenReady(function(){ setTimeout(function(){ map.invalidateSize(); sendCenter(); }, 60); });

    // إعادة التمركز — يُستدعى من التطبيق (native عبر injectJavaScript، web عبر postMessage)
    window.__recenter = function(lat, lng){ map.setView([lat, lng], 16, { animate: true }); };
    window.addEventListener('message', function(e){
      try {
        var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d && d.type === 'recenter') { window.__recenter(d.lat, d.lng); }
      } catch (_) {}
    });
  </script>
</body>
</html>
`,
    [startLat, startLng]
  );

  // استقبال إحداثيات المركز على الويب (رسائل الـ iframe)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onMsg = (e) => {
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (d && typeof d.lat === "number" && typeof d.lng === "number") {
          setPicked({ latitude: d.lat, longitude: d.lng });
        }
      } catch (_) {}
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const recenter = () => {
    if (Platform.OS === "web") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: "recenter", lat: startLat, lng: startLng }),
        "*"
      );
    } else {
      webRef.current?.injectJavaScript(
        `window.__recenter && window.__recenter(${startLat}, ${startLng}); true;`
      );
    }
  };

  const handleConfirm = () => {
    if (typeof onConfirm !== "function") {
      Alert.alert("تنبيه", "onConfirm callback غير موجودة");
      return;
    }
    onConfirm(picked, fromStep);
  };

  const coords = `${picked.latitude.toFixed(5)}, ${picked.longitude.toFixed(5)}`;

  return (
    <View style={s.root}>
      {/* الخريطة الحقيقية */}
      <View style={s.mapWrap}>
        {Platform.OS === "web" ? (
          <iframe
            ref={iframeRef}
            title="map"
            srcDoc={html}
            style={{ border: 0, width: "100%", height: "100%" }}
          />
        ) : (
          <WebView
            ref={webRef}
            originWhitelist={["*"]}
            source={{ html }}
            style={{ backgroundColor: "#eee6f6" }}
            onMessage={(evt) => {
              try {
                const msg = JSON.parse(evt.nativeEvent.data);
                if (typeof msg.lat === "number" && typeof msg.lng === "number") {
                  setPicked({ latitude: msg.lat, longitude: msg.lng });
                }
              } catch (e) {}
            }}
          />
        )}

        {/* الدبوس المركزي الثابت */}
        <View pointerEvents="none" style={s.centerPinWrap}>
          <View style={s.centerPin}>
            <MapPin size={22} weight="fill" color="#fff" style={{ transform: [{ rotate: "-45deg" }] }} />
          </View>
          <View style={s.centerDot} />
        </View>
      </View>

      {/* الشريط العلوي */}
      <View style={[s.topBar, { top: Math.max(insets.top, 12) }]}>
        <Pressable style={s.backBtn} onPress={() => onBack?.(fromStep)}>
          <ArrowRight size={20} color={colors.textHeading} />
        </Pressable>
        <View style={s.search}>
          <MagnifyingGlass size={19} color={colors.primaryLight} />
          <TextInput
            placeholder="ابحث عن موقعك"
            placeholderTextColor={colors.textMuted2}
            textAlign="right"
            style={s.searchInput}
          />
        </View>
      </View>

      {/* زر الموقع الحالي */}
      <Pressable style={[s.fab, { bottom: 260 + insets.bottom }]} onPress={recenter}>
        <Crosshair size={22} weight="fill" color={colors.primaryLight} />
      </Pressable>

      {/* البطاقة السفلية */}
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}>
        <View style={s.grabber} />
        <View style={{ flexDirection: "row-reverse", alignItems: "flex-start", gap: 12 }}>
          <View style={s.sheetIcon}><MapPin size={22} weight="fill" color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.sheetLabel}>الموقع المحدّد</Text>
            <Text style={s.sheetAddr}>{coords}</Text>
          </View>
        </View>
        <View style={s.hintRow}>
          <Info size={15} color={colors.primaryLight} />
          <Text style={s.hintText}>حرّك الخريطة حتى يقف الدبوس على موقعك بدقّة</Text>
        </View>
        <Pressable onPress={handleConfirm} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.confirm, shadow.button]}>
            <Text style={s.confirmText}>تأكيد الموقع</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eee6f6", overflow: "hidden" },
  mapWrap: { flex: 1, position: "relative" },

  centerPinWrap: { position: "absolute", left: "50%", top: "50%", marginLeft: -23, marginTop: -66, alignItems: "center", zIndex: 2 },
  centerPin: { width: 46, height: 46, borderRadius: 23, borderBottomLeftRadius: 4, transform: [{ rotate: "45deg" }], backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", ...shadow.button, shadowOffset: { width: 0, height: 12 } },
  centerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: -3 },

  topBar: { position: "absolute", left: 22, right: 22, flexDirection: "row-reverse", alignItems: "center", gap: 10, zIndex: 4 },
  backBtn: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...shadow.soft, shadowOffset: { width: 0, height: 6 } },
  search: { flex: 1, height: 48, borderRadius: 15, backgroundColor: "#fff", flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingHorizontal: 16, ...shadow.soft, shadowOffset: { width: 0, height: 6 } },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: "#2a2333", padding: 0, textAlign: "right" },

  fab: { position: "absolute", left: 22, width: 50, height: 50, borderRadius: 15, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", zIndex: 4, ...shadow.soft, shadowOffset: { width: 0, height: 8 } },

  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, zIndex: 5, shadowColor: "#140a28", shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 20 },
  grabber: { width: 44, height: 5, borderRadius: 999, backgroundColor: colors.borderInput, alignSelf: "center", marginBottom: 16 },
  sheetIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  sheetLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "600", textAlign: "right" },
  sheetAddr: { fontSize: 16, fontWeight: "700", color: colors.textDark, marginTop: 3, textAlign: "right", writingDirection: "ltr" },
  hintRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginVertical: 15 },
  hintText: { color: colors.textMuted, fontSize: 12 },
  confirm: { height: 56, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  confirmText: { color: "#fff", fontSize: 16.5, fontWeight: "600" },
});
