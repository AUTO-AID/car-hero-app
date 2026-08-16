// ============================================================
//  paywall — حدّ تكرار عرض جدار الاشتراك
//
//  جدار يُعرض في كل محاولة، أو يُعاد فوراً بعد رفضه، لا يبيع شيئاً — يولّد
//  استياءً ويرفع معدّل حذف التطبيق. القاعدة هنا صريحة: **مرّة واحدة لكل
//  ميزة خلال فترة تهدئة**، وأي رفض يبدأ التهدئة من جديد.
//
//  التخزين في الذاكرة ومعه localStorage على الويب حيث إعادة التحميل شائعة
//  (وإلا صار كل تحديث للصفحة «جلسة جديدة» تُعيد عرض الجدار).
// ============================================================
import { Platform } from "react-native";

const KEY = "ch_paywall_seen";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

let memory = null;

function read() {
  if (memory) return memory;
  if (Platform.OS === "web") {
    try {
      const raw = globalThis.localStorage?.getItem(KEY);
      memory = raw ? JSON.parse(raw) : {};
    } catch {
      memory = {};
    }
  } else {
    memory = {};
  }
  return memory;
}

function write(next) {
  memory = next;
  if (Platform.OS === "web") {
    try { globalThis.localStorage?.setItem(KEY, JSON.stringify(next)); } catch {}
  }
}

/** هل يجوز عرض الجدار لهذه الميزة الآن؟ */
export function shouldShowPaywall(feature = "default") {
  const seen = read()[feature];
  if (!seen) return true;
  return Date.now() - Number(seen) > COOLDOWN_MS;
}

/** يُستدعى عند الإغلاق أو الرفض — يبدأ التهدئة */
export function markPaywallDismissed(feature = "default") {
  write({ ...read(), [feature]: Date.now() });
}

/** يُستدعى بعد الاشتراك الناجح: لا معنى لعرض الجدار بعدها */
export function clearPaywallHistory() {
  write({});
}
