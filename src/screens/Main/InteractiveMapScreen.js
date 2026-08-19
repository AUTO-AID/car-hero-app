// ============================================================
//  InteractiveMapScreen — ١٢ · تحديد الموقع على الخريطة (القسم D)
//  خريطة Leaflet حقيقية + تصميم موحّد جديد.
//  تعمل على الموبايل (react-native-webview) وعلى الويب (<iframe>).
//  الدبوس المركزي ثابت في المنتصف، ويُلتقط مركز الخريطة عند التحريك.
//  props: { lang, theme, userLocation, onBack, onConfirm, fromStep }
// ============================================================

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { View, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator } from "react-native";
import Text from "../../components/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, MagnifyingGlass, Crosshair, MapPin, Info, X, WarningCircle } from "phosphor-react-native";
import { colors, font, radius, shadow, gradients, spacing } from "../../theme/theme";
import { reverseGeocode, searchPlaces } from "../../services/geocoding";
import { getCurrentLocation } from "../../services/locationService";
import { tileTemplate } from "../../services/geocoding";

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
  // تغييره يُعيد تركيب الخريطة (إعادة المحاولة بعد فشل التحميل)
  const [reloadKey, setReloadKey] = useState(0);

  const startLat = userLocation?.latitude ?? 33.5138; // دمشق افتراضياً
  const startLng = userLocation?.longitude ?? 36.2765;

  const [picked, setPicked] = useState({ latitude: startLat, longitude: startLng });

  // حالة الخريطة: لا نترك المستخدم أمام مساحة فارغة أثناء تحميل Leaflet من الشبكة
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  // البحث عن الأماكن
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);
  const searchAbortRef = useRef(null);

  // تحديد الموقع الحالي عبر الجهاز
  const [locating, setLocating] = useState(false);
  const locatingRef = useRef(false);
  // خطأ الموقع منفصل عن خطأ البحث: عرض الأخير مشروط بحالة البحث،
  // فلو شاركناه لضاعت رسالة فشل تحديد الموقع بصمت.
  const [locationError, setLocationError] = useState("");

  // ارتفاع البطاقة السفلية الفعلي لوضع الزر العائم فوقها دون تداخل
  const [sheetHeight, setSheetHeight] = useState(240);

  // إن لم تصل إشارة جاهزية الخريطة خلال مهلة، نعرض حالة فشل مع إعادة محاولة
  useEffect(() => {
    if (mapReady) return undefined;
    const t = setTimeout(() => setMapFailed((prev) => (mapReady ? prev : true)), 12000);
    return () => clearTimeout(t);
  }, [mapReady, reloadKey]);

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
    // القالب يأتي من الإعداد: خادم OSM العام يحجب التطبيقات الموزَّعة.
    // بلا مزوّد تبقى الخريطة رمادية والدبّوس يعمل — أفضل من بلاطات «محجوب».
    var tileTpl = ${JSON.stringify(tileTemplate())};
    if (tileTpl) { L.tileLayer(tileTpl, { maxZoom: 19 }).addTo(map); }

    function post(obj){
      var msg = JSON.stringify(obj);
      if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(msg); }
      else if (window.parent) { window.parent.postMessage(msg, '*'); }
    }
    function sendCenter(){ var c = map.getCenter(); post({ lat: c.lat, lng: c.lng }); }

    map.on('moveend', sendCenter);
    // إشعار التطبيق بأن الخريطة جاهزة فعلاً (وليس مجرد تحميل الصفحة)،
    // فيُخفي غطاء التحميل بدل تركه معلّقاً.
    map.whenReady(function(){ setTimeout(function(){ map.invalidateSize(); sendCenter(); post({ type: 'ready' }); }, 60); });

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

  // معالجة رسالة قادمة من الخريطة (مشتركة بين الويب والموبايل)
  const handleMapMessage = useCallback((raw) => {
    try {
      const d = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!d) return;
      if (d.type === "ready") { setMapReady(true); setMapFailed(false); return; }
      if (typeof d.lat === "number" && typeof d.lng === "number") {
        setMapReady(true);
        setPicked({ latitude: d.lat, longitude: d.lng });
      }
    } catch (_) {}
  }, []);

  // استقبال رسائل الـ iframe على الويب — نقبل فقط رسائل إطار الخريطة نفسه
  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    const onMsg = (e) => {
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      handleMapMessage(e.data);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [handleMapMessage]);

  // تحريك الخريطة إلى إحداثيات محدّدة
  const moveMapTo = useCallback((lat, lng) => {
    if (Platform.OS === "web") {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: "recenter", lat, lng }),
        "*"
      );
    } else {
      webRef.current?.injectJavaScript(
        `window.__recenter && window.__recenter(${lat}, ${lng}); true;`
      );
    }
  }, []);

  // زر «موقعي الحالي»: كان يعيد التمركز على نقطة البداية (أو دمشق الافتراضية)
  // بدل موقع الجهاز الفعلي — رغم أن تسميته تَعِد بذلك.
  const goToMyLocation = useCallback(async () => {
    if (locatingRef.current) return;
    locatingRef.current = true;
    setLocating(true);
    setLocationError("");
    try {
      const loc = await getCurrentLocation();
      moveMapTo(loc.latitude, loc.longitude);
      setPicked({ latitude: loc.latitude, longitude: loc.longitude });
    } catch (_) {
      // تعذّر تحديد الموقع → نرجع لنقطة البداية المعروفة بدل ترك الزر بلا أثر
      setLocationError("تعذّر تحديد موقعك الحالي. حرّك الخريطة يدوياً لتحديد الموقع.");
      moveMapTo(startLat, startLng);
    } finally {
      locatingRef.current = false;
      setLocating(false);
    }
  }, [moveMapTo, startLat, startLng]);

  // البحث عن مكان بالاسم — الحقل كان بلا أي معالج (زخرفي بالكامل)
  const runSearch = useCallback(async () => {
    const q = query.trim();
    setSearched(true);
    if (q.length < 2) {
      setResults([]);
      setSearchError("أدخل حرفين على الأقل للبحث");
      return;
    }
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearching(true);
    setSearchError("");
    try {
      const found = await searchPlaces(q, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setResults(found);
      if (!found.length) setSearchError("لا توجد نتائج مطابقة");
    } catch (e) {
      if (e?.name === "AbortError") return;
      setResults([]);
      setSearchError(e?.message || "تعذّر البحث عن الموقع");
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, [query]);

  const pickResult = useCallback((r) => {
    setResults([]);
    setSearched(false);
    setQuery(r.name.split(",")[0] || r.name);
    setPicked({ latitude: r.latitude, longitude: r.longitude });
    moveMapTo(r.latitude, r.longitude);
  }, [moveMapTo]);

  const clearSearch = useCallback(() => {
    searchAbortRef.current?.abort();
    setQuery("");
    setResults([]);
    setSearchError("");
    setSearched(false);
  }, []);

  // إلغاء أي بحث معلّق عند مغادرة الشاشة
  useEffect(() => () => searchAbortRef.current?.abort(), []);

  // عنوان مقروء يتحدّث مع تحريك الدبّوس. debounce ٦٠٠ms: التحديث عند كل
  // إطار تحريك يُغرق الخدمة ويومض النص بلا فائدة.
  const [address, setAddress] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const revAbortRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(async () => {
      revAbortRef.current?.abort();
      const controller = new AbortController();
      revAbortRef.current = controller;
      setAddressLoading(true);
      const name = await reverseGeocode(picked.latitude, picked.longitude, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setAddress(name);
        setAddressLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [picked.latitude, picked.longitude]);
  useEffect(() => () => revAbortRef.current?.abort(), []);

  // ملاحظة الوصول: في مناطق كثيرة «خلف المحطة، بناء أزرق» أدقّ من أي إحداثي،
  // وهي أرخص تحسين في الشاشة كلها.
  const [note, setNote] = useState("");

  const handleConfirm = () => {
    onConfirm?.({ ...picked, address, note: note.trim() }, fromStep);
  };

  const coords = `${picked.latitude.toFixed(5)}, ${picked.longitude.toFixed(5)}`;

  return (
    <View style={s.root}>
      {/* الخريطة الحقيقية */}
      <View style={s.mapWrap}>
        {Platform.OS === "web" ? (
          <iframe
            key={reloadKey}
            ref={iframeRef}
            title="خريطة تحديد الموقع"
            srcDoc={html}
            style={{ border: 0, width: "100%", height: "100%" }}
          />
        ) : (
          <WebView
            key={reloadKey}
            ref={webRef}
            originWhitelist={["*"]}
            source={{ html }}
            style={{ backgroundColor: "#eee6f6" }}
            onMessage={(evt) => handleMapMessage(evt.nativeEvent.data)}
            onError={() => setMapFailed(true)}
          />
        )}

        {/* غطاء التحميل — الخريطة تُحمَّل من الشبكة، فلا نترك مساحة فارغة صامتة */}
        {!mapReady && !mapFailed ? (
          <View style={s.mapOverlay} pointerEvents="none">
            <ActivityIndicator color={colors.primary} />
            <Text style={s.overlayText}>جارٍ تحميل الخريطة…</Text>
          </View>
        ) : null}

        {/* فشل التحميل — بديل واضح مع إعادة محاولة بدل خريطة فارغة للأبد */}
        {mapFailed && !mapReady ? (
          <View style={s.mapOverlay}>
            <WarningCircle size={38} weight="fill" color={colors.danger} />
            <Text style={s.overlayText}>تعذّر تحميل الخريطة. تحقق من اتصالك بالإنترنت.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إعادة تحميل الخريطة"
              style={s.overlayBtn}
              onPress={() => { setMapFailed(false); setMapReady(false); setReloadKey((k) => k + 1); }}
            >
              <Text style={s.overlayBtnText}>إعادة المحاولة</Text>
            </Pressable>
            <Text style={s.overlayHint}>يمكنك المتابعة بالإحداثيات الحالية أو الرجوع للخلف.</Text>
          </View>
        ) : null}

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
        <Pressable accessibilityRole="button" accessibilityLabel="رجوع" style={s.backBtn} onPress={() => onBack?.(fromStep)}>
          <ArrowRight size={20} color={colors.textHeading} />
        </Pressable>
        <View style={s.searchCol}>
          <View style={s.search}>
            {searching ? (
              <ActivityIndicator size="small" color={colors.primaryLight} />
            ) : (
              <MagnifyingGlass size={19} color={colors.primaryLight} />
            )}
            <TextInput
              accessibilityLabel="البحث عن موقع"
              placeholder="ابحث عن مدينة أو حيّ"
              placeholderTextColor={colors.textMuted2}
              textAlign="right"
              style={s.searchInput}
              value={query}
              onChangeText={(t) => { setQuery(t); setSearchError(""); if (!t) { setResults([]); setSearched(false); } }}
              onSubmitEditing={runSearch}
              returnKeyType="search"
            />
            {query ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="مسح البحث"
                onPress={clearSearch}
                hitSlop={10}
                style={s.clearBtn}
              >
                <X size={16} weight="bold" color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* نتائج البحث / حالة عدم وجود نتائج */}
          {results.length > 0 ? (
            <View style={s.results}>
              {results.map((r) => (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityLabel={`اختيار ${r.name}`}
                  onPress={() => pickResult(r)}
                  style={({ pressed }) => [s.resultRow, pressed && s.resultRowPressed]}
                >
                  <MapPin size={16} weight="fill" color={colors.primaryLight} />
                  <Text style={s.resultText} numberOfLines={2}>{r.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {searchError && searched && results.length === 0 ? (
            <View style={s.results}>
              <Text style={s.resultEmpty} accessibilityLiveRegion="polite">{searchError}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* زر الموقع الحالي — يقيس ارتفاع البطاقة السفلية فعلياً بدل قيمة ثابتة
          كانت تجعله يتداخل معها عندما يطول محتواها */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="الانتقال إلى موقعي الحالي"
        accessibilityState={{ busy: locating, disabled: locating }}
        style={[s.fab, { bottom: sheetHeight + 16 }]}
        onPress={goToMyLocation}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator size="small" color={colors.primaryLight} />
        ) : (
          <Crosshair size={22} weight="fill" color={colors.primaryLight} />
        )}
      </Pressable>

      {/* البطاقة السفلية */}
      <View
        style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}
        onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
      >
        <View style={s.grabber} />
        <View style={{ flexDirection: "row-reverse", alignItems: "flex-start", gap: 12 }}>
          <View style={s.sheetIcon}><MapPin size={22} weight="fill" color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.sheetLabel}>الموقع المحدّد</Text>
            {/* الاسم أولاً والإحداثيات تحته صغيرة: المستخدم يتحقّق من المكان
                بالاسم لا بالأرقام، لكن الأرقام تبقى للمرجعية. */}
            <Text style={s.sheetAddr} numberOfLines={2}>
              {address || (addressLoading ? "جارٍ تحديد العنوان…" : "موقع على الخريطة")}
            </Text>
            <Text style={s.sheetCoords}>{coords}</Text>
          </View>
        </View>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="ملاحظة للوصول: خلف المحطة، بناء أزرق، الطابق الثاني…"
          placeholderTextColor={colors.textMuted2}
          textAlign="right"
          maxLength={120}
          accessibilityLabel="ملاحظة تساعد الفني على الوصول"
          style={s.noteInput}
        />
        {/* خطأ تحديد الموقع يظهر مكان التلميح — أهم ما يحتاجه المستخدم الآن */}
        {locationError ? (
          <View style={s.hintRow} accessibilityLiveRegion="polite">
            <WarningCircle size={15} weight="fill" color={colors.danger} />
            <Text style={[s.hintText, { color: colors.danger, flex: 1 }]}>{locationError}</Text>
          </View>
        ) : (
          <View style={s.hintRow}>
            <Info size={15} color={colors.primaryLight} />
            <Text style={s.hintText}>حرّك الخريطة حتى يقف الدبوس على موقعك بدقّة</Text>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تأكيد الموقع"
          accessibilityHint="يحفظ الموقع المحدّد على الخريطة ويعود للخطوة السابقة"
          onPress={handleConfirm}
          style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}
        >
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

  mapOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: spacing.md, paddingHorizontal: spacing.xxl, backgroundColor: "#eee6f6ee", zIndex: 3 },
  overlayText: { fontSize: font.size.sm, color: colors.textBody, textAlign: "center", lineHeight: 22 },
  overlayHint: { fontSize: font.size.xs, color: colors.textMuted, textAlign: "center" },
  overlayBtn: { minHeight: 44, justifyContent: "center", backgroundColor: colors.tint, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 22 },
  overlayBtnText: { fontSize: font.size.sm, fontWeight: "700", color: colors.primary },

  topBar: { position: "absolute", left: 22, right: 22, flexDirection: "row-reverse", alignItems: "flex-start", gap: 10, zIndex: 4 },
  searchCol: { flex: 1, minWidth: 0 },
  clearBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  results: { marginTop: 8, backgroundColor: "#fff", borderRadius: 15, overflow: "hidden", ...shadow.soft, shadowOffset: { width: 0, height: 6 } },
  resultRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, minHeight: 48, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  resultRowPressed: { backgroundColor: colors.tint },
  resultText: { flex: 1, fontSize: font.size.sm, color: colors.textHeading, textAlign: "right", lineHeight: 20 },
  resultEmpty: { fontSize: font.size.sm, color: colors.textMuted, textAlign: "center", paddingVertical: 14, paddingHorizontal: 14 },
  backBtn: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...shadow.soft, shadowOffset: { width: 0, height: 6 } },
  search: { flex: 1, height: 48, borderRadius: 15, backgroundColor: "#fff", flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingHorizontal: 16, ...shadow.soft, shadowOffset: { width: 0, height: 6 } },
  searchInput: { flex: 1, minWidth: 0, fontFamily: font.family, fontSize: 14, color: colors.textHeading, padding: 0, textAlign: "right" },

  fab: { position: "absolute", left: 22, width: 50, height: 50, borderRadius: 15, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", zIndex: 4, ...shadow.soft, shadowOffset: { width: 0, height: 8 } },

  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, zIndex: 5, shadowColor: "#140a28", shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 20 },
  grabber: { width: 44, height: 5, borderRadius: 999, backgroundColor: colors.borderInput, alignSelf: "center", marginBottom: 16 },
  sheetIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  sheetLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "600", textAlign: "right" },
  sheetAddr: { fontSize: 16, fontWeight: "700", color: colors.textDark, marginTop: 3, textAlign: "right" },
  sheetCoords: { fontSize: font.size.xxs, color: colors.textMuted2, marginTop: 2, textAlign: "right", writingDirection: "ltr" },
  noteInput: {
    minHeight: 46,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    fontFamily: font.family,
    fontSize: font.size.sm,
    color: colors.textDark,
    outlineStyle: "none",
  },
  hintRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginVertical: 15 },
  hintText: { color: colors.textMuted, fontSize: 12 },
  confirm: { height: 56, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  confirmText: { color: "#fff", fontSize: 16.5, fontWeight: "600" },
});
