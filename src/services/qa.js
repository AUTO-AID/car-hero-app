// ============================================================
//  qa — مِرقاب حالات للتطوير فقط
//
//  كثير من الحالات الحرجة لا تظهر تلقائياً: رفض إذن دائم، خدمة موقع مغلقة،
//  لا مزوّد متاح، فشل شبكة، قائمة فارغة. اختبارها كان يتطلّب تعديل الكود
//  مؤقّتاً ثم عكسه في كل مرّة — بطيء وعرضة لنسيان العكس.
//
//  الآن: أضف ?qa=<state> إلى الرابط في وضع التطوير على الويب.
//  الدالة تُرجع null دائماً خارج __DEV__، فلا أثر لها في الإنتاج إطلاقاً.
// ============================================================
import { Platform } from "react-native";

export function qaState(key = "qa") {
  if (!__DEV__ || Platform.OS !== "web") return null;
  try {
    return new URLSearchParams(window.location.search).get(key);
  } catch {
    return null;
  }
}

/** هل الحالة المطلوبة مفروضة؟ استعمال: if (qaIs('empty')) return <EmptyState/> */
export function qaIs(value, key = "qa") {
  return qaState(key) === value;
}

/**
 * معطيات مسار من الرابط لشاشة قُفز إليها بـ ?qa=<step>.
 *
 * القفزة التطويرية تصل الشاشة بلا route.params، فتبدو الشاشات التي تعتمد على
 * معطيات (الخدمة، المزوّد، الإحداثيات) كأنها معطّلة. تُرجع {} خارج __DEV__.
 */
export function qaParams(keys = []) {
  const result = {};
  keys.forEach((key) => {
    const value = qaState(key);
    if (value != null && value !== "") result[key] = value;
  });
  return result;
}
