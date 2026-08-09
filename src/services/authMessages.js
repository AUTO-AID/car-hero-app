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
};

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
