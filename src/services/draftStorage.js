// ============================================================
//  draftStorage — مسوّدات النماذج نصف الممتلئة
//
//  الخروج العرضي من نموذج (ضغطة رجوع، تنبيه، تبديل تبويب) يمسح كل ما كُتب،
//  وهو من أكبر أسباب التخلّي عن النماذج. نحفظ المسوّدة عند كل تغيير ونستعيدها
//  عند العودة، ونمسحها فور نجاح الحفظ حتى لا تعود قيم قديمة إلى نموذج جديد.
//
//  التخزين في الذاكرة (يكفي لدورة حياة التطبيق) ومعه localStorage على الويب
//  حيث إعادة تحميل الصفحة شائعة. لا نستعمل SecureStore: هذه بيانات غير سرّية،
//  وتخزينها هناك يخلط الحسّاس بغيره.
// ============================================================
import { Platform } from "react-native";

const PREFIX = "ch_draft_";
const memory = new Map();

export function saveDraft(key, value) {
  const payload = JSON.stringify({ at: Date.now(), value });
  memory.set(key, payload);
  if (Platform.OS === "web") {
    try { globalThis.localStorage?.setItem(PREFIX + key, payload); } catch {}
  }
}

/** يُرجع القيمة المحفوظة أو null. `maxAgeMs` يمنع استعادة مسوّدة قديمة منسيّة. */
export function readDraft(key, { maxAgeMs = 24 * 60 * 60 * 1000 } = {}) {
  let raw = memory.get(key);
  if (!raw && Platform.OS === "web") {
    try { raw = globalThis.localStorage?.getItem(PREFIX + key) ?? null; } catch { raw = null; }
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (maxAgeMs && Date.now() - Number(parsed.at || 0) > maxAgeMs) {
      clearDraft(key);
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export function clearDraft(key) {
  memory.delete(key);
  if (Platform.OS === "web") {
    try { globalThis.localStorage?.removeItem(PREFIX + key); } catch {}
  }
}
