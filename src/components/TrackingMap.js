// ============================================================
//  TrackingMap — خريطة تتبّع الفني وهو قادم إلى موقع العميل.
//
//  Leaflet داخل WebView على الموبايل و<iframe> على الويب — نفس نمط
//  InteractiveMapScreen بالضبط، فلا تختلف الخريطتان شكلاً ولا سلوكاً.
//
//  ما يميّز هذه الشاشة عن خريطة اختيار الموقع أن محتواها **يتحرّك**:
//  الموقع يصل كل بضع ثوانٍ عبر socket، ونقل العلامة مباشرةً إلى الإحداثي
//  الجديد يجعل السيارة تقفز قفزات مفاجئة — يقرأها المستخدم كعطل لا كحركة.
//  لذلك كل تحديث يُحرَّك تدريجياً عبر requestAnimationFrame على مدى الفترة
//  المتوقّعة للتحديث التالي، مع تدوير السيارة نحو اتجاه سيرها.
//
//  props:
//    provider     {latitude, longitude, heading?} | {coordinates:[lng,lat]} | null
//    destination  موقع العميل بنفس الأشكال المقبولة
//    traveled     [[lng,lat], …] مسار سابق من الخادم (اختياري)
//    updatedAt    وقت آخر تحديث — يدفع إعادة الإرسال عند تكرار نفس الإحداثي
//    active       هل حالة الطلب تسمح بالتتبّع أصلاً
//    stale        الإشارة قديمة (يتوقّف النبض ويبهت لون السيارة)
//    onRouteInfo  ({ distanceKm, durationMin, source }) => void
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { Crosshair, WarningCircle } from 'phosphor-react-native';
import Text from './AppText';
import { colors, font, radius, shadow, spacing } from '../theme/theme';
import { tileTemplate } from '../services/geocoding';

let WebView = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

/**
 * خدمة توجيه الطرق. القيمة الافتراضية خادم OSRM التجريبي العام: يصلح
 * للتطوير والاختبار لكنه محدود المعدّل ولا يضمن توفّراً — يُستبدل من
 * app.json تحت extra.routingUrl بخادم خاص عند النشر الحقيقي.
 *
 * {coords} تُستبدل بـ "lng,lat;lng,lat". وضبطه على false يعطّل التوجيه
 * فيرتدّ الخط إلى مستقيم بين النقطتين بدل تركه معطّلاً بصمت.
 */
const ROUTING_URL = (() => {
  const extra =
    Constants?.expoConfig?.extra ??
    Constants?.manifest2?.extra?.expoClient?.extra ??
    Constants?.manifest?.extra ??
    {};
  if (extra.routingUrl === false || extra.routingUrl === null) return null;
  return (
    extra.routingUrl ||
    'https://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson'
  );
})();

