// ============================================================
//  useReducedMotion — تفضيل «تقليل الحركة» عبر المنصّات
//  مستخدمو الدوار الحركي (vestibular disorders) يفعّلون هذا الإعداد على مستوى
//  النظام؛ تجاهله لا يزعجهم فقط بل قد يسبّب غثياناً فعلياً. نقرأه مرّة عند
//  التركيب ونتابع تغيّره، فتستطيع كل شاشة استبدال الانزلاق/التكبير بتلاشٍ.
//
//  react-native-web يترجم isReduceMotionEnabled إلى
//  matchMedia('(prefers-reduced-motion: reduce)')، لكنه لا يبثّ حدث التغيّر
//  في كل الإصدارات — لذلك نستمع لاستعلام الوسائط مباشرة على الويب أيضاً.
// ============================================================
import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

const WEB_QUERY = "(prefers-reduced-motion: reduce)";

function webMediaQuery() {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return window.matchMedia(WEB_QUERY);
}

export default function useReducedMotion() {
  // القيمة الأولية تُقرأ متزامنة على الويب، فلا تبدأ الحركة ثم تتوقف فجأة
  const [reduced, setReduced] = useState(() => !!webMediaQuery()?.matches);

  useEffect(() => {
    let alive = true;
    const apply = (value) => {
      if (alive) setReduced(!!value);
    };

    AccessibilityInfo.isReduceMotionEnabled?.().then(apply).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", apply);

    const mql = webMediaQuery();
    const onMediaChange = (event) => apply(event.matches);
    if (mql) {
      apply(mql.matches);
      // addListener هو الشكل المهجور، لكنه الوحيد المتاح في متصفّحات أقدم
      if (mql.addEventListener) mql.addEventListener("change", onMediaChange);
      else mql.addListener?.(onMediaChange);
    }

    return () => {
      alive = false;
      sub?.remove?.();
      if (mql) {
        if (mql.removeEventListener) mql.removeEventListener("change", onMediaChange);
        else mql.removeListener?.(onMediaChange);
      }
    };
  }, []);

  return reduced;
}
