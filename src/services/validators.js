// ============================================================
//  validators — قواعد تحقّق مشتركة (تطابق DTOs في الباك)
//  تُعيد الدوال رسالة الخطأ بالعربية أو "" عند الصحّة،
//  ليستخدمها كل حقل مباشرةً بدل تكرار المنطق في كل شاشة.
// ============================================================

// كلمة المرور — مطابقة لعقد الخادم حرفياً:
// RegisterDto: MinLength(8) + Matches(/^(?=.*[A-Z])(?=.*\d)/)
// أي: 8 رموز + حرف كبير + رقم. لا رمز خاص ولا حرف صغير.
export const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export function isStrongPassword(pw) {
  return PASSWORD_RULE.test(pw || '');
}

// متطلبات كلمة المرور — مصدر واحد لمؤشّر القوة ولرسائل الخطأ.
//
// required: يمنع الإرسال (لأن الخادم سيرفضه فعلاً).
// غير ذلك: توصية تُعرض للإرشاد ولا تحجب.
//
// سبب الفصل: القائمة كانت تفرض «رمزاً خاصاً» و«حرفاً صغيراً» لا يطلبهما
// الخادم، فكانت الواجهة ترفض كلمات مرور صالحة تماماً (مثل Ahmed123) على
// أعلى شاشة تسرّب في التطبيق. الحاجز المخترَع أغلى من أي مكسب أمني هنا،
// والتوصية تحقّق الغرض بلا منع.
export const PASSWORD_RULES = [
  { key: 'len', label: '8 رموز على الأقل', required: true, test: (v) => (v || '').length >= 8 },
  { key: 'upper', label: 'حرف كبير واحد', required: true, test: (v) => /[A-Z]/.test(v || '') },
  { key: 'digit', label: 'رقم واحد', required: true, test: (v) => /\d/.test(v || '') },
  { key: 'lower', label: 'حرف صغير', required: false, test: (v) => /[a-z]/.test(v || '') },
  { key: 'symbol', label: 'رمز خاص', required: false, test: (v) => /[^A-Za-z0-9]/.test(v || '') },
];

export const PASSWORD_RULES_REQUIRED = PASSWORD_RULES.filter((rule) => rule.required);

// -------- تحقّق الحقول (تُعيد رسالة الخطأ أو "") --------

// الاسم الكامل: 3 أحرف على الأقل، ولا يكون رقماً
export function validateFullName(value) {
  const name = (value || '').trim();
  if (!name) return 'أدخل الاسم الكامل';
  if (name.length < 3) return 'الاسم يجب ألا يقل عن 3 أحرف';
  if (/^\d+$/.test(name)) return 'أدخل اسماً صحيحاً';
  return '';
}

// الهاتف السوري: 9 أرقام تبدأ بـ 9 (الحقل يمرّر الأرقام فقط بدون +963)
export function validatePhone(value) {
  const digits = (value || '').replace(/[^0-9]/g, '');
  if (!digits) return 'أدخل رقم الهاتف';
  if (digits.length < 9) return 'الرقم يجب أن يكون 9 أرقام';
  if (!/^9\d{8}$/.test(digits)) return 'رقم غير صحيح — يبدأ بـ 9 (مثال: 991234567)';
  return '';
}

// كلمة المرور عند تسجيل الدخول: وجودها فقط (القوة تُفحص عند الإنشاء)
export function validatePasswordPresent(value) {
  if (!value) return 'أدخل كلمة المرور';
  return '';
}

// كلمة المرور عند الإنشاء/التغيير: يجب أن تحقّق كل القواعد
export function validatePasswordStrength(value) {
  if (!value) return 'أدخل كلمة المرور';
  // القواعد الإلزامية وحدها تمنع — التوصيات تُعرض في القائمة الحيّة ولا تحجب
  const failed = PASSWORD_RULES_REQUIRED.filter((rule) => !rule.test(value));
  if (!failed.length) return '';
  if (failed.length === 1) return `ينقص: ${failed[0].label}`;
  return `ينقص: ${failed.map((rule) => rule.label).join('، ')}`;
}

// تأكيد كلمة المرور
export function validateConfirm(value, password) {
  if (!value) return 'أعد إدخال كلمة المرور';
  if (value !== password) return 'كلمتا المرور غير متطابقتين';
  return '';
}

// -------- المركبات --------

/** يحوّل الأرقام العربية/الفارسية إلى لاتينية ليقبلها الخادم */
export function normalizeDigits(value) {
  return String(value || '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function validateVehicleText(value, label) {
  const v = (value || '').trim();
  if (!v) return `أدخل ${label}`;
  if (v.length < 2) return `${label} قصير جداً`;
  return '';
}

/** سنة الصنع: بين 1900 والسنة القادمة (كانت تقبل أي رقم ≥ 1900) */
export function validateVehicleYear(value) {
  const raw = normalizeDigits(value).trim();
  if (!raw) return 'أدخل سنة الصنع';
  if (!/^\d{4}$/.test(raw)) return 'أدخل سنة من 4 أرقام';
  const year = Number(raw);
  const max = new Date().getFullYear() + 1;
  if (year < 1900 || year > max) return `السنة يجب أن تكون بين 1900 و ${max}`;
  return '';
}

/** رقم اللوحة: 3 خانات على الأقل */
export function validatePlate(value) {
  const v = (value || '').trim();
  if (!v) return 'أدخل رقم اللوحة';
  if (v.length < 3) return 'رقم اللوحة قصير جداً';
  return '';
}

/** VIN اختياري، لكنه إن أُدخل فطوله 17 خانة بلا I/O/Q */
export function validateVin(value) {
  const v = (value || '').trim();
  if (!v) return '';
  if (v.length !== 17) return 'رقم الهيكل يجب أن يكون 17 خانة';
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(v)) return 'رقم الهيكل يحوي رموزاً غير صالحة';
  return '';
}

// يجمع أخطاء الحقول ويُعيد { errors, firstError, valid }
export function collectErrors(fields) {
  const errors = {};
  let firstError = '';
  Object.entries(fields).forEach(([key, message]) => {
    if (message) {
      errors[key] = message;
      if (!firstError) firstError = message;
    }
  });
  return { errors, firstError, valid: !firstError };
}