const MAP_HTML = [
  '<!doctype html>',
  '<html>',
  '<head>',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">',
  '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />',
  '<style>',
  '  html, body, #map { height:100%; margin:0; padding:0; background:#eee6f6; }',
  '  .leaflet-control-attribution { font-size:9px; opacity:.55; }',
  '  /* علامة الوجهة — نفس شكل الدبّوس المستعمل في شاشة اختيار الموقع */',
  '  .dest { position:relative; width:38px; height:48px; }',
  '  .dest-pin { width:32px; height:32px; border-radius:50% 50% 50% 4px; transform:rotate(45deg);',
  '    background:__PRIMARY__; box-shadow:0 8px 18px rgba(20,10,40,.32); margin:0 auto; }',
  '  .dest-core { position:absolute; left:50%; top:9px; margin-left:-6px; width:12px; height:12px;',
  '    border-radius:50%; background:#fff; }',
  '  .dest-dot { position:absolute; left:50%; bottom:2px; margin-left:-4px; width:8px; height:8px;',
  '    border-radius:50%; background:__PRIMARY__; }',
  '  /* السيارة — حلقة نبض تحتها تدلّ على أن الإشارة حيّة */',
  '  .car { position:relative; width:52px; height:52px; }',
  '  .car-rot { position:absolute; left:50%; top:50%; width:34px; height:34px; margin:-17px 0 0 -17px;',
  '    transition:transform .45s ease-out; filter:drop-shadow(0 4px 8px rgba(20,10,40,.35)); }',
  '  .pulse { position:absolute; left:50%; top:50%; width:52px; height:52px; margin:-26px 0 0 -26px;',
  '    border-radius:50%; background:__PRIMARY__; opacity:.22; animation:pulse 2s ease-out infinite; }',
  '  /* التتبّع المتوقّف يجب أن يبدو متوقّفاً: النبض المستمرّ فوق موقع قديم',
  '     يوحي بحركة غير موجودة. */',
  '  .stale .pulse { animation:none; opacity:.1; }',
  '  .stale .car-rot { filter:grayscale(.7) drop-shadow(0 3px 6px rgba(20,10,40,.25)); }',
  '  @keyframes pulse {',
  '    0%   { transform:scale(.55); opacity:.32; }',
  '    70%  { transform:scale(1.25); opacity:0; }',
  '    100% { transform:scale(1.25); opacity:0; }',
  '  }',
  '</style>',
  '</head>',
  '<body>',
  '<div id="map"></div>',
  '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>',
  '<script>',
  '(function () {',
  '  var CFG = __CFG__;',
  '',
  '  function post(o) {',
  '    var m = JSON.stringify(o);',
  '    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m);',
  '    else if (window.parent) window.parent.postMessage(m, "*");',
  '  }',
  '',
  '  var map = L.map("map", { zoomControl: false, attributionControl: !!CFG.tile });',
  '  map.setView([CFG.dest.lat, CFG.dest.lng], 14);',
  '  if (CFG.tile) L.tileLayer(CFG.tile, { maxZoom: 19 }).addTo(map);',
  '',
  '  var CAR_SVG =',
  '    \'<svg viewBox="0 0 32 32" width="34" height="34" xmlns="http://www.w3.org/2000/svg">\' +',
  '    \'<rect x="7.5" y="2.5" width="17" height="27" rx="6.5" fill="\' + CFG.color.primary + \'"/>\' +',
  '    \'<rect x="8.6" y="3.6" width="14.8" height="24.8" rx="5.6" fill="none" stroke="#ffffff" stroke-opacity=".9" stroke-width="1.4"/>\' +',
  '    \'<path d="M10.6 11.4h10.8l-1.15-3.1a2 2 0 0 0-1.87-1.3h-4.76a2 2 0 0 0-1.87 1.3z" fill="#ffffff" fill-opacity=".92"/>\' +',
  '    \'<rect x="11" y="18.2" width="10" height="5.4" rx="2.2" fill="#ffffff" fill-opacity=".55"/>\' +',
  '    \'<circle cx="11.3" cy="5.2" r="1.15" fill="#FFE9A8"/>\' +',
  '    \'<circle cx="20.7" cy="5.2" r="1.15" fill="#FFE9A8"/>\' +',
  '    \'</svg>\';',
  '',
  '  var destIcon = L.divIcon({',
  '    className: "", iconSize: [38, 48], iconAnchor: [19, 44],',
  '    html: \'<div class="dest"><div class="dest-pin"></div><div class="dest-core"></div><div class="dest-dot"></div></div>\'',
  '  });',
  '  L.marker([CFG.dest.lat, CFG.dest.lng], { icon: destIcon, keyboard: false, zIndexOffset: 500 })',
  '    .addTo(map).bindTooltip(CFG.text.destination, { direction: "top", offset: [0, -44] });',
  '',
  '  var carIcon = L.divIcon({',
  '    className: "", iconSize: [52, 52], iconAnchor: [26, 26],',
  '    html: \'<div class="car" id="carWrap"><div class="pulse"></div><div class="car-rot" id="carRot">\' + CAR_SVG + \'</div></div>\'',
  '  });',
  '',
  '  // الخط تحته حاشية بيضاء: المسار فوق بلاطات داكنة أو مزدحمة يضيع بلا حدّ.',
  '  var casing  = L.polyline([], { color: "#ffffff", weight: 10, opacity: .95, lineCap: "round", lineJoin: "round" }).addTo(map);',
  '  var planned = L.polyline([], { color: CFG.color.primary, weight: 5.5, opacity: .95, lineCap: "round", lineJoin: "round" }).addTo(map);',
  '  var traveled = L.polyline([], { color: CFG.color.muted, weight: 4, opacity: .45, dashArray: "1 9", lineCap: "round" }).addTo(map);',
  '',
  '  var carMarker = null;',
  '  var shown = null;    // الموقع المعروض حالياً (يتخلّف عن الأحدث أثناء الحركة)',
  '  var target = null;   // آخر موقع وصل من الخادم',
  '  var animId = null;',
  '  var follow = true;',
  '  var fitted = false;',
  '  var routePts = [];',
  '  var routeFrom = null;',
  '  var lastRouteAt = 0;',
  '  var routing = false;',
  '  var RAD = Math.PI / 180;',
  '',
  '  function nowMs() { return (window.performance && window.performance.now) ? window.performance.now() : Date.now(); }',
  '',
  '  function metersBetween(a, b) {',
  '    var dLat = (b.lat - a.lat) * RAD, dLng = (b.lng - a.lng) * RAD;',
  '    var la = a.lat * RAD, lb = b.lat * RAD;',
  '    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +',
  '            Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) * Math.sin(dLng / 2);',
  '    return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));',
  '  }',
  '',
  '  function bearing(a, b) {',
  '    var y = Math.sin((b.lng - a.lng) * RAD) * Math.cos(b.lat * RAD);',
  '    var x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) -',
  '            Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((b.lng - a.lng) * RAD);',
  '    return (Math.atan2(y, x) / RAD + 360) % 360;',
  '  }',
  '',
  '  var lastRot = 0;',
  '  function setRotation(deg) {',
  '    var el = document.getElementById("carRot");',
  '    if (!el) return;',
  '    // التدوير يجب أن يسلك أقصر قوس: الانتقال من ٣٥٠° إلى ١٠° هو +٢٠°',
  '    // لا -٣٤٠°، وإلا دارت السيارة حول نفسها عند كل التفاف.',
  '    var delta = ((deg - (lastRot % 360)) + 540) % 360 - 180;',
  '    lastRot = lastRot + delta;',
  '    el.style.transform = "rotate(" + lastRot + "deg)";',
  '  }',
  '',
  '  function setStale(isStale) {',
  '    var el = document.getElementById("carWrap");',
  '    if (el) el.className = isStale ? "car stale" : "car";',
  '  }',
  '',
  '  /** يقتطع ما قطعته السيارة من المسار، فيبقى المعروض هو المتبقّي فقط. */',
  '  function trimPlanned(at) {',
  '    if (!routePts.length) return null;',
  '    var best = 0, bestD = Infinity;',
  '    for (var i = 0; i < routePts.length; i++) {',
  '      var d = metersBetween(at, { lat: routePts[i][0], lng: routePts[i][1] });',
  '      if (d < bestD) { bestD = d; best = i; }',
  '    }',
  '    var rest = [[at.lat, at.lng]].concat(routePts.slice(best + 1));',
  '    planned.setLatLngs(rest);',
  '    casing.setLatLngs(rest);',
  '    return bestD;',
  '  }',
  '',
  '  function keepInView() {',
  '    if (!follow || !shown) return;',
  '    if (!map.getBounds().pad(-0.22).contains(L.latLng(shown.lat, shown.lng))) {',
  '      map.panTo([shown.lat, shown.lng], { animate: true, duration: .6 });',
  '    }',
  '  }',
  '',
  '  function fitAll() {',
  '    var pts = [[CFG.dest.lat, CFG.dest.lng]];',
  '    if (shown) pts.push([shown.lat, shown.lng]);',
  '    if (routePts.length) pts = pts.concat(routePts);',
  '    if (pts.length < 2) { map.setView(pts[0], 15); return; }',
  '    map.fitBounds(L.latLngBounds(pts), { padding: [55, 55], maxZoom: 16 });',
  '  }',
  '',
  '  function applyRoute(pts, info) {',
  '    routePts = pts;',
  '    routeFrom = { lat: pts[0][0], lng: pts[0][1] };',
  '    trimPlanned(shown || routeFrom);',
  '    if (!fitted) { fitted = true; fitAll(); }',
  '    post({ type: "route", distanceKm: info.distanceKm, durationMin: info.durationMin, source: info.source });',
  '  }',
  '',
  '  function requestRoute(from) {',
  '    if (routing) return;',
  '    var t = Date.now();',
  '    if (t - lastRouteAt < 20000) return;   // سقف لمعدّل طلبات التوجيه',
  '    lastRouteAt = t;',
  '',
  '    var straight = [[from.lat, from.lng], [CFG.dest.lat, CFG.dest.lng]];',
  '    if (!CFG.routingUrl) {',
  '      applyRoute(straight, { distanceKm: metersBetween(from, CFG.dest) / 1000, durationMin: null, source: "direct" });',
  '      return;',
  '    }',
  '',
  '    routing = true;',
  '    var url = CFG.routingUrl.replace("{coords}",',
  '      from.lng + "," + from.lat + ";" + CFG.dest.lng + "," + CFG.dest.lat);',
  '    fetch(url)',
  '      .then(function (r) { return r.json(); })',
  '      .then(function (j) {',
  '        var r0 = j && j.routes && j.routes[0];',
  '        if (!r0 || !r0.geometry || !r0.geometry.coordinates) throw new Error("no route");',
  '        applyRoute(r0.geometry.coordinates.map(function (c) { return [c[1], c[0]]; }),',
  '          { distanceKm: r0.distance / 1000, durationMin: r0.duration / 60, source: "osrm" });',
  '      })',
  '      .catch(function () {',
  '        // تعذّر التوجيه: خطّ مستقيم أفضل من لا شيء، لكن نُعلن أنه تقديري',
  '        applyRoute(straight, { distanceKm: metersBetween(from, CFG.dest) / 1000, durationMin: null, source: "direct" });',
  '      })',
  '      .then(function () { routing = false; });',
  '  }',
  '',
  '  function animateTo(next, durationMs, headingDeg) {',
  '    if (!carMarker) {',
  '      shown = next;',
  '      carMarker = L.marker([next.lat, next.lng], { icon: carIcon, keyboard: false, zIndexOffset: 1000 }).addTo(map);',
  '      carMarker.bindTooltip(CFG.text.provider, { direction: "top", offset: [0, -26] });',
  '      if (headingDeg != null) setRotation(headingDeg);',
  '      return;',
  '    }',
  '    var from = { lat: shown.lat, lng: shown.lng };',
  '    var moved = metersBetween(from, next);',
  '    // تشويش GPS يهزّ الإحداثي أمتاراً والسيارة واقفة؛ تحريك العلامة لأجله',
  '    // يجعلها ترتجف في مكانها. ما دون ٦ أمتار ليس حركة.',
  '    if (moved < 6) { shown = next; return; }',
  '',
  '    setRotation(headingDeg != null ? headingDeg : bearing(from, next));',
  '    if (animId) cancelAnimationFrame(animId);',
  '    var t0 = nowMs();',
  '    var dur = Math.max(400, Math.min(6000, durationMs || 1500));',
  '',
  '    function step() {',
  '      var p = Math.min(1, (nowMs() - t0) / dur);',
  '      var e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;   // easeInOutQuad',
  '      shown = { lat: from.lat + (next.lat - from.lat) * e, lng: from.lng + (next.lng - from.lng) * e };',
  '      carMarker.setLatLng([shown.lat, shown.lng]);',
  '      var off = trimPlanned(shown);',
  '      keepInView();',
  '      if (p < 1) { animId = requestAnimationFrame(step); return; }',
  '      animId = null;',
  '      // خروج عن المسار المخطَّط ⇒ الفني سلك طريقاً آخر، فيُعاد الحساب.',
  '      if (off != null && off > 180) requestRoute(shown);',
  '    }',
  '    animId = requestAnimationFrame(step);',
  '  }',
  '',
  '  function handle(d) {',
  '    if (!d || !d.type) return;',
  '    if (d.type === "provider") {',
  '      var next = { lat: d.lat, lng: d.lng };',
  '      var prevFix = target;',
  '      setStale(!!d.stale);',
  '      if (!routePts.length) requestRoute(next);',
  '      // ضجيج GPS يُقاس بين قراءتين متتاليتين من الخادم، لا بين القراءة',
  '      // والموقع المعروض: الأخير يتخلّف أثناء الحركة فيمرّ الاهتزاز كأنه سير.',
  '      target = next;',
  '      if (prevFix && metersBetween(prevFix, next) < 6) return;',
  '      animateTo(next, d.animMs, typeof d.heading === "number" ? d.heading : null);',
  '      if (!fitted) { fitted = true; fitAll(); }',
  '      return;',
  '    }',
  '    if (d.type === "traveled") {',
  '      traveled.setLatLngs((d.points || []).map(function (c) { return [c[1], c[0]]; }));',
  '      return;',
  '    }',
  '    if (d.type === "recenter") {',
  '      follow = true; fitted = true;',
  '      post({ type: "follow", value: true });',
  '      fitAll();',
  '      return;',
  '    }',
  '    if (d.type === "reroute") { lastRouteAt = 0; if (target) requestRoute(target); }',
  '  }',
  '',
  '  // تحريك المستخدم للخريطة يدوياً يعني أنه ينظر إلى مكان آخر؛ إعادة',
  '  // التمركز التلقائي فوقه تنتزع منه السيطرة عند كل تحديث.',
  '  map.on("dragstart zoomstart", function (e) {',
  '    if (e && e.hard) return;',
  '    if (follow) { follow = false; post({ type: "follow", value: false }); }',
  '  });',
  '',
  '  window.addEventListener("message", function (e) {',
  '    try { handle(typeof e.data === "string" ? JSON.parse(e.data) : e.data); } catch (_) {}',
  '  });',
  '  document.addEventListener("message", function (e) {',
  '    try { handle(typeof e.data === "string" ? JSON.parse(e.data) : e.data); } catch (_) {}',
  '  });',
  '  window.__track = handle;',
  '',
  '  map.whenReady(function () {',
  '    setTimeout(function () { map.invalidateSize(); post({ type: "ready" }); }, 60);',
  '  });',
  '})();',
  '</script>',
  '</body>',
  '</html>',
].join('\n');

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** يقبل {coordinates:[lng,lat]} أو {latitude,longitude} أو [lng,lat]. */
function toLatLng(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    const lng = num(value[0]);
    const lat = num(value[1]);
    return lat === null || lng === null ? null : { lat, lng };
  }
  if (Array.isArray(value.coordinates)) return toLatLng(value.coordinates);
  const lat = num(value.latitude ?? value.lat);
  const lng = num(value.longitude ?? value.lng);
  return lat === null || lng === null ? null : { lat, lng };
}

