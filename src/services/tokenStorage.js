// ============================================================
//  tokenStorage — حفظ/قراءة توكنات المصادقة بشكل آمن (SecureStore)
// ============================================================
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'ch_access_token';
const REFRESH_KEY = 'ch_refresh_token';
const USER_KEY = 'ch_user';
const ONBOARDING_KEY = 'ch_seen_onboarding';

export async function saveTokens({ accessToken, refreshToken }) {
  if (accessToken) await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function saveUser(user) {
  if (user) await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getUser() {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveSession({ user, accessToken, refreshToken }) {
  await saveTokens({ accessToken, refreshToken });
  await saveUser(user);
}

// ملاحظة: clearSession لا يمسح علامة Onboarding عمداً — يجب أن تبقى بعد الخروج.
export async function clearSession() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

// -------- علامة مشاهدة شاشة التعريف (تُعرض مرّة واحدة في العمر) --------
export async function getSeenOnboarding() {
  const v = await SecureStore.getItemAsync(ONBOARDING_KEY);
  return v === '1';
}

export async function setSeenOnboarding() {
  await SecureStore.setItemAsync(ONBOARDING_KEY, '1');
}
