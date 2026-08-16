// ============================================================
//  locationService — المصدر الوحيد للموقع والإذن في التطبيق
//
//  قبل هذا الملف كان الموقع يُطلب من ثلاثة أماكن مستقلة:
//  locationService (شاشة الإذن)، location.js (الخريطة والتفاصيل والتأكيد
//  والعناوين)، وحالة location في App.js. كل واحد منها كان يستدعي
//  requestForegroundPermissionsAsync بنفسه، فيُسأل المستخدم الإذن أكثر من
//  مرّة، ويُفقد الموقع المُختار يدوياً عند أول شاشة تطلب إحداثيات الجهاز.
//
//  القاعدة الحاكمة هنا: **شاشة التمهيد وحدها هي التي تسأل النظام**.
//  كل ما عداها يستهلك النتيجة عبر getCoords، ولا يُظهر حوار نظام أبداً —
//  لأن حوار النظام فرصة واحدة لا تُعوَّض على iOS، وإظهاره بلا شرح يحرقها.
// ============================================================
import { Linking, Platform } from "react-native";
import * as Location from "expo-location";

export const PERMISSION = {
  UNDETERMINED: "undetermined", // لم يُسأل بعد — الحالة الوحيدة التي يظهر فيها حوار النظام
  GRANTED: "granted",
  DENIED: "denied", // رفض مؤقّت — يمكن إعادة السؤال
  BLOCKED: "blocked", // رفض دائم — لا يُنتج الطلب البرمجي أي حوار، المخرج الإعدادات
  SERVICES_OFF: "servicesOff", // خدمة الموقع مغلقة على مستوى الجهاز — حالة مختلفة تماماً
};

// مهلة صلاحية الإحداثيات المخزّنة: المستخدم المتعطّل لا يتحرّك، وإعادة
// تشغيل GPS لكل شاشة تستنزف البطارية بلا فائدة.
const DEFAULT_MAX_AGE_MS = 2 * 60 * 1000;

let cached = null; // { latitude, longitude, accuracy, source: 'device' | 'manual', at }
let inflight = null; // طلب جارٍ — يمنع تشغيل GPS مرّتين عند فتح شاشتين معاً

function normalize(coords, source) {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy ?? null,
    source,
    at: Date.now(),
  };
}

function deniedError() {
  // نفس عقد الخطأ القديم (code + الرسالة) حتى تستمر الشاشات التي تعالجه
  const error = new Error("يرجى السماح بالوصول إلى الموقع لعرض الفنيين القريبين منك");
  error.code = "LOCATION_DENIED";
  return error;
}

export async function getServicesEnabled() {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    // على الويب قد لا تكون الدالة مدعومة — لا نمنع المستخدم بسبب فحص فاشل
    return true;
  }
}

function toStatus(permission) {
  if (permission?.granted || permission?.status === "granted") return PERMISSION.GRANTED;
  if (permission?.status === "undetermined") return PERMISSION.UNDETERMINED;
  // canAskAgain === false هو الفرق الجوهري بين رفض يمكن تداركه ورفض نهائي
  return permission?.canAskAgain === false ? PERMISSION.BLOCKED : PERMISSION.DENIED;
}

/** الحالة الحالية بلا أي حوار نظام — آمنة للاستدعاء عند كل تركيب شاشة */
export async function getPermissionState() {
  // خدمة الجهاز تُفحص أولاً: إن كانت مغلقة فحالة الإذن لا معنى لها، وإرسال
  // المستخدم إلى إعدادات التطبيق حينها يرسله إلى الشاشة الخاطئة.
  const servicesEnabled = await getServicesEnabled();
  if (!servicesEnabled) {
    return { status: PERMISSION.SERVICES_OFF, canAskAgain: false, servicesEnabled: false };
  }
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    return {
      status: toStatus(permission),
      canAskAgain: permission?.canAskAgain !== false,
      servicesEnabled: true,
    };
  } catch {
    return { status: PERMISSION.UNDETERMINED, canAskAgain: true, servicesEnabled: true };
  }
}

/**
 * يطلب الإذن من النظام — تستدعيها شاشة التمهيد وحدها.
 * لا تستدعي النظام إن كان الطلب لن يُنتج حواراً (ممنوح/محظور/الخدمة مغلقة):
 * استدعاؤه حينها وعد كاذب للمستخدم بأن ضغطته ستفعل شيئاً.
 */
export async function requestPermission() {
  const current = await getPermissionState();
  if (current.status !== PERMISSION.UNDETERMINED && current.status !== PERMISSION.DENIED) {
    return current;
  }
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    return {
      status: toStatus(permission),
      canAskAgain: permission?.canAskAgain !== false,
      servicesEnabled: true,
    };
  } catch {
    return current;
  }
}

/** موقع اختاره المستخدم يدوياً من الخريطة — يجعل المسار اليدوي مكتملاً فعلاً */
export function setManualCoords(coords) {
  if (!coords || coords.latitude == null || coords.longitude == null) return null;
  cached = normalize(coords, "manual");
  return cached;
}

export function getCachedCoords() {
  return cached;
}

export function clearCachedCoords() {
  cached = null;
}

/**
 * الإحداثيات الفعّالة: المخزَّن الحديث أولاً (بما فيه الاختيار اليدوي)، ثم
 * الجهاز إن كان الإذن ممنوحاً. لا يُظهر حوار إذن أبداً.
 */
export async function getCoords({
  maxAgeMs = DEFAULT_MAX_AGE_MS,
  force = false,
  allowRequest = false,
} = {}) {
  if (!force && cached) {
    // الموقع اليدوي لا يتقادم: المستخدم اختاره صراحةً فهو أدقّ من تخميننا
    if (cached.source === "manual" || Date.now() - cached.at < maxAgeMs) return cached;
  }
  let state = await getPermissionState();
  // التمييز الجوهري: طلب صريح من المستخدم (ضغط «موقعي الحالي») يجوز أن يُظهر
  // حوار النظام — الزر نفسه هو الشرح، ولا مفاجأة فيه. أمّا جلب البيانات
  // الخلفي (فتح شاشة تفاصيل أو خريطة مزوّدين) فلا يجوز أن يُظهره أبداً.
  if (state.status !== PERMISSION.GRANTED && allowRequest) {
    state = await requestPermission();
  }
  if (state.status !== PERMISSION.GRANTED) {
    if (cached) return cached; // مخزَّن قديم خير من فشل كامل
    throw deniedError();
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      cached = normalize(position.coords, "device");
      return cached;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** فتح إعدادات التطبيق — المخرج الوحيد الفعّال في حالة الرفض الدائم */
export async function openLocationSettings() {
  if (Platform.OS === "web") return false;
  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}

// ============================================================
//  توافقية: الأسماء القديمة تبقى عاملة بنفس عقودها، فلا تحتاج الشاشات
//  الخمس المستهلكة أي تعديل، وتمرّ كلها من هنا.
// ============================================================

/** @deprecated استخدم getCoords */
export async function getDeviceCoords() {
  return getCoords();
}

/**
 * تُستدعى من زر «موقعي الحالي» — إجراء صريح بمبادرة المستخدم، فيُسمح له
 * بإظهار حوار الإذن إن لم يُسأل بعد.
 * @deprecated استخدم getCoords({ allowRequest: true })
 */
export async function getCurrentLocation() {
  return getCoords({ allowRequest: true, force: true });
}

/** @deprecated استخدم requestPermission — هذه تُرجع bool فقط */
export async function requestLocationPermission() {
  const state = await requestPermission();
  return state.status === PERMISSION.GRANTED;
}
