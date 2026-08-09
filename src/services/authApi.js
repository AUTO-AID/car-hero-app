// ============================================================
//  authApi — استدعاءات المصادقة (تطابق عقود auth.controller في الباك)
//  المسار الأساسي: /api/v1/auth
// ============================================================
import { api } from './api';
import { saveSession, clearSession, getRefreshToken } from './tokenStorage';

// تحويل الأرقام التسعة (9XXXXXXXX) إلى الصيغة التي يتوقّعها الباك: +963XXXXXXXXX
export function toE164Syrian(digits) {
  const clean = String(digits || '').replace(/[^0-9]/g, '');
  // إن أُدخل الرقم بصيغة محلية 09XXXXXXXX
  if (/^09\d{8}$/.test(clean)) return `+963${clean.slice(1)}`;
  // إن أُدخل مع رمز الدولة بدون +
  if (/^963\d{9}$/.test(clean)) return `+${clean}`;
  // الحالة الافتراضية: 9 خانات قادمة من PhoneField
  return `+963${clean}`;
}

// POST /auth/register → { message, phoneNumber, expiresIn }
export async function register({ fullName, phone, password, accountType }) {
  return api.post('/auth/register', {
    fullName,
    phoneNumber: toE164Syrian(phone),
    password,
    accountType: accountType || 'customer',
    isTermsAccepted: true,
  });
}

// POST /auth/verify-otp → { user, accessToken, refreshToken } — يسجّل الدخول تلقائياً
export async function verifyOtp({ phone, code }) {
  const session = await api.post('/auth/verify-otp', {
    phoneNumber: toE164Syrian(phone),
    otpCode: code,
  });
  await saveSession(session);
  return session;
}

// POST /auth/resend-otp → { message, phoneNumber, expiresIn }
export async function resendOtp({ phone }) {
  return api.post('/auth/resend-otp', { phoneNumber: toE164Syrian(phone) });
}

// POST /auth/login → { user, accessToken, refreshToken }
export async function login({ phone, password }) {
  const session = await api.post('/auth/login', {
    phoneNumber: toE164Syrian(phone),
    password,
  });
  await saveSession(session);
  return session;
}

// POST /auth/forgot-password → { message, phoneNumber, expiresIn }
export async function forgotPassword({ phone }) {
  return api.post('/auth/forgot-password', { phoneNumber: toE164Syrian(phone) });
}

// POST /auth/reset-password → { message }  (يتحقّق من الرمز ويعيّن الكلمة معاً)
export async function resetPassword({ phone, code, newPassword }) {
  return api.post('/auth/reset-password', {
    phoneNumber: toE164Syrian(phone),
    otpCode: code,
    newPassword,
  });
}

// GET /auth/me (يحتاج توكن) → للتحقّق من صلاحية الجلسة عند الإقلاع
export async function getMe() {
  const res = await api.get('/auth/me', { auth: true });
  return res?.user ?? res;
}

// POST /auth/restore/request-otp → { message, phoneNumber, expiresIn }
export async function requestRestoreOtp({ phone }) {
  return api.post('/auth/restore/request-otp', { phoneNumber: toE164Syrian(phone) });
}

// POST /auth/restore/confirm → { user, accessToken, refreshToken } — يعيد التفعيل ويسجّل الدخول
export async function confirmRestore({ phone, code }) {
  const session = await api.post('/auth/restore/confirm', {
    phoneNumber: toE164Syrian(phone),
    otpCode: code,
  });
  await saveSession(session);
  return session;
}

// POST /auth/logout (يحتاج توكن) ثم مسح الجلسة محليّاً
export async function logout() {
  try {
    await api.post('/auth/logout', {}, { auth: true });
  } finally {
    await clearSession();
  }
}

export { getRefreshToken };