export default function TrackingMap({
  provider,
  destination,
  traveled,
  updatedAt,
  active = true,
  stale = false,
  height = 300,
  onRouteInfo,
}) {
  const webRef = useRef(null);
  const iframeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [follow, setFollow] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const lastSentAt = useRef(0);

  const dest = useMemo(() => toLatLng(destination), [destination]);
  const car = useMemo(() => toLatLng(provider), [provider]);
  // كائن جديد عند كل تصيير يعيد تشغيل تأثير الإرسال بلا داعٍ؛ المفتاح النصّي
  // يجعل التبعية تتغيّر فقط حين يتغيّر الإحداثي فعلاً.
  const carKey = car ? `${car.lat},${car.lng}` : '';

  const html = useMemo(() => {
    if (!dest) return null;
    const cfg = {
      dest,
      tile: tileTemplate(),
      routingUrl: ROUTING_URL,
      color: { primary: colors.primary, muted: colors.textMuted2 },
      text: { destination: 'موقعك', provider: 'الفني' },
    };
    return MAP_HTML
      .replace('__CFG__', JSON.stringify(cfg))
      .split('__PRIMARY__')
      .join(colors.primary);
  }, [dest]);

  // بلا إشارة جاهزية خلال مهلة نعرض بديلاً مع إعادة محاولة، لا مساحة صامتة
  useEffect(() => {
    if (ready) return undefined;
    const t = setTimeout(() => setFailed(true), 14000);
    return () => clearTimeout(t);
  }, [ready, reloadKey]);

  const send = useCallback((payload) => {
    const msg = JSON.stringify(payload);
    if (Platform.OS === 'web') iframeRef.current?.contentWindow?.postMessage(msg, '*');
    else webRef.current?.injectJavaScript(`window.__track && window.__track(${msg}); true;`);
  }, []);

  const routeInfoRef = useRef(onRouteInfo);
  routeInfoRef.current = onRouteInfo;

  const handleMessage = useCallback((raw) => {
    try {
      const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!d) return;
      if (d.type === 'ready') { setReady(true); setFailed(false); return; }
      if (d.type === 'follow') { setFollow(!!d.value); return; }
      if (d.type === 'route') {
        routeInfoRef.current?.({
          distanceKm: num(d.distanceKm),
          durationMin: num(d.durationMin),
          source: d.source,
        });
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const onMsg = (e) => {
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      handleMessage(e.data);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [handleMessage]);

  // دفع كل موقع جديد إلى الخريطة. مدّة الحركة = الفاصل الفعلي بين
  // التحديثين، فتصل السيارة إلى نقطتها تماماً حين يصل التحديث التالي
  // بدل أن تقف منتظرة أو تُقطَع في منتصف الطريق.
  useEffect(() => {
    if (!ready || !car) return;
    const now = Date.now();
    const gap = lastSentAt.current ? now - lastSentAt.current : 0;
    lastSentAt.current = now;
    send({
      type: 'provider',
      lat: car.lat,
      lng: car.lng,
      heading: num(provider?.heading),
      animMs: gap > 0 ? Math.min(gap, 6000) : 1200,
      stale,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, carKey, provider?.heading, updatedAt, stale, send]);

  useEffect(() => {
    if (!ready || !Array.isArray(traveled) || traveled.length < 2) return;
    const points = traveled
      .map((p) => (Array.isArray(p) ? p : p?.coordinates))
      .filter((p) => Array.isArray(p) && p.length === 2);
    if (points.length >= 2) send({ type: 'traveled', points });
  }, [ready, traveled, send]);

  if (!dest || !html) {
    return (
      <View style={[styles.wrap, { height }]}>
        <View style={styles.fallback}>
          <WarningCircle size={30} weight="fill" color={colors.textMuted2} />
          <Text style={styles.fallbackText}>موقع الوجهة غير متوفّر لهذا الطلب</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      {Platform.OS === 'web' ? (
        <iframe
          key={reloadKey}
          ref={iframeRef}
          title="خريطة تتبّع الفني"
          srcDoc={html}
          style={{ border: 0, width: '100%', height: '100%' }}
        />
      ) : (
        <WebView
          key={reloadKey}
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          style={{ backgroundColor: '#eee6f6' }}
          onMessage={(e) => handleMessage(e.nativeEvent.data)}
          onError={() => setFailed(true)}
        />
      )}

      {!ready && !failed ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.overlayText}>جارٍ تحميل الخريطة…</Text>
        </View>
      ) : null}

      {failed && !ready ? (
        <View style={styles.overlay}>
          <WarningCircle size={32} weight="fill" color={colors.danger} />
          <Text style={styles.overlayText}>تعذّر تحميل الخريطة. تحقّق من اتصالك.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إعادة تحميل الخريطة"
            style={styles.overlayBtn}
            onPress={() => { setFailed(false); setReady(false); setReloadKey((k) => k + 1); }}
          >
            <Text style={styles.overlayBtnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : null}

      {/* بلا موقع للفني بعدُ: نقول ذلك صراحةً بدل خريطة تبدو معطّلة */}
      {ready && !car ? (
        <View style={styles.notice} pointerEvents="none">
          <Text style={styles.noticeText}>
            {active ? 'بانتظار أول تحديث لموقع الفني…' : 'التتبّع المباشر غير متاح لحالة الطلب الحالية'}
          </Text>
        </View>
      ) : null}

      {/* يظهر فقط بعد أن يحرّك المستخدم الخريطة يدوياً — قبلها لا معنى له */}
      {ready && !follow ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إعادة توسيط الخريطة على المسار"
          style={styles.recenter}
          onPress={() => send({ type: 'recenter' })}
        >
          <Crosshair size={20} weight="fill" color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#eee6f6',
    borderWidth: 1,
    borderColor: colors.borderCard,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: '#eee6f6ee',
  },
  overlayText: { fontSize: font.size.sm, color: colors.textBody, textAlign: 'center', lineHeight: 21 },
  overlayBtn: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.tint,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  overlayBtnText: { fontSize: font.size.sm, fontWeight: '700', color: colors.primary },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  fallbackText: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center' },
  notice: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: '#ffffffee',
    borderRadius: radius.md,
    paddingVertical: 9,
    paddingHorizontal: 14,
    ...shadow.soft,
  },
  noticeText: { fontSize: font.size.xs, color: colors.textBody, textAlign: 'center' },
  recenter: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
});
