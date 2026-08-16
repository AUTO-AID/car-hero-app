// ============================================================
//  authMessages — تعريب رسائل الباك (نجاح/خطأ) للعرض للمستخدم
//  تُطابق نصوص SUCCESS_MESSAGES / ERROR_MESSAGES في الـ Backend.
// ============================================================
const MAP = {
  // نجاح
  'OTP code has been sent to your phone': 'تم إرسال رمز التحقّق إلى هاتفك عبر واتساب',
  'OTP code has been sent successfully': 'تم إرسال رمز التحقّق بنجاح',
  'Account verified successfully': 'تم التحقّق من الحساب بنجاح',
  'Logged in successfully': 'تم تسجيل الدخول بنجاح',
  'Logged out successfully': 'تم تسجيل الخروج بنجاح',
  'Password reset OTP has been sent to your phone': 'تم إرسال رمز إعادة التعيين إلى هاتفك',
  'Password has been reset successfully': 'تم تغيير كلمة المرور بنجاح',
  'OTP sent to restore account': 'تم إرسال رمز استعادة الحساب',

  // أخطاء
  'Invalid phone number or password': 'رقم الهاتف أو كلمة المرور غير صحيحة',
  'Please verify your account first': 'يرجى تفعيل حسابك أولاً عبر رمز التحقّق',
  'Your account has been deactivated. Please contact support': 'حسابك معطّل حالياً — يمكنك استعادته',
  'Invalid or expired refresh token': 'انتهت الجلسة، يرجى تسجيل الدخول من جديد',
  'User not found': 'لا يوجد حساب مرتبط بهذا الرقم',
  'Phone number is already registered': 'رقم الهاتف مسجّل مسبقاً',
  'Invalid OTP code': 'رمز التحقّق غير صحيح',
  'OTP code has expired. Please request a new one': 'انتهت صلاحية الرمز، اطلب رمزاً جديداً',
  'Maximum OTP attempts reached. Please request a new code': 'تجاوزت عدد المحاولات، اطلب رمزاً جديداً',
  'Account is already active': 'الحساب مفعّل بالفعل',
  'Registration not found or expired. Please register again.': 'انتهت مهلة التسجيل، يرجى إعادة إنشاء الحساب',
  'Something went wrong. Please try again later': 'حدث خطأ، حاول مجدداً لاحقاً',

  // رسائل class-validator في RegisterDto — تصل كمصفوفة عند رفض عدّة حقول
  'Full name is required': 'أدخل الاسم الكامل',
  'Full name must be a string': 'أدخل اسماً صحيحاً',
  'Full name must be at least 3 characters': 'الاسم يجب ألا يقل عن 3 أحرف',
  'Phone number is required': 'أدخل رقم الهاتف',
  'Phone number must start with +963 followed by 9 digits (example: +963991234567)':
    'رقم غير صحيح — يبدأ بـ 9 (مثال: 991234567)',
  'Password is required': 'أدخل كلمة المرور',
  'Password must be at least 8 characters': 'كلمة المرور 8 رموز على الأقل',
  'Password must contain at least one uppercase letter and one number':
    'كلمة المرور تحتاج حرفاً كبيراً ورقماً على الأقل',
  'Terms and conditions must be accepted': 'يجب الموافقة على الشروط والأحكام للمتابعة',

  // ---- الطلبات والحجوزات ----
  // كانت تصل خاماً بالإنجليزية إلى شاشتَي تفاصيل الطلب والحجز، وأهمّها رسائل
  // الصلاحية والتعارض: كلاهما يقع في لحظة يظنّ فيها المستخدم أن التطبيق تعطّل.
  'Order not found': 'الطلب غير موجود أو حُذف',
  'You do not have permission to view this order': 'هذا الطلب لا يخصّ حسابك',
  'You do not have permission to cancel this order': 'لا يمكنك إلغاء طلب لا يخصّ حسابك',
  'This order is not a scheduled booking': 'هذا الطلب ليس حجزاً مسبقاً',
  'scheduleTime is required for bookings': 'اختر موعد الحجز أولاً',
  'Scheduled time must be a valid future date': 'اختر موعداً في المستقبل',
  'Provider is closed at the requested time': 'المركز مغلق في هذا الوقت',
  'Requested booking does not fit within provider working hours':
    'الموعد لا يتّسع ضمن ساعات عمل المركز',
  'Provider already has a scheduled booking during this time slot':
    'حُجز هذا الموعد للتوّ — اختر وقتاً آخر',
  'Provider is not available for scheduled bookings': 'هذا المركز لا يستقبل حجوزات مسبقة حالياً',
  'Provider is not available for service orders': 'هذا المركز لا يستقبل طلبات حالياً',
  'Provider does not currently offer the requested service': 'هذا المركز لا يقدّم هذه الخدمة حالياً',
  // تُبقي على عبارة «لا يوجد فني» ليظلّ isNoProviderError قادراً على كشفها
  'Service is not currently offered by this provider': 'لا يوجد فني يقدّم هذه الخدمة الآن',
  'No available provider found for this service near the requested location':
    'لا يوجد فني متاح لهذه الخدمة قرب موقعك',
  'Provider not found': 'المركز غير موجود',
  'Service not found': 'الخدمة غير موجودة',

  // ---- المركبات ----
  'Vehicle not found': 'المركبة غير موجودة',
  'You do not have permission to delete this vehicle': 'هذه المركبة لا تخصّ حسابك',
  'You do not have permission to update this vehicle': 'هذه المركبة لا تخصّ حسابك',
  'You do not have permission to access this vehicle': 'هذه المركبة لا تخصّ حسابك',
  'Maximum number of vehicles reached (10). Please remove a vehicle first.':
    'وصلت إلى الحد الأقصى (١٠ مركبات) — احذف مركبة لإضافة أخرى',
  'Cannot delete your only default vehicle. Please add another vehicle first.':
    'لا يمكن حذف مركبتك الوحيدة — أضف مركبة أخرى أولاً',
  'VIN must be exactly 17 characters': 'رقم الهيكل يجب أن يكون ١٧ خانة',
  'Failed to delete vehicle': 'تعذّر حذف المركبة',

  // ---- المحفظة والنقاط ----
  'Insufficient loyalty points balance': 'نقاطك لا تكفي لهذا الاستبدال',
  'Points must be a whole number': 'عدد النقاط يجب أن يكون رقماً صحيحاً',
  'Order is unavailable for loyalty points redemption':
    'هذا الطلب لم يعد قابلاً لخصم النقاط — قد يكون دُفع أو أُغلق',
  'Order has no payable balance': 'لا يوجد مبلغ مستحقّ على هذا الطلب',
  'Order was updated while redeeming points. Please retry':
    'تغيّر الطلب أثناء الاستبدال — أعد المحاولة',
  'Insufficient balance': 'رصيدك لا يكفي',
  'Wallet not found': 'لم نعثر على محفظتك',
  'Wallet is inactive': 'محفظتك غير مفعّلة — تواصل مع الدعم',
  'Direct deposits are disabled for security reasons. Please use the /api/payments/initialize endpoint to generate a secure checkout URL via Cham Cash.':
    'الشحن يتمّ عبر بوابة الدفع الآمنة فقط',

  // ---- الاشتراكات ----
  'Insufficient wallet balance to subscribe to this plan':
    'رصيد محفظتك لا يكفي للاشتراك في هذه الخطة — اشحن رصيدك أولاً',
  'Insufficient wallet balance to upgrade to this plan':
    'رصيد محفظتك لا يكفي للانتقال إلى هذه الخطة — اشحن رصيدك أولاً',
  'User already has an active subscription': 'لديك اشتراك نشط بالفعل — استخدم «تغيير الخطة»',
  'User is already subscribed to this plan': 'أنت مشترك في هذه الخطة بالفعل',
  'No active subscription found': 'لا يوجد اشتراك نشط على حسابك',
  'Invalid or inactive subscription plan': 'هذه الخطة غير متاحة حالياً',
  'Subscription plan not found': 'الخطة غير موجودة',
};

