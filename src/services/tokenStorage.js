// ============================================================
//  tokenStorage — حفظ/قراءة توكنات المصادقة بشكل آمن (SecureStore)
// ============================================================
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// SecureStore لا يعمل على الويب — نستخدم localStorage كبديل عند التشغيل في المتصفح.
const isWeb = Platform.OS === 'web';

async function setItem(key, value) {
  if (isWeb) {
    try { globalThis.localStorage?.setItem(key, value); } catch {}
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key) {
  if (isWeb) {
    try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key) {
  if (isWeb) {
    try { globalThis.localStorage?.removeItem(key); } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

const ACCESS_KEY = 'ch_access_token';
const REFRESH_KEY = 'ch_refresh_token';
const USER_KEY = 'ch_user';
const ONBOARDING_KEY = 'ch_seen_onboarding';

export async function saveTokens({ accessToken, refreshToken }) {
  if (accessToken) await setItem(ACCESS_KEY, accessToken);
  if (refreshToken) await setItem(REFRESH_KEY, refreshToken);
}

export async function getAccessToken() {
  return getItem(ACCESS_KEY);
}

export async function getRefreshToken() {
  return getItem(REFRESH_KEY);
}

export async function saveUser(user) {
  if (user) await setItem(USER_KEY, JSON.stringify(user));
}

export async function getUser() {
  const raw = await getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveSession({ user, accessToken, refreshToken }) {
  await saveTokens({ accessToken, refreshToken });
  await saveUser(user);
}

// ملاحظة: clearSession لا يمسح علامة Onboarding عمداً — يجب أن تبقى بعد الخروج.
export async function clearSession() {
  await deleteItem(ACCESS_KEY);
  await deleteItem(REFRESH_KEY);
  await deleteItem(USER_KEY);
}

// -------- علامة مشاهدة شاشة التعريف (تُعرض مرّة واحدة في العمر) --------
export async function getSeenOnboarding() {
  const v = await getItem(ONBOARDING_KEY);
  return v === '1';
}

export async function setSeenOnboarding() {
  await setItem(ONBOARDING_KEY, '1');
}
