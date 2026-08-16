// ============================================================
//  serviceSearch — مطابقة الخدمات بالعَرَض لا بالاسم
//
//  المستخدم المتعطّل يعرف العَرَض («السيارة ما بتشتغل») لا التصنيف («خدمة
//  البطارية»). البحث الحرفي على الاسم يعيد «لا نتائج» لأشيع الاستعلامات،
//  فيبدو التطبيق فارغاً وهو مليء.
//
//  ويُضاف إلى ذلك أن العربية تُكتب بأشكال متعددة لنفس الحرف (أ/إ/آ/ا،
//  ة/ه، ى/ي) وبتشكيل اختياري — فمطابقة نصّية خام تفشل لأسباب إملائية بحتة.
// ============================================================

const DIACRITICS = /[ً-ْٰـ]/g;

/** توحيد شكل النص العربي قبل المقارنة */
export function normalizeArabic(value) {
  return String(value || "")
    .toLowerCase()
    .replace(DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىئ]/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/\s+/g, " ")
    .trim();
}

// مرادفات وأعراض شائعة بالعامية السورية لكل تصنيف. مصدرها كيف يصف الناس
// المشكلة فعلاً، لا كيف تسمّيها الشركة.
const SYMPTOMS = {
  battery: ["ما بتشتغل", "ما بدها تشتغل", "البطاريه فاضيه", "بطاريه ميته", "ما في كهربا", "شحن", "كابلات", "تدوير", "ما بدور"],
  tire: ["بنشر", "دولاب", "كوشوك", "عجل مفشوش", "اطار مقطوع", "تبديل دولاب", "استبن"],
  fuel: ["خلص بنزين", "ما في بنزين", "خلص وقود", "مازوت", "خزان فاضي"],
  lockout: ["نسيت المفتاح", "المفتاح جوا", "انحبس المفتاح", "ما بفتح الباب", "قفل"],
  towing: ["سحب", "قطر", "ونش", "ما بتمشي", "تعطلت نهائي", "نقل السياره"],
  maintenance: ["صيانه", "فحص", "تصليح", "زيت", "فلتر", "صوت غريب"],
  car_wash: ["غسيل", "تنظيف", "شامبو", "تلميع"],
  emergency: ["حادث", "طوارئ", "اصطدام", "عالق", "خطر"],
};

const NORMALIZED_SYMPTOMS = Object.fromEntries(
  Object.entries(SYMPTOMS).map(([category, list]) => [category, list.map(normalizeArabic)])
);

/** أعراض التصنيف — تُعرض كاقتراحات أيضاً */
export function symptomsFor(category) {
  return SYMPTOMS[category] || [];
}

/**
 * هل تطابق الخدمة نص البحث؟ تُفحص الاسم والوصف والتصنيف واسمه العربي،
 * ثم الأعراض العامية المرتبطة بالتصنيف.
 */
export function serviceMatches(service, rawTerm, categoryLabel) {
  const term = normalizeArabic(rawTerm);
  if (!term) return true;

  const category = service?.category;
  const haystack = [
    service?.nameAr,
    service?.name,
    service?.descriptionAr,
    service?.description,
    category,
    categoryLabel ? categoryLabel(category) : "",
  ]
    .filter(Boolean)
    .map(normalizeArabic)
    .join(" | ");

  if (haystack.includes(term)) return true;

  // مطابقة العَرَض: نقبل التطابق في الاتجاهين حتى تلتقط الجملة الجزئية
  // («ما بتشتغل» مقابل «السياره ما بتشتغل»)
  const symptoms = NORMALIZED_SYMPTOMS[category] || [];
  return symptoms.some((symptom) => symptom.includes(term) || term.includes(symptom));
}