// أي حقل تخصّ كل رسالة خادم — الترتيب مهم: «phone» قبل «password» لا يهم
// لأن المطابقة على كلمات مميّزة، لكن «terms» تُفحص أولاً لأنها قد تذكر غيرها.
const FIELD_PATTERNS = [
  { field: 'terms', match: /terms/i },
  { field: 'fullName', match: /full ?name/i },
  { field: 'phone', match: /phone/i },
  { field: 'password', match: /password/i },
];

// فكّ غلاف {success,data} محلياً — استيراده من api.js يصنع دورة استيراد
// لأن api.js يستورد localizeMessage من هنا.
function unwrap(payload) {
  let data = payload;
  while (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    data = data.data;
  }
  return data;
}

/**
 * يحوّل خطأ الخادم إلى خريطة { حقل: رسالة عربية }.
 *
 * الحاجة: NestJS يرفض عدّة حقول في مصفوفة message واحدة، وapi.js يأخذ
 * أوّلها فقط ويهمل الباقي — فيرى المستخدم خطأً واحداً، يصلحه، ثم يُفاجأ
 * بالتالي. المصفوفة الكاملة محفوظة في error.raw فنقرأها من هنا.
 */
export function mapServerFieldErrors(error) {
  const raw = unwrap(error?.raw);
  const messages = raw?.message ?? error?.raw?.message;
  const list = Array.isArray(messages) ? messages : messages ? [messages] : [];
  const fields = {};
  list.forEach((message) => {
    if (typeof message !== 'string') return;
    const hit = FIELD_PATTERNS.find((pattern) => pattern.match.test(message));
    // أول رسالة لكل حقل تكفي: عرض ثلاث رسائل تحت حقل واحد ضجيج لا إرشاد
    if (hit && !fields[hit.field]) fields[hit.field] = localizeMessage(message, message);
  });
  return fields;
}

export function localizeMessage(msg, fallback = 'حدث خطأ، حاول مجدداً') {
  if (!msg) return fallback;
  return MAP[msg] || msg;
}

// كشف حالة «الحساب معطّل» لتوجيه المستخدم لتدفّق الاستعادة
export function isDeactivatedError(msg) {
  return typeof msg === 'string' && msg.includes('deactivated');
}

// كشف حالة «الحساب غير مفعّل»
export function isNotVerifiedError(msg) {
  return typeof msg === 'string' && msg.includes('verify your account');
}
