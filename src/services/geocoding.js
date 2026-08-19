// ============================================================
//  geocoding — بحث عن الأماكن بالاسم (Nominatim / OpenStreetMap)
//  نفس مصدر بلاطات الخريطة المستخدم في InteractiveMapScreen.
//  يعيد [{ id, name, latitude, longitude }] ويرمي رسالة عربية عند الفشل.
// ============================================================

import Constants from 'expo-constants';

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const TIMEOUT_MS = 12000;

/**
 * عنوان مقروء من إحداثيات (reverse geocoding).
 *
 * الحاجة: عرض «33.51381, 36.27651» لا يعني شيئاً للمستخدم ولا يمكنه التحقّق
 * من صحته. اسم المكان هو ما يسمح له بتأكيد أن الدبّوس في المكان الصحيح فعلاً
 * — وهذه الشاشة تحدّد إن كان الفني سيجده أصلاً.
 *
 * تُعيد '' عند الفشل بدل أن ترمي: تعذّر العنوان لا يمنع تأكيد الإحداثيات.
 */
export async function reverseGeocode(latitude, longitude, { signal } = {}) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'json',
    addressdetails: '1',
    zoom: '18',
    'accept-language': 'ar',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(`${REVERSE_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return '';
    const row = await res.json();
    const a = row?.address || {};
    // نُركّب اسماً قصيراً مفيداً بدل display_name الطويل الذي يملأ السطر
    // بمعلومات إدارية لا تساعد على تحديد المكان.
    const parts = [
      a.road || a.pedestrian || a.neighbourhood || a.suburb,
      a.city || a.town || a.village || a.state,
    ].filter(Boolean);
    return parts.length ? parts.join('، ') : row?.display_name || '';
  } catch {
    return '';
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * بلاطة خريطة ساكنة لإحداثيات — معاينة بصرية بلا مكتبة خرائط.
 *
 * التعرّف على المكان بالصورة أسرع بكثير من قراءة سطر عنوان، خاصةً في قائمة
 * عناوين متشابهة النصّ («شارع الجلاء…» مرّتين). نستعمل نفس مصدر البلاطات
 * المستخدم في InteractiveMapScreen فلا تختلف الخريطتان شكلاً.
 */
// مزوّد البلاطات.
//
// خادم tile.openstreetmap.org العام **يمنع** الاستعمال من داخل تطبيق موزَّع
// (Tile Usage Policy)، ويردّ عند الكشف ببلاطة مكتوب عليها
// «Access blocked — App is not following the tile usage policy». وهذا ما كان
// يظهر داخل الشاشة: ليس عطلاً في التطبيق بل حجباً صحيحاً من الخادم.
//
// الحلّ الدائم مفتاح من مزوّد يسمح بالاستعمال داخل التطبيقات (MapTiler أو
// Stadia أو Geoapify…). يُضبط في app.json تحت extra.tileUrlTemplate بقالب
// يحوي {z} و{x} و{y}، فلا يحتاج تبديله لمسّ الشيفرة.
const TILE_TEMPLATE =
  Constants?.expoConfig?.extra?.tileUrlTemplate ??
  Constants?.manifest2?.extra?.expoClient?.extra?.tileUrlTemplate ??
  Constants?.manifest?.extra?.tileUrlTemplate ??
  null;

/** هل عُيّن مزوّد بلاطات؟ الواجهة تعرض بديلاً نظيفاً إن لم يُعيَّن. */
export function hasTileProvider() {
  return Boolean(TILE_TEMPLATE);
}

/** القالب الخام — تحتاجه Leaflet التي تبني عنوان البلاطة بنفسها. */
export function tileTemplate() {
  return TILE_TEMPLATE;
}

export function tileUrlFor(latitude, longitude, zoom = 15) {
  // بلا مزوّد لا نُطلق نداءً محجوباً أصلاً، فلا تصل صورة خطأ إلى المستخدم
  if (!TILE_TEMPLATE) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const n = 2 ** zoom;
  const x = Math.floor(((longitude + 180) / 360) * n);
  const latRad = (latitude * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return TILE_TEMPLATE.replace('{z}', zoom).replace('{x}', x).replace('{y}', y);
}

/**
 * بحث عن مواقع بالاسم، مُقيَّد بسوريا لأن التطبيق يخدمها.
 * @param {string} query نص البحث
 * @param {{ signal?: AbortSignal, limit?: number }} opts
 */
export async function searchPlaces(query, { signal, limit = 6 } = {}) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    q,
    format: 'json',
    addressdetails: '1',
    limit: String(limit),
    countrycodes: 'sy',
    'accept-language': 'ar',
  });

  // مهلة خاصة بالبحث + احترام إلغاء الطلب القادم من الشاشة
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('bad status');
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => ({
        id: String(r.place_id),
        name: r.display_name || '',
        latitude: Number(r.lat),
        longitude: Number(r.lon),
      }))
      .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
  } catch (e) {
    // الإلغاء ليس خطأً يُعرض للمستخدم — الشاشة تتجاهله
    if (e?.name === 'AbortError' && !signal?.aborted) {
      const err = new Error('انتهت مهلة البحث، تحقق من الشبكة');
      err.code = 'TIMEOUT';
      throw err;
    }
    if (e?.name === 'AbortError') throw e;
    const err = new Error('تعذّر البحث عن الموقع، تحقق من الشبكة');
    err.code = 'SEARCH_FAILED';
    throw err;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onAbort);
  }
}
